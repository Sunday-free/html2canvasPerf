import AssociativeArray from 'cesium/Core/AssociativeArray';
import destroyObject from 'cesium/Core/destroyObject';
import Color from 'cesium/Core/Color';
import defined from 'cesium/Core/defined';
import Cartesian2 from 'cesium/Core/Cartesian2';

import { GeoDepository } from '../core/GeoDepository';

class ColorGradient {
    /**
     * 颜色梯度类
     * 
     * @alias ColorGradient
     * @constructor
     * @param {Array.<Object>} [colorPairs] 颜色对列表，颜色对结构为{key: Number, value: BOSGeo.Color}
     * 
     * @example
     * var colorPairs = [
     *  {
     *      key: 0,
     *      value: BOSGeo.Color.BLUE
     *  },
     *  {
     *      key: 1,
     *      value: BOSGeo.Color.RED
     *  }
     * ];
     * var colorGradient = new BOSGeo.ColorGradient(colorPairs);
     * 
     */
    constructor(colorPairs) {
        this._colorHashArray = new AssociativeArray();

        this._colorCanvas = document.createElement("canvas");
        this._colorCanvas.width = COLOR_TEXTURE_SIZE.x;
        this._colorCanvas.height = COLOR_TEXTURE_SIZE.y;
        GeoDepository.viewer.container.append(this._colorCanvas);

        this._colorPairs = [];
        if (defined(colorPairs) && colorPairs.length > 0) {
            for (let i = 0, len = colorPairs.length; i < len; i++) {
                const { key, value } = colorPairs[i];
                if (typeof key !== "number") {
                    console.warn(`BOSGeo.ColorGradient.construct--colorPairs中的key--‘${key}’值类型不对！`);
                    break;
                }
                if (!(value instanceof Color)) {
                    console.warn(`BOSGeo.ColorGradient.construct--colorPairs中的value--‘${value}’值类型不对！`);
                    break;
                }
                this._colorHashArray.set(key, value);
                this._colorPairs.push(colorPairs[i]);
            }
            this._redrawColorSteps(this._colorPairs);
        }
    }

    /**
     * （颜色梯度的）长度
     * @property {Number} length
     * @readonly
     */
    get length() {
        return this._colorHashArray.length;
    }

    /**
     * 返回CSS- linear-gradient的样式string (经过排序的)
     * @property {String} cssColorSteps
     * @readonly
     * 
     * @example
     * document.getElementById('color-Pan').style.background = `linear-gradient(90deg, ${colorGradient.cssColorSteps})`;
     */
    get cssColorSteps() {
        return this._cssColorSteps;
    }

    /**
     * 颜色渐变画布
     * @property {HTMLCanvasElement} colorCanvas
     * @readonly
     */
    get colorCanvas() {
        return this._colorCanvas;
    }

    /**
     * 清空颜色梯度
     */
    clear() {
        this._colorHashArray.values.length = 0;
        this._colorPairs = [];
        this._updateCanvas();
    }

    /**
     * 判断颜色梯度是否一致
     * 
     * @param {ColorGradient} colorGradient 
     * 
     * @returns {Boolean}
     */
    equals(colorGradient) {
        if (!(colorGradient instanceof ColorGradient) || this.length !== colorGradient.length) return false;

        for (let key in this._colorHashArray._hash) {
            if (!Color.equals(this._colorHashArray.get(key), colorGradient._colorHashArray.get(key))) {
                return false;
            }
        }
        return true;
    }

    /**
     * 更新画布
     * @private
     */
    _updateCanvas() {
        let colorPairs = [], index = 0;
        for (let key in this._colorHashArray._hash) {
            if (defined(key)) {
                colorPairs[index++] = {
                    key: parseFloat(key),
                    value: this._colorHashArray.get(key)
                };
            }
        }
        this._redrawColorSteps(colorPairs);
    }

