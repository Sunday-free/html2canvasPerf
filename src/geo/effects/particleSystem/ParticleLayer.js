
import createGuid from 'cesium/Core/createGuid'
import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import destroyObject from 'cesium/Core/destroyObject'
import Color from 'cesium/Core/Color'
import Cartesian2 from 'cesium/Core/Cartesian2'
import Cartesian3 from 'cesium/Core/Cartesian3'
import Matrix4 from 'cesium/Core/Matrix4'
import HeadingPitchRoll from 'cesium/Core/HeadingPitchRoll'
import Quaternion from 'cesium/Core/Quaternion'
import TranslationRotationScale from 'cesium/Core/TranslationRotationScale'
import DeveloperError from 'cesium/Core/DeveloperError'
import HeadingPitchRange  from"cesium/Core/HeadingPitchRange";

import ParticleSystem from 'cesium/Scene/ParticleSystem'
import ParticleBurst from 'cesium/Scene/ParticleBurst'
import CircleEmitter from 'cesium/Scene/CircleEmitter'
import BoxEmitter from 'cesium/Scene/BoxEmitter'
import ConeEmitter from 'cesium/Scene/ConeEmitter'
import SphereEmitter from 'cesium/Scene/SphereEmitter'
import buildModuleUrl from "cesium/Core/buildModuleUrl";

import Util from "../../utils/Util";
import GeoUtil from "../../utils/GeoUtil";
// import {BaseLayer} from "./BaseLayer";
import Layer from "../../Layer/Layer";
import when from 'cesium/ThirdParty/when'
import {GeoDepository} from "../../core/GeoDepository";
import FeatureType from "../../constant/FeatureType";


/**
 * 粒子系统图层
 * @alias ParticleLayer
 *
 * @param {Object} options 包含以下参数的对象
 * @param {String} [options.image] 可选，粒子图片，火、喷泉、烟雾等图片，如果设置，则使用此值覆盖particleType输入。
 * @param {String} [options.particleType='fire'] 可选，当image为空时，设置默认常用类型的粒子图片，火：'fire'、喷泉：'fountain'、烟雾：'smoke'等类型，默认为'fire'。
 * @param {String} [options.emitterType='circle'] 可选，扩散类型 圆形 circle、 盒子 box 、球形 sphere、  锥 cone，默认为'circle'。
 * @param {Number} [options.emissionRate=5] 可选， 每秒要发射的粒子数,默认为5。
 * @param {Number} [options.particleLife] 可选，如果设置，则使用此值覆盖minimumParticleLife和maximumParticleLife输入。
 * @param {Number} [options.minimumParticleLife=1] 可选，设置以秒为单位的粒子生命的可能持续时间的最小范围，在该时间范围内可以随机选择粒子的实际生命,默认为1。
 * @param {Number} [options.maxinumParticleLife=1] 可选，设置粒子寿命的可能持续时间的最大限制（以秒为单位），在该范围内将随机选择粒子的实际寿命,默认为1。
 * @param {Number} [options.speed] 可选，如果设置，则用该值覆盖minimumSpeed和maximumSpeed输入。
 * @param {Number} [options.minimumSpeed=1] 可选，设置以米/秒为单位的最小界限，高于该界限时，将随机选择粒子的实际速度,默认为1。
 * @param {Number} [options.maximumSpeed=1] 可选，设置以米/秒为单位的最大范围，在该范围内将随机选择粒子的实际速度,默认为4。
 * @param {Number} [options.scale] 可选，设置缩放比例，以在粒子的生命周期内应用于粒子的图像，如果设置，则用该值覆盖startScale和endScale输入。
 * @param {Number} [options.startScale=1] 可选，在粒子寿命开始时应用于粒子图像的初始比例,默认为1。
 * @param {Number} [options.endScale=5.0] 可选，在粒子寿命结束时应用于粒子图像的最终比例,默认为5。
 * @param {Array} [options.imageSize] 可选，如果设置，则将覆盖用来缩放粒子图像尺寸（以像素为单位）的minimumImageSize和maximumImageSize输入。
 * @param {Array} [options.minimumImageSize=[2.0, 2.0]] 可选，设置宽度的最小范围，以高度为单位，在该范围之上可以随机缩放粒子图像的尺寸（以像素为单位），默认为[2.0, 2.0]。
 * @param {Array} [options.maximumImageSize=[10.0, 10.0]] 可选，设置最大宽度宽度（以高度为单位），在该范围内可以随机缩放粒子图像的尺寸（以像素为单位），默认为[10.0, 10.0]。
 * @param {Number} [options.lifetime=16] 可选，粒子系统发射粒子的时间（以秒为单位）,默认为16。
 * @param {Boolean} [options.sizeInMeters] 可选，options.sizeInMeters 设置粒子的大小是米还是像素。 true 以米为单位调整粒子大小；否则，大小以像素为单位。
 * @param {Boolean} [options.show=true] 可选， 是否显示粒子系统，true 为显示，false为隐藏，默认为true。
 * @param {Boolean} [options.loop=true] 可选， 粒子系统完成后是否应该循环爆发，true 为显示，false为隐藏，默认为true。
 * @param {String} [options.color] 可选，设置粒子在其粒子寿命期间的颜色。
 * @param {String} [options.startColor='#FFFFFF'] 可选，粒子在其生命初期的颜色，默认为'#FFFFFF'。
 * @param {String} [options.endColor='#FFFFFF'] 可选，粒子寿命结束时的颜色，默认为'#FFFFFF'。
 * @param {Number} [options.startOpacity=1] 可选，粒子在其生命初期的颜色的不透明度，默认为1。
 * @param {Number} [options.endOpacity=0.9] 可选，粒子寿命结束时的颜色的不透明度，默认为0.9。
 * @param {Number} [options.gravity=2] 可选，粒子的重力加速度，默认为2。
 * @example
 let particle = new BOSGeo.ParticleLayer({
    // image: 'resource/images/effect/fire.png',
    particleType:'fire',
    emitterType: 'circle', // 扩散类型 圆形 circle 盒子 box 球形 sphere cone
    gravity: 0.0,
    emissionRate: 200.0,
    // imageSize: [15,15],
    minimumParticleLife: 1.5,
    maximumParticleLife: 1.8,
    minimumSpeed : 7.0,
    maximumSpeed : 9.0,
    startScale: 3,
    endScale: 1.5,

    lifetime: 5,
    startOpacity: 0.8,
    endOpacity: 0.3,
    startColor: '#b02b1a',
    endColor: '#000000'
    });
 particle.modelMatrix = BOSGeo.GeoUtil.computeModelMatrix(113.10635, 23.02892, 17.06, 0, 0, 0);
 */

