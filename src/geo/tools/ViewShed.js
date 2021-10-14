import defined from "cesium/Core/defined";
import defaultValue from "cesium/Core/defaultValue";
import GeometryInstance from "cesium/Core/GeometryInstance";
import ColorGeometryInstanceAttribute from "cesium/Core/ColorGeometryInstanceAttribute.js";
import ShowGeometryInstanceAttribute from "cesium/Core/ShowGeometryInstanceAttribute.js";
import CesiumMath from "cesium/Core/Math";
import Cartographic from "cesium/Core/Cartographic";
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartesian4 from "cesium/Core/Cartesian4";
import Cartesian2 from "cesium/Core/Cartesian2";
import Matrix3 from "cesium/Core/Matrix3";
import Matrix4 from "cesium/Core/Matrix4";
import Transforms from "cesium/Core/Transforms";
import HeadingPitchRoll from "cesium/Core/HeadingPitchRoll";
import Quaternion from "cesium/Core/Quaternion";
import Color from "cesium/Core/Color";
import FrustumOutlineGeometry from "cesium/Core/FrustumOutlineGeometry";
import Camera from "cesium/Scene/Camera";
import Primitive from "cesium/Scene/Primitive";
import PostProcessStage from "cesium/Scene/PostProcessStage";
import ShadowMap from "cesium/Scene/ShadowMap.js";
import PerInstanceColorAppearance from "cesium/Scene/PerInstanceColorAppearance";
import ScreenSpaceEventType from "cesium/Core/ScreenSpaceEventType";
import ScreenSpaceEventHandler from "cesium/Core/ScreenSpaceEventHandler";
import SceneMode from "cesium/Scene/SceneMode.js";
import ShadowMode  from "cesium/Scene/ShadowMode";
import PerspectiveFrustum from "cesium/Core/PerspectiveFrustum.js";

import { GeoDepository } from "../core/GeoDepository";
// import "../layer/Sensor/Sensor.js";
import { RectangularSensorGraphics } from "../layer/Sensor/RectangularSensor/RectangularSensorGraphics";
import Util from "../utils/Util";
import GeoUtil from '../utils/GeoUtil'

class ViewShed {
	/**
	 * 可视域分析
	 * 
	 * @date 2021/07/22
	 * @alias ViewShed
	 * @class
	 * @param {Object} options 包含以下参数的对象：
	 * @param {Cartesian3} [options.viewPosition]  观测点位置。
	 * @param {Cartesian3} [options.viewPositionEnd] 最远观测点位置（如果设置了观测距离，这个属性可以不设置）。
	 * @param {Number} [options.viewDistance =1 ]  观测距离（单位`米`，默认值1），需大于0。
	 * @param {Number} [options.viewHeading = 0] 航向角（单位`度`，默认值0）。
	 * @param {Number} [options.viewPitch = 0]  俯仰角（单位`度`，默认值0）。
	 * @param {Number} [options.horizontalViewAngle =60.0] 可视域水平夹角（单位`度`，默认值90），需大于0。
	 * @param {Number} [options.verticalViewAngle =30]  可视域垂直夹角（单位`度`，默认值60），需大于0。
	 * @param {Color} [options.visibleAreaColor = BOSGeo.Color.GREEN ] 可视区域颜色（默认值`绿色`）。
	 * @param {Color} [options.invisibleAreaColor = BOSGeo.Color.RED] 不可视区域颜色（默认值`红色`）。
	 * @param {Boolean} [options.enabled = true]  阴影贴图是否可用，默认为true。
	 * @param {Boolean} [options.softShadows = true]  是否启用柔和阴影，默认为true。
	 * @param {Number} [options.size = 2048]  每个阴影贴图的大小,默认为2048*2038,单位为像元。
	 * @param {Function} [options.callback]  回调函数。
	 * @example
	 * let viewPosition = BOSGeo.Cartesian3.fromDegrees(113.0, 23.0, 20.0);
	 let viewShed = new BOSGeo.ViewShed( {
		viewPosition,
		viewDistance: 1000,
		enabled: true,
		softShadows: true,
		size: 2048
	})
	*/
    constructor(options) {
        this.viewer = GeoDepository.viewer;
        this._viewPosition = options.viewPosition;
        this._viewPositionEnd = options.viewPositionEnd;
        this._viewDistance = options.viewPosition && options.viewPositionEnd ? Cartesian3.distance(options.viewPosition, options.viewPositionEnd) : options.viewDistance || 1;
        if(this._viewDistance <= 0) { console.warn("观测距离需大于0！"); return}
        this._viewHeading = options.viewHeading || 0.0;
        this._viewPitch = options.viewPitch || 0.0;
        this._horizontalViewAngle = options.horizontalViewAngle || 60.0;
        this._verticalViewAngle = options.verticalViewAngle || 30.0;
        if(this._horizontalViewAngle <= 0) { console.warn("可视域水平夹角需大于0！"); return}
        if(this._verticalViewAngle <= 0) { console.warn("可视域垂直夹角需大于0！"); return}
        this._visibleAreaColor = options.visibleAreaColor || Color.GREEN;
        this._invisibleAreaColor = options.invisibleAreaColor || Color.RED;
        this._enabled = typeof options.enabled === "boolean" ? options.enabled : true;
        this._softShadows = typeof options.softShadows === "boolean" ? options.softShadows : true;
        this._size = options.size || 2048;
        // this.mask = options.mask || 0.0001;
        this._callback = options.callback;
        this._debugFrustum = defaultValue(options.showFrustum, true);
        this._alpha = 0.7;
        this.ifOnmodel = false ; //是否在模型上
        //开启深度检测
        this.viewer.scene.globe.depthTestAgainstTerrain = true;
        // this.viewer.terrainShadows = ShadowMode.ENABLED
        options.viewPosition && options.viewPositionEnd ? this.addToScene() : this.bindMouseHandler();
        // 快速近似抗锯齿的后处理阶段。启用后，此阶段将在所有其他阶段之后执行。
        // 可以防止屏幕闪烁
        this.viewer.scene.postProcessStages.fxaa.enabled = true;
    }

