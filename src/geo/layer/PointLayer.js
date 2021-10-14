import Layer from "./Layer";
import BillboardCollection from "cesium/Scene/BillboardCollection";
import LabelCollection from "cesium/Scene/LabelCollection";
import PointPrimitiveCollection from "cesium/Scene/PointPrimitiveCollection";
import Cartesian2 from 'cesium/Core/Cartesian2'
import Cartesian3 from "cesium/Core/Cartesian3";
import defined from "cesium/Core/defined";
import Color from "cesium/Core/Color";
import VerticalOrigin from "cesium/Scene/VerticalOrigin";
import HorizontalOrigin from "cesium/Scene/HorizontalOrigin";
import DistanceDisplayCondition from "cesium/Core/DistanceDisplayCondition";
import ImageMaterialProperty from 'cesium/DataSources/ImageMaterialProperty'
import DefaultData from "../constant/DefaultData";
import BoundingSphere from "cesium/Core/BoundingSphere.js";
import LayerEventType from "../constant/LayerEventType";
import FeatureType from "../constant/FeatureType";
import { GeoDepository } from "../core/GeoDepository"
import LayerType from "../constant/LayerType";
import GeoUtil from "../utils/GeoUtil";
import CustomDataSource from 'cesium/DataSources/CustomDataSource'
import CallbackProperty from 'cesium/DataSources/CallbackProperty'

import PolylineColorAppearance from "cesium/Scene/PolylineColorAppearance";
import GeometryInstance from "cesium/Core/GeometryInstance";
import GroundPolylineGeometry from "cesium/Core/GroundPolylineGeometry";
import PolylineGeometry from "cesium/Core/PolylineGeometry";
import ColorGeometryInstanceAttribute from "cesium/Core/ColorGeometryInstanceAttribute";
import PolylineMaterialAppearance from "cesium/Scene/PolylineMaterialAppearance";
import GroundPolylinePrimitive from "cesium/Scene/GroundPolylinePrimitive";
import Primitive from "cesium/Scene/Primitive";
import PrimitiveCollection from "cesium/Scene/PrimitiveCollection";
import Util from "../utils/Util";
import defaultValue from "cesium/Core/defaultValue";
import ArcType from 'cesium/Core/ArcType.js'
import NearFarScalar from "cesium/Core/NearFarScalar.js";
import destroyObject from 'cesium/Core/destroyObject';
import createGuid from "cesium/Core/createGuid";

class PointLayer extends Layer {
    /**
     * 点图层 (包含billboard，label)，可实现对点的添加、获取、移除、缩放至和显隐等操作
     * @alias PointLayer
     * @constructor
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} options.name 必填，图层名称；
     * @param {Boolean} [options.show=false] 是否显示；
     * @param {String} [options.customGroupId] 若使用自定义分组，该图层所在分组的名称。
     * @param {Boolean} [options.hasPedestalEffect] 是否使用底座特效
     * 
     * @example
		let pointLayer =  geoViewer.layerManager.createLayer(BOSGeo.LayerType.POINT,"点图层1",{customGroupId:'vector'});//实例化PointLayer对象
		point = pointLayer.add({
			position:[114.05452615454756, 22.521097151970203, -0.005831823201912181],
			label: {
				text: "测试",
				color: BOSGeo.Color.RED,
				verticalOrigin: BOSGeo.VerticalOrigin.BOTTOM,
				pixelOffset:[0,0],
				pixelOffsetScaleByDistance:[0, 1, 1.0e4, 0.0],
				scaleByDistance : [0, 1, 1.0e4, 0.0]
			},
		}); 
     */
    constructor(options) {
        super(options);
        //管理动态特效
        this.dataSource = new CustomDataSource('pedestalForPointLayer');
        this.viewer.dataSources.add(this.dataSource);
        
        this._billboards = new BillboardCollection();
        this.viewer.scene.primitives.add(this._billboards);

        this._labels = new LabelCollection();
        this.viewer.scene.primitives.add(this._labels);

        this._points = new PointPrimitiveCollection();
        this.viewer.scene.primitives.add(this._points);


        

        this.layerType = LayerType.POINT;

        this.points = [];
        this._billboards.show = this._labels.show = this._points.show  = this._show = options.show || false;
        this._color = null;
        this._opacity = 1;

        this.collection = new PrimitiveCollection();  // linePrimitive
        this.viewer.scene.primitives.add(this.collection);
        this._linePosition = new Map();

    }

    /**
     * 是否显示图层
     * @property {Boolean}
     * @default false
     */
    get show() {
        return this._show;
    }
    set show(value) {
        if (this._show == Boolean(value)) return;

        this._show = value;
        this._showLine(value);
        this._billboards.show = this._labels.show = this._points.show  =  value;
        
        this.points.forEach(p =>{
            p.billboard && (p.billboard.show = value);
            p.point && (p.point.show = value);
            p.label && (p.label.show = value);
            if(p._pedestal && p._pedestal.outer){
                p._pedestal.outer.show = value;
                p._pedestal.inner.show = value;
            };
        });
        this.fire(LayerEventType.CHANGE, { toggleShow: true });
        GeoDepository.scene.requestRender();
    }