class ParticleLayer extends Layer{ //
    constructor(options) {
        super(options)
        options = options || {};
        // if (!defined(options.image)) throw new DeveloperError('image url is required!');
        let image
        // buildModuleUrl加载CESIUM_BASE_URL路径静态资源
        if(options.particleType=='fire'){
            image='./resource/images/effect/fire.png'
        } else if(options.particleType=='fountain'){
            image='./resource/images/effect/fountain.png'
        }else if(options.particleType=='smoke'){
            image='./resource/images/effect/smoke.png'
        }else{
            image='./resource/images/effect/fire.png'
        }

        this.image = options.image||buildModuleUrl(image)

        this.emitterType = options.emitterType || 'circle';// 扩散类型 圆形 circle 盒子 box 球形 sphere cone
        this.emissionRate = options.emissionRate  || 5.0;
        this.particleLife=options.particleLife //||5.0;
        this.minimumParticleLife = options.minimumParticleLife || 1.0;
        this.maxinumParticleLife = options.maxinumParticleLife || 1.0;
        this.speed=options.speed //||1;
        this.minimumSpeed = options.minimumSpeed || 1.0;
        this.maximumSpeed = options.maximumSpeed || 4.0;
        this.scale=options.scale //||1;
        this.startScale = options.startScale || 1.0;
        this.endScale = options.endScale || 5.0;
        this.imageSize = options.imageSize ? new Cartesian2(options.imageSize[0], options.imageSize[1]): undefined//new Cartesian2(5.0, 5.0);
        this.minimumImageSize=options.minimumImageSize?new Cartesian2(options.minimumImageSize[0], options.minimumImageSize[1]) : new Cartesian2(2.0, 2.0);
        this.maximumImageSize=options.minimumImageSize?new Cartesian2(options.maximumImageSize[0], options.maximumImageSize[1]) : new Cartesian2(10.0, 10.0);
        this.gravity = options.gravity || 2;
        this.show = defaultValue(options.show, true);
        this.loop=options.loop||true;
        this.lifetime = options.lifetime || 16.0;
        this.startOpacity = options.startOpacity || 1;
        this.endOpacity = options.endOpacity || 0.9;
        this.startColor = defined(options.startColor) ? Color.fromCssColorString(options.startColor).withAlpha(this.startOpacity) : Color.LIGHTSEAGREEN.withAlpha(0.7);
        this.endColor = defined(options.endColor) ? Color.fromCssColorString(options.endColor).withAlpha(this.endOpacity) : Color.WHITE.withAlpha(0.0);
        this.color=defined(options.color) ?  Color.fromCssColorString(options.color): undefined;
        // this.modelMatrix=defined(options.modelMatrix) ? options.modelMatrix: undefined;
        // this.emitterModelMatrix=defined(options.emitterModelMatrix) ? options.emitterModelMatrix: undefined;
        // this._collection = null;
        this.type = 'particleLayer';

        this.viewer=GeoDepository.viewer;
        //如果设置为true，则会在场景更新时渲染，否则实时渲染每帧
        GeoDepository.viewer.scene.requestRenderMode=false
        GeoDepository.geomap.requestRenderModeMethods.push('ParticleLayer');

        this.addParticle()
    }

