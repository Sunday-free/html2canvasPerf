import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import destroyObject from 'cesium/Core/destroyObject'
import Color from 'cesium/Core/Color'
import Cartesian2 from 'cesium/Core/Cartesian2'
import when from 'cesium/ThirdParty/when'
import GeoJsonDataSource from "cesium/DataSources/GeoJsonDataSource";
import HeightReference from "cesium/Scene/HeightReference.js";
import JulianDate from "../../../cesium/Source/Core/JulianDate";
import BoundingSphere from 'cesium/Core/BoundingSphere';
import Ellipsoid from 'cesium/Core/Ellipsoid';
import Cartographic from "cesium/Core/Cartographic";

import NearFarScalar from "cesium/Core/NearFarScalar.js";

import HorizontalOrigin from "cesium/Scene/HorizontalOrigin";
import VerticalOrigin from 'cesium/Scene/VerticalOrigin'
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler';
import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType';
import Event from 'cesium/Core/Event'
import DeveloperError from "cesium/Core/DeveloperError.js";
import CallbackProperty from "cesium/DataSources/CallbackProperty.js";

import {GeoDepository} from "../core/GeoDepository";
import FeatureType from "../constant/FeatureType";
import CesiumMath from "cesium/Core/Math";
import FeatureInfo from "../utils/FeatureInfo";

/**
 * 柱状统计图。基于entity图形数据图层，包括多边形。
 * @constructor
 * @param {Object} options
 * @param {String} [options.name] 名称。不设置则为undefined
 * @param {String} [options.geojsonUrl] geojson的Url。不设置则为undefined
 * @param {String} [options.wfsUrl] wfs服务的Url。不设置则为undefined
 * @param {String} options.staticField 统计的字段。必填
 * @param {Array<number>} options.position 图形位置。[longitude0，latitude0, height0, ...]
 * @param {String} [options.color='#1E90FF'] 图形颜色，默认为'#1E90FF'。
 * @param {Number} [options.opacity=1] 图形不透明度，默认为1。
 * @param {Number} [options.height=0] 图形地面高度，默认为0。
 * @param {Number} [options.extrudedHeight=10000] 图形拉伸高度，默认为10000。
 * @param {Number} [options.riseTime=5] 图形拉伸生长时间间隔，默认为5秒。
 * @param {Number} [options.fenceHeight=50] 图形拉伸生长时间间隔，默认为100。
 * @param {Number} [options.radius=1000] 椭圆半径，默认为1000。
 * @param {Function} [options.onClick] 点击标记后的回调函数
 * @param {Boolean} [options.show=true] 显隐控制，默认为true，显示。
 * @param {Boolean} [options.isZoomTo=false] 是否加载时缩放至，默认为false。

 * @example
 *  //生成柱状统计
 let colSta = new BOSGeo.ColumnarStatistics({
        name: '图形', //名称
        geojsonUrl:'./resource/data/422800.json', //geojson的Url。不设置则为undefined
        show: true, //显隐控制
        isZoomTo:true,//是否加载时缩放至
        staticField:'id',
        // extrudedHeight:10,  //图形拉伸高度
        color: '#49a8f9',   //图形颜色  
        opacity:1, //不透明度
        height: 100, //地面高度
        extrudedHeight:10000, //拉伸高度
        riseTime:5, //拉伸生长时间间隔
        radius: 1000, //半径
        onClick: true //是否点击查询
    });
 */
class ColumnarStatistics {

    constructor(options) {
        if ((!defined(options.geojsonUrl)) && (!defined(options.wfsUrl)) && !options.position) {
            throw new DeveloperError('(options.position、options.geojsonUrl或者options.wfsUrl)必传一个');
        }
        this.geojsonUrl = options.geojsonUrl
        this.wfsUrl = options.wfsUrl
        // this.type = options.type;
        this.position = options.position;
        this._color = options.color || '#1E90FF';
        this.staticField = options.staticField
        this.fields = null
        this.attribute = options.attribute;
        this._opacity = defaultValue(Number(options.opacity), 1);
        this.clampToGround = defaultValue(options.clampToGround, false);
        defined(options.width) && (this.width = options.width);
        // defined(options.height) && (this.height = options.height);
        this.height = options.height || 0
        this.extrudedHeight = options.extrudedHeight || 10000
        this.riseTime = options.riseTime || 5
        this.fenceHeight = options.fenceHeight || 500;
        this.radius = options.radius || 1000
        // defined(options.radius) && (this.radius = options.radius);
        this.displayDistance = options.displayDistance || 10000
        this.onClick = options.onClick || false;
        this._show = defaultValue(options.show, true);
        this.isZoomTo = defaultValue(options.isZoomTo, false);
        this.dataSource = null;
        this.init();
    }

