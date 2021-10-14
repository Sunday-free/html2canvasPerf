import DeveloperError from 'cesium/Core/DeveloperError';
import Check from 'cesium/Core/Check';
import JulianDate from 'cesium/Core/JulianDate';
import destroyObject from 'cesium/Core/destroyObject';
import defined from 'cesium/Core/defined';
import Cartesian3 from 'cesium/Core/Cartesian3';
import defaultValue from "cesium/Core/defaultValue";

import { GeoDepository } from '../core/GeoDepository';
import GeoUtil from '../utils/GeoUtil';

import ColorGradient from '../utils/ColorGradient';
import ShadowAnalysis from './sunshineAnalysis/ShadowAnalysis';

class SunshineAnalysis {
    /**
     * 日照时长分析 （对指定区域内的日照时长进行采样计算并可视化）
     * @alias SunshineAnalysis
     * @constructor
     * 
     * @param {Object} options 
     * @param {Array.<Cartesain3>} [options.region=[]] 指定分析区域的顶点坐标集
     * @param {JulianDate} [options.startTime=BOSGeo.JulianDate.fromIso8601('2021-12-22T08:00:00')] 日照时长开始统计的时刻
     * @param {JulianDate} [options.stopTime=BOSGeo.JulianDate.fromIso8601('2021-12-22T18:00:00')] 日照时长终止统计的时刻
     * @param {Number} [options.timeIntervals=5] 采样时间间隔，单位为分钟，最小有效值为1
     * @param {Number} [options.spacingIntervals=10] 采样距离间隔，单位为米，最小有效值为1
     * @param {Number} [options.bottomHeight=10] 采样区域底部高程，单位为米
     * @param {Number} [options.extrudedHeight=0] 采样区域拉伸高度，单位为米，最小值为0
     * @param {ColorGradient} [options.colorGradient] 颜色渐变梯度
     * 
     * @example
     * var sunshineAnalysis = new BOSGeo.SunshineAnalysis({
     *   timeIntervals: 60,
     *   bottomHeight: 10,
     * });
     * 
     * @notes 目前一个场景中仅支持一个日照时长分析，多次创建只会保留最新创建的实例对象
     * 
     */
    constructor(options) {
        if (!defined(options)) {
            throw new DeveloperError('options未定义!');
        }

        const {
            region = [],
            startTime = JulianDate.fromIso8601('2021-12-22T08:00:00'),
            stopTime = JulianDate.fromIso8601('2021-12-22T18:00:00'),
            timeIntervals = 5,
            spacingIntervals = 10,
            bottomHeight = 10,
            extrudedHeight = 0,
            colorGradient
        } = options;


        if (!(startTime instanceof JulianDate)) {
            throw new DeveloperError('SunshineAnalysis.constructor: options.startTime类型不对!');
        }

        if (!(stopTime instanceof JulianDate)) {
            throw new DeveloperError('SunshineAnalysis.constructor: options.stopTime类型不对!');
        }

        if (JulianDate.lessThan(stopTime, startTime)) {
            throw new DeveloperError('SunshineAnalysis.constructor: Invalid value, startTime must be less than the stopTime!');
        }

        if (extrudedHeight < 0) {
            throw new DeveloperError('SunshineAnalysis.constructor: Invalid value, extrudedHeight must be no less than zero!');
        }

        this.scene = GeoDepository.scene;
        this.geomap = GeoDepository.geomap;

        this._requestRenderMode = this.geomap.requestRenderMode; // 保存最初的实时渲染参数值
        this.geomap.requestRenderMode = false;

        this._region = region;
        this._bottomHeight = bottomHeight;
        this._extrudedHeight = extrudedHeight;
        this._startTime = startTime;
        this._stopTime = stopTime;
        this._timeIntervals = timeIntervals;
        this._spacingIntervals = spacingIntervals;
        this._bottomHeight = bottomHeight;
        this._extrudedHeight = extrudedHeight;

        this._shadowAnalysis = new ShadowAnalysis({
            startTime,
            stopTime,
            timeIntervals,
            spacingIntervals,
            colorGradient
        });

    }

    /**
     * 日照时长开始统计的时刻
     * @property {JulianDate} startTime
     * @default BOSGeo.JulianDate.fromIso8601('2021-12-22T08:00:00')
     */
    get startTime() {
        return this._startTime;
    }
    set startTime(value) {
        if (!(value instanceof JulianDate)) throw new DeveloperError('BOSGeo.SunshineAnalysis.startTime: 类型不对!');
        if (JulianDate.lessThan(this._stopTime, value)) throw new DeveloperError('BOSGeo.SunshineAnalysis.startTime: startTime must be less than the stopTime!');

        this._startTime = value;
        this._shadowAnalysis.startTime = value;
    }

    /**
     * 日照时长终止统计的时刻
     * @property {JulianDate} stopTime
     * @default BOSGeo.JulianDate.fromIso8601('2021-12-22T18:00:00')
     */
    get stopTime() {
        return this._stopTime;
    }
    set stopTime(value) {
        if (!(value instanceof JulianDate)) throw new DeveloperError('BOSGeo.SunshineAnalysis.stopTime: 类型不对!');
        if (JulianDate.lessThan(value, this._startTime)) throw new DeveloperError('BOSGeo.SunshineAnalysis.stopTime: startTime must be less than the stopTime!');

        this._stopTime = value;
        this._shadowAnalysis.stopTime = value;
    }

    /**
     * 采样时间间隔，单位为分钟，最小有效值为1
     * @property {Number} timeIntervals
     * @default 5
     */
    get timeIntervals() {
        return this._timeIntervals;
    }
    set timeIntervals(value) {
        Check.typeOf.number('value', value);
        if (value < 1) throw new DeveloperError('SunshineAnalysis.timeIntervals: Invalid value, timeIntervals must be no less than 1!');
        this._timeIntervals = value;
        this._shadowAnalysis.timeIntervals = value;
    }

