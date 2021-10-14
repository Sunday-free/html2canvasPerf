import Entity from 'cesium/DataSources/Entity';
import Cartesian3 from 'cesium/Core/Cartesian3';
import Cartesian2 from 'cesium/Core/Cartesian2';
import Color from 'cesium/Core/Color';
import defined from 'cesium/Core/defined';
import Material from 'cesium/Scene/Material';

import SceneTransforms from 'cesium/Scene/SceneTransforms';
import Label from 'cesium/Scene/Label';

import DrawType from '../constant/DrawType';
import GeoUtil from '../utils/GeoUtil';
import Util from '../utils/Util';
import EditorPointType from '../constant/EditorPointType';
import EditorAxisType from '../constant/EditorAxisType';
import GeometryType from '../constant/GeometryType';
import CustomMaterialType from '../constant/CustomMaterialType';
import { GeoDepository } from '../core/GeoDepository';

/**
 * 绘制实体编辑点获取及图元更新辅助类
 *
 * @private
 * 
 * @constructor
 * 
 */
function EditorHelper() {
}

/**
 * 高度平移量的倍数 (点在轴上的移动会很快，在空中移动却很缓慢)
 * @property {Number} heightScalar
 * @default 1
 */
EditorHelper.heightScalar = 1;

/**
 * 坐标轴平移量的倍数
 * @property {Number} axisMovingScalar
 * @default 1
 */
EditorHelper.axisMovingScalar = 1;

/**
 * 平移轴个性化样式
 * @private
 */
EditorHelper.editorAxisType = [EditorAxisType.XPAN, EditorAxisType.YPAN, EditorAxisType.ZPAN];

/**
 * 获取绘制图元的编辑点坐标
 * @param {Primtive|Billboard} drawPrimitive 绘制图元对象
 * 
 * @returns {Array.<Object>} [Cartesian3, [Cartesian3]]
 * 
 * @see EditorHandler
 */
EditorHelper.getAnchorPoints = function (drawPrimitive) {
    let anchorPoints = [];
    const drawType = drawPrimitive.id.drawType;

    switch (drawType) {
        case DrawType.CIRCLE: case DrawType.ELLIPSE:  // 椭圆、基本圆
        case DrawType.SQUARE: case DrawType.RECTANGLE: // 正方形、矩形
        case DrawType.SPHERE: case DrawType.ELLIPSOID: // 球体、椭球体
        case DrawType.POLYGON: case DrawType.POLYLINE: // 多边形、折线
        case DrawType.PARABOLA: // 抛物线
            anchorPoints = this.getEditorPoints(drawPrimitive);
            break;
        case DrawType.BILLBOARD: // 图标
            anchorPoints.push([drawPrimitive.position]);
            break;
    }
    return anchorPoints;
}

/**
 * 获取绘制图元的编辑点坐标
 * @param {CustomPolylinePrimitive|CustomPolygonPrimitive|CustomRectanglePrimitive|CustomEllipsePrimitive|CustomEllipsoidPrimitive|PalabolaPrimitive} drawPrimitive 绘制的自定义图元对象
 * 
 * @returns {Array.<Object>} [[Cartesian3], [Cartesian3]]
 * 
 * @see EditorHandler
 */
