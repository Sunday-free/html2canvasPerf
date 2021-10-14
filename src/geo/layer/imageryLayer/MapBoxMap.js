import BaseMap from "./BaseMap";
import defaultValue from "cesium/Core/defaultValue";
import DeveloperError from "cesium/Core/DeveloperError";
import MapboxImageryProvider from "cesium/Scene/MapboxImageryProvider";
import MapboxStyleImageryProvider from "cesium/Scene/MapboxStyleImageryProvider";
import ImageryLayer from "cesium/Scene/ImageryLayer";

class MapBoxMap extends BaseMap {
  /**
   * MapBox地图服务类
   * @alias MapBoxMap
   * @constructor
   * @extends BaseMap
   * @private
   * @param {Object} options 包含以下参数的对象
   * @param {String} [options.url] 地图服务地址
   * @param {String} [options.name] 影像服务名称
   * @param {String} [options.accessToken] Mapbox服务密钥
   * @param {String} [options.styleId] 可选的地图样式
   * @param {String} [options.format='png'] 图片格式
   * @param {Boolean} [options.useCacheDB] 是否使用影像缓存
   *
   */
  constructor(options) {
    super(options);
    this._accessToken = options.accessToken;
    this._styleId = options.styleId;
    this._format = defaultValue(options.format, "png");
    this.mapProvider = new MapboxStyleImageryProvider({
      url: this._url,
      styleId: this._styleId,
      accessToken: this._accessToken,
      useCacheDB: options.useCacheDB,
    });
    this.mapProvider._name = this._name;
    this.mapLayer = new ImageryLayer(this.mapProvider);
  }
}
export default MapBoxMap;