    /**
     * 观测点位置
     * @property {Cartesian3} viewPosition
     */
    get viewPosition() {
        return this._viewPosition;
    }
    set viewPosition(value) {
        this._viewPosition = value;
        this.resetRadar();
		this.update();
    }

    /**
     * 最远观测点位置
     * @property {Cartesian3} viewPositionEnd
     */
    get viewPositionEnd() {
        return this._viewPositionEnd;
    }
    set viewPositionEnd(value) {
        this._viewPositionEnd = value;
        this._viewDistance = Cartesian3.distance(this._viewPosition, this._viewPositionEnd);
        this._viewHeading = getHeading(this._viewPosition, this._viewPositionEnd);
        this._viewPitch = getPitch(this._viewPosition, this._viewPositionEnd);
        if (this.frustumOutline) {
            this.viewer.scene.primitives.remove(this.frustumOutline);
            this.frustumOutline = null;
        }
        this.resetRadar();
        this.createLightCamera();
        // this.drawFrustumOutline();
    }

    /**
     * 观测距离（单位`米`）
     * @property {Number} viewDistance
     */
    get viewDistance() {
        return this._viewDistance;
    }
    set viewDistance(value) {
        if(value <= 0) { console.warn("观测距离需大于0！"); return}
        // 计算目标点
        this._viewPositionEnd = Util.getNewRollPoint(this._viewPosition, this._viewPositionEnd, value); //new Cartesian3(c.x * r, c.y * r, c.z )
        this._viewDistance = value;
        this.resetRadar();
        this.update();
    }

    /**
     * 偏航角（单位`度`）
     * @property {Number} viewHeading
     */
    get viewHeading() {
        return this._viewHeading;
    }
    set viewHeading(value) {
        this._viewPositionEnd = this.calculateEndPosition(this._viewPosition, this._viewPositionEnd, "heading", value - this._viewHeading);
        this._viewHeading = value;
        this.resetRadar();
        this.update();
    }

    /**
     * 俯仰角（单位`度`）
     * @property {Number} viewPitch
     */
    get viewPitch() {
        return this._viewPitch;
    }
    set viewPitch(value) {
        // 计算目标点
        this._viewPositionEnd = this.calculateEndPosition(this._viewPosition, this._viewPositionEnd, "pitch", value - this._viewPitch);
        this._viewPitch = value;
        this.resetRadar();
        this.update();
    }

    /**
     * 可视域水平夹角（单位`度`）
     * @property {Number} horizontalViewAngle
     */
    get horizontalViewAngle() {
        return this._horizontalViewAngle;
    }
    set horizontalViewAngle(value) {
        if(value <= 0) { console.warn("可视域水平夹角需大于0！"); return}
        this._horizontalViewAngle = value;
        this.resetRadar();
        this.update();
    }

    /**
     * 可视域垂直夹角（单位`度`）
     * @property {Number} verticalViewAngle
     */
    get verticalViewAngle() {
        return this._verticalViewAngle;
    }
    set verticalViewAngle(value) {
        if(value <= 0) { console.warn("可视域垂直夹角需大于0！"); return}
        this._verticalViewAngle = value;
        this.resetRadar();
        this.update();
    }

    /**
     * 可视区域颜色
     * @property {Color} visibleAreaColor
     */
    get visibleAreaColor() {
        return this._visibleAreaColor;
    }
    set visibleAreaColor(value) {
        this._visibleAreaColor = value;
        this.update();
    }

    /**
     * 不可视区域颜色
     * @property {Color} invisibleAreaColor
     */
    get invisibleAreaColor() {
        return this._invisibleAreaColor;
    }
    set invisibleAreaColor(value) {
        this._invisibleAreaColor = value;
        this.update();
    }