EditorHelper.getEditorPoints = function (drawPrimitive) {
    const anchorPoints = [];
    const { drawType, isGround, extrudedHeight } = drawPrimitive.id;

    const { center, positions } = drawPrimitive;
    if (!(center instanceof Cartesian3)) {
        console.warn(`drawPrimitive——${drawPrimitive}类型不对`);
        return anchorPoints;
    }
    anchorPoints.push([center]);
    switch (drawType) {
        case DrawType.PARABOLA: // 抛物线
            const pointNum = positions.length;
            if (pointNum > 1) {
                anchorPoints.push([positions[0], positions[pointNum - 1]]);
            }
            break;
        case DrawType.POLYGON: case DrawType.POLYLINE: // 多边形、折线
            anchorPoints.push(positions);
            break;
        case DrawType.CIRCLE: // 基本圆
            anchorPoints.push([drawPrimitive.majorAxisPoint]);
            break;
        case DrawType.ELLIPSE: // 椭圆
            anchorPoints.push([
                drawPrimitive.majorAxisPoint,
                drawPrimitive.minorAxisPoint
            ]);
            break;
        case DrawType.SQUARE:  // 正方形
            anchorPoints.push([
                drawPrimitive.firstCorner,
                drawPrimitive.secondCorner
            ]);
            break;
        case DrawType.RECTANGLE: // 矩形
            anchorPoints.push([
                drawPrimitive.firstCorner,
                drawPrimitive.secondCorner,
                positions[1]
            ]);
            break;

        case DrawType.SPHERE: case DrawType.ELLIPSOID: // 球体、椭球体
            const { normalX, normalY, normalZ } = GeoUtil.getLocalAxisInfo(center);
            const { x, y, z } = drawPrimitive.radii;
            if (drawType === DrawType.SPHERE) {
                anchorPoints.push([Util.addVectorInScalar(center, normalX, x)]);
            } else {
                anchorPoints.push([
                    Util.addVectorInScalar(center, normalX, x),
                    Util.addVectorInScalar(center, normalY, y),
                    Util.addVectorInScalar(center, normalZ, z)
                ]);
            }
            break;
    }

    if (isGround || defined(extrudedHeight)) {
        const centerInDegrees = GeoUtil.cartesianToArray(center);
        const centroidHeight = centerInDegrees[2];
        let tempArray;
        anchorPoints[1] = anchorPoints[1].map(point => {
            tempArray = GeoUtil.cartesianToArray(point);
            return Cartesian3.fromDegrees(tempArray[0], tempArray[1], centroidHeight);
        });
        // 目前暂时只能实现基于椭球面的拉伸
        if (defined(extrudedHeight)) {
            // 目前顶面只有质心需要编辑
            anchorPoints[0].push(Cartesian3.fromDegrees(centerInDegrees[0], centerInDegrees[1], centroidHeight + drawPrimitive.extrudedHeight));
        }
    }
    return anchorPoints;
}

/**
 * 更新自定义绘制图元位置
 * 
 * @param {Primitive} editorPrimtive 编辑中的自定义图元
 * @param {Entity|EditorAxisType} editorTarget 编辑依托的实体点/图元轴拖动类型
 * @param {Cartesian3|Cartesian2} changedPosition Cartesian3为改变后的位置， Cartesian2为屏幕上移动的矢量距离
 * 
 * @returns {Array.<Object>} [Cartesian3, [Cartesian3]]
 */
EditorHelper.updateDrawPrimitive = function (editorPrimtive, editorTarget, changedPosition) {
    let updatedPoints = [];
    const { drawType } = defined(editorPrimtive.id) ? editorPrimtive.id : editorPrimtive;
    switch (drawType) {
        case DrawType.BILLBOARD: // 图标
            editorPrimtive.position = changedPosition;
            editorPrimtive.label.position = changedPosition; // 更新标注位置
            GeoDepository.geomap.render();
            updatedPoints = this.getAnchorPoints(editorPrimtive);
            break;
        case DrawType.PARABOLA: // 抛物线
            updatedPoints = this.updateParabolaPrimitive(editorPrimtive, editorTarget, changedPosition);
            break;
        case DrawType.POLYGON: case DrawType.POLYLINE: // 多边形、折线
            updatedPoints = this.updateCustomPolygon(editorPrimtive, editorTarget, changedPosition);
            break;
        case DrawType.ELLIPSE: case DrawType.CIRCLE: // 椭圆、基本圆
            updatedPoints = this.updateCustomEllipse(editorPrimtive, editorTarget, changedPosition);
            break;
        case DrawType.SQUARE: case DrawType.RECTANGLE:  // 正方形、矩形
            updatedPoints = this.updateCustomRectangle(editorPrimtive, editorTarget, changedPosition);
            break;
        case DrawType.SPHERE: case DrawType.ELLIPSOID:  // 球体、椭球体
            updatedPoints = this.updateCustomEllipsoid(editorPrimtive, editorTarget, changedPosition);
            break;
    }
    return updatedPoints;
}

