import Draw from "./Draw";
import PolylineGlowMaterialProperty from "cesium/DataSources/PolylineGlowMaterialProperty";
import CallbackProperty from "cesium/DataSources/CallbackProperty";
import Color from "cesium/Core/Color";
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartesian2 from "cesium/Core/Cartesian2";
import defaultValue from "cesium/Core/defaultValue";
import PolylineDashMaterialProperty from "cesium/DataSources/PolylineDashMaterialProperty";
import PolylineDynamicMaterialProperty from 'cesium/DataSources/PolylineDynamicMaterialProperty'
import GeoUtil from "../utils/GeoUtil";
import  DefaultData  from '../constant/DefaultData.js';
import  FeatureType  from '../constant/FeatureType.js';
import LayerType from "../constant/LayerType";

/** 
 * 绘制折线
 * @ignore
 */
class DrawPolyline extends Draw {
    /**
     * 绘制折线
     * @alias DrawPolyline
     * @constructor
     * @extends Draw
     * @private
     * @ignore
     * @param {GeoMap} geomap GeoMap对象
     * 
     * @example
     * var drawPolyline = new BOSGeo.DrawPolyline(geomap);
     */
    constructor(geomap) {
        super(geomap);
        this.positions = [];
        this.drawingEntity = undefined;//绘制过程中对象
        this.baseHeight = 0;
    }

    /**
     * 绘制折线
     * 
     * @param {Object} option 包含以下参数的Object对象
     * @param {Number} [option.id] 对象ID
     * @param {Color} [option.color='#ff0000'] 线的颜色
     * @param {Number} [option.width=10] 线的宽度
     * @param {Array<Cartesian3>} [option.points] 线节点坐标
     * @param {Number} [option.opacity=1] 线的透明度
     * @param {Number} [option.lineType = 1] 线类型 1-普通颜色材质 2-虚线材质 3-发光材质 4-动态材质 不传入时为普通颜色材质
     * @param {String|Image} [option.dynamicImg] 材质为4时，使用自定义元素
     * @param {Number} [options.repeat = 1] 材质为4且使用自定义元素，重复个数
     * @param {Number} [options.speed = 20] 材质为4且使用自定义元素，重复个数
     * @param {Boolean} [option.showLabel=false] 是否显示线的属性标注
     * @param {Boolean} [option.clampToGround=false] 线是否贴地
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     * 
     * @example
     * drawPolyline.draw({
     *   opacity: 0.5,
     *   lineType: 2, 
     * }, okFunction, cancelHandler);
     */
    draw(option, okHandler, cancelHandler) {
        option = Object.assign({
            color : '#ff0000',
            width : 10,
            lineType : 1,
            showLabel : false,
            speed : 20,
            clampToGround : false,
            opacity : 1,
            repeat : 1,
        }, option);
        this.startDraw(option,  () => {
            this.endDraw(this.attr);
            okHandler(this.attr)
        }, cancelHandler);
    }

    /**
     * 绘制最后结果
     */ 
    endDraw() {
        //清除绘制过程
        this.viewer.entities.remove(this.drawingEntity);
        this.drawingEntity = undefined;

        this.attr.id = (new Date()).getTime();
        const {
            color,
            width,
            lineType,
            dynamicImg,
            speed,
            clampToGround = false,
            opacity,
            repeat,
            layer,
            id
        } = this.attr;
        const positions = this.positions
        this.shapeDic[id] = positions;//记录位置
        
        let line;
        if (layer) {
            if(layer.layerType !== LayerType.LINE) throw new Error('layer: 请传入一个线图层！');

            line = layer.add({
                positions,
                color,
                opacity,
                width,
                lineType,
                dynamicImg,
                speed,
                repeat,
                clampToGround
            });
        } else {
            let material;
            let bosgeoColor = Color.fromCssColorString(color).withAlpha(opacity)
            switch (lineType) {
                case 2:
                    material = new PolylineDashMaterialProperty({
                        color: bosgeoColor
                    })
                    break
                case 3:
                    material = new PolylineGlowMaterialProperty({
                        color: bosgeoColor
                    })
                    break
                case 4:
                    const lineLength = this.positions.reduce((acc, cur) => {
                        if (acc.pre) acc.sum += Cartesian3.distance(acc.pre, cur);
                        acc.pre = cur;
                        return acc;
                    }, { pre: null, sum: 0 }).sum;
                    material = new PolylineDynamicMaterialProperty({
                        color: bosgeoColor,
                        duration:(speed>0)? (lineLength*100/speed) : 800,
                        image: (dynamicImg) ? dynamicImg : DefaultData.IMG_DATA_TRANS,
                        repeat: new Cartesian2(repeat, 1)
                    })
                    break
                default:
                    material = bosgeoColor;
            }
            line = this.viewer.entities.add({
                layerId: this.layerId,
                attr: this.attr,
                polyline: {
                    positions,
                    width: width,
                    material: material,
                    clampToGround: clampToGround,
                }
            });
        }
        this.attr.entity = line;
    }

