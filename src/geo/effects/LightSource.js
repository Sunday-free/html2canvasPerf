import defined from 'cesium/Core/defined';
import Cartesian3 from 'cesium/Core/Cartesian3'
import Camera  from "cesium/Scene/Camera"
import ShadowMode  from "cesium/Scene/ShadowMode";
import OrthographicOffCenterFrustum from "cesium/Core/OrthographicOffCenterFrustum.js";
import Cartographic  from "cesium/Core/Cartographic";
import EllipsoidTerrainProvider from "cesium/Core/EllipsoidTerrainProvider"
import {GeoDepository} from "../core/GeoDepository";
import HeadingPitchRoll  from 'cesium/Core/HeadingPitchRoll';
import when  from 'cesium/ThirdParty/when';
import sampleTerrain  from 'cesium/Core/sampleTerrain.js';
import ShadowMap  from 'cesium/Scene/ShadowMap.js';
import ScreenSpaceEventType  from 'cesium/Core/ScreenSpaceEventType';
import ScreenSpaceEventHandler  from 'cesium/Core/ScreenSpaceEventHandler';
import CesiumMath  from "cesium/Core/Math";
import  Transforms  from"cesium/Core/Transforms";
import Model from "cesium/Scene/Model";
import createWorldTerrain from "cesium/Core/createWorldTerrain.js";
import PointGraphics  from 'cesium/DataSources/PointGraphics.js';
import Entity from 'cesium/DataSources/Entity.js'
import Color  from"cesium/Core/Color";

/**
 * 光源 未完善
 *
 * @ignore
 */
class LightSource{
    /**
     *
     * @param options
     */
    constructor(options){
         this.viewModel = {
            lightAngle : options.lightAngle||40.0,
            lightAngleEnabled : options.lightAngleEnabled||true,
            lightHorizon : options.lightHorizon||70.0,
            lightHorizonEnabled : options.lightHorizonEnabled||true,
            distance : options.distance||10000.0,
            distanceEnabled : options.distanceEnabled||true,
            radius : options.radius||500.0,
            radiusEnabled : options.radiusEnabled||true,
            darkness : options.darkness||0.3,
            shadows : options.shadows||true,
            terrain : options.terrain||true,
            globe : options.globe||true,
            terrainCast : options.terrainCast||true,
            terrainReceive : options.terrainReceive||true,
            debug : options.debug||false,
            freeze : options.freeze||false,
            cascadeColors : options.cascadeColors||false,
            cascadeColorsEnabled : options.cascadeColorsEnabled||true,
            fitNearFar : options.fitNearFar||true,
            fitNearFarEnabled : options.fitNearFarEnabled||true,
            softShadows : options.softShadows||false,
            softShadowsEnabled : options.softShadowsEnabled||true,
            cascadeOptions : [1, 4],
            cascades : options.cascades||4,
            cascadesEnabled : options.cascadesEnabled||true,
            lightSourceOptions : ['Freeform', 'Sun', 'Fixed', 'Point', 'Spot'],
            lightSource : options.lightSource||'Freeform',
            sizeOptions : [256, 512, 1024, 2048],
            size : options.size||1024,
            modelOptions : ['Wood Tower', 'Cesium Air', 'Cesium Man', 'Transparent Box', 'Shadow Tester', 'Shadow Tester 2', 'Shadow Tester 3', 'Shadow Tester 4', 'Shadow Tester Point'],
            model : options.model||'Shadow Tester',
             models:options.models,
             locationOptions : ['Exton', 'Everest', 'Pinnacle PA', 'Seneca Rocks', 'Half Dome', '3D Tiles'],
            location : options.location||'Pinnacle PA',
             position: options.position||[114.054950,22.553271,10],      //位置
             offset:options.offset||[30,30,50],
             modelPositionOptions : ['Center', 'Ground', 'High', 'Higher', 'Space'],
            modelPosition : options.modelPositionOptions||'Center',
            grid : options.grid||false,
            biasModes : [
                new _biasOptions({
                    type : 'terrain',
                    polygonOffset : true,
                    polygonOffsetFactor : 1.1,
                    polygonOffsetUnits : 4.0,
                    normalOffset : true,
                    normalOffsetScale : 0.5,
                    normalShading : true,
                    normalShadingSmooth : 0.3,
                    depthBias : 0.0001
                }),
                new _biasOptions({
                    type : 'primitive',
                    polygonOffset : true,
                    polygonOffsetFactor : 1.1,
                    polygonOffsetUnits : 4.0,
                    normalOffset : true,
                    normalOffsetScale : 0.1,
                    normalShading : true,
                    normalShadingSmooth : 0.05,
                    depthBias : 0.00001
                }),
                new _biasOptions({
                    type : 'point',
                    polygonOffset : false,
                    polygonOffsetFactor : 1.1,
                    polygonOffsetUnits : 4.0,
                    normalOffset : false,
                    normalOffsetScale : 0.0,
                    normalShading : true,
                    normalShadingSmooth : 0.1,
                    depthBias : 0.0005
                })
            ],
            // biasMode : knockout.observable()
        };

        this.uiOptions = {
            all : ['lightHorizon', 'lightAngle', 'distance', 'radius', 'terrainCast', 'cascades', 'cascadeColors', 'fitNearFar', 'softShadows'],
            disable : {
                'Freeform' : ['radius'],
                'Sun' : ['lightHorizon', 'lightAngle', 'radius'],
                'Fixed' : ['lightHorizon', 'lightAngle', 'distance', 'radius', 'cascades', 'cascadeColors', 'fitNearFar'],
                'Point' : ['lightHorizon', 'lightAngle', 'distance', 'cascades', 'cascadeColors', 'fitNearFar', 'softShadows'],
                'Spot' : ['lightHorizon', 'lightAngle', 'distance', 'radius', 'cascades', 'cascadeColors', 'fitNearFar']
            },
            modelUrls : {
                'Shadow Tester' :'http://192.168.1.42:8086/build/resource/models/testSSR.glb', //'cesium/Apps/SampleData/models/ShadowTester/Shadow_Tester.gltf',
            },
            locations : {
                'Pinnacle PA' : {
                    'centerLongitude' : 114.054950,
                    'centerLatitude' : 22.553271
                }
            }
        };
        this.init();
    }


