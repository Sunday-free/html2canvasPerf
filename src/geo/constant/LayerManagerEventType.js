/**
 * 图层管理器事件类型，枚举类
 * @alias LayerManagerEventType
 * @readonly
 * @enum {String}
 * @example
 *  let geomap = new BOSGeo.GeoMap('container');
 *  let layerManager = geomap.layerManager;
 *  layerManager.on(BOSGeo.layerManagerEventType.ADD, (result) => {
 *      console.log(result);
 * })
 */
let LayerManagerEventType = {
    /**
     * 添加图层
     * @type {String}
     * @constant
     */
    ADD: 'ADD',
    /**
     * 删除图层
     * @type {String}
     * @constant
     */
    REMOVE: 'REMOVE',
    /**
     * 任何图层发生改变时
     * @type {String}
     * @constant
     */
    CHANGE: 'CHANGE',

}

export default Object.freeze(LayerManagerEventType);