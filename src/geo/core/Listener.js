import defined from "cesium/Core/defined";
class Listener {
    /**
     * 事件监听类
     * @alias Listener
     * @private
     * 
     * @constructor
     */
    constructor() {
        this._handleEvent = {}; // key:eventType value:Map<Function>
    }

    /**
     * 函数监听事件
     * 
     * @param {String} eventType 监听事件
     * @param {Function} callback 回调函数
     */
    on(eventType, callback) {
        this._specialOn(eventType, callback, callback);

    }

    /**
     * 特殊函数绑定：某些情况下监听内部需要对回调函数进行加工。为了依旧能够通过原回调函数取消监听的效果，可使用此方法
     * 
     * @private
     * 
     * @param {String} eventType 监听事件
     * @param {Function} keyCallback 可用于取消监听的函数标识
     * @param {Function} valueCallback 事件触发时真实被调用 
     */
    _specialOn(eventType, keyCallback, valueCallback) {
        const handle = this._handleEvent[eventType];
        if (!handle) {
            this._handleEvent[eventType] = new Map;
        }
        this._handleEvent[eventType].set(keyCallback, valueCallback); //事件触发时 调用valueCallback。
    }

    /**
     * 判断该函数是否已绑定该事件
     * 
     * @param {String} eventType 监听事件
     * @param {Function} callBack 回调函数
     * @return {Boolean} 该函数是否已绑定该事件
     */
    hasOn(eventType, callback) {
        var handle = this._handleEvent[eventType];
        if (!handle) {
            return false
        } else {
            return [...handle.keys()].includes(callback);
        }
    }

    /**
     * 判断当前是否有函数监听该事件
     * 
     * @param {String} eventType 监听事件
     * @return {Boolean} 当前是否有函数监听该事件
     */
    hasEvent(eventType) {
        return (this._handleEvent[eventType]) ? true : false
    }

    /**
     * 解除该函数对该事件的监听
     *
     * @param {String} eventType 监听事件
     * @param {Function} callBack 回调函数，不设置时则会清除eventType 对应的所有监听事件函数。
     */
    off(eventType , callback) {
        if(this._handleEvent[eventType]){
            if(defined(callback)){
                this._handleEvent[eventType] && this._handleEvent[eventType].delete(callback);
            }else{
                this._handleEvent[eventType].clear();
            }
        }
    }

    /**
     * 函数仅监听一次事件
     * 
     * @param {String} eventType 监听事件
     * @param {Function} callBack 回调函数
     */
    once(eventType, callback) {
        const decoratedCallback = (value) => {
            this.off(eventType, decoratedCallback);
            callback(value);
        }
        this.on(eventType, decoratedCallback);
    }

    /**
     * 触发事件
     * 
     * @param {String} eventType 监听事件
     * @param {*} value 触发事件时可传入任意值
     */
    fire(eventType, value) {
        var allCallback = this._handleEvent[eventType] && [...this._handleEvent[eventType].values()];
        if (!allCallback) return;

        allCallback.forEach((cb) => cb(value));
    }
}


export default Listener