    /**
     * 初始化
     */
    init(){
        let viewer =GeoDepository.viewer;
        var scene = viewer.scene;
        var camera = scene.camera;
        scene.debugShowFramesPerSecond = true;
        viewer.shadows = true;
        viewer.terrainShadows = true ? ShadowMode.ENABLED : ShadowMode.DISABLED;

        this.context=scene.context;
        let lightSource = this.viewModel.lightSource;

        // var lightCamera;

        if (lightSource === 'Freeform') {
            this.lightCamera = this.freeformLightCamera;
        } else if (lightSource === 'Sun') {
            this.lightCamera = this.sunCamera;
        }

        this.freeformLightCamera = new Camera(scene);
        this.sunCamera = scene._sunCamera;
        this.fixedLightCamera = new Camera(scene);
        this.pointLightCamera = new Camera(scene);
        this.spotLightCamera = new Camera(scene);

        // var lightCenter = Cartesian3.fromDegrees(116.044, 30.109, 200.0);
        // var camera = new Camera(viewer.scene);
        // camera.position = lightCenter;

        // this.shadowMap = new ShadowMap({
        //     context: scene.context,
        //     lightCamera: camera,
        //     maxmimumDistance: 10000.0,
        //     pointLightRadius: 1000.0,
        //     darkness: 0.1,
        //     cascadesEnabled: false,
        //     isPointLight: true,
        //     softShadows: false
        // });

        // this.shadowMap.enabled = true;
        // this.shadowMap.debugShow = true;
        // scene.shadowMap = this.shadowMap;

        this.updateLocation();
        this.handlerClick();
    }

    /**
     * 更新光方向
     */
    updateLightDirection() {
        var offset = new Cartesian3();
        var scene = GeoDepository.scene;

        // var location = this.uiOptions.locations[this.viewModel.location];
        // var center = Cartesian3.fromDegrees(location.centerLongitude, location.centerLatitude, location.height);
        let location=this.viewModel.position
        var center = Cartesian3.fromDegrees(location[0], location[1], location[2]);
        let lightHorizon = CesiumMath.toRadians(this.viewModel.lightHorizon);
        let lightAngle = CesiumMath.toRadians(this.viewModel.lightAngle);
        offset.z = Math.cos(lightHorizon);
        offset.x = Math.sin(lightAngle) * (1.0 - offset.z);
        offset.y = Math.cos(lightAngle) * (1.0 - offset.z);

        this.freeformLightCamera.lookAt(center, offset);
    }

