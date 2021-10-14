import DeveloperError from 'cesium/Core/DeveloperError';
import Check from 'cesium/Core/Check';
import ClockRange from 'cesium/Core/ClockRange';
import JulianDate from 'cesium/Core/JulianDate';
import destroyObject from 'cesium/Core/destroyObject';
import defined from 'cesium/Core/defined';

import ShadowMode from 'cesium/Scene/ShadowMode';
import Cesium3DTileset from 'cesium/Scene/Cesium3DTileset';
import PrimitiveCollection from 'cesium/Scene/PrimitiveCollection';

import { GeoDepository } from '../core/GeoDepository';


class SunshineSimulation {
    /**
     * 日照模拟,对3DTiles模型开启日照阴影模拟效果，可实现一天内日升日落（斗转星移）效果
     * @alias SunshineSimulation
     * @constructor
     * 
     * @param {Object} options
     * @param {JulianDate} [options.startTime=BOSGeo.JulianDate.fromIso8601('2021-08-03T08:30:00')] （日照分析）开始时刻,时钟运行模式为无边界模式UNBOUNDED时无效
     * @param {JulianDate} [options.stopTime=BOSGeo.JulianDate.fromIso8601('2021-08-03T17:30:00')] （日照分析）终止时刻,时钟运行模式为无边界模式UNBOUNDED时无效
     * @param {Number} [options.multiplier=360] 时间流逝倍数, 最小值为0
     * @param {ClockRange} [options.clockRange=BOSGeo.ClockRange.LOOP_STOP] 播放（时钟运行）模式（循环播放LOOP_STOP、顺序播放CLAMPED、无边界模式UNBOUNDED）
     * @param {Boolean} [options.softShadows=false]  是否使用软阴影
     * @param {ShadowMode} [options.shadowMode=ShadowMode.CAST_ONLY] Cesium3DTileset的阴影模式，开启(ENABLED)/关闭(DISABLED)投射并接收阴影模式, 只投射阴影模式(CAST_ONLY)，只接收阴影模式(RECEIVE_ONLY)
     * @param {Boolean} [options.isPlaying=false] 是否播放
     * @param {Boolean} [options.enableLighting=false] 是否开启全球光照
     * 
     * @example
     * var sunshineSimulation = new BOSGeo.SunshineSimulation({
     *   startTime: BOSGeo.JulianDate.fromIso8601('2021-08-03T08:30:00'),
     *   stopTime: BOSGeo.JulianDate.fromIso8601('2021-08-03T17:30:00'),
     * });
     * sunshineSimulation.start();
     */
    constructor(options = {}) {
        const {
            startTime = JulianDate.fromIso8601('2021-08-03T08:30:00'),
            stopTime = JulianDate.fromIso8601('2021-08-03T17:30:00'),
            multiplier = 360,
            clockRange = ClockRange.LOOP_STOP,
            softShadows = false,
            shadowMode = ShadowMode.CAST_ONLY,
            isPlaying = false,
            enableLighting = false,
        } = options;

        if (!(startTime instanceof JulianDate)) {
            throw new DeveloperError('options.startTime未定义或类型不对!');
        }

        if (!(startTime instanceof JulianDate)) {
            throw new DeveloperError('options.stopTime未定义或类型不对!');
        }

        if (JulianDate.lessThan(stopTime, startTime)) {
            throw new DeveloperError('Invalid operation, startTime must be less than the stopTime!');
        }

        const { viewer, geomap, scene } = GeoDepository;
        this.viewer = viewer;
        this.scene = scene;
        this._clock = viewer.clock;
        this.geomap = geomap;

        // 记录初始值
        const { clock, shadowMap, shadows } = viewer;
        this._initClockSetting = {
            startTime: clock.startTime,
            stopTime: clock.stopTime,
            currentTime: clock.currentTime,
            multiplier: clock.multiplier,
            clockStep: clock.clockStep,
            clockRange: clock.clockRange,
            canAnimate: clock.canAnimate,
            shouldAnimate: clock.shouldAnimate
        };
        this._initShadowMapSetting = {
            softShadows: shadowMap.softShadows
        };
        this._initShadowState = shadows;
        this._requestRenderMode = geomap.requestRenderMode; // 保存最初的实时渲染参数值
        this._initEnableLighting = scene.globe.enableLighting;
        geomap.requestRenderMode = false;

        this._startTime = startTime;
        this._stopTime = stopTime;
        this._multiplier = Math.max(0, multiplier);
        this._clockRange = clockRange;
        this._softShadows = softShadows;
        this._shadowMode = shadowMode;
        scene.globe.enableLighting = enableLighting;

        this._layers = getCesium3DTiles(viewer.scene.primitives);
        this._layerShadowStates = this._layers.map((layer) => {
            const initShadows = layer.shadows;
            layer.shadows = this._shadowMode;
            return initShadows;
        })

        this._clock.shouldAnimate = isPlaying;
        isPlaying && this.start();
    }

