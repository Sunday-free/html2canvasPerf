import defaultValue from 'cesium/Core/defaultValue';
import Cartesian2 from 'cesium/Core/Cartesian2';
import Cartesian3 from 'cesium/Core/Cartesian3';
import CesiumViewer from 'cesium/Widgets/Viewer/Viewer';
import SceneMode from "cesium/Scene/SceneMode.js";
import CesiumMath from "cesium/Core/Math";
import Color from 'cesium/Core/Color';
import {GeoDepository} from "../core/GeoDepository";
import OpenStreetMapImageryProvider from "cesium/Scene/OpenStreetMapImageryProvider";
import HeadingPitchRoll from 'cesium/Core/HeadingPitchRoll';
import Transforms from "cesium/Core/Transforms";
import Rectangle from 'cesium/Core/Rectangle'
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler';
import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType';
import GeoUtil from '../utils/GeoUtil';
import GeoMap from '../core/GeoMap.js';
import CallbackProperty from "cesium/DataSources/CallbackProperty.js";
import Cartographic from "cesium/Core/Cartographic";
import HeightReference from "cesium/Scene/HeightReference";
import UrlTemplateImageryProvider from 'cesium/Scene/UrlTemplateImageryProvider';
import WebMapTileServiceImageryProvider from 'cesium/Scene/WebMapTileServiceImageryProvider';
import LayerManager from "./LayerManager";

