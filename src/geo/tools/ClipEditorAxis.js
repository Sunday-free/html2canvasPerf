import destroyObject from 'cesium/Core/destroyObject';
import Cartesian3 from 'cesium/Core/Cartesian3';
import Cartesian2 from 'cesium/Core/Cartesian2';
import Matrix4 from 'cesium/Core/Matrix4';
import Matrix3 from 'cesium/Core/Matrix3';
import CesiumMath from 'cesium/Core/Math';
import Color from 'cesium/Core/Color';
import Transforms from 'cesium/Core/Transforms';
import PrimitiveCollection from 'cesium/Scene/PrimitiveCollection';
import Material from "cesium/Scene/Material";
import Plane from 'cesium/Core/Plane';
import CallbackProperty from 'cesium/DataSources/CallbackProperty';
import ScreenSpaceEventType from "cesium/Core/ScreenSpaceEventType";
import ScreenSpaceEventHandler from "cesium/Core/ScreenSpaceEventHandler";
import Check from 'cesium/Core/Check';
import SceneTransforms from 'cesium/scene/SceneTransforms';
import defaultValue from "cesium/Core/defaultValue.js";
import DistanceDisplayCondition from 'cesium/core/DistanceDisplayCondition';

import EditorAxisType from '../constant/EditorAxisType';
import ClipModeType from '../constant/ClipModeType';
import ArcPrimitive from '../layer/basePrimitive/ArcPrimitive';
import LinePrimitive from '../layer/basePrimitive/LinePrimitive';
import GeoUtil from '../utils/GeoUtil';
import Util from '../utils/Util';
import CustomPolygonPrimitive from '../layer/basePrimitive/CustomPolygonPrimitive';
import CustomPolylinePrimitive from '../layer/basePrimitive/CustomPolylinePrimitive';


class ClipEditorAxis {
    /**
     * 自由剖切编辑轴
     * @constructor 
     * @alias ClipEditorAxis
     * 
     * @param {GeoMap} geomap 三维场景对象
     * @param {Object} options 编辑轴初始化参数
     * @param {Cartesian3} options.center 轴中心点坐标（剖切对象中心点）
     * @param {Number} options.radius 编辑轴半径
     * @param {Number} [options.limitRadius] 编辑轴限制范围半径，默认为radius
     * @param {ClipModeType} [options.clipMode=BOSGeo.ClipModeType.X] 裁切模式
     * @param {Boolean} [options.show=true] 编辑轴是否可见
     * @param {Number} [options.pickLimit=3] 鼠标移动拾取时返回的对象个数，最小值为1(用于移动轴被遮挡时的拾取，值越大越损耗性能)
     * @param {Number} [options.minimumScale=0.2] 编辑轴最小尺寸，大于等于0.1，（尺寸倍数相对于radius值而言）
     * @param {Number} [options.maximumScale=5] 编辑轴最大尺寸，不能小于minimumScale，小于则取minimumScale，（尺寸倍数相对于radius值而言）
     * @param {Number} [options.planeScale=0.5] 剖切平面边长尺寸，（尺寸倍数相对于radius值而言）
     * @param {Function} [options.callback] 编辑轴位置更新方法
     * 
     * @example
     * const clipEditorAxis = new BOSGeo.ClipEditorAxis(map, {
     *   center: new BOSGeo.Cartesian3(0,0,0),
     *   radius: 6372000
     * });
     * 
     */
    constructor(geomap, options = {}) {
        const {
            center,
            radius,
            limitRadius,
            clipMode = ClipModeType.X,
            show = true,
            pickLimit = 3,
            minimumScale = 0.2,
            maximumScale = 5,
            planeScale = 0.5,
            callback
        } = options;
        this.geomap = geomap;
        this.scene = geomap.viewer.scene;

        this.center = center;
        this.radius = radius;
        this.limitRadius = defaultValue(limitRadius, radius);

        this._minimumScale = Math.max(minimumScale, 0.1);
        this._maximumScale = Math.max(maximumScale, this._minimumScale);
        this._planeScale = Math.max(planeScale, 0);
        this.scale = 0.5;

        this.clipMode = clipMode;
        this.callback = callback;

        // 创建编辑轴
        this.axisPrimitives = geomap.scene.primitives.add(new PrimitiveCollection({ show }));
        this.tempAxisPoints = [];

        this._show = show;
        this._pickLimit = Math.max(pickLimit, 1);
        this.isActive = false;// 是否正在编辑中

        this.highlightAxisType = undefined; // 当前正在编辑中的轴
        this.unfixedAxisList = []; // 记录当前可编辑的轴类型，便于高亮状态的切换
        this.circleAxisType = undefined; // 当前高亮状态的圆轴类型

        // 为避免频繁计算，初始化时计算好，若修改center再更新
        const localSystem = Transforms.eastNorthUpToFixedFrame(center);
        this.worldToLocalMatrix = Matrix4.inverse(localSystem, new Matrix4());

        // 创建编辑轴
        this.createEditorAxis(clipMode);

        // 绑定事件
        this.addEventHandler();
        return;
    }

    /**
     * 编辑轴是否可见
     * @property {Boolean}
     * 
     * @default true
     */
    get show() {
        return this._show;
    }
    set show(value) {
        Check.typeOf.bool("value", value);
        if (value !== this._show) {
            this._show = value;
            this.axisPrimitives.show = value;
            this.tempAxisPoints.forEach((point) => {
                point.show = value;
            });
            this.geomap.render();
        }
    }

    /**
     * 鼠标移动拾取时返回的对象个数，最小值为1(用于移动轴被遮挡时的拾取，值越大越损耗性能)
     * @property {Number}
     * 
     * @default 3
     */
    get pickLimit() {
        return this._pickLimit;
    }
    set pickLimit(value) {
        Check.typeOf.number("value", value);
        this._pickLimit = Math.max(value, 1);
    }

