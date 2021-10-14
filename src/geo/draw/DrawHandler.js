import DrawPoint from "./DrawPoint";
import DrawPolyline from "./DrawPolyline";
import DrawArcLine from "./DrawArcLine";
import DrawRectangle from "./DrawRectangle";
import DrawPolygon from "./DrawPolygon";
import DrawCircle from "./DrawCircle"
import DrawPrimitive from "./DrawPrimitive";
import GeoMap from "../core/GeoMap";
import DefaultData from "../constant/DefaultData";
import Label from 'cesium/Scene/Label';
import Billboard from 'cesium/Scene/Billboard';

import EditorHelper from './EditorHelper';
import DrawType from '../constant/DrawType';
import CustomMaterialType from '../constant/CustomMaterialType';
import FileUtil from '../utils/FileUtil';
import Util from '../utils/Util';

import destroyObject from 'cesium/Core/destroyObject';
import createGuid from 'cesium/Core/createGuid';
import Color from 'cesium/Core/Color';
import Cartesian2 from 'cesium/Core/Cartesian2';
import Matrix4 from 'cesium/Core/Matrix4';
import Cartesian3 from 'cesium/Core/Cartesian3';
import defined from 'cesium/Core/defined';
import BoundingSphere from 'cesium/Core/BoundingSphere';
import GeoUtil from "../utils/GeoUtil";


class DrawHandler {
    /**
     * 绘制工具类
     * @alias DrawHandler
     * @constructor
     * 
     * @param {GeoMap} geomap GeoMap对象
     * 
     * @example
     * var drawHandler = new BOSGeo.DrawHandler(geomap);
     * 
     */
    constructor(geomap) {
        this.drawLayerId = 'globeDrawLayer';
        let layerManager = geomap.layerManager;
        // this.drawLayer = layerManager.createDrawLayer(this.drawLayerId);
        this.viewer = geomap.viewer;
        this.camera = this.viewer.camera;
        this.geomap = geomap

        //点绘制
        this.pointDrawer = new DrawPoint(geomap);
        // this.drawLayer.add(this.pointDrawer);

        //线绘制
        this.polylineDrawer = new DrawPolyline(geomap);
        // this.drawLayer.add(this.polylineDrawer);

        //面绘制
        this.polygonDrawer = new DrawPolygon(geomap);
        // this.drawLayer.add(this.polygonDrawer);

        //矩形绘制
        this.rectangleDrawer = new DrawRectangle(geomap);

        //圆绘制
        this.circleDrawer = new DrawCircle(geomap);

        //动态线绘制
        this.arcLineDrawer = new DrawArcLine(geomap);

        // 几何图元绘制
        this.primitiveDrawer = new DrawPrimitive(geomap);
    }

    /**
      * 画点
      * 
      * @param {Object} options 以下参数的Object对象：
      * @param {Color} [options.color='#ff0000'] 点的颜色；
      * @param {Number} [options.size=5] 点的大小；
      * @param {Number} [options.opacity=1] 点的透明度；
      * @param {Number} [options.text='test'] 点的标注内容；
      * @param {Number} [options.showLabel=true] 是否显示文字标注；
      * @param {Number} [options.offsetXY=[0, 20]] 标注偏移；
      * @param {Number} [options.fadeDistance=5000] 点的最大可视距离；
      * @param {String} [options.image] 当有此属性时，点会渲染为billboard形式；
      * @param {Cartesian3} [options.points] 点的位置；
      * @param {Function} [okHandler] 绘制完成后的回调；
      * @param {Function} [cancelHandler] 绘制取消时的回调。
      * 
      * @example
      * drawHandler.drawPoint({
      *   color: '#ffff00',
      *   opacity: 0.5,
      *   text: '111',
      *   offsetXY: [0, 20],
      *   fadeDistance: 100000,
      *   image: 'http://192.168.1.165:8042/data/drawicon_sign_b3.png',
      * }, okFunction, cancelHandler);
      */
    drawPoint(options, okHandler, cancelHandler) {
        this.clear();
        options.image = options.image || DefaultData.IMG_DATA_LOCATE;
        this.pointDrawer.draw(options, okHandler, cancelHandler);
    }

