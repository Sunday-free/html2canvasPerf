import defaultValue from 'cesium/Core/defaultValue'
import CesiumMath from 'cesium/Core/Math'
import Cartesian3 from 'cesium/Core/Cartesian3'
import JulianDate from 'cesium/Core/JulianDate'



/**
 * 相机环绕飞行。包括绕点飞行和自身环绕飞行
 * @class AroundFlight
 * @constructor
 * 
 * @param {Object} options 配置参数如下：
 * @param {Boolean} [options.isAroundPoint=true] 是否是绕点飞行；
 * @param {Number} [options.distance=600] 相机与点的距离，options.isAroundPoint为true时才有效；
 * @param {Number} [options.duration=120] 飞行时间；
 * @param {Number} [options.pitchAngle=-30] 俯仰角；
 * @param {Number} [options.angle=360] 旋转角度；
 * @param {GeoMap} geomap 三维场景对象。
 * 
 * @example
 * var aroundFlight = new AroundFlight({}, geomap);
 */
function AroundFlight(options, geomap) {
    options = defaultValue(options, {});
    this.viewer = geomap.viewer
    this._isAroundPoint = defaultValue(options.isAroundPoint, true);
    this._distance = defaultValue(options.distance, 600);
    this._duration = defaultValue(options.duration, 120);
    this._heading = 0;
    this._pitch = CesiumMath.toRadians(defaultValue(options.pitchAngle, -30));
    this._anglePerSec = defaultValue(options.angle, 360) / this._duration; // 每秒旋转角度

    this._position = undefined;
}

Object.defineProperties(AroundFlight.prototype, {
    /**
     * 是否绕点飞行
     * 
     * @memberof AroundFlight.prototype
     * @type {Boolean}
     */
    isAroundPoint: {
        get: function () {
            return this._isAroundPoint;
        },
        set: function (val) {
            this._isAroundPoint = val;
        }
    }
});

/**
 * tick事件绑定方法
 * @private
 */
AroundFlight.prototype._tick = function () {
    let deltaTime = JulianDate.secondsDifference(this.viewer.clock.currentTime, this.viewer.clock.startTime);
    this._heading = CesiumMath.toRadians(deltaTime * this._anglePerSec);
    this.viewer.camera.setView({
        destination: this._position,
        orientation: {
            heading: this._heading,
            pitch: this._pitch,
            roll: 0
        }
    });
    this._isAroundPoint && this.viewer.camera.moveBackward(this._distance);

    if (JulianDate.compare(this.viewer.clock.currentTime, this.viewer.clock.stopTime) >= 0) {
        this.viewer.clock.onTick.removeEventListener(this._tick, this);
        this.viewer.clock.shouldAnimate = false;
    }
};

let timeScratch = new JulianDate();

/**
 * 开始绕点飞行
 * 
 * @param {Array<Number>} position 绕点飞行的目标点，形如[lng, lat, height]，经纬度单位为度，高程为米
 * 
 */
AroundFlight.prototype.startAt = function (position) {
    // 避免切换飞行模型后产生的BUG
    this.stop();

    this._position = Cartesian3.fromDegrees(...position);

    let clock = this.viewer.clock;
    let startTime = JulianDate.now();
    let stopTime = JulianDate.addSeconds(startTime, this._duration, timeScratch);
    this.viewer.clock.startTime = startTime;
    clock.currentTime = startTime;
    clock.stopTime = stopTime;
    clock.shouldAnimate = true;
    clock.onTick.addEventListener(this._tick, this);
};

/**
 * 暂停飞行
 */
AroundFlight.prototype.pause = function () {
    this.viewer.clock.shouldAnimate = false;
};

/**
 * 继续飞行
 */
AroundFlight.prototype.continue = function () {
    this.viewer.clock.shouldAnimate = true;
};

/**
 * 终止飞行
 */
AroundFlight.prototype.stop = function () {
    this.viewer.clock.onTick.removeEventListener(this._tick, this);
    this.viewer.clock.shouldAnimate = false;
};

export default AroundFlight;