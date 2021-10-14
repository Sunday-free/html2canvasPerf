import BaseMap from "./BaseMap";
import defaultValue from "cesium/Core/defaultValue";
import DeveloperError from "cesium/Core/DeveloperError";
import OpenStreetMapImageryProvider from "cesium/Scene/OpenStreetMapImageryProvider";
import ImageryLayer from "cesium/Scene/ImageryLayer";

class OpenStreetMap extends BaseMap {
  /**
   * OpenStreetMap地图服务类
   * @alias OpenStreetMap
   * @constructor
   * @extends BaseMap
   * @private
   * @param {Object} options 包含以下参数的对象
   * @param {String} options.url 地图服务地址
   * @param {String} [options.name] 影像服务名称
   * @param {String} [options.useCacheDB] 是否开启影像缓存
   * 
   */
  constructor(options) {
    super(options);
    this.mapProvider = new OpenStreetMapImageryProvider({
      url: this._url,
      useCacheDB: options.useCacheDB
    });
    this.mapProvider._name = this._name;
    this.mapLayer = new ImageryLayer(this.mapProvider);
  }
}
export default OpenStreetMap;