    /**
     * 绘制折线
     * 
     * @param {Object} options 包含以下参数的Object对象
     * @param {Number} [options.id] 对象ID
     * @param {Color} [options.color='#ff0000'] 线的颜色
     * @param {Number} [options.width=10] 线的宽度
     * @param {Array<Cartesian3>} [options.points] 线节点坐标
     * @param {Number} [options.opacity=1] 线的透明度
     * @param {Number} [options.lineType = 1] 线类型 1-普通颜色材质 2-虚线材质 3-发光材质 4-动态材质 不传入时为普通颜色材质
     * @param {String|Image} [options.dynamicImg] 材质为4时，使用自定义元素
     * @param {Number} [options.repeat = 1] 材质为4且使用自定义元素，重复个数
     * @param {Number} [options.speed = 20] 材质为4且使用自定义元素，重复个数
     * @param {Boolean} [options.showLabel=false] 是否显示线的属性标注
     * @param {Boolean} [options.clampToGround=false] 线是否贴地
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     * 
     * @example
     * drawPolyline.draw({
     *   opacity: 0.5,
     *   lineType: 2, 
     * }, okFunction, cancelHandler);
     */
    drawPolyline(options, okHandler, cancelHandler) {
        this.clear();
        this.polylineDrawer.draw(options, okHandler, cancelHandler);
    }

