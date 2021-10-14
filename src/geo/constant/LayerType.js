/**
 * 图层类型枚举类
 * @alias LayerType
 * @readonly
 * @enum {String}
 * @example
 *  var geomap = new BOSGeo.GeoMap('container')
 *  let modelLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.MODEL, 'model123', {customGroupId: 'model'});
 */
let layerType = {
  /**
   * 地形图层
   * @type {String}
   * @constant
   */
  TERRAIN: "TERRAIN",
  /**
   * 影像图层
   * @type {String}
   * @constant
   */
  IMAGERY: "IMAGERY",
  /**
   * 模型图层
   * @type {String}
   * @constant
   */
  MODEL: "MODEL",
  /**
   * 点图层
   * @type {String}
   * @constant
   */
  POINT: "POINT",
  /**
   * 线图层
   * @type {String}
   * @constant
   */
  LINE: "LINE",  
  /**
     * 面图层
     * @type {String}
     * @constant
     */
   AREA: "AREA",
  /**
   * 几何图层
   * @type {String}
   * @constant
   */
  GEOMETRY: "GEOMETRY",
  /**
   * 绘制图层
   * @type {String}
   * @constant
   */
  DRAW: "DRAW",
  /**
   * GeoJson图层
   * @type {String}
   * @constant
   */
  GEOJSON: "GEOJSON",
  /**
   * kml图层
   * @type {String}
   * @constant
   */
  KML: "KML",
  /**
   * WFS图层
   * @type {String}
   * @constant
   */
  WFS: "WFS",
   /**
     * HTML2CANVAS图层
     * @type {String}
     * @constant
     */
   HTML2CANVAS: "HTML2CANVAS",
   /**
     * HTML图层
     * @type {String}
     * @constant
     */
    HTML: "HTML"
};

export default Object.freeze(layerType);
