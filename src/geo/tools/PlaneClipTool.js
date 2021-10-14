import Cesium3DTileset from "cesium/Scene/Cesium3DTileset";
import destroyObject from 'cesium/Core/destroyObject'
import Plane from 'cesium/Core/Plane';
import Color from 'cesium/Core/Color';
import Cartesian3 from 'cesium/Core/Cartesian3';
import ClippingPlaneCollection from 'cesium/scene/ClippingPlaneCollection';
import Check from 'cesium/Core/Check';
import Matrix4 from 'cesium/Core/Matrix4';

import GeoUtil from "../utils/GeoUtil";
import ClipModeType from '../constant/ClipModeType';
import ClipEditorAxis from '../tools/ClipEditorAxis';


class PlaneClipTool {
    /**
     * 自由剖切工具
     * @alias PlaneClipTool
     * @constructor
     * 
     * @param {GeoMap} geomap GeoMap对象
     * @param {Object} [options] 剖切默认配置项
     * @param {Cesium3DTileset} options.tileset 将要裁切的3DTiles对象（目前仅支持一个， 后续可扩展为多个）
     * @param {ClipModeType} [options.clipMode=ClipModeType.X] 剖切模式
     * @param {Boolean} [options.isVisible=true] 剖切面是否显示
     * @param {Number} [options.radius] 编辑轴半径, 默认为要剖切的模型半径
     * @param {Number} [options.minimumScale=0.2] 编辑轴最小尺寸，大于等于0.1，（尺寸倍数相对于radius值而言）
     * @param {Number} [options.maximumScale=5] 编辑轴最大尺寸，不能小于minimumScale，小于则取minimumScale，（尺寸倍数相对于radius值而言）
     * @param {Number} [options.planeScale=0.5] 剖切平面边长尺寸，（尺寸倍数相对于radius值而言）
     * 
     * @example
     * const modelLayer = layerManager.createLayer(BOSGeo.LayerType.MODEL, "模型");
     * const layer = modelLayer.add({
     *   url: 'https://lab.earthsdk.com/model/887b3db0cd4f11eab7a4adf1d6568ff7/tileset.json',
     *   name: 'model1',
     *   featureType: BOSGeo.FeatureType.TILES,
     *   position: [113.107767, 23.02872, 40]
     * });
     * const planeClipTool = new BOSGeo.PlaneClipTool(map, {
     *    tileset: layer
     * });
     * 
     */
    constructor(geomap, options = {}) {
        this.geomap = geomap;
        this.viewer = geomap.viewer;

        const {
            tileset,
            clipMode = ClipModeType.X,
            isVisible = true,
            minimumScale = 0.2,
            maximumScale = 5,
            planeScale = 0.5
        } = options;

        this._clipMode = clipMode;
        this._isVisible = isVisible;
        this.tileset = tileset;
        this.clippingMatrix = Matrix4.IDENTITY;

        this._minimumScale = Math.max(minimumScale, 0.1);
        this._maximumScale = Math.max(maximumScale, this._minimumScale);
        this._planeScale = Math.max(planeScale, 0);

        this.setClippingModel(tileset);
    }

    /**
     * 剖切面是否显示
     * @type {Boolean}
     * @default true
     */
    get isVisible() {
        return this._isVisible;
    }
    set isVisible(value) {
        if (value !== this._isVisible) {
            this._isVisible = value;
            // TODO 更新编辑轴
            this.clipEditorAxis && (this.clipEditorAxis.show = value);
        }
    }

