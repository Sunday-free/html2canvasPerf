import 'cesium/Widgets/widgets.css';
import defined from "cesium/Core/defined";
import defaultValue from 'cesium/Core/defaultValue';
import DeveloperError from 'cesium/Core/DeveloperError'
import Event from 'cesium/Core/Event'
import CesiumMath from "cesium/Core/Math";
import CesiumViewer from 'cesium/Widgets/Viewer/Viewer';
import getElement from 'cesium/Widgets/getElement';
import Rectangle from "cesium/Core/Rectangle";
import Camera from "cesium/Scene/Camera";
import buildModuleUrl from 'cesium/Core/buildModuleUrl';
import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType';
import CameraEventType from 'cesium/Scene/CameraEventType';
import KeyboardEventModifier from 'cesium/Core/KeyboardEventModifier';
import Model from "cesium/Scene/Model";
import Material from "cesium/Scene/Material";
import Cesium3DTileset from "cesium/Scene/Cesium3DTileset";

import Resource from "cesium/Core/Resource";
import PixelFormat from "cesium/Core/PixelFormat";
import PixelDatatype from "cesium/Renderer/PixelDatatype";
import Texture from "cesium/Renderer/Texture";
import Cartesian3 from "cesium/Core/Cartesian3";
import MapEventType from '../constant/MapEventType.js';
import destroyObject from 'cesium/Core/destroyObject'
import Check from 'cesium/Core/Check';
//import {EventType} from '../constant/EventType';
import GeoUtil from "../utils/GeoUtil";
import { GeoDepository } from "./GeoDepository"
import LayerManager from './LayerManager';
import Fullscreen from "cesium/Core/Fullscreen";
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler';
import Listener from './Listener.js';
import MapPickType from '../constant/MapPickType.js';
import BoundingSphere from "cesium/Core/BoundingSphere.js";
import Cartographic from "cesium/Core/Cartographic";
import AxisFrame from '../tools/AxisFrame';
// import createDefaultImageryProviderViewModels from "cesium/Widgets/BaseLayerPicker/createDefaultImageryProviderViewModels.js";

//import { ModelOperation } from '../utils/ModelOperation'; 
import FeatureInfo from '../utils/featureInfo';
import OverView from './OverView';
import { ModelStyler } from "../utils/ModelStyler";
import JulianDate from "../../../cesium/Source/Core/JulianDate";
import { BosConfig } from '../service/bos/BosConfig';

import WebMapTileServiceImageryProvider from 'cesium/Scene/WebMapTileServiceImageryProvider';
import GeographicTilingScheme from "cesium/Core/GeographicTilingScheme";
import EditorAxisType from '../constant/EditorAxisType';

import "cesium/Widgets/widgets.css";
import Navigation from "cesium/Widgets/Navigation/NavigationMixin";




class GeoMap {
    /**
     * BOSGeo（GeoViewer）三维引擎入口，用于创建三维地图引擎，是Viewer和LayerManager的父类。
     * 其中，Viewer是用于构建应用程序的基础部件，它将所有标准的Cesium部件组合成一个可重复使用的包；
     * LayerManager是图层管理类，用于图层分组，点、线、几何、模型、地形、影像、GeoJson、KML等类型图层的创建、获取和删除等操作。
     * @alias GeoMap
     * @constructor
     * 
     * @param {String} containerId 视窗的DOM元素ID；
     * @param {Object} options 包含以下参数的Object对象：
     * @param {ImageryMapType} [options.baseMap=BOSGeo.ImageryMapType.TDT_IMAGERY] 底图类型，可以是BOSGeo.ImageryMapType中的所有类型，如BOSGeo.ImageryMapType.TDT_IMAGERY, BOSGeo.ImageryMapType.GOOGLE_IMAGERY, BOSGeo.ImageryMapType.BING_IMAGERY, BOSGeo.ImageryMapType.MAPBOX_IMAGERY等,详见BOSGeo.ImageryMapType；
     * @param {String} [options.baseMapKey] 影像底图类型对应的key或token，如天地图、MapBox、BIYING底图等；若不填则默认使用内置Key
     * @param {Boolean} [options.globeCloud=false] 地球云层效果；
     * @param {Number} [options.maxLevel=22] 最大缩放级别；
     * @param {Number} [options.minLevel=1] 最小缩放级别，如果设置成0，可以缩放到无穷小；
     * @param {Boolean} [options.requestWebgl2=true] 如果设置为true，则会在场景使用webgl2.0，否则使用webgl1.0；
     * @param {Boolean} [options.overView=false] 如果设置为true，则显示鹰眼，否则不显示；
     * @param {Boolean} [options.preserveDrawingBuffer=true] 是否保存绘制缓冲区；
     * @param {Boolean} [options.requestRenderMode=true] 如果设置为true，则会在场景更新时渲染，否则实时渲染每帧(保持默认状态，即关闭实时渲染，可提升性能)；
     * @param {Boolean} [options.fixedclock=true] 是否固定时刻,如果设置为true，则固定住11点时的日照效果，否则会进行正常的日照效果；
     * @param {String} [options.date="2020/06/22 12:00:00"] 设置日照时间，注意时间格式。默认为夏至日中午（6月22日中午12:00）
     * @param {String} [options.token=''] 后台接口默认token。
     * @param {Number} [options.msaaLevel=1] msaaLevel抗锯齿层级，默认为1则不开启抗据此，层级一般为2的幂次数，如1、2、4、8、16，requestWebgl2为true时才起效
     * @param {Boolean} [options.enableFXAA=false] 是否开启enableFXAA抗锯齿
     * @param {Boolean} [options.useMRT=false] 是否开启webgl2的多重渲染目标（开启自发光纹理及非后处理天气效果时用到，会一定程度上降低场景性能)，requestWebgl2为true时才起效
     * @param {Boolean} [options.useImageryCache=true] 影像底图是否开启缓存
     * 
     * @example
     * var geomap = new BOSGeo.GeoMap('bosgeoContainer', {
     *  baseMap: BOSGeo.ImageryMapType.BING_DARK, //底图类型
     *  globeCloud: false,    //云层效果
     *  requestRenderMode: true //是否实时渲染
     * });
     * 
     */
    constructor(containerId, options = {}) {
        if (!defined(containerId)) {
            throw new DeveloperError('Geo三维场景容器id是必须的！');
        }
        this._containerId = getElement(containerId);


        // 可选项参数默认配置1
        const {
            maxLevel = 22,
            minLevel = 1,
            enableHighlight = false,
            highlightColor = '#56ebfd',
            showAttribute = false,
            token = '',
            overView = false,
        } = options;

        this._enableHighlight = enableHighlight;

        this.modelStyler = new ModelStyler({ highlightColor });
        this._showAttribute = showAttribute; // 是否显示属性框


        // GeoDepository._modelMove = new Event();

        this.layerManager = new LayerManager(this); //添加图层管理器    
        this.init(this._containerId, options);

        this._pick = new Event();
        this._featuresClick = new Event();
        this._viewChange = new Event();

        this.featureInfo = new FeatureInfo(this._featuresClick, {
            showAttribute: this._showAttribute
        });
        // this.moveModel = new ModelOperation({ modelMove: GeoDepository._modelMove });//初始化模型移动事件

        // this._bindEvent();
        this._enableControl = true;


        this.maxLevel = maxLevel;
        this.minLevel = minLevel;


        // 渲染时更新
        this.postRenderCallback = null

        this._listener = new Listener();

        //用于移动模型 AxisFrame
        this._directionIdForMoveFeature = undefined;
        this._actionsForMoveFeature = {};
        //记录调用实时渲染的方法
        this.requestRenderModeMethods = [] ;
        // 用于BOS后台API接口调用的token默认值设置
        this.token = token;

        this._limitMapLevel();
    }