    /**
     * 初始化
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.init();
     */
    init() {
        if (this.position != null && this.geojsonUrl == null) {

        } else if (this.position == null && this.geojsonUrl != null) {
            this.getDegreesArrayHeightsByGeojson(this.geojsonUrl)
        }
        else if (this.position == null && this.geojsonUrl == null && this.wfsUrl != null) {
            this.getDegreesArrayHeightsByGeojson(this.wfsUrl)
        }
    }

    /**
     * 通过geojson创建柱状图
     * @param {String} geojsonUrl url路径
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.getDegreesArrayHeightsByGeojson (geojsonUrl);
     */
    getDegreesArrayHeightsByGeojson(geojsonUrl) {
        let defered = when.defer();
        this.promise = GeoJsonDataSource.load(geojsonUrl)

        let viewer = GeoDepository.viewer;
        var ellipsoid = viewer.scene.globe.ellipsoid;
        this.onClick && this.onClickHover();
        this.promise.then((dataSource) => {
            viewer.dataSources.add(dataSource);
            let entities = dataSource.entities.values

            let staticFields = []
            for (let i = 0; i < entities.length; i++) {

                this.getFields(entities[0])

                let ientity = entities[i]
                let ientityVal = Number(ientity.properties[this.staticField])
                if (!isNaN(ientityVal)) {
                    staticFields.push(ientityVal)
                }
            }

            this.max = Math.max(...staticFields);
            this.min = Math.min(...staticFields);

            //动效
            for (let i = 0; i < entities.length; i++) {
                let entity = entities[i]
                let entityVal = Number(entity.properties[this.staticField])
                entity.billboard = undefined;
                if (defined(entity.point)) {
                    // entity.billboard = undefined;
                    entity.point.material = Color.fromCssColorString(this._color || '#1E90FF').withAlpha(0);

                    entity.point.show = false;

                } else if (defined(entity.polygon) || defined(entity.MultiPolygon)) {
                    let polyPostions = entity.polygon.hierarchy.getValue(JulianDate.now()).positions; //从多边形上取出他的顶点
                    let polyCenter = BoundingSphere.fromPoints(polyPostions).center;  //通过顶点构建一个包围球
                    polyCenter = Ellipsoid.WGS84.scaleToGeodeticSurface(polyCenter);   //把包围球得中心做贴地得偏移
                    entity.position = polyCenter;
                    entity.polygon.material = Color.fromCssColorString(this._color || '#1E90FF').withAlpha(0);
                    entity.polygon.height = 0;//底面距离地面高度
                    entity.polygon.extrudedHeight = 0;//顶面距离地面高度
                    entity.polygon.fill = false;

                }
                let iextrudedHeight = this.calBarHeight(entityVal)
                let dayMaximumHeights = [], minimumHeights = [], maximumHeights = [],
                    minimumHeight = 0, dayMaximumHeight = 0, maximumHeight = iextrudedHeight

                entity.ellipse = {
                    plotType: "GeoPlot",
                    semiMinorAxis: this.radius || 1000.0,
                    semiMajorAxis: this.radius || 1000.0,
                    // extrudedHeight: 1.0,
                    rotation: CesiumMath.toRadians(0),
                    material: Color.fromCssColorString(this._color || '#1E90FF').withAlpha(this._opacity),
                    heightReference: HeightReference.RELATIVE_TO_GROUND,
                    extrudedHeightReference: HeightReference.RELATIVE_TO_GROUND,
                    // extrudedHeight: this.calBarHeight(entityVal),
                    extrudedHeight: new CallbackProperty((time, result) => {
                        dayMaximumHeight += this.fenceHeight
                        if (dayMaximumHeight > maximumHeight) {
                            let txf = Math.floor(time.secondsOfDay);
                            dayMaximumHeight = maximumHeight
                            // debugger
                            if (txf % this.riseTime == 0) {
                                dayMaximumHeight = minimumHeight;
                            } else {
                                dayMaximumHeight = maximumHeight
                            }
                        }
                        if (isNaN(dayMaximumHeight)) {
                            dayMaximumHeight = 0
                        }
                        result = dayMaximumHeight
                        return result;
                    }, false),
                }

                entity.featureType = FeatureType.ENTITY;
                let entityPosition = entity.position._value
                let latlngP = Cartographic.fromCartesian(entityPosition, ellipsoid)

                latlngP.height = iextrudedHeight //this.calBarHeight(entityVal)
                // let labelPosition=Cartesian3.fromDegrees(latlngP.longitude,latlngP.latitude,latlngP.height, ellipsoid);

                entityPosition.z += latlngP.height * 2

                entity.label = {   //创建一个标签，在中心点位置
                    text: entity.name + "\n" + entityVal,
                    showBackground: false,
                    scale: 0.6,
                    horizontalOrigin: HorizontalOrigin.CENTER,
                    verticalOrigin: VerticalOrigin.BOTTOM,
                    // distanceDisplayCondition: new DistanceDisplayCondition(10.0,8000.0),
                    disableDepthTestDistance: 1000.0,
                    heightReference: HeightReference.RELATIVE_TO_GROUND,
                    position: entityPosition,
                    //远近-大小的关系设置
                    scaleByDistance: new NearFarScalar(1.0e3, 1, 1.5e6, 0.2),
                    pixelOffset: new Cartesian2(0, -10)
                }
            }
            if (this.isZoomTo) {
                viewer.zoomTo(this.promise);
            }

            this.dataSource = dataSource;
            this.dataSource.show = this._show
            defered.resolve(this);
        }).otherwise(function (error) {
            console.error(error)
        })

    }