    /**
     * 采样距离间隔，单位为米，最小有效值为1
     * @property {Number} spacingIntervals
     * @default 10
     */
    get spacingIntervals() {
        return this._spacingIntervals;
    }
    set spacingIntervals(value) {
        Check.typeOf.number('value', value);
        if (value < 1) throw new DeveloperError('SunshineAnalysis.spacingIntervals: Invalid value, spacingIntervals must be no less than 1!');
        this._spacingIntervals = value;
        this._shadowAnalysis.spacingIntervals = value;
    }

    /**
     * 采样区域底部高程，单位为米
     * @property {Number} bottomHeight
     * @default 10
     */
    get bottomHeight() {
        return this._bottomHeight;
    }
    set bottomHeight(value) {
        Check.typeOf.number('value', value);
        if (this._bottomHeight !== value) {
            this._bottomHeight = value;
            this.start();
        }
    }

    /**
     * 采样区域拉伸高度，单位为米，最小值为0
     * @property {Number} extrudedHeight
     * @default 0
     */
    get extrudedHeight() {
        return this._extrudedHeight;
    }
    set extrudedHeight(value) {
        Check.typeOf.number('value', value);
        if (value < 0) throw new DeveloperError('SunshineAnalysis.extrudedHeight: Invalid value, extrudedHeight must be no less than zero!');

        if (this._extrudedHeight !== value) {
            this._extrudedHeight = value;
            this.start();
        } 
    }

    /**
     * 是否显示（日照时长采样点）
     * @property {Boolean} show
     * @default true 
     */
    get show () {
        return this._shadowAnalysis.show;
    } 
    set show (value) {
        Check.typeOf.bool('value', value);
        this._shadowAnalysis.show = value;
    }

    /**
     * （时长归一化后映射的）颜色梯度
     * @property {ColorGradient} colorGradient
     */
    get colorGradient() {
        return this._shadowAnalysis.colorGradient;
    }
    set colorGradient(value) {
        this._shadowAnalysis.colorGradient = value;
    }

    /**
     * 开始日照时长分析
     * 
     * @param {Object} options
     * @param {Array.<Cartesian3>} [options.region] 指定分析区域的顶点坐标集
     * @param {Number} [options.bottomHeight] 指定分析区域的底部高程
     * @param {Number} [options.extrudedHeight] 指定分析区域的拉伸高度 
     * 
     * @example
     * var drawHandler = new BOSGeo.DrawHandler(geoViewer);
     * drawHandler.drawPolygonPrimitive({
     *   name: '',
     *   alpha: 0.5,
     *   isGround: true
     *   }, (res) => {
     *      if (res && res.positions) {
     *          sunshineAnalysis.start({
     *              region: res.positions,
     *          });
     *      }
     * });
     */
    start(options = {}) {
        const region = defaultValue(options.region, this._region);
        const bottomHeight = defaultValue(options.bottomHeight, this._bottomHeight);
        const extrudedHeight = defaultValue(options.extrudedHeight, this._extrudedHeight);

        if (!defined(region) || region.length < 3 || !(region[0] instanceof Cartesian3)) {
            console.warn('SunshineAnalysis.start: options.region未定义/类型不对/范围点个数不足3，无法进行时长分析!');
            return;
        }

        const pointsInDegrees = [];
        this._region = [];
        region.forEach((cartesian) => {
            const degrees = GeoUtil.cartesianToArray(cartesian);
            pointsInDegrees.push(degrees[0], degrees[1]);
            this._region.push(cartesian);
        });
        this._bottomHeight = bottomHeight;
        this._extrudedHeight = extrudedHeight;

        this._shadowAnalysis.start({
            qureyRegion: pointsInDegrees,
            bottomHeight,
            extrudedHeight
        });
    }

    /**
     * 查询日照时长率
     * @param {Cartesian3} cartesian 采样点坐标
     * @param {Number} [ratioAccuracy=3] 时长率的精确度
     * @returns {Object} { ratio: Number, time: Number } : ratio: 时长率, time: 光照时长/分钟
     * 
     * @example
     * geoViewer.on(BOSGeo.MapEventType.LEFT_CLICK, (e) => {
     *      const { ratio, time} = sunshineAnalysis.querySunshineRatio(e.world_position);
     *      console.log(`日照时长率：${ratio}，日照时长：${time} 分钟！`);
     * }, [BOSGeo.MapPickType.WORLD_POSITION])
     */
    querySunshineRatio(cartesian, ratioAccuracy = 3) {
        let ratio = 0;
        let time = 0;
        if (this._shadowAnalysis && cartesian instanceof Cartesian3) {
            ratio = this._shadowAnalysis.getShadowRadio(cartesian);
            if (ratio > 0) {
                const { _startTime, _stopTime, _timeIntervals } = this;
                time = JulianDate.secondsDifference(_stopTime, _startTime) / 60 * parseFloat(ratio);
                time = Math.floor(time);
                // time = Math.floor((time * _timeIntervals) / _timeIntervals); // 有效精度，只能是以采样区间为最小粒度
            }
            ratio = ratio.toFixed(ratioAccuracy);
        }
        return {
            ratio,
            time
        };
    }

    /**
     * 销毁
     * 
     * @returns {undefined}
     */
    destroy() {
        this.scene.primitives.remove(this._points);
        this.geomap.requestRenderMode = this._requestRenderMode; // 还原初始值
        return destroyObject(this);
    }
}

export default SunshineAnalysis;