/**
 * 获取自定义图元的颜色
 * @private
 * @param {Primitive} editorPrimtive 编辑中的自定义图元
 * 
 * @returns {Color}
 */
EditorHelper.getDrawPrimitiveColor = function (editorPrimtive) {
    const { drawType } = defined(editorPrimtive.id) ? editorPrimtive.id : editorPrimtive;
    let color;
    switch (drawType) {
        case DrawType.POLYGON:
        case DrawType.ELLIPSE: case DrawType.CIRCLE:
        case DrawType.SQUARE: case DrawType.RECTANGLE:
            color = editorPrimtive.material.uniforms.color;
            break;
        case DrawType.SPHERE: case DrawType.ELLIPSOID:
            color = editorPrimtive.color;
            break
        default:
            break;
    }
    return color;
}

/**
 * 获取自定义图元的颜色
 * @private
 * @param {Primitive} editorPrimtive 编辑中的自定义图元
 * @param {Color} color 更新的颜色
 * 
 */
EditorHelper.setDrawPrimitiveColor = function (editorPrimtive, color) {
    if (!(color instanceof Color)) {
        console.warn('EditorHelper.setDrawPrimitiveColor--color 类型不对！', color);
        return;
    }
    const { drawType } = defined(editorPrimtive.id) ? editorPrimtive.id : editorPrimtive;
    switch (drawType) {
        case DrawType.POLYGON:
        case DrawType.ELLIPSE: case DrawType.CIRCLE:
        case DrawType.SQUARE: case DrawType.RECTANGLE:
            const material = editorPrimtive.material;
            if (editorPrimtive.material.uniforms.color) {
                material.uniforms.color = Color.clone(color);
                editorPrimtive.material = material;
            }
            break;
        case DrawType.SPHERE: case DrawType.ELLIPSOID:
            editorPrimtive.color = color;
            break
        default:
            break;
    }
    GeoDepository.geomap.render();
}

/**
 * 根据屏幕范围上的平移获取世界坐标系下某一方向的移动距离
 * @private
 * 
 * @param {Cartesian3} origin 移动起始点的世界坐标
 * @param {Cartesian3} normal 移动方向的世界坐标单位向量
 * @param {Cartesian2} screenVertor 屏幕坐标系下的平移向量
 * 
 * @returns {Number}
 */
EditorHelper.getDistanceByScreenTransform = function (origin, normal, screenVertor) {
    const anchor = Cartesian3.add(origin, normal, new Cartesian3());

    const originInScreen = SceneTransforms.wgs84ToWindowCoordinates(GeoDepository.scene, origin);
    const anchorInScreen = SceneTransforms.wgs84ToWindowCoordinates(GeoDepository.scene, anchor);

    if (defined(originInScreen) && defined(anchorInScreen)) {
        const screenNormal = Cartesian2.subtract(anchorInScreen, originInScreen, new Cartesian2());
        return Cartesian2.dot(screenVertor, screenNormal);
    }
    return 0;

}

/**
 * 更新抛物线图元
 * @private
 * 
 * @param {Primitive} editorPrimtive 编辑中的自定义图元
 * @param {Entity|EditorAxisType} editorTarget 编辑依托的实体点/图元轴拖动类型
 * @param {Cartesian3|Cartesian2} changedPosition Cartesian3为改变后的位置， Cartesian2为屏幕上移动的矢量距离
 * 
 * @returns {Array.<Object>} [Cartesian3, [Cartesian3]]
 */