    /**
     * 重新绘制颜色梯度
     * @private
     * @param {Array.<Object>} colorPairs 颜色对列表，颜色对结构为{key: Number, value: BOSGeo.Color} 
     */
    _redrawColorSteps(colorPairs) {
        const { width, height } = this._colorCanvas;
        const context2d = this._colorCanvas.getContext("2d");

        const colorNumber = colorPairs.length;

        this._cssColorSteps = '';
        let colorString;
        if (colorNumber >= 2) {
            colorPairs = colorPairs.sort((pre, next) => pre.key - next.key); // 递增
            const minValue = colorPairs[0].key;
            const maxValue = colorPairs[colorNumber - 1].key;
            const length = maxValue - minValue;
            const linearGradient = context2d.createLinearGradient(0, 0, width, 0);

            
            
            for (let i = 0; i < colorNumber; i++) {
                const { key, value } = colorPairs[i];
                colorString = value.toCssColorString();
                linearGradient.addColorStop(key / length, colorString);
                this._cssColorSteps += colorString + ` ${key / length * 100}%,`;
            }
            this._cssColorSteps = this._cssColorSteps.substring(0, this._cssColorSteps.length - 1);
            context2d.fillStyle = linearGradient;
            context2d.clearRect(0, 0, width, height);
            context2d.fillRect(0, 0, width, height);

        } else {
            context2d.clearRect(0, 0, width, height);
            if (colorNumber === 1) {
                colorString = colorPairs[0].value.toCssColorString();
                this._cssColorSteps =  `${colorString}, ${colorString}`;
                context2d.fillStyle = colorString;
                context2d.fillRect(0, 0, width, height);
            }
        }
    }

    /**
     * 复制当前类实例化对象
     * @returns {ColorGradient}
     */
    clone() {
        const colorGradient = new ColorGradient(this._colorPairs);
        return colorGradient;
    }

    /**
     * 获取指定索引的颜色梯度对象
     * @param {Number} index (如输入小数，会向上取整)
     * @returns {Object|undefined} {key: Number, value: BOSGeo.Color}--》{梯度值: 颜色值}
     */
    getItem(index) {
        if (index > this._colorHashArray.length - 1) {
            return undefined;
        }
        var i = index;
        for (let key in this._colorHashArray._hash) {
            if (!(i > 0)) {
                if (!defined(key)) {
                    break;
                }
                return {
                    key: parseFloat(key),
                    value: this._colorHashArray.get(key)
                };
            }
            i--;
        }
        return undefined;
    }

    /**
     * 颜色梯度中插入新的项
     * @param {Number} key 梯度数值
     * @param {Color} color 梯度对应颜色
     * @param {Boolean} [ifReplacing=true] 是否替换原有值
     */
    insert(key, color, ifReplacing = true) {
        if (!(color instanceof Color)) {
            throw new DeveloperError("BOSGeo.ColorGradient.insert：color is an instance of BOSGeo.Color!");
        }

        const hashValue = this._colorHashArray.get(key);
        if (!defined(hashValue) || ifReplacing) {
            const colorValue = Color.clone(color);
            this._colorHashArray.set(key, colorValue);
            
            if (defined(hashValue) && ifReplacing) {
                for (let i = 0, len = this._colorPairs.length; i < len; i++) {
                    if (this._colorPairs[i].key === key) {
                        this._colorPairs[i].value = colorValue;
                        break;
                    }
                }
            } else {
                this._colorPairs.push({
                    key,
                    value: colorValue
                });
            }
            

        } else {
            console.warn(`BOSGeo.ColorGradient.insert：colorRamp has existed key-${key}! You can't set existed key without replacing`);
            return;
        }

        this._updateCanvas();
    }

    /**
     * 移除指定key值的颜色项
     * @param {Number} key 
     * @returns {Boolean}
     */
    remove(key) {
        const result = this._colorHashArray.remove(key);
        result && this._updateCanvas();
        return result;
    }

    /**
     * 销毁
     */
    destroy() {
        this._colorHashArray.values.length = 0;

        this._colorCanvas && GeoDepository.viewer.container.removeChild(this._colorCanvas);
        this._colorCanvas = undefined;
        return destroyObject(this);
    }

}


export default ColorGradient;

// 颜色梯度纹理尺寸
const COLOR_TEXTURE_SIZE = new Cartesian2(512, 2);

