
import Cartesian3 from 'cesium/Core/Cartesian3';
import Cartesian2 from 'cesium/Core/Cartesian2';
import Color from 'cesium/Core/Color';
import PolygonHierarchy from 'cesium/Core/PolygonHierarchy';
import defined from 'cesium/Core/defined';
import Material from 'cesium/Scene/Material';
import BillboardCollection from 'cesium/Scene/BillboardCollection';
import VerticalOrigin from 'cesium/Scene/VerticalOrigin';
import HorizontalOrigin from 'cesium/Scene/HorizontalOrigin';
import HeightReference from 'cesium/Scene/HeightReference';
import LabelCollection from 'cesium/Scene/LabelCollection';
import Entity from 'cesium/DataSources/Entity';
import CallbackProperty from 'cesium/DataSources/CallbackProperty';
import PolylineGlowMaterialProperty from 'cesium/DataSources/PolylineGlowMaterialProperty';
import PolylineDashMaterialProperty from 'cesium/DataSources/PolylineDashMaterialProperty';
import PolylineDynamicMaterialProperty from 'cesium/DataSources/PolylineDynamicMaterialProperty';

import Draw from './Draw';
import DrawType from '../constant/DrawType';
import GeoUtil from '../utils/GeoUtil';
import Util from '../utils/Util';
import CustomRectanglePrimitive from '../layer/basePrimitive/CustomRectanglePrimitive';
import CustomEllipsePrimitive from '../layer/basePrimitive/CustomEllipsePrimitive';
import CustomEllipsoidPrimitive from '../layer/basePrimitive/CustomEllipsoidPrimitive';
import CustomPolygonPrimitive from '../layer/basePrimitive/CustomPolygonPrimitive';
import CustomPolylinePrimitive from '../layer/basePrimitive/CustomPolylinePrimitive';
import ParabolaPrimitive from '../layer/basePrimitive/ParabolaPrimitive';
import CustomMaterialType from '../constant/CustomMaterialType';
import DefaultData from '../constant/DefaultData.js';
import Tooltip from '../utils/Tooltip';
import destroyObject from 'cesium/Core/destroyObject';
import defaultValue from 'cesium/Core/defaultValue';
import ClassificationType from 'cesium/Scene/ClassificationType';

class DrawPrimitive extends Draw {
    /**
     * 绘制平面几何及其柱体
     * @alias DrawPrimitive
     * @constructor
     * @extends Draw
     *
     * @private
     * 
     * @param {GeoMap} geomap 
     * 
     * @example
     * var drawPrimitive = new BOSGeo.DrawPrimitive(geomap);
     */
    constructor(geomap) {
        super(geomap);

        this.positions = [];

        this.setLabelCollections();

        this._tooltip = new Tooltip(); // 提示框对象

        this._pointStyle = POINT_STYLE;
        this._tempPoints = [];

        this._requestRenderMode = geomap.requestRenderMode; // 保存最初的实时渲染参数值
        this.geomap = geomap;
    }

    /**
     * 创建（更新）图元的标注集合
     */
    setLabelCollections() {
        this.billboards = this.drawLayer._primitives.find((primitive) => primitive instanceof BillboardCollection);
        if (!defined(this.billboards)) {
            this.billboards = this.drawLayer.add(new BillboardCollection());
            this.drawLayer.billboards = this.billboards; // 方便获取
        }

        this.labels = this.drawLayer._primitives.find((primitive) => primitive instanceof LabelCollection);
        if (!defined(this.labels)) {
            this.labels = this.drawLayer.add(new LabelCollection());
            this.drawLayer.labels = this.labels; // 方便获取
        }
    }

