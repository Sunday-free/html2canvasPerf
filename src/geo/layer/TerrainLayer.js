import Layer from "./Layer";
import CesiumTerrainProvider from 'cesium/Core/CesiumTerrainProvider';
import EllipsoidTerrainProvider from 'cesium/Core/EllipsoidTerrainProvider';
import defaultValue from 'cesium/Core/defaultValue';
import LayerEventType from "../constant/LayerEventType";
import LayerType from "../constant/LayerType";
import DeveloperError from "cesium/Core/DeveloperError.js";

class TerrainLayer extends Layer {
    /**
     * 地形图层，可实现地形的添加、移除和显隐等操作
     * @alias TerrainLayer
     * @constructor
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} [options.name] 图层名称；
     * @param {Boolean} [options.show] 是否显示；
     * @param {String} [options.customGroupId] 若使用自定义分组，该图层所在分组的名称。
     * 
     * @example
     * let geomap = new BOSGeo.GeoMap('bosgeoContainer');
     * let terrainLayer = layerManager.createLayer(BOSGeo.LayerType.TERRAIN, '测试地形2', 'map4');
     * 
     */
    constructor(options) {
        super(options);
        this._show = options.show;
        this.layerType = LayerType.TERRAIN;
    }

    /**
     * 加载地形
     * 
     * @param {Object} [options] 配置参数：
     * @param {String} options.url 地形服务地址，若不传人则为全球地形服务(加载缓慢，推荐使用自有地形服务)；
     * @param {Boolean} [options.requestWaterMask=true]  显示水波纹效果；
     * @param {Boolean} [options.requestVertexNormals=true] 显示光照效果。
     * 
     */
    add(options) {
        if (!options.url || options.url === '') {
            throw new DeveloperError('(options.url)为必传参数');
        }
        !this._url && (this._url = options && options.url);

        this._requestWaterMask = defaultValue(options && options.requestWaterMask, true);
        this._requestVertexNormals = defaultValue(options && options.requestVertexNormals, true);
        this.viewer.terrainProvider = new CesiumTerrainProvider({
            url: this._url,
            requestWaterMask: this._requestWaterMask,
            requestVertexNormals: this._requestVertexNormals,
        });
        if (!this.show) this.hide();
        this.fire(LayerEventType.ADD, this.viewer.terrainProvider);
        this.fire(LayerEventType.CHANGE);
    }

    /**
     * 移除地形
     */
    remove() {
        this.fire(LayerEventType.REMOVE, this.viewer.terrainProvider);
        this.viewer.terrainProvider = new EllipsoidTerrainProvider({});
        this._url = undefined;
        this.fire(LayerEventType.CHANGE);
    };

    /**
     * 隐藏当前地形
     */
    hide() {
        this.viewer.terrainProvider = new EllipsoidTerrainProvider({});
        this.fire(LayerEventType.CHANGE);
    };

    /**
     * 是否显示图层
     * @property {Boolean}
     */
    get show() {
        return this._show;
    }
    set show(value) {
        this._show = value;
        let that = this;
        this.viewer.terrainProvider.readyPromise.then(function () {
            (that._show && that._url) ? that.add({ url: that._url, requestWaterMask: that._requestWaterMask, requestVertexNormals: that._requestVertexNormals }) : that.hide();
        });
        this.fire(LayerEventType.CHANGE, { toggleShow: true });
    }
    /**
     * 销毁本图层
     */
    destroy() {
        this.remove();
        this._destroyBaseLayer();
    }
}
export default TerrainLayer;