import Draw from "./Draw";
import Color from "cesium/Core/Color";
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartesian2 from "cesium/Core/Cartesian2";

import defaultValue from "cesium/Core/defaultValue";
import VerticalOrigin from "cesium/Scene/VerticalOrigin"
import DistanceDisplayCondition from "cesium/Core/DistanceDisplayCondition";

class DrawPoint extends Draw {
    /**
     * 绘制点
     * @alias DrawPoint
     * @constructor
     * @extends Draw
     * @private
     * 
     * @param {GeoMap} geomap GeoMap对象 
     * 
     * @example
     * var drawPoint = new BOSGeo.DrawPoint(geomap);
     */
    constructor(geomap) {
        super(geomap);
        this.positions = [];
    }

    /**
     * 画点
     * @param {Object} attr 以下参数的Object对象
     * @param {Color} [attr.color='#ff0000'] 点的颜色
     * @param {Number} [attr.size=5] 点的大小
     * @param {Number} [attr.opacity=1] 点的透明度
     * @param {Number} [attr.text='test'] 点的标注内容
     * @param {Number} [attr.showLabel=true] 是否显示标注
     * @param {Number} [attr.offsetXY=[0, 20]] 标注偏移
     * @param {Number} [attr.fadeDistance=5000] 点的透明度
     * @param {String} [attr.image] 当有此属性时，点会渲染为label形式
     * @param {Cartesian3} [attr.points] 点的位置
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     * 
     * @example
     * drawPoint.draw({
     *   color: '#ffff00',
     *   opacity: 0.5,
     *   text: '111',
     *   offsetXY: [0, 20],
     *   fadeDistance: 100000,
     *   image: 'http://192.168.1.165:8042/data/drawicon_sign_b3.png',
     * }, okFunction, cancelHandler);
     * 
     */
    draw(attr, okHandler, cancelHandler) {
        let that = this;
        this.startDraw(attr, function (attr) {
            let objId = (new Date()).getTime();
            attr.id = objId;
            that.showPoint(attr);
            okHandler(attr);
        }, cancelHandler);
    }

    /**
     * 显示点
     * 
     * @private
     * 
     * @param {Object} attr 以下参数的Object对象
     * @param {Color} [attr.color='#ff0000'] 点的颜色
     * @param {Number} [attr.size=5] 点的大小
     * @param {Number} [attr.opacity=1] 点的透明度
     * @param {Number} [attr.text='test'] 点的标注内容
     * @param {Number} [attr.showLabel=true] 是否显示文字标注
     * @param {Number} [attr.offsetXY=[0, 20]] 标注偏移
     * @param {Number} [attr.fadeDistance=5000] 点的最大可视距离
     * @param {String} [attr.image] 当有此属性时，点会渲染为billboard形式
     * @param {Cartesian3} [attr.points] 点的位置
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     */
    showPoint(attr) {
        const positions = attr.points; //点的位置
        const {
            color = '#ff0000',
            size = 5,
            opacity = 1,
            image,
            showLabel = true,
            text = 'test',
            offsetXY = [0, 20],
            fadeDistance = 5000,
        } = attr;

        this.shapeDic[attr.id] = positions;//记录位置
        attr.type = 'Point';
        let material = Color.fromCssColorString(color).withAlpha(opacity);

        let bData = {
            layerId: this.drawLayerId,
            shapeType: "Point",
            attr: attr,
            position: positions,
            label: {
                text: text,
                show: showLabel,
                pixelOffset: new Cartesian2(offsetXY[0], offsetXY[1]),
                verticalOrigin: VerticalOrigin.BOTTOM, // default: CENTER
                fillColor: material,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        }
        if (image) {
            bData.billboard = {
                image: image, // default: undefined
                show: true, // default
                scale: size, // default: 1.0
                width: 10, // default: undefined
                height: 10, // default: undefined
                verticalOrigin: VerticalOrigin.TOP, // default: CENTER
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                distanceDisplayCondition: new DistanceDisplayCondition(0.0, fadeDistance)
            }
        } else {
            bData.point = {
                pixelSize: size,
                color: material,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                distanceDisplayCondition: new DistanceDisplayCondition(0.0, fadeDistance)
            }
        }


        let entity = this.viewer.entities.add(bData);

        attr.entity = entity;

        this.geomap.render();

    }

    /**
     * 绘制点
     * 
     * @private
     */
    startDraw(attr, okHandler, cancelHandler) {
        super._startDraw(attr, okHandler, cancelHandler);
        let that = this;
        that.positions = new Cartesian3();
        // that.showPoint2Map();
        that.leftClickCallback = function (cartesian) {
            that.clear();
            attr.points = cartesian;
            that.okHandler(attr);
            that.isDrawing = true;
        }

        that.mouseMoveCallback = function (cartesian) {

            that.positions = cartesian;
        };

        that.rightClickCallback = function () {

            that.clear();
            // that.okHandler(attr);
            that.isDrawing = false;
        }
    }

    /**
     * 取消绘制
     * 
     * @private
     */
    cancel() {
        // TODO
    }
}

export default DrawPoint;