    /**
     * 绘制对应的临时图元对象
     * @private
     * 
     */
    _addPrimitive() {
        const { drawType, drawOptions, scene, radius } = this;
        const { id, isGround, extrudedHeight } = drawOptions;
        // id中的extrudedHeight主要是用来区分是否是拉伸体，并不能用来存储值，贴地几何不能拉伸
        const idAttribute = {
            drawType,
            id,
            isGround,
            extrudedHeight: isGround ? undefined : extrudedHeight
        };
        drawOptions.id = idAttribute;

        let positions, material, color;
        switch (drawType) {
            case DrawType.ELLIPSE: case DrawType.CIRCLE: // 椭圆、基本圆
                this._drawPrimitive = scene.primitives.add(new CustomEllipsePrimitive({
                    ...drawOptions,
                    center: this.positions[0],
                }));
                // 判断是否需要修改透明度
                color = Color.clone(this._drawPrimitive._color);   
                this.needToChangeAlpha = this.needToChangeAlpha && color.alpha === 1;
                if (this.needToChangeAlpha) {
                    this._color = Color.clone(color);
                    this._drawPrimitive.material = Material.fromType('Color', {
                        color: color.withAlpha(0.9),
                    });
                }
                break;
            case DrawType.ELLIPSOID: case DrawType.SPHERE: // 椭球、球
                const radius = defined(this.radius) ? this.radius : 0.001;
                this._drawPrimitive = scene.primitives.add(new CustomEllipsoidPrimitive({
                    ...drawOptions,
                    center: this.positions[0],
                    radii: new Cartesian3(radius, radius, radius)
                }));
                // 判断是否需要修改透明度
                color = Color.clone(this._drawPrimitive.color);
                this.needToChangeAlpha = this.needToChangeAlpha && color.alpha === 1;
                if (this.needToChangeAlpha) {
                    this._color = Color.clone(color);
                    this._drawPrimitive.color = color.withAlpha(0.9);
                }
                break;
            case DrawType.SQUARE: case DrawType.RECTANGLE: // 正方形、矩形
                positions = GeoUtil.getRectangleByCorner(this.positions);
                positions = positions.length > 0 ? positions : [...this.positions, ...this.positions]
                this._drawPrimitive = scene.primitives.add(new CustomRectanglePrimitive({
                    ...drawOptions,
                    positions
                }));
                break;
            case DrawType.PARABOLA: // 抛物线 
                this.vertexHeight = drawOptions.vertexHeight;
                this.samples = drawOptions.samples
                material = this._getLineMaterial(drawOptions, false);
                positions = GeoUtil.getLinkedPointList(...this.positions, this.vertexHeight, this.samples);
                positions = positions.length > 0 ? positions : [...this.positions];
                this._drawPrimitive = scene.primitives.add(new ParabolaPrimitive({
                    ...drawOptions,
                    material,
                    positions
                }));
                break;
            case DrawType.POLYLINE: // 折线
                material = this._getLineMaterial(drawOptions, false);
                this._drawPrimitive = scene.primitives.add(new CustomPolylinePrimitive({
                    ...drawOptions,
                    material,
                    positions: this.positions,
                }));
                break;
            case DrawType.POLYGON: // 多边形
                const { fillColor, alpha } = drawOptions;
                material = Material.fromType('Color', {
                    color: defined(alpha) ? Color.fromCssColorString(fillColor).withAlpha(alpha) : Color.fromCssColorString(fillColor),
                });
                this._drawPrimitive = scene.primitives.add(new CustomPolygonPrimitive({
                    ...drawOptions,
                    material,
                    positions: this.positions,
                }));
                break;
            case DrawType.BILLBOARD: // 图标              
                const { url, scale, disableDepthTestDistance, pixelOffset } = drawOptions;
                this._drawPrimitive = this.billboards.add({
                    id: idAttribute,
                    position: this.positions[0],
                    image: url,
                    scale,
                    disableDepthTestDistance,
                    pixelOffset,
                    show: false // 初次创建时不显示（防止不移动鼠标前图标位置无法正确获取的问题）
                });
                break;
        }
    }