    /**
     * 十六进制的颜色字符串
     * @property {String} 
     */
    get color() {
        return this._color;
    }
    set color(v) {
        const points = this.points;
        if (v) {
            let color;
            if (typeof (v) === 'string') {
                this._color = v;
                color = Color.fromCssColorString(v).withAlpha(this.opacity);
                points.forEach((p) => {
                    p.billboard && (p.billboard.color = color);
                    p.point && (p.point.color = color);
                    p.label && (p.label.fillColor = color);
                    // if(p._pedestal && p._pedestal.outer){
                    //     p._pedestal.outer.show = color;
                    //     p._pedestal.inner.show = color;
                    // };
                })
            } else if (v instanceof Color) {
                this.color = v.toCssColorString();
            }
        }else{
            points.forEach((p) => {
                p.billboard && (p.billboard.color = p.bilboardColor.color);
                p.point && (p.point.color = p.pointColor.color);
                p.label && (p.label.fillColor = p.labelColor.fillColor);
                // if(p._pedestal && p._pedestal.outer){
                //     p._pedestal.outer.show = value;
                //     p._pedestal.inner.show = value;
                // };
            })
              
        }
        GeoDepository.scene.requestRender();
    }

    /**
     * 不透明度
     * @property {Number}
     */
    get opacity() {
        return this._opacity;
    }
    set opacity(v) {
        if (isNaN(v) || (v < 0) || (v > 1)) {
            console.error('请传入大于等于0，小于等于1的数值！');
        } else {
            const points = this.points;
            points.forEach((p) => {
                p && (p.opacity =v);
            })
        }
    }

   
    /**
     * 通过geojson文件添加点
     * 
     * @param {Object} geojsonObj geojson文件对象
     */
    addFromGeoJson(geojsonObj) {

        let type = geojsonObj.type;
        let dealData;

        switch (type) {
            case 'Point':
                dealData = (data) => [{ position: data.coordinates, point: {} }];
                break;
            case 'MultiPoint':
                dealData = (data) => [{ position: data.coordinates, point: {} }];
                break;
            case 'Feature':
                dealData = (data) => {
                    if (data.geometry.type === "Point") {
                        return [{ position: data.geometry.coordinates, properties: data.properties, point: {} }];
                    }
                    return [];
                };
                break;
            case 'FeatureCollection':
                dealData = (data) => {
                    return data.features.filter((f) => (f.geometry.type === "Point")).map(f => {
                        return { position: f.geometry.coordinates, properties: f.properties, point: {} }
                    })
                }
                break;
            case 'GeometryCollection':
                dealData = (data) => {
                    return data.geometries.filter((g) => (g.type === "Point")).map(g => {
                        return { position: g.coordinates, point: {} }
                    })
                }
                break;
            default: throw Error('仅接受类型： Feature/ FeatureCollection/ Point/ MultiPoint')

        }

        dealData(geojsonObj).forEach(d => this.add(d))



    }

