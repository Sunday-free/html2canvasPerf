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
import destroyObject from 'cesium/Core/destroyObject';
import defaultValue from "../../../cesium/Source/Core/defaultValue";

/**
 * 多边形裁切工具。通过绘制多边形区域，实现指定区域的模型和地形的裁切（只支持地面和3DTiles模型）。
 * @alias GlobalClippingTool
 * @constructor
 * @param {GeoMap} geomap GeoMap的实例对象
 * @param {Object} [options] 包含以下参数的Object对象:
 * @param {String} [options.modelClipColor = "#FFFFFF"] 模型裁切边缘颜色，十六进制的颜色字符串
 * @param {String} [options.globeClipColor = "#FFFFFF"] 地形裁切边缘颜色，十六进制的颜色字符串
 * @param {Number} [options.edgeWidth=1] 地形裁切边缘线宽
 * @param {Function} [options.callback] 绘制完成后的回调函数
 * @example
    var clip = new BOSGeo.GlobalClipping(geomap,{
        modelClipColor:"#FF0000",//模型裁切边缘颜色
    });
 */
class GlobalClippingTool {
    constructor(geomap,options) {
        this.geomap = geomap;
        this.viewer = this.geomap.viewer;
        this.scene = this.viewer.scene;
        this.globe= this.scene.globe;

        this._handlerActive=true;//激活状态参数
        this._finished=false; //是否完成裁切
		this._modelClip = true; //裁切模型
		this._globeClip = true; //裁切地形
        this.handler = null;  //操作监听事件
        this.handlers=[]
        this.isDestoryed = false;
        this.entity=null
        this.labelTip=this.labelTip? this.labelTip: new Label()
		this._flag=false;
        this._callback=options.callback;
        
        options = defaultValue(options, {});
        this._globeClipColor = defaultValue(options.globeClipColor,"#FFFFFF");
        this._modelClipColor = defaultValue(options.modelClipColor,"#FFFFFF");
        this._edgeWidth = defaultValue(options.edgeWidth,1);
    }

	/**
     * 裁切激活状态
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
	 * 是否完成裁切，true为完成，false为进行中
	 */
    get finished() {
        return this._finished;
    }

	/**
     * 裁切模型 
     * @property {Boolean}
     * @default true
     * 
     */
	get modelClip() {
        return this._modelClip;
    }
    set modelClip(val) {
        this._modelClip = val;
        this._updateShow();
    }

	/**
     * 裁切地形
     * @property {Boolean}
     * @default true
     * 
     */
	get globeClip() {
        return this._globeClip;
    }
    set globeClip(val) {
        this._globeClip = val;
        this._updateShow();
    }


    /**
     * 绘制裁切的区域，左键添加点，Ctrl+Z撤销，右键结束绘制进行裁切，Esc退出本次裁切绘制操作
     * @example
     * var clip = new BOSGeo.GlobalClippingTool(geomap);
     * clip.drawArea();
     */
    drawArea() {
        if(this.handlerActive) {
            this._ctrlz();//添加撤销最近一次选点监听
            this._esc();//添加退出绘制监听

            if (!this.handler ) {
                this.handler = new ScreenSpaceEventHandler(this.scene.canvas);
                // console.log('!defined',this.handler)
            }

            let that = this;
            that.positions = [];
            let entity;
            that.entity = entity
            if(!that.handlerActive){
                // that.handlerActive=true
                if(defined(that.labelTip._div.style.display=== 'block')){
                    that.labelTip.setVisible(false);
                }
            }
            that.handlers.push(that.handler)
			this.handler.setInputAction(function (event) {
				if(that.handlerActive){
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
				if(that.handlerActive) {
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
					if (that.handlerActive) {
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
							that.addClippingPlanes(that.positions);
						}
						that.positions = [];
					}
				}
			}, ScreenSpaceEventType.RIGHT_CLICK);
        }
    }
	
