
import CesiumMath from 'cesium/Core/Math'
import Cartesian3 from 'cesium/Core/Cartesian3';
import Matrix4 from 'cesium/Core/Matrix4';
import Matrix3 from 'cesium/Core/Matrix3';
import PerspectiveFrustum from 'cesium/Core/PerspectiveFrustum';
import DeveloperError from 'cesium/Core/DeveloperError';
import Check from 'cesium/Core/Check';
import defined from 'cesium/Core/defined';
import createGuid from 'cesium/Core/createGuid';
import Transforms from 'cesium/Core/Transforms';
import destroyObject from 'cesium/Core/destroyObject';
import HeadingPitchRoll from 'cesium/Core/HeadingPitchRoll';

import VideoPrimitive from '../layer/basePrimitive/VideoPrimitive';
import MappingType from '../constant/MappingType';
import { GeoDepository } from '../core/GeoDepository';


class VideoMapping {
    /**
     * 视频图像投影（视频目前只支持.mp4格式，图像支持.png和.jpg格式）类
     * @alias VideoMapping
     * 
     * @param {Object} options 
     * @param {Cartesian3} options.destination 投影时的相机位置
     * @param {Number} [options.heading=0] 相机方位角，单位为度
     * @param {Number} [options.pitch=-45] 相机倾斜角，单位为度
     * @param {Number} [options.roll=0] 相机翻滚角，单位为度
     * @param {String} options.url 视频或图像地址
     * @param {String} [options.mappingType=MappingType.VIDEO] 视频或图像地址
     * @param {Number} [options.aspectRatio=1.8] 投影面的长宽比
     * @param {Number} [options.near=1.0] 近裁剪面距离
     * @param {Number} [options.far=50] 远裁剪面距离
     * @param {Number} [options.fov=35] 相机视野的角度，单位为度；如果宽度大于高度，则该角度将用作水平视野，否则为垂直视野
     * @param {Number} [options.alpha=1.0] 投射内容的不透明度，范围0~1
     * @param {Number} [options.intensity=1.0] 投射颜色的亮度，大于0
     * @param {Number} [options.rotation=0] 投射内容旋转角度，单位为度
     * 
     * @example
     * var geoViewer = = new BOSGeo.GeoMap('bosgeoContainer', {
     *    globeCloud: false,
     * });
     * var destination = BOSGeo.Cartesian3.fromDegrees(113.119821, 23.007841, 95.06);
     * var videoMapping = new BOSGeo.VideoMapping({
     *    destination,
     *    url: './resource/images/effect/fire.png',
     *    mappingType: BOSGeo.MappingType.IMAGE,
     *    // url: './resource/videos/demo.mp4',
     *    near: 1.00,
     *    far: 250,
     *    aspectRatio: 2.14,
     *    fov: 40,
     * });
     * videoMapping.flyToDestination();
     */
    constructor(options = {}) {
        if (!defined(options.destination) || !(options.destination instanceof Cartesian3)) {
            throw new DeveloperError('options.destination未定义或类型不对!');
        }

        if (!defined(options.url)) {
            throw new DeveloperError('options.url未定义!');
        }

        const { scene, viewer, geomap } = GeoDepository;
        this.viewer = viewer;
        this.scene = scene;
        this.geomap = geomap;

        const {
            destination,
            heading = 0,
            pitch = -45,
            roll = 0,
            url,
            mappingType = MappingType.VIDEO,
            aspectRatio = 1.8,// 1.797752808988764,
            near = 1.0,
            far = 50,
            fov = 35,
            alpha = 1.0,
            intensity = 1.0,
            rotation = 0,
        } = options;

        this._destination = destination;
        this._heading = heading;
        this._pitch = pitch;
        this._roll = roll;
        this._fov = fov;
        this._rotation = rotation;
        this.url = url;

        /**
         * 投射类型
         * @property {MappingType} mappingType
         * @default MappingType.VIDEO
         * @readonly
         */
        this.mappingType = mappingType;

        this.videoElement = createVideoElement(url);
        const mappingObject = mappingType === MappingType.VIDEO ? this.videoElement : url;

        // 创建视频投影对象
        this._inverseViewMatrix = getInverseViewMatrix(Cartesian3.clone(this._destination), heading, pitch, roll);

        this._frustum = new PerspectiveFrustum({
            fov: CesiumMath.toRadians(fov),
            aspectRatio,
            near,
            far
        });

        const videoPrimitive = new VideoPrimitive({
            id: createGuid(),
            inverseViewMatrix: this._inverseViewMatrix,
            frustum: this._frustum,
            mappingObject,
            alpha,
            intensity,
            rotation: CesiumMath.toRadians(rotation)
        });
        this.videoPrimitive = this.scene.primitives.add(videoPrimitive);

        this._requestRenderMode = this.geomap.requestRenderMode; // 保存最初的实时渲染参数值
        this.geomap.requestRenderMode = false;
    }

