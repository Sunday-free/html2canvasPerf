import Draw from "./Draw";
import PolylineGlowMaterialProperty from "cesium/DataSources/PolylineGlowMaterialProperty";
import CallbackProperty from "cesium/DataSources/CallbackProperty";
import Color from "cesium/Core/Color";
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartesian2 from "../../../cesium/Source/Core/Cartesian2";
import defaultValue from "../../../cesium/Source/Core/defaultValue";
import PolylineDashMaterialProperty from "../../../cesium/Source/DataSources/PolylineDashMaterialProperty";
import Util from "../utils/Util";
import GeoUtil from "../utils/GeoUtil";
import LayerType from "../constant/LayerType";

class DrawCircle extends Draw {
    /**
     * 绘制圆
     * @alias DrawCircle
     * @constructor
     * @extends Draw
     * @private
     * 
     * @param {GeoMap} geomap GeoMap对象
     * 
     * @example
     * var drawCircle = new BOSGeo.DrawCircle(geomap);
     */
    constructor(geomap) {
        super(geomap);
        this.positions = [];
        this.drawingEntity = undefined;
        this.radius = 1; //默认的半径
    }

    /**
     * 绘制圆
     * @param {Object} options 包含以下参数的Object对象
     * @param {Number} [options.id] 对象ID
     * @param {String} [options.color = '#ff0000'] 圆的颜色
     * @param {Number} [options.opacity = 0.8] 圆透明度
     * @param {Number} [options.lineWidth = 0] 外面框宽度
     * @param {String} [options.lineColor = '#00ff00'] 外面框颜色
     * @param {Number} [options.lineOpacity = 1] 外面框透明度
     * @param {Boolean} [options.clampToGround = false] 是否贴地
     * @param {Number} [options.height = 0.1] 圆高度
     * @param {LineLayer} [options.layer] 选填，绘制结果添加至面图层
     * @param {LineLayer} [options.landMaterial] 选填，添加至面图层时使用到的材质
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     * 
     * @example
     * drawCircle.draw({
     *   opacity: 0.5,
     * }, okFunction, cancelHandler); 
     */
    draw(options, okHandler, cancelHandler) {
        options = Object.assign({
            color: '#ff0000',
            opacity: 0.8,
            clampToGround: false,
            height: 0.1,
            extrudedHeight: 0.1,
            lineColor : '#00ff00',
            lineOpacity : 1,
            lineWidth : 0,
            radius: 1,
        }, options);
        this.startDraw(options, () => {
            let objId = (new Date()).getTime();
            this.attr.id = objId;
            this.endDraw(this.attr)
            // this.showNormalPolyline(this.attr);
            okHandler(this.attr)
        }, cancelHandler);
    }
  
     /**
     * 开始绘制     
     * @param {Object} options 包含以下参数的Object对象
     * @param {Number} [options.id] 对象ID
     * @param {String} [options.color] 面的颜色
     * @param {Number} [options.opacity] 面透明度
     * @param {Number} [options.lineWidth] 外面框宽度
     * @param {String} [options.lineColor] 外面框颜色
     * @param {Number} [options.lineOpacity] 外面框透明度
     * @param {Boolean} [options.clampToGround] 是否贴地
     * @param {Number} [options.height] 面高度
     * @param {LineLayer} [options.layer] 选填，绘制结果添加至面图层
     * @param {LineLayer} [options.landMaterial] 选填，添加至面图层时使用到的材质
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     * 
     */
      startDraw(options, okHandler, cancelHandler) {
        super._startDraw(options, okHandler, cancelHandler);
        this.positions = [];
        let entity;
        this.leftClickCallback = (cartesian) => {
            let num = this.positions.length;
            cartesian = GeoUtil.cartesianToArray(cartesian);
            cartesian[2] = this.attr.height;
            const  p  = Cartesian3.fromDegrees(...cartesian);
            if (!num) {
                this.positions.push(p);
                entity = this.drawing();
                this.drawingEntity = entity;
            }else{
                this.temptRadius = Cartesian3.distance(p, this.positions[0]);
            }
            this.geomap.render();

        };

        this.mouseMoveCallback = (cartesian) => {
            cartesian = GeoUtil.cartesianToArray(cartesian);
            cartesian[2] = this.attr.height;
            const  p  = Cartesian3.fromDegrees(...cartesian);
            if (!this.positions.length) {
                return;
            }

            if(this.radius >0.01 && p.toString() !== this.positions[0].toString() ){
                this.radius = Cartesian3.distance(p, this.positions[0]);
                this.temptRadius = this.radius;
            }
            this.geomap.render();

        };

        this.rightClickCallback = (cartesian) => {
            //选中非地球点时，不结束
            if (this.temptRadius) {
                this.radius = this.temptRadius;
                this.clear();
                this.isDrawing = false;
                okHandler();
                this.temptRadius = undefined;
            }
        }
    }