    /**
     * 根据点绘制线
     * @private
     * @example
     * var clip = new BOSGeo.GlobalClippingTool(geomap);
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
     * 根据坐标数组添加裁切面
     * @param {Array} pointsArray  裁切区域坐标数组,三维笛卡尔坐标或者经纬度坐标；
     * @example
       var clip = new BOSGeo.GlobalClippingTool(geomap);
       let pointsArray = [[113.107767, 23.02872],[113.207787, 23.02892],[113.207717, 23.01812],[113.107767, 23.01812]]);//经纬度坐标
       //let pointsArray = [
            new BOSGeo.Cartesian3(-2304905.645455619, 5401698.012070915, 2479650.828977782),
            new BOSGeo.Cartesian3(-2305019.2453770256, 5401628.305048486, 2479615.403277196),
            new BOSGeo.Cartesian3( -2305379.5226075193,5401487.777794245,  2479586.7820841162),
            new BOSGeo.Cartesian3( -2305421.8144737547, 5401604.581657961,  2479294.9425484887),
            new BOSGeo.Cartesian3( -2304900.3187751556, 5401798.632058818, 2479356.6133839726)
        ]
        clip.addClippingPlanes(pointsArray);
     */
	addClippingPlanes(pointsArray){
        //若传入的是经纬度坐标则转换成三维笛卡尔坐标
        if (!(pointsArray[0] instanceof Cartesian3)) {   
            let pArray = [];         
            for (let i = 0; i < pointsArray.length; i++) {
              let point = pointsArray[i];
              Util.validate({position:point});
              point = new Cartesian3.fromDegrees(point[0], point[1]);
              pArray.push(point);
            }
            pointsArray=pArray;
        }

        let length = pointsArray.length;
        //判断多边形顺逆时针,顺时针反序列
        let hole_pts=Util.isCoordShun(pointsArray)?pointsArray.reverse():pointsArray;
     
        let clippingPlanes = [];
        for (let i = 0; i < length; ++i) {
            let nextIndex = (i + 1) % length;
            let midpoint = Cartesian3.add(hole_pts[i], hole_pts[nextIndex], new Cartesian3());
            midpoint = Cartesian3.multiplyByScalar(midpoint, 0.5, midpoint);
            let up = Cartesian3.normalize(midpoint,new Cartesian3());
            let right = Cartesian3.subtract(hole_pts[nextIndex], midpoint,new Cartesian3());
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
			edgeWidth: this._edgeWidth,
			edgeColor: Color.fromCssColorString(this._globeClipColor),
			enabled: this.globeClip,
			unionClippingRegions:false
		})
		this.globe.clippingPlanes=globeClippingPlanes;			
		
		//3DTiles模型裁切
		for (let j = 0; j < this.scene.primitives.length; j++) {
			let _primitives = this.scene.primitives._primitives[j];
			for (let index = 0; index < _primitives.length; index++) {
				const _primitive = _primitives._primitives[index];
				
				if (_primitive instanceof Cesium3DTileset) {
					const tileset = _primitive;
					tileset.readyPromise.then(() => {
						let modelMatrix = Matrix4.inverse(tileset.root.computedTransform, new Matrix4());//ToDo:针对某些某些可能不起作用，此处需优化
                        // let modelMatrix = Matrix4.inverse(tileset._initialClippingPlanesOriginMatrix, new Matrix4());
						tileset.clippingPlanes = new ClippingPlaneCollection({
							planes: clippingPlanes,
							edgeWidth: this._edgeWidth,
							edgeColor: Color.fromCssColorString(this._modelClipColor),
							unionClippingRegions: false,
							enabled: this.modelClip,
							modelMatrix: modelMatrix
						});
					});
				}
			}
		}	
       
