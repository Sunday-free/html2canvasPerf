import Cartographic from 'cesium/Core/Cartographic'
import CesiumMath from 'cesium/Core/Math'
import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import Color from 'cesium/Core/Color'
import clone from 'cesium/Core/clone'
import Cartesian3 from 'cesium/Core/Cartesian3'
import Cartesian4 from 'cesium/Core/Cartesian4'
import DeveloperError from 'cesium/Core/DeveloperError'
import Matrix3 from 'cesium/Core/Matrix3'
import Matrix4 from 'cesium/Core/Matrix4'
import Quaternion from 'cesium/Core/Quaternion'

import PostProcessStage from 'cesium/scene/PostProcessStage'
import {GeoDepository} from '../core/GeoDepository'
import Util from "../utils/Util";

/**
 * 圆形扫描区域
 * 实现圆形扫描区域，可进行设置位置、扫描速率、半径、颜色、场景扫描、闪电、雾场景渲染，扫描类型为圆形、雷达。
 * @param {Object} options 配置
 * @param {Array} options.position  含经纬度高程的中心点，如[120,30,20]
 * @param {String} options.type  扫描类型，类型可为'radar'或者'circle'。
 * @param {Number} [options.height=0]  可选，高度，默认为0。
 * @param {Number} [options.radius=500]  可选， 扫描半径，默认为500。
 * @param {String} [options.color='#FF0000']  可选，颜色，默认为'#FF0000'。
 * @param {Number} [options.duration=2000]  可选， 扫描速率，毫秒，默认为2000。
 * @param {Number} [options.percent=0.8]  可选，百分比，只对雾场景主题options.theme=true时有效，用于调节雾浓度，默认为0.8。
 * @param {Number} [options.N=4.0] 可选， N次方，用于计算环宽度，对type为'circle'时有效，N越大，环宽度越小，默认为4.0,
 * @param {Boolean} [options.light=false]  可选， 是否启用光场景扫描效果，true为启用，false为不启用，默认为false。
 * @param {Boolean} [options.flash=false]  可选， 是否启用闪光，true为启用，false为不启用，默认为false。
 * @param {Boolean} [options.theme=false ]  可选，是否启用雾场景主题，true为启用，false为不启用，默认为false。
 * @example
 let scan=new BOSGeo.ScanArea({
    position: [114.054437,22.551279,5], //经纬度中心点
    type: 'circle',   // 'circle'、'radar' 扫描类型为圆形 雷达
    duration: 1000,   // 扫描速率
    color: '#F0FFFF', // 颜色
    radius: 200,      // 扫描半径
    // light: true,   // 是否场景扫描效果
    // flash: true,    // 是否闪电
    theme:true         //启用雾场景主题
});
 */

class ScanArea {
    constructor(options) {
        options = options || {};
        if ((!defined(options.position) ) && (options.type === 'radar' || options.type === 'circle' )) throw new DeveloperError('position and type is required!')
        this.position = options.position;

        this.radius = options.radius || 500;
        this.color = options.color || '#FF0000';
        this.duration = options.duration || 2000;
        this.opacity = options.opacity || 1;
        this.percent = options.percent || 0.8;
        if (isNaN(this.percent) || (this.percent > 1) || (this.percent < 0)) {
            throw new DeveloperError('百分比的范围为0-1。');
        }
        this.N = options.N || 4.0;
        this.scanType = options.type; // 类型为雷达 还是圆形 radar circle
        this.light = defaultValue(options.light, false);
        this.flash = defaultValue(options.flash, false);
        this.theme = defaultValue(options.theme, false);
        this.currentStage = {
            circle: '',
            radar: '',
            light: '',
            flash: '',
            theme: ''
        }
        //存储所有Stage
        this._cacheStage = []


        this.init();
        this._show = true;
    }

