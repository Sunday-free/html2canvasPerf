import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType';

/**
 * 地图事件类型，枚举类
 * 包括： POST_RENDER (渲染结束)、LEFT_DOWN (左键落)、LEFT_UP (左键起)、LEFT_CLICK (左键点击)、LEFT_DOUBLE_CLICK (左键双击)、RIGHT_DOWN (右键落)、RIGHT_UP (右键起)、RIGHT_CLICK (右键点击)、MIDDLE_DOWN (中键落)、MIDDLE_UP (中键起)、MIDDLE_CLICK (中键点击)、MOUSE_MOVE (鼠标移动)、WHEEL (滚轮滚动)、PINCH_START (双指触动开始)、PINCH_END (双指触动移动)、PINCH_MOVE (双指触动结束)
 * @alias MapEventType
 * @readonly
 * @enum {String}
 * @example
 *  let geomap = new BOSGeo.GeoMap('container');
 *  geomap.on(BOSGeo.MapEventType.LEFT_CLICK, (res) => {
 *    console.log(res);
 *  }, [BOSGeo.MapPickType.WGS84_POSITION]);
 * 
 */
const MapEventType = {
  /**
   * 渲染结束
   */
  POST_RENDER: 'POST_RENDER'
};

//MixIn屏幕操作事件
for (const [key, value] of Object.entries(ScreenSpaceEventType)) {
  MapEventType[key] = `MAP_ON_SCREEN_${key}`;
}

export default Object.freeze(MapEventType);