    /**
     * 更新shadowMap
     */
     updateSettings() {
        let scene =GeoDepository.scene
        let context = scene.context;
        let camera = scene.camera;
        let globe = scene.globe;
        let shadowMap=this.shadowMap;

        shadowMap.maximumDistance = Number(this.viewModel.distance);
        shadowMap._pointLightRadius = Number(this.viewModel.radius);
        shadowMap._fitNearFar = this.viewModel.fitNearFar;
        shadowMap.darkness = this.viewModel.darkness;
        shadowMap.debugShow = this.viewModel.debug;
        shadowMap.debugFreezeFrame = this.viewModel.freeze;
        shadowMap.enabled = this.viewModel.shadows;
        shadowMap.size = this.viewModel.size;
        shadowMap.debugCascadeColors = this.viewModel.cascadeColors;
        shadowMap.softShadows = this.viewModel.softShadows;

        // Update biases
        // for (var i = 0; i < this.viewModel.biasModes.length; ++i) {
        //     var biasMode = this.viewModel.biasModes[i];
        //     var bias = shadowMap['_' + biasMode.type + 'Bias'];
        //     bias.polygonOffset = !shadowMap._isPointLight && shadowMap._polygonOffsetSupported && biasMode.polygonOffset;
        //     bias.polygonOffsetFactor = biasMode.polygonOffsetFactor;
        //     bias.polygonOffsetUnits = biasMode.polygonOffsetUnits;
        //     bias.normalOffset = biasMode.normalOffset;
        //     bias.normalOffsetScale = biasMode.normalOffsetScale;
        //     bias.normalShading = biasMode.normalShading;
        //     bias.normalShadingSmooth = biasMode.normalShadingSmooth;
        //     bias.depthBias = biasMode.depthBias;
        // }

        // Update render states for when polygon offset values change
        shadowMap.debugCreateRenderStates();

        // Force all derived commands to update
        shadowMap.dirty = true;

        globe.shadows = ShadowMode.fromCastReceive(this.viewModel.terrainCast, this.viewModel.terrainReceive);
        globe.show = this.viewModel.globe;
        scene.skyAtmosphere.show = this.viewModel.globe;
    }

    /**
     * 更新shadowMap 类型
     *
     */
    updateShadows() {
        let scene =GeoDepository.scene
        // this.freeformLightCamera = new Camera(scene);
        // this.sunCamera = scene._sunCamera;
        // this.fixedLightCamera = new Camera(scene);
        // this.pointLightCamera = new Camera(scene);
        // this.spotLightCamera = new Camera(scene);
        let cascades = this.viewModel.cascades;
        let lightSource = this.viewModel.lightSource;
        // var lightCamera;

        if (lightSource === 'Freeform') {
            this.lightCamera = this.freeformLightCamera;
        } else if (lightSource === 'Sun') {
            this.lightCamera = this.sunCamera;
        }

        let shadowOptions;

        if (lightSource === 'Fixed') {
            shadowOptions = {
                context : this.context,
                lightCamera : this.fixedLightCamera,
                cascadesEnabled : false
            };
        } else if (lightSource === 'Point') {
            shadowOptions = {
                context : this.context,
                lightCamera : this.pointLightCamera,
                isPointLight : true
            };
        } else if (lightSource === 'Spot') {
            shadowOptions = {
                context : this.context,
                lightCamera : this.spotLightCamera,
                cascadesEnabled : false
            };
        } else if (cascades === 4) {
            shadowOptions = {
                context : this.context,
                lightCamera : this.lightCamera
            };
        } else if (cascades === 1) {
            shadowOptions = {
                context : this.context,
                lightCamera : this.lightCamera,
                numberOfCascades : 1
            };
        }

        scene.shadowMap.destroy();
        scene.shadowMap = new ShadowMap(shadowOptions);

        // scene.shadowMap.context=shadowOptions.context;
        // scene.shadowMap.lightCamera=shadowOptions.lightCamera;
        // scene.shadowMap.context=shadowOptions.context;

        this.shadowMap = scene.shadowMap;
        this.shadowMap.enabled = true;
        this.shadowMap.debugShow = true;

        this.updateSettings();
        // this.updateUI();
    }

    /**
     * 更新UI
     * @private
     */
    updateUI() {
        this.uiOptions.all.forEach(function(setting) {
            if (this.uiOptions.disable[this.viewModel.lightSource].indexOf(setting) > -1) {
                this.viewModel[setting + 'Enabled'] = false;
            } else {
                this.viewModel[setting + 'Enabled'] = true;
            }
        });
    }

