/**
 * 图层事件类型，枚举类 
 * @alias LayerEventType
 * @readonly
 * @enum {String}
 * @example
 *  let geomap = new BOSGeo.GeoMap('container');
 *  let layerManager = geomap.layerManager;
 *  let imageryLayer = layerManager.createImageryLayer('默认');
 *  imageryLayer.on(BOSGeo.LayerEventType.ADD, (result) => {
 *      console.log(result);
 *  });
 *  imageryLayer.add({map:BOSGeo.ImageryMapType.TDT_IMAGERY});//天地图影像地图 
 */
let LayerEventType = {
    /**
     * 添加数据
     * @type {String}
     * @constant
     */
    ADD: 'LAYER_ON_ADD',
    /**
     * 删除数据
     * @type {String}
     * @constant
     */
    REMOVE: 'LAYER_ON_REMOVE',
    /**
     * 图层发生改变
     * @type {String}
     * @constant
     */
    CHANGE: 'LAYER_ON_CHANGE',

}

export default Object.freeze(LayerEventType);