    /**
     * 是否允许请求重渲染
     * 
     * @property {Boolean}
     * @default true
     * 
     */
    get requestRenderMode() {
        return this.viewer.scene.requestRenderMode;
    }
    set requestRenderMode(val) {
        this.viewer.scene.requestRenderMode = val;
    }

    /**
     * 后台查询默认token
     * 
     * @property {String}
     * @default ''
     */
    get token() {
        return this._token;
    }
    set token(value) {
        this._token = value;
        BosConfig.defaultToken = value; // 更新默认token配置项
    }

    /**
     * 是否开启FXAA抗锯齿
     * 
     * @property {Boolean}
     * @default false
     */
    get enableFXAA() {
        return this.viewer.scene.postProcessStages.fxaa.enabled;
    }
    set enableFXAA(value) {
        this.viewer.scene.postProcessStages.fxaa.enabled = value;
        this.render();
    }

    /**
     * 整个场景中3DTiles的三角面片数（包括显示的、隐藏的及在3dtiles缓存中的）
     * @property {Number} globalTrianglesOf3DTiles
     * @readonly
     */
    get globalTrianglesOf3DTiles () {
        return Cesium3DTileset.globeTrianglesLength;
    }

    /**
     * 当前视角下整个场景所有Cesium3DTile中三角网数量
     * @property {Number} globalMemoryOf3DTiles
     * @readonly
     */
     get globalTrianglesSelectedOf3DTiles () {
        return Cesium3DTileset.globeTrianglesLengthSelected;
    }

    /**
     * 整个场景中3DTiles的内存占用量，单位为MB（包括显示的、隐藏的及在3dtiles缓存中的）
     * @property {Number} globalMemoryOf3DTiles
     * @readonly
     */
    get globalMemoryOf3DTiles () {
        return Cesium3DTileset.globalMemoryUsage;
    }

    /**
     * 整个场景中3DTiles的最大内存占用量，单位为MB（会出现globalMemoryOf3DTiles超过场景设置的最大内存占用，该值只用于清理3DTiles的缓存）
     * @property {Number} maxGlobalMemoryOf3DTiles
     * @default 10240
     */
    get maxGlobalMemoryOf3DTiles () {
        return Cesium3DTileset.maximumGlobalMemoryUsage;
    }
    set maxGlobalMemoryOf3DTiles (value) {
        Check.typeOf.number('value', value);
        if (value >= 0 && Cesium3DTileset.maximumGlobalMemoryUsage !== value) {
            Cesium3DTileset.maximumGlobalMemoryUsage = value;
            Cesium3DTileset.updateGlobalMemoryUsage(); // 更新
        }
    }