    /**
     * 更新图元对象
     * @private
     */
    _updatePrimitive() {
        const { drawType, _drawPrimitive, isPoint, positions } = this;
        let { _center } = this;
        if (!_drawPrimitive) return;
        switch (drawType) {
            case DrawType.ELLIPSE: // 椭圆
                const semiMajorAxis = Cartesian3.distance(positions[0], positions[1]);
                _drawPrimitive.semiMajorAxis = semiMajorAxis;

                const semiMinorAxis = positions.length > 2 ? Cartesian3.distance(positions[0], positions[2]) : semiMajorAxis;
                _drawPrimitive.semiMinorAxis = semiMinorAxis;
                break;
            case DrawType.CIRCLE: // 基本圆
                _drawPrimitive.center = positions[0];
                _drawPrimitive.semiMajorAxis = isPoint ? parseFloat(this.radius) : Math.max(0.001, Cartesian3.distance(positions[0], positions[1]));
                break;
            case DrawType.ELLIPSOID:  // 椭球
                const radius1 = Cartesian3.distance(this.positions[0], this.positions[1]);
                const radius2 = positions.length > 2 ? Math.max(0.001, Cartesian3.distance(positions[0], positions[2])) : radius1;
                _drawPrimitive.center = Cartesian3.fromDegrees(_center[0], _center[1], _center[2] + radius1);
                _drawPrimitive.radii = new Cartesian3(radius1, radius2, radius1);
                break;
            case DrawType.SPHERE: // 球       
                let radius;
                if (isPoint) {
                    this._center = _center;
                    _center = GeoUtil.cartesianToArray(positions[0]);
                    radius = parseFloat(this.radius);
                } else {
                    radius = Math.max(0.001, Cartesian3.distance(positions[0], positions[1]));
                }
                _drawPrimitive.center = Cartesian3.fromDegrees(_center[0], _center[1], _center[2] + radius);
                _drawPrimitive.radii = new Cartesian3(radius, radius, radius);
                break;
            case DrawType.SQUARE:  // 正方形
                let squarePoints = GeoUtil.getRectangleByCorner(positions);
                squarePoints = squarePoints.length > 0 ? squarePoints : [...positions, ...positions]
                _drawPrimitive.setPosition(squarePoints);
                break;
            case DrawType.RECTANGLE: // 矩形  
                let angle = Math.PI / 2;
                if (positions.length > 2) {
                    angle = GeoUtil.getAngleByPoints(positions[0], positions[2], positions[1]);
                    angle = angle > 0 ? angle * 2 : Math.PI + angle * 2;
                }
                let rectanglePoints = GeoUtil.getRectangleByCorner(positions, angle);
                rectanglePoints = rectanglePoints.length > 0 ? rectanglePoints : [...positions, ...positions]
                _drawPrimitive.setPosition(rectanglePoints);
                break;
            case DrawType.PARABOLA: // 抛物线 
                const pointNum = positions.length;
                pointNum > 0 && (_drawPrimitive.end = positions[pointNum - 1]);
                break;
            case DrawType.POLYLINE: // 折线
            case DrawType.POLYGON: // 多边形
                _drawPrimitive.setPosition(positions);
                break;
            case DrawType.BILLBOARD: // 图标              
                _drawPrimitive.position = positions[0];
                // 避免初始位置未更新时显示
                if (_drawPrimitive.show === false && !(_drawPrimitive.position.equals(DEFAULT_POSITION))) {
                    _drawPrimitive.show = true;
                }
                break;
        }
    }