    /**
     * 添加点
     * 
     * @param {Object} options 包含以下可选参数的Object对象:
     * @param {Array<Number>|Array<Array<Number>>|Cartesian3|Array<Cartesian3>} [options.position] 坐标[x,y,z]；
     * @param {String} [options.id] 添加的点对象的id值, 默认为GUID值，选填。
     * @param {Object} [options.billboard] billboard对象；
     * @param {String} [options.billboard.id] billboard的id；
     * @param {Boolean} [options.billboard.show] billboard配置，是否显示；
     * @param {String} [options.billboard.color] billboard填充颜色，格式为十六进制颜色字符串；
     * @param {Array<Number>|Cartesian2} [options.billboard.pixelOffset] billboard配置，[x,y], 在x,y两个方向的偏移像素；
     * @param {NearFarScalar|Array<Number>} [options.billboard.pixelOffsetScaleByDistance] billboard配置，[near, nearValue, far, farValue],near-相机近距离，nearValue-近距离时的像素偏移比例，near-相机远距离，nearValue-远距离时的像素偏移比例，基于相机距离的像素偏移比例设置；
     * @param {HeightReference} [options.billboard.heightReference] billboard配置，高度参考；
     * @param {HorizontalOrigin } [options.billboard.horizontalOrigin] billboard配置，水平对齐方式；
     * @param {VerticalOrigin} [options.billboard.verticalOrigin] billboard配置，垂直对齐方式；
     * @param {Number} [options.billboard.scale] billboard配置，缩放比例；
     * @param {String} [options.billboard.image] billboard配置，贴图地址或base64编码；
     * @param {BoundingRectangle} [options.billboard.imageSubRegion] billboard配置，贴图裁剪区域；
     * @param {Array<Number>|Cartesian3} [options.billboard.alignedAxis] billboard配置，[x,y,z],基点位置；
     * @param {Number} [options.billboard.rotation] billboard配置，旋转参数值；
     * @param {Number} [options.billboard.width] billboard配置，宽度；
     * @param {Number} [options.billboard.height] billboard配置，高度；
     * @param {NearFarScalar|Array<Number>} [options.billboard.scaleByDistance] billboard配置，[near, nearValue, far, farValue],near-相机近距离，nearValue-近距离时的比例，near-相机远距离，nearValue-远距离时的比例，设置基于相机距离的缩放值；
     * @param {NearFarScalar} [options.billboard.translucencyByDistance] billboard配置，设置基于相机距离的透明值；
     * @param {Boolean} [options.billboard.sizeInMeters] billboard配置，是否应以米为单位；
     * @param {Array<Number>} [options.billboard.nearFar] billboard配置，[min, max],控制目标在什么相机位置下显示出来。默认值[0.0,Number.MAX_VALUE],所有地球范围可见；
     * @param {Number} [options.billboard.disableDepthTestDistance] billboard配置，指定从相机到禁用深度测试的距离；
     * @param {Object} [options.label] label对象；
     * @param {Boolean} [options.label.show] label配置，是否显示；
     * @param {Number} [options.label.scale] label配置，缩放比例；
     * @param {String} [options.label.font] label配置，字体；
     * @param {String} [options.label.fillColor] label字体填充颜色，格式为十六进制字符串；
     * @param {String} [options.label.outlineColor] label配置，十六进制边框颜色字符串；
     * @param {Number} [options.label.outlineWidth] label配置，边宽；
     * @param {Boolean} [options.label.showBackground] label配置，是否显示label背景；
     * @param {String} [options.label.backgroundColor] label配置，十六进制背景颜色字符串；
     * @param {Array<Number>|Cartesian2} [options.label.backgroundPadding] label配置，[x,y], padding设置；
     * @param {LabelStyle} [options.label.style] label配置，设置标记样式；
     * @param {Array<Number>|Cartesian2} [options.label.pixelOffset] label配置，[x,y],在x,y两个方向的偏移像素；
     * @param {NearFarScalar|Array<Number>} [options.label.pixelOffsetScaleByDistance] label配置，[near, nearValue, far, farValue]，near-相机近距离，nearValue-近距离时的像素偏移比例，near-相机远距离，nearValue-远距离时的像素偏移比例，基于相机距离的像素偏移比例设置；
     * @param {Array<Number>|Cartesian3} [options.label.eyeOffset] label配置，[x,y,z],相对用户观察位置偏移；
     * @param {HorizontalOrigin } [options.label.horizontalOrigin] label配置，水平对齐方式；
     * @param {VerticalOrigin} [options.label.verticalOrigin] label配置，垂直对齐方式；
     * @param {NearFarScalar|Array<Number>} [options.label.scaleByDistance] label配置，[near, nearValue, far, farValue],near-相机近距离，nearValue-近距离时的比例，near-相机远距离，nearValue-远距离时的比例，设置基于相机距离的缩放值；
     * @param {NearFarScalar} [options.label.translucencyByDistance] label配置，设置基于相机距离的透明值；
     * @param {Array<Number>} [options.label.nearFar] label配置，[min,max],控制目标在什么相机位置下显示出来，默认值[0.0,Number.MAX_VALUE],所有地球范围可见；
     * @param {HeightReference} [options.label.heightReference] label配置，高度参考；
     * @param {Object} [options.point] point对象；
     * @param {Boolean} [options.point.show] point配置，是否显示；
     * @param {Number} [options.point.pixelSize] point配置，点大小；
     * @param {HeightReference} [options.point.heightReference] point配置，高度参考；
     * @param {String} [options.point.color] point配置，点颜色；
     * @param {String} [options.point.outlineColor] point配置，点边框颜色；
     * @param {Number} [options.point.outlineWidth] point配置，点边框宽度；
     * @param {NearFarScalar|Array<Number>} [options.point.scaleByDistance] point配置，[near, nearValue, far, farValue],near-相机近距离，nearValue-近距离时的比例，near-相机远距离，nearValue-远距离时的比例，设置基于相机距离的缩放值；
     * @param {NearFarScalar} [options.point.translucencyByDistance] point配置，基于相机距离的不透明度设置；
     * @param {Array<Number>} [options.point.nearFar] point配置，[min,max],控制目标在什么相机位置下显示出来。默认值[0.0,Number.MAX_VALUE],所有地球范围可见；
     * @param {Number} [options.point.disableDepthTestDistance] point配置，指定从相机到禁用深度测试的距离；
     *      
	 * @return {Point} 一个包含billboard，label和point的对象 
     * 
     * @example
     * point = pointLayer.add({
     *   position:[110,23,30] ,
     *   label: {
     *      text: "测试",
     *      color: BOSGeo.Color.RED,
     *      verticalOrigin: BOSGeo.VerticalOrigin.BOTTOM,
     *      pixelOffset:[0,-100],
     *      pixelOffsetScaleByDistance:[0, 1, 1.0e4, 0.0],
     *      scaleByDistance : [0, 1, 1.0e4, 0.0]
     *   },
     * });  
     *   
     */
    add(options) {
        if (!options.position) {
            throw new Error('PointLayer.add: 需要传入坐标位置 position')
        }
        //如果是多个坐标点
        if ((options.position instanceof Array) && (options.position[0] instanceof Array)) {
            let POI_arr = [];
            options.position.forEach((p, i) => {
                let po = { ...options, position: p };
                const { billboard } = options;
                (billboard) && (po.billboard = { ...billboard, id: '' + billboard.id + i });

                POI_arr.push(this.add(po));
            });
            return POI_arr;
        } else {
            //加载单个点
            const position = options.position = GeoUtil.getVerifiedPosition(options.position, 'PointLayer.add: options.position');
            let poi_options = { layer: this, position, properties: options.properties };

            const horizontalOrigin = HorizontalOrigin.CENTER;
            const verticalOrigin = VerticalOrigin.CENTER;

            if (defined(options.billboard)) {
                if (!defined(options.billboard.id)) options.billboard.id = this.points.length;
                if (!defined(options.billboard.image)) options.billboard.image = DefaultData.IMG_DATA_LOCATE; 
                if (options.billboard.pixelOffset instanceof Array) options.billboard.pixelOffset = new Cartesian2(...options.billboard.pixelOffset);
                if (options.billboard.alignedAxis instanceof Array) options.billboard.alignedAxis = new Cartesian3(...options.billboard.alignedAxis);
                if (options.billboard.nearFar instanceof Array) options.billboard.distanceDisplayCondition = new DistanceDisplayCondition(...options.billboard.nearFar);
                if (options.billboard.scaleByDistance instanceof Array) options.billboard.scaleByDistance = new NearFarScalar(...options.billboard.scaleByDistance);
                if (options.billboard.pixelOffsetScaleByDistance instanceof Array)options.billboard.pixelOffsetScaleByDistance = new NearFarScalar(...options.billboard.pixelOffsetScaleByDistance);

                let color = options.billboard.color;
                (typeof (color) === 'string') && (options.billboard.color = Color.fromCssColorString(color));
        
                let b_opt = {
                    horizontalOrigin,
                    verticalOrigin,
                    position,
                    ...options.billboard
                };

                poi_options.billboard = this._billboards.add(b_opt);
                if (!this.show) poi_options.billboard.show = this.show;
                poi_options.bilboardColor = { color: JSON.parse(JSON.stringify(poi_options.billboard.color)) };

            }
            if (defined(options.label)) {
                let fillColor = options.label.fillColor;
                (typeof (fillColor) === 'string') && (options.label.fillColor = Color.fromCssColorString(fillColor));

                let outlineColor = options.label.outlineColor;
                (typeof (outlineColor) === 'string') && (options.label.outlineColor = Color.fromCssColorString(outlineColor));

                let backgroundColor = options.label.backgroundColor;
                (typeof (backgroundColor) === 'string') && (options.label.backgroundColor = Color.fromCssColorString(backgroundColor));
                if (options.label.pixelOffset instanceof Array) options.label.pixelOffset = new Cartesian2(...options.label.pixelOffset);
                if (options.label.backgroundPadding instanceof Array) options.label.backgroundPadding = new Cartesian2(...options.label.backgroundPadding);
                if (options.label.nearFar instanceof Array) options.label.distanceDisplayCondition = new DistanceDisplayCondition(...options.label.nearFar);
                if (options.label.eyeOffset instanceof Array) options.label.eyeOffset = new Cartesian3(...options.label.eyeOffset);
                if (options.label.scaleByDistance instanceof Array) options.label.scaleByDistance = new NearFarScalar(...options.label.scaleByDistance);
                if (options.label.pixelOffsetScaleByDistance instanceof Array)options.label.pixelOffsetScaleByDistance = new NearFarScalar(...options.label.pixelOffsetScaleByDistance);

                let l_opt = {
                    horizontalOrigin,
                    verticalOrigin,
                    position,
                    ...options.label
                };

                poi_options.label = this._labels.add(l_opt);
                if (!this.show) poi_options.label.show = this.show;

                poi_options.labelColor = { 
                    fillColor: JSON.parse(JSON.stringify(poi_options.label.fillColor)),
                    outlineColor: JSON.parse(JSON.stringify(poi_options.label.outlineColor)),
                    backgroundColor: JSON.parse(JSON.stringify(poi_options.label.backgroundColor))
                };
            }
            if (defined(options.point)) {

                options.point.pixelSize = options.point.pixelSize || 10;
                let color = options.point.color;
                (typeof (color) === 'string') && (options.point.color = Color.fromCssColorString(color));
                let outlineColor = options.point.outlineColor;
                (typeof (outlineColor) === 'string') && (options.point.outlineColor = Color.fromCssColorString(outlineColor));
                if (options.point.nearFar) options.point.distanceDisplayCondition = new DistanceDisplayCondition(...options.point.nearFar);
                if (defined(options.label) && options.label.scaleByDistance instanceof Array) options.label.scaleByDistance = new NearFarScalar(...options.label.scaleByDistance);

                let p_opt = { position, ...options.point };

                poi_options.point = this._points.add(p_opt);
                if (!this.show) poi_options.point.show = this.show;

                poi_options.pointColor = {
                    color: JSON.parse(JSON.stringify(poi_options.point.color)),
                    outlineColor: JSON.parse(JSON.stringify(poi_options.point.outlineColor))
                };
            }

            let poi = new Point(poi_options);
            poi.id = defined(options.id) ? options.id : createGuid();
            this.points.push(poi);
            GeoDepository.scene.requestRender();

            this.fire(LayerEventType.ADD, poi);
            this.fire(LayerEventType.CHANGE);
            return poi;

        }


    }

