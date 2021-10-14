import ScreenSpaceEventType from "../../../cesium/Source/Core/ScreenSpaceEventType";
import ScreenSpaceEventHandler from "cesium/Core/ScreenSpaceEventHandler";
import defined from "cesium/Core/defined";
import Cartesian3 from "../../../cesium/Source/Core/Cartesian3";
import Cartesian2 from "../../../cesium/Source/Core/Cartesian2";
import Matrix4 from "../../../cesium/Source/Core/Matrix4";
import Matrix3 from "../../../cesium/Source/Core/Matrix3";
import Cesium3DTileFeature from "cesium/Scene/Cesium3DTileFeature";
import ClippingPlaneCollection from 'cesium/Scene/ClippingPlaneCollection';
import ClippingPlane from 'cesium/Scene/ClippingPlane';
import Color from "cesium/Core/Color";
import CesiumMath from "cesium/Core/Math";
import Cesium3DTileset from "cesium/Scene/Cesium3DTileset";
import Plane from "../../../cesium/Source/Core/Plane";
import IntersectionTests from "../../../cesium/Source/Core/IntersectionTests";
import createGuid from "../../../cesium/Source/Core/createGuid";
import CallbackProperty from "../../../cesium/Source/DataSources/CallbackProperty";
import Model from "../../../cesium/Source/Scene/Model";
import Primitive from "../../../cesium/Source/Scene/Primitive";
import Transforms from "cesium/Core/Transforms";
import Util from "../utils/Util";
import GeoUtil from "../utils/GeoUtil";
/**
 * 模型剖切工具(六面剖切)
 * @alias ClipTools
 * @param {GeoMap} geomap GeoMap对象
 * @example
 * var clipTool = new BOSGeo.ClipTools(geomap);
 */
class ClipTools {
    constructor(geomap){
        this.geomap = geomap;
        this.viewer = geomap.viewer;
        let scene = this.viewer.scene;
        let ellipsoid = scene.globe.ellipsoid;
        this.ellipsoid = ellipsoid;
        this.scene = scene;
        this.handler = null;  //操作监听事件

        this._clippingPlaneCollection = undefined;

        this.clippingArray = [];
        this.clippingBoxArray={}
        this.clippingBoxLngLat={}
        // this.show();
        // this.addEventHandler();

        if(!defined(this._clippingPlaneCollection)) {
            //box剖切

            this._clippingPlaneCollection = new ClippingPlaneCollection({
                edgeWidth: 1.0,
                edgeColor: Color.ROYALBLUE,
                unionClippingRegions: true
            });

            this.clippingArray.push(Cartesian3.UNIT_X);
            this.clippingArray.push(new Cartesian3(-1,0,0));
            this.clippingArray.push(Cartesian3.UNIT_Y);
            this.clippingArray.push(new Cartesian3(0,-1,0));
            this.clippingArray.push(Cartesian3.UNIT_Z);
            this.clippingArray.push(new Cartesian3(0,0,-1));
            // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(1,0,0),0.0));
            // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(-1,0,0),0.0));
            // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(0,1,0),0.0));
            // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(0,-1,0),0.0));
            // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(0,0,1),0.0));
            // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(0,0,-1),0.0));
        }
        
        this._selectModel = undefined; //选中的模型

        this.isDestoryed = false;

        this.mouseDown = {
            mouseDownPoint: undefined,
            pickPlanePosition: undefined,
            pickPlaneNormal: undefined,
            plane: undefined,
            clippingPane: undefined,
            clippingPanelNormal: undefined,
            initDistance: undefined,
            direction: undefined,
            nowPosition: undefined,
            clipDistance: undefined
        }

        this._clippingDisc= {};

        //存所有绘制平面的entity
        this.clippingPlanesEntities = {};
        this._handlerActive=true;//激活状态参数

        this.maxDistance=null
        this.maxcenter=null
    }

	
    /**
     * 剖切激活状态
     * 
     * @property {Boolean}
     * @default true
     * 
     */
	get handlerActive() {
        return this._handlerActive;
    }
    set handlerActive(val) {
        this._handlerActive = val;
    }

    /**
     * 开始剖切
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.clip();
     */
    clip() {
        // if(!defined(this._clippingPlaneCollection)) {
        //     //box剖切

        //     this._clippingPlaneCollection = new ClippingPlaneCollection({
        //         edgeWidth: 1.0,
        //         edgeColor: Color.ROYALBLUE,
        //         unionClippingRegions: true
        //     });

        //     this.clippingArray.push(Cartesian3.UNIT_X);
        //     this.clippingArray.push(new Cartesian3(-1,0,0));
        //     this.clippingArray.push(Cartesian3.UNIT_Y);
        //     this.clippingArray.push(new Cartesian3(0,-1,0));
        //     this.clippingArray.push(Cartesian3.UNIT_Z);
        //     this.clippingArray.push(new Cartesian3(0,0,-1));
        //     // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(1,0,0),0.0));
        //     // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(-1,0,0),0.0));
        //     // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(0,1,0),0.0));
        //     // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(0,-1,0),0.0));
        //     // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(0,0,1),0.0));
        //     // this._clippingPlaneCollection.add(new ClippingPlane(new Cartesian3(0,0,-1),0.0));
        // }
        
        // this._selectModel = undefined;

        // this.isDestoryed = false;

        // this.mouseDown = {
        //     mouseDownPoint: undefined,
        //     pickPlanePosition: undefined,
        //     pickPlaneNormal: undefined,
        //     plane: undefined,
        //     clippingPane: undefined,
        //     clippingPanelNormal: undefined,
        //     initDistance: undefined,
        //     direction: undefined,
        //     nowPosition: undefined,
        //     clipDistance: undefined
        // }

        // this._clippingDisc= {};

        // //存所有绘制平面的entity
        // this.clippingPlanesEntities = {};

        this.addEventHandler();
    }

    /**
     * 清除剖切
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.destroy();
     */
    destroy() {

        //清空clippingPlaneCollection
        if (defined(this._clippingPlaneCollection)) {
            this._clippingPlaneCollection.removeAll();
            this._clippingPlaneCollection._owner = undefined;
            this._clippingPlaneCollection = undefined;
        }
        // //移除所有的平面
        for (const key in this.clippingPlanesEntities) {
            if (this.clippingPlanesEntities.hasOwnProperty(key)) {
                const element = this.clippingPlanesEntities[key];
                this.viewer.entities.remove(element);
            }
        }
       
        this.removeEventHandler();//移除监听
       
        this.clippingPlanesEntities = {};

        if(defined(this._selectModel)) {
            this._selectModel.clippingPlanes = undefined;
            this._selectModel = undefined;
        }
 
        // that.scene = undefined;
        this.clippingArray = [];
        this.isDestoryed = true;
    }

    /**
     * 不移除监听
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.clear();
     */
    clear() {
        // //移除所有的平面
        for (const key in this.clippingPlanesEntities) {
            if (this.clippingPlanesEntities.hasOwnProperty(key)) {
                const element = this.clippingPlanesEntities[key];
                this.viewer.entities.remove(element);
            }
        }
        this.clippingArray = [];
       
        this.clippingPlanesEntities = {};

         //清空clippingPlaneCollection
         if (defined(this._clippingPlaneCollection)) {
            this._clippingPlaneCollection.removeAll();
            // this._clippingPlaneCollection._owner = undefined;
            this._clippingPlaneCollection = undefined;
            this._clippingPlaneCollection = new ClippingPlaneCollection({
                edgeWidth: 1.0,
                edgeColor: Color.ROYALBLUE,
                unionClippingRegions: true
            });

            this.clippingArray.push(Cartesian3.UNIT_X);
            this.clippingArray.push(new Cartesian3(-1,0,0));
            this.clippingArray.push(Cartesian3.UNIT_Y);
            this.clippingArray.push(new Cartesian3(0,-1,0));
            this.clippingArray.push(Cartesian3.UNIT_Z);
            this.clippingArray.push(new Cartesian3(0,0,-1));
        }

        
        if(defined(this._selectModel)) {
            this._selectModel.clippingPlanes = undefined;
            // this._selectModel = undefined;
        }
    }
    /**
     * 重置剖切
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.reset();
     */
    reset(){
        if(this._selectModel){
            this.clear();
        }
        // this._selectModel=this.primitive;
        this.addClippingPlanes();
    }