        this.geomap.render();
        this._finished=true; 
        this._callback && this._callback()
    }

    /**
     * 打开裁切提示信息
     * @example
     * var clip = new BOSGeo.GlobalClippingTool(geomap);
     * clip.showLabelTip();
     * clip.drawArea();
     */
    showLabelTip(){
        this.labelTip.setContent("<span id='cd_label' style='position:absolute;left:45%;top:10px;font-size:13px;text-align:center;font-family:微软雅黑;color:#edffff;'>左键添加点，Ctrl+Z撤销，右键结束绘制进行裁切，Esc退出本次裁切绘制操作</span>");
        this.labelTip.setVisible(true);
    }

    /**
     * 关闭裁切提示信息
     * @example
     * var clip = new BOSGeo.GlobalClippingTool(geomap);
     * clip.closeLabelTip();
     */
    closeLabelTip(){
        this.labelTip.setContent("<span id='cd_label' style='position:absolute;left:45%;top:10px;font-size:13px;text-align:center;font-family:微软雅黑;color:#edffff;'></span>");
        if(defined(this.labelTip._div.style.display=== 'block')){
            this.labelTip.setVisible(false);
        }
    }

    /**
     * 移除裁切监听
	 * @private
     * @example
     * var clip = new BOSGeo.GlobalClippingTool(geomap);
     * clip._removeEventHandler();
     */
    _removeEventHandler() {
        if (defined(this.handler)) {
            this.handler.destroy();
            this.handler = null;
        }
    }
	
    /**
     * ctrl+z组合键，撤销最近一次的选点 
     * @private
     * @example
     * var clip = new BOSGeo.GlobalClippingTool(geomap);
     * clip._ctrlz();
     */
	_ctrlz(){
        var that = this
        var i=0; //变量i
        document.addEventListener('keydown', function (e) {
            //ctrl+z撤销
            if (e.ctrlKey && e.keyCode ===90 ) { //'Z'.charCodeAt(0)  && positionsLen==that.positions.length
                if(that._flag){
                    return;
                }
                that._flag=true;
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
    }

    /**
     * 退出 Esc
     * @private
     * @example
     * var clip = new BOSGeo.GlobalClippingTool(geomap);
     * clip.esc();
     */
    _esc(){
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
                    that.positions = [];
                }
            }, true);
        },1000)
    }
		
    /**
     * 更新裁切区域显隐
     * @private
     * @example
     * var clip = new BOSGeo.GlobalClippingTool(geomap);
     * clip._updateShow();
     */
	_updateShow(){        
        this.globe.clippingPlanes && (this.globe.clippingPlanes.enabled = this.globeClip);        
        
        for (let j = 0; j < this.scene.primitives.length; j++) {
            let _primitives = this.scene.primitives._primitives[j];
            for (let index = 0; index < _primitives.length; index++) {
                const _primitive = _primitives._primitives[index];
                
                if (_primitive instanceof Cesium3DTileset) {
                    const tileset = _primitive;
                    if (tileset.clippingPlanes) {
                        tileset.clippingPlanes.enabled=this.modelClip;
                    }
                }
            }
        }

        this.geomap.render();
    }
	
    /**
     * 清除裁切区域
     * @example
     * var clip = new BOSGeo.GlobalClippingTool(geomap);
     * clip.clear();
    */
	clear(){       
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
            this.handlers=[];
        }

        if(this.globeClip){
            this.globe.clippingPlanes && this.globe.clippingPlanes.removeAll();
            this.globe.clippingPlanes = undefined;
        }

        if(this.modelClip){
            for (let j = 0; j < this.scene.primitives.length; j++) {
                let _primitives = this.scene.primitives._primitives[j];
                for (let index = 0; index < _primitives.length; index++) {
                    const _primitive = _primitives._primitives[index];
                    
                    if (_primitive instanceof Cesium3DTileset) {
                        const tileset = _primitive;
                        if (tileset.clippingPlanes) {
                            tileset.clippingPlanes.removeAll();
                            // flag = true;
                        }
                    }
                }
            }           
        }

        // console.log(this.handler)
        this.geomap.render();
        this._finished=false;
    }
	
    /**
     * 销毁
     * @example
     * var clip = new BOSGeo.GlobalClippingTool(geomap);
     * clip.destroy();
     */
	 destroy() {
		this.clear();
		this.handlerActive=false;//激活状态参数
        this._removeEventHandler();
		return destroyObject(this);
    }
}

export default GlobalClippingTool;