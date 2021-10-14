import BaseMap from './BaseMap';
import defined from 'cesium/Core/defined';
import DeveloperError from 'cesium/Core/DeveloperError';
import UrlTemplateImageryProvider from 'cesium/Scene/UrlTemplateImageryProvider';
import ImageryLayer from 'cesium/Scene/ImageryLayer';

class UrlTemplateImagery extends BaseMap {
    /**
     * 离线地图服务类
     * @alias UrlTemplateImagery
     * @constructor 
     * @extends BaseMap
     * @private
     * @param {Object} options 包含以下参数的对象
     * @param {String} [options.url] 地图服务地址
     * @param {String} [options.name] 影像服务名称
     * @param {String} [options.useCacheDB] 是否开启影像缓存
     * @param {String | Array<String>} [options.subdomains] 可用的子域，用于克服浏览器对每个主机同时请求数的限制。
     * @example
     * let imageryLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.IMAGERY, '影像图层');
        imageryLayer.add({
            map: BOSGeo.ImageryMapType.URL_IMAGE,
            url: './resource/gmaps/{z}/{x}/{y}.png',
            name: '123123'
        });
     */
    constructor(options) {
        super(options)
        if (!defined(options.url)) {
            throw new DeveloperError('options.url未定义');
        }
        this.mapProvider = new UrlTemplateImageryProvider({
            ...options,
			name: this._name,
            subdomains: options.subdomains,
            url: this._url,
            maximumLevel: this._maximumLevel,
            useCacheDB: options.useCacheDB
        });
        this.mapProvider._name = this._name;
        this.mapLayer = new ImageryLayer(this.mapProvider);
    }

}
export default UrlTemplateImagery;