    /**
     * 编辑轴最小尺寸，大于等于0.1，（尺寸倍数相对于radius值而言）
     * @property {Number}
     * 
     * @default 0.2
     */
    get minimumScale() {
        return this._minimumScale;
    }
    set minimumScale(value) {
        Check.typeOf.number("value", value);
        this._minimumScale = Math.max(value, 0.1);
    }

    /**
     * 编辑轴最大尺寸，不能小于minimumScale，小于则取minimumScale，（尺寸倍数相对于radius值而言）
     * @property {Number}
     * 
     * @default 5
     */
    get maximumScale() {
        return this._maximumScale;
    }
    set maximumScale(value) {
        Check.typeOf.number("value", value);
        this._maximumScale = Math.max(value, this._minimumScale);
    }

    /**
     * 剖切平面边长尺寸，（尺寸倍数相对于radius值而言）
     * @property {Number}
     * 
     * @default 0.5
     */
    get planeScale() {
        return this._planeScale;
    }
    set planeScale(value) {
        Check.typeOf.number("value", value);
        const curScale = Math.max(value, 0);
        if (curScale !== this._planeScale) {
            this._planeScale = curScale;
            if (this.customPlane && this.customOutline) {
                const cornerPosition = getCorners(this.anchorPoints[0], this.planeAxis, this.radius * curScale);
                this.customPlane.setPosition(cornerPosition);
                this.customOutline.setPosition([...cornerPosition, cornerPosition[0]]);
            }
        }
    }

    /**
     * 筛选可移动的轴
     * @private
     * 
     * @param {Array.<*>} pickList 
     * @returns {*}
     */
    getTargetAxis(pickList) {
        let target;
        let curPickObj;
        for (let i = 0, len = pickList.length; i < len; i++) {
            curPickObj = pickList[i];
            if (curPickObj && curPickObj.id && curPickObj.id.isUnfixed && curPickObj.id.axisType) {
                target = curPickObj;
                destroyObject(curPickObj);
                break;
            }
        }
        return target;
    }

