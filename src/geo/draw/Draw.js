import defined from "cesium/Core/defined";
import ScreenSpaceEventHandler from "cesium/Core/ScreenSpaceEventHandler";
import ScreenSpaceEventType from "cesium/Core/ScreenSpaceEventType";
import Cartesian3 from "cesium/Core/Cartesian3";
import Color from "cesium/Core/Color";
import Cartesian2 from "cesium/Core/Cartesian2";
import buildModuleUrl from "cesium/Core/buildModuleUrl";

import PrimitiveCollection from 'cesium/Scene/PrimitiveCollection';
import LabelCollection from 'cesium/Scene/LabelCollection';
import { Globe_DrawLayerId } from '../constant/GlobeStaticValue';

class Draw {
    /**
     * 基础绘制类，是DrawCircle、DrawPoint、DrawPolygon、DrawRectangle、DrawPolyline、DrawPrimitive 的基类
     * @alias Draw
     * @constructor
     * 
     * @private
     *
     * @see DrawCircle 
     * @see DrawPoint
     * @see DrawPolygon
     * @see DrawRectangle
     * @see DrawPolyline 
     * @see DrawArcLine
     * @see DrawPrimitive
     * 
     * @param {GeoMap} geomap GeoMap对象
     * 
     * @example
     * var draw = new BOSGeo.Draw(geomap);
     */
    constructor(geomap){
        this.geomap = geomap;
        this.viewer = geomap.viewer;
        this.scene = this.viewer.scene;
        this.camera = this.scene.camera;
        this.ellipsoid = this.scene.globe.ellipsoid;

        this.dragIcon = buildModuleUrl('./resource/images/circle_gray.png');
        this.dragIconLight = buildModuleUrl('./resource/images/circle_red.png');

        this.okHandler = null; //成功后的回调
        this.cancelHandler = null; //取消的回调

        this.isDrawing = false;

        //上一次pick的point点
        this.lastPoint = null;

        //绘制的属性
        this.attr ={};

        this.shapeDic = {};  //记录坐标信息

        this.drawLayerId = Globe_DrawLayerId; // 'globeDrawLayer';
        this.layerId = 'drawLayer'; //指定图层 绘制编辑时候 用于清除

        //显示的距离标签
        this.showLabels = [];

        this.markers = {};
        this.markerforexclude = [];

        /**
         * 图元绘制图层集合
         * @property {PrimitiveCollection} drawLayer
         * @readonly
         */
        let drawLayer = this.scene.primitives._primitives.find(primitive => primitive.id === Globe_DrawLayerId);
        if (!defined(drawLayer)) {
            drawLayer = this.scene.primitives.add(new PrimitiveCollection());
            drawLayer.id = Globe_DrawLayerId;
            drawLayer.labels = drawLayer.add(new LabelCollection()); // 方便获取绘制对象的集合
        }
        this.drawLayer = drawLayer;
    }

    /**
     * 移除绘制监听事件
     * 
     * @example
     * draw.clear();
     */
    clear(){
        if(this.drawHandler){
            this.drawHandler.destroy();
            this.drawHandler = null;
        }
        if (this.modifyHandler) {
            this.modifyHandler.destroy();
            this.modifyHandler = null;
        }
        this._clearMarkers(this.layerId);
    }

    /**
     * 清空标记
     * 
     * @private
     * 
     * @param {String} layerName
     */
    _clearMarkers(layerName){
        let that = this;
        let viewer = that.viewer;
        let markerforexclude = that.markerforexclude;
        for (let i = 0; i < markerforexclude.length; i++) {
            let marker = markerforexclude[i];
            viewer.entities.remove(marker);
        }
        that.markerforexclude = [];
        // let entityList = viewer.entities.values;
        // if (entityList == null || entityList.length < 1)
        //     return;
        // for (let i = 0; i < entityList.length; i++) {
        //     let entity = entityList[i];
        //     if (entity.flag == 'anchor' && entity.shapeType !== "Point") {
        //         viewer.entities.remove(entity);
        //         // i--;
        //     }
        // }
    }

     /**
     * 左键点击后的回调
     * 
     * @private
     */
    leftClickCallback(){
        // TODO
    }

    /**
     * 鼠标按下的回调
     * 
     * @private
     */
    leftDownCallback(){
        // TODO
    }

    /**
     * 鼠标松开的回调
     * 
     * @private
     */
    leftUpCallback(){
        // TODO
    }

    /**
     * 鼠标移动后的回调
     * 
     * @private
     */
    mouseMoveCallback(){
        // TODO
    }

    /**
     * 鼠标右键回调
     * 
     * @private
     */
    rightClickCallback(){
        // TODO
    }