EditorHelper.updateParabolaPrimitive = function (parabola, editorTarget, changedPosition) {
    const center = parabola.center;
    if (this.editorAxisType.includes(editorTarget)) {
        const { normalX, normalY, normalZ } = GeoUtil.getLocalAxisInfo(center);
        let translateDirect;
        switch (editorTarget) {
            case EditorAxisType.XPAN:
                translateDirect = normalX;
                break;
            case EditorAxisType.YPAN:
                translateDirect = normalY;
                break;
            case EditorAxisType.ZPAN: default:
                translateDirect = normalZ;
                break;
        }
        const distance = this.getDistanceByScreenTransform(center, translateDirect, changedPosition) * this.axisMovingScalar;
        parabola.center = Util.addVectorInScalar(center, translateDirect, distance); // 应该用相机距离去调整尺寸
    } else if (changedPosition instanceof Cartesian3) {
        const { editorType, editorIndex } = editorTarget;
        if (editorType === EditorPointType.Vertex) {
            if (editorIndex === 0) {
                parabola.start = changedPosition;
            } else {
                parabola.end = changedPosition;
            }
        } else {
            const height = GeoUtil.cartesianToArray(center)[2];
            const array = GeoUtil.cartesianToArray(changedPosition);
            parabola.center = Cartesian3.fromDegrees(array[0], array[1], height);
        }
    }
    const centerInDegrees = GeoUtil.cartesianToArray(parabola.center);
    parabola.label.position = Cartesian3.fromDegrees(centerInDegrees[0], centerInDegrees[1], centerInDegrees[2] * 1.2); // 更新标注位置
    GeoDepository.geomap.render();
    return this.getEditorPoints(parabola);
}

/**
 * 更新自定义绘制多边形/折线（多边形轮廓）图元
 * @private
 * 
 * @param {Primitive} editorPrimtive 编辑中的自定义图元
 * @param {Entity|EditorAxisType} editorTarget 编辑依托的实体点/图元轴拖动类型
 * @param {Cartesian3|Cartesian2} changedPosition Cartesian3为改变后的位置， Cartesian2为屏幕上移动的矢量距离
 * 
 * @returns {Array.<Object>} [Cartesian3, [Cartesian3]]
 */
EditorHelper.updateCustomPolygon = function (polygon, editorTarget, changedPosition) {
    const { center, extrudedHeight } = polygon;

    if (this.editorAxisType.includes(editorTarget)) {
        const { normalX, normalY, normalZ } = GeoUtil.getLocalAxisInfo(center);
        let translateDirect;
        switch (editorTarget) {
            case EditorAxisType.XPAN:
                translateDirect = normalX;
                break;
            case EditorAxisType.YPAN:
                translateDirect = normalY;
                break;
            case EditorAxisType.ZPAN: default:
                translateDirect = normalZ;
                break;
        }
        const distance = this.getDistanceByScreenTransform(center, translateDirect, changedPosition) * this.axisMovingScalar;
        polygon.center = Util.addVectorInScalar(center, translateDirect, distance);
    } else {
        const { editorType, editorIndex } = editorTarget;
        if (editorType === EditorPointType.Centriod && editorIndex > 0) {
            const { normalZ } = GeoUtil.getLocalAxisInfo(center);
            const distance = this.getDistanceByScreenTransform(editorTarget.position.getValue(new Date().getTime()), normalZ, changedPosition);

            const changedExtrudedHeight = extrudedHeight + distance * this.heightScalar;
            polygon.extrudedHeight = changedExtrudedHeight;
            polygon.label.styles.extrudedHeight = changedExtrudedHeight; // 更新
        } else {
            if (editorType === EditorPointType.Centriod) {
                polygon.center = changedPosition;
            } else {
                const positions = polygon.positions;
                positions[editorIndex] = changedPosition;
                polygon.setPosition(positions);
            }
        }
    }
    // 更新标注位置
    const labelPosCart = GeoUtil.cartesianToArray(polygon.center);
    const labelPosition = Cartesian3.fromDegrees(
        labelPosCart[0],
        labelPosCart[1],
        labelPosCart[2] + (defined(polygon.extrudedHeight) ? polygon.extrudedHeight : 0) * 1.2
    );
    polygon.label.position = labelPosition;
    GeoDepository.geomap.render();
    return this.getEditorPoints(polygon);
}