	/**
	 * 阴影贴图是否可用
	 * @property {Boolean} enabled
	 */
	get enabled(){
		return this._enabled;
	}
	set enabled(value){
		this._enabled=value;
		this.update();
	}

	/**
	 * 是否启用柔和阴影
	 * @property {Boolean} softShadows
	 */
	get softShadows(){
		return this._softShadows;
	}
	set softShadows(value){
		this._softShadows=value;
		this.update();
	}

	/**
	 * 每个阴影贴图的大小
	 * @property {Number} size
	 */
	get size(){
		return this._size;
	}
	set size(value){
		this._size=value;
		this.update();
	}

    /**
     * 绑定鼠标点击事件，获取的点用于创建视域分析
     * @private
     */
    bindMouseHandler() {
        let ifPick = false,
            viewPosition = undefined;
        this.unbindMouseHandler();
        this._handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        // 左键选相机视角点
        this._handler.setInputAction(leftClick => {
            let scene = this.viewer.scene;
            let viewPosition;
            if (scene.mode !== SceneMode.MORPHING) {
                let pickedObject = scene.pick(leftClick.position);
                // 模型表面
                if (scene.pickPositionSupported && defined(pickedObject)) {
                    let cartesian = this.viewer.scene.pickPosition(leftClick.position);
                    this.ifOnmodel = true ;
                    if (defined(cartesian)) {
                        viewPosition = cartesian;
                        viewPosition && (viewPosition.z += 5);
                    }
                } else {
                    // 地形表面
                    viewPosition = this.viewer.camera.pickEllipsoid(leftClick.position);
                    viewPosition && (viewPosition.z += 5);
                    this.ifOnmodel = false;
                }
                this._viewPosition = viewPosition;
                ifPick = true;
                this._handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);

                // var a = getCurrentMousePosition(t.scene, i.position);
                // viewPosition && (this._viewPosition ? this._viewPosition && !this._viewPositionEnd && (this._viewPositionEnd = viewPosition,
                //     this.addToScene(), this.unbindMouseHandler(), this.calback && this.calback()) : this._viewPosition = viewPosition)

                // this.createLightCamera();
                // this.drawFrustumOutline();
                // this.addToScene()
            }
        }, ScreenSpaceEventType.LEFT_CLICK);