    /**
     * 添加事件监听
     * 
     * @private
     */
    addEventHandler() {
        const self = this;
        const scene = self.scene;

        if (this.handler === undefined) {
            this.handler = new ScreenSpaceEventHandler(scene.canvas);
        }

        // 鼠标移动
        this.handler.setInputAction((movement) => {
            if (!movement.endPosition) return;
            if (self.isActive) {
                const { startPosition, endPosition } = movement;
                startPosition && endPosition && self.updateAxisTransform(startPosition, endPosition);
            } else {
                // 悬浮高亮状态设置

                const pickList = scene.drillPick(movement.endPosition, self._pickLimit);
                const object = self.getTargetAxis(pickList);
                object ? self.highlightAxis(object.id.axisType) : self.highlightAxis(undefined);
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        // 鼠标左键按下
        this.handler.setInputAction((movement) => {
            if (!movement.position || self.isActive || self.highlightAxisType === undefined) return;
            // const object = scene.pick(movement.position);
            const pickList = scene.drillPick(movement.position, self._pickLimit);
            const object = self.getTargetAxis(pickList);
            if (object) { // && object.id && object.id.isUnfixed) {
                self.geomap.enableControl = false;
                self.isActive = true;
            }
        }, ScreenSpaceEventType.LEFT_DOWN);

        // 鼠标左键弹上
        this.handler.setInputAction((event) => {
            self.geomap.enableControl = true;
            self.isActive = false;
        }, ScreenSpaceEventType.LEFT_UP);

        this.scaleZoomFunction = self.updateScaleByDistance.bind(this)
        scene.preRender.addEventListener(this.scaleZoomFunction);
    }

    /**
     * 缩放尺寸
     * 
     * @private
     */
    updateScaleByDistance() {
        const { center, scene, radius, scale, _localAxisInfo, anchorPoints, axisPrimitives, _maximumScale, _minimumScale } = this;
        const distance = Cartesian3.distance(center, scene.camera.positionWC);
        const curScale = Math.round(distance / radius / 20 * 10) / 10;
        if (curScale !== scale && curScale <= _maximumScale && curScale >= _minimumScale) {
            this.scale = curScale;
            const origin = anchorPoints[0];

            this.modelMatrix = getLocalScaleMatrix(_localAxisInfo, origin, new Cartesian3(curScale, curScale, curScale));
            // 更新编辑轴图元（）
            axisPrimitives._primitives.forEach((primitive) => {
                primitive.modelMatrix = this.modelMatrix;
            });


            // 重新计算锚点
            const { normalX, normalY, normalZ } = _localAxisInfo;
            const scalar = curScale * radius;
            this.anchorPoints[1] = Util.addVectorInScalar(origin, normalX, scalar);
            this.anchorPoints[2] = Util.addVectorInScalar(origin, normalY, scalar);
            this.anchorPoints[3] = Util.addVectorInScalar(origin, normalZ, scalar);
        }
    }

    /**
     * 移除事件监听
     * @private
     */
    removeEventHandler() {
        if (this.handler !== undefined) {
            this.handler.destroy();
            this.handler = undefined;
        }
        this.scene.preRender.removeEventListener(this.scaleZoomFunction);
    }

    /**
     * 更新坐标轴的转换矩阵（平移/旋转）
     * @private
     * 
     * @param {Cartesian2} startPoint 
     * @param {Cartesian2} endPoint 
     */
    updateAxisTransform(startPoint, endPoint) {

        const { anchorPoints, scene, radius, highlightAxisType, scale, _planeScale } = this;

        const originAnchor = SceneTransforms.wgs84ToWindowCoordinates(scene, anchorPoints[0]);
        if (PanAxisTypeList.includes(highlightAxisType)) {
            // 屏幕上移动的范围
            const moving = Cartesian2.subtract(endPoint, startPoint, new Cartesian2());

            // 获取当前移动的轴在屏幕坐标系下的单位向量
            const anchorIndex = DEFAULT_AxisAnchorIndexInfo[highlightAxisType];
            const anchor = SceneTransforms.wgs84ToWindowCoordinates(scene, anchorPoints[anchorIndex]);
            const normal = Cartesian2.subtract(anchor, originAnchor, new Cartesian2());
            const screenNormal = Cartesian2.normalize(normal, new Cartesian2());

            // TODO: There's some problems here when the line be seen as a point!
            // 屏幕上像素单位与世界坐标系下的单位米的换算
            const scalar = screenNormal.y !== 0 ? normal.y / screenNormal.y : normal.x / screenNormal.x;

            // 真实移动距离，单位为米
            const distance = Cartesian2.dot(moving, screenNormal) * radius / scalar;

            // 世界坐标系下的平移方向的单位向量
            let curNormal = Cartesian3.subtract(anchorPoints[anchorIndex], anchorPoints[0], new Cartesian3());
            curNormal = Cartesian3.normalize(curNormal, curNormal);

            // 世界坐标系下的真实平移量
            const worldTranslation = Cartesian3.multiplyByScalar(curNormal, distance, new Cartesian3());

            // 更新剖切面
            const sumDistance = this.distance + distance;

            if (this.limitRadius <= Math.abs(sumDistance)) {
                return;
            }

            this.distance = sumDistance;

            // 同步更新编辑轴上的锚点
            this.anchorPoints = anchorPoints.map((point) => {
                return Cartesian3.add(point, worldTranslation, new Cartesian3());
            });

            this.modelMatrix = getLocalScaleMatrix(this._localAxisInfo, this.anchorPoints[0], new Cartesian3(scale, scale, scale));
            // 更新编辑轴图元（）
            this.axisPrimitives._primitives.forEach((primitive) => {
                primitive.center = this.anchorPoints[0];
                primitive.modelMatrix = this.modelMatrix;
            });

        } else if (RotateAxisTypeList.includes(highlightAxisType)) {
            // 获取旋转轴所在平面上的两个锚点对应的屏幕坐标
            const anchorIndexs = DEFAULT_AxisAnchorIndexInfo[highlightAxisType];
            const anchor1 = SceneTransforms.wgs84ToWindowCoordinates(scene, this.anchorPoints[anchorIndexs[0]]);
            const anchor2 = SceneTransforms.wgs84ToWindowCoordinates(scene, this.anchorPoints[anchorIndexs[1]]);
            // if (!anchor1 || !anchor2) return;

            // 计算屏幕坐标系下，原始呈直角的轴的夹角和方向
            const axisNormal1 = Cartesian2.subtract(anchor1, originAnchor, new Cartesian2());
            const axisNormal2 = Cartesian2.subtract(anchor2, originAnchor, new Cartesian2());
            const normalAngle = Cartesian2.angleBetween(axisNormal2, axisNormal1);
            const anchorDirection = axisNormal1.x * axisNormal2.y - axisNormal2.x * axisNormal1.y;

            // 计算屏幕坐标系下，鼠标拖拉的夹角和方向
            const lineNormal1 = Cartesian2.subtract(startPoint, originAnchor, new Cartesian2());
            const lineNormal2 = Cartesian2.subtract(endPoint, originAnchor, new Cartesian2());
            const targetAngle = Cartesian2.angleBetween(lineNormal2, lineNormal1);
            const lineDirection = lineNormal1.x * lineNormal2.y - lineNormal2.x * lineNormal1.y;

            // 计算局部坐标系下的旋转角度，单位为度
            const direction = anchorDirection * lineDirection > 0 ? 1 : -1;
            const changeAngle = 90 * direction * targetAngle / normalAngle; // CesiumMath.PI_OVER_TWO

            // 获取当前旋转矩阵
            const rotation = getRotationByAxisType(highlightAxisType, changeAngle);

            // 更新坐标轴上的点位置
            this.updateRotationTranslation(rotation);

            // 获取最新的剖切面——法向量和距离
            const clipPlane = this.getClipPlane();
            this.planeNormal = clipPlane.normal;
            this.distance = clipPlane.distance;

        }

        // 更新底部剖切面
        const cornerPosition = getCorners(this.anchorPoints[0], this.planeAxis, radius * _planeScale);
        this.customPlane.setPosition(cornerPosition);
        this.customOutline.setPosition([...cornerPosition, cornerPosition[0]]);

        // 更新平面和剖切回调方法
        this.callback && this.callback(new Plane(this.planeNormal, this.distance));

        this.geomap.render();
    }

    /**
     * 更新因旋转导致的局部坐标系相关信息
     * @private
     * 
     * @param {Matrix3} rotation 
     */
    updateRotationTranslation(rotation) {
        const { anchorLocalPoints, _localAxisInfo, anchorPoints, clipMode, scale } = this;
        const localRotateTranslate = anchorLocalPoints.map(point => {
            return Cartesian3.multiplyByScalar(
                Cartesian3.subtract(
                    Matrix3.multiplyByVector(rotation, point, new Cartesian3()),
                    point,
                    new Cartesian3()
                ),
                scale,
                new Cartesian3()
            );
        });

        const origin = anchorPoints[0];
        // 更新因旋转引起的锚点平移变换
        this.anchorPoints[1] = Cartesian3.add(
            anchorPoints[1],
            transLocalToWorld(_localAxisInfo, localRotateTranslate[1]),
            new Cartesian3()
        );
        this.anchorPoints[2] = Cartesian3.add(
            anchorPoints[2],
            transLocalToWorld(_localAxisInfo, localRotateTranslate[2]),
            new Cartesian3()
        );
        this.anchorPoints[3] = Cartesian3.add(
            anchorPoints[3],
            transLocalToWorld(_localAxisInfo, localRotateTranslate[3]),
            new Cartesian3()
        );

        // 计算三个轴最新的单位向量
        let normalX = Cartesian3.subtract(this.anchorPoints[1], origin, new Cartesian3());
        normalX = Cartesian3.normalize(normalX, new Cartesian3());

        let normalY = Cartesian3.subtract(this.anchorPoints[2], origin, new Cartesian3());
        normalY = Cartesian3.normalize(normalY, new Cartesian3());

        let normalZ = Cartesian3.subtract(this.anchorPoints[3], origin, new Cartesian3());
        normalZ = Cartesian3.normalize(normalZ, new Cartesian3());

        this._localAxisInfo = { normalX, normalY, normalZ };
        // 更新轴的局部坐标信息（重新计算顶点坐标）
        this.axisPrimitives._primitives.forEach((primitive) => {
            primitive.localAxisInfo = this._localAxisInfo;
        });

        this.planeAxis = getPlaneAxis(clipMode, this._localAxisInfo);
    }

    /**
     * 添加坐标轴上的端点
     * 
     * @private
     */
    addAnchorPoints() {
        const show = this._show;
        const distanceDisplayCondition = new DistanceDisplayCondition(0, this.radius * this.maximumScale * 10);
        const pixeleSize = 6;
        const outlineWidth = 5;
        const color = Color.WHITE.withAlpha(0);
        const disableDepthTestDistance = 100000;
        this.tempAxisPoints.push(this.geomap.viewer.entities.add({
            show,
            position: new CallbackProperty(() => {
                return this.anchorPoints[0]
            }, false),
            point: {
                pixeleSize,
                color,
                disableDepthTestDistance,
                outlineWidth,
                outlineColor: Color.DARKGREY,
                distanceDisplayCondition
            }
        }));
        this.tempAxisPoints.push(this.geomap.viewer.entities.add({
            show,
            position: new CallbackProperty(() => {
                return this.anchorPoints[1]
            }, false),
            point: {
                pixeleSize,
                color,
                disableDepthTestDistance,
                outlineWidth,
                outlineColor: Color.GREEN,
                distanceDisplayCondition
            }
        }));
        this.tempAxisPoints.push(this.geomap.viewer.entities.add({
            show,
            position: new CallbackProperty(() => {
                return this.anchorPoints[2]
            }, false),
            point: {
                pixeleSize,
                color,
                disableDepthTestDistance,
                outlineWidth,
                outlineColor: Color.BLUE,
                distanceDisplayCondition
            }
        }));
        this.tempAxisPoints.push(this.geomap.viewer.entities.add({
            show,
            position: new CallbackProperty(() => {
                return this.anchorPoints[3]
            }, false),
            point: {
                pixeleSize,
                color,
                disableDepthTestDistance,
                outlineWidth,
                outlineColor: Color.RED,
                distanceDisplayCondition
            }
        }));
    }

    /**
    * 获取切换剖切模式时的初始信息
    * @private
    * 
    * @param {ClipModeType} clipMode 剖切模式 
    * @param {Cartesian3} center 轴原点
    * @param {Number} radius 轴半径
    * 
    * @returns {Object} {normal: Cartesian3, anchorPoints: Cartesian3[]} 
    *  
    * @description
    *   normal: 局部坐标系下平面单位法向量，
    *   anchorPoints: [origin, x, y, z]
    *   axisAnchorIndexInfo: 记录各个科编辑轴上的锚点（用于平移旋转时用）
    */
    getInitInfo(clipMode, center, radius) {
        let normal = Cartesian3.UNIT_X;
        const anchorPoints = [];
        if (!this._localAxisInfo) return { normal, anchorPoints };
        anchorPoints.push(center);

        let { normalX, normalY, normalZ } = this._localAxisInfo;
        switch (clipMode) {
            case ClipModeType.X: default:
                normal = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
                anchorPoints.push(Util.addVectorInScalar(center, normalX, radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalY, radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalZ, radius));
                break;
            case ClipModeType.Y:
                normal = Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3());
                anchorPoints.push(Util.addVectorInScalar(center, normalX, radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalY, radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalZ, radius));
                break;
            case ClipModeType.Z:
                normal = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
                anchorPoints.push(Util.addVectorInScalar(center, normalX, radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalY, radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalZ, radius));
                break;
            case ClipModeType.MINUS_X:
                normal = Cartesian3.UNIT_X;
                anchorPoints.push(Util.addVectorInScalar(center, normalX, -radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalY, -radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalZ, radius));

                normalX = Cartesian3.negate(normalX, new Cartesian3());
                normalY = Cartesian3.negate(normalY, new Cartesian3());
                break;
            case ClipModeType.MINUS_Y:
                normal = Cartesian3.UNIT_Y;
                anchorPoints.push(Util.addVectorInScalar(center, normalX, -radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalY, -radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalZ, radius));

                normalX = Cartesian3.negate(normalX, new Cartesian3());
                normalY = Cartesian3.negate(normalY, new Cartesian3());
                break;
            case ClipModeType.MINUS_Z:
                normal = Cartesian3.UNIT_Z;
                // 为了在保证平移轴朝地下和右手系的情况下，需要进行如下变化
                anchorPoints.push(Util.addVectorInScalar(center, normalX, -radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalY, radius));
                anchorPoints.push(Util.addVectorInScalar(center, normalZ, -radius));

                normalX = Cartesian3.negate(normalX, new Cartesian3());
                normalZ = Cartesian3.negate(normalZ, new Cartesian3());
                break;
        }
        this._localAxisInfo = { normalX, normalY, normalZ };
        return { normal, anchorPoints };
    }

    /**
     * 根据当前剖切模式和剖切中心点动态实时计算剖切面法向量
     * @private 
     * 
     * @returns {Plane} { normal: Cartesian3, distance: Number }
     */
    getClipPlane() {
        const { worldToLocalMatrix, center, clipMode, anchorPoints } = this;
        const { normalX, normalY, normalZ } = this._localAxisInfo;
        let planeNormalInWorld;
        switch (clipMode) {
            case ClipModeType.X: case ClipModeType.MINUS_X: default:
                planeNormalInWorld = normalX;
                break;
            case ClipModeType.Y: case ClipModeType.MINUS_Y:
                planeNormalInWorld = normalY;
                break;
            case ClipModeType.Z: case ClipModeType.MINUS_Z:
                planeNormalInWorld = normalZ;
                break;
        }

        // 1.计算当前平移轴上距离轴原点一个单位长度的点P在世界坐标轴下的坐标
        const pointInNormal = Cartesian3.add(center, planeNormalInWorld, new Cartesian3());
        // 2.计算点P相对于剖切局部坐标系下的坐标
        let localPoint = Matrix4.multiplyByPoint(worldToLocalMatrix, pointInNormal, new Cartesian3());
        // 3.计算平移轴在剖切局部坐标系下的单位向量
        const planeNormal = Cartesian3.negate(Cartesian3.normalize(localPoint, localPoint), new Cartesian3());

        const initPlane = new Plane(planeNormal, 0);
        // 4.计算当前剖切面上任意一点A0在剖切局部坐标系下的坐标
        const newCenter = Matrix4.multiplyByPoint(worldToLocalMatrix, anchorPoints[0], new Cartesian3());
        // 5.计算剖切面的distance = 剖切面上任意一点P离平行剖切面且过剖切局部坐标系原点的距离 的相反数
        const distance = -1 * Plane.getPointDistance(initPlane, newCenter);
        return new Plane(planeNormal, distance);
    }

    /**
     * 根据剖切模式获取平移线拖动轴的类型和方向
     * @private
     * 
     * @param {ClipModeType} clipMode 裁切模式
     * @param {Number} [lineIndex=0] 轴的先后顺序(0, 1, 2)，依据当前裁切模式x, y, z
     * 
     * @returns {Object}  格式为{axisType: EditorAxisType, direction: Boolean}
     */
    getLineAxisTypeAndDirection(clipMode, lineIndex = 0) {
        let axisType;
        let isInverse = false;
        switch (clipMode) {
            case ClipModeType.X: default:
                axisType = EditorAxisType.XPAN;
                break;
            case ClipModeType.Y:
                axisType = EditorAxisType.YPAN;
                break;
            case ClipModeType.Z:
                axisType = EditorAxisType.ZPAN;
                break;
            case ClipModeType.MINUS_X:
                axisType = EditorAxisType.XPAN;
                isInverse = true;
                break;
            case ClipModeType.MINUS_Y:
                axisType = EditorAxisType.YPAN;
                isInverse = true;
                break;
            case ClipModeType.MINUS_Z:
                axisType = EditorAxisType.ZPAN;
                isInverse = true;
                break;
        }
        if (lineIndex === 1) {
            switch (axisType) {
                case EditorAxisType.XPAN:
                    axisType = EditorAxisType.YPAN;
                    break;
                case EditorAxisType.YPAN: default:
                    axisType = EditorAxisType.ZPAN;
                    break;
                case EditorAxisType.ZPAN:
                    axisType = EditorAxisType.XPAN;
                    break;
            }
        } else if (lineIndex === 2) {
            switch (axisType) {
                case EditorAxisType.XPAN:
                    axisType = EditorAxisType.ZPAN;
                    break;
                case EditorAxisType.YPAN:
                    axisType = EditorAxisType.XPAN;
                    break;
                case EditorAxisType.ZPAN: default:
                    axisType = EditorAxisType.YPAN;
                    break;
            }
        }
        return { axisType, isInverse };
    }

    /**
     * 根据剖切模式获取旋转弧线拖动轴的类型和方向
     * @private
     * 
     * @param {ClipModeType} clipMode 裁切模式
     * @param {Number} lineIndex 轴的先后顺序(0, 1, 2)，依据当前裁切模式xy、yz、zx顺序，起点以完整底圆为起点，如底圆在yz平面上则第二个半圆在xy平面上，以此类推
     * 
     * @returns {Object}  格式为{axisType: EditorAxisType, direction: Boolean}
     */
    getCircleAxisTypeAndDirection(clipMode, lineIndex = 0) {
        let axisType;
        let isInverse = false;
        switch (clipMode) {
            case ClipModeType.X: default:
                axisType = EditorAxisType.XROTATE;
                break;
            case ClipModeType.Y:
                axisType = EditorAxisType.YROTATE;
                break;
            case ClipModeType.Z:
                axisType = EditorAxisType.ZROTATE;
                break;
            case ClipModeType.MINUS_X:
                axisType = EditorAxisType.XROTATE;
                isInverse = true;
                break;
            case ClipModeType.MINUS_Y:
                axisType = EditorAxisType.YROTATE;
                isInverse = true;
                break;
            case ClipModeType.MINUS_Z:
                axisType = EditorAxisType.ZROTATE;
                isInverse = true;
                break;
        }
        if (lineIndex === 1) {
            switch (axisType) {
                case EditorAxisType.XROTATE:
                    axisType = EditorAxisType.YROTATE;
                    break;
                case EditorAxisType.YROTATE: default:
                    axisType = EditorAxisType.ZROTATE;
                    break;
                case EditorAxisType.ZROTATE:
                    axisType = EditorAxisType.XROTATE;
                    break;
            }
        } else if (lineIndex === 2) {
            switch (axisType) {
                case EditorAxisType.XROTATE:
                    axisType = EditorAxisType.ZROTATE;
                    break;
                case EditorAxisType.YROTATE:
                    axisType = EditorAxisType.XROTATE;
                    break;
                case EditorAxisType.ZROTATE: default:
                    axisType = EditorAxisType.YROTATE;
                    break;
            }
        }
        return { axisType, isInverse };
    }

    /**
     * 创建编辑轴
     * @private
     * 
     * @param {ClipModeType} clipMode 
     */
    createEditorAxis(clipMode) {
        try {
            this.unfixedAxisList = [];
            // 编辑轴局部坐标系三轴方向向量，会动态变化（再次创建需要重新计算）

            const { center, radius, axisPrimitives, scale, _planeScale } = this;

            const _localAxisInfo = GeoUtil.getLocalAxisInfo(center);
            this._localAxisInfo = _localAxisInfo;
            this.modelMatrix = getLocalScaleMatrix(_localAxisInfo, center, new Cartesian3(scale, scale, scale));
            const modelMatrix = this.modelMatrix;

            // 底部不可编辑的旋转轴
            const circleAxisType = this.getCircleAxisTypeAndDirection(clipMode);
            axisPrimitives.add(
                new ArcPrimitive({
                    center,
                    radius,
                    modelMatrix,
                    ...DEFAULT_Circle,
                    ...circleAxisType
                })
            );

            // 第一个可编辑的旋转半轴
            const halfCircleAxis1Type = this.getCircleAxisTypeAndDirection(clipMode, 1);
            axisPrimitives.add(
                new ArcPrimitive({
                    center,
                    radius,
                    modelMatrix,
                    ...DEFAULT_HalfCircle1,
                    ...halfCircleAxis1Type
                })
            );
            this.unfixedAxisList.push({ axisType: halfCircleAxis1Type.axisType, color: DEFAULT_HalfCircle1.color });

            // 第二个可编辑的旋转半轴
            const halfCircleAxis2Type = this.getCircleAxisTypeAndDirection(clipMode, 2);
            axisPrimitives.add(
                new ArcPrimitive({
                    center,
                    radius,
                    modelMatrix,
                    ...DEFAULT_HalfCircle2,
                    ...halfCircleAxis2Type
                })
            );
            this.unfixedAxisList.push({ axisType: halfCircleAxis2Type.axisType, color: DEFAULT_HalfCircle2.color });

            // 可编辑的平移轴
            const unfixedLineType = this.getLineAxisTypeAndDirection(clipMode);
            axisPrimitives.add(
                new LinePrimitive({
                    center,
                    radius,
                    modelMatrix,
                    depthTestEnabled: false,
                    ...DEFAULT_UnfixedLine,
                    ...unfixedLineType,
                })
            );
            this.unfixedAxisList.push({ axisType: unfixedLineType.axisType, color: DEFAULT_UnfixedLine.color });

            // 第一个固定的平移轴
            const fixedLine1Type = this.getLineAxisTypeAndDirection(clipMode, 1);
            axisPrimitives.add(
                new LinePrimitive({
                    center,
                    radius,
                    modelMatrix,
                    depthTestEnabled: false,
                    ...DEFAULT_FixedLine,
                    ...fixedLine1Type,
                })
            );

            // 第二个固定的平移轴
            const fixedLine2Type = this.getLineAxisTypeAndDirection(clipMode, 2);
            axisPrimitives.add(
                new LinePrimitive({
                    center,
                    radius,
                    modelMatrix,
                    depthTestEnabled: false,
                    ...DEFAULT_FixedLine,
                    ...fixedLine2Type,
                })
            );

            // 更新编辑轴方向
            const { normal, anchorPoints } = this.getInitInfo(clipMode, center, radius * scale);
            // 剖切面法向量和剖切距离
            this.planeNormal = normal;
            this.distance = 0;

            // 记录初始状态下四个顶点（原点、x轴、y轴、z轴R距离的四个点用于屏幕移动判断）
            this.anchorPoints = anchorPoints;

            // 除非计算this.anchorPoints的radius变化了，否则不更新
            this.anchorLocalPoints = [
                new Cartesian3(0, 0, 0),
                new Cartesian3(radius, 0, 0),
                new Cartesian3(0, radius, 0),
                new Cartesian3(0, 0, radius)
            ];

            this.planeAxis = getPlaneAxis(clipMode, _localAxisInfo);
            const cornerPosition = getCorners(center, this.planeAxis, radius * _planeScale);

            // 剖切面
            this.customPlane = axisPrimitives.add(
                new CustomPolygonPrimitive({
                    ...DEFAULT_FixedPlane,
                    positions: cornerPosition,
                    depthTestEnabled: false
                })
            );
            // 剖切面轮廓
            this.customOutline = axisPrimitives.add(
                new CustomPolylinePrimitive({
                    ...DEFAULT_FixedPlaneOutline,
                    depthTestEnabled: false,
                    positions: [...cornerPosition, cornerPosition[0]]
                })
            );

            // 添加锚点实体
            this.addAnchorPoints();
        } catch (e) {
            console.log('createEditorAxis 异常：', e);
        }
    }

    /**
     * 切换剖切模式
     * 
     * @param {ClipModeType} clipMode 想要切换的剖切模式
     * 
     * @example
     * clipEditorAxis.switchClipMode(BOSGeo.ClipModeType.Y);
     */
    switchClipMode(clipMode) {
        if (clipMode !== this.clipMode) {
            this.axisPrimitives.removeAll();
            this.tempAxisPoints.forEach((point) => {
                this.geomap.viewer.entities.remove(point);
            });
            this.tempAxisPoints = [];
            this.clipMode = clipMode;
            this.createEditorAxis(clipMode);
            this.geomap.render();
        }
    }

    /**
     * 高亮单个编辑轴的颜色
     * @private
     * 
     * @param {EditorAxisType} axisType 
     */
    highlightAxis(axisType) {
        if (axisType === this.highlightAxisType || this.unfixedAxisList.length === 0) return;

        // 还原上个旋转编辑轴的状态
        if (this.circleAxisType && RotateAxisTypeList.includes(this.circleAxisType)) {
            const lastCircleAxis = this.axisPrimitives._primitives.find((item) => item.axisType === this.circleAxisType);
            lastCircleAxis && (lastCircleAxis.maximumClock -= 180);
        }

        // 高亮并显示完整的旋转编辑轴
        if (RotateAxisTypeList.includes(axisType)) {
            const curCircleAxis = this.axisPrimitives._primitives.find((item) => item.axisType === axisType);
            curCircleAxis && (curCircleAxis.maximumClock += 180);
            this.circleAxisType = axisType;
        } else {
            this.circleAxisType = undefined;
        }

        if (axisType === undefined) {
            // 恢复轴的初始颜色
            this.axisPrimitives._primitives.forEach((primitive) => {
                const unfixedAxisInfo = this.unfixedAxisList.find((item) => item.axisType === primitive.axisType);
                if (unfixedAxisInfo) {
                    primitive.color = unfixedAxisInfo.color;
                }
            });
        } else {
             // 切换轴颜色
            this.axisPrimitives._primitives.forEach((primitive) => {
                const unfixedAxisInfo = this.unfixedAxisList.find((item) => item.axisType === primitive.axisType);
                if (unfixedAxisInfo) {
                    primitive.color = unfixedAxisInfo.axisType !== axisType ? NORMAL_COLOR : HIGHLIGHT_COLOR;
                }
            });
        }
        this.highlightAxisType = axisType;

        this.geomap.render();
    }

    /**
     * 销毁
     * 
     * @return {Boolean}
     * 
     * @example
     * clipEditorAxis.destroy();
     */
    destroy() {
        this.geomap.scene.primitives.remove(this.axisPrimitives);
        this.tempAxisPoints.forEach((point) => {
            this.geomap.viewer.entities.remove(point);
        });

        this.removeEventHandler();

        return destroyObject(this);
    }
}

// 默认高亮颜色
const HIGHLIGHT_COLOR = '#FFFF00'; // Color.YELLOW,
// 默认不可选颜色
const NORMAL_COLOR = '#A9A9A9'; // Color.DARKGREY

// 完整圆轴默认配置参数
const DEFAULT_Circle = {
    width: 2,
    segment: 100,
    minimumClock: 270,
    maximumClock: 270,
    color: NORMAL_COLOR,
    id: {
        isHighlight: false,
        isUnfixed: false,
    }
};

// 半圆轴2默认配置参数
const DEFAULT_HalfCircle1 = {
    segment: 50,
    minimumClock: 0,
    maximumClock: 180,
    color: '#FF0000', // Color.RED
    id: {
        isHighlight: false,
        isUnfixed: true,
    }
};

// 半圆轴1默认配置参数
const DEFAULT_HalfCircle2 = {
    segment: 50,
    minimumClock: 270,
    maximumClock: 90,
    color: '#0000FF', // Color.BLUE
    id: {
        isHighlight: false,
        isUnfixed: true,
    }
};

// 固定轴默认配置参数
const DEFAULT_FixedLine = {
    width: 2,
    color: NORMAL_COLOR,
    scalar: 1.0,
    id: {
        isHighlight: false,
        isUnfixed: false,
    }
}

// 可移动轴默认配置参数
const DEFAULT_UnfixedLine = {
    color: '#00FFFF', // Color.AQUA ,
    width: 20,
    scalar: 1.3,
    hasArrow: true,
    id: {
        isHighlight: false,
        isUnfixed: true,
    }
}

// 默认剖切面配置
const DEFAULT_FixedPlane = {
    material:Material.fromType('Color', {
        color: Color.fromCssColorString('#b8dcee').withAlpha(0.4),
    }),
    // color: new Color(184 / 255, 220 / 255, 238 / 255, 0.4),
    // depthFailColor: new Color(184 / 255, 220 / 255, 238 / 255, 0.4),
    id: {
        isHighlight: false,
        isUnfixed: false,
    }
    // Color.ROYALBLUE.withAlpha(0.5)
}

// 默认剖切轮廓面配置
const DEFAULT_FixedPlaneOutline = {
    width: 1,
    material:Material.fromType('Color', {
        color: Color.fromCssColorString('#2190ff').withAlpha(1.0),
    }),
    // color: new Color(33 / 255, 144 / 255, 255 / 255, 1.0),
    // depthFailColor: new Color(33 / 255, 144 / 255, 255 / 255, 1.0),
    id: {
        isHighlight: false,
        isUnfixed: false,
    }
    // Color.ROYALBLUE
}

// 移动轴类型
const PanAxisTypeList = [EditorAxisType.XPAN, EditorAxisType.YPAN, EditorAxisType.ZPAN];
// 旋转轴类型
const RotateAxisTypeList = [EditorAxisType.XROTATE, EditorAxisType.YROTATE, EditorAxisType.ZROTATE];

/**
 * 记录各个编辑轴上的锚点（用于平移旋转时用）
 * @private
 * 
 * @note 需要和EditorAxisType保持一致
 */
const DEFAULT_AxisAnchorIndexInfo = {
    'x-pan': 1,
    'y-pan': 2,
    'z-pan': 3,
    'x-rotate': [2, 3],
    'y-rotate': [3, 1],
    'z-rotate': [1, 2]
};

/**
 * 根据旋转轴获取旋转的角度对象
 * @private
 * 
 * @param {EditorAxisType} axisType
 * @param {Number} angle 角度值，单位为度
 * 
 * @returns {Matrix3} 旋转矩阵
 */
function getRotationByAxisType(axisType, angle) {
    let rotation;
    switch (axisType) {
        case EditorAxisType.XROTATE: default:
            rotation = Matrix3.fromRotationX(CesiumMath.toRadians(angle));
            break;
        case EditorAxisType.YROTATE:
            rotation = Matrix3.fromRotationY(CesiumMath.toRadians(angle));
            break;
        case EditorAxisType.ZROTATE:
            rotation = Matrix3.fromRotationZ(CesiumMath.toRadians(angle));
            break;
    }
    return rotation;
}

/**
 * 将局部坐标转换为世界坐标
 * @private
 * 
 * @param {Object} localAxisInfo {normalX: Cartesian3, normalY: Cartesian3, normalZ: Cartesian3},表示局部坐标系XYZ轴对应的世界坐标
 * @param {Point} localPoint 
 * 
 * @returns {Cartesian3} 转换后的世界坐标
 */
function transLocalToWorld(localAxisInfo, localPoint) {
    const { normalX, normalY, normalZ } = localAxisInfo;
    const { x, y, z } = localPoint;
    return Cartesian3.add(
        Cartesian3.multiplyByScalar(normalX, x, new Cartesian3()),
        Cartesian3.add(
            Cartesian3.multiplyByScalar(normalY, y, new Cartesian3()),
            Cartesian3.multiplyByScalar(normalZ, z, new Cartesian3()),
            new Cartesian3()
        ),
        new Cartesian3()
    );
}

/**
 * 获取圆的外接矩形顶点坐标
 * @private
 * 
 * @param {Cartesian3} origin 原点坐标
 * @param {Object} planeAxis 平面直角坐标系左右两轴的单位方向向量
 * @param {Number} radius 内接圆的半径
 */
function getCorners(origin, planeAxis, radius) {
    const { left, right } = planeAxis;
    const cornerPositions = [];
    cornerPositions.push(
        Cartesian3.add(origin,
            Cartesian3.add(
                Cartesian3.multiplyByScalar(right, radius, new Cartesian3()),
                Cartesian3.multiplyByScalar(left, radius, new Cartesian3()),
                new Cartesian3()
            ),
            new Cartesian3())
    );
    cornerPositions.push(
        Cartesian3.add(origin,
            Cartesian3.add(
                Cartesian3.multiplyByScalar(right, -1 * radius, new Cartesian3()),
                Cartesian3.multiplyByScalar(left, radius, new Cartesian3()),
                new Cartesian3()
            ),
            new Cartesian3())
    );
    cornerPositions.push(
        Cartesian3.add(origin,
            Cartesian3.add(
                Cartesian3.multiplyByScalar(right, -1 * radius, new Cartesian3()),
                Cartesian3.multiplyByScalar(left, -1 * radius, new Cartesian3()),
                new Cartesian3()
            ),
            new Cartesian3())
    );
    cornerPositions.push(
        Cartesian3.add(origin,
            Cartesian3.add(
                Cartesian3.multiplyByScalar(right, radius, new Cartesian3()),
                Cartesian3.multiplyByScalar(left, -1 * radius, new Cartesian3()),
                new Cartesian3()
            ),
            new Cartesian3())
    );
    return cornerPositions;
}

/**
 * 获取扇形所在平面的轴法向量 xy、yz、zx
 * @private
 * 
 * @param {ClipModeType} clipMode 剖切模式
 * @param {Object} localAxisInfo 局部坐标系
 * 
 * @returns {Object|undefined} {left: Cartesian3, right: Cartesian3}平面直角坐标系左右两轴的单位方向向量
 */
function getPlaneAxis(clipMode, localAxisInfo) {
    let planeAxis;
    if (localAxisInfo) {
        const { normalX, normalY, normalZ } = localAxisInfo;
        switch (clipMode) {
            case ClipModeType.X: case ClipModeType.MINUS_X: default:
                planeAxis = {
                    right: normalY,
                    left: normalZ
                };
                break;
            case ClipModeType.Y: case ClipModeType.MINUS_Y:
                planeAxis = {
                    right: normalZ,
                    left: normalX
                };
                break;
            case ClipModeType.Z: case ClipModeType.MINUS_Z:
                planeAxis = {
                    right: normalX,
                    left: normalY
                };
                break;
        }
    }
    return planeAxis;
}

/**
 * 获取局部坐标系相对于世界坐标系下的缩放矩阵
 * @private
 * 
 * @param {Object} localAxisInfo {normalX: Cartesian3, normalY: Cartesian3, normalZ: Cartesian3},表示局部坐标系XYZ轴对应的世界坐标
 * @param {Cartesian3} origin 局部坐标系原点
 * @param {Cartesian3} scale xyz分别表示在xyz方向的缩放尺寸
 */
function getLocalScaleMatrix(localAxisInfo, origin, scale) {
    const { normalX, normalY, normalZ } = localAxisInfo;
    const points = [
        normalX.x, normalX.y, normalX.z, 0,
        normalY.x, normalY.y, normalY.z, 0,
        normalZ.x, normalZ.y, normalZ.z, 0,
        origin.x, origin.y, origin.z, 1];

    const localToWorldMatrix = Matrix4.fromArray(points);
    // 求世界坐标到局部坐标的变换矩阵
    const worldToLocalMatrix = Matrix4.inverse(localToWorldMatrix, new Matrix4());

    const scaleMatrix = Matrix4.fromScale(scale);


    return Matrix4.multiply(localToWorldMatrix,
        Matrix4.multiply(
            scaleMatrix,
            worldToLocalMatrix,
            new Matrix4()),
        new Matrix4());
}

export default ClipEditorAxis;