    /**
     * 完成图元绘制
     * @private
     * 
     * @see draw
     */
    _finishDrawing() {
        const { drawType, drawOptions, _drawPrimitive, scene } = this;
        this._tooltip.show = false;
        if (_drawPrimitive) {
            this._updatePrimitive();
            // 设置属性
            try {
                const { id, isGround, extrudedHeight, name, labelOffset } = drawOptions;
                // id中的extrudedHeight主要是用来区分是否是拉伸体，并不能用来存储值，贴地几何不能拉伸
                const idAttribute = {
                    drawType,
                    id,
                    isGround,
                    extrudedHeight: isGround ? undefined : extrudedHeight
                };
                drawOptions.id = idAttribute;

                let drawPrimitive, color;
                const notStyleKeys = ['name', 'drawType', 'id', 'labelOffset']; // 不属于绘制样式的属性列表
                let labelHeight = isGround ? 0 : (defined(extrudedHeight) ? parseFloat(extrudedHeight) : 0);
                switch (drawType) {
                    case DrawType.ELLIPSE: case DrawType.CIRCLE: // 椭圆、基本圆
                        // 还原
                        if (this.needToChangeAlpha) {
                            color = Color.clone(this._color);
                            _drawPrimitive.material = Material.fromType('Color', {
                                color: color.withAlpha(1),
                            });
                            this.needToChangeAlpha = false;
                        }
                        drawPrimitive = this.drawLayer.add(_drawPrimitive.clone());
                        break;
                    case DrawType.SQUARE: case DrawType.RECTANGLE: // 正方形、矩形
                    case DrawType.POLYGON: // 多边形
                        drawPrimitive = this.drawLayer.add(_drawPrimitive.clone());
                        break;
                    case DrawType.SPHERE: case DrawType.ELLIPSOID:  // 球体、椭球体   
                        // 还原
                        if (this.needToChangeAlpha) {
                            color = Color.clone(this._color);
                            _drawPrimitive.color = Color.clone(_drawPrimitive.color).withAlpha(1);
                            this.needToChangeAlpha = false;
                        }
                        drawPrimitive = this.drawLayer.add(_drawPrimitive.clone());
                        const radiiValue = drawPrimitive.radii;
                        labelHeight = radiiValue.z;
                        drawOptions.radii = radiiValue;
                        break;
                    case DrawType.PARABOLA: // 抛物线
                        drawPrimitive = this.drawLayer.add(_drawPrimitive.clone());
                        // 动态材质需要实时更新
                        DynamicMaterialType.includes(drawOptions.lineType) && (this.viewer.scene.requestRenderMode = false);
                        break;
                    case DrawType.POLYLINE: // 折线
                        drawPrimitive = this.drawLayer.add(_drawPrimitive.clone());
                        // 动态材质需要实时更新
                        DynamicMaterialType.includes(drawOptions.lineType) && (this.viewer.scene.requestRenderMode = false);
                        break;
                    case DrawType.BILLBOARD: // 图标              
                        drawPrimitive = _drawPrimitive;
                        break;
                }

                // 标注样式
                const labelStyle = {
                    pixelOffset: labelOffset,
                    verticalOrigin: VerticalOrigin.Bottom,
                    horizontalOrigin: HorizontalOrigin.CENTER,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                }

                // 添加文本标注
                const labelCart = GeoUtil.cartesianToArray(drawPrimitive.center || this.positions[0])
                const heightOffset = drawType !== DrawType.PARABOLA ? labelHeight * 1.2 : labelCart[2] * 0.2; // 标注高度偏移
                const drawLabel = this.labels.add({
                    id: idAttribute,
                    fillColor: Color.WHITE,
                    position: Cartesian3.fromDegrees(labelCart[0], labelCart[1], labelCart[2] + heightOffset),
                    text: name,
                    ...labelStyle
                });

                // 记录绘制图元的样式, 更新样式时需要同步更新
                const drawStyle = Util.removeObjectProperties(drawOptions, notStyleKeys);
                drawLabel.styles = {
                    labelStyle,
                    ...drawStyle
                };

                // 将文字标注挂载到绘制图元上
                drawPrimitive.label = drawLabel;

                // 移除绘制的图元对象
                (drawType !== DrawType.BILLBOARD) && scene.primitives.remove(this._drawPrimitive);
                this._drawPrimitive = undefined;

                this._tempPoints.forEach((entity) => {
                    this.viewer.entities.remove(entity);
                });
                this._tempPoints = [];
                this.positions = [];
                this._color = undefined;

                // 完成绘制
                this.clear();
                defined(this.okHandler) && this.okHandler(drawPrimitive);

                this.geomap.render();
            } catch (e) {
                console.error(e);
            }

        }
    }

