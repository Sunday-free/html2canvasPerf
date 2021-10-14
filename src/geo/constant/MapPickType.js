/**
 * 地图点击事件结果类型
 * @alias MapPickType
 * @readonly
 * @enum {String}
 *  @example
 *  let geomap = new BOSGeo.GeoMap('container');
 *  geomap.on(BOSGeo.MapEventType.LEFT_CLICK, () => {
 *    alert(123);  
 *  }, [BOSGeo.MapPickType.WGS84_POSITION]);
 */
var MapPickType = {
  /**
   * 世界坐标  
   *
   * @type {String}
   * @constant
   */
  WORLD_POSITION: 'WORLD_POSITION',
  /**
   * 屏幕坐标
   *
   * @type {String}
   * @constant
   */
  WINDOW_POSITION: 'WINDOW_POSITION',
  /**
  * 经纬度坐标
  *
  * @type {String}
  * @constant
  */
  WGS84_POSITION: 'WGS84_POSITION',
  /**
   * 要素
   *
   * @type {String}
   * @constant
   */
  FEATURE: 'FEATURE',

};
export default Object.freeze(MapPickType);
