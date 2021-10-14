/**
 * 几何类型
 * @alias GeometryType
 * @readonly
 * @enum {String}
 * @example
 * var geomap = new BOSGeo.GeoMap('container);
 * let geometryLayer = geomap.layerManager.createGeometryLayer('几何图层');
 * geometryLayer.add({
 *     geometryType: BOSGeo.GeometryType.POLYGON,
 *     positions: [[50.23, 25.22, 30000], [60.23, 24.22, 30000], [55.23, 35.22, 30000]]     
 * });
 */
let GeometryType = {
    /**
     * 面
     * @type {String} 
     * @constant
     */
    POLYGON: 'Polygon',
    /**
     * 多面
     * @type {String} 
     * @constant
     */
    MULTIPOLYGON: 'MultiPolygon',
    /**
     * 线
     * @type {String} 
     * @constant
     */
    POLYLINE: 'Polyline',
    /**
     * 多线
     * @type {String} 
     * @constant
     */
    MULTIPOLYLINE: 'MultiPolyline',
    /**
     * 点
     * @type {String} 
     * @constant
     */
    POINT: 'Point',
    /**
     * 多点
     * @type {String} 
     * @constant
     */
    MULTIPOINT: 'MultiPoint',
}

export default Object.freeze(GeometryType)