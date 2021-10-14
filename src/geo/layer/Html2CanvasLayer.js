import html2canvas from "html2canvas"
import BillboardCollection from 'cesium/Scene/BillboardCollection'
import Billboard from 'cesium/Scene/Billboard'
import PrimitiveCollection from 'cesium/Scene/PrimitiveCollection'
import Cartesian3 from 'cesium/Core/Cartesian3'
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler';
import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType'
import NearFarScalar from 'cesium/Core/NearFarScalar'
import HeadingPitchRange  from"cesium/Core/HeadingPitchRange";
import Math from 'cesium/Core/Math';
import BoundingSphere from "cesium/Core/BoundingSphere.js";

import Layer from "./Layer";
import { GeoDepository } from "../core/GeoDepository";
import GeoUtil from '../utils/GeoUtil';
import LayerEventType from "../constant/LayerEventType";
import Cartesian2 from 'cesium/Core/Cartesian3'
import HorizontalOrigin from 'cesium/Scene/HorizontalOrigin';
import VerticalOrigin from "cesium/Scene/VerticalOrigin"


class Html2CanvasLayer extends Layer {

    /**
     * 标签（自定义广告牌）。创建一个图层，实现html元素转换为canvas,并通过billboard加载到三维场景中
     * @param {Object} options 配置选项 
     * @param {Boolean} [options.isOpenSimplify = true] 是否开启广告牌抽稀功能，避免叠加遮挡，默认true开启
     * @example
     *  let geomap = new BOSGeo.GeoMap('bosgeoContainer'); //初始化
        let htm2can = layerManager.createLayer(BOSGeo.LayerType.HTML2CANVAS, 'html2canvas图层');
     */
    constructor (options = {}) {
        super(options);

        // this.viewer = GeoDepository.viewer;
        this.scene = this.viewer.scene;
        let {
            isOpenSimplify = true //是否随距离缩放进行抽稀
        } = options;

        this._initCollection();//初始化BillboardCollecrion和PrimitiveCollection
        this._addDomColllection();//创建div标签添加至dom，后续将生成的html元素都放在该div内，避免添加多个点引起dom结构混乱

        this.preType = undefined;
        this.simplifyHandler = new ScreenSpaceEventHandler(this.scene.canvas);
        if (isOpenSimplify) {
            this.openSimplifyBillboard('wheelChange'); //根据触发类型进行抽稀
        }
        this.simplifyBindThis = false;
        this.clickMoveHander = new ScreenSpaceEventHandler(this.scene.canvas); //鼠标点击缩放和移入变为手形事件
        this.layer = this;
		this.positionsWithId = [];
        this.count = 0;
        this.max = 100;
    }


    /**
     * 初始化BillboardCollection和PrimitiveCollection并绑定到scene对象
     * @private
     */
    _initCollection () {
        this._billboards = [];
        this.billboardCollection = new BillboardCollection();
        this.primitiveCollection = new PrimitiveCollection();

        this.primitiveCollection.add(this.billboardCollection);
        this.scene.primitives.add(this.primitiveCollection);
    }

    /**
     * 创建div标签添加至dom，后续将生成的html元素都放在该div内，避免添加多个点引起dom结构混乱
     * @private
     */
     _addDomColllection () {
        let div = document.createElement('div');
        div.id = 'html2canvasCollection';
        document.body.append(div);
        document.body.style.overflow = 'hidden';
     }

    /**
     * 开启点击某个标签缩放至该点标签事件
     */
    openClickZoomTo () {
        
        this.clickMoveHander.setInputAction( (click) => {
            const pick = this.scene.pick(click.position); 

            if (pick && pick.primitive && pick.primitive instanceof Billboard && pick.primitive.isHtml2Canvas) {

                let cartesian = pick.primitive.position;
                let position = GeoUtil.cartesianToArray(cartesian);
                
                let dest = Cartesian3.fromDegrees(position[0], position[1] - 0.0002, position[2] + 20);
                let hpr = new HeadingPitchRange(0, Math.toRadians(-45.0), 0);

                let geomap = this.geomap;
                geomap.flyTo(dest, hpr);

            }

        }, ScreenSpaceEventType.LEFT_CLICK)
    }