    /**
     * 更新图元样式
     * 
     * @private
     * 
     */
    _updatePrimitiveStyle() {
        const { drawOptions, _drawPrimitive } = this;
        const { fillColor, alpha, drawType, lineColor, radius, extrudedHeight } = drawOptions;
        const colorStr = defined(fillColor) ? fillColor : lineColor;
        const color = !defined(colorStr)
            ? Color.RED.withAlpha(0.5)
            : (defined(alpha) ? Color.fromCssColorString(colorStr).withAlpha(alpha) : Color.fromCssColorString(colorStr));
        this._color = Color.clone(color); // 用于圆柱、球体修改透明度后的还原
        this.radius = parseFloat(defined(radius) ? radius : this.radius);
        this.extrudedHeight = parseFloat(defined(extrudedHeight) ? extrudedHeight : this.extrudedHeight);
        switch (drawType) {
            case DrawType.BILLBOARD: // 图标
                const { url, scale, disableDepthTestDistance, pixelOffset } = drawOptions;
                _drawPrimitive.image = url;
                _drawPrimitive.scale = scale;
                _drawPrimitive.disableDepthTestDistance = disableDepthTestDistance;
                _drawPrimitive.pixelOffset = pixelOffset; //  = new Cartesian2(0, -25)
                break;
            case DrawType.PARABOLA: case DrawType.POLYLINE:  // 抛物线  // 折线
                _drawPrimitive.material = this._getLineMaterial(drawOptions, false);
                _drawPrimitive.width = drawOptions.width;
                break;
            case DrawType.POLYGON: case DrawType.SQUARE: case DrawType.RECTANGLE: // 多边形  // 正方形 // 长方形
                _drawPrimitive.extrudedHeight = this.extrudedHeight;
                _drawPrimitive.material =
                    Material.fromType('Color', {
                        color,
                    });
                break;
            case DrawType.ELLIPSE: case DrawType.CIRCLE: // 椭圆 // 圆
                defined(this.radius) && (_drawPrimitive.semiMajorAxis = this.radius);
                _drawPrimitive.extrudedHeight = this.extrudedHeight;
                this.needToChangeAlpha = color.alpha === 1;
                _drawPrimitive.material =
                    Material.fromType('Color', {
                        color: this.needToChangeAlpha ? color.withAlpha(0.9) : color,
                    });
                break;
            case DrawType.SPHERE: case DrawType.ELLIPSOID:  // 球 // 椭球
                _drawPrimitive.radius = this.radius;
                this.needToChangeAlpha = color.alpha === 1;
                _drawPrimitive.color = this.needToChangeAlpha ? color.withAlpha(0.9) : color;
                break;
        }
        this.geomap.render();
    }

    /**
     * 添加临时绘制点位
     * 
     * @private
     */
    _addTempPoint(position) {
        const entity = this.viewer.entities.add({
            position,
            point: {
                ...this._pointStyle
            }
        })
        if (entity) {
            this._tempPoints.push(entity);
        }
    }


    /**
     * 更新绘制时的样式
     * 
     * @param {Object} options  样式，具体可参考drawHandler中对应方法的绘制参数
     * 
     * @see drawHandler
     */
    updateStyle(options) {
        this.drawOptions = {
            ...this.drawOptions,
            ...options
        };
        if (defined(this._drawPrimitive)) {
            this._updatePrimitiveStyle();
        }
        // if (defined(this._entity)) {
        //     this._updateEntityStyle();
        // }
    }