    /**
     * 根据属性值计算柱状高度
     * @param {Number} val 属性值
     * @returns {Number} 高度
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.calBarHeight(val);
     */
    calBarHeight(val) {
        let barHeight = 0
        if (!isNaN(val)) {
            barHeight = (val - this.min) / (this.max - this.min) * this.extrudedHeight
        } else if (isNaN(val)) {
            barHeight = this.extrudedHeight
        }
        return barHeight
    }

    /**
     * 是否显示
     * @property {Boolean}
     */
    get show() {
        return this._show;
    }

    set show(v) {
        this._show = v;
        this.dataSource && (this.dataSource.show = v);
        GeoDepository.scene.requestRender();
    };

    /**
     * 修改实体的颜色，十六进制的颜色字符串
     *
     * @property {String} color
     * @example
     colSta.color='#0000FF';
     *
     */
    get color() {
        return this._color;
    }

    set color(v) {
        if (v && (this._color !== v)) {
            if ((typeof(v) !== 'string') && !(v instanceof Color)) throw new Error('Point.color: 请输入正确的值！')
            let color = (typeof(v) === 'string') ? Color.fromCssColorString(v) : v;
            defined(this._opacity) && (color = color.withAlpha(this._opacity))
            let entities = this.dataSource.entities.values
            for (var i = 0; i < entities.length; i++) {
                let entity = entities[i]
                entity.ellipse.material = color;
            }
            this._color = color.toCssHexString();
        }
    };

    /**
     * 透明度,范围为0-1。
     * @property {Number}
     * @example
     colSta.opacity=0.5;
     */
    get opacity() {
        return this._opacity;
    }

    set opacity(v) {
        if (isNaN(v) || (v < 0) || (v > 1)) {
            console.error('请传入大于等于0，小于等于1的数值！');
        } else {
            let color = new Color.fromCssColorString(this._color).withAlpha(v);
            let entities = this.dataSource.entities.values
            for (var i = 0; i < entities.length; i++) {
                let entity = entities[i]
                entity.ellipse.material = color;
            }
            this._opacity = v;
        }
    }

    /**
     * 获取entity的字段名
     * @param {Object} entity 实体对象
     * @returns {*} 字段名
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.getFields(entity);
     */
    getFields(entity) {
        let fields
        if (entity && entity._properties && entity._properties._propertyNames) {
            fields = entity._properties._propertyNames
        }
        this.fields = fields
        return fields
    }

    /**
     * 缩放至
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.zoomTo();
     */
    zoomTo() {
        if (!defined(this.dataSource)) return;
        // 方法二：
        GeoDepository.viewer.zoomTo((this.dataSource));
    };

