import BaseMap from './BaseMap';
import defined from 'cesium/Core/defined';
import defaultValue from 'cesium/Core/defaultValue';
import DeveloperError from 'cesium/Core/DeveloperError';
import WebMapServiceImageryProvider from 'cesium/Scene/WebMapServiceImageryProvider'
import ImageryLayer from 'cesium/Scene/ImageryLayer';
import GeographicTilingScheme from 'cesium/Core/GeographicTilingScheme';
import Util from "../../utils/Util";
import Rectangle from 'cesium/Core/Rectangle';

class WMSImagery extends BaseMap {
    /**
     * WMS地图服务类
     * @alias WMSImagery
     * @constructor 
     * @extends BaseMap
     * @private
     * @param {Object} options 包含以下参数的对象
     * @param {Resource | String} options.url 地图服务地址
     * @param {String} options.layers 服务图层名
     * @param {String} [options.name='default'] 影像服务名称
     * @param {Number} [options.minimumLevel=0] 地图服务支持的最小层级
     * @param {Number} [options.maximumLevel] 地图服务支持的最大层级
     * @param {TilingScheme} [options.tilingScheme=GeographicTilingScheme] 地图切片方案
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] 地图服务显示范围，不设置或设置范围错误会导致定位不准确
     * 
     * @param {String} [options.format='image/png'] 地图服务返回的图片MIME类型
     * @param {Boolean} [options.transparent=ture] 图片是否透明
     * @param {Number} [options.tileWidth=256] 图片像素宽度
     * @param {Number} [options.tileHeight=256] 图片像素高度
     * 
     * @example
     * var layer = layerManager.createLayer(BOSGeo.LayerType.IMAGERY, "影像图层");
        layer.add({
            map: BOSGeo.ImageryMapType.WMS_IMAGE,
            name: "wms",
            url: 'http://bosgeo.bimwinner.com/geoserver/topp/wms',
            layers: 'topp:tasmania_state_boundaries',
            rectangle: BOSGeo.Rectangle.fromDegrees(143.83482400000003, -43.648056, 148.47914100000003, -39.573891)
        });
     * 
     */
    constructor(options) {
        super(options);
        const {
            layers,
            format = 'image/png',
            transparent = true,
            minimumLevel = 0,
            rectangle = Rectangle.MAX_VALUE
        } = options;

        let parameters = Util.deepClone(WebMapServiceImageryProvider.DefaultParameters);

        parameters = Object.assign(parameters, {
            service: 'WMS',
            srs: 'EPSG:4326',
            format,
            transparent,
        });
        console.log('数据：', parameters, WebMapServiceImageryProvider.DefaultParameters);

        this.mapProvider = new WebMapServiceImageryProvider({
            // name : this._name,
            url: this._url,
            layers,
            tilingScheme: this._tilingScheme,
            maximumLevel: this._maximumLevel,
            minimumLevel,
            parameters,
            rectangle
        });
        this.mapProvider._name = this._name;
        this.mapLayer = new ImageryLayer(this.mapProvider);
    }
}
export default WMSImagery;