    /**
     * 鼠标单击回调
     * 
     * @private
     * 
     * @param {Event} event 
     */
    clickCallBack(event){
        // TODO
    }

    /**
     * 开始绘制
     * 
     * @private
     * 
     * @param {Object} attr 
     * @param {Function} okHandler 
     * @param {Function} cancelHandler 
     */
    _startDraw(attr, okHandler, cancelHandler){
        this.okHandler = okHandler;
        this.cancelHandler = cancelHandler;
        this.attr = attr;
        let that = this;
        if(!defined(this.drawHandler)){
            this.drawHandler = new ScreenSpaceEventHandler(this.scene.canvas);
            this.drawHandler.setInputAction( (event) => {
                let position = event.position;
                if(!defined(position)){
                    return;
                }

                let pickedPosition = that.scene.pickPosition(position);
                if(defined(pickedPosition)){
                    that.leftClickCallback(pickedPosition);
                }else {
                    let objects = that.scene.drillPick(position,2);
                    if(defined(objects)){
                        for (let i = 0; i < objects.length; i++) {
                            const element = objects[i];
                            if(defined(element.id)){
                                let flag = element.id.flag;
                                if(flag === 'anchor'){
                                    that.leftClickCallback(element.id.position._value);
                                }
                            }
                        }
                    }
                }

            },ScreenSpaceEventType.LEFT_DOWN);

            this.drawHandler.setInputAction((event) => {
                let position = event.endPosition;
                if(!defined(position)){
                    return;
                }

                let pickedPosition = that.scene.pickPosition(position);
                if(defined(pickedPosition)){
                    that.mouseMoveCallback(pickedPosition,position);
                }

            },ScreenSpaceEventType.MOUSE_MOVE);


            this.drawHandler.setInputAction( (event) => {
                let position = event.position;
                if(!defined(position)){
                    return;
                }

                let pickedPosition = that.scene.pickPosition(position);
                if(defined(pickedPosition)){
                    that.rightClickCallback(pickedPosition);
                }

            },ScreenSpaceEventType.RIGHT_CLICK);
        }

    }

    /**
     * 开始编辑
     * 
     * @private
     * 
     * @param {Object} attr 
     * @param {Function} okHandler 
     * @param {Function} cancelHandler 
     */
    _startModify(attr, okHandler, cancelHandler){
        this.okHandler = okHandler;
        this.cancelHandler = cancelHandler;

        this.attr = attr;
        let that = this;

        this.clear();

        if(!defined(this.modifyHandler)){
            this.modifyHandler = new ScreenSpaceEventHandler(this.scene.canvas);
            this.modifyHandler.setInputAction(function(event){
                let position = event.position;
                if (!defined(position)) {
                    return;
                }
                //暂时先不做编辑，有需求再加

            },ScreenSpaceEventType.LEFT_CLICK);
        }
    }

    /**
     * 计算中心点
     * 
     * @private
     * 
     * @param {Cartesian3} pre 第一个点
     * @param {Cartesian3} next 第二个点
     * @returns {Cartesian3}
     */
    _computeCenter(pre,next){
        let res1 = Cartesian3.add(pre,next,new Cartesian3());
        let center = Cartesian3.divideByScalar(res1,2,new Cartesian3());
        return center;
    }

    /**
     * 创建关键点
     * 
     * @private
     * 
     * @param {Cartesian3} position
     * @param {Number} oid
     * @returns {Entity}
     */
    _createPoint(position, oid){
        let that = this;
        let point = that.viewer.entities.add({
            position : position,
            billboard: {
                image : that.dragIconLight,
                disableDepthTestDistance : Number.POSITIVE_INFINITY
            }
        });
        point.oid = oid;
        point.sid = position.sid; //原始序号
        point.layerId = that.layerId;
        point.flag = 'anchor';
        that.markers[oid] = point;
        that.markerforexclude.push(point);
        return point;
    }

    /**
     * 创建文字标签
     * 
     * @private
     * 
     * @param {Cartesian3} position3d 标签位置
     * @param {Number} oid 
     * @returns {LabelGraphics}
     */
    _createLabel(position3d,oid){
        let that = this;
        let label = this.viewer.entities.add({
            position : position3d,
            label : {
                text : '',
                fillColor : Color.WHITE,
                showBackground : true,
                backgroundColor : Color.fromCssColorString('#AAAAAA').withAlpha(0.2),
                font : '16px Microsoft Yahei',
                pixelOffset : new Cartesian2(0,-20),
                // style : .LabelStyle.FILL_AND_OUTLINE,
                disableDepthTestDistance : Number.POSITIVE_INFINITY,
            }
        });
        label.oid = oid;
        label.sid = position3d.sid; //原始序号
        label.layerId = that.layerId;
        return label;
    }

  
}

export default Draw;