    /**
     * 根据点对象移除
     * 
     * @param {Point} point 点对象 
     */
    remove(point) {
        if (defined(point.label)) {
            this._labels.remove(point.label);
        }
        if (defined(point.billboard)) {
            this._billboards.remove(point.billboard);
        }
        if (defined(point.point)) {
            this._points.remove(point.point);
        }
        if (defined(point._pedestal)) {
            point._pedestal.outer.removeAll();
            point._pedestal.inner.removeAll();
        }
        this.points = this.points.filter(p => (p !== point))
        GeoDepository.scene.requestRender();
        point.destroy();
        this.fire(LayerEventType.REMOVE, point);
        this.fire(LayerEventType.CHANGE);
    }

    /**
     * 移除该图层所有数据
     */
    removeAll() {
        this._labels.removeAll();
        this._billboards.removeAll();
        this._points.removeAll();
        this.collection.removeAll();
        this.points.forEach(p => p.destroy());
        this.points = [];
        GeoDepository.scene.requestRender();
        this.fire(LayerEventType.REMOVE);
        this.fire(LayerEventType.CHANGE);
    }


    /** 控制本图层内所有引线的显隐
     * @private
     * @param {Boolean} show true为显示
     */
    _showLine(show) {
        this.collection._primitives.forEach( line => {
            line.show = show;
        })
    }

