
import defaultValue from 'cesium/Core/defaultValue'
import defined from "cesium/Core/defined";
import Ray from 'cesium/Core/Ray'
import Cartesian3 from 'cesium/Core/Cartesian3'
import IntersectionTests from 'cesium/Core/IntersectionTests'
import {GeoDepository} from '../core/GeoDepository'

/**
 * 地图放大缩小操作
 * @param {Object} [options] 配置选项
 * @param {Number} [options.max=22] 最大层级
 * @param {Number} [options.min=10] 最小层级
 * @param {Number} [options.amount=0.5] 缩放倍率
 * @param {Number} [options.duration=0.5] 时间
 * @example
 *  let zoom = new BOSGeo.Zoom(options);
 */
class Zoom {
    constructor(options) {
    options = defaultValue(options, {});
    this.maxLevel = defaultValue(options.max, 22);
    this.minLevel = defaultValue(options.min, 10);
    this.amount = defaultValue(options.amount, 0.5);
    this.duration = defaultValue(options.duration, 0.5);
    this._level = undefined;

    this.Ray = new Ray();
    }
}


/**
 * 获取相机焦点
 * @param {Boolean} inWorldCoordinates 是否返回世界坐标系的结果
 * @param {Cartesian3} [result] 点坐标
 * @returns {Cartesian3|*} 焦点
 * @example
 *  let zoom = new BOSGeo.Zoom(options);
 *  let res = zoom.getCameraFocus(inWorldCoordinates, result);
 */
Zoom.prototype.getCameraFocus = function (inWorldCoordinates, result) {
    result = result ? result : new Cartesian3();

    this.Ray.origin = GeoDepository.camera.positionWC;
    this.Ray.direction = GeoDepository.camera.directionWC;
    result = GeoDepository.scene.globe.pick(this.Ray, GeoDepository.scene, result);

    if (!result) return;

    result = inWorldCoordinates ? result : GeoDepository.camera.worldToCameraCoordinatesPoint(result, result);

    return result
}
/**
 * 缩放动作
 * @param {Number} amount 缩放倍率
 * @param {Boolean} [isZoomIn] 是否放大
 * @param {Number} duration 持续时间
 * @example
 *  let zoom = new BOSGeo.Zoom(options);
 *  zoom.zoomTo(inWorldCoordinates, result);
 */
Zoom.prototype.zoomTo = function (amount, isZoomIn, duration) {
    let camera = GeoDepository.camera;
    let focus = this.getCameraFocus();
    let orientation = undefined;

    if (!focus) {
        let ray = new Ray(
            camera.worldToCameraCoordinatesPoint(camera.positionWC),
            camera.directionWC
        );
        focus = IntersectionTests.grazingAltitudeLocation(ray, viewer.scene.globe.ellipsoid);
        orientation = {
            heading: camera.heading,
            pitch: camera.pitch,
            roll: camera.roll
        };
    } else {
        orientation = {
            direction: camera.direction,
            up: camera.up
        };
    }

    let direction = Cartesian3.subtract(camera.position, focus, new Cartesian3());
    let movementVector, endPosition;
    if (isZoomIn) {
        movementVector = Cartesian3.multiplyByScalar(direction, 1 - amount, direction);
        endPosition = Cartesian3.add(focus, movementVector, focus);
    } else {
        movementVector = Cartesian3.multiplyByScalar(direction, amount, direction);
        endPosition = Cartesian3.add(camera.position, movementVector, focus);
    }
    // let endPosition = isZoomIn ? Cartesian3.add(focus, movementVector, focus) : Cartesian3.add(camera.position, movementVector, focus);

    camera.flyTo({
        destination: endPosition,
        orientation: orientation,
        duration: duration,
    });
}
/**
 * 地图缩放等级限制
 * @param {Number} e 小于0为缩小，大于0为放大，不能为0
 * @example
 *  let zoom = new BOSGeo.Zoom(options);
 *  zoom.limitLevel(e);
 */
Zoom.prototype.limitLevel = function (e) {
    let level = this._level;
    if (defined(level)) return;
    GeoDepository.viewer.screenSpaceCameraController.enableZoom = !((level < this.minLevel && e < 0) || (level > this.maxLevel && e > 0));
}
/**
 * 监听地图缩放事件
 * @example
 *  let zoom = new BOSGeo.Zoom(options);
 *  zoom.onLevelChange();
 */
Zoom.prototype.onLevelChange = function () {
    let tilesToRender = GeoDepository.scene.globe._surface._tilesToRender;
    let level = tilesToRender.length === 0 ? undefined : tilesToRender[0]._level;
    
    if (!defined(level)) return;
    this._level = level;

    level = level < this.minLevel ? this.minLevel : level;
    level = level > this.maxLevel ? this.maxLevel : level
}
/**
 * 放大
 * @example
 *  let zoom = new BOSGeo.Zoom(options);
 *  zoom.zoomIn();
 */
Zoom.prototype.zoomIn = function () {
    let level = this._level;
    if (!defined(level)) return;

    if (level <= this.maxLevel) this.zoomTo(this.amount, true, this.duration);
}
/**
 * 缩小
 * @example
 *  let zoom = new BOSGeo.Zoom(options);
 *  zoom.zoomOut();
 */
Zoom.prototype.zoomOut = function () {
    let level = this._level;
    if(!defined(level)) return;

    if (level >= this.minLevel) this.zoomTo(this.amount, false, this.duration);
}

export {
    Zoom
}