    /**
     * 是否显示投影对象
     * @property {Boolean} show
     * @default true
     */
    get show() {
        return this.videoPrimitive.show;
    }
    set show(value) {
        Check.typeOf.bool('value', value);
        this.videoPrimitive.show = value;
    }

    /**
     * 投影面的长宽比
     * 
     * @property {Number} aspectRatio
     * @default 1.8
     */
    get aspectRatio() {
        return this._frustum.aspectRatio;
    }
    set aspectRatio(value) {
        Check.typeOf.number('value', value);
        if (value !== this._frustum.aspectRatio) {
            this._frustum.aspectRatio = value;
            this.videoPrimitive.frustum = this._frustum.clone();
        }
    }

    /**
     * 近裁剪面距离
     * 
     * @property {Number} near
     * @default 1.0
     */
    get near() {
        return this._frustum.near;
    }
    set near(value) {
        Check.typeOf.number('value', value);
        if (value !== this._frustum.near) {
            this._frustum.near = value;
            this.videoPrimitive.frustum = this._frustum.clone();
        }
    }

    /**
     * 远裁剪面距离
     * 
     * @property {Number} far
     * @default 50
     */
    get far() {
        return this._frustum.far;
    }
    set far(value) {
        Check.typeOf.number('value', value);
        if (value !== this._frustum.far) {
            this._frustum.far = value;
            this.videoPrimitive.frustum = this._frustum.clone();
        }
    }

    /**
     * 相机视野的角度，单位为度；如果宽度大于高度，则该角度将用作水平视野，否则为垂直视野
     * 
     * @property {Number} fov
     * @default 35
     */
    get fov() {
        return this._fov;
    }
    set fov(value) {
        Check.typeOf.number('value', value);
        if (value !== this._fov) {
            this._frustum.fov = CesiumMath.toRadians(value);
            this.videoPrimitive.frustum = this._frustum.clone();
        }
    }

    /**
     * 投射内容的不透明度，范围0~1
     * 
     * @property {Number} alpha
     * @default 1.0
     */
    get alpha() {
        return this.videoPrimitive.alpha;
    }
    set alpha(value) {
        Check.typeOf.number('value', value);
        if (value >= 0 && value <= 1) {
            this.videoPrimitive.alpha = value;
        }
    }

    /**
     * 投射颜色的亮度，大于0
     * 
     * @property {Number} intensity
     * @default 1.0
     */
    get intensity() {
        return this.videoPrimitive.intensity;
    }
    set intensity(value) {
        Check.typeOf.number('value', value);
        this.videoPrimitive.intensity = value;
    }

    /**
     * 投射内容旋转角度，单位为度
     * 
     * @property {Number} rotation
     * @default 0.0
     */
    get rotation() {
        return this._rotation;
    }
    set rotation(value) {
        Check.typeOf.number('value', value);
        if (value !== this._rotation) {
            this._rotation = value;
            this.videoPrimitive.rotation = CesiumMath.toRadians(value);
        }
    }

    /**
     * 
     * 视图矩阵的逆矩阵
     * 
     * @property {Matrix4} inverseViewMatrix
     * @readonly
     */
    get inverseViewMatrix() {
        return this._inverseViewMatrix;
    }

    /**
     * 投射相机位置
     * 
     * @property {Cartesian3} destination
     */
    get destination() {
        return this._destination;
    }
    set destination(value) {
        if (value instanceof Cartesian3 && !value.equals(this._destination)) {
            this._destination = value;
            const { _heading, _pitch, _roll } = this;
            this._inverseViewMatrix = getInverseViewMatrix(Cartesian3.clone(value), _heading, _pitch, _roll);
            this.videoPrimitive.inverseViewMatrix = this._inverseViewMatrix;
        }
    }

