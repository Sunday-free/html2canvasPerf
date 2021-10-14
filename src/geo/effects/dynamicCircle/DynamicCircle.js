import Color from 'cesium/Core/Color';
import Cartesian3 from 'cesium/Core/Cartesian3';
import DeveloperError from 'cesium/Core/DeveloperError';
import Check from 'cesium/Core/Check';
import createGuid from 'cesium/Core/createGuid';
import Transforms from 'cesium/Core/Transforms';
import Matrix4 from 'cesium/Core/Matrix4';
import defined from 'cesium/Core/defined';

import Util from '../../utils/Util';


class DynamicCircle {
    /**
     * 模型动态扫描圈，DynamicCircle
     * @alias DynamicCircle
     * @constructor
     * 
     * @see DynamicCircleCollection
     * @see TilesetDynamicCircle
     * 
     * @param {Object} options 
     * @param {Cartesian3} options.position 动态圈中心点
     * @param {String} options.id 动态圈标识id
     * @param {String} [options.color='#ffffff'] 动态圈的颜色
     * @param {Number} [options.radius=100] 圆圈半径
     * @param {Number} [options.width=10] 圆环宽度
     * @param {Number} [options.power=4] 圆环颜色渐变的幂次方，最小值为1，值越大，颜色渐变趋势越大
     * @param {Number} [options.breathFactor = 1] 圆环扩散呼吸因子，值越大，扩散速度越快；（此外，场景帧率与扩散速度成正比）
     * 
     * @example 
     * var dynamicCircle = new BOSGeo.DynamicCircle({
     *    position: BOSGeo.Cartesian3.fromDegrees(114.08298162601, 22.544403517),
     *    color: '#0000FF',
     *    radius: 1000,
     *    width: 100
     * });
     * 
     */
    constructor(options = {}) {
        if (!defined(options.position)) {
            throw new DeveloperError('options.position未定义!');
        } else if (!(options.position instanceof Cartesian3)) {
            throw new DeveloperError('options.position必须是Cartesian3类型!');
        }
        const {
            position,
            id = createGuid(),
            color = '#ffffff',
            radius = 100,
            width = 10,
            power = 4,
            breathFactor = 1,
        } = options;
        this._position = position;
        const _inverseModelMatrix = Matrix4.inverse(Transforms.eastNorthUpToFixedFrame(position), new Matrix4());

        /**
         * _worldMatrixArray
         * @private
         * @property {Array.<String>} _worldMatrixArray
         * @readonly
         */
        this._worldMatrixArray = Util.parseFloatArrayWithDot(Matrix4.toArray(_inverseModelMatrix));

        /**
         * id
         * @property {String} id
         * @readonly
         */
        this.id = id;
        this._color = Color.fromCssColorString(color);
        this._radius = radius;
        this._width = width;
        this._power = Math.max(power, 1);
        this._breathFactor = Math.max(breathFactor, 1);

        this.onChangeCallback = undefined;
        this.index = -1;
    }

    /**
     * 动态圈中心点三维坐标
     * @property {Cartesian3} value
     */
    get position() {
        return this._position;
    }
    set position(value) {
        Check.typeOf.object("value", value);
        if (!this._position.equals(value)) {
            this._position = value;
            const _inverseModelMatrix = Matrix4.inverse(Transforms.eastNorthUpToFixedFrame(value), new Matrix4());
            this._worldMatrixArray = Util.parseFloatArrayWithDot(Matrix4.toArray(_inverseModelMatrix));
        }
    }

    /**
     * 动态圈的颜色
     * @property {String} value
     * @default #ffffff
     */
    get color() {
        return this._color.toCssColorString();
    }
    set color(value) {
        Check.typeOf.string("value", value);
        const tempColor = Color.fromCssColorString(value);
        if (!Color.equals(this._color, tempColor)) {
            this._color = tempColor;
            defined(this.onChangeCallback) && (this.onChangeCallback(this.index));
        }
    }

    /**
     * 圆圈半径
     * @property {Number} value
     * @default 100
     */
    get radius() {
        return this._radius;
    }
    set radius(value) {
        Check.typeOf.number("value", value);
        if (value !== this._radius) {
            this._radius = value;
            defined(this.onChangeCallback) && (this.onChangeCallback(this.index));
        }
    }

    /**
     * 圆环宽度
     * @property {Number} value
     * @default 10
     */
    get width() {
        return this._width;
    }
    set width(value) {
        Check.typeOf.number("value", value);
        if (value !== this._width) {
            this._width = value;
            defined(this.onChangeCallback) && (this.onChangeCallback(this.index));
        }
    }

    /**
     * 圆环颜色渐变的幂次方，最小值为1，值越大，颜色渐变趋势越大
     * @property {Number} value
     * @default 4
     */
    get power() {
        return this._power;
    }
    set width(value) {
        Check.typeOf.number("value", value);
        value = Math.max(value, 1.0);
        if (value !== this._power) {
            this._power = value;
            defined(this.onChangeCallback) && (this.onChangeCallback(this.index));
        }
    }

    /**
     * 圆环扩散呼吸因子，值越大，扩散速度越快；（此外，场景帧率与扩散速度成正比）
     * @property {Number} value
     * @default 1
     */
    get breathFactor() {
        return this._breathFactor;
    }
    set breathFactor(value) {
        Check.typeOf.number("value", value);
        value = Math.max(value, 1.0);
        if (value !== this._breathFactor) {
            this._breathFactor = value;
            defined(this.onChangeCallback) && (this.onChangeCallback(this.index));
        }
    }

}

export default DynamicCircle;