    /**
     * 设置需要剖切的模型,给模型加剖切盒
     * @param {Cesium3DTileset} model 3DTiles模型对象
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.addClippingPlane(model);
     */
    addClippingPlane(model){
        this.removeEventHandler();
        if(this._selectModel){
            this.clear();
        }
        this._selectModel=model;
        this.addClippingPlanes();
        this.addEventHandler(); //加入监听

        this.geomap.render();
    }

    /**
     * 添加监听
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.addEventHandler();
     */
    addEventHandler(){
        //设置选中后的颜色
        let baseColor = Color.ROYALBLUE.withAlpha(0.1);
        let pickedColor = Color.RED.withAlpha(0.3);

        if(!defined(this.handler)){
            this.handler = new ScreenSpaceEventHandler(this.scene.canvas);
        }
        let that = this;
        let planeSelected; //选中的剖切面
        this.handler.setInputAction(function(event){
            let position = event.position;
            if(!defined(position)){
                return;
            }
            if(that._handlerActive) {

            let pick = that.scene.pick(position);
            if(!defined(pick)) return;
            if(defined(pick.primitive)){
                // let primitive = pick.primitive;
                // if(primitive instanceof Cesium3DTileset || primitive instanceof Model){
                //     if(!defined(primitive.clippingPlanes)){
                //         //上一次的_selectModel的collection需要被清空
                //         if(that._selectModel) {
                //             that.clear();
                //         }
                //         that._selectModel = primitive;
                //         that.addClippingPlanes();
                //     }
                // }

            }
            if(defined(pick.id)){
                let entity = pick.id;
                if(typeof entity.id == 'string' &&entity.id.startsWith("BoxClip")){
                    planeSelected = entity;
                    let normal = entity.attr.plane.normal;
                    let clippingPane = that.getClippingPlaneByAxis(normal);
                    that.mouseDown.clippingPane = clippingPane;
                    that.mouseDown.clippingPanelNormal = Matrix4.multiplyByPointAsVector(that.getEntityMatrix(), normal, new Cartesian3());
                    let pointPosition = that.scene.pickPosition(position, new Cartesian3());
                    that.mouseDown.pickPlanePosition = pointPosition;
                    that.mouseDown.pickPlaneNormal = Cartesian3.normalize(that.scene.camera.direction, new Cartesian3());
 
                    //that.mouseDown.initDistance = entity.attr.plane.distance;
                    that.mouseDown.initDistance = clippingPane.distance;

                    that.mouseDown.mouseDownPoint = Cartesian2.clone(position);

                    // pickStartPosition = that.getPickPlanePointByMousePoint(that.mouseDown.mouseDownPoint);

                    // let normal = clippingPane.normal._cartesian3;
                    // if(Cartesian3.equals(normal, Cartesian3.UNIT_Y)|| Cartesian3.equals(normal, new Cartesian3(0, -1, 0))) {
                    //     //前 生成一个水平面用来pick测算距离
                    //     //获取 水平面法线
                    //     let surfaceNormal = that.ellipsoid.geodeticSurfaceNormal(pointPosition);
                    //     that.mouseDown.pickPlane = Plane.fromPointNormal(pointPosition, surfaceNormal);
                    // }

                    if(Cartesian3.equals(normal, Cartesian3.UNIT_Z)|| Cartesian3.equals(normal, new Cartesian3(0, 0, -1))) {
                        //前 生成一个水平面用来pick测算距离
                        //获取 水平面法线
                        that.mouseDown.pickPlane = that.getPickPlane(pointPosition);
                    } else {
                        let surfaceNormal = that.ellipsoid.geodeticSurfaceNormal(pointPosition);
                        that.mouseDown.pickPlane = Plane.fromPointNormal(pointPosition, surfaceNormal);
                    }
     
                }
            }
            }
        }, ScreenSpaceEventType.LEFT_DOWN);

        let lastHoverPlane;
        //HOVER效果
        this.handler.setInputAction(function(movement){
            if(that._handlerActive) {


            let position = movement.endPosition;
            if(!defined(position)){
                return;
            }
            //pick到剖切面 变色
            if(defined(planeSelected) && defined(that.mouseDown.mouseDownPoint)){
                //禁用鼠标操作
                that.geomap.enableControl = false;
                // //获取到按下时 pick 到 平面的位置
                //获取到pick的 plane distance
                let pickPlanePosition = that.mouseDown.pickPlanePosition;
                if (defined(pickPlanePosition)) {
                    //获取到当前pick的平面
                    let plane = that.mouseDown.clippingPane;
                    //获取当前平面的法线
                    let normal = plane.normal._cartesian3;
                    //平面移动最大距离
                    let maxDistance = that.maxDistance?that.maxDistance:that.getEntityInitClippingPanelDistance();
                    let maxcenter =that.maxcenter?that.maxcenter:that.getEntityPosition()

                    // let pickPlanePosition = that.mouseDown.pickPlanePosition;
                    if(Cartesian3.equals(normal, Cartesian3.UNIT_Y) || Cartesian3.equals(normal, new Cartesian3(0, -1, 0))) {
                        // if(maxcenter.y<pickPlanePosition.y){
                        //     that.clippingBoxArray.maxy=that.clippingBoxArray.maxy?that.clippingBoxArray.maxy:pickPlanePosition.y
                        //     that.clippingBoxArray.miny=maxcenter.y*2-that.clippingBoxArray.maxy
                        // }else{
                        //     that.clippingBoxArray.miny=that.clippingBoxArray.miny?that.clippingBoxArray.miny:pickPlanePosition.y
                        //     that.clippingBoxArray.maxy=maxcenter.y*2-that.clippingBoxArray.miny
                        // }
                        //前 生成一个水平面用来pick测算距离
                        //获取 水平面法线
                        let ray = that.scene.camera.getPickRay(position);
                        if(that.mouseDown.pickPlane) {
                            let result = IntersectionTests.rayPlane(ray, that.mouseDown.pickPlane);
                            if (!defined(result)) {
                                return;
                            }
                            let degree = that.cartesianToDegrees(result);
                            let startDegree = that.cartesianToDegrees(pickPlanePosition);
                            let newPos = Cartesian3.fromDegrees(startDegree.x, degree.y, startDegree.z);
                            let distance= Cartesian3.distance(newPos, pickPlanePosition);

                            //平面移动最大距离
                            let min=Cartesian3.equals(normal, Cartesian3.UNIT_Y),max=Cartesian3.equals(normal, new Cartesian3(0, -1, 0))
                            // if(maxcenter.y<pickPlanePosition.y){
                            if(max){
                                //平面移动最大距离
                                if((that.clippingBoxArray.maxy-3)>newPos.y && (that.clippingBoxArray.miny+3)<newPos.y){
                                    if(degree.y > startDegree.y) {
                                        //平面移动最大距离
                                        if(that.clippingBoxArray.maxy-20>newPos.y) {
                                            distance = maxDistance != 0 ? (Math.abs(distance) < Math.abs(2 * maxDistance) ? distance : 2 * maxDistance - 0.5) : distance;
                                        }
                                    } else {
                                        distance =maxDistance!=0?(Math.abs(distance) <Math.abs(2*maxDistance)?-distance:-(2*maxDistance-0.5)):-distance;
                                    }
                                }else{
                                    return
                                }
                            }else{
                                //平面移动最大距离
                                if((that.clippingBoxArray.maxy-3)>newPos.y && (that.clippingBoxArray.miny+3)<newPos.y){
                                    if(degree.y > startDegree.y) {
                                        //平面移动最大距离
                                        distance =maxDistance!=0?(Math.abs(distance) <Math.abs(2*maxDistance)?distance:2*maxDistance-0.5):distance;
                                    } else {
                                        if((that.clippingBoxArray.miny+20)<newPos.y) {
                                            distance = maxDistance != 0 ? (Math.abs(distance) < Math.abs(2 * maxDistance) ? -distance : -(2 * maxDistance - 0.5)) : -distance;
                                        }else{
                                            return
                                        }
                                        }
                                }else{
                                    return
                                }
                            }


                            // //平面移动最大距离
                            // if((that.clippingBoxArray.maxy-0.5)>newPos.y && (that.clippingBoxArray.miny+0.5)<newPos.y){
                            //     // distance =degree.z > startDegree.z?distance:-distance
                            //     if(degree.y > startDegree.y) {
                            //         //平面移动最大距离
                            //         distance =maxDistance!=0?(Math.abs(distance) <Math.abs(2*maxDistance)?distance:2*maxDistance-0.5):distance;
                            //     } else {
                            //         distance =maxDistance!=0?(Math.abs(distance) <Math.abs(2*maxDistance)?-distance:-(2*maxDistance-0.5)):-distance;
                            //     }
                            // }else{
                            //     return
                            // }

                            // distance =degree.y > startDegree.y?distance:-distance
                            let newTargetY;
                            if(Cartesian3.equals(normal, Cartesian3.UNIT_Y)) {
                                newTargetY = that.mouseDown.initDistance - distance;
                            } else {
                                newTargetY = that.mouseDown.initDistance + distance;
                            }
               
                            that.mouseDown.clippingPane.distance = newTargetY;

                            //更新X 以及Z
                            let center = Cartesian3.clone(that.getEntityPosition());
                            let mat = Transforms.eastNorthUpToFixedFrame(center);

                            let entity1 = that.clippingPlanesEntities[Cartesian3.UNIT_X];
                            let entity2 = that.clippingPlanesEntities[new Cartesian3(-1, 0, 0)];

                            let clippingPaneFront = that.getClippingPlaneByAxis(new Cartesian3(1, 0, 0));
                            let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(-1, 0, 0));

                            let clippingPaneFront1 = that.getClippingPlaneByAxis(new Cartesian3(0, 1, 0));
                            let clippingPaneBack1 = that.getClippingPlaneByAxis(new Cartesian3(0, -1, 0));

                            let clippingPaneFront2 = that.getClippingPlaneByAxis(new Cartesian3(0, 0, 1));
                            let clippingPaneBack2 = that.getClippingPlaneByAxis(new Cartesian3(0, 0, -1));

                            let nowdistanceX = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
                            let nowdistanceY = (clippingPaneFront1.distance+clippingPaneBack1.distance) /2 - clippingPaneBack1.distance;
                            let nowdistanceZ = (clippingPaneFront2.distance+clippingPaneBack2.distance) /2 - clippingPaneBack2.distance;

               
                            let planeModelMatrix = Matrix4.multiplyByTranslation(
                                mat,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_Y, -nowdistanceY, new Cartesian3()),
                                new Matrix4()
                            );
                            planeModelMatrix = Matrix4.multiplyByTranslation(
                                planeModelMatrix,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_Z, -nowdistanceZ, new Cartesian3()),
                                new Matrix4()
                            );

                            entity1.plane.dimensions._value.x = clippingPaneBack1.distance + clippingPaneFront1.distance;
                            entity2.plane.dimensions._value.x = clippingPaneBack1.distance + clippingPaneFront1.distance;

                            entity1.plane.dimensions._value.y = clippingPaneBack2.distance + clippingPaneFront2.distance;
                            entity2.plane.dimensions._value.y = clippingPaneBack2.distance + clippingPaneFront2.distance;

                            entity1.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                            entity2.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());

               
                            ///////////////////////////////////////////////////
                            entity1 = that.clippingPlanesEntities[Cartesian3.UNIT_Z];
                            entity2 = that.clippingPlanesEntities[new Cartesian3(0, 0, -1)];


                            entity1.plane.dimensions._value.y = clippingPaneBack1.distance + clippingPaneFront1.distance;
                            entity2.plane.dimensions._value.y = clippingPaneBack1.distance + clippingPaneFront1.distance;

                            entity1.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                            entity2.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;


                            planeModelMatrix = Matrix4.multiplyByTranslation(
                                mat,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, -nowdistanceX, new Cartesian3()),
                                new Matrix4()
                            );
                            planeModelMatrix = Matrix4.multiplyByTranslation(
                                planeModelMatrix,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_Y, -nowdistanceY, new Cartesian3()),
                                new Matrix4()
                            );

                            entity1.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                            entity2.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());


                        }
                    }

                    if(Cartesian3.equals(normal, Cartesian3.UNIT_Z) || Cartesian3.equals(normal, new Cartesian3(0, 0, -1))) {
                        //前 生成一个水平面用来pick测算距离
                        //获取 水平面法线
                        let ray = that.scene.camera.getPickRay(position);
                        if(that.mouseDown.pickPlane) {
                            let result = IntersectionTests.rayPlane(ray, that.mouseDown.pickPlane);
                            if (!defined(result)) {
                                return;
                            }
                            let degree = that.cartesianToDegrees(result);
                            let startDegree = that.cartesianToDegrees(pickPlanePosition);
                            let newPos = Cartesian3.fromDegrees(startDegree.x, startDegree.y, degree.z);
                            let distance = Cartesian3.distance(newPos, pickPlanePosition);
                            //平面移动最大距离
                            if((maxcenter.z+maxDistance-0.5)>newPos.z && (maxcenter.z-maxDistance+0.5)<newPos.z){
                                // distance =degree.z > startDegree.z?distance:-distance
                                if(degree.z > startDegree.z) {
                                    //平面移动最大距离
                                    distance =maxDistance!=0?(Math.abs(distance) <Math.abs(2*maxDistance)?distance:2*maxDistance-0.5):distance;
                                } else {
                                    distance =maxDistance!=0?(Math.abs(distance) <Math.abs(2*maxDistance)?-distance:-(2*maxDistance-0.5)):-distance;
                                }
                            }else{
                                return
                            }


                            let newTargetY;
                            if(Cartesian3.equals(normal, Cartesian3.UNIT_Z)) {
                                newTargetY = that.mouseDown.initDistance - distance;
                            } else {
                                newTargetY = that.mouseDown.initDistance + distance;
                            }
               
                            that.mouseDown.clippingPane.distance = newTargetY;

                            let center = Cartesian3.clone(that.getEntityPosition());
                            let mat = Transforms.eastNorthUpToFixedFrame(center);

                            let entity1 = that.clippingPlanesEntities[Cartesian3.UNIT_X];
                            let entity2 = that.clippingPlanesEntities[new Cartesian3(-1, 0, 0)];

                            let clippingPaneFront = that.getClippingPlaneByAxis(new Cartesian3(1, 0, 0));
                            let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(-1, 0, 0));

                            let clippingPaneFront1 = that.getClippingPlaneByAxis(new Cartesian3(0, 1, 0));
                            let clippingPaneBack1 = that.getClippingPlaneByAxis(new Cartesian3(0, -1, 0));

                            let clippingPaneFront2 = that.getClippingPlaneByAxis(new Cartesian3(0, 0, 1));
                            let clippingPaneBack2 = that.getClippingPlaneByAxis(new Cartesian3(0, 0, -1));

                            let nowdistanceX = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
                            let nowdistanceY = (clippingPaneFront1.distance+clippingPaneBack1.distance) /2 - clippingPaneBack1.distance;
                            let nowdistanceZ = (clippingPaneFront2.distance+clippingPaneBack2.distance) /2 - clippingPaneBack2.distance;

                            
                            let planeModelMatrix = Matrix4.multiplyByTranslation(
                                mat,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_Y, -nowdistanceY, new Cartesian3()),
                                new Matrix4()
                            );
                            planeModelMatrix = Matrix4.multiplyByTranslation(
                                planeModelMatrix,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_Z, -nowdistanceZ, new Cartesian3()),
                                new Matrix4()
                            );

                            entity1.plane.dimensions._value.x = clippingPaneBack1.distance + clippingPaneFront1.distance;
                            entity2.plane.dimensions._value.x = clippingPaneBack1.distance + clippingPaneFront1.distance;

                            entity1.plane.dimensions._value.y = clippingPaneBack2.distance + clippingPaneFront2.distance;
                            entity2.plane.dimensions._value.y = clippingPaneBack2.distance + clippingPaneFront2.distance;

                            entity1.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                            entity2.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());

               
                            ///////////////////////////////////////////////////
                            entity1 = that.clippingPlanesEntities[Cartesian3.UNIT_Y];
                            entity2 = that.clippingPlanesEntities[new Cartesian3(0, -1, 0)];


                            // entity1.plane.dimensions._value.y = clippingPaneBack1.distance + clippingPaneFront1.distance;
                            // entity2.plane.dimensions._value.y = clippingPaneBack1.distance + clippingPaneFront1.distance;

                            // entity1.plane.dimensions._value.x = clippingPaneBack2.distance + clippingPaneFront2.distance;
                            // entity2.plane.dimensions._value.x = clippingPaneBack2.distance + clippingPaneFront2.distance;

                            entity1.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                            entity2.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;

                            entity1.plane.dimensions._value.y = clippingPaneBack2.distance + clippingPaneFront2.distance;
                            entity2.plane.dimensions._value.y = clippingPaneBack2.distance + clippingPaneFront2.distance;


                            planeModelMatrix = Matrix4.multiplyByTranslation(
                                mat,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, -nowdistanceX, new Cartesian3()),
                                new Matrix4()
                            );

                            // planeModelMatrix = Matrix4.multiplyByTranslation(
                            //     planeModelMatrix,
                            //     Cartesian3.multiplyByScalar(Cartesian3.UNIT_Y, -nowdistanceY, new Cartesian3()),
                            //     new Matrix4()
                            // );

                            planeModelMatrix = Matrix4.multiplyByTranslation(
                                planeModelMatrix,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_Z, -nowdistanceZ, new Cartesian3()),
                                new Matrix4()
                            );
            
                            entity1.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                            entity2.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());

                        }
                    }

                    if(Cartesian3.equals(normal, Cartesian3.UNIT_X) || Cartesian3.equals(normal, new Cartesian3(-1, 0, 0))) {
                        //前 生成一个水平面用来pick测算距离
                        //获取 水平面法线
                        let ray = that.scene.camera.getPickRay(position);
                        if(that.mouseDown.pickPlane) {
                            let result = IntersectionTests.rayPlane(ray, that.mouseDown.pickPlane);
                            if (!defined(result)) {
                                return;
                            }
                            let degree = that.cartesianToDegrees(result);
                            let startDegree = that.cartesianToDegrees(pickPlanePosition);
                            let newPos = Cartesian3.fromDegrees(degree.x, startDegree.y, startDegree.z);
                            let distance = Cartesian3.distance(newPos, pickPlanePosition);
                            //平面移动最大距离
                            if((maxcenter.x+maxDistance-0.5)>newPos.x && (maxcenter.x-maxDistance+0.5)<newPos.x){
                                // distance =degree.x > startDegree.x?distance:-distance
                                if(degree.x > startDegree.x) {
                                    //平面移动最大距离
                                    distance =maxDistance!=0?(Math.abs(distance) <Math.abs(2*maxDistance)?distance:(2*maxDistance-0.5)):distance;
                                } else {
                                    distance =maxDistance!=0?(Math.abs(distance) <Math.abs(2*maxDistance)?-distance:-(2*maxDistance-0.5)):-distance;
                                }
                            }else{
                                return
                            }
                            // if(degree.x > startDegree.x) {
                            //     //平面移动最大距离
                            //     distance =distance //maxDistance!=0?(Math.abs(distance) <Math.abs(maxDistance)?distance:(maxDistance-1)):distance;
                            // } else {
                            //     distance =maxDistance!=0?(Math.abs(distance) <Math.abs(maxDistance)?-distance:-(maxDistance-1)):-distance;
                            // }
                            // distance =degree.x > startDegree.x?distance:-distance
                            let newTargetY;
                            if(Cartesian3.equals(normal, Cartesian3.UNIT_X)) {
                                newTargetY = that.mouseDown.initDistance - distance;
                            } else {
                                newTargetY = that.mouseDown.initDistance + distance;
                            }
               
                            that.mouseDown.clippingPane.distance = newTargetY;


                            let center = Cartesian3.clone(that.getEntityPosition());
                            let mat = Transforms.eastNorthUpToFixedFrame(center);

                            let entity1 = that.clippingPlanesEntities[Cartesian3.UNIT_Y];
                            let entity2 = that.clippingPlanesEntities[new Cartesian3(0, -1, 0)];

                            let clippingPaneFront = that.getClippingPlaneByAxis(new Cartesian3(1, 0, 0));
                            let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(-1, 0, 0));

                            let clippingPaneFront1 = that.getClippingPlaneByAxis(new Cartesian3(0, 1, 0));
                            let clippingPaneBack1 = that.getClippingPlaneByAxis(new Cartesian3(0, -1, 0));

                            let clippingPaneFront2 = that.getClippingPlaneByAxis(new Cartesian3(0, 0, 1));
                            let clippingPaneBack2 = that.getClippingPlaneByAxis(new Cartesian3(0, 0, -1));
                            
                            let nowdistanceX = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
                            let nowdistanceY = (clippingPaneFront1.distance+clippingPaneBack1.distance) /2 - clippingPaneBack1.distance;
                            let nowdistanceZ = (clippingPaneFront2.distance+clippingPaneBack2.distance) /2 - clippingPaneBack2.distance;
              
                            let planeModelMatrix = Matrix4.multiplyByTranslation(
                                mat,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, -nowdistanceX, new Cartesian3()),
                                new Matrix4()
                            );
               
                            planeModelMatrix = Matrix4.multiplyByTranslation(
                                planeModelMatrix,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_Z, -nowdistanceZ, new Cartesian3()),
                                new Matrix4()
                            );
                            

                            entity1.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                            entity2.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;

                            entity1.plane.dimensions._value.y = clippingPaneBack2.distance + clippingPaneFront2.distance;
                            entity2.plane.dimensions._value.y = clippingPaneBack2.distance + clippingPaneFront2.distance;

                            entity1.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                            entity2.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());

                            ///////////////////////////////////////////////////
                            entity1 = that.clippingPlanesEntities[Cartesian3.UNIT_Z];
                            entity2 = that.clippingPlanesEntities[new Cartesian3(0, 0, -1)];


                            entity1.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                            entity2.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;

                            entity1.plane.dimensions._value.y = clippingPaneBack1.distance + clippingPaneFront1.distance;
                            entity2.plane.dimensions._value.y = clippingPaneBack1.distance + clippingPaneFront1.distance;

                            planeModelMatrix = Matrix4.multiplyByTranslation(
                                mat,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, -nowdistanceX, new Cartesian3()),
                                new Matrix4()
                            );

                            planeModelMatrix = Matrix4.multiplyByTranslation(
                                planeModelMatrix,
                                Cartesian3.multiplyByScalar(Cartesian3.UNIT_Y, -nowdistanceY, new Cartesian3()),
                                new Matrix4()
                            );

                            entity1.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                            entity2.position = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());

                        }
                    }
                }

                return;
            }

            let pick = that.scene.pick(position);
            if(defined(pick) && defined(pick.id)){
                let entity = pick.id;

                if(typeof entity.id == 'string' && entity.id.startsWith("BoxClip")){
                    let plane = entity.plane;
                    if(defined(lastHoverPlane) && lastHoverPlane.material.color._value.equals(pickedColor)){
                        lastHoverPlane.material.color = baseColor;
                        lastHoverPlane = null;
                        that.geomap.render();
                    }
                    if(plane.material.color._value.equals(baseColor)){
                        plane.material.color = pickedColor;
                        lastHoverPlane = plane;
                        that.geomap.render();
                    }

                }
            } else {
                if(defined(lastHoverPlane) && lastHoverPlane.material.color._value.equals(pickedColor)){
                    lastHoverPlane.material.color = baseColor;
                    lastHoverPlane = null;
                    that.geomap.render();
                }
            }
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        this.handler.setInputAction(function(event){
            if(that._handlerActive) {
            //恢复监听
            that.geomap.enableControl = true;
            planeSelected = undefined;
            }
        }, ScreenSpaceEventType.LEFT_UP);

    }


    /**经纬度转换
     * @ignore
     * @param {Array<Number>} position 经纬度
     * @return {Cartesian3} 
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  let poi = clipTool.cartesianToDegrees(position);
     */
    cartesianToDegrees(position) {
        let ellipsoid = this.ellipsoid;
        var cartographic = ellipsoid.cartesianToCartographic(position);
        var lat = CesiumMath.toDegrees(cartographic.latitude);
        var lng = CesiumMath.toDegrees(cartographic.longitude);
        var alt = cartographic.height;
        return new Cartesian3(lng, lat, alt);
    }

    /**
     * 计算pick平面的法向量
     * @param {Cartesian3} point 平面与球体切点
     * @returns {Plane} 法向量
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  let plane = clipTool.getPickPlane(point);
     */
    getPickPlane(point){
        let ellipsoid = this.ellipsoid;
        let cartographic= ellipsoid.cartesianToCartographic(point);
        let lat=CesiumMath.toDegrees(cartographic.latitude);
        let lng=CesiumMath.toDegrees(cartographic.longitude);
        let start = Cartesian3.fromDegrees( lng,  lat, 0);
    
        let geonormal = ellipsoid.geodeticSurfaceNormal(point);
        let foot = Cartesian3.subtract(this.scene.camera.position, start ,new Cartesian3());
        let project = this.getProjection(foot, geonormal);
        let t = Cartesian3.fromDegrees( lng,  lat, project);
        let normal = Cartesian3.normalize(Cartesian3.subtract(this.scene.camera.position, t, new Cartesian3), new Cartesian3);
        return  Plane.fromPointNormal(point, normal);
    }

    /**
     *求vecA（向量A）在vecB（向量B）上的投影长度
     * @param {Cartesian3} vecA 向量A
     * @param {Cartesian3} vecB 向量B
     * @returns {Number}
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  let res = clipTool.getProjection(vecA, vecB);
     */
    getProjection(vecA, vecB) {
        let r1 = Cartesian3.dot(vecA, vecB);
        let r2 = Cartesian3.magnitude(vecB);
        return r1 / r2;
    }

    // getProjectVectorLength(a, b) {
    //     return Cartesian3.dot(a, b) / Cartesian3.dot(b, b);
    // };
    /**
     * 对模型添加剖切盒
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.addClippingPlanes();
     */
    addClippingPlanes(){
        if(this._selectModel){
            this._clippingPlaneCollection.modelMatrix = GeoUtil.getTilesetClippingMatrix(this._selectModel);
            this._selectModel.clippingPlanes = this._clippingPlaneCollection;
        }
        //同步模型坐标矩阵
        // this._clippingPlaneCollection.modelMatrix=this._selectModel.modelMatrix

        //这边需要根据底面中心
        let center = Cartesian3.clone(this.getEntityPosition());
        //缩小剖切盒子的大小
        let distance = this.getEntityInitClippingPanelDistance();
        this.maxcenter=center;
        this.maxDistance=distance;
        this.mouseDown.clipDistance = distance ;
        for (let i = 0; i < this.clippingArray.length; i++) {
            const upAxis = this.clippingArray[i];
            //clippingplane添加
            let plane = new Plane(upAxis, distance);
            let scratchClippingPlane = new ClippingPlane(Cartesian3.UNIT_Y, 0.0);
            ClippingPlane.fromPlane(plane, scratchClippingPlane);
            this._clippingPlaneCollection.add(scratchClippingPlane);
            this._clippingDisc[upAxis] = scratchClippingPlane;

            this.addPlanePrimitive(plane, center, upAxis, distance);
        }
        this.getBoxParms(center,distance)
    }

    /**
     * 获取包围盒参数
     * @param {Object} center 中心点
     * @param {Number} distance 距离
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.getBoxParms(center,distance);
     */
    getBoxParms(center,distance){
        // let startDegree = this.cartesianToDegrees(pickPlanePosition);
        this.clippingBoxArray.minx=center.x-distance
        this.clippingBoxArray.maxx=center.x+distance
        this.clippingBoxArray.miny=center.y-distance
        this.clippingBoxArray.maxy=center.y+distance
        this.clippingBoxArray.minz=center.z-distance
        this.clippingBoxArray.maxz=center.z+distance
        this.maxcenter=center
        this.maxdistance=distance

        this.center=this.cartesianToDegrees(center);
        let poY=Util.calculatingTargetPoints(this.viewer,this.center.x, this.center.y, this.center.z+distance, Math.PI/2, distance)
        let poX=Util.calculatingTargetPoints(this.viewer,this.center.x, this.center.y, this.center.z+distance, 0, distance)
        let poY1=Util.calculatingTargetPoints(this.viewer,this.center.x, this.center.y, this.center.z+distance, Math.PI*3/4, distance)
        let poX1=Util.calculatingTargetPoints(this.viewer,this.center.x, this.center.y, this.center.z+distance, Math.PI, distance)

        this.clippingBoxLngLat.minx=poX.x<poX1.x?poX.x:poX1.x
        this.clippingBoxLngLat.maxx=poX.x>poX1.x?poX.x:poX1.x
        this.clippingBoxLngLat.miny=poY.y<poY1.y?poY.y:poY1.y
        this.clippingBoxLngLat.maxy=poY.y>poY1.y?poY.y:poY1.y
        this.clippingBoxLngLat.minz=this.center.z-distance
        this.clippingBoxLngLat.maxz=this.center.z+distance
    }


    /**
     * 添加平面模型
     * @param {Entity} plane 平面
     * @param {Cartesian3} center 中心
     * @param {Cartesian3} upAxis 轴向
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.addPlanePrimitive(plane, center, upAxis);
     */
    addPlanePrimitive(plane, center, upAxis) {
        let id = "BoxClip_"+upAxis.toString();
        //检查存在则先清除
        if(this.viewer.entities.getById(id)){
            this.viewer.entities.remove(this.viewer.entities.getById(id))
        }
        let entity = this.viewer.entities.add({
            id: id,
            attr: {
                plane: plane,
                dimensions: Cartesian2.ZERO
            },
            position: center,
            plane: {
                plane: new CallbackProperty(this.createPlaneUpdateFunc(plane, center),false),
                // plane: plane,
                dimensions: new Cartesian2(this._selectModel.boundingSphere.radius * 2, this._selectModel.boundingSphere.radius * 2),
                // dimensions: new CallbackProperty(this.createPlaneDimensionUpdateFunc(plane),false),
                material: Color.ROYALBLUE.withAlpha(0.1),
                outline: true,
                outlineWidth: 3,
                outlineColor: Color.CYAN,
            },
        });
        this.clippingPlanesEntities[upAxis] = entity;
        // this.clippingPlanesEntities.push(entity);
    }

    // /**
    //  * 更新平面的中心
    //  * @param {*} plane 
    //  */
    // createPlaneCenterUpdateFunc(plane, center, distance) {
    //     let that = this;
    //     return function() {
    //         //计算center
    //         let clippingPane = that.mouseDown.clippingPane;
    //         if(!defined(clippingPane)) return center;
    //         let noraml = clippingPane.normal._cartesian3;
    //         let mat = Transforms.eastNorthUpToFixedFrame(center);

    //         let entity = that.clippingPlanesEntities[plane.normal];
    //         if(Cartesian3.equals(plane.normal, Cartesian3.UNIT_X) || Cartesian3.equals(plane.normal, new Cartesian3(-1, 0, 0))) {
    //             if(Cartesian3.equals(noraml, Cartesian3.UNIT_Y) || Cartesian3.equals(noraml, new Cartesian3(0, -1, 0))) {
    //                 let clippingPaneFront = that.getClippingPlaneByAxis(new Cartesian3(0, 1, 0));
    //                 let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(0, -1, 0));
    //                 let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
    //                 if(Cartesian3.equals(noraml, new Cartesian3(0, -1, 0))) {
    //                     nowdistance = -nowdistance;
    //                 }
    //                 var planeModelMatrix = Matrix4.multiplyByTranslation(
    //                     mat,
    //                     Cartesian3.multiplyByScalar(noraml, -nowdistance, new Cartesian3()),
    //                     new Matrix4()
    //                 );
    //                 entity.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;

    //                 let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
    //                 return nowCenter;
    //             }

    //             if(Cartesian3.equals(noraml, Cartesian3.UNIT_Z) || Cartesian3.equals(noraml, new Cartesian3(0, 0, -1))) {
    //                 let clippingPaneFront = that.getClippingPlaneByAxis(Cartesian3.UNIT_Z);
    //                 let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(0, 0, -1));
    //                 let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
    //                 if(Cartesian3.equals(noraml, new Cartesian3(0, 0, -1))) {
    //                     nowdistance = -nowdistance;
    //                 }
    //                 var planeModelMatrix = Matrix4.multiplyByTranslation(
    //                     mat,
    //                     Cartesian3.multiplyByScalar(noraml, -nowdistance, new Cartesian3()),
    //                     new Matrix4()
    //                 );
    //                 entity.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;

    //                 let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
    //                 return nowCenter;
    //             }
    
    //         }

    //         if(Cartesian3.equals(plane.normal, Cartesian3.UNIT_Z) || Cartesian3.equals(plane.normal, new Cartesian3(0, 0, -1))) {
    //             // if(Cartesian3.equals(noraml, Cartesian3.UNIT_Y) || Cartesian3.equals(noraml, new Cartesian3(0, -1, 0))) {
    //                 let group = [];
    //                 group.push([new Cartesian3(0, 1, 0), new Cartesian3(0, -1, 0)]);
    //                 group.push([new Cartesian3(1, 0, 0), new Cartesian3(-1, 0, 0)]);

    //                 for (let i = 0; i < group.length; i++) {
    //                     const element = group[i];
    //                     let clippingPaneFront = that.getClippingPlaneByAxis(element[0]);
    //                     let clippingPaneBack = that.getClippingPlaneByAxis(element[1]);
    //                     let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
    //                     if(Cartesian3.equals(noraml, element[1])) {
    //                         nowdistance = -nowdistance;
    //                     }
    //                     var planeModelMatrix = Matrix4.multiplyByTranslation(
    //                         mat,
    //                         Cartesian3.multiplyByScalar(noraml, -nowdistance, new Cartesian3()),
    //                         new Matrix4()
    //                     );
    //                     entity.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;

    //                     let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());

    //                     console.log( entity)
                        
    //                 }
    //             //     let clippingPaneFront = that.getClippingPlaneByAxis(new Cartesian3(0, 1, 0));
    //             //     let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(0, -1, 0));
    //             //     let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
    //             //     if(Cartesian3.equals(noraml, new Cartesian3(0, -1, 0))) {
    //             //         nowdistance = -nowdistance;
    //             //     }
    //             //     var planeModelMatrix = Matrix4.multiplyByTranslation(
    //             //         mat,
    //             //         Cartesian3.multiplyByScalar(noraml, -nowdistance, new Cartesian3()),
    //             //         new Matrix4()
    //             //     );
    //             //     entity.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;

    //             //     let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
    //             // //     return nowCenter;
    //             // // }
                
    //             // // if(Cartesian3.equals(noraml, Cartesian3.UNIT_X) || Cartesian3.equals(noraml, new Cartesian3(-1, 0, 0))) {
    //             // //     console.log('aaaa')
    //             //     let clippingPaneFront = that.getClippingPlaneByAxis(Cartesian3.UNIT_X);
    //             //     let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(-1, 0, 0));
    //             //     let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
    //             //     if(Cartesian3.equals(noraml, new Cartesian3(-1, 0, 0))) {
    //             //         nowdistance = -nowdistance;
    //             //     }
    //             //     var planeModelMatrix = Matrix4.multiplyByTranslation(
    //             //         mat,
    //             //         Cartesian3.multiplyByScalar(noraml, -nowdistance, new Cartesian3()),
    //             //         new Matrix4()
    //             //     );
    //             //     entity.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;

    //             //     let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
    //             //     return nowCenter;
    //             // }
    
    //         }

    

    //         return center;
    //     }
    // }

    /**
     * 更新平面的中心
     * @param {Entity} plane  平面
     * @returns {Entity} plane平面
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.createPlaneUpdateFunc(plane);
     */
    createPlaneUpdateFunc(plane){
        let that = this;
        return function () {
            let operatePlane = that.mouseDown.clippingPane;
            if(defined(operatePlane)){
                let normal = operatePlane.normal._cartesian3;
               
                if(Cartesian3.equals(normal, plane.normal)){
                    let clippingPane = that.getClippingPlaneByAxis(normal);
                    plane.distance = clippingPane.distance;
                }

                // let mat = Transforms.eastNorthUpToFixedFrame(center);

                // let entity1 = that.clippingPlanesEntities[Cartesian3.UNIT_X];
                // let entity2 = that.clippingPlanesEntities[new Cartesian3(-1, 0, 0)];

                // let clippingPaneFront = that.getClippingPlaneByAxis(new Cartesian3(0, 1, 0));
                // let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(0, -1, 0));
                // let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
                // if(Cartesian3.equals(normal, new Cartesian3(0, -1, 0))) {
                //     nowdistance = -nowdistance;
                // }

                // let planeModelMatrix = Matrix4.multiplyByTranslation(
                //     mat,
                //     Cartesian3.multiplyByScalar(Cartesian3.UNIT_Y, -nowdistance, new Cartesian3()),
                //     new Matrix4()
                // );

                // entity1.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                // entity2.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;

                // let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                // entity1.position = nowCenter;
                // entity2.position = nowCenter;
                //////////////////////////////////////////////////////////////////////////////////
                //  受Y控制 x
                // clippingPaneFront = that.getClippingPlaneByAxis(new Cartesian3(0, 0, 1));
                // clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(0, 0, -1));
                // nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
                // if(Cartesian3.equals(normal, new Cartesian3(0, 0, -1))) {
                //     nowdistance = -nowdistance;
                // }

                // planeModelMatrix = Matrix4.multiplyByTranslation(
                //     mat,
                //     Cartesian3.multiplyByScalar(Cartesian3.UNIT_Z, -nowdistance, new Cartesian3()),
                //     new Matrix4()
                // );
                // entity1.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;
                // entity2.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;

                // nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                // entity1.position = nowCenter;
                // entity2.position = nowCenter;



                // if(Cartesian3.equals(plane.normal, Cartesian3.UNIT_Y)) {
                //     //受x控制x  受z控制y
                //     let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
                //     if(Cartesian3.equals(normal, new Cartesian3(-1, 0, 0))) {
                //         nowdistance = -nowdistance;
                //     }

                //     let planeModelMatrix = Matrix4.multiplyByTranslation(
                //         mat,
                //         Cartesian3.multiplyByScalar(normal, -nowdistance, new Cartesian3()),
                //         new Matrix4()
                //     );

                //     entity1.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                //     entity2.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                    
                //     let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                //     entity1.position = nowCenter;
                //     entity2.position = nowCenter;
                // }

                // if(Cartesian3.equals(normal, Cartesian3.UNIT_X) || Cartesian3.equals(normal, new Cartesian3(-1, 0, 0))) {

                //     let clippingPaneFront = that.getClippingPlaneByAxis(new Cartesian3(1, 0, 0));
                //     let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(-1, 0, 0));
                //     let entity1 = that.clippingPlanesEntities[Cartesian3.UNIT_Y];
                //     let entity2 = that.clippingPlanesEntities[new Cartesian3(0, -1, 0)];

                //     if(Cartesian3.equals(plane.normal, Cartesian3.UNIT_Y)) {
                //         //受x控制x  受z控制y
                //         let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
                //         if(Cartesian3.equals(normal, new Cartesian3(-1, 0, 0))) {
                //             nowdistance = -nowdistance;
                //         }

                //         let planeModelMatrix = Matrix4.multiplyByTranslation(
                //             mat,
                //             Cartesian3.multiplyByScalar(normal, -nowdistance, new Cartesian3()),
                //             new Matrix4()
                //         );

                //         entity1.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                //         entity2.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                        
                //         let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                //         entity1.position = nowCenter;
                //         entity2.position = nowCenter;
                //     }

                //     if(Cartesian3.equals(plane.normal, Cartesian3.UNIT_Z)) {
                //         //受x控制x  受z控制y
                //         // let entity1 = that.clippingPlanesEntities[Cartesian3.UNIT_Z];
                //         // let entity2 = that.clippingPlanesEntities[new Cartesian3(0, 0, -1)];

                //         let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
                //         if(Cartesian3.equals(normal, new Cartesian3(0, 0, -1))) {
                //             nowdistance = -nowdistance;
                //         }

                //         let planeModelMatrix = Matrix4.multiplyByTranslation(
                //             mat,
                //             Cartesian3.multiplyByScalar(normal, -nowdistance, new Cartesian3()),
                //             new Matrix4()
                //         );

                //         entity1.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;
                //         entity2.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;
                        

                //         let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                //         entity1.position = nowCenter;
                //         entity2.position = nowCenter;
                //         // ////////////////////////////////////////////////////////////////////////////////

                //     }
                    

                // }

                // if(Cartesian3.equals(normal, Cartesian3.UNIT_Y) || Cartesian3.equals(normal, new Cartesian3(0, -1, 0))) {
                    
                //     // let group = [];
                //     // group.push([new Cartesian3(0, 0, 1), new Cartesian3(0, 0, -1)]); //y
                //     // // group.push([new Cartesian3(0, 1, 0), new Cartesian3(0, -1, 0)]); //x
                //     // group.push([new Cartesian3(1, 0, 0), new Cartesian3(-1, 0, 0)]);

                //     // let clippingPaneFront = that.getClippingPlaneByAxis(new Cartesian3(0, 1, 0));
                //     // let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(0, -1, 0));

                //     // let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
                //     // if(Cartesian3.equals(normal, new Cartesian3(0, -1, 0))) {
                //     //     nowdistance = -nowdistance;
                //     // }
                //     // var planeModelMatrix = Matrix4.multiplyByTranslation(
                //     //     mat,
                //     //     Cartesian3.multiplyByScalar(normal, -nowdistance, new Cartesian3()),
                //     //     new Matrix4()
                //     // );

                //     // for (let i = 0; i < group.length; i++) {
                //     //     const element = group[i];
                //     //     let entity1 = that.clippingPlanesEntities[element[0]];
                //     //     let entity2 = that.clippingPlanesEntities[element[1]];

                //     //     if(i === 0) {
                //     //         entity1.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;
                //     //         entity2.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;
                //     //     } else {
                //     //         entity1.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                //     //         entity2.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                //     //     }

                //     //     let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                //     //     entity1.position = nowCenter;
                //     //     entity2.position = nowCenter;
                        
                //     // }

                // }


                // if(Cartesian3.equals(normal, Cartesian3.UNIT_Z) || Cartesian3.equals(normal, new Cartesian3(0, 0, -1))) {
                    
                //     let group = [];
                //     // group.push([new Cartesian3(0, 0, 1), new Cartesian3(0, 0, -1)]); //y
                //     group.push([new Cartesian3(0, 1, 0), new Cartesian3(0, -1, 0)]); //x
                //     group.push([new Cartesian3(1, 0, 0), new Cartesian3(-1, 0, 0)]);

                //     let clippingPaneFront = that.getClippingPlaneByAxis(new Cartesian3(0, 0, 1));
                //     let clippingPaneBack = that.getClippingPlaneByAxis(new Cartesian3(0, 0, -1));

                //     let nowdistance = (clippingPaneFront.distance+clippingPaneBack.distance) /2 - clippingPaneBack.distance;
                //     if(Cartesian3.equals(normal, new Cartesian3(0, 0, -1))) {
                //         nowdistance = -nowdistance;
                //     }
                //     var planeModelMatrix = Matrix4.multiplyByTranslation(
                //         mat,
                //         Cartesian3.multiplyByScalar(normal, -nowdistance, new Cartesian3()),
                //         new Matrix4()
                //     );

                //     for (let i = 0; i < group.length; i++) {
                //         const element = group[i];
                //         let entity1 = that.clippingPlanesEntities[element[0]];
                //         let entity2 = that.clippingPlanesEntities[element[1]];

                //         if(i === 0) {
                //             entity1.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;
                //             entity2.plane.dimensions._value.y = clippingPaneBack.distance + clippingPaneFront.distance;
                //         } else {
                //             entity1.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                //             entity2.plane.dimensions._value.x = clippingPaneBack.distance + clippingPaneFront.distance;
                //         }

                //         let nowCenter = Matrix4.getTranslation(planeModelMatrix, new Cartesian3());
                //         entity1.position = nowCenter;
                //         entity2.position = nowCenter;
                        
                //     }

                // }
  
            }

            return plane;
        }
    }

    /**
     * 根据axis获取剖切面
     * @param {Cartesian3} axis 轴向
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.getClippingPlaneByAxis(axis);
     */
    getClippingPlaneByAxis(axis) {
        return this._clippingDisc[axis];
    }

    /**
     * 获取模型包围盒大小
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.getEntityInitClippingPanelDistance();
     */
    getEntityInitClippingPanelDistance() {
        if(defined(this._selectModel.boundingSphere)){
            return this._selectModel.boundingSphere.radius;
        }
        return 0;
    }

    /**
     * 获取到包围盒的中心
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.getEntityPosition();
     */
    getEntityPosition(){
        if(this._selectModel instanceof Cesium3DTileset){
            return this._selectModel.boundingSphere.center;
        } else if(this._selectModel instanceof Model){
            return Matrix4.getTranslation(this._selectModel.modelMatrix,new Cartesian3());
        }

    }


    /**
     * 获取剖切对应的旋转矩阵
     * @param {Object} plane 剖切对象
     * @return {Matrix3} 旋转矩阵
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  let matrix = clipTool.getRotationMatrix3(plane);
     */
    getRotationMatrix3(plane){
        let rotationMat3;
        if(Cartesian3.equals(plane.normal, Cartesian3.UNIT_X) || Cartesian3.equals(Cartesian3.negate(plane.normal, new Cartesian3()),Cartesian3.UNIT_X)){
            rotationMat3 = Matrix3.fromRotationY(Math.PI / 2);
        } else if(Cartesian3.equals(plane.normal, Cartesian3.UNIT_Y) || Cartesian3.equals(Cartesian3.negate(plane.normal, new Cartesian3()),Cartesian3.UNIT_Y)) {
            rotationMat3 = Matrix3.fromRotationX(Math.PI / 2);
        } else {
            rotationMat3 = Matrix3.IDENTITY;
        }
        return rotationMat3;
    }


    /**
     * 剖切面位移矩阵
     * @param {Object}  plane 剖切面
     * @return {Matrix4} 位移矩阵
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  let matrix = clipTool.getDistanceMatrix4(plane);
     */
    getDistanceMatrix4(plane) {
        let worldNormal = Matrix4.multiplyByPointAsVector(this.getEntityMatrix())
        worldNormal = Cartesian3.negate(worldNormal, worldNormal);
        worldNormal = Cartesian3.multiplyByScalar(worldNormal, plane.distance, worldNormal);
        return Matrix4.fromTranslation(worldNormal);
    }

    /**
     * 获取当前选中模型的旋转矩阵
     * @return {Matrix4} 旋转矩阵
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  let matrix = clipTool.getEntityMatrix();
     */
    getEntityMatrix() {
        if(this._selectModel instanceof Cesium3DTileset){
           return this._selectModel.root.transform;
        }

        return this._selectModel.modelMatrix;
    }

    /**
     * 获取与选中平面的交点
     * @param {Ray} ray 提供的原点沿提供的方向无限延伸的射线
     * @param {Cartesian3} point 点
     * @param {Cartesian3} noraml 法线向量
     * @returns {Cartesian3} 焦点
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  let poi = clipTool.getPickPlanePoint(ray, point, noraml);
     */
    getPickPlanePoint(ray, point, noraml){
        let denominator = Cartesian3.dot(noraml, ray.direction);
        if (denominator === 0) {
            return undefined;
        } else {
            let numerator = Cartesian3.dot(noraml, Cartesian3.subtract(point, ray.origin, new Cartesian3()));
            let factor = numerator / denominator;
            if (factor >= 0) {
                return Cartesian3.add(ray.origin, Cartesian3.multiplyByScalar(ray.direction, factor, new Cartesian3()), new Cartesian3());
            }
        }
    }

    /**
     * 移除剖切监听
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.removeEventHandler();
     */
    removeEventHandler() {
        if (defined(this.handler)) {
            this.handler.destroy();
            this.handler = null;
        }
    }


    // /**
    //  * 清空剖切区域
    //  */
    // clear(){
    //     //清空clippingPlaneCollection
    //     // if (defined(this._clippingPlaneCollection)) {
    //     //     this._clippingPlaneCollection.removeAll();
    //     //     this._clippingPlaneCollection = undefined;
    //     // }
    //     // 清空this._selectModel.clippingPlanes
    //     if(defined(this._selectModel.clippingPlanes)){
    //         this._selectModel.clippingPlanes.removeAll();
    //         // this._selectModel.clippingPlanes = undefined;
    //     }
    //     // //移除所有的平面
    //     for (let i = 0; i < this.clippingPlanesEntities.length; i++) {
    //         // const element = this.clippingPlanesEntities[i];
    //         this.viewer.entities.remove(this.clippingPlanesEntities[i]);
    //     }
    //     this.clippingPlanesEntities.splice(0,this.clippingPlanesEntities.length);//清空
    //     //清除clipbox
    //     for(let i=0;i< 6;i++)
    //     {
    //         if(this.viewer.entities.getById("BoxClip_"+i)){
    //             this.viewer.entities.remove(this.viewer.entities.getById("BoxClip_"+i));
    //             // this.viewer.entities.getById("BoxClip_"+i).show = false;   //隐藏
    //         }
    //     }
    //     this._clippingDisc={};
    //     this.removeEventHandler();//移除监听
    //     this._selectModel = undefined;
    // }

    /**
     * 隐藏剖切区域
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.hide();
     */
    hide(){
        // let selectModel = this._selectModel;
        // if(selectModel.clippingPlanes){
        //     selectModel.clippingPlanes.enabled = false;
        // }
        // let selectModel = this._selectModel;
        if(defined(this._clippingPlaneCollection)){
            this._clippingPlaneCollection.enabled = false;
        }

        for (const key in this.clippingPlanesEntities) {
            if (this.clippingPlanesEntities.hasOwnProperty(key)) {
                const element = this.clippingPlanesEntities[key];
                element.show = false;
            }
        }
        // for(let i=0;i< this.viewer.entities._entities.length;i++)
        // {
        //     if(this.viewer.entities.getById("BoxClip_"+i)){
        //         this.viewer.entities.getById("BoxClip_"+i).show = false;   //隐藏
        //     }
        // }
    }
    /**
     * 显示剖切区域
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.show();
     */
    show(){
        if(defined(this._clippingPlaneCollection)){
            this._clippingPlaneCollection.enabled = true;
        }

        for (const key in this.clippingPlanesEntities) {
            if (this.clippingPlanesEntities.hasOwnProperty(key)) {
                const element = this.clippingPlanesEntities[key];
                element.show = true;
            }
        }
        // for(let i=0;i< this.viewer.entities._entities.length;i++)
        // {
        //     if(this.viewer.entities.getById("BoxClip_"+i)){
        //         this.viewer.entities.getById("BoxClip_"+i).show = true;   //显示
        //     }
        // }
    }
    /**
     * 隐藏剖切盒
     * @example
     *  var clipTool = new BOSGeo.ClipTools(geomap);
     *  clipTool.hideBox();
     */
    hideBox(){
        for (const key in this.clippingPlanesEntities) {
            if (this.clippingPlanesEntities.hasOwnProperty(key)) {
                const element = this.clippingPlanesEntities[key];
                element.show = false;
            }
        }
    }
}

export default ClipTools;