    /**
     * Cesium3DTileset的阴影模式，开启(ENABLED)/关闭(DISABLED)投射并接收阴影模式, 只投射阴影模式(CAST_ONLY)，只接收阴影模式(RECEIVE_ONLY)
     * @property {ShadowMode} shadowMode
     * @default ShadowMode.CAST_ONLY
     */
    get shadowMode() {
        return this._shadowMode;
    }
    set shadowMode(value) {
        if (value !== this._shadowMode) {
            this._shadowMode = value;
            this._layers.forEach((layer) => {
                layer.shadows = value;
            });
        }
    }

    /**
     * 是否开启全球光照
     * @property {Boolean} enableLighting
     * @default false
     */
    get enableLighting() {
        return this.scene.globe.enableLighting;
    }
    set enableLighting(value) {
        this.scene.globe.enableLighting = value;
    }

    /**
     * 参与日照模拟的Cesium3DTileset图层集合
     * @property {Array.<Cesium3DTileset>}
     * @default `场景中所有的Cesium3DTileset`
     */
    get layers() {
        return this._layers;
    }
    set layers(value) {
        if (value && value.length > 0); {
            this._resetTilesetShadows();
            value.forEach((item) => {
                if (item instanceof Cesium3DTileset) {
                    this._layers.push(item);
                    const initShadows = item.shadows;
                    this._layerShadowStates.push(initShadows);
                    item.shadows = this._shadowMode;
                }
            })
        }
    }

    /**
     * 还原tileset的阴影参数
     * @private
     */
    _resetTilesetShadows() {
        for (let i = 0, num = this._layers.length; i < num; i++) {
            this._layers[i].shadows = this._layerShadowStates[i];
        }
        this._layers = [];
        this._layerShadowStates = [];
    }

    /**
     * 日照模拟起始时刻,时钟运行模式为无边界模式UNBOUNDED时无效
     * @property {JulianDate} startTime
     * @default BOSGeo.JulianDate.fromIso8601('2021-08-03T08:30:00')
     */
    get startTime() {
        return this._startTime;
    }
    set startTime(value) {
        if (value instanceof JulianDate && JulianDate.greaterThan(this.stopTime, value)) {
            this._startTime = value;
            this._clock.startTime = value;
        } else {
            console.warn('SunshineSimulation.startTime：startTime must be less than the stopTime! ');
        }
    }

    /**
     * 日照模拟终止时刻,时钟运行模式为无边界模式UNBOUNDED时无效
     * @property {JulianDate} stopTime
     * @default BOSGeo.JulianDate.fromIso8601('2021-08-03T17:30:00')
     */
    get stopTime() {
        return this._stopTime;
    }
    set stopTime(value) {
        if (value instanceof JulianDate && JulianDate.lessThan(this.startTime, value)) {
            this._stopTime = value;
            this._clock.stopTime = value;
        } else {
            console.warn('SunshineSimulation.stopTime：stopTime must be greater than the startTime! ');
        }
    }

    /**
     * 时刻进度（相较于初始时刻和终止时刻，无边界末实现，初始时刻为00:00,终止时刻为24:00），范围区间为[0, 1]
     * @property {Number} timeRatio 
     * @default 0
     */
    get timeRatio() {
        if (!defined(this._clock)) return 0;
        let secondNumber, secondDiff;
        if (this._clock.clockRange !== ClockRange.UNBOUNDED) {
            secondNumber = JulianDate.secondsDifference(this._stopTime, this._startTime);
            secondDiff = JulianDate.secondsDifference(this._clock.currentTime, this._startTime);     
        } else {
            // 无边界模式会从当前时刻开始不断往后运行
            secondNumber = 24 * 3600;
            const startTime = JulianDate.fromIso8601(
                JulianDate.toIso8601(this._clock.currentTime).split('T')[0] + 'T00:00:00'
            ); 
            secondDiff = JulianDate.secondsDifference(this._clock.currentTime, startTime);
        }
        let timeRatio = secondDiff / secondNumber;
        if (secondDiff > secondNumber) {
            timeRatio = timeRatio - Math.floor(timeRatio);
        }
        return timeRatio;
    }
    set timeRatio(value) {
        if (!defined(this._clock)) return;
        Check.typeOf.number('value', value);
        if (this._clock.clockRange !== ClockRange.UNBOUNDED) { 
            const secondNumber = JulianDate.secondsDifference(this._stopTime, this._startTime);
            const secondDiff = secondNumber * value;
            this._clock.currentTime = JulianDate.addSeconds(this._startTime, secondDiff, new JulianDate());
        } else {
            // 无边界模式会从当前时刻开始不断往后运行
            const startTime = JulianDate.fromIso8601(
                JulianDate.toIso8601(this._clock.currentTime).split('T')[0] + 'T00:00:00'
            ); 
            this._clock.currentTime = JulianDate.addSeconds(startTime, 24 * 3600 * value, new JulianDate());
        }
    }