    /**
     * 获取模型相对位置
     * @returns {number}
     */
    getModelPosition() {
        if (this.viewModel.modelPosition === 'Ground') {
            return 0.0;
        } else if (this.viewModel.modelPosition === 'Center') {
            return 50.0;
        } else if (this.viewModel.modelPosition === 'High') {
            return 5000.0;
        } else if (this.viewModel.modelPosition === 'Higher') {
            return 20000.0;
        } else if (this.viewModel.modelPosition === 'Space') {
            return 10000000.0;
        }
    }

    /**
     * 更新模型位置
     * @private
     */
    updateLocation() {
        // Get the height of the terrain at the given longitude/latitude, then create the scene.
        // var location = this.uiOptions.locations[this.viewModel.location];
        // var positions = [new Cartographic.fromDegrees(location.centerLongitude, location.centerLatitude)];
        let location=this.viewModel.position
        let positions = [new Cartographic.fromDegrees(location[0], location[1])];

        var ellipsoidTerrainProvider = new EllipsoidTerrainProvider();
        // let cesiumTerrainProvider = this.viewModel.terrain && createWorldTerrain();
        // let terrainProvider = this.viewModel.terrain ? cesiumTerrainProvider : ellipsoidTerrainProvider;
        let terrainProvider =  ellipsoidTerrainProvider;
        GeoDepository.scene.globe.terrainProvider = terrainProvider;
        let promise = sampleTerrain(terrainProvider, 11, positions);
        let that=this
        when(promise, function(updatedPositions) {
            location.height =updatedPositions[0].height + that.getModelPosition();
            that.createScene();
        });
    }

    /**
     * 创建场景
     * @private
     */
    createScene() {
        // var location = this.uiOptions.locations[this.viewModel.location];
        // var center = Cartesian3.fromDegrees(location.centerLongitude, location.centerLatitude, location.height);
        let position=this.viewModel.position
        let center = Cartesian3.fromDegrees(position[0], position[1], position[2]);
        // GeoDepository.viewer.camera.flyTo({
        //     destination : center
        // });
        let lcenter = Cartesian3.fromDegrees(position[0], position[1], position[2]);
        lcenter.x+=this.viewModel.offset[0];
        lcenter.y+=this.viewModel.offset[1];
        lcenter.z+=this.viewModel.offset[2];

        let frustumSize = 55.0;
        let frustumNear = 1.0;
        let frustumFar = 400.0;
        let frustum = new OrthographicOffCenterFrustum();
        frustum.left = -frustumSize;
        frustum.right = frustumSize;
        frustum.bottom = -frustumSize;
        frustum.top = frustumSize;
        frustum.near = frustumNear;
        frustum.far = frustumFar;

        this.fixedLightCamera.frustum = frustum;
        // this.fixedLightCamera.lookAt(center, new Cartesian3(30.0, 30.0, 50.0));
        this.fixedLightCamera.lookAt(center, new Cartesian3(this.viewModel.offset[0], this.viewModel.offset[1], this.viewModel.offset[2]));

        this.spotLightCamera.frustum.fov = CesiumMath.PI_OVER_TWO;
        this.spotLightCamera.frustum.aspectRatio = 1.0;
        this.spotLightCamera.frustum.near = 1.0;
        this.spotLightCamera.frustum.far = 500.0;
        // this.spotLightCamera.lookAt(center, new Cartesian3(30.0, 30.0, 50.0));
        this.spotLightCamera.lookAt(center, new Cartesian3(this.viewModel.offset[0], this.viewModel.offset[1], this.viewModel.offset[2]));

        this.pointLightCamera.position = center;

        GeoDepository.viewer.camera.lookAt(center, new Cartesian3(25.0, 25.0, 30.0));

        let pointEntity = GeoDepository.viewer.entities.add(new Entity({
            point: new PointGraphics({
                color: new Color(1, 1, 1),
                pixelSize: 10,
                outlineColor: new Color(1, 1, 1)
            }),
            position: lcenter
        }));
        this.updateLightDirection();
        this.updateModels();
        this.updateShadows();
    }