    /**
     * 添加扫描
     * @param {Object} options 配置
     * @param {Array} options.position  含经纬度高程的中心点，如[120,30,20]
     * @param {String} options.type  扫描类型，类型可为'radar'或者'circle'。
     * @param {Number} [options.height=0]  可选，高度，默认为0。
     * @param {Number} [options.radius=500]  可选， 扫描半径，默认为500。
     * @param {String} [options.color='#FF0000']  可选，颜色，默认为'#FF0000'。
     * @param {Number} [options.duration=2000]  可选， 扫描速率，毫秒，默认为2000。
     * @param {Number} [options.opacity=1]  可选，不透明度，范围0-1，默认为1，默认为1。
     * @param {Number} [options.percent=0.8]  可选， 百分比，默认为0.8。
     * @param {Number} [options.N=4.0] 可选， N次方，用于计算环宽度，对type为'circle'时有效，N越大，环宽度越小，默认为4.0,
     * @param {Boolean} [options.light=false]  可选， 是否启用光场景扫描效果，true为启用，false为不启用，默认为false。
     * @param {Boolean} [options.flash=false]  可选， 是否启用闪光，true为启用，false为不启用，默认为false。
     * @param {Boolean} [options.theme=false ]  可选，是否启用雾场景主题，true为启用，false为不启用，默认为false。
     */
    add(options){
        options = options || {};
        if ((!defined(options.position) ) && (options.type === 'radar' || options.type === 'circle' )) throw new DeveloperError('position and type is required!')
        this.position = options.position;
        this.radius = options.radius || 500;
        this.color = options.color || '#FF0000';
        this.duration = options.duration || 2000;
        this.opacity = options.opacity || 1;
        this.percent = options.percent || 0.8;
        this.N = options.N || 4.0;
        this.scanType = options.type; // 类型为雷达 还是圆形 radar circle
        this.light = defaultValue(options.light, false);
        this.flash = defaultValue(options.flash, false);
        this.theme = defaultValue(options.theme, false);
        this.init();
    }
    /**
     * 初始化
     * @private
     * @ignore
     */
    init() {
        let center = '';
        if (this.position) center = new Cartographic(CesiumMath.toRadians(this.position[0]), CesiumMath.toRadians(this.position[1]), this.position[2]);
        let color = Color.fromCssColorString(this.color).withAlpha(this.opacity);
        switch(this.scanType){
            case 'radar':
                this.AddRadarScanPostStage(GeoDepository.viewer, center, this.radius, color, this.duration);
                break;
            case 'circle':
                this.AddCircleScanPostStage(GeoDepository.viewer, center, this.radius, color, this.duration,this.N);
                break;
        }
        if (this.light) {
            this.lightup(color, this.position);
        }
        if (this.flash) {

            this.flashup(color);
        }
        if (this.theme) {
            this.themeup(color);
        }

        //如果设置为true，则会在场景更新时渲染，否则实时渲染每帧
        GeoDepository.viewer.scene.requestRenderMode=false;
        GeoDepository.geomap.requestRenderModeMethods.push('ScanArea');
    }