    /**
     * 显示标注
     * 
     * @private
     * 
     * @param {Array<Cartesian3>} positions 
     */
    showLabel(positions) {
        //计算线段之间的距离
        let num = positions.length;
        if (num > 1) {
            for (let i = 0; i < num - 2; i++) {
                let pre = positions[i];
                let next = positions[i + 1];
                let distance = Cartesian3.distance(pre, next);
                //
                let center = this._computeCenter(pre, next);
                let label = this.viewer.entities.add({
                    layerId: this.drawLayerId,
                    shapeType: "Polyline",
                    attr: this.attr,
                    position: center,
                    label: {
                        text: distance.toFixed(2) + 'm',
                        fillColor: Color.WHITE,
                        showBackground: true,
                        backgroundColor: Color.fromCssColorString('#AAAAAA').withAlpha(0.2),
                        font: '16px Microsoft Yahei',
                        pixelOffset: new Cartesian2(0, -20),
                        // style : .LabelStyle.FILL_AND_OUTLINE,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    }
                });
                this.showLabels.push(label);
            }
        }
    }

    /**
     * 开始绘制
     * @param {Object} option 包含以下参数的Object对象
     * @param {Number} [option.id] 对象ID
     * @param {Color} [option.color='#ff0000'] 线的颜色
     * @param {Number} [option.width=10] 线的宽度
     * @param {Array<Cartesian3>} [option.points] 线节点坐标
     * @param {Number} [option.opacity=1] 线的透明度
     * @param {Number} [option.lineType] 线类型 1-普通颜色材质 2-虚线材质 3-发光材质 4-动态材质 不传入时为普通颜色材质
     * @param {String|Image} [option.dynamicImg] 材质为4时，使用自定义元素
     * @param {Number} [options.repeat] 材质为4且使用自定义元素，重复个数
     * @param {Boolean} [option.showLabel=true] 是否显示线的属性标注
     * @param {Boolean} [option.clampToGround=false] 线是否贴地
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
    
     */
    startDraw(option, okHandler, cancelHandler) {
        super._startDraw(option, okHandler, cancelHandler);
        this.positions = option.points||[];
        let floatingPoint = null;
        let floatinglabel = null;
        let tempLabels = [];
        let tempPoints = [];
        let showLabel = defaultValue(option.showLabel, false);
        this.attr.showLabel = showLabel;  //是否显示距离

        this.leftClickCallback =  (cartesian) => {
            const degrees = GeoUtil.cartesianToArray(cartesian);
            cartesian = Cartesian3.fromDegrees(degrees[0],degrees[1],this.baseHeight);
            if (!this.positions.length) {
                this.positions.push(cartesian);
                floatingPoint = this._createPoint(cartesian, -1);
                tempPoints.push(floatingPoint);
                this.initDrawingEntity();
            }else{
                this.positions.push(cartesian);
                let oid = this.positions.length - 2;
                floatingPoint = this._createPoint(cartesian, oid);
                
                if (showLabel) {
                    floatinglabel = this._createLabel(cartesian, oid);
                    tempLabels.push(floatinglabel);
                }
    
                tempPoints.push(floatingPoint);
    
                this.geomap.render();
            }
            this.isDrawing = true;

            

        };

        this.mouseMoveCallback =  (cartesian)=> {
            const degrees = GeoUtil.cartesianToArray(cartesian);
            cartesian = Cartesian3.fromDegrees(degrees[0],degrees[1],this.baseHeight);
            let num = this.positions.length;
            if (!num) {
                return;
            }else{
                if(this.attr.showLabel){
                    let pre = this.positions[num - 2];
                    let next = this.positions[num - 1];
                    let distance = Cartesian3.distance(pre, next);
                    let center = this._computeCenter(pre, next);
                    floatinglabel.label.text = distance.toFixed(2) + 'm';
                    floatinglabel.position = center;
                }
                if(num > 1)this.positions.pop(); 
                this.positions.push(cartesian);
            }
            this.geomap.render();

        };

        this.rightClickCallback =  ()=> {
            if (this.positions.length < 3) {
                return;
            }

            this.positions.pop();

            this.attr.points = this.positions; // 用于UI库
            okHandler(this.attr);
            // okHandler(attr);
            // for (let i = 0; i < tempPoints.length; i++) {
            //     const element = tempPoints[i];
            //     this.viewer.entities.remove(element);
            // }
            for (let i = 0; i < tempLabels.length; i++) {
                const element = tempLabels[i];
                this.viewer.entities.remove(element);
            }
            this.clear();


            this.isDrawing = false;
            this.geomap.render();
        }
    }

    /**
     * 显示绘制状态的线
     * 
     * @private
     */
    initDrawingEntity() {
        const { lineType, color, opacity, clampToGround= false, width = 10} = this.attr;
        let dynamicPositions = new CallbackProperty( ()=> {
            return this.positions;
        }, false);
        const bosgeoColor = Color.fromCssColorString(color).withAlpha(opacity);

        let material;
        switch (lineType) {
            case 2:
                material = new PolylineDashMaterialProperty({
                    color: bosgeoColor
                })
                break
            case 3:
                material = new PolylineGlowMaterialProperty({
                    color: bosgeoColor
                })
                break
            // case 4:
            //     const lineLength = that.positions.reduce((acc, cur) => {
            //         if (acc.pre) acc.sum += Cartesian3.distance(acc.pre, cur);
            //         acc.pre = cur;
            //         return acc;
            //     }, { pre: null, sum: 0 }).sum;
            //     material = new PolylineDynamicMaterialProperty({
            //         color: bosgeoColor,
            //         duration:(speed>0)? (lineLength*100/speed) : 800,
            //         image: (dynamicImg) ? dynamicImg : DefaultData.IMG_DATA_TRANS,
            //         repeat: new Cartesian2(repeat, 1)
            //     })
            //     break
            default:
                material = bosgeoColor;
        }
     

        this.drawingEntity = this.viewer.entities.add({
            layerId: this.layerId,
            polyline: {
                positions: dynamicPositions,
                width,
                material,
                depthFailMaterial: material,
                clampToGround,
            }
        });

    }


    /**
     * 根据sid获取position
     * 
     * @private
     */
    getPositionWithSid() {
        let that = this;
        let viewer = that.viewer;
        let rlt = [];
        let entityList = viewer.entities.values;
        if (entityList == null || entityList.length < 1) {
            return rlt;
        }
        for (let i = 0; i < entityList.length; i++) {
            let entity = entityList[i];
            if (entity.layerId != that.layerId) {
                continue;
            }
            if (entity.flag != "anchor") {
                continue;
            }
            let p = entity.position.getValue(new Date().getTime());
            p.sid = entity.sid;
            p.oid = entity.oid;
            rlt.push(p);
        }
        //排序
        rlt.sort(function (obj1, obj2) {
            if (obj1.oid > obj2.oid) {
                return 1;
            }
            else if (obj1.oid == obj2.oid) {
                return 0;
            }
            else {
                return -1;
            }
        });
        return rlt;
    }

    /**
     * 取消线的绘制
     * 
     * drawPolyline.cancel();
     */
    cancel() {
        //如果正在绘制的话， 取消绘制
        // if (this.isDrawing) {
        //     this.clear();
        //     if (this.drawingEntity) {
        //         this.viewer.entities.remove(this.drawingEntity);
        //     }
        //     this.isDrawing = true;
        // }
        this.leftClickCallback = () =>{};
        this.mouseMoveCallback = () =>{};
        this.rightClickCallback = () =>{};
    }

}

export default DrawPolyline;