    /**
     * 开始图元的绘制
     * 
     * @param {Object} options 
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.POLYGON] 多边形
     * @param {String} [options.name='矩形'] 矩形实体名称
     * @param {Function} okHandler 绘制完成回调方法
     * @param {Function} cancelHandler 绘制取消回调方法
     * 
     * @see DrawHandler
     * 
     */
    draw(options, okHandler, cancelHandler) {
        super._startDraw(options, okHandler, cancelHandler);

        if (this._tooltip && !this._tooltip.isActivated) {
            this._tooltip.active();
        }

        this._tooltip.message = defaultValue(options.tipBeforeDrawing, '鼠标左键添加点， 右键结束绘制');
        this._tooltip.show = true;

        this.drawOptions = options;
        const {
            drawType,
            radius,
            extrudedHeight,
        } = options;
        // 是否需要改变透明度以防止绘制移动的时候球体/圆柱等不透明体不断拉近的问题
        this.needToChangeAlpha = (defined(radius) || defined(extrudedHeight)) && [DrawType.ELLIPSE, DrawType.CIRCLE, DrawType.ELLIPSOID, DrawType.SPHERE].includes(drawType);
        // 用于区分绘制的几何类型
        this.drawType = drawType;
        this.radius = radius;
        this.leftClickNum = 0;
        this.isPoint = TypeNeeds1PToAdd.includes(this.drawType) || (defined(radius) && TypeNeeds1PToStop.includes(this.drawType));
        if (this.isPoint) {
            this.positions[0] = DEFAULT_POSITION; 
            this._addPrimitive();
        }

        this.leftClickCallback = (cartesian) => {
            this.leftClickNum += 1;
            const pointNum = this.positions.length;
            switch (pointNum) {
                case 0:
                    this.positions.push(cartesian, cartesian);
                    if (TypeNeeds2PToAdd.includes(this.drawType)) {
                        this._center = GeoUtil.cartesianToArray(cartesian); // 椭球体能用上
                        // toCreate：[正方形、基本圆、球体、矩形、椭圆、椭球体、折线]
                        // this._addEntity();
                        this._addPrimitive();
                    }
                    defined(this.drawOptions.tipWhenDrawing) && (this._tooltip.message = this.drawOptions.tipWhenDrawing);
                    break;
                case 1:
                    if (this.isPoint) {
                        this.positions[0] = cartesian;
                        // this._finishDraw();
                        this._finishDrawing();
                    }
                    break;
                case 2:
                    this.positions[pointNum - 1] = cartesian;
                    if (TypeNeeds2PToStop.includes(this.drawType)) {
                        // toStop：[正方形、基本圆、球体]
                        // this._finishDraw();
                        this._finishDrawing();
                        return;
                    } else {
                        this.positions.push(cartesian);
                        if (TypeNeeds3PToAdd.includes(this.drawType)) {
                            // toCreate：[多边形]
                            // this._addEntity();
                            this._addPrimitive();
                        }
                    }
                    break;
                case 3:
                    this.positions[pointNum - 1] = cartesian;
                    if (TypeNeeds3PToFinish.includes(this.drawType)) {
                        // toStop：[椭圆、长方形、椭球体]
                        // this._finishDraw();
                        this._finishDrawing();
                        return;
                    }
                    this.positions.push(cartesian);
                    break;
                default:
                    // 只能右键结束的：[多边形、折线]
                    this.positions[pointNum - 1] = cartesian;
                    this.positions.push(cartesian);
                    break;
            }
            if (TypeNeedsAssitPoint.includes(this.drawType)) {
                this._addTempPoint(cartesian);
            }
            this._updatePrimitive();
            this.geomap.render(); // 防止拖动不连贯
        };

        this.mouseMoveCallback = (cartesian) => {
            const pointNum = this.positions.length;
            if (pointNum < 2 && !this.isPoint) return;
            // 只修改最后一点、其它不做任何操作
            this.positions[pointNum - 1] = cartesian;
            this._updatePrimitive();
            this.geomap.render(); // 防止拖动不连贯
        };

        this.rightClickCallback = () => {
            const pointNum = this.positions.length;

            if (pointNum > 0 && !this.isPoint) {
                this.positions.splice(pointNum - 1, 1);
            }
            switch (this.leftClickNum) {
                case 0:
                    // 所有的都需要取消
                    this.cancel(true);
                    break;
                case 1:
                    if (!this.isPoint) {
                        this.cancel(true);
                    } else {
                        // this._finishDraw();
                        this._finishDrawing();
                    }
                    return;
                case 2:
                    if (TypeNeeds3PToFinish.includes(this.drawType)) {
                        // toStop：[椭圆、长方形、椭球体]
                        // this._finishDraw();
                        this._finishDrawing();
                    } else {
                        // 多边形需要取消
                        TypeNeeds3PToAdd.includes(this.drawType) && this.cancel(true);

                        // 折线已经可以结束了
                        (this.drawType === DrawType.POLYLINE) && this._finishDrawing(); // this._finishDraw();
                    }
                    return;
                default:
                    // 多边形和折线的结束
                    // this._finishDraw();
                    this._finishDrawing();
                    break;
            }
        };
    }