    /**
     * 初始化Geo三维场景
     * 
     * @private
     * 
     * @param {String} containerId 
     * @param {*} options
     * @param {ImageryMapType} [options.baseMap=BOSGeo.ImageryMapType.TDT_IMAGERY] 底图类型，可以是BOSGeo.ImageryMapType中的所有类型，如BOSGeo.ImageryMapType.TDT_IMAGERY, BOSGeo.ImageryMapType.GOOGLE_IMAGERY, BOSGeo.ImageryMapType.BING_IMAGERY, BOSGeo.ImageryMapType.MAPBOX_IMAGERY等,详见BOSGeo.ImageryMapType
     * @param {String} [options.baseMapKey] 影像底图类型对应的key或token，如天地图、MapBox、BIYING底图等；若不填则默认使用内置Key
     * @param {Boolean} [options.globeCloud=false] 地球云层效果
     * @param {Boolean} [options.requestWebgl2=true] 如果设置为true，则会在场景使用webgl2.0，否则使用webgl1.0。
     * @param {Boolean} [options.preserveDrawingBuffer=true] 是否保存绘制缓冲区
     * @param {Boolean} [options.requestRenderMode=true] 如果设置为true，则会在场景更新时渲染，否则实时渲染每帧。
     * @param {Boolean} [options.fixedclock=true] 如果设置为true，则固定住12点时的日照效果，否则会进行正常的日照效果。
     * @param {String} [options.date="2020/06/22 12:00:00"] 设置日照时间，注意时间格式。默认为夏至日中午（6月22日中午12:00）
     * @param {Number} [options.msaaLevel=1] msaaLevel抗锯齿层级，默认为1则不开启抗据此，层级一般为2的幂次数，如1、2、4、8、16，requestWebgl2为true时才起效
     * @param {Boolean} [options.enableFXAA=false] 是否开启enableFXAA抗锯齿
     * @param {Boolean} [options.useMRT=false] 是否开启webgl2的多重渲染目标（开启自发光纹理及非后处理天气效果时用到，会一定程度上降低场景性能)，requestWebgl2为true时才起效
     * @param {Boolean} [options.useImageryCache=true] 影像底图是否开启缓存
     */
    init(containerId, options) {
        // 可选项参数默认配置2
        const {
            baseMap = BOSGeo.ImageryMapType.TDT_IMAGERY,
            baseMapKey = undefined,
            globeCloud = false,
            requestWebgl2 = true,
            preserveDrawingBuffer = true,
            requestRenderMode = true,
            fixedclock = true,
            date = '2020/06/22 12:00:00',
            msaaLevel = 1,
            enableFXAA = false,
            useMRT = false,
            useImageryCache = true,
            overView = false,
        } = options;
        //设置默认视图范围为中国
        let extend = Rectangle.fromDegrees(80, -20, 130, 80);
        Camera.DEFAULT_VIEW_RECTANGLE = extend;
        Camera.DEFAULT_VIEW_FACTOR = 1;
        this.requestWebgl2 = requestWebgl2;
        this.preserveDrawingBuffer = preserveDrawingBuffer;

        // let vmodels = createDefaultImageryProviderViewModels();
        //初始化Viewer
        let viewer = new CesiumViewer(containerId, {
            // selectedImageryProviderViewModel:vmodels[15],
            baseLayerPicker: false,
            homeButton: false,
            animation: false,
            geocoder: false,
            timeline: false,
            selectionIndicator: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            infoBox: false,
            shouldAnimate: true,
            fullscreenButton: false,
            projectionPicker: false,
            useDefaultRenderLoop: true,
            // imageryProvider: new UrlTemplateImageryProvider({
            //     name: 'default',
            //     // url: "http://webst0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8", // 注记服务
            //     // url: "http://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}", // 矢量地图(小字体)
            //     // url: "http://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}", // 矢量地图(大字体)
            //     url: "http://mt1.google.cn/vt/lyrs=s&hl=zh-CN&x={x}&y={y}&z={z}&s=Gali", // 矢量地图(小字体)
            //     // subdomains: ["1", "2", "3", "4"],
            //     maximumLevel: 18,
            // }),
            // terrainProvider: createWorldTerrain(),
            imageryProvider: new WebMapTileServiceImageryProvider({
                // url: 'http://t1.tianditu.gov.cn/img_c/wmts?service=WMTS&version=1.0.0&request=GetTile&tilematrix={TileMatrix}&layer=img&style=default&tilerow={TileRow}&tilecol={TileCol}&tilematrixset=c&format=tiles&tk=' + '5f5ced578c88ac399b0691415c56a9d7',
                url: 'http://t0.tianditu.com/img_w/wmts?tk=5f5ced578c88ac399b0691415c56a9d7',
                layer: 'img',
                style: 'default',
                format: 'tiles',
                tileMatrixSetID: 'c',
                subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
                maximumLevel: 17,
                tilingScheme: new GeographicTilingScheme(),
                tileMatrixLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18']
            }),
            maximumRenderTimeChange: Infinity,
            contextOptions: {
                msaaLevel,
                useMRT,
                requestWebgl2: this.requestWebgl2,  //requestWebgl2配置，true 为Webgl2.0，false 为webgl1.0
                webgl: {
                    // antialias: true,
                    preserveDrawingBuffer: true
                }
            }
        });
        const debounce = (fn, wait) => {
            let timeout = null;
            const others = window.onbeforeunload;
            window.onbeforeunload = function (event) {
                if (others) others();
                clearTimeout(timeout);
            };
            return function () {
                if (timeout !== null) clearTimeout(timeout);
                timeout = setTimeout(fn, wait);
            }
        }
        viewer.scene.postRender.addEventListener(debounce(() => this.fire(MapEventType.POST_RENDER), 50));
        //设置Viewer、Scene和Camera等全局对象的值，以便其他js库调用
        // if (GeoDepository.viewer === undefined) {
            GeoDepository.viewer = viewer;
            GeoDepository.scene = viewer.scene;
            GeoDepository.camera = viewer.camera;
            GeoDepository.geomap = this;
        // }

        let _GeoDepository = {};
        _GeoDepository.viewer = viewer;
        _GeoDepository.scene = viewer.scene;
        _GeoDepository.camera = viewer.camera;
        _GeoDepository.geomap = this;
        this.GeoDepository = _GeoDepository;

        //this.viewer和this.scene 分别与  GeoDepository.viewer和GeoDepository.scene  指向的内存空间相同
        this.viewer = viewer;
        this.scene = viewer.scene;

        this.requestRenderMode = requestRenderMode;

        //删除默认的影像
        viewer.imageryLayers.remove(viewer.imageryLayers.get(0));

        //添加默认底图
        this.baseMap = baseMap;
        let imageryLayer = this.layerManager.createImageryLayer('默认底图');
        imageryLayer.add({ 
            map: this.baseMap,
            baseMapKey,
            useCacheDB: useImageryCache
        });

        this.globeCloud = globeCloud;
        if (this.globeCloud) {//添加云层效果
            let globe = viewer.scene.globe;
            // let surfaceMaterial = new SurfaceEffect(viewer);
            // globe.material = surfaceMaterial;
            globe.material = this.getCloudMaterial();
            Resource.fetchImage(buildModuleUrl('resource/images/CloudOneImage.png')).then(function (image) {
                globe.material.uniforms.u_cloudImage = new Texture({
                    context: viewer.scene.context,
                    source: image,
                    pixelFormat: PixelFormat.RGBA,
                    pixelDatatype: PixelDatatype.UNSIGNED_BYTE
                });
            });
        }

        // 去掉cesium图标
        viewer._cesiumWidget._creditContainer.style.display = 'none';

        // 开启地形深度检测
        viewer.scene.globe.depthTestAgainstTerrain = true;

        // 取消默认双击事件
        this.screenspacehandler = viewer.screenSpaceEventHandler;
        this.screenspacehandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        //修改相机操作
        viewer.scene.screenSpaceCameraController.lookEventTypes = { // 修改shift键为Alt，防止在手动漫游时出现bug
            eventTypes: CameraEventType.LEFT_DRAG,
            modifier: KeyboardEventModifier.ALT
        };
        // viewer.scene.highDynamicRange = true;
        // viewer.scene.postProcessStages.tonemapper = Tonemapper.HejiDawson;
        viewer.scene.postProcessStages.fxaa.enabled = enableFXAA;

        overView && (this._overView =  new OverView(),this._overView.show =true );
        // GeoDepository.overViewer = this._overView;
        // GeoDepository.layerManager = this.layerManager;

        //设置日照时间
        this.setClock(fixedclock, date)

        //为模型拖拽额外使用的监听器，会将cesium所有屏幕监听进行转播,特殊的，其中对鼠标移动和点击事件进行结果修饰,对回调传入‘{window_position:e.position}’
        const handler = new ScreenSpaceEventHandler(this.viewer.canvas);
        Object.keys(ScreenSpaceEventType).forEach((eventKey) => {
            handler.setInputAction(e => {
                if (eventKey === 'MOUSE_MOVE') {
                    this.fire(MapEventType[eventKey], { window_position: e.endPosition, origin: e });
                } else {
                    const evt = (e.position) ? { window_position: e.position, origin: e } : e;
                    this.fire(MapEventType[eventKey], evt);
                };
            }, ScreenSpaceEventType[eventKey]);
        })


    }