/**
 * 更新自定义绘制椭圆图元
 * @private
 * 
 * @param {Primitive} editorPrimtive 编辑中的自定义图元
 * @param {Entity|DrawType} editorTarget 编辑依托的实体点/图元轴拖动类型
 * @param {Cartesian3|Cartesian2} changedPosition Cartesian3为改变后的位置， Cartesian2为屏幕上移动的矢量距离
 * 
 * @returns {Array.<Object>} [Cartesian3, [Cartesian3]]
 */
EditorHelper.updateCustomEllipse = function (ellipse, editorTarget, changedPosition) {
    const { localAxisInfo, center, extrudedHeight } = ellipse;
    const { normalX, normalY, normalZ } = localAxisInfo;
    if (this.editorAxisType.includes(editorTarget)) {
        const { normalX, normalY, normalZ } = GeoUtil.getLocalAxisInfo(center);
        let translateDirect;
        switch (editorTarget) {
            case EditorAxisType.XPAN:
                translateDirect = normalX;
                break;
            case EditorAxisType.YPAN:
                translateDirect = normalY;
                break;
            case EditorAxisType.ZPAN: default:
                translateDirect = normalZ;
                break;
        }
        const distance = this.getDistanceByScreenTransform(center, translateDirect, changedPosition) * this.axisMovingScalar;
        ellipse.center = Util.addVectorInScalar(center, translateDirect, distance);
    } else {
        const { editorType, editorIndex } = editorTarget;
        if (editorType === EditorPointType.Centriod && editorIndex > 0) {
            const distance = this.getDistanceByScreenTransform(editorTarget.position.getValue(new Date().getTime()), normalZ, changedPosition);

            const changedExtrudedHeight = extrudedHeight + distance * this.heightScalar;
            ellipse.label.styles.extrudedHeight = changedExtrudedHeight;
            ellipse.extrudedHeight = changedExtrudedHeight;
        } else {
            const translate = Cartesian3.subtract(changedPosition, center, new Cartesian3());
            if (editorType === EditorPointType.Centriod) {
                ellipse.center = changedPosition;
            } else {
                if (editorIndex === 0) {
                    ellipse.semiMajorAxis = Math.max(0.01, Math.abs(Cartesian3.dot(translate, normalX)));
                } else {
                    ellipse.semiMinorAxis = Math.max(0.01, Math.abs(Cartesian3.dot(translate, normalY)));
                }
            }
        }
    }
    // 更新标注位置
    const labelPosCart = GeoUtil.cartesianToArray(ellipse.center)
    ellipse.label.position = Cartesian3.fromDegrees(
        labelPosCart[0],
        labelPosCart[1],
        labelPosCart[2] + (defined(ellipse.extrudedHeight) ? ellipse.extrudedHeight : 0) * 1.2
    );
    GeoDepository.geomap.render();
    return this.getEditorPoints(ellipse);
}

/**
 * 更新自定义绘制椭球体
 * @private
 * 
 * @param {Primitive} editorPrimtive 编辑中的自定义图元
 * @param {Entity|DrawType} editorTarget 编辑依托的实体点/图元轴拖动类型
 * @param {Cartesian3|Cartesian2} changedPosition Cartesian3为改变后的位置， Cartesian2为屏幕上移动的矢量距离
 * 
 * @returns {Array.<Object>} [Cartesian3, [Cartesian3]]
 */