    /**
     * 绘制抛物线
     * @param {Object} options 包含以下参数的Object对象
     * @param {Number} [options.id] 对象ID
     * @param {Color} [options.color = '#ff0000'] 线的颜色
     * @param {Number} [options.width] 线的宽度
     * @param {Number} [options.arcHeight = 50000]  弧线最高点的高度
     * @param {Number} [options.arcDensity = 30]  弧线光滑度
     * @param {Number} [options.lineType=1] 线类型 1-普通颜色材质 2-虚线材质 3-发光材质 4-动态材质 不传入时为普通颜色材质
     * @param {String|Image} [options.dynamicImg] 材质为4时，使用自定义元素
     * @param {Number} [options.repeat] 材质为4且使用自定义元素，重复个数
     * @param {LineLayer} [options.layer] 选填，绘制结果添加至线图层
     * @param {Function} [okHandler] 绘制完成后的回调
     * @param {Function} [cancelHandler] 绘制取消时的回调
     */
    drawArcLine(options, okHandler, cancelHandler) {
        this.clear();
        this.arcLineDrawer.draw(options, okHandler, cancelHandler);
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
    drawPolygon(options, okHandler, cancelHandler) {
        this.clear();
        this.polygonDrawer.draw(options, okHandler, cancelHandler);
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
    drawRectangle(options, okHandler, cancelHandler) {
        this.clear();
        this.rectangleDrawer.draw(options, okHandler, cancelHandler);
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
    drawCircle(options, okHandler, cancelHandler) {
        this.clear();
        this.circleDrawer.draw(options, okHandler, cancelHandler);
    }

    /**
     * 更新绘制时的样式(可参考对应几何对象的绘制参数，只需要更新所需样式即可)
     * @param {Object} options 
     * 
     * @see drawEllipse
     * @see drawEllipsoid
     * @see drawCustomRectangle
     * @see drawPolygonPrimitive
     * @see drawPolylinePrimitive
     * @see drawPorabolaPrimitive
     * @see drawCustomPoint
     */
    updateDrawOptions(options = {}) {
        this.primitiveDrawer.updateStyle(options);
    }

    /**
     * 绘制圆、椭圆、圆柱、椭圆柱
     * 
     * @param {Object} options 
     * @param {String} [options.fillColor='#FF0000'] 填充颜色CSS Color ，如#FF0000
     * @param {Number} [options.alpha] 填充颜色不透明度，0~1
     * @param {Number} [options.rotation=0] 椭圆朝向，单位为弧度
     * @param {Number} [options.radius] 圆、圆柱的半径，设置时仅需要一个点便可以绘制
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.CIRCLE] 椭圆类型，基本圆和椭圆
     * @param {String} [options.name='圆'] 名称
     * @param {Boolean} [options.isGround=true] 是否贴地
     * @param {Number} [options.extrudedHeight] 拉伸高度,相对于底面的高度,未定义时为平面图形
     * @param {Cartesian2} [options.labelOffset] 标注像素偏移, 以文本标注左上角为原点，从左到右递增，从上往下递增,  
     *   一般设置为new BOSGeo.Cartesian2(0, -height * scale); height 为图标原始像素高,水平偏移可根据标注长度定义
     * @param {String} [options.tipBeforeDrawing='左键单击后拖动开始绘制圆'] 绘制前的提示
     * @param {String} [options.tipWhenDrawing='左键单击后结束绘制圆，右键取消绘制'] 绘制中的提示
     * @param {Function} okHandler 绘制完成回调方法
     * @param {Function} cancelHandler 绘制取消回调方法
     * 
     * @example
     * drawHandler.drawEllipse({
     *   rotation: Math.PI / 4
     * },function (ellipse) {
     *      console.log('3秒后隐藏')
     *     setTimeout(() => {
     *          drawHandler.setDrawPrimitiveVisible(ellipse.id.id, false);
     *     }, 3000);
     * }); 
     * 
     */
    drawEllipse(options, okHandler, cancelHandler) {
        this.clear();
        options = Object.assign({
            fillColor: '#FF0000',
            rotation: 0,
            drawType: DrawType.CIRCLE,
            name: '圆',
            isGround: false,
            id: createGuid(),
            tipBeforeDrawing: '左键单击后拖动开始绘制圆',
            tipWhenDrawing: '左键单击后结束绘制圆，右键取消绘制'
        }, options);
        this.primitiveDrawer.draw(options, okHandler, cancelHandler);
    }

    /**
     * 绘制球体（椭球体）
     * 
     * @param {Object} options 
     * @param {String} [options.fillColor='#FF0000'] 填充颜色CSS Color ，如#FF0000
     * @param {Number} [options.alpha] 填充颜色不透明度，0~1
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.SPHERE] 球体——Sphere、椭球体——Ellipsoid
     * @param {Number} [options.radius] 球体的半径，设置时仅需要一个点便可以绘制
     * @param {String} [options.name='球'] 名称
     * @param {Cartesian2} [options.labelOffset] 标注像素偏移, 以文本标注左上角为原点，从左到右递增，从上往下递增,  
     *   一般设置为new BOSGeo.Cartesian2(0, -height * scale); height 为图标原始像素高,水平偏移可根据标注长度定义
     * @param {String} [options.tipBeforeDrawing='左键单击后拖动开始绘制球'] 绘制前的提示
     * @param {String} [options.tipWhenDrawing='左键单击后结束绘制球，右键取消绘制'] 绘制中的提示
     * @param {Function} okHandler 绘制完成回调方法
     * @param {Function} cancelHandler 绘制取消回调方法
     * 
     * @example
     * drawHandler.drawEllipsoid({
     *   fillColor: '#00FFF0',
     *   alpha: 0.5,
     * },function (ellipsoid) {
     *      console.log('绘制结果', ellipsoid);
     * }); 
     */
    drawEllipsoid(options, okHandler, cancelHandler) {
        this.clear();
        options = Object.assign({
            fillColor: '#FF0000',
            drawType: DrawType.SPHERE, // .Ellipsoid, // 
            name: '球',
            id: createGuid(),
            tipBeforeDrawing: '左键单击后拖动开始绘制球',
            tipWhenDrawing: '左键单击后结束绘制球，右键取消绘制'
        }, options);
        this.primitiveDrawer.draw(options, okHandler, cancelHandler);
    }

    /**
     * 绘制正方形（矩形）及其拉伸体
     * 
     * @param {Object} options 
     * @param {String} [options.fillColor='#FF0000'] 填充颜色CSS Color ，如#FF0000
     * @param {Number} [options.alpha] 填充颜色不透明度，0~1
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.SQUARE] 矩形种类，正方形和常规矩形
     * @param {String} [options.name='正方形'] 名称
     * @param {Boolean} [options.isGround=false] 是否贴地
     * @param {Number} [options.angleToCross=Math.PI / 2] DrawType为Rectangle才有效，矩形对角线与另外一条对角线的顺时针方向的夹角，取值范围（0，Math.PI）
     * @param {Number} [options.extrudedHeight] 拉伸高度,相对于底面的高度
     * @param {Cartesian2} [options.labelOffset] 标注像素偏移, 以文本标注左上角为原点，从左到右递增，从上往下递增,  
     *  一般设置为new BOSGeo.Cartesian2(0, -height * scale); height 为图标原始像素高,水平偏移可根据标注长度定义
     * @param {String} [options.tipBeforeDrawing='左键单击后拖动开始绘制矩形'] 绘制前的提示
     * @param {String} [options.tipWhenDrawing='左键单击后结束绘制矩形，右键取消绘制'] 绘制中的提示
     * @param {Function} okHandler 绘制完成回调方法
     * @param {Function} cancelHandler 绘制取消回调方法
     * 
     * @example
     * drawHandler.drawCustomRectangle({
     *  fillColor: '#00FFF0',
     *  alpha: 0.5,
     *  drawType: BOSGeo.DrawType.RECTANGLE,
     *  extrudedHeight: 100
     * },function (res) {
     *      drawHandler.flyToDrawPrimitive(res.id.id);
     * });           
     */
    drawCustomRectangle(options, okHandler, cancelHandler) {
        this.clear();
        options = Object.assign({
            fillColor: '#FF0000',
            drawType: DrawType.SQUARE, // .Rectangle, // 
            name: '正方形',
            isGround: false,
            id: createGuid(),
            tipBeforeDrawing: '左键单击后拖动开始绘制矩形',
            tipWhenDrawing: '左键单击后结束绘制矩形，右键取消绘制'
        }, options);
        this.primitiveDrawer.draw(options, okHandler, cancelHandler);
    }

    /**
     * 绘制多边形（拉伸体）图元
     * @param {Object} options 
     * @param {String} [options.fillColor='#FF0000'] 填充颜色CSS Color ，如#FF0000
     * @param {Number} [options.alpha] 填充颜色不透明度，0~1
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.POLYGON] 多边形
     * @param {String} [options.name='多边形'] 名称
     * @param {Boolean} [options.isGround=false] 是否贴地
     * @param {Boolean} [options.depthTestEnabled=false] 是否开启深度测试（开启则不采用深度测试失败材质）,非贴地图元才有效
     * @param {Number} [options.extrudedHeight] 拉伸高度,相对于底面的高度
     * @param {Cartesian2} [options.labelOffset] 标注像素偏移, 以文本标注左上角为原点，从左到右递增，从上往下递增, 
     *   一般设置为new BOSGeo.Cartesian2(0, -height * scale); height 为图标原始像素高,水平偏移可根据标注长度定义
     * @param {String} [options.tipBeforeDrawing='左键单击开始绘制面'] 绘制前的提示
     * @param {String} [options.tipWhenDrawing='左键至少选择三个点，右键取消绘制'] 绘制中的提示
     * @param {Function} okHandler 绘制完成回调方法
     * @param {Function} cancelHandler 绘制取消回调方法
     * 
     * @example
     * drawHandler.drawPolygonPrimitive({
     *     name: '测试多边形',
     *     drawType: BOSGeo.DrawType.POLYGON,
     *     extrudedHeight: 100,
     *     labelOffset: new BOSGeo.Cartesian2(-25, -65)
     * }, (res) => {
     *     drawHandler.downloadDrawPrimitive(res.id.id);
     * });
     */
    drawPolygonPrimitive(options, okHandler, cancelHandler) {
        this.clear();
        options = Object.assign({
            fillColor: '#FF0000',
            drawType: DrawType.POLYGON,
            name: '多边形',
            isGround: false,
            depthTestEnabled: false,
            id: createGuid(),
            // extrudedHeight: 20, 
            tipBeforeDrawing: '左键单击开始绘制面',
            tipWhenDrawing: '左键至少选择三个点，右键取消绘制'
        }, options);
        this.primitiveDrawer.draw(options, okHandler, cancelHandler);
    }

    /**
     * 绘制折线图元
     * @param {Object} options 
     * @param {String} [options.lineColor='#FF0000'] 填充颜色CSS Color ，如#FF0000
     * @param {Number} [options.alpha] 填充颜色不透明度，0~1
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.POLYLINE] 多边形
     * @param {String} [options.name='折线'] 名称
     * @param {Boolean} [options.isGround=false] 是否贴地
     * @param {Boolean} [options.depthTestEnabled=false] 是否开启深度测试（开启则不采用深度测试失败材质）,非贴地图元才有效
     * @param {Number} [options.width=10] 线宽
     * @param {Number} [options.lineType=BOSGeo.CustomMaterialType.LINE_COLOR] 线材质类型
     * @param {Cartesian2} [options.labelOffset] 标注像素偏移, 以文本标注左上角为原点，从左到右递增，从上往下递增, 
     *   一般设置为new BOSGeo.Cartesian2(0, -height * scale); height 为图标原始像素高,水平偏移可根据标注长度定义
     * @param {String} [options.tipBeforeDrawing='左键单击开始绘制线'] 绘制前的提示
     * @param {String} [options.tipWhenDrawing='左键至少选择两个点，右键取消绘制'] 绘制中的提示
     * @param {Function} okHandler 绘制完成回调方法
     * @param {Function} cancelHandler 绘制取消回调方法
     * 
     * @example
     * var editorHandler = new BOSGeo.EditorHandler();
     * drawHandler.drawPolylinePrimitive({
     *   name: '测试折线',
     *   drawType: BOSGeo.DrawType.POLYLINE,
     *   lineType: BOSGeo.CustomMaterialType.LINE_FLOW
     * }, (res) => {
     *   editorHandler.setEditorObject(res);
     * });
     */
    drawPolylinePrimitive(options, okHandler, cancelHandler) {
        this.clear();
        options = Object.assign({
            lineColor: '#0000FF',
            drawType: DrawType.POLYLINE,
            name: '折线',
            isGround: false,
            depthTestEnabled: false,
            id: createGuid(),
            width: 10,
            lineType: CustomMaterialType.LINE_COLOR,
            tipBeforeDrawing: '左键单击开始绘制线',
            tipWhenDrawing: '左键至少选择两个点，右键取消绘制'
        }, options);
        this.primitiveDrawer.draw(options, okHandler, cancelHandler);
    }

    /**
     * 绘制抛物线图元
     * @param {Object} options 
     * @param {String} [options.lineColor='#FF0000'] 填充颜色CSS Color ，如#FF0000
     * @param {Number} [options.alpha] 填充颜色不透明度，0~1
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.POLYLINE] 折线
     * @param {String} [options.name='抛物线'] 名称
     * @param {Number} [options.width=10] 线宽
     * @param {Number} [options.lineType=BOSGeo.CustomMaterialType.LINE_FLOW] 线材质类型
     * @param {Number} [options.vertexHeight=50000] 抛物线方程中y的极大值或极小值，绝对值越大，抛物线陡峭
     * @param {Number} [options.samples=30] 抛物线包含起止点的采样点个数，最小值为2
     * @param {Cartesian2} [options.labelOffset] 标注像素偏移, 以文本标注左上角为原点，从左到右递增，从上往下递增, 
     *   一般设置为new BOSGeo.Cartesian2(0, -height * scale); height 为图标原始像素高,水平偏移可根据标注长度定义
     * @param {String} [options.tipBeforeDrawing='左键单击后拖动开始绘制抛物线'] 绘制前的提示
     * @param {String} [options.tipWhenDrawing='左键单击后结束绘制抛物线，右键取消绘制'] 绘制中的提示
     * @param {Function} okHandler 绘制完成回调方法
     * @param {Function} cancelHandler 绘制取消回调方法
     * 
     * @example
     * drawHandler.drawPorabolaPrimitive({
     *    name: '测试抛物线',
     * }, (res) => {
     *    console.log('drawPrimitive', res);
     *    drawHandler.flyToBoundingSphere(res.id.id);
     * });
     */
    drawPorabolaPrimitive(options, okHandler, cancelHandler) {
        this.clear();
        options = Object.assign({
            lineColor: '#0000FF',
            name: '抛物线',
            id: createGuid(),
            width: 10,
            lineType: CustomMaterialType.LINE_FLOW,
            vertexHeight: 50000,
            samples: 30,
            tipBeforeDrawing: '左键单击后拖动开始绘制抛物线',
            tipWhenDrawing: '左键单击后结束绘制抛物线，右键取消绘制'
        }, options);
        options.drawType = DrawType.PARABOLA; // 抛物线目前只有这个类型
        options.samples = Math.max(options.samples, 2);

        this.primitiveDrawer.draw(options, okHandler, cancelHandler);
    }

    /**
     * 绘制自定义标注点
     * @param {Object} options 
     * @param {String} options.url 标注资源地址
     * @param {Number} [options.scale=1.0] 尺寸大小
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.BILLBOARD] 图标
     * @param {String} [options.name='图标'] 名称
     * @param {String} [options.disableDepthTestDistance=Number.POSITIVE_INFINITY] 关闭深度测试的距离
     * @param {Cartesian2} [options.pixelOffset] 图标像素偏移, 以文本标注左上角为原点，从左到右递增，从上往下递增,  
     *  一般设置为new BOSGeo.Cartesian2(0, -height /2 * scale); height 为图标原始像素高 
     * @param {Cartesian2} [options.labelOffset] 标注像素偏移, 以文本标注左上角为原点，从左到右递增，从上往下递增,  
     *  一般设置为new BOSGeo.Cartesian2(0, -height * scale); height 为图标原始像素高,水平偏移可根据标注长度定义
     * @param {String} [options.tipBeforeDrawing='左键单击绘制图标，右键取消绘制'] 绘制前的提示
     * @param {Function} okHandler 绘制完成回调方法
     * @param {Function} cancelHandler 绘制取消回调方法
     * 
     * @example
     * drawHandler.drawCustomPoint({
     *   name: '测试标注',
     *   url: '../../resource/images/tools/mark-point.png',
     *   labelOffset: new BOSGeo.Cartesian2(-25, -65),
     *   pixelOffset: new BOSGeo.Cartesian2(0, -25)
     * }, (res) => {
     *   drawHandler.getDrawPrimitive(res.id.id);
     * });
     */
    drawCustomPoint(options, okHandler, cancelHandler) {
        this.clear();
        options = Object.assign({
            scale: 1.0,
            drawType: DrawType.BILLBOARD,
            name: '图标',
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            id: createGuid(),
            tipBeforeDrawing: '左键单击绘制图标，右键取消绘制'
        }, options);
        this.primitiveDrawer.draw(options, okHandler, cancelHandler);
    }

    /**
     * 获取指定id的绘制图元
     * @param {String} primitiveId 绘制的图层id
     * 
     * @return {Object}
     * 
     * @see drawCustomPoint
     */
    getDrawPrimitive(primitiveId) {
        const { drawLayer, billboards } = this.primitiveDrawer;
        return drawLayer._primitives.find((primitive) => primitive.id && (primitive.id.id === primitiveId))
            || billboards._billboards.find((billboard) => billboard.id && (billboard.id.id === primitiveId));
    }

    /**
     * 定位到绘制图元的矩形范围
     * @param {String} primitiveId 绘制的图层id
     * 
     * @see drawCustomRectangle
     */
    flyToDrawPrimitive(primitiveId) {
        const drawObject = this.getDrawPrimitive(primitiveId);
        const { range, position } = drawObject;
        if (drawObject && (range || position)) {
            let destination = range;
            if (!defined(destination)) {
                const { normalZ } = GeoUtil.getLocalAxisInfo(position);
                destination = Util.addVectorInScalar(position, normalZ, 100)
            }
            this.camera.setView({
                destination,
            });

        }
    }

    /**
     * 定位到绘制图元的包围球范围
     * @param {String} primitiveId 绘制的图层id
     * @param {Number} [scalar=1] 包围球半径的缩放尺寸
     * @param {HeadingPitchRange} [offset] 基于绘制对象包围球中心的偏移
     * 
     * @see drawPorabolaPrimitive
     */
    flyToBoundingSphere(primitiveId, scalar = 1, offset) {

        const drawPrimitive = this.getDrawPrimitive(primitiveId);

        const { id, position, range } = drawPrimitive;
        if (id.drawType && (range || position)) {
            let boundingSphere;
            switch (id.drawType) {
                case DrawType.BILLBOARD:
                    boundingSphere = new BoundingSphere(position, 100);
                    break;
                case DrawType.SPHERE: case DrawType.ELLIPSOID: // 球体、椭球体
                    const { center, radii } = drawPrimitive;
                    boundingSphere = new BoundingSphere(center, 1.2 * Math.max(radii.x, radii.y, radii.z));
                    break;
                default:
                    const { extrudedHeight, positions } = drawPrimitive;
                    boundingSphere = BoundingSphere.fromPoints([...positions]);
                    if (defined(extrudedHeight)) {
                        const halfHeight = extrudedHeight / 2;
                        if (boundingSphere.radius < halfHeight) {
                            boundingSphere.radius = halfHeight * 1.2;
                        }
                        const centerInDegrees = GeoUtil.cartesianToArray(boundingSphere.center);
                        boundingSphere.center = Cartesian3.fromDegrees(centerInDegrees[0], centerInDegrees[1], halfHeight);
                    }
                    break;
            }
            boundingSphere.radius *= Math.max(scalar, 0.01);


            this.camera.viewBoundingSphere(boundingSphere, offset); // 定位绘制区域的包围球

            this.camera.lookAtTransform(Matrix4.IDENTITY); // 解除相机视角的锁定
        }
    }

    /**
     * 设置绘制图元的显隐
     * @param {String} primitiveId 绘制的图层id
     * @param {Boolean} visible 图元是否显示
     * 
     * @see drawEllipse
     */
    setDrawPrimitiveVisible(primitiveId, visible) {
        const drawObject = this.getDrawPrimitive(primitiveId);
        if (drawObject) {

            setTimeout(() => {
                drawObject.label && (drawObject.label.show = visible);
                drawObject.primitive && (drawObject.primitive.show = visible);
                defined(drawObject.show) && (drawObject.show = visible);
                this.geomap.render();
            }, 10);

        }
    }

    /**
     * 删除指定id的绘制图元
     * @param {String} primitiveId 绘制的图层id
     * 
     * @example
     * drawHandler.removeDrawPrimitive(primitive.id.id)
     */
    removeDrawPrimitive(primitiveId) {
        const drawObject = this.getDrawPrimitive(primitiveId);
        if (drawObject) {
            const { drawLayer, billboards, labels } = this.primitiveDrawer;
            const primitives = drawObject instanceof Billboard ? billboards : drawLayer

            primitives.remove(drawObject);
            const label = labels._labels.find((label) => label.id && label.id.id && (label.id.id.id === primitiveId));
            labels.remove(label);
            this.geomap.render();
        }
    }

    /**
     * 移除所有绘制图元对象
     */
    removeAll() {
        const { drawLayer } = this.primitiveDrawer;
        drawLayer && drawLayer.removeAll();
        this.primitiveDrawer.setLabelCollections();
        this.geomap.render();
    }

    /**
     * 导出绘制图元
     * @param {String} primitiveId 绘制的图层id
     * 
     * @see drawPolygonPrimitive
     */
    downloadDrawPrimitive(primitiveId) {
        const drawObject = this.getDrawPrimitive(primitiveId);
        if (drawObject) {
            const { feature, featureName } = EditorHelper.getDrawFeature(drawObject);
            FileUtil.downloadObjectFile(feature, featureName + '.json');
        } else {
            console.warn(`导出失败，不存在id为'${primitiveId}'的绘制图元!`);
        }
    }

    /**
     * 更新绘制图元的样式
     * 
     * @param {String} primitiveId 
     * @param {Object} style 图元样式
     * @param {Object} labelStyle 标注样式
     * @param {String} labelStyle.name 标注名称
     * @param {Cartesian2} labelStyle.pixelOffset 标注偏移
     * 
     * @example
     *  drawHandler.updateDrawerStyle(res.id.id, {
     *      fillColor: '#FF0000',
     *      width: 100,
     *      extrudedHeight: 10000
     *   }, {
     *   name: '绘制对象'
     * });            
     */
    updateDrawerStyle(primitiveId, style = {}, labelStyle = {}) {
        const drawPrimitive = this.getDrawPrimitive(primitiveId);
        if (drawPrimitive && drawPrimitive.id) {
            const label = drawPrimitive.label;
            if (label instanceof Label) {
                const changedLabelStyle = Object.assign(label.styles.labelStyle, labelStyle);
                for (const key in changedLabelStyle) {
                    if (key === 'name') {
                        label.text = changedLabelStyle[key];
                    } else {
                        defined(changedLabelStyle[key]) && (label[key] = changedLabelStyle[key]);
                    }
                }
                label.styles.labelStyle = Util.removeObjectProperties(changedLabelStyle, ['name']);
            }
            switch (drawPrimitive.id.drawType) {
                case DrawType.CIRCLE: case DrawType.ELLIPSE:  // 椭圆、基本圆
                case DrawType.SQUARE: case DrawType.RECTANGLE: // 正方形、矩形
                case DrawType.SPHERE: case DrawType.ELLIPSOID: // 球体、椭球体
                case DrawType.POLYGON: // 多边形
                    EditorHelper.updatePolygonStyle(drawPrimitive, style);
                    break;
                case DrawType.PARABOLA: case DrawType.POLYLINE: // 抛物线、折线
                    EditorHelper.updateLineStyle(drawPrimitive, style);
                    break;
                case DrawType.BILLBOARD: // 图标
                    EditorHelper.updateBillboardStyle(drawPrimitive, style);
                    break;
            }
        }
    }

    /**
     * 更新绘制图元的坐标 （用于还原编辑操作）
     * 
     * @param {String} primitiveId 图元id
     * @param {Cartesian3|Array.<Cartesian3>} positions 更新后的坐标
     * @param {Number} [extrudedHeight] 拉伸高度（创建时有该属性才能更新，否则后续不能新增该属性值）
     * 
     * @example
     * 
     *  // 非标注更新位置
     *  const initPoints = BOSGeo.Util.deepClone(drawPrimitive.positions);
     *  drawHandler.updateDrawerPositions(drawPrimitive.id.id, initPoints);
     * 
     *  // 标注更新位置
     *  const initPosition = billboard.position.clone();
     *  drawHandler.updateDrawerPositions(billboard.id.id, initPosition);
     */
    updateDrawerPositions(primitiveId, positions, extrudedHeight) {
        const drawPrimitive = this.getDrawPrimitive(primitiveId);
        let labelPosCart;
        let heightOffsetScale = 1.2; // 高度偏移（体需要放置叠盖在一起出现透明效果）
        if (drawPrimitive && drawPrimitive.id) {
            switch (drawPrimitive.id.drawType) {
                case DrawType.CIRCLE: case DrawType.ELLIPSE:  // 椭圆、基本圆
                case DrawType.SQUARE: case DrawType.RECTANGLE: // 正方形、矩形
                case DrawType.POLYGON: case DrawType.POLYLINE: // 多边形、折线
                case DrawType.PARABOLA: // 抛物线
                    drawPrimitive.setPosition(positions);
                    if (defined(drawPrimitive.extrudedHeight) && defined(extrudedHeight)) {
                        drawPrimitive.extrudedHeight = extrudedHeight;
                    }
                    labelPosCart = GeoUtil.cartesianToArray(drawPrimitive.center);
                    const heightOffset = drawPrimitive.id.drawType !== DrawType.PARABOLA ?
                        (defined(drawPrimitive.extrudedHeight) ? drawPrimitive.extrudedHeight : 0) * heightOffsetScale
                        : labelPosCart[2] * (heightOffsetScale - 1);
                    drawPrimitive.label.position = Cartesian3.fromDegrees(
                        labelPosCart[0],
                        labelPosCart[1],
                        labelPosCart[2] + heightOffset
                    );
                    break;
                case DrawType.SPHERE: case DrawType.ELLIPSOID: // 球体、椭球体
                    if (positions.length > 1) {
                        drawPrimitive.center = positions[0];
                        drawPrimitive.radii = positions[1];
                        labelPosCart = GeoUtil.cartesianToArray(drawPrimitive.center);
                        drawPrimitive.label.position = Cartesian3.fromDegrees(labelPosCart[0], labelPosCart[1], labelPosCart[2] + drawPrimitive.radii.z * heightOffsetScale);
                    }
                    break;
                case DrawType.BILLBOARD: // 图标
                    if (positions instanceof Cartesian3) {
                        drawPrimitive.position = positions;
                        drawPrimitive.label.position = positions;
                    }
                    break;
            }
            this.geomap.render();
        }
    }

    /**
     * 清除
     * 
     * @example
     * drawHandler.clear();
     */
    clear() {
        this.pointDrawer.clear();
        this.polylineDrawer.clear();
        this.polygonDrawer.clear();
        this.arcLineDrawer.clear();
        this.circleDrawer.clear();
        this.primitiveDrawer.cancel();
    }
    /**
     * 根据ID移除绘制的对象
     * 
     * @private
     * 
     * @param {Number} objId 对象ID
     * 
     */
    clearEntityById(objId) {
        let that = this;
        let entityList = that.viewer.entities.values;
        if (entityList == null || entityList.length < 1) {
            return;
        }
        for (let i = 0; i < entityList.length; i++) {
            let entity = entityList[i];
            if (entity && entity.id == objId) {
                that.viewer.entities.remove(entity);
            }
        }
        this.geomap.render();
    }
    /**
     * 移除所有绘制的对象
     * 
     * @example
     * drawHandler.clearAllEntity();
     */
    clearAllEntity() {
        Object.keys(this.pointDrawer.shapeDic).map(v =>

            this.clearEntityById(v)
        );
        Object.keys(this.polygonDrawer.shapeDic).map(v =>
            this.clearEntityById(v)

        );
        Object.keys(this.polylineDrawer.shapeDic).map(v =>

            this.clearEntityById(v)

        );
        Object.keys(this.arcLineDrawer.shapeDic).map(v =>

            this.clearEntityById(v)

        );
        Object.keys(this.circleDrawer.shapeDic).map(v =>
            this.clearEntityById(v)
        );

        this.primitiveDrawer.drawLayer.removeAll();

        this.geomap.render()
    }

    /**
     * 取消绘制
     * 
     * @example
     * drawHandler.cancel();
     */
    cancel() {
        this.pointDrawer.cancel();
        this.polylineDrawer.cancel();
        this.circleDrawer.cancel();
        this.polygonDrawer.cancel();
        this.arcLineDrawer.cancel();
        this.primitiveDrawer.cancel();
    }

    /**
     * 销毁
     */
    destroy() {
        return destroyObject(this);
    }

}

export default DrawHandler;