    /**
     * 启用要素按坐标轴拖拽移动功能
     * 
     * @param {AxisFrame} axisFrame 已绑定对象的坐标轴
     * @param {Function} callback 回调函数， 回调参数为{offset, currentPosition},其中offset为[x偏移,y偏移,z偏移]，单位米，currentPosition为[经度，纬度，高度] 
     * @example
     * //创建模型图层 modelLayer
     * //添加模型model
     * const axis = new BOSGeo.AxisFrame({ target: model});
     * geomap.enableMoveFeature(axis, (result) => console.log('每次移动变化监听：' + result.currentPosition));
     *
     * @see  AxisFrame
     */
    enableMoveFeature(axisFrame, callback) {
        this.disableMoveFeature();
        if (!axisFrame) return;
        this._axisForMoveFeature = axisFrame;

        const e_start_type = MapEventType.LEFT_DOWN;
        const e_drag_type = MapEventType.MOUSE_MOVE;
        const e_end_type = MapEventType.LEFT_UP;

        const actionsForMoveFeature = this._actionsForMoveFeature;
        if (!actionsForMoveFeature._moveFeatureStart) {
            actionsForMoveFeature._moveFeatureStart = (e) => {
                //鼠标移动到坐标轴

                //hack一个坐标轴面的bug：当两个轴面重叠在一起时，总是下面的轴面被选中。
                const drillFeatureArr = this.viewer.scene.drillPick(e.window_position, 2); 
                let feature = drillFeatureArr[0];
                
                if (feature && feature.primitive && feature.id && feature.id.axisType && this._axisForMoveFeature.contains(feature.primitive)) {
                    //hack一个坐标轴面的bug：当两个轴面重叠在一起时，总是下面的轴面被选中。
                    if(drillFeatureArr[1] && !this._axisForMoveFeature.depthTestEnabled && this._axisForMoveFeature.contains(drillFeatureArr[1].primitive)){
                        const {XY_PLANE, XZ_PLANE, YZ_PLANE} = EditorAxisType;
                        if([XY_PLANE, XZ_PLANE, YZ_PLANE].includes(drillFeatureArr[1].id.axisType)){
                            feature = drillFeatureArr[1];
                        }
                    }
                    this._axisForMoveFeature.highlightAxisOrPlane = feature.id.axisType;
                    this._directionForMoveFeature = feature.id.axisType;
                    this.enableControl = false;
                } else {
                    this._axisForMoveFeature.highlightAxisOrPlane = null;
                    this.enableControl = true;
                }

            }
            actionsForMoveFeature._moveFeatureDrag = (e) => {
                if (this._directionForMoveFeature) {
                    this._axisForMoveFeature.moveTargetOnDirectionInWindow(e.origin.startPosition, e.origin.endPosition, this._directionForMoveFeature);
                }
            }
            actionsForMoveFeature._moveFeatureEnd = (e) => {
                if (this._axisForMoveFeature.highlightAxisOrPlane && this._axisForMoveFeature.target._modifyOptions && callback) callback({
                    offset: this._axisForMoveFeature.target._modifyOptions.point?this._axisForMoveFeature.target._modifyOptions.point.offset:this._axisForMoveFeature.target._modifyOptions.offset,
                    currentPosition: this._axisForMoveFeature.target._modelPosition?this._axisForMoveFeature.target._modelPosition:this._axisForMoveFeature.target.positionWGS84
                });

                this._axisForMoveFeature.highlightAxisOrPlane = null;
                this.enableControl = true;
                this._directionForMoveFeature = undefined;
            }

        }
        this.on(e_start_type, actionsForMoveFeature._moveFeatureStart);
        this.on(e_drag_type, actionsForMoveFeature._moveFeatureDrag);
        this.on(e_end_type, actionsForMoveFeature._moveFeatureEnd);
    }

    /**
     * 关闭要素移动功能。移除AxisFrame和GeoMap绑定的点击移动事件。
     * @see  AxisFrame
     */
    disableMoveFeature() {
        if (this._axisForMoveFeature) this._axisForMoveFeature.destroy();
        this._axisForMoveFeature = undefined;
        if (this._actionsForMoveFeature._moveFeatureStart) {
            const { _moveFeatureStart, _moveFeatureDrag, _moveFeatureEnd } = this._actionsForMoveFeature;
            this.off(MapEventType.LEFT_DOWN, _moveFeatureStart);
            this.off(MapEventType.MOUSE_MOVE, _moveFeatureDrag);
            this.off(MapEventType.LEFT_UP, _moveFeatureEnd);
            this._actionsForMoveFeature = {};
        }
        this.GeoDepository.scene.requestRender();
    }

    /**
     * 获取云层shader
     * 
     * @ignore
     * 
     * @returns {Material} 云层shader
     */
    getCloudMaterial() {
        // Creates a composite material with both elevation shading and contour lines
        return new Material({
            fabric: {
                type: "Cloud",
                uniforms: {
                    u_cloudImage: Material.DefaultImageId
                },
                source:
                    "uniform sampler2D u_cloudImage;\n" +
                    "vec4 alphaBlend(vec4 src, vec4 dest, int blendMode);\n" +
                    "czm_material czm_getMaterial(czm_materialInput materialInput)\n" +
                    "{\n" +
                    "    czm_material material = czm_getDefaultMaterial(materialInput);\n" +
                    "    vec4 srcColor = materialInput.color;\n" +
                    "    vec4 cloud = texture2D(u_cloudImage, materialInput.globeTexCoord);\n" +
                    "    float cloudIns = cloud.a * czm_cloudRatio;\n" +
                    "    vec4 finalColor = vec4(0.);\n" +
                    "    if (cloudIns < 1.) {\n" +
                    "      finalColor = mix(finalColor * (1. - cloudIns), vec4(1.), cloudIns);\n" +
                    "    } else {\n" +
                    "      finalColor = vec4(1., 1., 1., cloudIns);\n" +
                    "    }\n" +
                    "    finalColor = alphaBlend(finalColor, srcColor, 1);\n" +
                    "    material.diffuse = finalColor.xyz;\n" +
                    "    material.blendMode = -1;\n" +
                    "    return material;\n" +
                    "}\n",
            },
            translucent: true,
        });
    }

    /**
     * 设置日照时间
     * 
     * @param {Boolean} flag 是否固定日照时刻
     * @param {String} [time="2020/06/22 12:00:00] 日期时刻
     * 
     * @example
     * geomap.setClock(true, '2021/03/31 12:00:00');
     * 
     */
    setClock(flag, time) {
        if (flag) {
        	let datetime = time || "2020/06/22 12:00:00"
            var utc = JulianDate.fromDate(new Date(datetime));//UTC
            this.viewer.clockViewModel.currentTime = JulianDate.addHours(utc, 8, new JulianDate());//北京时间=UTC+8=GMT+8
            // console.log(this.viewer.clockViewModel.currentTime)
        }
    }

    /**
     * 检测是否有调用实时渲染的方法,当没有实时渲染的需求时保持关闭状态，否则开启
	 * @private
     * @example
     * BOSGeo.Util.removeFromArray(geomap.requestRenderModeMethods, 'DynamicWater');
     * geomap._requestRenderModeCheck();
     */
    _requestRenderModeCheck(){
        this.requestRenderMode = this.requestRenderModeMethods.length ===0 ? true : false;
    }
    /**
     * 渲染当前帧 如果requestRenderMode为true,则在场景发生改变的时候,需要调用该方法
     * 
     * @example
     * geomap.render(); // 手动调用渲染当前帧
     * 
     */
    render() {
        this.GeoDepository.scene.requestRender();
    }