EditorHelper.updateCustomEllipsoid = function (ellipsoid, editorTarget, changedPosition) {
    const { center, radii } = ellipsoid;
    let { x, y, z } = radii;
    const { normalX, normalY, normalZ } = GeoUtil.getLocalAxisInfo(center);

    if (this.editorAxisType.includes(editorTarget)) {
        let translateDirect;
        switch (editorTarget) {
            case EditorAxisType.XPAN:
                translateDirect = normalX;
                break;
            case EditorAxisType.YPAN:
                translateDirect = normalY;
                break;
            case EditorAxisType.ZPAN: default:
                translateDirect = normalZ;
                break;
        }
        const distance = this.getDistanceByScreenTransform(center, translateDirect, changedPosition) * this.axisMovingScalar;
        ellipsoid.center = Util.addVectorInScalar(center, translateDirect, distance);
    } else {
        const { editorType, editorIndex } = editorTarget;
        if (editorType === EditorPointType.Centriod) {
            const centroidInDegrees = GeoUtil.cartesianToArray(changedPosition);
            ellipsoid.center = Cartesian3.fromDegrees(centroidInDegrees[0], centroidInDegrees[1], z);
        } else {
            const translate = Cartesian3.subtract(changedPosition, center, new Cartesian3());
            switch (editorIndex) {
                case 0:
                    x = Math.max(0.01, Math.abs(Cartesian3.dot(translate, normalX)));
                    break;
                case 1:
                    y = Math.max(0.01, Math.abs(Cartesian3.dot(translate, normalY)));
                    break;
                case 2: default:
                    z = Math.max(0.01, Math.abs(Cartesian3.dot(translate, normalZ)));
                    break;
            }
            ellipsoid.radii = new Cartesian3(x, y, z);
        }
    }
    // 更新标注位置
    const labelPosCart = GeoUtil.cartesianToArray(ellipsoid.center)
    ellipsoid.label.position = Cartesian3.fromDegrees(
        labelPosCart[0],
        labelPosCart[1],
        labelPosCart[2] + ellipsoid.radii.z * 1.2
    );
    GeoDepository.geomap.render();
    return this.getEditorPoints(ellipsoid);
}

/**
 * 更新自定义绘制矩形图元
 * @private
 * 
 * @param {Primitive} editorPrimtive 编辑中的自定义图元
 * @param {Entity|DrawType} editorTarget 编辑依托的实体点/图元轴拖动类型
 * @param {Cartesian3|Cartesian2} changedPosition Cartesian3为改变后的位置， Cartesian2为屏幕上移动的矢量距离
 * 
 * @returns {Array.<Object>} [Cartesian3, [Cartesian3]]
 */
EditorHelper.updateCustomRectangle = function (rectangle, editorTarget, changedPosition) {
    const { center, extrudedHeight, firstCorner, secondCorner } = rectangle;

    if (this.editorAxisType.includes(editorTarget)) {
        const { normalX, normalY, normalZ } = GeoUtil.getLocalAxisInfo(center);
        let translateDirect;
        switch (editorTarget) {
            case EditorAxisType.XPAN:
                translateDirect = normalX;
                break;
            case EditorAxisType.YPAN:
                translateDirect = normalY;
                break;
            case EditorAxisType.ZPAN: default:
                translateDirect = normalZ;
                break;
        }
        const distance = this.getDistanceByScreenTransform(center, translateDirect, changedPosition) * this.axisMovingScalar;
        rectangle.center = Util.addVectorInScalar(center, translateDirect, distance);
    } else {
        const { editorType, editorIndex } = editorTarget;
        if (editorType === EditorPointType.Centriod && editorIndex > 0) {
            const { normalZ } = GeoUtil.getLocalAxisInfo(center);;
            const distance = this.getDistanceByScreenTransform(editorTarget.position.getValue(new Date().getTime()), normalZ, changedPosition);

            const changedExtrudedHeight = extrudedHeight + distance * this.heightScalar;
            rectangle.label.styles.extrudedHeight = changedExtrudedHeight;
            rectangle.extrudedHeight = changedExtrudedHeight;
        } else {
            if (editorType === EditorPointType.Centriod) {
                rectangle.center = changedPosition;
            } else {
                if (editorIndex === 0) {
                    rectangle.firstCorner = changedPosition;
                } else if (editorIndex === 1) {
                    rectangle.secondCorner = changedPosition;
                } else {
                    const angle = GeoUtil.getAngleByPoints(firstCorner, changedPosition, secondCorner);
                    rectangle.angleToCross = angle > 0 ? angle * 2 : Math.PI + angle * 2;
                }
            }
        }
    }
    // 更新标注位置
    const labelPosCart = GeoUtil.cartesianToArray(rectangle.center)
    rectangle.label.position = Cartesian3.fromDegrees(
        labelPosCart[0],
        labelPosCart[1],
        labelPosCart[2] + (defined(rectangle.extrudedHeight) ? rectangle.extrudedHeight : 0) * 1.2
    );
    GeoDepository.geomap.render();
    return this.getEditorPoints(rectangle);
}

