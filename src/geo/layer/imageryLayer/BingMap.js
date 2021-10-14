import BaseMap from "./BaseMap";
import defaultValue from "cesium/Core/defaultValue";
import DeveloperError from "cesium/Core/DeveloperError";
import BingMapsImageryProvider from "cesium/Scene/BingMapsImageryProvider";
import ImageryLayer from "cesium/Scene/ImageryLayer";
import BingMapsStyle from "cesium/Scene/BingMapsStyle";

class BingMap extends BaseMap {
  /**
   * Bing地图服务类
   * @alias BingMap
   * @constructor
   * @extends BaseMap
   * @private
   * @param {Object} options 参数对象
   * @param {String} [options.accessToken] Bing服务密钥
   * @param {BingMapsStyle} [options.mapStyle] 地图样式
   * @param {String} [options.url] 地图服务地址
   * @param {String} [options.name] 影像服务名称
   * @param {String} [options.useCacheDB] 是否开启影像缓存
   */
  constructor(options) {
    super(options);
    this.key = options.accessToken; //个人申请
    this.mapProvider = new BingMapsImageryProvider({
      url: this._url,
      key: this.key,
      mapStyle: options.mapStyle,
      // mapStyle : BingMapsStyle.AERIAL
      useCacheDB: options.useCacheDB
    });
    this.mapProvider._name = this._name;
    this.mapLayer = new ImageryLayer(this.mapProvider);
  }
}
export default BingMap;
