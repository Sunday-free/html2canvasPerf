import PolygonHierarchy from 'cesium/Core/PolygonHierarchy';
import PolylineDashMaterialProperty from "cesium/DataSources/PolylineDashMaterialProperty";
import Draw from "./Draw";
import PolygonGraphics from 'cesium/DataSources/PolygonGraphics';
import LayerType from "../constant/LayerType";
import CallbackProperty from "cesium/DataSources/CallbackProperty";
import Color from "cesium/Core/Color";
import CesiumMath from 'cesium/Core/Math';
import GeoUtil from "../utils/GeoUtil";
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartographic from 'cesium/Core/Cartographic';

class DrawPolygon extends Draw {
    /**
     * 绘制面
     * @alias DrawPolygon
     * @constructor
     * @extends Draw
     * @private
     * 
     * @param {GeoMap} geomap GeoMap对象
     * 
     * @example
     * var drawPolygon = new BOSGeo.DrawPolygon(geomap);
     */
    constructor(geomap) {
        super(geomap);
        this.hierarchy = new PolygonHierarchy();

        this.drawingEntity = undefined;
    }

    /**
     * 画面
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
     * drawPolygon.draw({
     *  id: '面'
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
        let that = this;
        this.startDraw(options, function (attr) {
            let objId = (new Date()).getTime();
            attr.id = objId;
            that.endDraw(attr);
            okHandler(attr);
        }, cancelHandler);
    }


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
                    hierarchy: new PolygonHierarchy(positions, []),
                    material: material,
                    perPositionHeight: !clampToGround,
                    outlineWidth:lineWidth,
                    outlineColor:Color.fromCssColorString(lineColor).withAlpha(lineOpacity),
                }
            }
            if(!clampToGround){
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
     * @param {Object} option 包含以下参数的Object对象
     * @param {Number} [option.id] 对象ID
     * @param {String} [option.color] 面的颜色
     * @param {Number} [option.opacity] 面透明度
     * @param {Number} [option.lineWidth] 外面框宽度
     * @param {String} [option.lineColor] 外面框颜色
     * @param {Number} [option.lineOpacity] 外面框透明度
     * @param {Boolean} [option.clampToGround] 是否贴地
     * @param {Number} [option.height] 面高度
     * @param {LineLayer} [option.layer] 选填，绘制结果添加至面图层
     * @param {LineLayer} [option.landMaterial] 选填，添加至面图层时使用到的材质
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     */
    startDraw(attr, okHandler, cancelHandler) {
        super._startDraw(attr, okHandler, cancelHandler);
        let that = this;
        that.positions = [];
        let tempPoints = [];
        let floatingPoint = null;
        that.leftClickCallback = function (cartesian) {
            cartesian = GeoUtil.cartesianToArray(cartesian);
            cartesian[2] = this.attr.height;
            const  p  = Cartesian3.fromDegrees(...cartesian);
            let num = that.positions.length;
            if (num === 0) {
                that.positions.push(p);
                floatingPoint = that._createPoint(p, -1);
                // floatingPoint.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY;
                that.drawing();
            };
            that.positions.push(p);
            let oid = that.positions.length - 2;
            that._createPoint(p, oid);

            that.isDrawing = true;

            tempPoints.push({ lon: cartesian[0], lat: cartesian[0], hei: cartesian[2] });

        };

        that.mouseMoveCallback = function (cartesian) {
            cartesian = GeoUtil.cartesianToArray(cartesian);
            cartesian[2] = this.attr.height;
            const  p  = Cartesian3.fromDegrees(...cartesian);
            if (that.positions.length < 1) {
                return;
            }

            //floatingPoint.position.setValue(cartesian);
            that.positions.pop();
            that.positions.push(p);
        };

        that.rightClickCallback = function () {
            if (that.positions.length < 4) {
                return;
            }
            that.positions.pop();
            // that.viewer.entities.remove(floatingPoint);
            //
            // let positions = that.getPositionWithSid();
            that.clear();
            that.okHandler(attr);
            that.isDrawing = false;
        }
    }

    /**
     * 显示多边形
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
        // let lineMaterial = new PolylineDashMaterialProperty({
        //    dashLength: 16,
        //    color: Color.fromCssColorString(that.attr.lineColor).withAlpha(that.attr.lineOpacity)
        // });

        // let depthFailMaterial = new PolylineDashMaterialProperty({
        //     dashLength: 16,
        //     color: Color.fromCssColorString(that.attr.lineColor).withAlpha(0.3)
        // });
        let dynamicPositions = new CallbackProperty( () => {
            this.hierarchy.positions = this.positions;
            return this.hierarchy;
        }, false);
        // let lineDynamicPositions = new CallbackProperty(function () {
        //     if (that.positions.length > 1) {
        //         let arr = [].concat(that.positions);
        //         let first = that.positions[0];
        //         arr.push(first);
        //         return arr;
        //     } else {
        //         return null;
        //     }
        // }, false);
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
        if(!clampToGround){
            config.polygon.height = height;
            config.polygon.extrudedHeight = extrudedHeight;
        }



        this.drawingEntity = this.viewer.entities.add(config);
    }

    /**
     * 取消面的绘制
     * 
     * @example
     * drawPolygon.cancel();
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

export default DrawPolygon;