    // /**
    //  * 投影时的姿态方位，包含heading、pitch和roll分别指方位角、倾斜角和翻滚角，单位均为弧度
    //  * 
    //  * @property {Objecct} orientation
    //  */
    // get orientation() {
    //     return this._orientation;
    // }
    // set orientation(value) {
    //     const { heading, pitch, roll } = value;
    //     if (defined(heading) &&
    //         defined(pitch) &&
    //         defined(roll) &&
    //         (heading !== this._orientation.heading ||
    //             pitch !== this._orientation.pitch ||
    //             roll !== this._orientation.roll
    //         )
    //     ) {
    //         this._orientation = { heading, pitch, roll };
    //         this._inverseViewMatrix = getInverseViewMatrix(
    //             Cartesian3.clone(this._destination),
    //             heading,
    //             pitch,
    //             roll
    //         );
    //         this.videoPrimitive.inverseViewMatrix = this._inverseViewMatrix;
    //     }
    // }

    /**
     * 视图矩阵的逆矩阵
     * @private 
     */
    _updateInverseViewMatrix() {
        const { _heading, _pitch, _roll } = this;
        this._inverseViewMatrix = getInverseViewMatrix(Cartesian3.clone(this._destination), _heading, _pitch, _roll);
        this.videoPrimitive.inverseViewMatrix = this._inverseViewMatrix;
    }

    /**
     * 投射相机的方位角，单位为度
     * @property {Number} heading
     * @default 0
     */
    get heading() {
        return this._heading;
    }
    set heading(value) {
        Check.typeOf.number('value', value);
        if (this._heading !== value) {
            this._heading = value;
            this._updateInverseViewMatrix();
        }
    }

    /**
     * 投射相机的倾斜角，单位为度
     * @property {Number} pitch
     * @default -45
     */
    get pitch() {
        return this._pitch;
    }
    set pitch(value) {
        Check.typeOf.number('value', value);
        if (this._pitch !== value) {
            this._pitch = value;
            this._updateInverseViewMatrix();
        }
    }

    /**
     * 投射相机的翻滚角，单位为度
     * @property {Number} roll
     * @default 0
     */
    get roll() {
        return this._roll;
    }
    set roll(value) {
        Check.typeOf.number('value', value);
        if (this._roll !== value) {
            this._roll = value;
            this._updateInverseViewMatrix();
        }
    }

    /**
     * 视点坐标
     * @property {Cartesian3} targetPoint
     */
    get targetPoint() {
        const { heading, pitch, roll } = this;
        const matrix3 = Matrix3.fromHeadingPitchRoll(
            new HeadingPitchRoll(CesiumMath.toRadians(heading), CesiumMath.toRadians(roll), CesiumMath.toRadians(pitch)),
            new Matrix3());
        const radius = (this.near + this.far) / 2;
        const localTargetPoint = Matrix3.multiplyByVector(matrix3, new Cartesian3(0, radius, 0), new Cartesian3());
        this._targetPoint = Matrix4.multiplyByPoint(Transforms.eastNorthUpToFixedFrame(this.destination), localTargetPoint, new Cartesian3());

        return this._targetPoint;
    }
    set targetPoint(value) {
        if (value instanceof Cartesian3 && !value.equals(this._targetPoint)) {
            this._targetPoint = value;
            let localVec = new Cartesian3();
            // 获取局部坐标系的模型矩阵
            let mat4 = Transforms.eastNorthUpToFixedFrame(this.destination);
            Matrix4.inverse(mat4, mat4);

            Matrix4.multiplyByPoint(mat4, value, localVec);
            Cartesian3.normalize(localVec, localVec);
            const direction = CesiumMath.toDegrees(Math.atan2(localVec.x, localVec.y));
            const pitch = CesiumMath.toDegrees(Math.asin(localVec.z));
            this._inverseViewMatrix = getInverseViewMatrix(
                Cartesian3.clone(this._destination),
                direction,
                pitch, 0
            );
            this._heading = direction;
            this._pitch = pitch;
            this._roll = 0;
            this.videoPrimitive.inverseViewMatrix = this._inverseViewMatrix;
        }
    }

