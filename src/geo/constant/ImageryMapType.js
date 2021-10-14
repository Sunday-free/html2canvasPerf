const { default: defaultValue } = require("../../../cesium/Source/Core/defaultValue");
/**
 * 影像与地图服务类型
 * @readonly
 * @enum {Number}
 * @example
 *  参见MapLayer的add方法
 */
let ImageryMapType = {

    /**
     * 天地图影像底图
     */
    TDT_IMAGERY: 0,

    /**
     * 天地图矢量底图
     */
    TDT_VECTOR: 1,

    /**
     * 高德影像底图
     */
    GD_IMAGERY: 2,

    /**
     * 高德矢量底图
     */
    GD_VECTOR: 3,

    /**
     * ARCGIS影像图
     */
    ARCGIS_IMAGERY: 4,
    /**
     * ARCGIS矢量图
     */
    ARCGIS_STREET: 5,
    /**
     * google矢量图
     */
    GOOGLE_STREET: 6,
    /**
     * google影像图
     */
    GOOGLE_IMAGERY: 7,

    /**
     *MAPBOX影像图，保留，需申请token
    */
    MAPBOX_IMAGERY: 8,

    /**
     * 谷歌地球
     */
    GOOGLE_EARTH: 9,
    /**
     * openstreet矢量图
     */
    OPENSTREET_MAPS: 10,
    /**
     * 必应影像底图
     */
    BING_IMAGERY: 11,
    /**
     * 必应矢量底图
     */
    BING_VEC: 12,
    /**
     * 必应暗黑风格底图
     */
    BING_DARK: 13,

    /**
     * 天地图矢量注记图层
     */
    TDT_VECANNO: 14,
    /**
     * 天地图影像注记图层
     */
    TDT_IMGANNO: 15,
    /**
     * openstreet矢量图
     */
    OPENSTREET_VEC: 16,
    /**
     * 简单自定义图片，对应Cesium的SingleTileImageryProvider类型
     */
    SIMPLEIMAGE: 17,
    /**
     * WMS服务，对应Cesium的WebMapServiceImageryProvider类型
     */
    WMS_IMAGE: 18,
    /**
     * WMTS服务，对应Cesium的WebMapTileServiceImageryProvider类型
     */
    WMTS_IMAGE: 19,
    /**
     *离线地图服务，对应Cesium的UrlTemplateImageryProvider类型
     */
    URL_IMAGE: 20,
	/**
	 *ArcGIS的MapServer服务，对应Cesium的ArcGisMapServerImageryProvider类型
	 */
	ArcGisMapServerImageryProvider:21
}

ImageryMapType.equals = function (type, name) {
    switch (type) {
        case ImageryMapType.TDT_IMAGERY:
            return name === '天地图影像底图';
        case ImageryMapType.TDT_VECTOR:
            return name === '天地图矢量底图';
        case ImageryMapType.TDT_VECANNO:
            return name === 'TDT_VECANNO';
        case ImageryMapType.GD_IMAGERY:
            return name === 'GD_IMAGERY';
        case ImageryMapType.ARCGIS_IMAGERY:
            return name === 'ARCGIS_IMAGERY';
        case ImageryMapType.GOOGLE_IMAGERY:
            return name === '谷歌影像底图';
        case ImageryMapType.OPENSTREET_MAPS:
            return name === 'OPENSTREET_MAPS';
        case ImageryMapType.MAPBOX_IMAGERY:
            return name === 'MapBox影像图';
        case ImageryMapType.BING_IMAGERY:
            return name === '必应影像底图';
        default:
            break;
    }

}

export default Object.freeze(ImageryMapType);