class OverView {
    /**
     * 鹰眼
     * @alias OverView
     * @constructor
     * @param {Object} options 包含以下参数的对象
     * @param {ImageryMapType} [options.baseMap=BOSGeo.ImageryMapType.OPENSTREET_VEC] 底图类型，可以是BOSGeo.ImageryMapType中的所有类型，如BOSGeo.ImageryMapType.OPENSTREET_VEC,BOSGeo.ImageryMapType.TDT_VECTOR，BOSGeo.ImageryMapType.TDT_VECANNO，BOSGeo.ImageryMapType.TDT_IMAGERY, BOSGeo.ImageryMapType.BING_IMAGERY, BOSGeo.ImageryMapType.MAPBOX_IMAGERY等,详见BOSGeo.ImageryMapType；BOSGeo.GeoMap初始化时也可以设置鹰眼的开启，但鹰眼使用的为默认的底图。
     * @param {Boolean} [options.show = true] 是否显示；
     * @example
 	 * //Example 1.直接通过鹰眼类进行创建
     * let overView =new  BOSGeo.OverView({
         baseMap: BOSGeo.ImageryMapType.TDT_VECTOR //天地图矢量
        });
         overView.imageryLayer.add({
         map:BOSGeo.ImageryMapType.TDT_VECANNO //天地图注记
         }
        )
     * overView.overViewEle.style.display = 'block'; //overView.overViewEle 为鹰眼div，可调整样式
     * overView.overViewEle.style.width = '200px'; //宽度
       overView.overViewEle.style.height = '200px'; //高度
       overView.overViewEle.style.bottom = '20px'; //底部位置
       overView.overViewEle.style.right = '20px'; //右边位置
	 * @example
 	 * //Example 2.通过GeoMap实例化时进行创建
     * let geomap = new BOSGeo.GeoMap('bosgeoContainer',{
            overView:true, //鹰眼开启
            baseMap:BOSGeo.ImageryMapType.OPENSTREET_VEC,
        });
     geomap._overView.overViewEle.style.width = '200px'; //宽度
     * @see GeoMap
     */
    constructor(options={}) {
        this.geomap = GeoDepository.geomap;
        let overVieweTag = document.createElement('div');
        // overVieweTag.style.cssText = 'display:none;position:bottom-right;width:150px;height:150px;border:solid 4px rgb(255, 255, 255)';
        this.overViewEle = overVieweTag;
        GeoDepository.viewer.container.appendChild(overVieweTag);
        overVieweTag.className = 'bosgeo-overView';
        overVieweTag.id = 'bosgeo-overView'
        let overViewer = new CesiumViewer(overVieweTag, {
            baseLayerPicker: false,
            homeButton: false,
            animation: false,
            geocoder: false,
            timeline: false,
            sceneMode : SceneMode.SCENE2D,
            selectionIndicator: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            infoBox: false,
            shouldAnimate: false,
            fullscreenButton: false,
            projectionPicker: false,
            useDefaultRenderLoop: true,
            requestRenderMode: false,
            maximumRenderTimeChange: Infinity,
            imageryProvider:  new OpenStreetMapImageryProvider({
                    url: 'https://a.tile.openstreetmap.org/'
                })
            ,
            contextOptions: {
                webgl: {
                    preserveDrawingBuffer: false
                }
            }
        });

        this.viewer = overViewer;
        this.overViewer = overViewer;
        this.overViewer.bottomContainer.style.display = 'none';
        GeoDepository.viewer.container.appendChild(overVieweTag);
        let globe = this.overViewer.scene.globe;
        // globe.enableLighting = true;

        // let eventCallback = this.caculateDistance(this.overViewer,GeoDepository.geomap);
        let eventCallback = this.onClockViewerTick(this.overViewer, GeoDepository.viewer);
        this.eventCallback = eventCallback;
        let overViewEventCallback = this.overViewOnClick(this.overViewer, GeoDepository.viewer);
        this.overViewEventCallback =overViewEventCallback;
        // geomap.viewer.camera.changed.addEventListener(eventCallback);
        this.handOnOverViewe = false;//是否在鹰眼中操作
        this.handOnOverViewe2Geomap = false;//鹰眼中操作geomap

        this.overViewer.camera.percentageChanged = 0.01;
        this.geomap.viewer.camera.percentageChanged = 0.01;
        this.overViewer.scene.screenSpaceCameraController.enableRotate = true;
        this.overViewer.scene.screenSpaceCameraController.enableTranslate = false;
        this.overViewer.scene.screenSpaceCameraController.enableZoom = false;
        this.overViewer.scene.screenSpaceCameraController.enableTilt = false;
        this.overViewer.scene.screenSpaceCameraController.enableLook = false;

        let _GeoDepository = {};
        _GeoDepository.viewer = overViewer;
        _GeoDepository.scene = overViewer.scene;
        _GeoDepository.camera = overViewer.camera;
        _GeoDepository.geomap = this;
        this.GeoDepository = _GeoDepository;

        //删除默认的影像
        overViewer.imageryLayers.remove(overViewer.imageryLayers.get(0));
        //添加默认底图
        this.baseMap = defaultValue(options.baseMap , BOSGeo.ImageryMapType.OPENSTREET_VEC);
        this.layerManager = new LayerManager(this); //添加图层管理器
        // setTimeout(function() {
            this.imageryLayer = this.layerManager.createImageryLayer('鹰眼底图');
            this.imageryLayer.add({
                name: 'baseMap',
                map: this.baseMap
            });
        // }.bind(this),5)
        this.show = defaultValue(options.show , true);
    }

    /**
     * 显隐设置
     * @property {Boolean} 是否显示，true为是，false为隐藏
     */
    get show() {
        return this._show;
    }
    set show(value) {
        this._show = value;
        if (value) {
            this.overViewEle.style.display = 'block';
            this.geomap.viewer.camera.changed.addEventListener(this.eventCallback);
            this.addOverviewHandlerEvent(this.overViewer, GeoDepository.viewer);
            this.overViewer.camera.changed.addEventListener(this.overViewEventCallback);
        }
        else {
            this.overViewEle.style.display = 'none';
            this.geomap.viewer.camera.changed.removeEventListener(this.eventCallback);
            this.removeOverviewHandlerEvent();
            this.overViewer.camera.changed.removeEventListener(this.overViewEventCallback);
        }
    }

    /**
     * 移除鹰眼
     * @example
     * overView.remove();
     */
    remove() {
        this.geomap.viewer.camera.changed.removeEventListener(this.eventCallback);
        this.removeOverviewHandlerEvent();
        this.overViewEle.parentNode.removeChild(this.overViewEle);
        this.overViewer.destroy();
    }

