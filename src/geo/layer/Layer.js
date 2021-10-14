import Listener from '../core/Listener.js';
import destroyObject from 'cesium/Core/destroyObject';
import LayerEventType from "../constant/LayerEventType";
import { GeoDepository } from "../core/GeoDepository";

class Layer {
    /**
     * 基础图层类，是 DrawLayer、EchartsLayer、GeoJsonLayer、GeometryLayer、KMLLayer、LineLayer、MapLayer、ModelLayer、PointLayer、PrimitiveLayer、TerrainLayer、WFSLayer的基类。
     * @alias Layer
     * @constructor
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} options.name 图层名称；
     * @param {Boolean} options.show 是否显示；
     * @param {String} options.customGroupId 自定义分组的ID；
     * @param {Number} [options.order=0] 排序序号。
     * 
     * @see DrawLayer 
     * @see EchartsLayer
     * @see GeoJsonLayer
     * @see GeometryLayer
     * @see KMLLayer
     * @see LineLayer
     * @see MapLayer
     * @see ModelLayer
     * @see PointLayer
     * @see PrimitiveLayer
     * @see TerrainLayer
     * @see WFSLayer
     * 
     * @example
     * var layer = new BOSGeo.Layer({
     *   name: '测试图层',
     *   show: true,
     *   customGroupId: '图层组1',
     * });
     */
    constructor(options) {
        const {
            name,
            show,
            customGroupId,
            order = 0
        } = options;
        this.name = name;
        this.geomap = options.geomap;
        this._customGroupId = customGroupId;
        this._order = order;
        if (this.geomap) {
            this.viewer = this.geomap.viewer;
            this.entities = this.viewer.entities;
        }

        this._listener = new Listener();
        this._initialShow = show;
    }

    /**
     * 排序序号
     * 
     * @property {Number}
     * @default 0
     */
    get order() {
        return this._order;
    }
    set order(value) {
        this._order = value;
        this.fire(LayerEventType.CHANGE);
    }

    /**
     * 分组id
     * @property {String}
     */
    get customGroupId() {
        return this._customGroupId;
    }
    set customGroupId(value) {
        this._customGroupId = value;
        this.fire(LayerEventType.CHANGE);
    }

    /**
     * 绑定事件
     * 
     * @param {String|LayerEventType} eventType 图层事件类型
     * @param {Function} callBack 回调函数
     * 
     * @example
     * layer.on(BOSGeo.LayerEventType.ADD, (result) => {
     *    console.log(result);
     * });
     */
    on(eventType, callBack) {
        (!this.hasOn(eventType, callBack)) && this._listener.on(eventType, callBack);
    }

    /**
     * 触发事件
     * 
     * @param {String|LayerEventType} eventType 监听事件
     * @param {*} value 触发事件时可传入任意值
     * 
     */
    fire(eventType, value) {
        if (this._listener) {
            this._listener.fire(eventType, value);
        }
    }

    /**
     * 判断该函数是否已绑定该事件
     * 
     * @param {String|LayerEventType} eventType 监听事件
     * @param {Function} callBack 回调函数
     * 
     * @returns {Boolean} 是否绑定了该事件
     * 
     * @example
     * var hasBind = layer.hasOn(BOSGeo.LayerEventType.ADD, callback);
     */
    hasOn(eventType, callBack) {
        return this._listener.hasOn(eventType, callBack);
    }

    /**
     * 绑定后该函数只执行一次
     * 
     * @param {String|LayerEventType} eventType 监听事件
     * @param {Function} callBack 回调函数
     * 
     * @returns {*}
     */
    once(eventType, callBack) {
        return this._listener.once(eventType, callBack);
    }

    /**
     * 取消事件绑定
     * 
     * @param {String} eventType 监听事件
     * @param {Function} callBack 回调函数
     * 
     * @returns {*}
     */
    off(eventType, callBack) {
        if (this._listener) {
            return this._listener.off(eventType, callBack);
        }

    }

    /**
     * @private
     */
    _destroyBaseLayer() {
        destroyObject(this);
    }
}
export default Layer;