    /**
     * 修改图形的填充颜色
     * @param {String} color 填充颜色
     * @param {Number} [opacity] 透明度，默认值为图形本身的值
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.setColor(color,opacity);
     */
    setColor(color, opacity) {
        GeoDepository.scene.requestRender();
        this._color = color;
        this._opacity = opacity ? opacity : this._opacity

        let cesiumColor = Color.fromCssColorString(color).withAlpha(this._opacity);
        let entities = this.dataSource.entities.values
        for (var i = 0; i < entities.length; i++) {
            let entity = entities[i]
            entity.ellipse.material = cesiumColor;
        }
    };

    /**
     * 设置透明度
     * @param {Number} opacity 透明度
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.setOpacity(opacity);
     */
    setOpacity(opacity) {
        GeoDepository.scene.requestRender();
        let color = this._color;
        this._opacity = opacity
        let cesiumColor = Color.fromCssColorString(color).withAlpha(this._opacity);
        let entities = this.dataSource.entities.values
        for (var i = 0; i < entities.length; i++) {
            let entity = entities[i]
            entity.ellipse.material = cesiumColor;
        }

    };

    /**
     * 设置显隐
     * @param {Boolean} visible 显隐
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.setVisible(visible);
     */
    setVisible(visible) {
        GeoDepository.scene.requestRender();
        this._show = visible;
        this.dataSource && (this.dataSource.show = visible);
    };

    /**
     * @private
     * @see {LayerCollection#remove}
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.removeFromCollection(collection);
     */
    removeFromCollection(collection) {
        if (!defined(this.dataSource)) return;
        GeoDepository.scene.requestRender();
        GeoDepository.viewer.dataSources.remove(this.dataSource);
        this.destroy();
    };

    /**
     * 移除
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  primitive.remove();
     */
    remove() {
        if (!defined(this.dataSource)) return;
        GeoDepository.viewer.dataSources.remove(this.dataSource);
        this.destroy();
        GeoDepository.scene.requestRender();
    }

    /**
     * 销毁对象
     * @private
     * @see {LayerCollection#removeAll}
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.destroy();
     */
    destroy() {
        this.dataSource = void 0;
        return destroyObject(this);
    };

    /**
     * 点击事件
     * @example
     *  let colSta = new BOSGeo.ColumnarStatistics(options);
     *  colSta.onClickHover();
     */
    onClickHover() {
        let handler = new ScreenSpaceEventHandler(GeoDepository.scene.canvas);
        let that = this
        var haveEns = {}, haveEncs = {}
        let cesiumColor = Color.fromCssColorString(this._color).withAlpha(this._opacity);
        let cesiumColor0 = Color.fromCssColorString(this._color || '#1E90FF').withAlpha(0);
        // handler.setInputAction(function(movement) {
        //     var haveEn = GeoDepository.viewer.scene.pick(movement.endPosition);
        //     if(GeoDepository.viewer.scene.pickPositionSupported && defined(haveEn) && haveEn.id !== ' '){
        //         if(haveEn.id && haveEn.id.ellipse !== undefined){
        //             var haveEnsNow = Color.YELLOW;//
        //             haveEn.id.ellipse._material._color.setValue(haveEnsNow);
        //             // haveEn.id.polygon.material = cesiumColor0
        //             haveEns['haveEn']=haveEn
        //         }
        //         // else{
        //         //     // haveEn.id.ellipse._material._color.setValue(Color.WHITE)
        //         // }
        //     }else if(haveEn == undefined){
        //         if(haveEns['haveEn'] && haveEns['haveEn'].id &&haveEns['haveEn'].id.ellipse&& haveEns['haveEn'].id.ellipse._material){
        //             haveEns['haveEn'].id.ellipse._material._color.setValue(cesiumColor)
        //         }
        //         // if(haveEns['haveEn'] && haveEns['haveEn'].id &&haveEns['haveEn'].id.polygon &&haveEns['haveEn'].id.polygon.material){
        //         //     haveEns['haveEn'].id.polygon.material = cesiumColor0;
        //         // }
        //
        //     }
        // }, ScreenSpaceEventType.MOUSE_MOVE);

        let _featureClick = new Event();
        // 模型信息查询对象
        let featureInfo = new FeatureInfo(_featureClick, {
            showAttribute: true
        });

        //点击事件
        handler.setInputAction(e => {
            let windowCoord = e.position;
            let attributes = featureInfo.onClick(windowCoord);
            featureInfo.onPostRender();
        }, ScreenSpaceEventType.LEFT_CLICK);
    }
}

export default ColumnarStatistics