    /**
     * 缩放至本图层
     * @param {Function} callback 回调函数
     * @example
     * pointLayer.zoomToLayer();
     */
    zoomToLayer(callback) {
        if (!this.points.length) return;

        const camera = this.viewer.camera;
        const positions = this.points.map((p) => p.position);
        const bs = BoundingSphere.fromPoints(positions);
        camera.flyToBoundingSphere(bs,{complete:callback});
    }

    /**
    * 销毁本图层
    */
    destroy() {

        this.removeAll();
        this.viewer.scene.primitives.remove(this._billboards);
        this.viewer.scene.primitives.remove(this._labels);
        this.viewer.scene.primitives.remove(this._points);
        this.viewer.scene.primitives.remove(this.collection);
        this._destroyBaseLayer();
    }
    /**
     * 添加带引线的广告牌
     * @param {Object} options 包含以下属性的对象：
     * @param {Array<Number>} position 广告牌线底部，经纬度与高程坐标数组；
     * @param {Number} [height = 15] 广告牌距离线底部的高度；
     * @param {Object} [options.line] line对象；
     * @param {String} [options.line.color = "#1296DB"] 线的颜色;
     * @param {Number} [options.line.width = 6] 线宽度；
     * @param {Number} [options.line.opacity = 1] 线透明度；
     * @param {Object} [options.label] label对象；
     * @param {String} [options.label.text = 'BOSGeo'] 文字；
     * @param {Cartesian2} [options.label.pixelOffset = new Cartesian2(0, -48)] label偏移量
     * @param {NearFarScalar} [options.label.scaleByDistance = new NearFarScalar(1.5e2, 0.5, 1.0e6, 0.0)] label根据距离缩放
     * 
     * @param {Object} [options.billboard] billboard对象；
     * @param {Base64|String} [options.billboard.image] billboard图片；
     * @param {Cartesian2} [options.billboard.pixelOffset = new Cartesian2(0, -48)] billboard偏移量
     * @param {NearFarScalar} [options.billboard.scaleByDistance = new NearFarScalar(1.5e2, 0.5, 1.0e6, 0.0)] billboard根据距离缩放
     * 
     * @returns {Object} 包含line和billboard的对象
     * @example
           var geomap = new BOSGeo.GeoMap('bosgeoContainer');
           let layer =  geomap.layerManager.createLayer(BOSGeo.LayerType.POINT,"点图层");
           let bbdLine = layer.addBillboardLine({
               position: [114.5, 22.55, 0]
           });
     */
    addBillboardLine(options) {
        let {
            height = 15,
            position,
        } = options;
        options.line || (options.line = {});
        options.label || (options.label = {});
        options.billboard || (options.billboard = {});
        if (!defined(position)) {
            throw new Error('需要传入坐标位置 position');
        }
        // 设置label默认值
        if (!defined(options.label.text)) {
            options.label.text = "BOSGeo"
        }
        if (!defined(options.label.pixelOffset)) {
            options.label.pixelOffset = new Cartesian2(0, -48);
        }
        if (!defined(options.label.scaleByDistance)) {
            options.label.scaleByDistance = new NearFarScalar(1.5e2, 0.5, 1.0e6, 0.2);
        }
        if (!defined(options.label.disableDepthTestDistance)) {
            options.label.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        }
        // 设置billboard默认值
        if (!defined(options.billboard.image)) {
            options.billboard.image = 'data:image/png;base64,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';
        }
        if (!defined(options.billboard.pixelOffset)) {
            options.billboard.pixelOffset = new Cartesian2(0, -48);
        }
        if (!defined(options.billboard.scaleByDistance)) {
            options.billboard.scaleByDistance = new NearFarScalar(1.5e2, 1, 1.0e6, 0.4);
        }
        if (!defined(options.billboard.disableDepthTestDistance)) {
            options.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY;
        }

        // 计算线段终点坐标，即广告牌位置
        let endPosition = [];
        endPosition[0] = position[0];
        endPosition[1] = position[1];
        endPosition[2] = position[2] + height;
        options.line.positions = [position, endPosition];
        let line = this._addLine(options.line);


        let billboard = this.add({
            position: endPosition,
            label: options.label,
            billboard: options.billboard,
        });

        return {line, billboard}
    }
    /**
     * 删除带引线的广告牌
     * @param {Object} bbdLine 带引线的广告牌对象，包含line和billboard的对象：
     * @example
           var geomap = new BOSGeo.GeoMap('bosgeoContainer');
           let layer =  geomap.layerManager.createLayer(BOSGeo.LayerType.POINT,"点图层");
           let bbdLine = layer.addBillboardLine({
               position: [114.5, 22.55, 0]
           });
           layer.deleteBillboardLine(bbdLine);
     */
    deleteBillboardLine(bbdLine) {
        this.collection.remove(bbdLine.line);
        this._linePosition.delete(bbdLine.line);
        this.remove(bbdLine.billboard);
    }