        // 鼠标移动选取结束点
        this._handler.setInputAction(move => {
            if (ifPick) {
                let scene = this.viewer.scene;
                let viewPositionEnd;
                if (scene.mode !== SceneMode.MORPHING) {
                    let pickedObject = scene.pick(move.endPosition);
                    // 模型表面
                    if (scene.pickPositionSupported && defined(pickedObject)) {
                        let cartesian = this.viewer.scene.pickPosition(move.endPosition);
                        if (defined(cartesian)) {
                            viewPositionEnd = cartesian;
                            viewPositionEnd.z += 5;
                        }
                    } else {
                        // 地形表面
                        viewPositionEnd = this.viewer.camera.pickEllipsoid(move.endPosition);
                        viewPositionEnd.z += 5;
                    }
                    this.viewPositionEnd = viewPositionEnd;
                    if (viewPositionEnd) {
                        var n = this._viewPosition;
                        n && ((this.frustumQuaternion = this.getFrustumQuaternion(n, viewPositionEnd)), (this._viewDistance = Number(Cartesian3.distance(n, viewPositionEnd).toFixed(1))));
                    }
                    if (this._viewPositionEnd) {
                        this.frustumQuaternion = this.getFrustumQuaternion(this._viewPosition, this._viewPositionEnd);
                        if (this.frustumQuaternion) {
                            this.addRadar(this._viewPosition, this.frustumQuaternion);
                        }
                    }
                }
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        // 右键完成
        this._handler.setInputAction(rightClick => {
            // let viewPositionEnd = this.viewer.scene.pickPosition(rightClick.position);
            // this.viewPositionEnd = viewPositionEnd;
            if (ifPick) {
                this.createLightCamera();
                this.createShadowMap(this._viewPosition, this._viewPositionEnd);
                this.createPostStage();
                this.unbindMouseHandler();
                this._callback && this._callback();
            }
        }, ScreenSpaceEventType.RIGHT_CLICK);
    }

    /**
     * 接触鼠标点击事件
     * @private
     */
    unbindMouseHandler() {
        null != this._handler && (this._handler.destroy(), delete this._handler);
    }

    /**
     * 添加点光源相机、阴影贴图、后处理、视锥
     * @private
     */
    addToScene() {
        if (this._viewPositionEnd) {
            this.frustumQuaternion = this.getFrustumQuaternion(this._viewPosition, this._viewPositionEnd);
            if (!this.radar && this.frustumQuaternion) {
                this.addRadar(this._viewPosition, this.frustumQuaternion);
            }
        }
        this.createLightCamera();
        // this.drawFrustumOutline();
        this.createShadowMap(this._viewPosition, this._viewPositionEnd);
        this.createPostStage();
        // this.drawSketch();
    }

    /**
     * 执行更新
     * @private
     */
    update() {
        this.clear();
        this.addToScene();
    }

    /**
     * 清除视网、视锥、后处理程序，用于更新options属性
     * @private
     */
    clear() {
        // if (this.sketch) {
        //     this.viewer.entities.removeById(this.sketch.id);
        //     this.sketch = null;
        // }
        this.removeRadar();
        if (this.frustumOutline) {
            this.viewer.scene.primitives.remove(this.frustumOutline);
            this.frustumOutline = null;
        }
        if (this.postStage) {
            this.viewer.scene.postProcessStages.remove(this.postStage);
            this.postStage = null;
        }
    }

    /**
     * 销毁视域分析对象
     * @example
     * viewShed.destroy();
     */
    destroy() {
        this.unbindMouseHandler(), this.viewer.scene.postProcessStages.remove(this.postStage), this.viewer.entities.remove(this.radar), delete this.radar, delete this.postProcess, delete this.shadowMap;
        // if (this.sketch) {
        //     this.viewer.entities.removeById(this.sketch.id);
        //     this.sketch = null;
        // }
        if (this.frustumOutline) {
            this.viewer.scene.primitives.remove(this.frustumOutline);
            this.frustumOutline = null;
        }
        if (this.postStage) {
            this.viewer.scene.postProcessStages.remove(this.postStage);
            this.postStage = null;
        }
        // this.viewer.entities.removeAll();
        // this.viewer.scene.primitives.removeAll();
        delete this;
    }

    /**
     * 创建光源相机
     * @private
     */
    createLightCamera() {
        this.lightCamera = new Camera(this.viewer.scene);
        this.lightCamera.position = this._viewPosition;
        this.lightCamera.frustum.near = 0.01;
        this.lightCamera.frustum.far = this._viewDistance;
        const hr = CesiumMath.toRadians(this._horizontalViewAngle);
        const vr = CesiumMath.toRadians(this._verticalViewAngle);
        const aspectRatio = (this._viewDistance * Math.tan(hr / 2) * 2) / (this._viewDistance * Math.tan(vr / 2) * 2);
        this.lightCamera.frustum.aspectRatio = aspectRatio;
        // this.lightCamera.frustum.aspectRatio = this.viewer.scene.canvas.clientWidth / this.viewer.scene.canvas.clientHeight;
        let fov;
        if (hr > vr) {
            this.lightCamera.frustum.fov = hr;
            fov = hr;
        } else {
            this.lightCamera.frustum.fov = vr;
            fov = vr;
        }

        this.lightCamera.setView({
            destination: this._viewPosition,
            orientation: {
                heading: CesiumMath.toRadians(this._viewHeading || 0),
                // pitch: CesiumMath.toRadians(this._viewPitch || 0),
                pitch: CesiumMath.toRadians(this._viewPitch || 0) + CesiumMath.toRadians(this._verticalViewAngle) / 2,
                roll: 0,
                direction: Cartesian3.subtract(this._viewPositionEnd, this._viewPosition, new Cartesian3(0, 0, 0)),
                up: Cartesian3.normalize(this._viewPosition, new Cartesian2(0, 0, 0))
            }
        });

        this.lightCamera.frustum = new PerspectiveFrustum({
            fov: fov,
            aspectRatio: aspectRatio,
            near: 0.1,
            far: this._viewDistance
        });
        this.lightCamera.direction = Cartesian3.subtract(this._viewPositionEnd, this._viewPosition, new Cartesian3(0, 0, 0));
        this.lightCamera.up = Cartesian3.normalize(this._viewPosition, new Cartesian2(0, 0, 0));
        // const far = Number(Cartesian3.distance(this._viewPositionEnd ,this._viewPosition).toFixed(1))
        // this._viewDistance = far
    }

    /**
     * 创建阴影贴图
     * @private
     */
    createShadowMap() {
        // this.lightCamera=camera1
        this.shadowMap = new ShadowMap({
            lightCamera: this.lightCamera,
            enabled: this._enabled,
            isPointLight: false,
            isSpotLight: true,
            cascadesEnabled: false,
            context: this.viewer.scene.context,
            pointLightRadius: this._viewDistance,
            size: this._size,
            softShadows: this._softShadows,
            normalOffset: true,
            fromLightSource: false,
            fadingEnabled:false,
        });
        this.viewer.scene.shadowMap = this.shadowMap;
        this.Bias = this.shadowMap._isPointLight ? this.shadowMap._pointBias : this.shadowMap._primitiveBias;
        this.Bias.depthBias = this.ifOnmodel ?  0.00015 :0.00002; //在模型表面还是地形表面设置不同参数
    }

    /**
     * 创建视锥雷达
     * @param {Cartesian3} fromPosition 起始点
     * @param frustumQuaternion   视锥体参数，通过getFrustumQuaternion (fromPosition, toPosition)获取。
     * @private
     */
    addRadar(fromPosition, frustumQuaternion) {
        const that = this;
        this.radar && this.viewer.entities.remove(this.radar);
        this.radar = this.viewer.entities.add({
            position: fromPosition,
            orientation: frustumQuaternion,
            rectangularSensor: new RectangularSensorGraphics({
                radius: that._viewDistance,
                xHalfAngle: CesiumMath.toRadians(that._horizontalViewAngle / 2),
                yHalfAngle: CesiumMath.toRadians(that._verticalViewAngle / 2),
                material: new Color(0, 1, 1, 0.4),
                lineColor: new Color(1, 1, 1, 1),
                slice: 8,
                showScanPlane: !1,
                scanPlaneColor: new Color(0, 1, 1, 1),
                scanPlaneMode: "vertical",
                scanPlaneRate: 3,
                showThroughEllipsoid: !1,
                showLateralSurfaces: !1,
                showDomeSurfaces: !1
            })
        });

        this.viewer.entities.removeById("line");
        // this._viewLine = this.viewer.entities.add({
        //     id: "line",
        //     name: "Red line on terrain",
        //     polyline: {
        //         positions: [this._viewPosition, this._viewPositionEnd],
        //         width: 1,
        //         material: new Color(1, 0, 0, 1)
        //     }
        // });
    }

    /**
     * 重置视锥雷达
     */
    resetRadar() {
        this.removeRadar();
        this.frustumQuaternion && this.addRadar(this._viewPosition, this.frustumQuaternion);
    }

    /**
     * 移除视锥雷达
     */
    removeRadar() {
        if (this.radar) {
            this.viewer.entities.remove(this.radar);
            delete this.radar;
        }
        // if (this._viewLine) {
        //     this.viewer.entities.remove(this._viewLine);
        //     delete this._viewLine;
        // }
    }

    /**
     * 根据起始点、终止点获取视锥体参数
     * @param {Cartesian3} fromPosition
     * @param {Cartesian3} toPosition
     * @returns {null}   视锥体参数
     * @private     
     */
    getFrustumQuaternion(fromPosition, toPosition) {
        let e = fromPosition;
        let t = toPosition;
        if (!t) return null;
        var i = Cartesian3.normalize(Cartesian3.subtract(t, e, new Cartesian3()), new Cartesian3()),
            a = Cartesian3.normalize(e, new Cartesian3()),
            n = new Camera(this.viewer.scene);
        (n.position = e), (n.direction = i), (n.up = a), (i = n.directionWC), (a = n.upWC);
        var r = n.rightWC,
            o = new Cartesian3(),
            l = new Matrix3(),
            u = new Quaternion();
        r = Cartesian3.negate(r, o);
        var d = l;
        return Matrix3.setColumn(d, 0, r, d), Matrix3.setColumn(d, 1, a, d), Matrix3.setColumn(d, 2, i, d), Quaternion.fromRotationMatrix(d, u);
    }

    /**
     * 场景后处理
     * @private
     */
    createPostStage() {
        const that = this,
            i = this,
            a = this.shadowMap._isPointLight ? this.shadowMap._pointBias : this.shadowMap._primitiveBias;
        const postStage = new PostProcessStage({
            fragmentShader: viewShedfs,
            uniforms: {
                czzj: function () {
                    return that._verticalViewAngle;
                },
                dis: function () {
                    return that._viewDistance;
                },
                spzj: function () {
                    return that._horizontalViewAngle;
                },
                visibleColor: function () {
                    return that._visibleAreaColor;
                },
                disVisibleColor: function () {
                    return that._invisibleAreaColor;
                },
                mixNum: function () {
                    return that._alpha;
                },
                stcshadow: function () {
                    return i.shadowMap._shadowMapTexture;
                },
                _shadowMap_matrix: function () {
                    return i.shadowMap._shadowMapMatrix;
                },
                shadowMap_lightPositionEC: function () {
                    return i.shadowMap._lightPositionEC;
                },
                shadowMap_lightDirectionEC: function () {
                    return i.shadowMap._lightDirectionEC;
                },
                shadowMap_lightUp: function () {
                    return i.shadowMap._lightCamera.up;
                },
                shadowMap_lightDir: function () {
                    return i.shadowMap._lightCamera.direction;
                },
                shadowMap_lightRight: function () {
                    return i.shadowMap._lightCamera.right;
                },
                shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: function () {
                    var e = new Cartesian2();
                    // console.log(a)
                    // a.depthBias = 0.00008;
                    return (e.x = 1 / i.shadowMap._textureSize.x), (e.y = 1 / i.shadowMap._textureSize.y), Cartesian4.fromElements(e.x, e.y, a.depthBias, a.normalShadingSmooth, this.combinedUniforms1);
                },
                shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: function () {
                    return Cartesian4.fromElements(a.normalOffsetScale, i.shadowMap._distance, i.shadowMap.maximumDistance, i.shadowMap._darkness, this.combinedUniforms2);
                }
            }
        });
        this.postStage = this.viewer.scene.postProcessStages.add(postStage);
    }

    /**
     * 根据起点和终点笛卡尔坐标、变换类型(heading,pitch,roll)、角度变化量计算终点
     * @param {Cartesian3} fromPosition
     * @param {Cartesian3} toPosition
     * @param {String} type 变换类型(heading,pitch,roll)
     * @param {Number} addNum 角度变化量(单位度)
     * @returns {Cartesian3} 计算的终点
     * @private
     */
     calculateEndPosition(fromPosition, toPosition, type, addNum) {
        var m1 = Transforms.eastNorthUpToFixedFrame(fromPosition); //m1为局部坐标的z轴垂直于地表，局部坐标的y轴指向正北的4x4变换矩阵
        var inverseM = Matrix4.inverse(m1, new Matrix4()); // 将全局坐标转换为以fromPosition为原点的局部坐标的矩阵
        var v = Matrix4.multiplyByPoint(inverseM, toPosition, new Cartesian3()); //toPosition的局部坐标
        var rotate = CesiumMath.toRadians(addNum); //转成弧度
        var rotMat3, finalPosition;
        switch (type) {
            case "heading":
                rotMat3 = Matrix3.fromRotationZ(rotate, new Matrix3()); //创建绕z轴旋转的矩阵
                var m = Matrix4.fromRotationTranslation(rotMat3, Cartesian3.ZERO); //m为旋转加平移的4x4变换矩阵，这里平移为(0,0,0)，故填个Cartesian3.ZERO  ---旋转平移矩阵
                m = Matrix4.multiplyByTranslation(m, v, new Matrix4()); //m = m X v  乘以一个转换矩阵 matrix, translation, result
                m = Matrix4.multiplyTransformation(m1, m, new Matrix4()); //m = m X m1
                finalPosition = Matrix4.getTranslation(m, new Cartesian3()); //根据最终变换矩阵m得到finalPosition
                break;
            case "pitch":
                let axis; //跟起点终点向量垂直 跟z轴垂直
                // debugger
                // 计算起点的法向量 -- z轴
                var chicA = Cartographic.fromCartesian(fromPosition);
                chicA.height = 0;
                var dFrom = Cartographic.toCartesian(chicA);
                var normaA = Cartesian3.normalize(Cartesian3.subtract(dFrom, fromPosition, new Cartesian3()), new Cartesian3());
                var to_from = Cartesian3.normalize(Cartesian3.subtract(toPosition, fromPosition, new Cartesian3()), new Cartesian3());
                axis = Cartesian3.normalize(Cartesian3.cross(normaA, to_from, new Cartesian3()), new Cartesian3());

                var quat = Quaternion.fromAxisAngle(axis, rotate); //quat为围绕这个z轴旋转d度的四元数  可以任意向量
                rotMat3 = Matrix3.fromQuaternion(quat); //rot_mat3为根据四元数求得的旋转矩阵

                var m = Matrix4.fromRotationTranslation(rotMat3, Cartesian3.ZERO); //m为旋转加平移的4x4变换矩阵，这里平移为(0,0,0)，故填个Cartesian3.ZERO  ---旋转平移矩阵
                // 计算终点相对起点点的坐标toPosition1
                var toPosition1 = Cartesian3.subtract(toPosition, fromPosition, new Cartesian3());
                var p = Matrix4.multiplyByPoint(m, toPosition1, new Cartesian3());
                // 新的终点的坐标
                finalPosition = Cartesian3.add(p, fromPosition, new Cartesian3());
                break;
            case "roll":
                rotMat3 = Matrix3.fromRotationY(rotate, new Matrix3()); //创建绕y轴旋转的矩阵
                var m = Matrix4.fromRotationTranslation(rotMat3, Cartesian3.ZERO); //m为旋转加平移的4x4变换矩阵，这里平移为(0,0,0)，故填个Cartesian3.ZERO  ---旋转平移矩阵
                m = Matrix4.multiplyByTranslation(m, v, new Matrix4()); //m = m X v  乘以一个转换矩阵 matrix, translation, result
                m = Matrix4.multiplyTransformation(m1, m, new Matrix4()); //m = m X m1
                finalPosition = Matrix4.getTranslation(m, new Cartesian3()); //根据最终变换矩阵m得到finalPosition
                break;
        }
        return finalPosition;
    }
}

/**
 * 根据两点笛卡尔坐标求偏航角
 * @param {Cartesian3} fromPosition
 * @param {Cartesian3} toPosition
 * @returns {Number} 偏航角(单位度)
 * @private
 */
function getHeading(fromPosition, toPosition) {
    let finalPosition = new Cartesian3();
    let matrix4 = Transforms.eastNorthUpToFixedFrame(fromPosition);
    Matrix4.inverse(matrix4, matrix4);
    Matrix4.multiplyByPoint(matrix4, toPosition, finalPosition);
    Cartesian3.normalize(finalPosition, finalPosition);
    let theta = CesiumMath.toDegrees(Math.atan2(finalPosition.x, finalPosition.y));
    if (theta < 0) {
        theta = theta + 360;
    }
    return theta
}

/**
 * 根据两点笛卡尔坐标求俯仰角
 * @param {Cartesian3} fromPosition
 * @param {Cartesian3} toPosition
 * @returns {Number} 俯仰角(单位度)
 * @private
 */
function getPitch(fromPosition, toPosition) {
    let finalPosition = new Cartesian3();
    let matrix4 = Transforms.eastNorthUpToFixedFrame(fromPosition);
    Matrix4.inverse(matrix4, matrix4);
    Matrix4.multiplyByPoint(matrix4, toPosition, finalPosition);
    Cartesian3.normalize(finalPosition, finalPosition);
    let theta = CesiumMath.toDegrees(Math.asin(finalPosition.z));
    // if (theta < 0) {
    //     theta = theta + 360;
    // }
    return theta
}

/**
 * position_A绕position_B逆时针旋转angle度（角度）得到新点
 * @param {Cartesian3}  position_A
 * @param  {Cartesian3} position_B
 * @param {Number}  angle 度（角度）
 * @returns {Cartesian3} 新点
 * @private
 */
function rotatedPointByAngle(position_A, position_B, angle) {
    //以B点为原点建立局部坐标系（东方向为x轴,北方向为y轴,垂直于地面为z轴），得到一个局部坐标到世界坐标转换的变换矩阵
    var localToWorld_Matrix = Transforms.eastNorthUpToFixedFrame(position_B);
    //求世界坐标到局部坐标的变换矩阵
    var worldToLocal_Matrix = Matrix4.inverse(localToWorld_Matrix, new Matrix4());
    //B点在局部坐标的位置，其实就是局部坐标原点
    var localPosition_B = Matrix4.multiplyByPoint(worldToLocal_Matrix, position_B, new Cartesian3());
    //A点在以B点为原点的局部的坐标位置
    var localPosition_A = Matrix4.multiplyByPoint(worldToLocal_Matrix, position_A, new Cartesian3());
    //根据数学公式A点逆时针旋转angle度后在局部坐标系中的x,y,z位置
    var new_x = localPosition_A.x * Math.cos(CesiumMath.toRadians(angle)) + localPosition_A.y *   Math.sin(CesiumMath.toRadians(angle));
    var new_y = localPosition_A.y * Math.cos(CesiumMath.toRadians(angle)) - localPosition_A.x * Math.sin(CesiumMath.toRadians(angle));
    var new_z = localPosition_A.z;
    //最后应用局部坐标到世界坐标的转换矩阵求得旋转后的A点世界坐标
    return Matrix4.multiplyByPoint(localToWorld_Matrix, new Cartesian3(new_x, new_y, new_z), new Cartesian3());
}

let viewShedfs = `uniform float czzj;
uniform float dis;
uniform float spzj;
uniform vec3 visibleColor;
uniform vec3 disVisibleColor;
uniform float mixNum;
uniform sampler2D colorTexture;
uniform sampler2D stcshadow; 
uniform sampler2D depthTexture;
uniform mat4 _shadowMap_matrix; 
uniform vec4 shadowMap_lightPositionEC; 
uniform vec4 shadowMap_lightDirectionEC;
uniform vec3 shadowMap_lightUp;
uniform vec3 shadowMap_lightDir;
uniform vec3 shadowMap_lightRight;
uniform vec4 shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness; 
uniform vec4 shadowMap_texelSizeDepthBiasAndNormalShadingSmooth; 
varying vec2 v_textureCoordinates;
vec4 toEye(in vec2 uv, in float depth){
    vec2 xy = vec2((uv.x * 2.0 - 1.0),(uv.y * 2.0 - 1.0));
    vec4 posInCamera =czm_inverseProjection * vec4(xy, depth, 1.0);
    posInCamera =posInCamera / posInCamera.w;
    return posInCamera;
}
float getDepth(in vec4 depth){
    float z_window = czm_unpackDepth(depth);
    z_window = czm_reverseLogDepth(z_window);
    float n_range = czm_depthRange.near;
    float f_range = czm_depthRange.far;
    return (2.0 * z_window - n_range - f_range) / (f_range - n_range);
}
float _czm_sampleShadowMap(sampler2D shadowMap, vec2 uv){
    return texture2D(shadowMap, uv).r;
}
float _czm_shadowDepthCompare(sampler2D shadowMap, vec2 uv, float depth){
    return step(depth, _czm_sampleShadowMap(shadowMap, uv));
}
float _czm_shadowVisibility(sampler2D shadowMap, czm_shadowParameters shadowParameters){
    float depthBias = shadowParameters.depthBias;
    float depth = shadowParameters.depth;
    float nDotL = shadowParameters.nDotL;
    float normalShadingSmooth = shadowParameters.normalShadingSmooth;
    float darkness = shadowParameters.darkness;
    vec2 uv = shadowParameters.texCoords;
    depth -= depthBias;
    vec2 texelStepSize = shadowParameters.texelStepSize;
    float radius = 1.0;
    float dx0 = -texelStepSize.x * radius;
    float dy0 = -texelStepSize.y * radius;
    float dx1 = texelStepSize.x * radius;
    float dy1 = texelStepSize.y * radius;
    float visibility = 
    (
    _czm_shadowDepthCompare(shadowMap, uv, depth)
    +_czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, 0.0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, 0.0), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx0, dy1), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(0.0, dy1), depth) +
    _czm_shadowDepthCompare(shadowMap, uv + vec2(dx1, dy1), depth)
    ) * (1.0 / 9.0)
    ;
    return visibility;
}
vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point){
    vec3 v01 = point -planeOrigin;
    float d = dot(planeNormal, v01) ;
    return (point - planeNormal * d);
}
float ptm(vec3 pt){
    return sqrt(pt.x*pt.x + pt.y*pt.y + pt.z*pt.z);
}
void main() 
{ 
    const float PI = 3.141592653589793;
    vec4 color = texture2D(colorTexture, v_textureCoordinates);
    vec4 currD = texture2D(depthTexture, v_textureCoordinates);
    if(currD.r>=1.0){
        gl_FragColor = color;
        return;
    }
    
    float depth = getDepth(currD);
    vec4 positionEC = toEye(v_textureCoordinates, depth);
    vec3 normalEC = vec3(1.0);
    czm_shadowParameters shadowParameters; 
    shadowParameters.texelStepSize = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.xy; 
    shadowParameters.depthBias = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.z; 
    shadowParameters.normalShadingSmooth = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.w; 
    shadowParameters.darkness = shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness.w; 
    shadowParameters.depthBias *= max(depth * 0.01, 1.0); 
    vec3 directionEC = normalize(positionEC.xyz - shadowMap_lightPositionEC.xyz); 
    float nDotL = clamp(dot(normalEC, -directionEC), 0.0, 1.0); 
    vec4 shadowPosition = _shadowMap_matrix * positionEC; 
    shadowPosition /= shadowPosition.w; 
    if (any(lessThan(shadowPosition.xyz, vec3(0.0))) || any(greaterThan(shadowPosition.xyz, vec3(1.0)))) 
    { 
        gl_FragColor = color;
        return;
    }

    //坐标与视点位置距离，大于最大距离则舍弃阴影效果
    vec4 lw = czm_inverseView*  vec4(shadowMap_lightPositionEC.xyz, 1.0);
    vec4 vw = czm_inverseView* vec4(positionEC.xyz, 1.0);
    if(distance(lw.xyz,vw.xyz)>dis){
        gl_FragColor = color;
        return;
    }


    //水平夹角限制
    vec3 ptOnSP = pointProjectOnPlane(shadowMap_lightUp,lw.xyz,vw.xyz);
    directionEC = ptOnSP - lw.xyz;
    float directionECMO = ptm(directionEC.xyz);
    float shadowMap_lightDirMO = ptm(shadowMap_lightDir.xyz);
    float cosJJ = dot(directionEC,shadowMap_lightDir)/(directionECMO*shadowMap_lightDirMO);
    float degJJ = acos(cosJJ)*(180.0 / PI);
    degJJ = abs(degJJ);
    if(degJJ>spzj/2.0){
        gl_FragColor = color;
        return;
    }

    //垂直夹角限制
    vec3 ptOnCZ = pointProjectOnPlane(shadowMap_lightRight,lw.xyz,vw.xyz);
    vec3 dirOnCZ = ptOnCZ - lw.xyz;
    float dirOnCZMO = ptm(dirOnCZ);
    float cosJJCZ = dot(dirOnCZ,shadowMap_lightDir)/(dirOnCZMO*shadowMap_lightDirMO);
    float degJJCZ = acos(cosJJCZ)*(180.0 / PI);
    degJJCZ = abs(degJJCZ);
    if(degJJCZ>czzj/2.0){
        gl_FragColor = color;
        return;
    }

    shadowParameters.texCoords = shadowPosition.xy; 
    shadowParameters.depth = shadowPosition.z; 
    shadowParameters.nDotL = nDotL; 
    float visibility = _czm_shadowVisibility(stcshadow, shadowParameters); 
    if(visibility==1.0){
        gl_FragColor = mix(color,vec4(visibleColor,1.0),mixNum);
    }else{
        if(abs(shadowPosition.z-0.0)<0.01){
            return;
        }
        gl_FragColor = mix(color,vec4(disVisibleColor,1.0),mixNum);
    }
}`;
export default ViewShed;