    /**
     * 剖切模式
     * @type {ClipModeType}
     * @default BOSGeo.ClipModeType.X
     */
    get clipMode() {
        return this._clipMode;
    }
    set clipMode(value) {
        if (value !== this._clipMode) {
            this._clipMode = value;
            this.clipEditorAxis && this.clipEditorAxis.switchClipMode(value);
            const plane = getInitClippingPlane(value);
            this.updateTilesetClippingPlane(plane);
        }
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
        const curScale = Math.max(value, 0.1);
        if (curScale !== this._planeScale) {
            this._minimumScale = curScale;
            this.clipEditorAxis && (this.clipEditorAxis.minimumScale = curScale);
        }
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
        const curScale = Math.max(value, this._minimumScale);
        if (curScale !== this._planeScale) {
            this._maximumScale = curScale;
            this.clipEditorAxis && (this.clipEditorAxis.maximumScale = curScale);
        }
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
            this.clipEditorAxis && (this.clipEditorAxis.planeScale = curScale);
        }
    }

    /**
     * 更新3DTiles的剖切平面
     * 
     * @private
     * 
     * @param {Plane} plane 剖切平面
     * 
     */
    updateTilesetClippingPlane(plane) {
        if (!this.tileset) return;

        this.tileset.clippingPlanes = new ClippingPlaneCollection({
            planes: [plane],
            modelMatrix: this.clippingMatrix,
            edgeWidth: 0.0,
            edgeColor: Color.WHITE.withAlpha(0),
            enabled: true,
        });
    }

    /**
     * 添加编辑轴
     * @private
     * 
     * @param {Object} options 编辑轴初始化参数
     * @param {Cartesian3} options.center 轴中心点坐标（剖切对象中心点）
     * @param {Radius} options.radius 编辑轴半径
     * @param {ClipModeType} [options.clipMode=BOSGeo.ClipModeType.X] 裁切模式
     * @param {Matrix4} [options.modelMatrix=BOSGeo.Matrix4.IDENTITY] 编辑轴从模型空间-》世界空间下的转换矩阵
     * @param {Boolean} [options.show=true] 编辑轴是否可见
     * 
     */
    addEditorAxis(options) {
        options = Object.assign({
            clipMode: ClipModeType.X,
            modelMatrix: Matrix4.IDENTITY,
            show: true,
        }, options);

        this.clipEditorAxis && this.clipEditorAxis.destroy();

        this.clipEditorAxis = new ClipEditorAxis(this.geomap, options);
    }

    /**
     * 还原3DTiles的剖切状态
     * @private
     * 
     * @param {Cesium3DTileset} tileset 
     */
    recoverTileset(tileset) {
        tileset.clippingPlanes = new ClippingPlaneCollection({
            planes: [],
            edgeWidth: 0.0,
            edgeColor: Color.WHITE,
            enabled: true,
        });
        this.geomap.render();
    }

    /**
     * 设置将要剖切的模型对象
     * 
     * @param {Cesium3DTileset} model 3DTiles对象
     */
    setClippingModel(model) {
        this.tileset = model;
        model.readyPromise.then(() => {
            if (model.ready) {
                const { center, radius } = model.boundingSphere;
                this.center = center;
                this.radius = radius;
                const {  _minimumScale, _maximumScale, _planeScale, _isVisible } = this;

                try {
                    // 添加编辑轴
                    this.addEditorAxis({
                        center,
                        radius,
                        show: _isVisible,
                        clipMode: this._clipMode,
                        minimumScale: _minimumScale,
                        maximumScale: _maximumScale,
                        planeScale: _planeScale,
                        callback: (plane) => {
                            if (plane instanceof Plane) {
                                this.updateTilesetClippingPlane(plane);
                            }
                        }
                    });

                    this.clippingMatrix = GeoUtil.getTilesetClippingMatrix(model);
                    const plane = getInitClippingPlane(this._clipMode);
                    this.updateTilesetClippingPlane(plane);
                } catch (e) {
                    console.log(e);
                }

            }
        });
    }

    /**
     * 销毁面剖切工具
     *  
     * @returns {Boolean}
     */
    destroy() {
        this.clipEditorAxis && this.clipEditorAxis.destroy();

        this.tileset && this.recoverTileset(this.tileset);
        
        return destroyObject(this);
    }
}


/**
 * 获取初始剖切面
 * 
 * @private
 * 
 * @param {ClipModeType} clipMode 裁切模式
 * 
 * @returns {Plane}
 */
 function getInitClippingPlane(clipMode) {
    let normal;
    switch (clipMode) {
        case ClipModeType.X: default:
            normal = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
            break;
        case ClipModeType.Y:
            normal = Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3());
            break;
        case ClipModeType.Z:
            normal = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
            break;
        case ClipModeType.MINUS_X:
            normal = Cartesian3.UNIT_X;
            break;
        case ClipModeType.MINUS_Y:
            normal = Cartesian3.UNIT_Y;
            break;
        case ClipModeType.MINUS_Z:
            normal = Cartesian3.UNIT_Z;
            break;
    }
    return new Plane(normal, 0);
}

export default PlaneClipTool;