    /**
     * 相机飞行到主视图
     * 
     * @param {Number} [duration] 相机飞行持续时间
     * 
     * @example
     * geomap.flyHome(3); 
     */
    flyHome(duration) {
        const viewer = this.GeoDepository.viewer;
        viewer.camera.flyHome(duration);
    }

    /**
     * 全屏模式,去除所有功能按钮
     * 
     */
    requestFullscreen() {
        let scene = this.scene;
        Fullscreen.requestFullscreen(scene.canvas);
    }

    /**
     * 全屏模式,保留功能界面
     * 
     */
    fullScreen() {
        let element = document.documentElement;
        if (document.fullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } else {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullScreen) {
                element.webkitRequestFullScreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                // IE11
                element.msRequestFullscreen();
            }
        }
        this.fullscreen = !this.fullscreen;
    }

    /**
     * 场景控制器，导航工具
     * @param {Object} options
     * @param {Array} [options.defaultResetView = null] 用于在使用重置导航重置地图视图时设置默认视图控制[最小经度，最小纬度，最大经度，最大纬度]，如[70, 12, 145, 60]；不设置时（null）采用flyHome显示默认范围，默认为null。
     * @param {Boolean} [options.enableCompass = true] 用于启用或禁用罗盘。true是启用罗盘，false是禁用罗盘。
     * @param {Boolean} [options.enableZoomControls = true] 用于启用或禁用缩放控件。true是启用，false是禁用。默认值为true。
     * @param {Boolean} [options.enableCompassOuterRing = true] 用于启用或禁用指南针外环。true是启用，false是禁用。默认值为true。
     * @param {Boolean} [options.enableDistanceLegend = false] 用于启用或禁用距离图例。true是启用，false是禁用。默认值为false。
     * @returns {Object} 返回包含罗盘DIV（compassDiv）、缩放控制DIV（navigationControlsDiv）、以及导航工具对象（geoNavigation），便于调整样式。
     * @example
     * var geomap = new BOSGeo.GeoMap('bosgeoContainer');
     * geomap.navigation({
     * defaultResetView :[70, 12, 145, 60],  //默认视图范围
     * enableCompass:true ,                  //启用罗盘
     * enableZoomControls:true ,             //启用缩放控件
     * enableCompassOuterRing:true           //启用指南针外环
     * })
     * var style = navigation.geoNavigation.container.style ;  //导航工具样式
     * style.right = '70px'; //导航工具样式修改
     * style.top = '40px';
     */
    navigation(options ={}){

        // 可选项参数默认配置
        this.navigationOptions = options || {};
        // 用于在使用重置导航重置地图视图时设置默认视图控制。接受的值是Cesium.Cartographic 和 Cesium.Rectangle.
        this.navigationOptions.defaultResetView =  options.defaultResetView && options.defaultResetView.length === 4 ? Rectangle.fromDegrees(options.defaultResetView[0],options.defaultResetView[1],options.defaultResetView[2],options.defaultResetView[3]) : null ;//Rectangle.fromDegrees(70, 13, 135, 50);
        // 用于启用或禁用罗盘。true是启用罗盘，false是禁用罗盘。默认值为true。若是将选项设置为false，则罗盘将不会添加到地图中。
        this.navigationOptions.enableCompass= defaultValue(options.enableCompass, true);
        // 用于启用或禁用缩放控件。true是启用，false是禁用。默认值为true。若是将选项设置为false，则缩放控件将不会添加到地图中。
        this.navigationOptions.enableZoomControls= defaultValue(options.enableZoomControls, true);
        // 用于启用或禁用距离图例。true是启用，false是禁用。默认值为true。若是将选项设置为false，距离图例将不会添加到地图中。
        this.navigationOptions.enableDistanceLegend= defaultValue(options.enableDistanceLegend, false);
        // 用于启用或禁用指南针外环。true是启用，false是禁用。默认值为true。若是将选项设置为false，则该环将可见但无效。
        this.navigationOptions.enableCompassOuterRing= defaultValue(options.enableCompassOuterRing, true);

        let viewer = this.GeoDepository.viewer ;
        // viewer.extend(NavigationMixin, this.navigationOptions);
        let geoNavigation =Navigation(viewer, this.navigationOptions);
        if(viewer.cesiumWidget.navigation && viewer.cesiumWidget.navigation.navigationDiv){
            let compassDiv = viewer.cesiumWidget.navigation.navigationDiv.children[0] ;
            let navigationControlsDiv =viewer.cesiumWidget.navigation.navigationDiv.children[1] ;
            return {compassDiv,navigationControlsDiv,geoNavigation};
        }

    }

    /**
     * 在地图底部显示相机方位和鼠标位置信息
     */
    show3DCoordinates() {
        let viewer = this.GeoDepository.viewer;
        let coordinatesDiv = document.getElementById("bosgeo-mapCoordinates");
        if (coordinatesDiv) {
            coordinatesDiv.style.display = "block";
        } else {
            coordinatesDiv = document.createElement("div");
            coordinatesDiv.id = "bosgeo-mapCoordinates";
            coordinatesDiv.className = "bosgeo-mapCoordinates";
            coordinatesDiv.innerHTML = "<span id='cd_label' style='position:absolute;right:0px;bottom:10px;font-size:13px;text-align:center;font-family:微软雅黑;color:#edffff;'>暂无坐标信息</span>";
            viewer.container.append(coordinatesDiv);
        }
        let handlerMap3DCoordinates = new ScreenSpaceEventHandler(viewer.scene.canvas);
        this.handlerMap3DCoordinates = handlerMap3DCoordinates;
        handlerMap3DCoordinates.setInputAction(function (movement) {
            let point =GeoUtil.getPickPosition(movement.endPosition)
            //视角海拔高度
            let cameraInfo =GeoUtil.getCameraPositionOrientation2();
            !point && (point = [0, 0]);
            coordinatesDiv.innerHTML = "<span id='cd_label' style='font-size:13px;display:block;text-align:center;font-family:微软雅黑;color:#c8d7d7;'>" + "&nbsp;&nbsp;&nbsp;&nbsp;视高:" + cameraInfo.position[2] + "米" + "&nbsp;&nbsp;偏航角:" + cameraInfo.orientation[0].toFixed(3) + "°" + "&nbsp;&nbsp;俯仰角:" + cameraInfo.orientation[1].toFixed(3) + "°" + "&nbsp;&nbsp;翻滚角:" + cameraInfo.orientation[2].toFixed(3) + "°"+ "&nbsp;&nbsp;&nbsp;&nbsp;经度:" + point[0].toFixed(6) + "&nbsp;&nbsp;纬度:" + point[1].toFixed(6) + "&nbsp;&nbsp;" + "&nbsp;&nbsp;海拔:" + point[2] + "米"+  "</span>";
        }, ScreenSpaceEventType.MOUSE_MOVE);
    }

    /**
     * 移除地图底部显示的相机方位和鼠标位置信息
     */
    remove3DCoordinates(){
        let coordinatesDiv = document.getElementById("bosgeo-mapCoordinates");
        if(coordinatesDiv){
            coordinatesDiv.style.display = "none";
        }
        if(this.handlerMap3DCoordinates ){
            this.handlerMap3DCoordinates.destroy();
            this.handlerMap3DCoordinates = null;
        }
    }
    /**
     * 缩放
     * 
     * @param {Boolean} flag 为true时放大，为false时缩小
     */
    zoomInOut(flag) {
        const viewer = this.GeoDepository.viewer;
        //缩放
        if (flag) {
            // console.log('放大')
            const height = Cartographic.fromCartesian(viewer.camera.position).height;
            viewer.camera.zoomIn(height * 0.4);
        }
        else {
            // console.log('缩小')
            const height = Cartographic.fromCartesian(viewer.camera.position).height;
            viewer.camera.zoomOut(height * 0.4);

        }
    }

    /**
     * 退出全屏
     */
    exitFullscreen() {
        Fullscreen.exitFullscreen();
    }

    /**
     * 恢复正北方向
     */
    restNorth() {
        const viewer = this.GeoDepository.viewer;
        viewer.scene.camera.setView({
            destination: viewer.camera.position,
            orientation: {
                heading: 0, //正北方向
                pitch: viewer.camera.pitch,
                roll: 0
            }
        });
    }
  

    /**
     * 通过包围盒范围飞至观察点上方
     * 
     * @param {Array<Number>} position 观察点的经纬度坐标；
     * @param {Number} distance 观察距离。
     * 
     */
    flyToBoundingSphere(position, distance) {
        const viewer = this.GeoDepository.viewer;
        // /Bounding sphere是让镜头靠近的Home键 //homebutton默认跳转位置
        let boundingSphere = new BoundingSphere(Cartesian3.fromDegrees(position[0],position[1]), distance);
        // Fly to custom position
        viewer.camera.flyToBoundingSphere(boundingSphere);
    }

	/**
     * 飞至指定位置
     * 
     * @param {Cartesian3|Rectangle} dest 相机三维笛卡尔坐标位置或者视图范围；
     * @param {HeadingPitchRoll} hpr 相机方位角,单位为弧度；
     * @param {Function} callback 飞行到目的地后的回调函数。
     * @example	 	
	 * //当前视角的dest和hpr可通过BOSGeo.GeoUtil.getCameraPositionOrientation2()接口获取
		function completeCallback(){
			alert("您已到达目的地!")
		} 
		geoViewer.flyTo(
			{x: -9439629.577977773,y: 35229177.18964299,z: 21138934.807071898},
			{heading: 6.283185307179586,pitch: -1.5687578423337296,roll: 0},
			completeCallback
		);
     */
	flyTo(dest, hpr = new BOSGeo.HeadingPitchRange(0.0, -0.5, 1000), callback) {
		const viewer = this.GeoDepository.viewer;
		viewer.camera.flyTo({
			destination: dest,
			orientation: hpr,
			complete: function () {
				if (defined(callback)) {
					callback();
				}
			}
		});
	}

    /**
     * 设置相机视角
     * 
     * @param {Cartesian3|Rectangle} dest 相机在三维笛卡尔坐标系中的位置或者视图范围
     * @param {HeadingPitchRoll} hpr 相机方位角,单位为弧度；
     * 
     * @example
     * var dest=BOSGeo.Cartesian3.fromDegrees(114, 22.5, 10000);
     * var hpr = {
     *  heading: BOSGeo.Math.toRadians(0),
     *  pitch: BOSGeo.Math.toRadians(-45),
     *  roll: BOSGeo.Math.toRadians(0),
     * };
     * geoViewer.setView(dest, hpr);
     */
    setView(dest, hpr) {
        const viewer = this.GeoDepository.viewer;
        viewer.camera.setView({
            destination: dest, // 设置位置
            orientation: hpr
        });
    }

    /**
     * 飞行定位到一个矩形
     * 
     * @param {Array.<Cartesian3>} cartesians 笛卡尔坐标数组 Array.<Cartesian3>；
     * @param {Number} [heading=0.0] 偏航角，单位为度，正北,由正北向东偏向为正；
     * @param {Number} [pitch=-90] 俯仰角，单位为度， ENU局部坐标系，XY平面的旋转角度，平面下为负，上为正；
     * @param {Number} [scale=1.0]  范围缩放倍率；
     * @param {Number} [duration=3]  持续时间,单位为秒；
     * @param {Function} [callBack=null]  回调函数，定位完成后执行。
     * 
     */
    flyToRectangle(cartesians, heading = 0.0, pitch = -90, scale = 1.0, duration = 3, callBack = null) {
        const viewer = this.GeoDepository.viewer;
        if (!viewer) {
            console.log('三维球未初始化！');
            return;
        }
        if (!Array.isArray(cartesians)) {
            console.log('定位范围不对！');
            return;
        }
        if (scale < 0.1) {
            scale = 1.0;
        }
        var rec = Rectangle.fromCartesianArray(cartesians);
        var boundingSphere = BoundingSphere.fromRectangle3D(rec);
        boundingSphere.radius = boundingSphere.radius * scale;
        viewer.camera.flyToBoundingSphere(boundingSphere, {
            duration: duration,
            maximumHeight: undefined,
            complete: function () {
                if (callBack) {
                    callBack();
                } else {
                    console.log('定位失败！');
                }
            },
            cancel: function () {
                console.log('定位取消！');
            },
            offset: {
                heading: CesiumMath.toRadians(heading),
                pitch: CesiumMath.toRadians(pitch),
                range: 0.0
            }
        });
    }


    /**
     * 获取当前相机的坐标和方位
     * 
     * @return {Object} posAndOri -返回相机三维笛卡尔坐标(position)和方位信息(orientation)
     */
    getCameraPositionOrientation() {
        const viewer = this.GeoDepository.viewer;
        let position = viewer.camera.position;
        position = { x: position.x, y: position.y, z: position.z };
        let orientation = {
            heading: viewer.camera.heading,
            pitch: viewer.camera.pitch,
            roll: viewer.camera.roll,
        };
        let posAndOri = {
            position: position,
            orientation: orientation
        };
        return posAndOri;
    }

    /**
     * 地图事件监听
     * 
     * @param {String | MapEventType} eventType 地图事件类型；
     * @param {Function} callBack 监听函数；
     * @param {MapPickType | Array<MapPickType> | null} wishResult 选填 期待返回的结果类型。
     * 
     * @example
     * var map = new BOSGeo.GeoMap('container');
     * map.on(BOSGeo.MapEventType.LEFT_CLICK,(e)=>{
     *      console.log(e.world_position);
     *      console.log(e.feature);//获取到的原始数据
     *      if(e.feature){
     *          //地图拾取的feature是模型的片段或矢量图标的片段，使用本函数获取到对应的模型和矢量元素。
                const target = BOSGeo.GeoUtil.getPickTargetFeature(e.feature).target;
            }
     * }, [BOSGeo.MapPickType.WORLD_POSITION, BOSGeo.MapPickType.FEATURE]);
     */
    on(eventType, callBack, wishResult = MapPickType.WINDOW_POSITION) {
        const originCallBack = callBack;
        //属于地图事件，也属于屏幕事件
        if (eventType.startsWith('MAP_ON_SCREEN_') && Object.values(MapEventType).includes(eventType)) {
            if (typeof wishResult === 'string') wishResult = [wishResult]
            const decoratedCallback = ((w) => (e) => {
                const r = e.window_position ? this._getListenResultByWish(e, w) : e;
                originCallBack(r);
            })(wishResult);
            this._listener._specialOn(eventType, callBack, decoratedCallback);
        } else {
            this._listener.on(eventType, callBack);
        }
    }

    /**
     * 一次性地图事件监听
     * 
     * @param {String | MapEventType} eventType 地图事件类型； 
     * @param {Function} callBack 监听函数
     * @param {MapPickType | Array<MapPickType> | null} wishResult 选填 期待返回的结果类型
     * 
     * @example
     * var map = new BOSGeo.GeoMap('container');
     * map.once(BOSGeo.MapEventType.LEFT_CLICK,(result)=>{
     *      console.log(result);
     * }, [BOSGeo.MapPickType.WORLD_POSITION, BOSGeo.MapPickType.FEATURE]);
     */
    once(eventType, callBack, wishResult) {
        const wrappedCallback = (value) => {
            this.off(eventType, wrappedCallback);
            callBack(value);
        }
        this.on(eventType, wrappedCallback, wishResult)
    }

    /**
     * 根据需求，返回需要的结果
     * 
     * @private
     * 
     * @param {Object} e cesium的屏幕操作所提供的事件
     * @param {Array<MapPickType>} wishes 期待的结果数组
     * @return {Object} 一个包含期待结果对象
     * 
     */
     _getListenResultByWish(e, wishes) {
        const result = { origin: e.origin };
        const { WORLD_POSITION, WINDOW_POSITION, WGS84_POSITION, FEATURE } = MapPickType;


        const getWish = (type) => {
            if (e.window_position === undefined) return undefined;
            if (e[type]) return e[type];

            if (type === WINDOW_POSITION) {
                return e.window_position;

            } else if (type === WORLD_POSITION) {
                //一种获得世界坐标的方式:获取地表坐标
                // const ray = this.viewer.camera.getPickRay(e.window_position);
                // return e[type] = this.viewer.scene.globe.pick(ray, this.viewer.scene);
                //另一种获得世界坐标的方式：获取场景坐标
                return e[type] = this.viewer.scene.pickPosition(e.window_position);
            } else if (type === WGS84_POSITION) {
                let wp = e.WORLD_POSITION;
                if (!wp) {
                    //const ray = this.viewer.camera.getPickRay(e.window_position);
                    //wp = e.WORLD_POSITION = this.viewer.scene.globe.pick(ray, this.viewer.scene);
                    //另一种获得世界坐标的方式
                    wp = e.WORLD_POSITION = this.viewer.scene.pickPosition(e.window_position);
                    if(!wp) {
                        const ray = this.viewer.camera.getPickRay(e.window_position);
                        wp = e.WORLD_POSITION = this.viewer.scene.globe.pick(ray, this.viewer.scene);
                        if(!wp){
                            wp = e.WORLD_POSITION =  this.viewer.camera.pickEllipsoid(e.window_position, this.viewer.scene.globe.ellipsoid); //返回在椭球上面的点的坐标
                            if(!wp) {
                                throw new DeveloperError('此点不在地球上');
                            }
                            // return undefined;
                        }
                    }
                }
                const r = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(wp);
                return e[type] = { longitude: CesiumMath.toDegrees(r.longitude), latitude: CesiumMath.toDegrees(r.latitude),height: r.height };
            } else if (type === FEATURE) {
                let pick = this.viewer.scene.pick(e.window_position);
                if(pick && pick.primitive && pick.primitive.bosGroup&& pick.primitive.bosGroup.layer) {
                    pick.layerType = pick.primitive.bosGroup.layer.layerType;
                }
                return pick;
            }
        }
        if (typeof wishes === 'string') {
            result[wishes.toLowerCase()] = getWish(wishes);
        } else {
            wishes.forEach((w) => {
                result[w.toLowerCase()] = getWish(w);
            })
        }
        return result;
    }

    /**
     * 触发事件
     * 
     * @ignore
     * 
     * @param {String | MapEventType} eventType 地图事件类型
     * @param {*} value 触发事件时可传入任意值
     */
    fire(eventType, value) {
        this._listener.fire(eventType, value);
    }

    /**
     * 判断该函数是否已绑定该事件
     * 
     * @ignore
     * 
     * @param {String | MapEventType} eventType 地图事件类型
     * @param {Function} callBack 
     * @returns {Boolean} true则已绑定
     */
    hasOn(eventType, callBack) {
        return this._listener.hasOn(eventType, callBack);
    }

    /**
     * 取消地图事件的监听
     * @param {String | MapEventType} eventType 地图事件类型
     * @param {Function} [callBack] 回调函数，不设置时则会清除eventType对应的所有监听事件函数。
	 * @example
	 * 		geomap.off(BOSGeo.MapEventType.LEFT_CLICK)
     */
    off(eventType, callBack) {
        this._listener.off(eventType, callBack);
    }

    /**
     * 点击模型高亮与信息查询
     * 
     * （无实际用途，建议从后续版本中删除）
     * @ignore
     */
    handlerLEFT_CLICK() {
        let handler = this.GeoDepository.viewer.screenSpaceEventHandler;

        handler.setInputAction(e => {
            let windowCoord = e.position;
            this._enableHighlight && this.modelStyler.onClick(windowCoord);
            this.featureInfo.onClick(windowCoord);
            this._pick.raiseEvent(GeoUtil.getPickPosition(windowCoord) || []);
            /* let layer = this._layers.getPickLayer(windowCoord);
            defined(layer) && layer.onClick && layer.onClick(layer);  */
        }, ScreenSpaceEventType.LEFT_CLICK);
    }

    /**
     * 点击模型高亮
     * 
     * （无实际用途，建议从后续版本中删除）
     * @ignore
     */
    handlerLEFT_CLICK_CTRL() {
        let handler = this.GeoDepository.viewer.screenSpaceEventHandler;
        handler.setInputAction(e => {
            this._enableHighlight && this.modelStyler.onCtrlClick(e.position);
        }, ScreenSpaceEventType.LEFT_CLICK, KeyboardEventModifier.CTRL);
    }

    /**
     * 地图缩放层级限制
     * 
     * @private
     */
    _limitMapLevel() {
        let handler = this.GeoDepository.viewer.screenSpaceEventHandler;
        let scene = this.GeoDepository.scene;

        // 限定地图缩放层级
        handler.setInputAction(e => {
            var tilesToRender = scene.globe._surface._tilesToRender;

            if (tilesToRender.length === 0) return;
            var level = tilesToRender[0]._level;
            scene.screenSpaceCameraController.enableZoom = !((level < this.minLevel && e < 0) || (level > this.maxLevel && e > 0));
        }, ScreenSpaceEventType.WHEEL);
    }

    /**
     * 点击之后的属性信息框更新
     * （直接使用无效，需FeatureInfo配合，建议从后续版本中删除）
     * @ignore
     */
    scenePostRender() {
        let scene = this.GeoDepository.scene;
        scene.postRender.addEventListener(() => {
            this._showAttribute && this.featureInfo.onPostRender();
            this.postRenderCallback && this.postRenderCallback()
        });
    }

    /**
     * 销毁
     */
    destroy() {
        this.viewer.destroy();
        this.viewer = null;
        this.scene = null;
        this.GeoDepository.viewer = null;
        this.GeoDepository.scene = null;
        this.GeoDepository.camera = null;
        this.GeoDepository.geomap = null;
        destroyObject(this);

    }

    /**
     * 是否禁用鼠标操作
     * 
     * @type {Boolean}
     * @default true
     */
    get enableControl() {
        return this._enableControl;
    }
    set enableControl(value) {
        let scene = this.GeoDepository.viewer.scene;
        scene.screenSpaceCameraController.enableRotate = value;
        scene.screenSpaceCameraController.enableTranslate = value;
        scene.screenSpaceCameraController.enableZoom = value;
        scene.screenSpaceCameraController.enableTilt = value;
        scene.screenSpaceCameraController.enableInputs = value;
        this._enableControl = value;
    }

    // get enablePicking() {
    //     return this._enablePicking;
    // }
    // set enablePicking(value) {
    //     this._enablePicking = value;
    //     this.setPickState(value, this.selectCallback, this.positionCallback);
    // }

    // /**
    //  * 设置点击事件
    //  * @param {Boolean} flag
    //  * @param {Object} options
    //  */
    // setPickState(flag = this._enablePicking, options={}) {
    //     let handler = this.screenspacehandler;
    //     let viewer = GeoDepository.viewer;
    //     let scene = viewer.scene;
    //     let canvas = scene.canvas;
    //     this.selectCallback = defaultValue(options.selectCallback,this.selectCallback);
    //     this.positionCallback = defaultValue(options.positionCallback,this.positionCallback);
    //     if(flag) {
    //         this.defaultLeftDown = (e) => {
    //             this.leftDownMousePosition = new Cartesian2(e.clientX,e.clientY);
    //         }

    //         this.defaultLeftUp = (e) => {
    //             const cartesian2 = new Cartesian2(e.clientX,e.clientY);
    //             const distance = Cartesian2.distance(this.leftDownMousePosition,cartesian2);
    //             if(distance < 3) {
    //                 const pick = viewer.scene.pick(cartesian2);
    //                 if(this.positionCallback) {
    //                     const carteisan = viewer.scene.pickPosition(cartesian2);
    //                     this.positionCallback(carteisan);
    //                 }
    //                 if(defined(pick)){
    //                     this.selectCallback(pick);
    //                 }else {
    //                     if (this.selectCallback) {
    //                         this.selectCallback(undefined);
    //                     }
    //                 }
    //             }
    //         }

    //         canvas.addEventListener('pointerdown',this.defaultLeftDown);
    //         canvas.addEventListener('pointerup',this.defaultLeftUp);
    //         // canvas.addEventListener('dblclick',this.defaultDblclick);
    //     }else {
    //         if(this.defaultLeftDown){
    //             canvas.removeEventListener('pointerdown',this.defaultLeftDown);
    //         }
    //         if(this.defaultLeftUp){
    //             canvas.removeEventListener('pointerup',this.defaultLeftUp);
    //         }
    //         // if(this.defaultDblclick){
    //         //     canvas.removeEventListener('dblclick',this.defaultDblclick);
    //         // }
    //     }
    // }

}