    /**
     * 时间流逝倍数
     * @property {Boolean} multiplier
     * @default 360
     */
    get multiplier() {
        return this._multiplier;
    }
    set multiplier(value) {
        Check.typeOf.number('value', value);
        if (value >= 0 && value !== this._multiplier) {
            this._multiplier = value;
            this._clock.multiplier = value;
        }
    }

    /**
     * 播放（时钟运行）模式（循环播放LOOP_STOP、顺序播放CLAMPED、无边界模式UNBOUNDED）
     * @property {ClockRange} clockRange
     * @default ClockRange.LOOP_STOP
     */
    get clockRange() {
        return this._clockRange;
    }
    set clockRange(value) {
        Check.typeOf.number('value', value);
        if (value !== this._clockRange) {
            this._clockRange = value;
            this._clock.clockRange = value;
        }
    }

    /**
     * 是否开启软阴影
     * @property {Boolean} softShadows
     * @default false
     */
    get softShadows() {
        return this._softShadows;
    }
    set softShadows(value) {
        Check.typeOf.bool('value', value);
        this._softShadows = value;
        this.viewer.shadowMap.softShadows = value;
    }

    /**
     * 是否播放
     * @property {Boolean} isPlaying
     * @default false
     */
    get isPlaying() {
        return this._clock.shouldAnimate;
    }
    set isPlaying(value) {
        Check.typeOf.bool('value', value);
        this._clock.shouldAnimate = value;
    }

    /**
     * 对阴影相关设置初始化
     * @private
     */
    _initSetting() {
        const { _startTime, _stopTime, _multiplier, _clockRange, _softShadows } = this;
        this._clock.startTime = _startTime;
        this._clock.stopTime = _stopTime;
        this._clock.multiplier = _multiplier;
        this._clock.clockRange = _clockRange;
        this.viewer.shadowMap.softShadows = _softShadows;
        this.viewer.shadows = true;
        this._hasInitialized = true;
    }

    /**
     * 播放,从起始时刻开始播放
     */
    start() {
        !this._hasInitialized && this._initSetting();
        this._clock.shouldAnimate = true;
        this._clock.currentTime = this.startTime;
    }

    /**
     * 销毁
     * @returns {undefined}
     */
    destroy() {
        // 默认设置还原
        // viewer.clock为readonly,不能直接clone
        const { clockRange, currentTime, multiplier, shouldAnimate, startTime, stopTime } = this._initClockSetting;
        this._clock.shouldAnimate = shouldAnimate;
        this._clock.currentTime = currentTime;
        this._clock.startTime = startTime;
        this._clock.stopTime = stopTime;
        this._clock.multiplier = multiplier;
        this._clock.clockRange = clockRange;
        this.scene.globe.enableLighting = this._initEnableLighting;

        this.viewer.shadowMap.softShadows = this._initShadowMapSetting.softShadows;
        this.viewer.shadows = this._initShadowState;

        this._resetTilesetShadows();

        this.geomap.requestRenderMode = this._requestRenderMode;
        this.geomap.render();
        return destroyObject(this);
    }
}

/**
 * 获取图元集合中的所有Cesium3DTileset对象
 * 
 * @private
 * 
 * @param {PrimitiveCollection} primitiveCollection 
 * @param {Array.<Cesium3DTileset>} [list=[]] 
 * @returns {Array.<Cesium3DTileset>}
 */
function getCesium3DTiles(primitiveCollection, list = []) {
    primitiveCollection._primitives.forEach(primitive => {
        if (primitive instanceof Cesium3DTileset) {
            list.push(primitive);
        } else if (primitive instanceof PrimitiveCollection) {
            list = getCesium3DTiles(primitive, list)
        }
    });
    return list;
}

export default SunshineSimulation;