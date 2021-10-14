import Draw from "./Draw";
import PolylineGlowMaterialProperty from "cesium/DataSources/PolylineGlowMaterialProperty";
import CustomDataSource from "cesium/DataSources/CustomDataSource";
import CallbackProperty from "cesium/DataSources/CallbackProperty";
import Color from "cesium/Core/Color";
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartesian2 from "cesium/Core/Cartesian2";
import defaultValue from "cesium/Core/defaultValue";
import PolylineDynamicMaterialProperty from 'cesium/DataSources/PolylineDynamicMaterialProperty'
import PolylineDashMaterialProperty from 'cesium/DataSources/PolylineDashMaterialProperty'
import Util from "../utils/Util";
import GeoUtil from "../utils/GeoUtil";
import  FeatureType  from '../constant/FeatureType.js';
import  DefaultData  from '../constant/DefaultData.js';
import ClassificationType from 'cesium/Scene/ClassificationType';
import LayerType from "../constant/LayerType";


/** 
 * 绘制抛物线
 * @ignore
 */
class DrawArcLine extends Draw {
    /**
     * 绘制抛物线
     * @alias DrawArcLine
     * @constructor
     * @extends Draw
     * @private
     * @param {GeoMap} geomap GeoMap对象
     * 
     * @example
     * var drawArcline = new BOSGeo.DrawArcLine(geomap);
     */
    constructor(geomap) {
        super(geomap);
        this.positions = []; //结果点
        this.baseHeight = 0;
        this.drawingEntity = undefined; //绘制过程中对象
    }


    /**
     * 绘制抛物线
     * @param {Object} option 包含以下参数的Object对象
     * @param {Number} [option.id] 对象ID
     * @param {Color} [option.color = '#ff0000'] 线的颜色
     * @param {Number} [option.width] 线的宽度
     * @param {Number} [option.arcHeight = 50000]  弧线最高点的高度
     * @param {Number} [option.arcDensity = 30]  弧线光滑度
     * @param {Number} [option.lineType=1] 线类型 1-普通颜色材质 2-虚线材质 3-发光材质 4-动态材质 不传入时为普通颜色材质
     * @param {String|Image} [option.dynamicImg] 材质为4时，使用自定义元素
     * @param {Number} [options.repeat] 材质为4且使用自定义元素，重复个数
     * @param {LineLayer} [option.layer] 选填，绘制结果添加至线图层
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     */
    draw(option, okHandler, cancelHandler) {
        option = Object.assign({
            color : '#ff0000',
            width : 10,
            lineType : 1,
            arcHeight:50000,
            arcDensity:30,
            showLabel : false,
            speed : 20,
            clampToGround : false,
            opacity : 1,
            repeat : 1,
        }, option);
        this.startDraw(option, () => {
            this.endDraw();
            okHandler(this.attr);
        }, cancelHandler);
    }
      /**
     * 开始画线
     * @param {Object} option 包含以下参数的Object对象
     * @param {Number} [option.id] 对象ID
     * @param {Color} [option.color] 线的颜色
     * @param {Number} [option.width] 线的宽度
     * @param {Number} [option.arcHeight = 50000]  弧线最高点的高度
     * @param {Number} [option.arcDensity = 30]  弧线光滑度
     * @param {Number} [option.lineType] 线类型 1-普通颜色材质 2-虚线材质 3-发光材质 4-动态材质 不传入时为普通颜色材质
     * @param {String|Image} [option.dynamicImg] 材质为4时，使用自定义元素
     * @param {Number} [options.repeat] 材质为4且使用自定义元素，重复个数
     * @param {LineLayer} [option.layer] 选填，绘制结果添加至线图层
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     */
    startDraw(option, okHandler, cancelHandler) {
        
        super._startDraw(option, okHandler, cancelHandler);
        let floatingPoint = null;
        this.positions = [];
        let tempPoints = [];
        this.leftClickCallback = (cartesian)=>{
            const degrees = GeoUtil.cartesianToArray(cartesian);
            cartesian = Cartesian3.fromDegrees(degrees[0],degrees[1],this.baseHeight);
            if (!this.positions.length) { //第一次左键单击
                this.positions = [cartesian,cartesian];
                floatingPoint = this._createPoint(cartesian, -1);
                tempPoints.push(floatingPoint);
                this.initDrawingEntity();
            }else{
                this.endPoint = cartesian;
            };
            this.geomap.render();


        };

        this.mouseMoveCallback =  (cartesian)=> {
            const degrees = GeoUtil.cartesianToArray(cartesian);
            cartesian = Cartesian3.fromDegrees(degrees[0],degrees[1],this.baseHeight);
            if (this.positions.length < 1 ) {
                return;
            }
            const points = [this.positions[0], cartesian];//通过首点和尾点计算弧线
            this.positions = GeoUtil.getLinkedPointList(...points, option.arcHeight, option.arcDensity);
            if(this.positions[0] && cartesian && this.positions[0].toString() !== cartesian.toString()){
                this.endPoint = cartesian;
            }
            this.geomap.render();

        };

        this.rightClickCallback =  () =>{
            if (!this.endPoint) {
                return;
            }
            const points = [this.positions[0], this.endPoint];
            this.endPoint = undefined;
            
            this.positions = GeoUtil.getLinkedPointList(...points, option.arcHeight, option.arcDensity);
            okHandler(option);

            this.clear();
            this.isDrawing = false;
            this.geomap.render();
        }
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
            opacity,
            repeat,
            layer,
            id
        } = this.attr;

        const positions = this.positions
        this.shapeDic[id] = positions;//记录位置

        let line;
        
        //存在传入图层则将结果添加进图层
        if(layer){
            if(layer.layerType !== LayerType.LINE) throw new Error('layer: 请传入一个线图层！');
            line = layer.add({
                positions,
                color,
                opacity,
                width,
                lineType,
                dynamicImg,
                speed,
                repeat
            });
        } else{
            let bosgeoColor = Color.fromCssColorString(color).withAlpha(opacity);
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
                case 4:
                    const lineLength = positions.reduce((acc, cur) => {
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
                    width,
                    material
                }
            });
        } 

        this.attr.entity = line;
        this.positions = [];
    }

    /**
     * 显示绘制状态的线
     */
    initDrawingEntity() {
        const { lineType, color,opacity,width } = this.attr;
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

        let entity = this.viewer.entities.add({
            layerId: this.layerId,
            polyline: {
                positions: dynamicPositions,
                width,
                material: material,
                depthFailMaterial: material
            }
        });
        this.drawingEntity = entity

    }
    /**
     * 取消绘制
     */
    cancel() {
        //如果正在绘制的话， 取消绘制
        if (this.isDrawing) {
            this.clear();
            if (this.drawingEntity) {
                this.viewer.entities.remove(this.drawingEntity);
            }
            this.isDrawing = true;
        }


    }

}

export default DrawArcLine;