    /**
     * 添加线
     * @private
     * @param {Object} options 包含以下属性的对象：
     * @param {Array<Array<Number>>} options.positions 经纬度与高程坐标数组；
     * @param {Boolean} [options.clampToGround=false] 是否贴地显示；
     * @param {Number} [options.width=6] 宽度；
     * @param {String} [options.color='#1296DB'] 颜色；
     * @param {Material} [options.material] 材质；
     * @param {Boolean} [options.translucent=false] 是否透明。
     * @param {Number} [options.opacity = 1] 线透明度
     * 
     * @returns {Primitive} 线
     */

    _addLine(options) {
        let {
            clampToGround,
            material,
            positions,
            width,
            depthFailMaterial,
            color,
            translucent,
            opacity = 1
        } = options;
        clampToGround = defaultValue(clampToGround, false);
        material = defaultValue(material || color, '#1296DB');
        positions = positions.map((p) => Cartesian3.fromDegrees(...p));
        width = defaultValue(width, 6);
        translucent = defaultValue(translucent, false);
        let geomInstances = []; //区分材质
        let appearance;


        if (typeof (material) === 'string') {
            appearance = new PolylineColorAppearance()
            const originInstance = new GeometryInstance({
                id: 'pointLine',
                geometry: clampToGround ? new GroundPolylineGeometry({
                    positions: positions,
                    width: width,
                    vertexFormat: PolylineColorAppearance.VERTEX_FORMAT
                }) : new PolylineGeometry({
                    positions: positions,
                    width: width,
                    vertexFormat: PolylineColorAppearance.VERTEX_FORMAT,
                    arcType: ArcType.NONE
                }),
                attributes: {
                    color: ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(material).withAlpha(opacity)),
                    depthFailColor: ColorGeometryInstanceAttribute.fromColor(defined(depthFailMaterial) ? depthFailMaterial : material)
                },
                appearance: new PolylineColorAppearance()
            })
            geomInstances.push(originInstance);


        } else {
            appearance = new PolylineMaterialAppearance({
                material: material,
                translucent: translucent
            });
            geomInstances.push(new GeometryInstance({
                id: this._linePosition.size,
                geometry: clampToGround ? new GroundPolylineGeometry({
                    positions: positions,
                    width: width,
                    vertexFormat: VertexFormat.ALL
                }) : new PolylineGeometry({
                    positions: positions,
                    width: width,
                    vertexFormat: VertexFormat.ALL
                }),
            }));
        }
        const primitiveClass = clampToGround ? GroundPolylinePrimitive : Primitive;
        let linePrimitive = new primitiveClass({
            geometryInstances: geomInstances,
            appearance,
            depthFailAppearance: defined(depthFailMaterial) ? new PolylineColorAppearance() : null,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            // classificationType: ClassificationType.TERRAIN
        });

        let prt = this.collection.add(linePrimitive);
        
        prt.uuid = defaultValue(prt.uuid, Util.generateUUID());
        GeoDepository.scene.requestRender();
        this._linePosition.set(prt, positions);

        return prt;
    }
}

/**点图层中的点，该类型无法独立创建，只能通过点图层生成；
 * @class
 * @example
 *  //创建点图层：pointLayer
 *  //添加点
 *  point = pointLayer.add( {
        position: [112,24,10],
        label:{text:'点'}
    });

*/
class Point {
    constructor(options = {}) {
        const { 
            position, 
            layer, 
            billboard, 
            bilboardColor, 
            label, 
            labelColor, 
            point, 
            pointColor, 
            properties } = options;
        
        if (billboard) {
            this.billboard = billboard;
            this.bilboardColor = bilboardColor;
            this.billboard.bosGroup = this;
        }
        if (label) {
            this.label = label;
            this.labelColor = labelColor;
            this.label.bosGroup = this;
        }
        if (point) {
            this.point = point;
            this.pointColor = pointColor;
            this.point.bosGroup = this;
        }
        this.position = position;
        this.properties = properties;
        this.layer = layer;
        this.featureType = FeatureType.POINT_POINT;
        this._pedestalEffect = { speed: 100, color: '#ffffff', radius: 5, baseHeight:0.5, opacity:0.5 };
        this.saveInitialInfo();
    }
    /**
         * 十六进制的颜色字符串
         * @property {String} 
         */
    get color() {
        return this._color;
    }
    set color(v) {
        let color;
        if(v && (this.color !== v)){
            if((typeof(v) !=='string') && !(v instanceof Color)) throw new Error('Point.color: 请输入正确的值！')
            color = (typeof(v)==='string') ? Color.fromCssColorString(v):v;
            this._color = color.toCssHexString();
            this.billboard && (this.billboard.color = color);
            this.point && (this.point.color = color);
            this.label && (this.label.fillColor = color);
        }else{
            this._color = undefined;
            this.billboard && (this.billboard.color = this.bilboardColor.color);
            this.point && (this.point.color = this.pointColor.color);
            this.label && (this.label.fillColor = this.labelColor.fillColor);
        }
    
        GeoDepository.scene.requestRender();
    }