    /**
     * 关闭点击某个标签缩放至该点标签事件
     */
    closeClickZoomTo () {
        this.clickMoveHander.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    }

    /**
     * 开启鼠标移入点标签变为pointer手形事件
     */
    openMoveInPointer () {

        this.clickMoveHander.setInputAction( (movement) => {
            const pick = this.scene.pick(movement.endPosition); 

            if (pick && pick.primitive && pick.primitive instanceof Billboard && pick.primitive.isHtml2Canvas) {
                document.body.style.cursor = 'pointer';
            } else {
                document.body.style.cursor = 'default';
            }
        }, ScreenSpaceEventType.MOUSE_MOVE) 
    }

    /**
     * 关闭鼠标移入点标签变为pointer手形事件
     */
    closeMoveInPointer () {
        this.clickMoveHander.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE)
    }

    /**
     * billboard的抽稀检测
     * @private
     */
    _simplifyBillboard (level = 3) {
        if(this.primitiveCollection.show) {
            let billboardCollection = this.billboardCollection;
            var showItems = [];
            
            for (let i = 0; i < billboardCollection.length; i++) {
                var billboard = billboardCollection.get(i);
                if(i==0){
                    billboard.show = true;
                    showItems.push(billboard);
                }else{
                    var show = true;           
                    for(let j=0;j<showItems.length;j++){
                        var item = showItems[j];
                        if(isCollsionWithRect(item, billboard, level) || billboard._hidden){  //判断是否相交
                            show = false;
                        }
                    }
                    if(show){
                        billboard.show = true;
                        showItems.push(billboard);
                    }else{
                        billboard.show = false;
                    }
                }
            }
        }
    }

    /**
     * 将html元素通过转换添加至指定坐标位置
     * @param {Object} options 配置选项
     * @param {String} [options.id = undefined] 标签标识id，
     * @param {Array<Number>} options.position 必填，经纬度的坐标位置
     * @param {String} options.html 必填，自定义的html内容
     * @param {Array<Number>} [options.offset = [0, 0]] 标签的位置偏移像素值
     * @param {Number} [options.width = 256] 广告牌的宽度，建议设为2的幂次方，要包含html元素
     * @param {Number} [options.height = 64] 广告牌的高度，建议设为2的幂次方，要包含html元素
     * @param {Object} [options.attribute = null] 自定义的一些属性，默认为null
     * @param {Number} [options.scale = 1] 缩放比例
     * @param {String} [options.horizontalOrigin = 'CENTER'] 水平方向对齐方式，可选项有'CENTER'(中心对齐)、'LEFT'(左对齐)、'RIGHT'(右对齐)
     * @param {String} [options.verticalOrigin = 'CENTER'] 垂直方向对齐方式，可选项有'CENTER'(中心对齐)、'BOTTOM'(底边对齐)、'BASELINE'(若包含文字，则文字底边对齐；否则同BOTTOM)、'TOP'(顶边对齐)
	 * @returns {Promise} 包含billboard的Promise对象
     * @example
    let htm2can = layerManager.createLayer(BOSGeo.LayerType.HTML2CANVAS, 'html2canvas图层');
	htm2can.add({
		id: 'test',
		position: [114, 23 + 0.001, 1.1],
		html:   `<div class='bosgeo-pointContainer' style="width: 512px; height:256px;">
		<span class="bosgeo-pointText">盈嘉互联</span>
		<span class="bosgeo-pointIcon"></span>
		</div>`,
		width: 512,
		height: 256,
	})
    */
    add (options = {}) {
        let {
            id,
            position,
            html,
            width = 256,
            height = 64,
            offset = [0, 0],
            scale = 1,
            horizontalOrigin = 'CENTER',
            verticalOrigin = 'CENTER'
        } = options;
        if (!position) {
            console.error('请输入位置！');
        }
        if (!html) {
            console.error('请输入内容！')
        }
    
        let ele = document.createElement('div');
        ele.style.width = width + 'px';
        ele.style.height = height + 'px';
        ele.innerHTML = html;
		
		let html2canvasCollection = document.getElementById('html2canvasCollection');
		html2canvasCollection.appendChild(ele);
        
		this.positionsWithId.push({
			id,
			position
		});
        let date = new Date()
        let timestamp = date.getTime()
        // var canvas = document.createElement("canvas");  
        // let image = new Image()
        // image.onload =  ()=> {
        //     // 坐标(0,0) 表示从此处开始绘制，相当于偏移。  
        //     canvas.getContext("2d").drawImage(image, 0, 0); 
        //     let date2 = new Date()
        //     let timestamp2 = date2.getTime()
        //     console.log('html2canvas',timestamp2-timestamp);
        // // }

        // let billboard = this.billboardCollection.add({
        //     position: Cartesian3.fromDegrees(position[0], position[1], position[2]),
        //     // image: canvas,
        //     image: canvas,
        //     pixelOffset: new Cartesian2(offset[0], offset[1]),
        //     scaleByDistance: new NearFarScalar(1.5e2, 1 , 200000, 0.0),
        //     id: id,
        //     scale,
        //     horizontalOrigin: HorizontalOrigin[horizontalOrigin],
        //     verticalOrigin: VerticalOrigin[verticalOrigin]
        // })
          
        // billboard.attribute = options.attribute || null;
        // billboard.isHtml2Canvas = true;
        // billboard.bosGroup = this;
        // this.layer = this;
        // this.geomap.render();
        // this._billboards.push(billboard);
        
        // this.fire(LayerEventType.ADD, billboard);
        // this.fire(LayerEventType.CHANGE);
        // html2canvasCollection.removeChild(ele);
        // };
        // image.src = '../../../resource/images/pointText.png'

        let promise = new Promise((resolve, reject) => {
            debugger
            html2canvas(ele, {
                backgroundColor: "transparent"
            }).then(canvas => {
                this.count++;
                if(this.count===this.max){
                    let date2 = new Date()
                    let timestamp2 = date2.getTime()
                    console.log('html2canvas',timestamp2-timestamp);
                }

                let billboard = this.billboardCollection.add({
                    position: Cartesian3.fromDegrees(position[0], position[1], position[2]),
                    // image: canvas,
                    image: canvas,
                    pixelOffset: new Cartesian2(offset[0], offset[1]),
                    scaleByDistance: new NearFarScalar(1.5e2, 1 , 200000, 0.0),
                    id: id,
                    scale,
                    horizontalOrigin: HorizontalOrigin[horizontalOrigin],
                    verticalOrigin: VerticalOrigin[verticalOrigin]
                })
                  
                billboard.attribute = options.attribute || null;
                billboard.isHtml2Canvas = true;
				billboard.bosGroup = this;
				this.layer = this;
                this.geomap.render();
                this._billboards.push(billboard);
                
                this.fire(LayerEventType.ADD, billboard);
                this.fire(LayerEventType.CHANGE);
				html2canvasCollection.removeChild(ele);
                resolve(billboard)
            });
        });
        return promise;
    }
            
    /**
     * 开启抽稀, 一种是根据camera变化进行检测抽稀，另一种是根据鼠标滚轮滚动进行检测抽稀
     * @param {String} fireType 触发检测的类型，包含'cameraChange','wheelChange'
     * @param {Number} [level = 3] 抽稀的级别，数值越小，抽稀程度越大，范围[1-10]
     * @example
     * htm2can.openSimplifyBillboard('cameraChange');
     */
    openSimplifyBillboard (fireType, level = 3) {
        let types = ['cameraChange', 'wheelChange']
        if(!types.includes(fireType)) {
            console.error('请输入正确的触发方式！');
        }

        if(isNaN(level) || level < 1 || level > 10){
            console.error('抽稀级别应设为一个范围[1-10]的数值！');
        }

        if (!this.simplifyBindThis){
            this._simplifyEvent= this._simplifyBillboard.bind(this, level);//抽稀事件绑定this
            this.simplifyBindThis = true;
        }

        if (this.preType !== fireType) { //如果上次触发方式和本次不同
            if (fireType === 'cameraChange') {
                this.viewer.camera.changed.addEventListener(this._simplifyEvent);
            } else {
                this.simplifyHandler.setInputAction(() => {
                    this._simplifyEvent();
                }, ScreenSpaceEventType.WHEEL)
            }
            if (this.preType) {
                this.closeSimplifyBillboard(this.preType);
            }
            this._simplifyEvent(); //开启绑定抽稀事件后先执行一次，进行抽稀
            this.preType = fireType;
        }

        this.geomap.render();
    }

    /**
     * 关闭抽稀
     * @param {String} [fireType] 触发类型，用户不用输入，内部切换监听调用时自动指定
     * htm2can.closeSimplifyBillboard();
     */
    closeSimplifyBillboard (fireType) {
        if (!fireType) { //若没有指定类型，则根据this.preType取消事件
            if (this.preType === 'cameraChange') {
                this.viewer.camera.changed.removeEventListener(this._simplifyEvent);
            } else {
                this.simplifyHandler.removeInputAction(ScreenSpaceEventType.WHEEL);
            }
            this.preType = undefined;
        } else { //根据参数fireType取消事件
            let types = ['cameraChange', 'wheelChange']
            if(!types.includes(fireType)) {
                console.error('请输入正确的触发方式！');
            }
    
            if (fireType === 'cameraChange') {
                this.viewer.camera.changed.removeEventListener(this._simplifyEvent);
            } else {
                this.simplifyHandler.removeInputAction(ScreenSpaceEventType.WHEEL)
            }
            this.preType = undefined;
        }
    
        // 所有billboard 恢复显示状态
        let billboardCollection = this.billboardCollection;
        for (let i = 0; i < billboardCollection.length; i++) {
            var billboard = billboardCollection.get(i);
            if(!billboard._hidden){
                billboard.show = true;
            }
        }
        this.geomap.render();
    }

     /**
     * 缩放至本图层
     * @param {Function} callback 回调函数
     * @example
     * htm2can.zoomToLayer();
     */
      zoomToLayer (callback) {
		if (!this.positionsWithId.length) return;
        const camera = this.viewer.camera;
        const positions = this.positionsWithId.map(b => {
			return Cartesian3.fromDegrees(b.position[0], b.position[1], b.position[2]);
		});
        const bs = BoundingSphere.fromPoints(positions);
        camera.flyToBoundingSphere(bs,{complete:callback});
    }

    /**
     * 显隐
     * @param {Boolean} bool true为显示，false为隐藏
     * @example
     * htm2can.show(true);
     */
    show (bool) {
        if (typeof bool === 'boolean') {
            this.primitiveCollection.show = bool;
        } else {
            console.error('请输入boolean类型的值！');
        }
        this.geomap.render();
        this.fire(LayerEventType.CHANGE);
    }

    /**
     * 根据id获取标签元素
     * @param {String} id 标签id
     * @returns {Billboard} 点标签的billboard对象
     * @example
     * let bb = htm2can.getBillboardById(id);
     */
     getBillboardById (id) {
        let billboard = undefined;
        let num = 0;
        let billboards = this._billboards;

        for (let i = 0, len = billboards.length; i < len; i++) {
            if(billboards[i].id === id) {
                billboard = billboards[i];
                num++;
            }
        }

        switch(num) {
            case 0:
                console.error(`没有找到id为${id}的标签！`); 
                break;
            case 1:
                return billboard;
            default:
                console.error(`存在多个id为${id}的标签！`);
        };
    }

    /**
     * 设置单个标签显隐
     * @param {Billboard} billboard 使用getBillboardById方法获得的billboard标签对象
     * @param {Boolean} visible true为显示，false为隐藏
     * @example
     * let bb = htm2can.getBillboardById(id);
     * htm2can.setVisible(bb, false);
     */
    setVisible(billboard, visible) {
        billboard.show = visible;
        if(!visible){
            billboard._hidden = true;
        } else {
            billboard._hidden = undefined;
        }
        this.geomap.render();
    }

    /**
     * 缩放至billboard点标签对象
     * @param {Billboard} billboard 使用getBillboardById方法获得的billboard标签对象
     * @example
     * let bb = htm2can.getBillboardById(id);
     * htm2can.zoomTo(bb);
     */
    zoomTo(billboard) {
        let position = GeoUtil.cartesianToArray(billboard.position);
        
        let dest = Cartesian3.fromDegrees(position[0], position[1] - 0.0002, position[2] + 20);
        let hpr = new HeadingPitchRange(0, Math.toRadians(-45.0), 0);
        this.geomap.flyTo(dest, hpr);
    }

    /**
     * 更新billboard的位置坐标
     * @param {Billboard} billboard 使用getBillboardById方法获得的billboard标签对象
     * @param {Array<Number>} position 经纬度和高程组成的数组 
     * @example
     * let bb = htm2can.getBillboardById(id);
     * htm2can.updatePosition(bb, position);
     */
    updatePosition(billboard, position) {
        let cartesian = Cartesian3.fromDegrees(position[0], position[1], position[2])
        billboard.position = cartesian;        
		this.positionsWithId.forEach(e => {
			if (billboard.id === e.id) {
				e.position = position;
			}
		})
        this.geomap.render();
    }

    /**
     * 根据id删除指定元素
     * @param {String} id 标签id
     * htm2can.removeById(id);
     */
    removeById (id) {
        let billboard = undefined;
        let billboards = this._billboards;

        for (let i = 0, len = billboards.length; i < len; i++) {
            if(billboards[i].id === id) {
                billboard = billboards[i];
                this.billboardCollection.remove(billboard);
                this.fire(LayerEventType.REMOVE, billboard);
                this.fire(LayerEventType.CHANGE);

                this._billboards.splice(i, 1);
                i--;
                len--;
            }
        }
		
        if (billboard) {
			this.positionsWithId.forEach((e, index) => {
				if (billboard.id === e.id) {
					this.positionsWithId.splice(index, 1);
				}
			})
            billboard = undefined; //释放目标
        } else {
            console.error(`没有找到id为${id}的目标！`)
        }
        billboards = undefined;
        this.geomap.render();
    }

    /**
     * 删除所有添加的元素
     */
    removeAll () {
        this.billboardCollection.removeAll();        
		this.positionsWithId = [];
        this.geomap.render();
        this.fire(LayerEventType.REMOVE);
        this.fire(LayerEventType.CHANGE);
    }

    /**
     * 销毁本图层
     */
    destroy () {
        this.removeAll();
		this.positionsWithId = [];
        this.primitiveCollection.remove(this.billboardCollection);
        this.scene.primitives.remove(this.primitiveCollection);
        this._destroyBaseLayer();
    }


}



/**
 * 检测标签是否互相碰撞遮挡
 * @private
 */
function isCollsionWithRect(billboard1, billboard2, level = 3){
    var windowCoorBillboard1 = GeoUtil.geoCoord2windowCoord(billboard1.position);
    var windowCoorBillboard2 = GeoUtil.geoCoord2windowCoord(billboard2.position);
    if (windowCoorBillboard1 && windowCoorBillboard2 ){

        var x1 = windowCoorBillboard1.x, y1 = windowCoorBillboard1.y; //屏幕坐标x、y
        var x2 = windowCoorBillboard2.x, y2 = windowCoorBillboard2.y; //屏幕坐标x、y
        
        var width1 = billboard1.width / level,height1 = billboard1.height / level;
        var width2 = billboard2.width / level,height2 = billboard2.height / level;	
        
        if (x1 >= x2 && x1 >= x2 + width2) {
            return false;
        } else if (x1 <= x2 && x1 + width1 <= x2) {
            return false;
        } else if (y1 >= y2 && y1 >= y2 + height2) {
            return false;
        } else if (y1 <= y2 && y1 + height1 <= y2) {
            return false;
        }else{
            return true;
        }
    } else {
        return false;
    }
}

export default Html2CanvasLayer;