/**
 * 修复Cesium不支持KHR_technique_webgl的GLTF扩展的问题
 * @private
 * @param {Model} gltf 
 */
var fixGltf = function (gltf) {
    if (!gltf.extensionsUsed) {
        return;
    }
    var v = gltf.extensionsUsed.indexOf('KHR_technique_webgl');
    if (v >= 0) {
        var t = gltf.extensionsRequired.indexOf('KHR_technique_webgl');
        gltf.extensionsRequired.splice(t, 1, 'KHR_techniques_webgl');
        gltf.extensionsUsed.splice(v, 1, 'KHR_techniques_webgl');
        gltf.extensions = gltf.extensions || {};
        gltf.extensions['KHR_techniques_webgl'] = {};
        gltf.extensions['KHR_techniques_webgl'].programs = gltf.programs;
        gltf.extensions['KHR_techniques_webgl'].shaders = gltf.shaders;
        gltf.extensions['KHR_techniques_webgl'].techniques = gltf.techniques;
        var techniques = gltf.extensions['KHR_techniques_webgl'].techniques;

        gltf.materials.forEach(function (mat, index) {
            gltf.materials[index].extensions || (gltf.materials[index].extensions = { KHR_technique_webgl: {} }); // vtxf 181025
            gltf.materials[index].extensions['KHR_technique_webgl'].values = gltf.materials[index].values;
            gltf.materials[index].extensions['KHR_techniques_webgl'] = gltf.materials[index].extensions['KHR_technique_webgl'];

            var vtxfMaterialExtension = gltf.materials[index].extensions['KHR_techniques_webgl'];
            vtxfMaterialExtension.technique || (vtxfMaterialExtension.technique = gltf.materials[index].technique); // vtxf 181025


            for (var value in vtxfMaterialExtension.values) {
                var us = techniques[vtxfMaterialExtension.technique].uniforms;
                for (var key in us) {
                    if (us[key] === value) {
                        vtxfMaterialExtension.values[key] = vtxfMaterialExtension.values[value];
                        delete vtxfMaterialExtension.values[value];
                        break;
                    }
                }
            };
        });

        techniques.forEach(function (t) {
            for (var attribute in t.attributes) {
                var name = t.attributes[attribute];
                t.attributes[attribute] = t.parameters[name];
            };

            for (var uniform in t.uniforms) {
                var name = t.uniforms[uniform];
                t.uniforms[uniform] = t.parameters[name];
            };
        });

    }
}
Object.defineProperties(Model.prototype, {
    _cachedGltf: {
        set: function (value) {
            this._vtxf_cachedGltf = value;
            if (this._vtxf_cachedGltf && this._vtxf_cachedGltf._gltf) {
                fixGltf(this._vtxf_cachedGltf._gltf);
            }
        },
        get: function () {
            return this._vtxf_cachedGltf;
        }
    }
});

export default GeoMap;