/**
 * 更新图标样式
 * 
 * @param {Billboard} billboard 
 * @param {Object} [styles] 图标样式
 * @param {String} [styles.url] 图标地址
 * @param {Cartesian2} [styles.pixelOffset] 图标偏移
 * @param {Number} [styles.scale] 图标尺寸
 * 
 * @see DrawHandler
 */
EditorHelper.updateBillboardStyle = function (billboard, styles = {}) {
    const changedStyle = Object.assign(billboard.label.styles, styles);
    const { url, scale, pixelOffset } = changedStyle; // 目前只要这两项需要修改
    billboard.image = url;
    billboard.pixelOffset = pixelOffset;
    billboard.scale = scale;
    billboard.label.styles = changedStyle;
    GeoDepository.geomap.render();
}

/**
 * 更新自定义线图元样式
 * 
 * @param {CustomPolylinePrimitive|PalabolaPrimitive} line 
 * @param {Object} [styles] 
 * @param {String} [styles.lineColor] 线css样式的颜色
 * @param {Object} [styles.alpha] 线颜色透明度
 * @param {Object} [styles.width] 线宽度
 * 
 * @see DrawHandler
 */
EditorHelper.updateLineStyle = function (line, styles = {}) {
    const changedStyle = Object.assign(line.label.styles, styles);
    line.material = this.getPrimitiveLineMaterial(changedStyle);
    line.width = changedStyle.width;
    line.label.styles = changedStyle;
    GeoDepository.geomap.render();
}

/**
 * 获取线段材质
 * @private
 * 
 * @param {Object} options 
 * 
 * @returns {Material} 图元材质 / 实体材质
 * 
 * @see updateLineStyle
 */
EditorHelper.getPrimitiveLineMaterial = function (options) {
    // 默认值暂未开放，不需要写到注释中
    const {
        lineType,
        lineColor,
        alpha,
        glowPower = 0.25,
        taperPower = 1.0,
        gapColor = Color.TRANSPARENT,
        dashLength = 16,
        dashPattern = 255,
        speed,
    } = options;
    const color = defined(alpha) ? Color.fromCssColorString(lineColor).withAlpha(alpha) : Color.fromCssColorString(lineColor);
    let material;
    switch (lineType) {
        case CustomMaterialType.LINE_FLOW: // 流动线
            this.speed = speed;
            material = Material.fromType(Material.PolylineFlowType, {
                color,
                speedFactor: 2
            })
            break;
        case CustomMaterialType.LINE_DASH: // 虚线
            const dashOptions = {
                color,
                gapColor,
                dashLength,
                dashPattern
            }
            material = Material.fromType(Material.PolylineDashType, dashOptions)
            break;
        case CustomMaterialType.LINE_GROW: // 发光线
            const growOptions = {
                color,
                glowPower,
                taperPower
            };
            material = Material.fromType(Material.PolylineGlowType, growOptions)
            break;
        case CustomMaterialType.LINE_COLOR: default: // 实线（颜色线）
            material = Material.fromType('Color', {
                color,
            });
            break;
    }
    return material;
}