    /**
     * 绘制最后结果
     */ 
    endDraw() {
        //移除动态圆
        this.viewer.entities.remove(this.drawingEntity);
        const attr = this.attr;
        let {
            color,
            opacity,
            lineColor,
            lineOpacity,
            lineWidth,
            clampToGround,
            height,
            extrudedHeight,
            layer,
            landMaterial
        } = attr;
        let area;
        let bosgeoColor = Color.fromCssColorString(color).withAlpha(opacity);
        if (layer) {
            if(layer.layerType !== LayerType.AREA) throw new Error('layer: 请传入一个面图层！');
            if(!landMaterial){
                landMaterial = BOSGeo.AreaMaterialConfig.COLOR;
                landMaterial.color = bosgeoColor.toCssHexString();
            }
            area = layer.addCircle({
                center: this.positions[0],
                radius:this.radius,
                landMaterial,
                clampToGround
            })
            attr.points = area.positions;
            
        } else {
            attr.points = GeoUtil.computeCirclePolygon(this.positions[0], this.radius);
            const material = bosgeoColor;
            this.shapeDic[attr.id] = this.positions;//记录位置
            attr.type = 'Circle';
            const config = {
                attr: attr,
                position: this.positions[0],
                ellipse: {
                    semiMinorAxis: this.radius,
                    semiMajorAxis: this.radius,
                    outline:Boolean(lineWidth),
                    outlineWidth:lineWidth,
                    outlineColor:Color.fromCssColorString(lineColor).withAlpha(lineOpacity),
                    material
                }
            }
            if(clampToGround){
                config.ellipse.height = height;
                config.ellipse.extrudedHeight = extrudedHeight;
            }
            area = this.viewer.entities.add(config);
        }
        attr.entity = area;
        this.radius = 1
        this.geomap.render();
    }

   
    /**
     * 显示绘制状态的圆
     * 
     * @private
     */
    drawing() {
        const attr = this.attr;
        const {
            color,
            opacity,
            lineColor,
            lineOpacity,
            lineWidth,
            clampToGround,
            height,
            extrudedHeight,
        } = attr;
        let bosgeoColor = Color.fromCssColorString(color).withAlpha(opacity);
        const material = bosgeoColor;
        this.shapeDic[attr.id] = this.positions;//记录位置
        attr.type = 'Circle';
        const config = {
            
            attr: attr,
            position: this.positions[0],
            ellipse: {
                semiMinorAxis: new CallbackProperty(e => {
                    return this.radius
                }, false),
                semiMajorAxis: new CallbackProperty(e => {
                    return this.radius
                }, false),
                outline:Boolean(lineWidth),
                outlineWidth:lineWidth,
                outlineColor:Color.fromCssColorString(lineColor).withAlpha(lineOpacity),
                material
            }
        }
        if(clampToGround){
            config.ellipse.height = height;
            config.ellipse.extrudedHeight = extrudedHeight;
        }
      
        let entity = this.viewer.entities.add(config);
        this.drawingEntity = entity;
        return entity;
    }




    /**
     * 取消圆的绘制
     * 
     * @example
     * drawCircle.cancel();
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

export default DrawCircle;