    /**
     * 添加粒子系统
     * @private
     * @ignore
     */
    addParticle() {
        // Gravity = this.gravity;
        let emitter = this.getEmitter(this.emitterType);
        let opts={
            image : this.image,

            startColor : this.startColor,
            endColor : this.endColor,

            // scale:this.scale,
            startScale : this.startScale,
            endScale : this.endScale,

            minimumParticleLife : this.minimumParticleLife,
            maximumParticleLife : this.maxinumParticleLife,

            // speed:this.speed,
            minimumSpeed : this.minimumSpeed,
            maximumSpeed : this.maximumSpeed,

            // imageSize :this.imageSize, //new Cartesian2(this.particleSize, this.particleSize),
            minimumImageSize:this.minimumImageSize,
            maximumImageSize:this.maximumImageSize,

            emissionRate : this.emissionRate,
            loop: this.loop,
            bursts : [
                // these burst will occasionally sync to create a multicolored effect
                new ParticleBurst({time : 5.0, minimum : 10, maximum : 100}),
                new ParticleBurst({time : 10.0, minimum : 50, maximum : 150}),
                new ParticleBurst({time : 15.0, minimum : 200, maximum : 300})
            ],

            lifetime : this.lifetime,
            // particleLife: this.particleLife,
            emitter : emitter,

            emitterModelMatrix : this.computeEmitterModelMatrix(),

            updateCallback : (p, dt) => {
                return this.applyGravity(p, dt);
            }
        }
        this.scale && (opts.scale=this.scale)
        this.speed && (opts.speed=this.speed)
        this.imageSize && (opts.imageSize=this.imageSize)
        this.color && (opts.color=this.color)
        //粒子系统
        this.particle = new ParticleSystem(opts);

        this.feature = GeoDepository.scene.primitives.add(this.particle);

        return this.particle;
    }
    /**
     * 缩放至图层
     * @example
     particle.zoomTo();
     */
    zoomTo() {

        if (!defined(this.feature)) return;
        // 方法二：
        let cameraOffset = new Cartesian3(-80.0, 0.0, 50.0);
        GeoDepository.camera.lookAtTransform(this.feature.modelMatrix, cameraOffset);
        GeoDepository.camera.lookAtTransform(Matrix4.IDENTITY);
        // let position = Matrix4.getTranslation( this.feature.modelMatrix, new Cartesian3() );
        // position.z+=10;
        // GeoDepository.viewer.zoomTo(this.feature)
        // GeoDepository.camera.flyTo(this.feature);
        // GeoDepository.camera.flyTo({destination:position,
        //     orientation: new HeadingPitchRange(0.0, -0.5, 0)
        // });

        // GeoDepository.camera.flyToBoundingSphere(this.feature._boundingSpheres[0], {duration: 2});
        // GeoDepository.camera.lookAt(position, new Cartesian3(30.0, 30.0, 50.0));
    };