    /**
     * 不透明度
     * @property {Number}
     */
    get opacity() {
        return this._opacity;
    }
    set opacity(v) {
        if (isNaN(v) || (v < 0) || (v > 1)) {
            console.error('请传入大于等于0，小于等于1的数值！');
    } else {
            this._opacity = v;
            this.billboard && (this.billboard.color = this.billboard.color.clone().withAlpha(v));
            this.point && (this.point.color = this.point.color.clone().withAlpha(v));
            this.label && (this.label.fillColor = this.label.fillColor.clone().withAlpha(v));
        }
    }

    /**
     * 经纬度位置
     * @property {Array<Number>}
     */
    get positionWGS84() {
        return GeoUtil.cartesianToArray(this.position);
    }

    /**
     * 偏移点位置
     * @param {Array<Number>} offset 元素在xyz方向的偏移.
     * @example
     *  //创建点图层：pointLayer
     * //添加点 ：point
     *
        point.modeifyPosition([10,20,10]);
     */
    modeifyPosition(offset) {
        const moveVec =  GeoUtil.getMoveVec(this.position, offset);//图像不带局部坐标轴，本产品中默认对该类创建eastNorthUp方向为局部坐标
        offset = [moveVec.x, moveVec.y, moveVec.z]; //此时的xyz是世界坐标系的xyz

        let origin = this._originFeatureInfo.position;
        this.position = new Cartesian3(origin.x + offset[0], origin.y + offset[1], origin.z + offset[2]);
        this.saveInitialInfo();
        if (this.point) {
            this.point.position = this.position;
        }
        if (this.label) {
            this.label.position = this.position;
        }
        if (this.billboard) {
            this.billboard.position = this.position;
        }
        
        
        //更新特效
        if(this._pedestal && this._pedestal.outer){
            this._pedestal.outer.position.setValue(this.position);
            this._pedestal.inner.position.setValue(this.position);
        }
        if(GeoDepository.geomap._axisForMoveFeature){
            const target = GeoDepository.geomap._axisForMoveFeature.target;
            if(this === target) GeoDepository.geomap._axisForMoveFeature.updateByTarget()
        }
        
    }
    
    /**
     * 缩放点（缩放广告牌，特效圈）
     * @param {Number} scale 缩放比.
     * @example
     * //创建点图层：pointLayer
     * //添加点 ：point
     *
        point.changeScale(10);  
     */
    changeScale(scale) {
        if (scale>0) {
            if(scale === this.scale)return;
            this.scale = scale;
            this.saveInitialInfo();
            //与缩放相关的属性均需调整
            const { 
                pointPixel, 
                pedestalRadius, 
                billboard_pixelOffset, 
                label_pixelOffset, 
                billboard_scaleByDistance, 
                label_scaleByDistance,
            } = this._originFeatureInfo;
            if (this.point) {
                this.point.pixelSize = pointPixel * scale;
            }
            if (this.billboard) {
                if(billboard_scaleByDistance){
                    const opt  = [...billboard_scaleByDistance];
                    opt[1] = scale;
                    this.billboard.scaleByDistance = new NearFarScalar(...opt);
                }else{
                    this.billboard.scale = scale;
                }
                billboard_pixelOffset && (this.billboard.pixelOffset = Cartesian2.multiplyByScalar(new Cartesian2(...billboard_pixelOffset),scale, new Cartesian2()));
            }
            if (this.label) {
                if(label_scaleByDistance){
                    const opt  = [...label_scaleByDistance];
                    opt[1] = scale;
                    this.label.scaleByDistance = new NearFarScalar(...opt);
                }else{
                    this.label.scale = scale;
                }
                label_pixelOffset && (this.label.pixelOffset = Cartesian2.multiplyByScalar(new Cartesian2(...label_pixelOffset),scale, new Cartesian2()));
            }
            this._pedestalEffect.radius = pedestalRadius * scale;
            //更新特效
            (this._pedestal && this._pedestal.outer) && this.addPedestal();
            
        }

    }
    /**
     * 更改文字
     * @param {Object} options 包含以下可选参数的Object对象：
     * @param {String} options.text 修改文字内容
     * @param {String} options.font 修改文字字体
     * @param {String} options.fontColor 修改文字颜色
     * @example
     *  //创建点图层：pointLayer
     * //添加点 ：point
     *
        point.changeLabel({fontColor:'#a31515',font:'italic bold 200px arial,sans-serif'});
    */
    changeLabel(options) {
        if (this.label) {
            const { font, fontColor, text} = options;
            if (font) {
                this.label.font = font;
            }
            if (fontColor) {
                this.label.fillColor = Color.fromCssColorString(fontColor);
                this.labelColor = this.label.fillColor;
            }
            if (text) {
                this.label.text = text;
            }
        }
    }
    /**
     * 更改广告牌
     * @param {Object} options 包含以下可选参数的Object对象：
     * @param {String} options.imageColor 修改图片
     * @param {String|Image} options.image 修改图片颜色
     * @example
     *  //创建点图层：pointLayer
     *  //添加点 ：point
     *
        point.changeBillBoard({imageColor:'#a31515',image:'xxx.jpg'});
    */
    changeBillBoard(options) {
        if (this.billboard) {
            const { image, imageColor } = options;
            if (image) {
                this.billboard.image = image;
            }
            if (imageColor) {
                this.billboard.color = Color.fromCssColorString(imageColor);
                this.bilboardColor = this.billboard.color;
            }
        }
    }
    /**
     * 更改基础点
     * @param {Object} options 包含以下可选参数的Object对象：
     * @param {String} options.color 修改颜色
     * @example
     *  //创建点图层：pointLayer
     *  //添加点 ：point
     * 
        point.changePoint({color:'#a31515'});
    */
    changePoint(options) {
        if (this.point) {
            const { color, pixelSize } = options;
            if (color) {
                this.point.color = Color.fromCssColorString(color);
                this.pointColor = this.point.color;
                
            }
            if(pixelSize){
                this.point.pixelSize = pixelSize;
            }
        }
    }
    /**
     * 记录点的初始信息
     * @ignore
     */
    saveInitialInfo() {
        //第一次被调整，记录原始数据
        if (!this._originFeatureInfo) {
            const o = { position: Cartesian3.clone(this.position)};
            if (this.point){
                o.pointPixel = typeof (this.point.pixelSize) === 'number' ? this.point.pixelSize :this.point.pixelSize.getValue();
            }
            if (this.billboard){
                o.billboard_pixelOffset = [this.billboard.pixelOffset.x, this.billboard.pixelOffset.y];
                o.billboard_scaleByDistance = this.billboard.scaleByDistance;
                if(o.billboard_scaleByDistance) o.billboard_scaleByDistance = [o.billboard_scaleByDistance.near, o.billboard_scaleByDistance.nearValue, o.billboard_scaleByDistance.far, o.billboard_scaleByDistance.farValue];
            }
            if (this.label){
                o.label_scaleByDistance = this.label.scaleByDistance;
                if(o.label_scaleByDistance) o.label_scaleByDistance = [o.label_scaleByDistance.near, o.label_scaleByDistance.nearValue, o.label_scaleByDistance.far, o.label_scaleByDistance.farValue];
                o.label_pixelOffset = [this.label.pixelOffset.x, this.label.pixelOffset.y];
            }
            o.pedestalRadius = this._pedestalEffect.radius;
            this._originFeatureInfo = o;
        }
    }

