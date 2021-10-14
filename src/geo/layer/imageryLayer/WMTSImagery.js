import BaseMap from './BaseMap';
import defined from 'cesium/Core/defined';
import defaultValue from 'cesium/Core/defaultValue';
import DeveloperError from 'cesium/Core/DeveloperError';
import WebMapTileServiceImageryProvider from 'cesium/Scene/WebMapTileServiceImageryProvider';
import ImageryLayer from 'cesium/Scene/ImageryLayer';
import Rectangle from '../../../../cesium/Source/Core/Rectangle';

class WMTSImagery extends BaseMap {

    /**
     * WMTS地图服务类
     * @alias WMTSImagery
     * @constructor 
     * @extends BaseMap
     * @private
     * @param {Object} options 包含以下参数的对象
     * @param {String} [options.url] 地图服务地址
     * @param {String} [options.name='default'] 影像服务名称
     * @param {String} [options.layer] 图层名
     * @param {String} [options.style] 图层样式名
     * @param {String} [options.format='image/jpeg'] 影像切片文件格式
     * @param {String} [options.tileMatrixSetID] TileMatrixSet 
     * @param {String | Array<String>} [options.subdomains] 可用的子域，用于克服浏览器对每个主机同时请求数的限制。
     * @param {String} [options.tileMatrixLabels] tileMatrixLabels * 
     * @param {Number} [options.minimumLevel=0] 地图服务支持的最小层级
     * @param {Number} [options.maximumLevel] 地图服务支持的最大层级
     * @param {TilingScheme} [options.tilingScheme=GeographicTilingScheme] 地图切片方案
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] 图层覆盖范围
     * @param {String} [options.useCacheDB] 是否开启影像缓存
     *  
     * @example
     * var layer = layerManager.createLayer(BOSGeo.LayerType.IMAGERY, "WMTS服务图层");
        layer.add({
            map: BOSGeo.ImageryMapType.WMTS_IMAGE,
            name: "wms",
            url: "http://bosgeo.bimwinner.com/geoserver/codex/service/wmts?",
            layer: "RasterImages:fsqcDOM3",
            style: "raster",
            format: "image/png",
            tileMatrixSetID: "EPSG:4326", // 900913
            tileMatrixLabels: [
                "EPSG:4326:0",
                "EPSG:4326:1",
                "EPSG:4326:2",
                "EPSG:4326:3",
                "EPSG:4326:4",
                "EPSG:4326:5",
                "EPSG:4326:6",
                "EPSG:4326:7",
                "EPSG:4326:8",
                "EPSG:4326:9",
                "EPSG:4326:10",
                "EPSG:4326:11",
                "EPSG:4326:12",
                "EPSG:4326:13",
                "EPSG:4326:14",
                "EPSG:4326:15",
                "EPSG:4326:16",
                "EPSG:4326:17",
                "EPSG:4326:18",
                "EPSG:4326:19",
                "EPSG:4326:20",
                "EPSG:4326:21",
            ],
            tilingScheme: new BOSGeo.GeographicTilingScheme()
        });
     * 
     */
    constructor(options) {
        super(options);
        if (!defined(options.style)) {
            throw new DeveloperError('options.style未定义');
        }
        if (!defined(options.tileMatrixSetID)) {
            throw new DeveloperError('options.tileMatrixSetID未定义');
        }
        this.mapProvider = new WebMapTileServiceImageryProvider({
            ...options,
            url: this._url,
        });
        this.mapProvider._name = this._name;
        this.mapLayer = new ImageryLayer(this.mapProvider);
    }
}
export default WMTSImagery;