    /**
     * 添加雷达扫描区域
     * @param {Object} viewer cesium的viewer
     * @param {Object} cartographicCenter 含经纬度高程的中心点{longitude:120,latitude:30,height:20}
     * @param {Number} radius   扫描半径
     * @param {String} scanColor 颜色
     * @param {Number} duration 扫描速率
     * @private
     * @ignore
     */
    AddRadarScanPostStage (viewer, cartographicCenter, radius, scanColor, duration) {
        let ScanSegmentShader =
            "uniform sampler2D colorTexture;\n" +
            "uniform sampler2D depthTexture;\n" +
            "varying vec2 v_textureCoordinates;\n" +
            "uniform vec4 u_scanCenterEC;\n" +
            "uniform vec3 u_scanPlaneNormalEC;\n" +
            "uniform vec3 u_scanLineNormalEC;\n" +
            "uniform float u_radius;\n" +
            "uniform vec4 u_scanColor;\n" +
            "vec4 toEye(in vec2 uv, in float depth)\n" +
            " {\n" +
            " vec2 xy = vec2((uv.x * 2.0 - 1.0),(uv.y * 2.0 - 1.0));\n" +
            " vec4 posInCamera =czm_inverseProjection * vec4(xy, depth, 1.0);\n" +
            " posInCamera =posInCamera / posInCamera.w;\n" +
            " return posInCamera;\n" +
            " }\n" +
            "bool isPointOnLineRight(in vec3 ptOnLine, in vec3 lineNormal, in vec3 testPt)\n" +
            "{\n" +
            "vec3 v01 = testPt - ptOnLine;\n" +
            "normalize(v01);\n" +
            "vec3 temp = cross(v01, lineNormal);\n" +
            "float d = dot(temp, u_scanPlaneNormalEC);\n" +
            "return d > 0.5;\n" +
            "}\n" +
            "vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point)\n" +
            "{\n" +
            "vec3 v01 = point -planeOrigin;\n" +
            "float d = dot(planeNormal, v01) ;\n" +
            "return (point - planeNormal * d);\n" +
            "}\n" +
            "float distancePointToLine(in vec3 ptOnLine, in vec3 lineNormal, in vec3 testPt)\n" +
            "{\n" +
            "vec3 tempPt = pointProjectOnPlane(lineNormal, ptOnLine, testPt);\n" +
            "return length(tempPt - ptOnLine);\n" +
            "}\n" +
            "float getDepth(in vec4 depth)\n" +
            "{\n" +
            "float z_window = czm_unpackDepth(depth);\n" +
            "z_window = czm_reverseLogDepth(z_window);\n" +
            "float n_range = czm_depthRange.near;\n" +
            "float f_range = czm_depthRange.far;\n" +
            "return (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n" +
            "}\n" +
            "void main()\n" +
            "{\n" +
            "gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n" +
            "float depth = getDepth( texture2D(depthTexture, v_textureCoordinates));\n" +
            "vec4 viewPos = toEye(v_textureCoordinates, depth);\n" +
            "vec3 prjOnPlane = pointProjectOnPlane(u_scanPlaneNormalEC.xyz, u_scanCenterEC.xyz, viewPos.xyz);\n" +
            "float dis = length(prjOnPlane.xyz - u_scanCenterEC.xyz);\n" +
            "float twou_radius = u_radius * 2.0;\n" +
            "if(dis < u_radius)\n" +
            "{\n" +
            "float f0 = 1.0 -abs(u_radius - dis) / u_radius;\n" +
            "f0 = pow(f0, 64.0);\n" +
            "vec3 lineEndPt = vec3(u_scanCenterEC.xyz) + u_scanLineNormalEC * u_radius;\n" +
            "float f = 0.0;\n" +
            "if(isPointOnLineRight(u_scanCenterEC.xyz, u_scanLineNormalEC.xyz, prjOnPlane.xyz))\n" +
            "{\n" +
            "float dis1= length(prjOnPlane.xyz - lineEndPt);\n" +
            "f = abs(twou_radius -dis1) / twou_radius;\n" +
            "f = pow(f, 3.0);\n" +
            "}\n" +
            "gl_FragColor = mix(gl_FragColor, u_scanColor, f + f0);\n" +
            "}\n" +
            "}\n";
        let _Cartesian3Center = Cartographic.toCartesian(cartographicCenter);
        let _Cartesian4Center = new Cartesian4(_Cartesian3Center.x, _Cartesian3Center.y, _Cartesian3Center.z, 1);
        let _CartographicCenter1 = new Cartographic(cartographicCenter.longitude, cartographicCenter.latitude, cartographicCenter.height + 500);
        let _Cartesian3Center1 = Cartographic.toCartesian(_CartographicCenter1);
        let _Cartesian4Center1 = new Cartesian4(_Cartesian3Center1.x, _Cartesian3Center1.y, _Cartesian3Center1.z, 1);
        let _CartographicCenter2 = new Cartographic(cartographicCenter.longitude + CesiumMath.toRadians(0.001), cartographicCenter.latitude, cartographicCenter.height);
        let _Cartesian3Center2 = Cartographic.toCartesian(_CartographicCenter2);
        let _Cartesian4Center2 = new Cartesian4(_Cartesian3Center2.x, _Cartesian3Center2.y, _Cartesian3Center2.z, 1);
        let _RotateQ = new Quaternion();
        let _RotateM = new Matrix3();
        let _time = (new Date()).getTime();
        let _scratchCartesian4Center = new Cartesian4();
        let _scratchCartesian4Center1 = new Cartesian4();
        let _scratchCartesian4Center2 = new Cartesian4();
        let _scratchCartesian3Normal = new Cartesian3();
        let _scratchCartesian3Normal1 = new Cartesian3();
        let radarStage = new PostProcessStage({
            fragmentShader: ScanSegmentShader,
            uniforms: {
                u_scanCenterEC: function () {
                    return Matrix4.multiplyByVector(viewer.camera._viewMatrix, _Cartesian4Center, _scratchCartesian4Center);
                },
                u_scanPlaneNormalEC: function () {
                    let temp = Matrix4.multiplyByVector(viewer.camera._viewMatrix, _Cartesian4Center, _scratchCartesian4Center);
                    let temp1 = Matrix4.multiplyByVector(viewer.camera._viewMatrix, _Cartesian4Center1, _scratchCartesian4Center1);
                    _scratchCartesian3Normal.x = temp1.x - temp.x;
                    _scratchCartesian3Normal.y = temp1.y - temp.y;
                    _scratchCartesian3Normal.z = temp1.z - temp.z;
                    Cartesian3.normalize(_scratchCartesian3Normal, _scratchCartesian3Normal);
                    return _scratchCartesian3Normal;
                },
                u_radius: radius,
                u_scanLineNormalEC: function () {
                    let temp = Matrix4.multiplyByVector(viewer.camera._viewMatrix, _Cartesian4Center, _scratchCartesian4Center);
                    let temp1 = Matrix4.multiplyByVector(viewer.camera._viewMatrix, _Cartesian4Center1, _scratchCartesian4Center1);
                    let temp2 = Matrix4.multiplyByVector(viewer.camera._viewMatrix, _Cartesian4Center2, _scratchCartesian4Center2);
                    _scratchCartesian3Normal.x = temp1.x - temp.x;
                    _scratchCartesian3Normal.y = temp1.y - temp.y;
                    _scratchCartesian3Normal.z = temp1.z - temp.z;
                    Cartesian3.normalize(_scratchCartesian3Normal, _scratchCartesian3Normal);
                    _scratchCartesian3Normal1.x = temp2.x - temp.x;
                    _scratchCartesian3Normal1.y = temp2.y - temp.y;
                    _scratchCartesian3Normal1.z = temp2.z - temp.z;
                    let tempTime = (((new Date()).getTime() - _time) % duration) / duration;
                    Quaternion.fromAxisAngle(_scratchCartesian3Normal, tempTime * Math.PI * 2, _RotateQ);
                    Matrix3.fromQuaternion(_RotateQ, _RotateM);
                    Matrix3.multiplyByVector(_RotateM, _scratchCartesian3Normal1, _scratchCartesian3Normal1);
                    Cartesian3.normalize(_scratchCartesian3Normal1, _scratchCartesian3Normal1);
                    return _scratchCartesian3Normal1;
                },
                u_scanColor: scanColor
            }
        });
        this.currentStage.radar = radarStage;
        this._cacheStage.push(radarStage);
        GeoDepository.scene.postProcessStages.add(radarStage);
    }
    /**
     * 添加圆形扫描区域
     * 添加扫描线 depth关闭   lon:-74.01296152309055 lat:40.70524201566827 height:129.14366696393927
     * @param {Object} viewer cesium的viewer
     * @param {Object} cartographicCenter 含经纬度高程的中心点{longitude:120,latitude:30,height:20}
     * @param {Number} radius   最大半径 米
     * @param {String} scanColor 颜色
     * @param {Number} duration 持续时间 毫秒
     * @param {Number} [N=4.0] N次方，用于计算环宽度，N越大，宽度越小，默认为4.0
     * @private
     * @ignore
     */
    AddCircleScanPostStage (viewer, cartographicCenter, maxRadius, scanColor, duration,N=4.0) {
        let ScanSegmentShader =
            "uniform sampler2D colorTexture;\n" +
            "uniform sampler2D depthTexture;\n" +
            "varying vec2 v_textureCoordinates;\n" +
            "uniform vec4 u_scanCenterEC;\n" +
            "uniform vec3 u_scanPlaneNormalEC;\n" +
            "uniform float u_radius;\n" +
            "uniform vec4 u_scanColor;\n" +
            "vec4 toEye(in vec2 uv, in float depth)\n" +
            " {\n" +
            " vec2 xy = vec2((uv.x * 2.0 - 1.0),(uv.y * 2.0 - 1.0));\n" +
            " vec4 posInCamera =czm_inverseProjection * vec4(xy, depth, 1.0);\n" +
            " posInCamera =posInCamera / posInCamera.w;\n" +
            " return posInCamera;\n" +
            " }\n" +
            "vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point)\n" +
            "{\n" +
            "vec3 v01 = point -planeOrigin;\n" +
            "float d = dot(planeNormal, v01) ;\n" +
            "return (point - planeNormal * d);\n" +
            "}\n" +
            "float getDepth(in vec4 depth)\n" +
            "{\n" +
            "float z_window = czm_unpackDepth(depth);\n" +
            "z_window = czm_reverseLogDepth(z_window);\n" +
            "float n_range = czm_depthRange.near;\n" +
            "float f_range = czm_depthRange.far;\n" +
            "return (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n" +
            "}\n" +
            "void main()\n" +
            "{\n" +
            "gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n" +
            "float depth = getDepth( texture2D(depthTexture, v_textureCoordinates));\n" +
            "vec4 viewPos = toEye(v_textureCoordinates, depth);\n" +
            "vec3 prjOnPlane = pointProjectOnPlane(u_scanPlaneNormalEC.xyz, u_scanCenterEC.xyz, viewPos.xyz);\n" +
            "float dis = length(prjOnPlane.xyz - u_scanCenterEC.xyz);\n" +
            "if(dis < u_radius)\n" +
            "{\n" +
            "float f = 1.0 -abs(u_radius - dis) / u_radius;\n" +
            "f = pow(f, "+ N.toFixed(1) +");\n" +
            "gl_FragColor = mix(gl_FragColor, u_scanColor, f);\n" +
            "}\n" +
            "}\n";

        let _Cartesian3Center = Cartographic.toCartesian(cartographicCenter);
        let _Cartesian4Center = new Cartesian4(_Cartesian3Center.x, _Cartesian3Center.y, _Cartesian3Center.z, 1);
        let _CartographicCenter1 = new Cartographic(cartographicCenter.longitude, cartographicCenter.latitude, cartographicCenter.height + 500);
        let _Cartesian3Center1 = Cartographic.toCartesian(_CartographicCenter1);
        let _Cartesian4Center1 = new Cartesian4(_Cartesian3Center1.x, _Cartesian3Center1.y, _Cartesian3Center1.z, 1);
        let _time = (new Date()).getTime();
        let _scratchCartesian4Center = new Cartesian4();
        let _scratchCartesian4Center1 = new Cartesian4();
        let _scratchCartesian3Normal = new Cartesian3();
        let circleStage = new PostProcessStage({
            fragmentShader: ScanSegmentShader,
            uniforms: {
                u_scanCenterEC: function () {
                    return Matrix4.multiplyByVector(GeoDepository.camera._viewMatrix, _Cartesian4Center, _scratchCartesian4Center);
                },
                u_scanPlaneNormalEC: function () {
                    let temp = Matrix4.multiplyByVector(GeoDepository.camera._viewMatrix, _Cartesian4Center, _scratchCartesian4Center);
                    let temp1 = Matrix4.multiplyByVector(GeoDepository.camera._viewMatrix, _Cartesian4Center1, _scratchCartesian4Center1);
                    _scratchCartesian3Normal.x = temp1.x - temp.x;
                    _scratchCartesian3Normal.y = temp1.y - temp.y;
                    _scratchCartesian3Normal.z = temp1.z - temp.z;
                    Cartesian3.normalize(_scratchCartesian3Normal, _scratchCartesian3Normal);
                    return _scratchCartesian3Normal;
                },
                u_radius: function () {
                    return maxRadius * (((new Date()).getTime() - _time) % duration) / duration;
                },
                u_scanColor: scanColor
            }
        });
        this.currentStage.circle = circleStage;
        this._cacheStage.push(circleStage);
        GeoDepository.scene.postProcessStages.add(circleStage);
    }

