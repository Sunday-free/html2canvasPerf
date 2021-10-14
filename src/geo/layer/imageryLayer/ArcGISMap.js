import BaseMap from "./BaseMap";
import defined from "cesium/Core/defined";
import defaultValue from "cesium/Core/defaultValue";
import DeveloperError from "cesium/Core/DeveloperError";
import ArcGisMapServerImageryProvider from "cesium/Scene/ArcGisMapServerImageryProvider";
import ImageryLayer from "cesium/Scene/ImageryLayer";
import Ellipsoid from "cesium/Core/Ellipsoid";

class ArcGISMap extends BaseMap {
  /**
   * ArcGIS地图服务类，可加载ArcGIS的MapServer服务
   * @alias ArcGISMap
   * @constructor
   * @extends BaseMap
   * @private
   *
   * @param {Object} options 包含以下参数的对象
   * @param {String} options.url 地图服务地址
   * @param {String} [options.name='ArcGIS Mapserver服务'] 图层名称
   * @param {Ellipsoid} [options.ellipsoid=BOSGeo.Ellipsoid.WGS84] 椭球体
   * @param {Boolean} [options.enablePickFeatures=false] 是否开启点击
   * @param {String} [options.useCacheDB] 是否开启影像缓存
   */
  constructor(options) {
    options = Object.assign({
        name: 'ArcGIS Mapserver服务',
        ellipsoid: Ellipsoid.WGS84,
        enablePickFeatures: false,
    }, options)
    super(options);
    if (!defined(options.url)) {
      throw new DeveloperError("options.url未定义");
    }
    this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
    let that = this;
    this.mapProvider = new ArcGisMapServerImageryProvider({
	  ...options,
      url: that._url,
      maximumLevel: that._maximumLevel,
      tilingScheme: that._tilingScheme,
      ellipsoid: that._ellipsoid,
      useCacheDB: options.useCacheDB,
    });
    this.mapProvider._name = this._name;
    this.mapLayer = new ImageryLayer(this.mapProvider);
  }
}
export default ArcGISMap;
