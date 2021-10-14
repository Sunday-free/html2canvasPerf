import SingleTileImageryProvider from "cesium/Scene/SingleTileImageryProvider";
import Rectangle from "cesium/Core/Rectangle";
import BaseMap from "./BaseMap";
import defined from "cesium/Core/defined";
import DeveloperError from "cesium/Core/DeveloperError";
import ImageryLayer from "cesium/Scene/ImageryLayer";

class SimpleImage extends BaseMap {
    /**
     * 普通图片服务类，可叠加到地图上
     * @alias SimpleImage
     * @constructor
     * @extends BaseMap
     * @private
     * @param {Object} options 包含以下参数的对象
     * @param {String} [options.url] 地图服务地址
     * @param {String} [options.name] 影像服务名称
     * @param {String} [options.useCacheDB] 是否开启影像缓存
     * @param {Array<Number>} [options.extent=[-180,-90,180,90]] 图片覆盖区域 [west, south, east, north]
     * @example
     * var layer = layerManager.createLayer(BOSGeo.LayerType.IMAGERY, "影像图层");
          layer.add({
              map: BOSGeo.ImageryMapType.SIMPLEIMAGE,
              name: "图片a",
              url: "http://bosgeo.boswinner.com/geoData/images/europe_vir_2016_lrg.png",
              extent: [-180, -90, 0, 90]
          });
     */
    constructor(options) {
        options = Object.assign({
            extent: [-180, -90, 180, 90]
        }, options);
        super(options);
        if (!defined(options.url)) {
            throw new DeveloperError("options.url未定义");
        }
        this.extentRectangle = Rectangle.fromDegrees(...options.extent);
        this.mapProvider = new SingleTileImageryProvider({
            rectangle: this.extentRectangle,
            url: this._url,
            useCacheDB: options.useCacheDB
        });
        this.mapProvider._name = this._name;
        this.mapLayer = new ImageryLayer(this.mapProvider);
    }
}
export default SimpleImage;
