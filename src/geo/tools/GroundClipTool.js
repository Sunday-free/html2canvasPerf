import Cartesian3 from "cesium/Core/Cartesian3";
import Matrix4 from "cesium/Core/Matrix4";
import Color from "cesium/Core/Color";
import Cesium3DTileset from "cesium/Scene/Cesium3DTileset";
import Plane from "cesium/Core/Plane";
import ClippingPlane from "cesium/Scene/ClippingPlane";
import ClippingPlaneCollection from "cesium/Scene/ClippingPlaneCollection";
// import MultiClippingPlaneCollection from "cesium/Scene/MultiClippingPlaneCollection";
import defined from "cesium/Core/defined";
import ScreenSpaceEventHandler from "cesium/Core/ScreenSpaceEventHandler";
import ScreenSpaceEventType from "cesium/Core/ScreenSpaceEventType";
import CallbackProperty from "../../../cesium/Source/DataSources/CallbackProperty";
import {Label} from "../common/Label"
import Util from "../utils/Util";


/**
 * 地形剖切工具。
 * 注意：在Geo2.5版本中将用GlobalClippingTool代替并移除该类。
 * @alias GroundClipTool
 * @constructor
 * @param {GeoMap} geomap GeoMap对象
 * @param {Function} callback 绘制完成回调函数
 * @example
 * var droudclipTool = new BOSGeo.GroundClipTool(geomap);
 */
