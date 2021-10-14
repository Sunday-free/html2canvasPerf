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
import PolygonHierarchy from 'cesium/Core/PolygonHierarchy';
import LayerType from "../constant/LayerType";

class DrawRectangle extends Draw {
    /**
     * 绘制矩形
     * @alias DrawRectangle
     * @constructor
     * @extends Draw
     * @private
     * 
     * @param {GeoMap} geomap GeoMap对象
     * 
     * @example
     * var drawRectangle = new BOSGeo.DrawRectangle(geomap);
     */
    constructor(geomap) {
        super(geomap);
        this.hierarchy = new PolygonHierarchy();

        this.drawingEntity = undefined;
    }

    /**
     * 绘制矩形
     * @param {Object} options 包含以下参数的Object对象
     * @param {Number} [options.id] 对象ID
     * @param {String} [options.color = '#ff0000'] 面的颜色
     * @param {Number} [options.opacity = 0.8] 面透明度
     * @param {Number} [options.lineWidth = 0] 外面框宽度
     * @param {String} [options.lineColor = '#00ff00'] 外面框颜色
     * @param {Number} [options.lineOpacity = 1] 外面框透明度
     * @param {Boolean} [options.clampToGround = false] 是否贴地
     * @param {Number} [options.height = 0.1] 面高度
     * @param {LineLayer} [options.layer] 选填，绘制结果添加至面图层
     * @param {LineLayer} [options.landMaterial] 选填，添加至面图层时使用到的材质
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     * @example 
     * 
     * drawRectangle.draw({
     *  id: '矩形'
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
        const that = this;
        this.startDraw(options, function () {
            let objId = (new Date()).getTime();
            that.attr.id = objId;
            that.endDraw(that.attr)
            okHandler(that.attr)
        }, cancelHandler);
    }

    /**
     * 显示矩形
     * 
     * @private
     * 
     * @param {String} [attr.id] 对象ID
     * @param {Color} [attr.color='#ff0000'] 面的颜色
     * @param {Number} [attr.opacity=1] 面的透明度
     * @param {Array<Cartesian3>} [attr.points] 面节点坐标
     * @param {Number} [attr.lineWidth=2] 线的宽度
     * @param {AreaLayer} [attr.layer] 绘制结果放入图层中
     */
     endDraw() {
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
        let positions = this.positions; //坐标
        let bosgeoColor = Color.fromCssColorString(color).withAlpha(opacity);
        if (layer) {
            if(layer.layerType !== LayerType.AREA) throw new Error('layer: 请传入一个面图层！');

            if(!landMaterial){
                landMaterial = BOSGeo.AreaMaterialConfig.COLOR;
                landMaterial.color = bosgeoColor.toCssHexString();
            }
            area = layer.add({
                positions,
                landMaterial,
                clampToGround
            })
        } else {
            this.shapeDic[attr.id] = positions;
            attr.type = 'Polygon';
            let material = Color.fromCssColorString(color).withAlpha(opacity);

            let config = {
                attr: attr,
                polygon: {
                    hierarchy: new PolygonHierarchy({positions}),
                    material: material,
                    perPositionHeight: !clampToGround,
                    outlineWidth:lineWidth,
                    outlineColor:Color.fromCssColorString(lineColor).withAlpha(lineOpacity),
                }
            }
            if(clampToGround){
                config.polygon.height = height;
                config.polygon.extrudedHeight = extrudedHeight;
            }
            
            area = this.viewer.entities.add(config);
        }
        attr.points = this.positions;
        attr.entity = area;
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
     */
    startDraw(options, okHandler, cancelHandler) {
        super._startDraw(options, okHandler, cancelHandler);
        let that = this;
        that.positions = [];
        that.startPosition = null;
        that.leftClickCallback = (cartesian) => {
            cartesian = GeoUtil.cartesianToArray(cartesian);
            cartesian[2] = that.attr.height;
            const  p  = Cartesian3.fromDegrees(...cartesian);
            if (!that.startPosition && p && p.toString() !== '') {
                that.startPosition = p;
                that.drawing();
            }else {
                if (p.toString() !== that.startPosition.toString()){
                    that.endPosition = p;
                }
            }
            that.geomap.render();

        };

        that.mouseMoveCallback = (cartesian) => {
            if (!that.startPosition) {
                return;
            }
            const end = GeoUtil.cartesianToArray(cartesian);
            const start = GeoUtil.cartesianToArray(that.startPosition);
            const h = that.attr.height;

            if(end.slice(0,1).toString() !== start.slice(0,1).toString()) {
                that.positions.length = 0;
                [[start[0], start[1]], [end[0], start[1]], [end[0], end[1]], [start[0], end[1]]].forEach(p => {
                    that.positions.push(Cartesian3.fromDegrees(p[0], p[1], h));
                });
            }

            that.geomap.render();

        };

        that.rightClickCallback = (cartesian) => {
            if(!that.endPosition || !that.startPosition) return;
            
            const end = GeoUtil.cartesianToArray(that.endPosition);
            const start = GeoUtil.cartesianToArray(that.startPosition);
            const h = that.attr.height;
            that.positions.length = 0;
            [[start[0],start[1]],[end[0],start[1]],[end[0],end[1]],[start[0],end[1]]].forEach(p=>{
                that.positions.push(Cartesian3.fromDegrees(p[0],p[1],h));
            });
            that.clear();
            that.isDrawing = false;
                okHandler()
        }

    }

     /**
     * 显示矩形
     * 
     * @private
     * 
     * @returns {Entity}
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
        let dynamicPositions = new CallbackProperty( () => {
            this.hierarchy.positions = this.positions;
            return this.hierarchy;
        }, false);
        let material = Color.fromCssColorString(color).withAlpha(opacity);

        let config = {
            attr: attr,
            polygon: {
                hierarchy: dynamicPositions,
                material,
                perPositionHeight: !clampToGround,
                outlineWidth:lineWidth,
                outlineColor:Color.fromCssColorString(lineColor).withAlpha(lineOpacity),
            }
        }
        if(! clampToGround){
            config.polygon.height = height;
            config.polygon.extrudedHeight = extrudedHeight;
        }

        

        this.drawingEntity =   this.viewer.entities.add(config);
    }




    /**
     * 取消矩形的绘制
     * 
     * @example
     * drawRectangle.cancel();
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

export default DrawRectangle;