    /**
     * 设置模型位置与姿态的矩阵
     * @param {Matrix4} val  将粒子系统从模型转换为世界坐标的4x4转换矩阵
     */
    set modelMatrix (val) {
        if (this.feature) {
            this.feature.modelMatrix = val;
        }
    }
    /**
     * 计算发射器模型的矩阵
     * @returns {Matrix4}
     * @private
     * @ignore
     */
    computeEmitterModelMatrix() {
        let emitterModelMatrix = new Matrix4();
        let translation = new Cartesian3();
        let rotation = new Quaternion();
        let hpr = new HeadingPitchRoll();
        let trs = new TranslationRotationScale();

        hpr = HeadingPitchRoll.fromDegrees(0.0, 0.0, 0.0, hpr);
        trs.translation = Cartesian3.fromElements(-4.0, 0.0, 1.4, translation);
        trs.rotation = Quaternion.fromHeadingPitchRoll(hpr, rotation);

        return Matrix4.fromTranslationRotationScale(trs, emitterModelMatrix);
    }

    /**
     * 设置重力
     * @param {Object} particle   particle是当前粒子对象
     * @param {Number}dt  dt是时间步长。
     * @private
     * @ignore
     */
    applyGravity(particle, dt) {
        // let that=this
        let gravityScratch = new Cartesian3();
        let gravity = 1.2; //that.gravity ||
        // We need to compute a local up vector for each particle in geocentric space.
        let position = particle.position;
        Cartesian3.normalize(position, gravityScratch);
        Cartesian3.multiplyByScalar(gravityScratch, this.gravity * dt, gravityScratch);

        particle.velocity = Cartesian3.add(particle.velocity, gravityScratch, particle.velocity);
        var distance = Cartesian3.distance(this.viewer.scene.camera.position, particle.position);
        // if (distance > 5000) {
        //     particle.imageSize = new Cartesian2(1,1);
        // } else {
        //     delete particle.imageSize
        //
        //     particle.imageSize =  this.imageSize;
        // }
    }

    // /**
    //  * 更新样式
    //  */
    // updateStyle(style) {
    //     style.startScale && (this.particle.startScale = style.startScale)
    //     style.startScale && (this.particle.endScale = style.endScale)
    //     style.startScale && (this.particle.minimumParticleLife = style.minimumParticleLife)
    //     style.startScale && (this.particle.maximumParticleLife = style.maximumParticleLife)
    //     style.startScale && (this.particle.minimumSpeed = style.minimumSpeed)
    //     style.startScale && (this.particle.maximumSpeed = style.maximumSpeed)
    //     style.startScale && (this.particle.imageSize = new Cartesian2(style.imageSize[0], style.imageSize[1]))
    //     style.startScale && (this.particle.emissionRate = style.emissionRate)
    // }

    /**
     * 根据type设置放射类型
     * @param {String} type  放射类型: 圆形 circle、 盒子 box 、球形 sphere、  锥 cone
     * @private
     * @ignore
     */
    getEmitter(type){
        switch(type){
            case 'circle':
                return new CircleEmitter(2.0);
                break;
            case 'box':
                return new BoxEmitter(2.0);
                break;
            case 'sphere':
                return new SphereEmitter(2.0);
                break;
            case 'cone':
                return new ConeEmitter(2.0);
                break;
        }
    }


    /**
     * 设置显隐
     * @param {Boolean} visible true为显示，false为隐藏
     @example
     particle.setVisible(false);
     */
    setVisible(visible) {
        GeoDepository.scene.requestRender();
        this.show = visible;
        this.feature && (this.feature.show = visible);
    };

    /**
     * 移除
     * @example
     particle.remove();
     */
    remove() {
        if (!defined(this.feature)) return;
        GeoDepository.scene.primitives.remove(this.particle);
        this.destroy();
        GeoDepository.scene.requestRender();
    };

    /**
     * 销毁对象
     * @private
     */
    destroy() {
        Util.removeFromArray(GeoDepository.geomap.requestRenderModeMethods, 'ParticleLayer');//移除调用实时渲染的方法
        GeoDepository.geomap._requestRenderModeCheck();
        this.feature = void 0;
        return destroyObject(this);
    };
}


export default ParticleLayer