    /**
     * 是否显示视椎辅助线
     * @property {Boolean} showFrustum
     * @default false
     */
    get showFrustum() {
        return this.videoPrimitive.showFrustum;
    }
    set showFrustum(value) {
        Check.typeOf.bool('value', value);
        this.videoPrimitive.showFrustum = value;
    }

    /**
     * 定位到相机投射位置
     */
    flyToDestination() {
        const { viewer, destination, heading, pitch, roll } = this;
        viewer.camera.setView({
            destination,
            orientation: {
                heading: CesiumMath.toRadians(heading),
                pitch: CesiumMath.toRadians(pitch),
                roll: CesiumMath.toRadians(roll),
            },
        });
    }

    /**
     * 销毁
     */
    destroy() {

        this.scene.primitives.remove(this.videoPrimitive);
        // 销毁记录的相机信息
        this.videoElement && this.viewer.container.removeChild(this.videoElement);
        this.videoElement = undefined;
        this.videoPrimitive = undefined;

        this.geomap.requestRenderMode = this._requestRenderMode; // 还原最初的实时渲染参数值;
        this.geomap.render();

        return destroyObject(this);
    }
}

/**
 * 创建视频标签
 * 
 * @private 
 * 
 * @param {String} videoSrc 视频地址 
 * @param {HTMLElement} [parentDOM] 视频地址 
 * 
 * @returns {HTMLVideoElement}
 */
function createVideoElement(videoSrc, parentDOM = GeoDepository.viewer.container) {
    var videoElement = document.createElement('video');
    videoElement.id = createGuid();
    videoElement.src = videoSrc;
    videoElement.type = 'video/mp4';
    videoElement.style.position = 'absolute';
    videoElement.style.zIndex = '-100';
    videoElement.style.visibility = 'hidden';
    videoElement.style.top = '0px';
    videoElement.crossOrigin = '';
    videoElement.autoplay = true;
    videoElement.loop = true;
    videoElement.muted = true;

    parentDOM.append(videoElement);
    return videoElement;
}

const scratchSetViewMatrix3 = new Matrix3();

/**
 * 获取当前相机位置处的视图矩阵的逆矩阵
 * 
 * @private
 * 
 * @param {Cartesian3} position 相机位置
 * @param {Number} heading 相机方位角，单位为度
 * @param {Number} pitch 相机倾斜角，单位为度
 * @param {Number} roll 相机翻滚角，单位为度
 */
function getInverseViewMatrix(position, heading, pitch, roll) {
    // const inverseViewMatrix = Transforms.headingPitchRollToFixedFrame(position, headingPitchRoll, undefined, undefined, result);
    let inverseViewMatrix = Transforms.eastNorthUpToFixedFrame(position, undefined, new Matrix4());
    // const hpr = new Cesium.HeadingPitchRoll(heading - Cesium.Math.PI_OVER_TWO, pitch, roll);
    // var rotQuat = Cesium.Quaternion.fromHeadingPitchRoll(hpr, scratchSetViewQuaternion);
    // var rotMat = Cesium.Matrix3.fromQuaternion(rotQuat, scratchSetViewMatrix3);
    var rotMat = Matrix3.fromRotationX(CesiumMath.PI_OVER_TWO, scratchSetViewMatrix3);
    Matrix4.multiplyByMatrix3(inverseViewMatrix, rotMat, inverseViewMatrix);

    rotMat = Matrix3.fromRotationY(-CesiumMath.toRadians(heading), scratchSetViewMatrix3);
    Matrix4.multiplyByMatrix3(inverseViewMatrix, rotMat, inverseViewMatrix);

    rotMat = Matrix3.fromRotationX(CesiumMath.toRadians(pitch), scratchSetViewMatrix3);
    Matrix4.multiplyByMatrix3(inverseViewMatrix, rotMat, inverseViewMatrix);

    rotMat = Matrix3.fromRotationZ(-CesiumMath.toRadians(roll), scratchSetViewMatrix3);
    Matrix4.multiplyByMatrix3(inverseViewMatrix, rotMat, inverseViewMatrix);

    return inverseViewMatrix;
}

export default VideoMapping;