    /**
     * 销毁
     */
    destory() {
        this.remove();
        this.overViewer = null;
        delete this;
    }

    /**
     * 验证矩形是否符合地球范围
     * @param {Rectangle} irectangle 矩形
     * @returns {boolean}
     * @private
     */
    _validate(irectangle) {
        const {west, east, south, north} = irectangle;
        if (isNaN(west) || (west > Math.PI) || (west < -Math.PI) || (east > Math.PI) || (east < -Math.PI)) {
            return false//('经度必须大于-180，小于180');
        }
        else if (isNaN(south) || (south > Math.PI / 2) || (south < -Math.PI / 2) || (north > Math.PI / 2) || (north < -Math.PI / 2)) {
            return false//('纬度必须大于-90，小于90');
        } else {
            return true;
        }
    }

    /**
     * 地图联动鹰眼图
     * @param {Viewer} overviewViewer 鹰眼图
     * @param {Viewer} viewer         地图
     * @returns {Function}
     * @private
     */
    onClockViewerTick(overviewViewer, viewer) {
        let flyto = (options = {}) => {
            if (options.entity) {
                //联动，俯视视角
                overviewViewer && overviewViewer.flyTo(options.entity, {
                    // destination: viewer.camera.position,
                    offset: {
                        heading: viewer.camera.heading,
                        pitch: CesiumMath.toRadians(-90),//viewer.camera.pitch,
                        roll: viewer.camera.roll
                    },
                    duration: 0.0,
                    maximumHeight: 100000
                })
            } else if (options.destination) {
                //水平视角
                overviewViewer && overviewViewer.camera.flyTo({
                    destination: options.destination,
                    orientation: {
                        heading: viewer.camera.heading,
                        pitch: CesiumMath.toRadians(-90),//viewer.camera.pitch,
                        roll: viewer.camera.roll
                    },
                    duration: 0.0,
                    maximumHeight: 80000
                })
            }
        }
        return function () {
            if (this.handOnOverViewe) return;//操作鹰眼时
            let cameraRectangle = viewer.camera.computeViewRectangle();
            if (cameraRectangle) {
                let west =cameraRectangle.west - (cameraRectangle.east - cameraRectangle.west)/2;
                let south = cameraRectangle.south - (cameraRectangle.north - cameraRectangle.south)/2;
                let east = cameraRectangle.east + (cameraRectangle.east - cameraRectangle.west)/2;
                let north= cameraRectangle.north + (cameraRectangle.north - cameraRectangle.south)/2;
                let bigRectangle = {west, east, south, north}

                let center;
                center = new Cartesian3.fromDegrees((cameraRectangle.west + cameraRectangle.east) / 2 / Math.PI * 180, (cameraRectangle.north + cameraRectangle.south) / 2 / Math.PI * 180, 2)
                let westSouth = new Cartesian3.fromDegrees(cameraRectangle.west / Math.PI * 180, cameraRectangle.south / Math.PI * 180, 2);
                let distance = Cartesian3.distance(center, westSouth);
                if (viewer.camera.pitch < CesiumMath.toRadians(-38)) {
                    // overviewViewer.scene.mode = SceneMode.SCENE3D;
                    // center = new Cartesian3.fromDegrees((cameraRectangle.west+ cameraRectangle.east)/2/ Math.PI * 180, (cameraRectangle.north+ cameraRectangle.south)/2/ Math.PI * 180, 2)
                } else {
                    // overviewViewer.scene.mode = SceneMode.SCENE3D;
                    // center = viewer.camera.positionWC;
                }
                let _cameraRectangleEntity = overviewViewer.entities.getById('_cameraRectangle');
                // let _cameraPointEntity = overviewViewer.entities.getById('_cameraPoint');
                if (_cameraRectangleEntity) {
                    // overviewViewer.entities.remove(_cameraRectangleEntity);
                    _cameraRectangleEntity.position = center;
                    _cameraRectangleEntity.ellipsoid.radii = new Cartesian3(distance / 3.0, distance / 3.0, distance / 3.0);
                    _cameraRectangleEntity.orientation = Transforms.headingPitchRollQuaternion(
                        center,
                        new HeadingPitchRoll(viewer.camera.heading, 0, 0.0)
                    )
                    _cameraRectangleEntity.rectangle.coordinates = cameraRectangle;
                    // _cameraPointEntity.position =center;

                } else {
                    _cameraRectangleEntity = overviewViewer.entities.add({
                        id: "_cameraRectangle",
                        position: center,
                        rectangle: {
                            coordinates: cameraRectangle,
                            fill: true,
                            outline: true,
                            outlineWidth: 500,
                            outlineColor: Color.DODGERBLUE,
                            material: Color.DARKCYAN.withAlpha(0.15),
                            extrudedHeight: 0.2,
                            heightReference: HeightReference.CLAMP_TO_GROUND,
                        },
                        point: {
                            show: true,
                            color: Color.WHITE,
                            outlineColor: Color.fromCssColorString('#1E90FF'),
                            outlineWidth: 1.5,
                            outline: true,
                            pixelSize: 5
                        },
                        orientation: Transforms.headingPitchRollQuaternion(
                            center,
                            new HeadingPitchRoll(-viewer.camera.heading, 0, 0.0)
                        ),
                        ellipsoid: {
                            radii: new Cartesian3(distance / 3.0, distance / 3.0, distance / 3.0),  // 扇形半径
                            innerRadii: new Cartesian3(1, 1, 1), // 内半径
                            minimumClock: CesiumMath.toRadians(135), // 左右偏角
                            maximumClock: CesiumMath.toRadians(45),
                            minimumCone: CesiumMath.toRadians(90),// 上下偏角  可以都设置为90
                            maximumCone: CesiumMath.toRadians(90),
                            material: Color.fromCssColorString('#1E90FF').withAlpha(0.35),
                            // outlineColor: Color.DARKCYAN,
                            // outline: true,
                            extrudedHeight: 0.25,
                            heightReference: HeightReference.CLAMP_TO_GROUND,
                        }
                    });
                }
                this._cameraRectangleEntity =_cameraRectangleEntity;
                if (viewer.camera.pitch < CesiumMath.toRadians(-65) || viewer.camera.pitch > CesiumMath.toRadians(65)) {
                    overviewViewer.scene.mode  = SceneMode.SCENE2D;
                    // center = new Cartesian3.fromDegrees((cameraRectangle.west+ cameraRectangle.east)/2/ Math.PI * 180, (cameraRectangle.north+ cameraRectangle.south)/2/ Math.PI * 180, 2)
                    _cameraRectangleEntity.ellipsoid.show = false;
                    if (this._validate(bigRectangle)) {
                        //两倍矩形
                        let bigcameraRectangle = new Rectangle(west, south, east, north);
                        flyto({destination: bigcameraRectangle});
                    } else if (Math.abs(cameraRectangle.east - cameraRectangle.west)>=Math.PI *2 || Math.abs(cameraRectangle.north - cameraRectangle.south)>=Math.PI){
                        let viewCenter = new Cartesian2(Math.floor(viewer.canvas.clientWidth / 2), Math.floor(viewer.canvas.clientHeight / 2));
                        let newWorldPosition = viewer.camera.pickEllipsoid(viewCenter);
                        _cameraRectangleEntity.position = newWorldPosition;
                        flyto({destination: viewer.camera.position});
                    }else {
                        flyto({entity: _cameraRectangleEntity});
                    }

                } else {
                    _cameraRectangleEntity.ellipsoid.show = true;
                    if (this._validate(bigRectangle)) {
                        //两倍矩形
                        let bigcameraRectangle = new Rectangle(west, south, east, north);
                        flyto({destination: bigcameraRectangle});
                    } else if (Math.abs(cameraRectangle.east - cameraRectangle.west)>=Math.PI *2 || Math.abs(cameraRectangle.north - cameraRectangle.south)>=Math.PI){
                        let viewCenter = new Cartesian2(Math.floor(viewer.canvas.clientWidth / 2), Math.floor(viewer.canvas.clientHeight / 2));
                        let newWorldPosition = viewer.camera.pickEllipsoid(viewCenter);
                        _cameraRectangleEntity.position = newWorldPosition;
                        flyto({destination: viewer.camera.position});
                    }else {
                        flyto({destination: viewer.camera.position});
                    }
                }
            } else {
                flyto();
            }
        }.bind(this)
    }