    /** 更新底座特效
    * @param {Object} options 更新选项
     * @param {Number} [options.speed] pedestal配置，动画速度，选填，默认100；
     * @param {String} [options.color] pedestal配置，颜色，选填，默认'#F0FFFF'；
     * @param {Number} [options.radius] pedestal配置，特效半径，选填，默认100；
    */
    addPedestal(options = {}) {
        this.deletePedestal();
        //创建
        this._pedestalEffect = { ...this._pedestalEffect, ...options}; 
        if (!this.pedestalInitColor) this.pedestalInitColor =  this._pedestalEffect;

        const { speed, color, opacity, radius, baseHeight } = this._pedestalEffect;


        this._pedestal = {};
        //创建特效：Entity 
        const outRadius = new CallbackProperty((time) => {
            const min = 0.5;
            return (1 - Math.floor(time.secondsOfDay * speed * 100) % 10000/10000) * radius*(1-min) + (radius*min);
        }, false)
        const inRadius = new CallbackProperty((time) => {
            const min = 0.1;
            return (1 - (Math.floor(time.secondsOfDay * speed * 100 * 0.7) % 10000)/10000)* radius* 0.7*(1-min) + (radius* 0.7 *min);
        }, false)
        this._pedestal.outer = this.layer.dataSource.entities.add({
            position: this.position,
            ellipse: {
                height: baseHeight,
                semiMinorAxis: outRadius,
                semiMajorAxis: outRadius,
                material: new ImageMaterialProperty({
                    image : innerPedestal,
                    repeat: new Cartesian2(1,1),
                    color: Color.fromCssColorString(color).withAlpha(opacity)
                })
            }
        });
        this._pedestal.inner = this.layer.dataSource.entities.add({
            position: this.position,
            ellipse: {
                height: baseHeight,
                semiMinorAxis: inRadius,
                semiMajorAxis: inRadius,
                material: new ImageMaterialProperty({
                    image : innerPedestal,
                    repeat: new Cartesian2(1,1),
                    color: Color.fromCssColorString(color).withAlpha(opacity)
                }),
            }
        });

    }
    /**
     * 删除底座特效
     */
    deletePedestal(){
        if (this._pedestal) {
            const outer = this._pedestal.outer;
            const inner = this._pedestal.inner;
            this._pedestal = null;

            delete outer.bosGroup;
            delete inner.bosGroup;
            this.layer.dataSource.entities.remove(outer);
            this.layer.dataSource.entities.remove(inner);
            
        }
    }
    /**
     * 销毁对象
     */
    destroy(){
        destroyObject(this);
    }
  
}

//特效样式
const innerPedestal = `data:image/png;base64,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`;


export default PointLayer;
