import defined from "cesium/Core/defined";
import DeveloperError from "cesium/Core/DeveloperError";
import TilingScheme from "../../constant/TilingScheme";
import GeographicTilingScheme from "cesium/Core/GeographicTilingScheme";
import WebMercatorTilingScheme from "cesium/Core/WebMercatorTilingScheme";
import defaultValue from "cesium/Core/defaultValue";
/**
 * 基础地图类，是ArcGISMap、BingMap、MapBoxMap、OpenStreetMap、SimpleImage、UrlTemplateImagery、WMSImagery和WMTSImagery的基类。
 * @class BaseMap
 * @constructor
 * @param {Object} options 包含以下参数的对象
 * @param {String} [options.url] 地图服务地址
 * @param {String} [options.name] 影像服务名称
 * @param {TilingScheme} [options.tilingScheme=GeographicTilingScheme] 地图切片方案
 * @param {Number} [options.maximumLevel] 显示地图的最大层级
 */
class BaseMap {
  /**
   * 基础地图类，是ArcGISMap、BingMap、MapBoxMap、OpenStreetMap、SimpleImage(ImageryMapType.SimpleImage)、UrlTemplateImagery(ImageryMapType.URL_IMAGE)、WMSImagery(ImageryMapType.WMS_IMAGE)和WMTSImagery(ImageryMapType.WMTS_IMAGE)的基类。
   * @alias BaseMap
   * @constructor
   *
   * @param {Object} options 包含以下参数的对象
   * @param {String} [options.url] 地图服务地址
   * @param {String} [options.name='defaultBaseMapName'] 影像服务名称
   * @param {TilingScheme} [options.tilingScheme=GeographicTilingScheme] 地图切片方案
   * @param {Number} [options.maximumLevel] 显示地图的最大层级
   */
  constructor(options) {
    if (!defined(options)) {
      throw new DeveloperError("options未定义");
    }

    this._url = options.url;
    this._name = defaultValue(options.name, "defaultBaseMapName");
    this._tilingScheme =
      options.tilingScheme === TilingScheme.WebMercatorTilingScheme
        ? new WebMercatorTilingScheme()
        : new GeographicTilingScheme();
    this._maximumLevel = options.maximumLevel;
  }
}
export default BaseMap;