    /**
     * 更新模型
     * @private
     */
    updateModels() {
        //清除所有primitives
        // GeoDepository.scene.primitives.removeAll();

        // var location = this.uiOptions.locations[this.viewModel.location];
        // var centerLongitude = location.centerLongitude;
        // var centerLatitude = location.centerLatitude;
        // var height = location.height;

        let location=this.viewModel.position
        let centerLongitude = location[0];
        let centerLatitude = location[1];
        let height = location[2];

        // let position1 = Cartesian3.fromDegrees(centerLongitude, centerLatitude, height + 5.0);
        // let position2 = Cartesian3.fromDegrees(centerLongitude, centerLatitude, height + 10.0);
        // let position3 = Cartesian3.fromDegrees(centerLongitude, centerLatitude, height + 15.0);
        let modelPosition = Cartesian3.fromDegrees(centerLongitude, centerLatitude, height);

        // this.createModel(this.uiOptions.modelUrls[this.viewModel.model], modelPosition);
        // this.createModel(this.uiOptions.modelUrls[this.viewModel.model], modelPosition);
        // this.applyModel(this.viewModel.models,modelPosition)

        // Add a grid of models
        if (this.viewModel.grid) {
            let spacing = 0.00002;
            let gridSize = 10;
            for (let i = 0; i < gridSize * gridSize; ++i) {
                let x = i % gridSize;
                let y = Math.floor(i / gridSize);
                let longitude = centerLongitude + spacing * (x - gridSize / 2.0);
                let latitude = centerLatitude + spacing * (y - gridSize / 2.0);
                let position = Cartesian3.fromDegrees(longitude, latitude, height);
                this.createModel(this.uiOptions.modelUrls[this.viewModel.model], position);
                // this.applyModel(this.viewModel.model,position)
            }
        }
    }

    /**
     * 加载创建模型
     * @param {String} url 模型服务地址
     * @param {Cartesian3} origin 模型位置
     * @private
     */
    createModel(url, origin) {
        let modelMatrix = Transforms.headingPitchRollToFixedFrame(origin, new HeadingPitchRoll());

        let model = GeoDepository.viewer.scene.primitives.add(Model.fromGltf({
            url : url,
            modelMatrix : modelMatrix
        }));
        return model;
    }

    /**
     * 运用于模型
     * @param {Model} model  gltf模型
     * @param {Cartesian3} origin 模型位置
     * @private
     */
    applyModel(model, origin) {
        let modelMatrix = Transforms.headingPitchRollToFixedFrame(origin, new HeadingPitchRoll());
        let modelNew = GeoDepository.viewer.scene.primitives.add(Model.fromGltf({
            url : model.dataUrl,
            modelMatrix : modelMatrix
        }));
        // let modelNew =model
        // modelNew.modelMatrix = modelMatrix
        return modelNew;
    }

    /**
     * 点击事件
     * @private
     */
    handlerClick(){
        let handler = new ScreenSpaceEventHandler(GeoDepository.scene.canvas);

        // Click object to turn castShadows on/off
        handler.setInputAction(function(movement) {
            let picked = GeoDepository.scene.pick(movement.position);
            if (defined(picked) && defined(picked.primitive)) {
                let castShadows = ShadowMode.castShadows(picked.primitive.shadows);
                let receiveShadows = ShadowMode.receiveShadows(picked.primitive.shadows);
                picked.primitive.shadows = ShadowMode.fromCastReceive(!castShadows, receiveShadows);
            }
            GeoDepository.scene.requestRender();
        }, ScreenSpaceEventType.LEFT_CLICK);

        // Middle click object to turn receiveShadows on/off
        handler.setInputAction(function(movement) {
            let picked = GeoDepository.scene.pick(movement.position);
            if (defined(picked)) {
                let castShadows = ShadowMode.castShadows(picked.primitive.shadows);
                let receiveShadows = ShadowMode.receiveShadows(picked.primitive.shadows);
                picked.primitive.shadows = ShadowMode.fromCastReceive(castShadows, !receiveShadows);
            }
            GeoDepository.scene.requestRender();
        }, ScreenSpaceEventType.MIDDLE_CLICK);
    }
}

/**
 * 配置选项
 * @private
 * @param options
 */
function _biasOptions(options) {
    this.type = options.type;
    this.polygonOffset = options.polygonOffset;
    this.polygonOffsetFactor = options.polygonOffsetFactor;
    this.polygonOffsetUnits = options.polygonOffsetUnits;
    this.normalOffset = options.normalOffset;
    this.normalOffsetScale = options.normalOffsetScale;
    this.normalShading = options.normalShading;
    this.normalShadingSmooth = options.normalShadingSmooth;
    this.depthBias = options.depthBias;
}

export default LightSource;