class GroundClipTool {
    constructor(geomap,callback) {
        this.viewer = geomap.viewer;
        this.scene = this.viewer.scene;
        // this.labelTip = null;
        this._handlerActive=true;//激活状态参数
        this.handler = null;  //操作监听事件
        this.handlers=[]
        this.isDestoryed = false;
        this.thats=null
        this.entity=null
        this.labelTip=this.labelTip? this.labelTip: new Label()
        this._finished=false;
		this._flag=false;
        this._callback=callback;
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
	 * 是否完成绘制，true为完成，false为进行中
	 */
    get finished() {
        return this._finished;
    }

    /**
     * 绘制剖切的地形区域
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.drawArea();
     */
    drawArea() {
        // this.clearArea();
        if(this._handlerActive) {
            if (!this.handler ) {
                this.handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
                // console.log('!defined',this.handler)
            }

            let that = this;


            that.positions = [];
            let entity;
            that.entity = entity
            if(!that._handlerActive){
                // that._handlerActive=true
                if(defined(that.labelTip._div.style.display=== 'block')){
                    that.labelTip.setVisible(false);
                }
            }
            that.handlers.push(that.handler)
        this.handler.setInputAction(function (event) {
            if(that._handlerActive){
                let position = event.position;
                if(!defined(position)){
                    return;
                }
                let pickedPosition = that.scene.pickPosition(position);
                if(defined(pickedPosition)){
                    let num = that.positions.length;
                    if(num == 0){
                        that.positions.push(pickedPosition);
                        entity = that._showPolyline2Map();
                    }
                    that.positions.push(pickedPosition);
                }
            }

        }, ScreenSpaceEventType.LEFT_DOWN);

        this.handler.setInputAction(function (event) {
            if(that._handlerActive) {
                let position = event.endPosition;
                if (!defined(position)) {
                    return;
                }
                let pickedPosition = that.scene.pickPosition(position);
                if (defined(pickedPosition)) {
                    if (that.positions.length < 1) {
                        return;
                    }
                    that.positions.pop();
                    that.positions.push(pickedPosition);
                }
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        this.handler.setInputAction(function (event) {
            if (that.positions.length >= 4) {
                if (defined(that.labelTip._div.style.display === 'block')) {
                    that.labelTip.setVisible(false);
                }
                if (that._handlerActive) {
                    that.positions.pop();
                    if (that.handler) {
                        that.handler.destroy();
                        that.handler = null;
                    }
                    if (defined(entity)) {
                        that.viewer.entities.remove(entity);
                        entity = undefined;
                    }
                    // console.log(entity)
                    // entity.polyline.positions = that.positions;
                    if (that.positions.length >= 3) {
                        that.clipArea(that.positions);
                    }
                    that.positions = [];
                }
            }
        }, ScreenSpaceEventType.RIGHT_CLICK);
        }
    }

    /**
     * 打开挖洞提示信息
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.constantTip();
     */
    constantTip(){
        this.labelTip.setContent("<span id='cd_label' style='position:absolute;left:45%;top:10px;font-size:13px;text-align:center;font-family:微软雅黑;color:#edffff;'>左键添加点，ctrl+z撤销，右键结束挖洞</span>");
        this.labelTip.setVisible(true);
    }

    /**
     * 关闭挖洞提示信息
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.closeLabelTip();
     */
    closeLabelTip(){
        this.labelTip.setContent("<span id='cd_label' style='position:absolute;left:45%;top:10px;font-size:13px;text-align:center;font-family:微软雅黑;color:#edffff;'></span>");
        if(defined(this.labelTip._div.style.display=== 'block')){
            this.labelTip.setVisible(false);
        }
    }
    /**
     * 移除剖切监听
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.removeEventHandler();
     */
    removeEventHandler() {
        if (defined(this.handler)) {
            this.handler.destroy();
            this.handler = null;
        }

    }

    /**
     * 销毁
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.destroy();
     */
    destroy() {
        this.removeEventHandler()
    }

    /**
     * 开挖清除
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.clear();
     */
    clear(){
        this._handlerActive=false;//激活状态参数
        this.removeEventHandler()
        let LabelTip=document.getElementsByClassName('bosgeo-label')
        for (let iLabelTip of LabelTip) {
            if(iLabelTip){
                iLabelTip.style.display = 'none';
            }
        }
        if(this.entity){
            for (let tempEntity of this.entity) {
                this.viewer.entities.remove(tempEntity)
            }
        }
        if(this.handlers.length>0) {
            for (let i=0;i< this.handlers.length;i++) {
				let handler=this.handlers[i];				
                if(!handler.isDestroyed()){
					this.handlers[i].destroy();
					this.handlers[i] = null;
				}
            }
            this.handlers=[]
        }

        // this.clippingPlanesEnabled = false;
        let globe = this.viewer.scene.globe;
        if(globe.clippingPlanes){
            globe.clippingPlanes.enabled = false;
            globe.clippingPlanes.removeAll();
            globe.clippingPlanes = undefined;
        }
        this._finished = false
        // console.log(this.handler)
    }
    /**
     * 撤销 ctrl+z
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.ctrlz();
     */
    ctrlz(){
        var that = this
        var i=0; //变量i
        //keydown
        document.addEventListener('keydown', function (e) {
            //ctrl+z撤销
            if (e.ctrlKey && e.keyCode ===90 ) { //'Z'.charCodeAt(0)  && positionsLen==that.positions.length
                if(that._flag){
                    return;
                }
                this._flag=true;
                //最后一个点，自动退出绘制
                if(that.positions.length==2){
                    if(that.handler){
                        that.handler.destroy();
                        that.handler = null;
                    }
                    if(defined(that.entity)){
                        that.viewer.entities.remove(that.entity);
                        that.entity= undefined;
                    }
                    that.positions = [];

                    let LabelTip=document.getElementsByClassName('bosgeo-label')
                    for (let iLabelTip of LabelTip) {
                        if(iLabelTip){
                            iLabelTip.style.display = 'none';
                        }
                    }
                    return ;
                }
                if(that._flag){
                    that.positions.pop()
                    // return ;
                }
            }
            i++
        }, true);
        //keyup
        document.addEventListener('keyup',function(){
            that._flag=false;
        });
        // },2200)
/* 
        setTimeout(function(){
            document.addEventListener('keyup', function (e) {
                // if(e.repeat){
                //     return ;
                // }
                //ctrl+z撤销
                if (e.ctrlKey && e.keyCode ===90 ) { //'Z'.charCodeAt(0)  && positionsLen==that.positions.length
                    //最后一个点，自动退出绘制
                    if(that.positions.length==2){
                        if(that.handler){
                            that.handler.destroy();
                            that.handler = null;
                        }
                        if(defined(that.entity)){
                            that.viewer.entities.remove(that.entity);
                            that.entity= undefined;
                        }
                        that.positions = [];
        
                        let LabelTip=document.getElementsByClassName('bosgeo-label')
                        for (let iLabelTip of LabelTip) {
                            if(iLabelTip){
                                iLabelTip.style.display = 'none';
                            }
                        }
                        // that.clear();
                        return ;
                    }
                }
            }, true);
        },2200) */
    }

    /**
     * 退出 Esc
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.esc();
     */
    esc(){
        let that = this;
        setTimeout(function(){
            document.addEventListener('keyup', function (e) {
                //Esc退出
                if (e.keyCode==27){
                    if(that.handler){
                        that.handler.destroy();
                        that.handler = null;
                    }
                    if(defined(that.entity)){
                        that.viewer.entities.remove(that.entity);
                        that.entity= undefined;
                    }

                    let LabelTip=document.getElementsByClassName('bosgeo-label')
                    for (let iLabelTip of LabelTip) {
                        if(iLabelTip){
                            iLabelTip.style.display = 'none';
                        }
                    }
                    // that.clear();
                    that.positions = [];
                    that._finished = false
                }
            }, true);
        },1000)
    }

    /**
     * 根据点绘制线
     * @private
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip._showPolyline2Map();
     */
    _showPolyline2Map(){
        let that = this;
        let material = Color.CYAN.withAlpha(0.5);
        let lineDynamicPositions = new CallbackProperty(function () {
            if (that.positions.length > 1) {
                let arr = [].concat(that.positions);
                let first = that.positions[0];
                arr.push(first);
                return arr;
            } else {
                return null;
            }
        }, false);
        return that.viewer.entities.add({
            polyline: {
                positions: lineDynamicPositions,
                width: 3,
                material: material,
                clampToGround: true,
            }
        });
    }


    /**
     * 剖切区域
     * @param {Array} clipData  开挖区域
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.clipArea(clipData);
     */
    clipArea(clipData){
        let length = clipData.length;
        //判断多边形顺逆时针,顺时针反序列
        let newClipData=Util.isCoordShun(clipData)?clipData.reverse():clipData;

        let start = Cartesian3.subtract(newClipData[0], newClipData[1], new Cartesian3);
        let n = start.x > 0;
        this.excavateMinHeight = 9999;
        let clippingPlanes = [];
        for (let i = 0; i < length; ++i) {
            let nextIndex = (i + 1) % length;
            let midpoint = Cartesian3.add(newClipData[i], newClipData[nextIndex], new Cartesian3());

            midpoint = Cartesian3.multiplyByScalar(
                midpoint,
                0.5,
                midpoint
            );
            let up = Cartesian3.normalize(
                midpoint,
                new Cartesian3()
            );
            let right = Cartesian3.subtract(
                newClipData[nextIndex],
                midpoint,
                new Cartesian3()
            );
            right = Cartesian3.normalize(right, right);

            let normal = Cartesian3.cross(
                right,
                up,
                new Cartesian3()
            );
            normal = Cartesian3.normalize(normal, normal);
            let originCenteredPlane = new Plane(normal, 0.0);
            let distance = Plane.getPointDistance(
                originCenteredPlane,
                midpoint
            );

            clippingPlanes.push(new ClippingPlane(normal, distance));
        }
		//地形裁切
        let globeClippingPlanes= new ClippingPlaneCollection({
            planes: clippingPlanes,
            edgeWidth: 1,
            edgeColor: Color.WHITE,
            enabled: true,
            unionClippingRegions:false
        })
        this.viewer.scene.globe.clippingPlanes=globeClippingPlanes
        this._finished = true;
        this._callback && this._callback()
        // this.viewer.scene.globe.multiClippingPlanes = new MultiClippingPlaneCollection({
        //     collections: [globeClippingPlanes],
        //     // modelMatrix: entity.computeModelMatrix(JulianDate.now()),
        //     edgeWidth: 1,
        //     edgeColor: Color.WHITE,
        // });

    }

    /**
     * 清空剖切区域
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.clearArea();
     */
    clearArea(){
        let globe = this.viewer.scene.globe;
        if(globe.clippingPlanes){
            globe.clippingPlanes.enabled = false;
            globe.clippingPlanes.removeAll();
            globe.clippingPlanes = undefined;
            this._finished = false
        }

    }
    
    /**
     * 隐藏剖切区域
     * @example
     * var clip = new BOSGeo.GroundClipTool(geomap);
     * clip.hide();
     */
    hide(){
        let globe = this.viewer.scene.globe;
        if(globe.clippingPlanes){
            globe.clippingPlanes.enabled = false;
        }
    }
}

export default GroundClipTool;