    /**
     * 获取线段材质
     * @private
     * 
     * @param {Object} options 
     * @param {Boolean} [isEntity=true] 是否是实体材质
     * 
     * @returns {Material|MaterialProperty} 图元材质 / 实体材质
     * 
     * @see DrawHandler
     * 
     */
    _getLineMaterial(options, isEntity = true) {
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
            dynamicImg,
            speed,
            repeat = 1
        } = options;
        const color = defined(alpha) ? Color.fromCssColorString(lineColor).withAlpha(alpha) : Color.fromCssColorString(lineColor);
        let material;
        switch (lineType) {
            case CustomMaterialType.LINE_FLOW: // 流动线
                this.speed = speed;
                material = isEntity
                    ? new PolylineDynamicMaterialProperty({
                        color,
                        duration: !(defined(speed) && speed > 0) ? 800 :
                            new CallbackProperty(() => {
                                let lineLength = 0;
                                for (let i = 0, len = this.positions.length; i < len - 1; i++) {
                                    lineLength += Cartesian3.distance(this.positions[i], this.positions[i + 1]);
                                }
                                return (lineLength * 100 / this.speed);
                            }, false),
                        image: defined(dynamicImg) ? dynamicImg : DefaultData.IMG_DATA_TRANS,
                        repeat: new Cartesian2(repeat, 1)
                    })
                    : Material.fromType(Material.PolylineFlowType, {
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
                material = isEntity
                    ? new PolylineDashMaterialProperty(dashOptions)
                    : Material.fromType(Material.PolylineDashType, dashOptions)
                break;
            case CustomMaterialType.LINE_GROW: // 发光线
                const growOptions = {
                    color,
                    glowPower,
                    taperPower
                };
                material = isEntity
                    ? new PolylineGlowMaterialProperty(growOptions)
                    : Material.fromType(Material.PolylineGlowType, growOptions)
                break;
            case CustomMaterialType.LINE_COLOR: default: // 实线（颜色线）
                material = isEntity
                    ? color
                    : Material.fromType('Color', {
                        color,
                    });
                break;
        }
        return material;
    }

    /**
     * 取消几何图元绘制
     * 
     * @example
     * drawPrimitive.cancel();
     */
    cancel(hasStarted) {
        this.clear();
        this._tooltip.message = '';
        this._tooltip.show = false;

        // this.viewer.entities.remove(this._entity);
        // this._entity = undefined;

        // 移除绘制的图元对象
        if (this.drawType !== DrawType.BILLBOARD) {
            this.scene.primitives.remove(this._drawPrimitive);
        } else {
            this.billboards.remove(this._drawPrimitive);
        }
        this._drawPrimitive = undefined;

        this.positions = [];
        this._color = undefined;

        this._tempPoints.forEach((entity) => {
            this.viewer.entities.remove(entity);
        });
        this._tempPoints = [];

        // 取消回调方法,需要放在最后，避免循环绘制时右键结束无法正常继续
        hasStarted && defined(this.cancelHandler) && this.cancelHandler();

        this.geomap.render();
    }

    /**
     * 销毁
     * 
     */
    destroy() {
        this.cancel();
        this._tooltip.destroy();
        this.geomap.requestRenderMode = this._requestRenderMode;
        return destroyObject(this);
    }
}

// 初始位置（不能设置为原点，否则椭圆图元绘制会引发错误）
const DEFAULT_POSITION = new Cartesian3(1.0, 1.0, 1.0); 

// 临时点默认样式
const POINT_STYLE = {
    pixelSize: 10,
    color: Color.fromCssColorString('#FFFFFF'),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    outlineWidth: 2,
    outlineColor: Color.fromCssColorString('#398EF7'),
};

// 需要添加辅助点位的类型
const TypeNeedsAssitPoint = [DrawType.POLYLINE, DrawType.PARABOLA, DrawType.POLYGON, DrawType.RECTANGLE, DrawType.SQUARE];

// 仅需一个点
const TypeNeeds1PToAdd = [DrawType.BILLBOARD];
// 存在半径参数的情况下
const TypeNeeds1PToStop = [DrawType.CIRCLE, DrawType.SPHERE];

/**
 * 开始绘制至少需要2个点的类型
 * @private
 */
const TypeNeeds2PToAdd = [DrawType.CIRCLE, DrawType.SQUARE, DrawType.SPHERE, DrawType.ELLIPSE, DrawType.RECTANGLE, DrawType.ELLIPSOID, DrawType.POLYLINE, DrawType.PARABOLA];

/**
 * 结束绘制仅需要2个点的类型
 * @private
 */
const TypeNeeds2PToStop = [DrawType.CIRCLE, DrawType.SQUARE, DrawType.SPHERE, DrawType.PARABOLA];

/**
 * 开始绘制至少需要3个点的类型
 * @private
 */
const TypeNeeds3PToAdd = [DrawType.POLYGON]

/**
 * 结束绘制仅需要3个点的类型
 * @private
 */
const TypeNeeds3PToFinish = [DrawType.ELLIPSE, DrawType.RECTANGLE, DrawType.ELLIPSOID]

const DynamicMaterialType = [CustomMaterialType.LINE_FLOW];

export default DrawPrimitive;