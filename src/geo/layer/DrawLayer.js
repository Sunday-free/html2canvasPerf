import Layer from "./Layer";
import LayerEventType from "../constant/LayerEventType";
import LayerType from "../constant/LayerType";

class DrawLayer extends Layer {
    /**
     * 点线面绘制图层
     * @alias DrawLayer
     * @constructor
     * 
     * @param {Object} options 包含以下参数的Object对象
     * @param {String} [options.name] 图层名称
     * @param {Boolean} [options.show] 是否显示
     * @param {String} [options.customGroupId] 自定义分组的ID
     * 
     * @example
     * var drawLayer = new BOSGeo.DrawLayer({
     *   name: '绘制图层1',
     *   show: true,
     *   customGroupId: '图层组1',
     * });
     * 
     */
    constructor(options) {
        super(options);
        this.ctrArr = [];
        this.layerType = LayerType.DRAW;
    }

    /**
     * 添加绘制
     * 
     * @param {Draw} draw 绘制类Draw实例对象
     */
    add(draw) {
        this.ctrArr.push(draw);
    }

    /**
     * 清空
     */
    clear() {
        for (let i = 0; i < this.ctrArr.length; i++) {
            try {
                let ctr = this.ctrArr[i];
                if (ctr.clear) {
                    ctr.clear();
                }
            } catch (e) {
                console.log(e)
            }
        }
    }
    
    /**
     * 销毁本图层
     */
    destroy() {
        this.clear();
        this._destroyBaseLayer();
    }
}

export default DrawLayer;