    /**
     * 鹰眼图联动地图回调事件
     * @param {Viewer} overviewViewer 鹰眼图
     * @param {Viewer} viewer         地图
     * @private
     */
    overViewOnClick(overviewViewer,viewer){
        return function () {
            if(!this.handOnOverViewe) return;
            //视角
            viewer && viewer.camera.setView({
                destination: overviewViewer.camera.position,
                orientation: {
                    heading: overviewViewer.camera.heading,
                    pitch:  overviewViewer.camera.pitch, //options.isPitch ? CesiumMath.toRadians(-90) :
                    roll: overviewViewer.camera.roll
                },
                duration: 0.0,
                maximumHeight: 8000
            })
        }.bind(this)
    }
    /**
     * 鹰眼图联动地图
     * @param {Viewer} overviewViewer 鹰眼图
     * @param {Viewer} viewer         地图
     * @returns {Function}
     * @private
     */
    addOverviewHandlerEvent(overviewViewer, viewer) {
        let flyto = (iViewer,options = {}) => {
            if (options.entity) {
                //联动，俯视视角
                iViewer && iViewer.flyTo(options.entity, {
                    // destination: iViewer.camera.position,
                    offset: {
                        heading: iViewer.camera.heading,
                        pitch: CesiumMath.toRadians(-90),//iViewer.camera.pitch,
                        roll: iViewer.camera.roll
                    },
                    duration: 0.0,
                    maximumHeight: 100000
                })
            } else if (options.destination) {
                //水平视角
                iViewer && iViewer.camera.setView({
                    destination: options.destination,
                    orientation: {
                        heading: iViewer.camera.heading,
                        pitch: options.isPitch ? CesiumMath.toRadians(-90) : iViewer.camera.pitch,
                        roll: iViewer.camera.roll
                    },
                    duration: 0.0,
                    maximumHeight: 8000
                })
            }
        };

        let leftDownFlag = false;
        let pointDraged = null;
        let startPoint;
        let polylinePreviousCoordinates;
        let polygonPreviousCoordinates;
        let rectanglePreviousCoordinates = {};
        let overviewRectangle = null;
        let handler
        if (!this.overviewHandler) {
            handler = new ScreenSpaceEventHandler(overviewViewer.scene.canvas);
            this.overviewHandler = handler;
        } else {
            handler = this.overviewHandler;
        }

        /*
        handler.setInputAction(function (movement) {
            let windowCoord = movement.position;
            let cartographic = GeoUtil.getCartographic(windowCoord);

            let cartesian = overviewViewer.scene.pickPosition(windowCoord);
            let ray = overviewViewer.camera.getPickRay(windowCoord);
            // let cartographic = overviewViewer.scene.globe.pick(ray, overviewViewer.scene);
            if (cartographic) {
                // this.geomap.viewer.camera.changed.removeEventListener(this.eventCallback);
                this.handOnOverViewe = true;//鹰眼控制地图
                cartographic.z += 500;
                let cartesian1 = Cartesian3.fromDegrees(cartographic.x, cartographic.y, cartographic.z)
                flyto({destination: cartesian1, isPitch: true})
                setTimeout(function () {
                    this.handOnOverViewe = false; //还原地图控制鹰眼
                }.bind(this), 50);

            }
        }.bind(this), ScreenSpaceEventType.RIGHT_CLICK);
        */

        // Select plane when mouse down
        handler.setInputAction(function (movement) {
            pointDraged = overviewViewer.scene.pick(movement.position);//选取当前的entity
            leftDownFlag = true;
            if (pointDraged) {
                overviewViewer.scene.screenSpaceCameraController.enableRotate = false;//锁定相机
                //当前实体Entity的polyline坐标属性信息暂存
                if (pointDraged.id.polyline) {
                    polylinePreviousCoordinates = pointDraged.id.polyline.positions.getValue();
                }
                if (pointDraged.id.polygon) {
                    polygonPreviousCoordinates = pointDraged.id.polygon.hierarchy.getValue();
                }
                if (pointDraged.id.rectangle) {
                    rectanglePreviousCoordinates = pointDraged.id.rectangle.coordinates.getValue();
                    let {west, east, south, north} = rectanglePreviousCoordinates
                    let startPosition = Cartesian3.fromRadians((west+east)/2,(south+ north)/2,0);

                    let ray = overviewViewer.camera.getPickRay(movement.position);
                    let endPosition = overviewViewer.scene.globe.pick(ray, overviewViewer.scene);
                    //计算每次的偏差
                    let position_start = startPosition;
                    let cartographic_start = Cartographic.fromCartesian(position_start);
                    let longitude_start = CesiumMath.toDegrees(cartographic_start.longitude);
                    let latitude_start = CesiumMath.toDegrees(cartographic_start.latitude);

                    let position_end = endPosition;
                    let cartographic_end = Cartographic.fromCartesian(position_end);
                    let longitude_end = CesiumMath.toDegrees(cartographic_end.longitude);
                    let latitude_end = CesiumMath.toDegrees(cartographic_end.latitude);

                    let changer_lng = longitude_end - longitude_start;
                    let changer_lat = latitude_end - latitude_start;

                    rectanglePreviousCoordinates.west = CesiumMath.toRadians(CesiumMath.toDegrees(rectanglePreviousCoordinates.west) + changer_lng);
                    rectanglePreviousCoordinates.east = CesiumMath.toRadians(CesiumMath.toDegrees(rectanglePreviousCoordinates.east) + changer_lng);
                    rectanglePreviousCoordinates.south = CesiumMath.toRadians(CesiumMath.toDegrees(rectanglePreviousCoordinates.south) + changer_lat);
                    rectanglePreviousCoordinates.north = CesiumMath.toRadians(CesiumMath.toDegrees(rectanglePreviousCoordinates.north) + changer_lat);
                    if(!this._validate(rectanglePreviousCoordinates)){
                        let {west, east, south, north} = rectanglePreviousCoordinates
                        rectanglePreviousCoordinates.west = west > Math.PI ? Math.PI : west < -Math.PI ? -Math.PI :west;
                        rectanglePreviousCoordinates.east = east > Math.PI ? Math.PI : east < -Math.PI ? -Math.PI :east ;
                        rectanglePreviousCoordinates.south = south > Math.PI / 2 ? Math.PI / 2 : south < -Math.PI / 2 ? -Math.PI / 2 :south;
                        rectanglePreviousCoordinates.north = north > Math.PI / 2 ? Math.PI / 2 : north < -Math.PI / 2 ? -Math.PI / 2 :north;
                    }
                }
            }
        }.bind(this), ScreenSpaceEventType.LEFT_DOWN);

        // Release plane on mouse up
        handler.setInputAction(function () {
            leftDownFlag = false;
            pointDraged = null;
            overviewViewer.scene.screenSpaceCameraController.enableInputs = true;
            overviewViewer.scene.screenSpaceCameraController.enableRotate = true;//锁定相机
            // if(_moveEndCallBack){
            //     _moveEndCallBack(cartesian)
            // }
            // handler.destroy();
            this.handOnOverViewe = true;
            if (this.overviewRectangle) {
                flyto(viewer,{destination: this.overviewRectangle, isPitch: true});
                setTimeout(function () {
                    this.handOnOverViewe = false;
                    if(this.handOnOverViewe === false) {
                        let west =overviewRectangle.west - (overviewRectangle.east - overviewRectangle.west)/2;
                        let south = overviewRectangle.south - (overviewRectangle.north - overviewRectangle.south)/2;
                        let east = overviewRectangle.east + (overviewRectangle.east - overviewRectangle.west)/2;
                        let north= overviewRectangle.north + (overviewRectangle.north - overviewRectangle.south)/2;
                        let bigRectangle = {west, east, south, north}

                        if (Math.abs(overviewRectangle.east - overviewRectangle.west)>=Math.PI *2 || Math.abs(overviewRectangle.north - overviewRectangle.south)>=Math.PI){
                            overviewRectangle && flyto(overviewViewer,{destination: overviewRectangle});
                            flyto(overviewViewer,{destination: viewer.camera.position});
                        }else if (this._validate(bigRectangle)) {
                            //两倍矩形
                            let bigoverviewRectangle = new Rectangle(west, south, east, north);
                            flyto(overviewViewer,{destination: bigoverviewRectangle});
                        } else {
                            flyto(overviewViewer,{destination: viewer.camera.position});
                        }
                    }
                }.bind(this), 50);
                // this.overviewRectangle = null;
            }
            // if(!this.overviewRectangle ){
                this.handOnOverViewe2Geomap == true
                setTimeout(function () {
                    this.handOnOverViewe2Geomap = false;
                }.bind(this), 50);
            // }
        }.bind(this), ScreenSpaceEventType.LEFT_UP);

        // Update plane on mouse move
        handler.setInputAction(function (movement) {
            if (leftDownFlag === true && pointDraged != null) {
                //记录尾随的坐标
                // let startPosition = overviewViewer.scene.pickPosition(movement.startPosition);
                // let endPosition = overviewViewer.scene.pickPosition(movement.endPosition);
                let startRay = overviewViewer.camera.getPickRay(movement.startPosition);
                let startPosition = overviewViewer.scene.globe.pick(startRay, overviewViewer.scene);
                let ray = overviewViewer.camera.getPickRay(movement.endPosition);
                let endPosition = overviewViewer.scene.globe.pick(ray, overviewViewer.scene);
                if(endPosition ){
                    pointDraged.id.position = new CallbackProperty(function () {
                        return endPosition;
                    }, false);//防止闪烁，在移动的过程 console.log(pointDraged.id);

                    if (pointDraged.id.ellipse) {
                        let position_end = endPosition;
                        let cartographic_end = Cartographic.fromCartesian(position_end);
                        let height_end = cartographic_end.height;
                        pointDraged.id.ellipse.height = new CallbackProperty(function () {
                            return height_end;
                        }, false);
                    }
                }
                if(startPosition && endPosition){
                    //计算每次的偏差
                    let changed_x = endPosition && endPosition.x && startPosition && startPosition.x ? endPosition.x - startPosition.x :0;
                    let changed_y = endPosition && endPosition.y && startPosition && startPosition.y ? endPosition.y - startPosition.y :0;
                    let changed_z = endPosition && endPosition.z && startPosition && startPosition.z ? endPosition.z - startPosition.z :0;

                    if (pointDraged.id.polyline) {
                        let currentsPoint = [];
                        for (let i = 0; i < polylinePreviousCoordinates.length; i++) {
                            //与之前的算差 替换掉
                            polylinePreviousCoordinates[i].x = polylinePreviousCoordinates[i].x + changed_x;
                            polylinePreviousCoordinates[i].y = polylinePreviousCoordinates[i].y + changed_y;
                            polylinePreviousCoordinates[i].z = polylinePreviousCoordinates[i].z + changed_z;
                            currentsPoint.push(polylinePreviousCoordinates[i])
                        }
                        pointDraged.id.polyline.positions = new CallbackProperty(function () {
                            return currentsPoint;
                        }, false);
                    }

                    if (pointDraged.id.polygon) {
                        let currentsPoint = [];
                        for (let i = 0; i < polygonPreviousCoordinates.length; i++) {
                            polygonPreviousCoordinates[i].x = polygonPreviousCoordinates[i].x + changed_x;
                            polygonPreviousCoordinates[i].y = polygonPreviousCoordinates[i].y + changed_y;
                            polygonPreviousCoordinates[i].z = polygonPreviousCoordinates[i].z + changed_z;
                            currentsPoint.push(polygonPreviousCoordinates[i])
                        }
                        pointDraged.id.polygon.hierarchy = new CallbackProperty(function () {
                            return currentsPoint;
                        }, false);
                    }

                    if (pointDraged.id.rectangle) {
                        let storePoint = {};

                        let position_start = startPosition;
                        let cartographic_start = Cartographic.fromCartesian(position_start);
                        let longitude_start = CesiumMath.toDegrees(cartographic_start.longitude);
                        let latitude_start = CesiumMath.toDegrees(cartographic_start.latitude);
                        let height_start = cartographic_start.height;

                        let position_end = endPosition;
                        let cartographic_end = Cartographic.fromCartesian(position_end);
                        let longitude_end = CesiumMath.toDegrees(cartographic_end.longitude);
                        let latitude_end = CesiumMath.toDegrees(cartographic_end.latitude);
                        let height_end = cartographic_end.height;

                        let changer_lng = longitude_end - longitude_start;
                        let changer_lat = latitude_end - latitude_start;

                        rectanglePreviousCoordinates.west = CesiumMath.toRadians(CesiumMath.toDegrees(rectanglePreviousCoordinates.west) + changer_lng);
                        rectanglePreviousCoordinates.east = CesiumMath.toRadians(CesiumMath.toDegrees(rectanglePreviousCoordinates.east) + changer_lng);
                        rectanglePreviousCoordinates.south = CesiumMath.toRadians(CesiumMath.toDegrees(rectanglePreviousCoordinates.south) + changer_lat);
                        rectanglePreviousCoordinates.north = CesiumMath.toRadians(CesiumMath.toDegrees(rectanglePreviousCoordinates.north) + changer_lat);
                        if(!this._validate(rectanglePreviousCoordinates)){
                            let {west, east, south, north} = rectanglePreviousCoordinates
                            rectanglePreviousCoordinates.west = west > Math.PI ? Math.PI : west < -Math.PI ? -Math.PI :west;
                            rectanglePreviousCoordinates.east = east > Math.PI ? Math.PI : east < -Math.PI ? -Math.PI :east ;
                            rectanglePreviousCoordinates.south = south > Math.PI / 2 ? Math.PI / 2 : south < -Math.PI / 2 ? -Math.PI / 2 :south;
                            rectanglePreviousCoordinates.north = north > Math.PI / 2 ? Math.PI / 2 : north < -Math.PI / 2 ? -Math.PI / 2 :north;
                        }
                        storePoint = rectanglePreviousCoordinates;
                        overviewRectangle = new Rectangle(rectanglePreviousCoordinates.west, rectanglePreviousCoordinates.south, rectanglePreviousCoordinates.east, rectanglePreviousCoordinates.north);
                        this.overviewRectangle = overviewRectangle;
                        pointDraged.id.rectangle.coordinates = new CallbackProperty(function () {
                            // storePoint=new Rectangle(storePoint.west,storePoint.south,storePoint.east,storePoint.north);
                            // console.log(Rectangle.fromDegrees(rectanglePreviousCoordinates.west, rectanglePreviousCoordinates.south, rectanglePreviousCoordinates.east, rectanglePreviousCoordinates.north));
                            return storePoint;
                            // return Rectangle.fromDegrees(rectanglePreviousCoordinates.west, rectanglePreviousCoordinates.south, rectanglePreviousCoordinates.east, rectanglePreviousCoordinates.north);
                        }.bind(this), false);
                        pointDraged.id.rectangle.height = new CallbackProperty(function () {
                            return height_end;
                        }, false);
                    }
                }

            }
        }.bind(this), ScreenSpaceEventType.MOUSE_MOVE);
    }

    /**
     * 移除鹰眼图联动地图事件
     * @private
     */
    removeOverviewHandlerEvent(){
        if (this.overviewHandler) {
            this.overviewHandler.destroy();
            this.overviewHandler = null;
        }
    }

}

export default OverView;