/**
 * 更新自定义面体状图元样式
 * 
 * @param {CustomPolygonPrimitive|CustomRectanglePrimitive|CustomEllipsePrimitive|CustomEllipsoidPrimitive} polygon 
 * @param {Object} [styles] 
 * @param {String} [styles.fillColor] 面填充的css样式颜色
 * @param {Object} [styles.alpha] 填充颜色透明度
 * @param {Object} [styles.extrudedHeight] 面拉伸高度
 * @param {Object} [styles.radius] 圆柱、球体半径更新
 * 
 * @see DrawHandler
 */
EditorHelper.updatePolygonStyle = function (polygon, styles = {}) {
    const changedStyle = Object.assign(polygon.label.styles, styles);
    const { fillColor, alpha, extrudedHeight, radius } = changedStyle; // 目前只要这两项需要修改
    const color = defined(alpha) ? Color.fromCssColorString(fillColor).withAlpha(alpha) : Color.fromCssColorString(fillColor);
    const colorMaterial = Material.fromType('Color', {
        color,
    });

    // 有特殊材质的后面再统一设置material方法
    if (defined(polygon.color)) {
        polygon.color = color;
    } else {
        polygon.material = colorMaterial;
    }

    if (defined(radius)) {
        if (polygon.isCircle) {
            polygon.semiMajorAxis = radius;
        } else if (polygon.isSphere) {
            polygon.radii = new Cartesian3(radius, radius, radius);
        }
    }

    defined(extrudedHeight) && (polygon.extrudedHeight = extrudedHeight);
    polygon.label.styles = changedStyle;
    GeoDepository.geomap.render();
}

/**
 * 获取绘制图元的geometry对象
 * 
 * @param {Primitive|Billboard|Label} drawPrimitive 
 * 
 * @returns {Object} { type, coordinates }
 * 
 * @see getDrawFeature
 */
EditorHelper.getDrawPrimitiveGeometry = function (drawPrimitive) {
    const { id, center, positions, position } = drawPrimitive;

    let centerInDegrees = GeoUtil.cartesianToArray(defined(center) ? center : position);
    let type, coordinates;
    switch (id.drawType) {
        case DrawType.SPHERE: case DrawType.ELLIPSOID: // 球体、椭球体
        case DrawType.BILLBOARD: // 图标
            type = GeometryType.POINT;
            coordinates = centerInDegrees;
            break;
        case DrawType.CIRCLE: case DrawType.ELLIPSE:  // 椭圆、基本圆
        case DrawType.SQUARE: case DrawType.RECTANGLE: // 正方形、矩形
        case DrawType.POLYGON: // 多边形
            type = GeometryType.POLYGON;
            coordinates = positions.map((position) => GeoUtil.cartesianToArray(position));
            break;
        case DrawType.POLYLINE: case DrawType.PARABOLA:// 折线、抛物线
            type = GeometryType.POLYLINE;
            coordinates = positions.map((position) => GeoUtil.cartesianToArray(position));
            break;
    }
    return { type, coordinates };
}

/**
 * 获取绘制图元的属性要素对象（用于导出）
 * 
 * @param {Primitive|Billboard|Label} drawPrimitive 
 * 
 * @returns {Object} {feature: {type, properties, geometry}, featureName}
 * 
 * @see DrawHandler
 */
EditorHelper.getDrawFeature = function (drawPrimitive) {
    const label = drawPrimitive.label;
    const { id, drawType } = drawPrimitive.id

    const geometry = this.getDrawPrimitiveGeometry(drawPrimitive);
    let properties = {};
    let featureName = '要素名称';
    if (label instanceof Label) {
        const { styles, text } = label;
        featureName = text;
        properties = {
            type: drawType,
            name: text,
            id,
            styles
        };
    }
    return {
        feature: {
            type: 'Feature',
            properties,
            geometry
        },
        featureName
    };
}

export default EditorHelper;