    /**
     * 添加光效场景扫描
     * @param {Color} scanColor 颜色
     * @param {Array} position 含经纬度高程的中心点[120,30,20]
     *  @example
     let color=BOSGeo.Color.fromCssColorString('#f2feff');
     let center=[120,23,20]
     scan.lightup(color,center);
     */
    lightup(scanColor, position) {
        let fs = "uniform sampler2D colorTexture;\n" +
            "uniform sampler2D depthTexture;\n" +
            "varying vec2 v_textureCoordinates;\n" +
            "uniform vec4 u_scanCenterEC;\n" +
            "uniform vec3 u_scanPlaneNormalEC;\n" +
            "uniform float u_radius;\n" +
            "uniform vec4 u_scanColor;\n" +
            "vec4 toEye(in vec2 uv, in float depth)\n" +
            " {\n" +
            " vec2 xy = vec2((uv.x * 2.0 - 1.0),(uv.y * 2.0 - 1.0));\n" +
            " vec4 posInCamera =czm_inverseProjection * vec4(xy, depth, 1.0);\n" +
            " posInCamera =posInCamera / posInCamera.w;\n" +
            " return posInCamera;\n" +
            " }\n" +
            "vec3 pointProjectOnPlane(in vec3 planeNormal, in vec3 planeOrigin, in vec3 point)\n" +
            "{\n" +
            "vec3 v01 = point -planeOrigin;\n" +
            "float d = dot(planeNormal, v01) ;\n" +
            "return (point - planeNormal * d);\n" +
            "}\n" +
            "float getDepth(in vec4 depth)\n" +
            "{\n" +
            "float z_window = czm_unpackDepth(depth);\n" +
            "z_window = czm_reverseLogDepth(z_window);\n" +
            "float n_range = czm_depthRange.near;\n" +
            "float f_range = czm_depthRange.far;\n" +
            "return (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n" +
            "}\n" +
            "void main()\n" +
            "{\n" +
            "gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n" +
            "float depth = getDepth( texture2D(depthTexture, v_textureCoordinates));\n" +
            "vec4 viewPos = toEye(v_textureCoordinates, depth);\n" +
            "vec3 prjOnPlane = pointProjectOnPlane(u_scanPlaneNormalEC.xyz, u_scanCenterEC.xyz, viewPos.xyz);\n" +
            "float dis = length(prjOnPlane.xyz - u_scanCenterEC.xyz);\n" +
            "if(dis < u_radius)\n" +
            "{\n" +
            "float f = 1.0 -abs(u_radius - dis) / u_radius;\n" +
            "f = pow(f, 4.0);\n" +
            "gl_FragColor = mix(gl_FragColor, u_scanColor, f);\n" +
            "}\n" +
            "}\n";
        let radius = this.radius;
        let cartesian3Center = Cartesian3.fromDegrees(position[0],position[1],position[2])
        let _Cartesian3Center = cartesian3Center //Cartographic.toCartesian(cartographicCenter);
        let _Cartesian4Center = new Cartesian4(_Cartesian3Center.x, _Cartesian3Center.y, _Cartesian3Center.z, 1);
        let _scratchCartesian4Center = new Cartesian4();
        let uTime = 0;
        let lightStage = new PostProcessStage({
            fragmentShader: fs,
            uniforms: {
                u_scanCenterEC: function () {
                    uTime += 0.01;
                    _Cartesian4Center = new Cartesian4(_Cartesian3Center.x + 20 * Math.cos(3 * uTime), _Cartesian3Center.y + 200 * Math.sin(6 * uTime), _Cartesian3Center.z + 300 * Math.cos(3 * uTime), 1);
                    return Matrix4.multiplyByVector(GeoDepository.camera._viewMatrix, _Cartesian4Center, _scratchCartesian4Center);
                },
                u_scanPlaneNormalEC: function () {
                    return new Cartesian3(0.5, 0.12, 0.98);
                },
                u_scanColor: scanColor,
                u_radius: () => {
                    return radius;
                }
            }
        });
        this.currentStage.light = lightStage;
        this._cacheStage.push(lightStage);
        GeoDepository.scene.postProcessStages.add(lightStage);
    }
    /**
     * 添加闪电
     * @param {Color} scanColor 颜色
     * @example
     let color=BOSGeo.Color.fromCssColorString('#f2feff');
     scan.flashup(color);
     */
    flashup(scanColor) {
        let fs = "uniform sampler2D colorTexture;\n" +
            "varying vec2 v_textureCoordinates;\n" +
            "uniform float u_radius;\n" +
            "uniform vec4 u_scanColor;\n" +
            "void main()\n" +
            "{\n" +
            "gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n" +
            "if(u_radius > 0.2)\n" +
            "{\n" +
            "float f = 1.0 - u_radius;\n" +
            "f = pow(f, 4.0);\n" +
            "gl_FragColor = mix(gl_FragColor, u_scanColor, f);\n" +
            "}\n" +
            "}\n";
        let _time = 0;
        let flashStage = new PostProcessStage({
            fragmentShader: fs,
            uniforms: {
                u_scanColor: scanColor,
                u_radius: () => {
                    _time += 0.01;
                    return Math.abs(Math.cos(6 * _time));
                }
            }
        });
        this.currentStage.flash = flashStage;
        this._cacheStage.push(flashStage);
        GeoDepository.scene.postProcessStages.add(flashStage);
    }
    /**
     * 场景主题
     * @param {Color} scanColor 颜色
     @example
     let color=BOSGeo.Color.fromCssColorString('#f2feff');
     scan.themeup(color);
     */
    themeup(scanColor) {
        let fs = "uniform sampler2D colorTexture;\n" +
            "varying vec2 v_textureCoordinates;\n" +
            "uniform float u_percent;\n" +
            "uniform vec4 u_scanColor;\n" +
            "void main()\n" +
            "{\n" +
            "gl_FragColor = texture2D(colorTexture, v_textureCoordinates);\n" +
            "gl_FragColor = mix(gl_FragColor, u_scanColor, u_percent);\n" +
            "}\n";
        let themeStage = new PostProcessStage({
            fragmentShader: fs,
            uniforms: {
                u_scanColor: scanColor,
                u_percent: this.percent
            }
        });
        this.currentStage.theme = themeStage;
        this._cacheStage.push(themeStage);
        GeoDepository.scene.postProcessStages.add(themeStage);
    }

    /**
     * 根据类型移除效果
     * @param {String} type 类型为 circle radar light flash  theme
     * @example
     scan.remove('circle');
     */
    remove(type) {
        if(this.currentStage[type]){
            GeoDepository.scene.postProcessStages.remove(this.currentStage[type]);
        }
    }

    /**
     * 移除全部
     * @example
     scan.removeAll();
     */
    removeAll() {
        Util.removeFromArray(GeoDepository.geomap.requestRenderModeMethods, 'ScanArea');//移除调用实时渲染的方法
        GeoDepository.geomap._requestRenderModeCheck();
        let allStages=this._cacheStage;
        let stages = this.currentStage;
        for (let key in stages) {
            this.remove(key);
        }
        for (let istage in allStages) {
            GeoDepository.scene.postProcessStages.remove(allStages[istage]);
        }
    }

}

export default ScanArea;
