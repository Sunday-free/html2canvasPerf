import defined from 'cesium/Core/defined';
import Cartesian3 from 'cesium/Core/Cartesian3'
import Matrix4 from "../../../cesium/Source/Core/Matrix4";
import SceneMode  from 'cesium/Scene/SceneMode.js';
import  Transforms  from"cesium/Core/Transforms";
import JulianDate  from "cesium/Core/JulianDate";
import Clock from "cesium/Core/Clock.js";
import {GeoDepository} from "../core/GeoDepository";
import Util from "../utils/Util";

/**
 * 地球自转
 * @alias EarthRotation
 *
 * @param {Object}  options 设置时钟的参数，如自转开始的时间，自转的速度等
 * @param {Number} [options.spinRate=0.1]    可选，地球自转速度,旋转相机，产生自转的效果，默认为0.1。
 * @param {Number} [options.multiplier=1]  可选，viewer.clock 转的速度，默认为1。
 * @example
 let eR = new BOSGeo.EarthRotation({
    spinRate:100,
    multiplier:1,
})
 *
 */

class EarthRotation{
    constructor(options){
        this.options={
            multiplier:options.multiplier||1,
            spinRate:options.spinRate||0.1
        }
        this.viewer=GeoDepository.viewer
        // GeoDepository.viewer.scene.globe.enableLighting = true;//启用以太阳为光源的地球
        //如果设置为true，则会在场景更新时渲染，否则实时渲染每帧
        this.viewer.scene.requestRenderMode=false;
        GeoDepository.geomap.requestRenderModeMethods.push('EarthRotation');
        this.viewer.clock.shouldAnimate=true

        var previousTime = this.viewer.clock.currentTime.secondsOfDay;

        //旋转相机，产生自转的效果
        this.onTickCallback = () => {
            var spinRate = this.options.spinRate;
            var currentTime = this.viewer.clock.currentTime.secondsOfDay;
            var delta = (currentTime - previousTime) / 1000;
            previousTime = currentTime;
            this.viewer.scene.camera.rotate(Cartesian3.UNIT_Z, spinRate * delta);
        }
        // 开启地图自转效果
        // this.viewer.clock.onTick.addEventListener(onTickCallback);
        this.start()
    }

    /**
     * 地球自转  旋转相机，产生自转的效果，该方法中camera.lookAtTransform会导致camera控制产生偏差
     * @private
     * @ignore
     */
    icrf() {
        if (!GeoDepository.viewer || GeoDepository.viewer.scene.mode !== SceneMode.SCENE3D) {
            return;
        }
        const icrfToFixed = Transforms.computeIcrfToFixedMatrix(
            GeoDepository.viewer.clock.currentTime
        );

        if (defined(icrfToFixed)) {
            const camera = GeoDepository.viewer.camera;
            const offset = Cartesian3.clone(camera.position);
            const transform = Matrix4.fromRotationTranslation(icrfToFixed);
            camera.lookAtTransform(transform, offset);
        }
    }

    // onTickCallback(){
    //     let previousTime=GeoDepository.viewer.clock.currentTime.secondsOfDay-1;
    //     // var ipreviousTime=previousTime
    //     var spinRate = 1;
    //     var currentTime = GeoDepository.viewer.clock.currentTime.secondsOfDay;
    //     var delta = (currentTime - previousTime) / 1000;
    //     previousTime = currentTime;
    //     GeoDepository.viewer.scene.camera.rotate(Cartesian3.UNIT_Z, -spinRate * delta);
    // }


    /**
     * 开始自转
     * @example
     * eR.start()
     */
    start() {
        let option=this.options //{multiplier:1}
        // let previousTime1=this.viewer.clock.currentTime.secondsOfDay;
        GeoDepository.viewer.scene.postUpdate.addEventListener(this.onTickCallback);
        if(GeoDepository.viewer.clock){
            const keys=Object.keys(option)
            for(let k of keys){
                GeoDepository.viewer.clock[k]=option[k]

            }
        }
    }

    /**
     * 停止自转
     * @example
     * eR.stop()
     */
    stop () {
        if(!GeoDepository.viewer){
            return
        }
        GeoDepository.viewer.clock.multiplier=1
        GeoDepository.viewer.scene.postUpdate.removeEventListener(this.onTickCallback);
        // viewer = undefined
    }

    /**
     * 移除
     */
    remove(){
        Util.removeFromArray(GeoDepository.geomap.requestRenderModeMethods, 'EarthRotation');//移除调用实时渲染的方法
        GeoDepository.geomap._requestRenderModeCheck();
        this.stop ();
    }
}

export default EarthRotation;