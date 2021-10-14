

import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import destroyObject from 'cesium/Core/destroyObject'
import Color from 'cesium/Core/Color'
import Cartesian3 from 'cesium/Core/Cartesian3'
import buildModuleUrl from "cesium/Core/buildModuleUrl";
import ColorGeometryInstanceAttribute from 'cesium/Core/ColorGeometryInstanceAttribute'
import GeometryInstance from 'cesium/Core/GeometryInstance'
import PolygonGeometry from 'cesium/Core/PolygonGeometry'
import PolygonHierarchy from 'cesium/Core/PolygonHierarchy'
import DistanceDisplayConditionGeometryInstanceAttribute from 'cesium/Core/DistanceDisplayConditionGeometryInstanceAttribute'
import PolylineColorAppearance from 'cesium/Scene/PolylineColorAppearance'
import PerInstanceColorAppearance from 'cesium/Scene/PerInstanceColorAppearance'
import Primitive from 'cesium/Scene/Primitive'
import PrimitiveCollection from 'cesium/Scene/PrimitiveCollection'
import Material from 'cesium/Scene/Material'
import EllipsoidSurfaceAppearance from 'cesium/Scene/EllipsoidSurfaceAppearance'
import when from 'cesium/ThirdParty/when'
import GeoJsonDataSource from "cesium/DataSources/GeoJsonDataSource";
import {GeoDepository} from "../core/GeoDepository";
import FeatureType from "../constant/FeatureType";
import { isArray } from 'util';
import CesiumMath from "cesium/Core/Math";
import DeveloperError from "cesium/Core/DeveloperError.js";
import Util from "../utils/Util";


/**
 * 动态水面
 * @alias DynamicWater
 * @constructor
 * @param {Object} options
 * @param {String} [options.name] 可选，名称。默认为undefined
 * @param {String} [options.geojsonUrl] 可选，geojson的Url。不设置则为undefined。position、geojsonUrl或者wfsUrl)必传一个。
 * @param {String} [options.wfsUrl] 可选，wfs服务的Url。不设置则为undefined。position、geojsonUrl或者wfsUrl)必传一个。
 * @param {Array<number>} [options.position] 可选，图形位置。[longitude0，latitude0, height0, ...]。position、geojsonUrl或者wfsUrl)必传一个。
 * @param {String} [options.color='#1ba7ff'] 可选，动态水面的颜色,默认'#1ba7ff'。
 * @param {Number} [options.opacity=1] 可选，图形透明度，范围0-1，默认1。
 * @param {Object} [options.attribute] 可选，对象属性信息。
 * @param {Number} [options.height=1] 可选，图形高度，默认为1。
 * @param {Number} [options.extrudedHeight=1] 可选，图形拉伸高度，默认为1。
 * @param {String} [options.img] 可选，水面背景图片,默认为buildModuleUrl('./resource/images/effect/waterNormals.jpg' )。
 * @param {Number} [options.displayDistance=10000] 可选，最远可视距离，默认为10000.
 * @param {Boolean}  [options.clampToGround=false] 可选，设置是否地形贴地，默认为false，position设置时有效，默认为false。
 * @param {Boolean}  [options.show=true] 可选，显隐控制，默认为true，显示。
 * @param {Boolean} [options.isZoomTo=false] 可选，是否加载时缩放至，默认为false。
 * @example
 let dw = new BOSGeo.DynamicWater({
    name: '动态水面',
    // position: [121.46665, 31.17088, 0, 121.4663, 31.16701, 0, 121.46384, 31.1663, 0, 121.46351, 31.16834, 0, 121.46665, 31.17088, 0],
    geojsonUrl:'http://192.168.1.42:8086/geo/code/data/river.json',

    // height: 0,
    // displayDistance: 90000,
    // clampToGround: true,
    show: true,
    isZoomTo:true,
    extrudedHeight:10,
    color: '#49a8f9',
    });
 *
 */
class DynamicWater{
    constructor(options){
        options = options || {};
        if (!options.position && (!defined(options.geojsonUrl) || options.geojsonUrl === '')&&(!defined(options.wfsUrl) || options.wfsUrl === '')) {
            throw new DeveloperError('(options.position、options.geojsonUrl或者options.wfsUrl)必传一个');
        }

        this.name = options.name ||undefined;
        // geojson的地址
        this.geojsonUrl = options.geojsonUrl
        this.wfsUrl=options.wfsUrl
        this.primitiveType = options.type;
        this.position = options.position;
        this._color = options.color || '#1ba7ff';
        // this.waterColor = options.waterColor||'#1E90FF';
        this.attribute = options.attribute;
        this._opacity = defaultValue(options.opacity, 1);

        let img=buildModuleUrl('./resource/images/effect/waterNormals.jpg' )

        this._img = defaultValue(options.img,img);
        this.clampToGround = defaultValue(options.clampToGround, false);

        this.height = options.height||1
        this.extrudedHeight=options.extrudedHeight||1

        this.displayDistance = options.displayDistance || 10000
        this.onClick = options.onClick;
        this.type = 'primitiveLayer';
        this._show = defaultValue(options.show, true);
        this.isZoomTo = defaultValue(options.isZoomTo, false);

        // this._collection =options.collection ||new PrimitiveCollection();
        // GeoDepository.scene.primitives.add(this._collection);

        // 使用此appearance可通过改变attributes的color属性来改变颜色
        this._appearance = new PerInstanceColorAppearance({
            // 默认为false，受太阳光影响，以显示轮廓
            // NOTE: 当绘制OutlineGeometry时，设置为false会导致错误，Appearance/Geometry mismatch. The appearance requires vertex shader attribute input 'compressedAttributes', which was not computed as part of the Geometry
            // flat: true
        });

        this.initWater();
    }

    /**
     * 初始化
     * @private
     * @ignore
     */
    initWater () {
        // 初始化appearance
        // this.appearance = this.CreateAppearence(this.fragmentShader, this.normalMapUrl)
        if (this.position != null && this.geojsonUrl == null) {
            // 初始化geometry
            // this.geometry = this.createGeometry(this.degreesArrayHeights, this.extrudedHeight)
            // this.primitive = this.viewer.scene.primitives.add(new Cesium.Primitive({
            //     allowPicking: false,
            //     geometryInstances: new Cesium.GeometryInstance({
            //         geometry: this.geometry
            //     }),
            //     appearance: this.appearance,
            //     asynchronous: false
            // }))
            this._addPolygon();
        } else if (this.position == null && this.geojsonUrl != null) {
            this.getDegreesArrayHeightsByGeojson(this.geojsonUrl)
        }else if(this.position == null && this.geojsonUrl == null && this.wfsUrl != null){
            this.getDegreesArrayHeightsByGeojson(this.wfsUrl)
            // let that=this
            // $.ajax({
            //     url:this.wfsUrl,
            //     cache: false,
            //     async: true,
            //     success: function(data) {
            //         that.getDegreesArrayHeightsByGeojson(data);
            //     },
            //     error: function(data) {
            //         console.error(data);
            //     }
            // });
        }
        //如果设置为true，则会在场景更新时渲染，否则实时渲染每帧
        GeoDepository.viewer.scene.requestRenderMode=false;
        GeoDepository.geomap.requestRenderModeMethods.push('DynamicWater');//记录调用实时渲染的方法
    }

    /**
     * * 通过面的点集创建水面
     * @private
     * @ignore
     */
    _addPolygon() {
        let cesiumColor = Color.fromCssColorString(this._color || '#1ba7ff').withAlpha(this._opacity);
        let colorAttribute = ColorGeometryInstanceAttribute.fromColor(cesiumColor);
        let defered = when.defer();

        GeoDepository.scene.requestRender();
        let instances = [];
        let isPolygonArray = isArray((this.position[0]));
        let vertexFormat =  EllipsoidSurfaceAppearance.VERTEX_FORMAT ;
        for (let k =0; k < this.position.length; k++) {
            let PolygonArray = isPolygonArray ? this.position[k] : this.position;
            instances.push(new GeometryInstance({
                geometry: this.clampToGround ? new PolygonGeometry({
                    polygonHierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArray(PolygonArray)),
                    // extrudedHeight: defaultValue(this.height, 0),
                    vertexFormat: vertexFormat,
                }) :
                    new PolygonGeometry({
                    polygonHierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArrayHeights(PolygonArray)),
                    extrudedHeight: defaultValue(this.extrudedHeight, 0),
                    // perPositionHeight: true,
                        height:this.height||0,
                    vertexFormat: vertexFormat,
                }),
                id: this.id,  // 方便通过此id获取attributes属性
                attributes: {
                    color: colorAttribute,
                    depthFailColor: colorAttribute,  // NOTE: 当使用下面的depthFailAppearance时，一定要添加此参数
                    distanceDisplayCondition: new DistanceDisplayConditionGeometryInstanceAttribute(0, this.displayDistance),
                    // show: new ShowGeometryInstanceAttribute(true)
                },
            }))
            if (!isPolygonArray) break;
        }

        this._appearance = this.applyWaterMaterial()

        this.river = new Primitive({
            geometryInstances: instances,
            appearance: this._appearance,
            // depthFailAppearance: this._appearance,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            show: this._show,
        })
        // new Cesium.Primitive({
        //     geometryInstances: new Cesium.GeometryInstance({
        //         geometry: polygon1
        //     }),
        //     appearance: new Cesium.EllipsoidSurfaceAppearance({
        //         aboveGround: true
        //     }),
        //     show: true
        // });
        // this._collection.add(
        GeoDepository.scene.primitives.add(
            this.river
        ).readyPromise.then(polygon => {
            polygon.id = this.id;
            polygon.features = FeatureType.POLYGON;
            polygon.attribute =  this.attribute;
            polygon.name=this.name
            this.feature = polygon;
            if(this.isZoomTo) {
                GeoDepository.camera.flyToBoundingSphere(this.river._boundingSpheres[0], {duration: 2});
            }
            defered.resolve(this);
        });

        return defered.promise;
    };

    /**
     * 通过geojson创建水面
     * @param {String} geojsonUrl geojson的Url。
     * @private
     * @ignore
     */
    getDegreesArrayHeightsByGeojson (geojsonUrl) {
        var promise = GeoJsonDataSource.load(geojsonUrl)
        let polygonHierarchyArray = []
        let viewer = GeoDepository.viewer
        let defered = when.defer();
        promise.then((dataSource) => {
            let entities = dataSource.entities.values
            for (var i = 0; i < entities.length; i++) {
                let entity = entities[i]
                // if (!this.attributeData){
                //     if(entity&& entity._properties &&entity._properties._propertyNames){
                //         this.attributeData={}
                //         for(let i=0;i<entity._properties._propertyNames.length;i++){
                //             this.attributeData[entity._properties._propertyNames[i]]=entity._properties[entity._properties._propertyNames[i]]
                //         }
                //     }
                //
                // }
                let polygonHierarchy = entity.polygon.hierarchy.getValue().positions
                for (let j = 0; j < polygonHierarchy.length; j++) {
                    // 将笛卡尔三维坐标转为地图坐标（弧度）
                    let cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(polygonHierarchy[j])
                    // 将地图坐标（弧度）转为十进制的度数
                    let lat = parseFloat(CesiumMath.toDegrees(cartographic.latitude).toFixed(6))
                    let lng = parseFloat(CesiumMath.toDegrees(cartographic.longitude).toFixed(6))
                    let alt = parseFloat(0)
                    polygonHierarchyArray.push(lng)
                    polygonHierarchyArray.push(lat)
                    polygonHierarchyArray.push(alt)
                }
            }
            this.degreesArrayHeights = polygonHierarchyArray

            this.extrudedHeight=defaultValue(this.extrudedHeight, 0)
            this.geometry = this.createGeometry(this.degreesArrayHeights, this.extrudedHeight)

            this._appearance=this.applyWaterMaterial()
            this.river = new Primitive({
                // allowPicking: true,
                geometryInstances: new GeometryInstance({
                    geometry: this.geometry,
                    // id : 'water',
                }),
                // releaseGeometryInstances: false,
                appearance: this._appearance,
                asynchronous: false,
                show: this._show,
            })

            let primitive = GeoDepository.scene.primitives.add(
                this.river
            ).readyPromise.then(polygon => {
                polygon.id = this.id;
                polygon.features = FeatureType.POLYGON;
                // polygon.featureType=FeatureType.POLYGON;
                polygon.attribute =  this.attribute;
                polygon.name=this.name
                this.feature = polygon;
                if(this.isZoomTo) {
                    GeoDepository.camera.flyToBoundingSphere(this.river._boundingSpheres[0], {duration: 2});
                }
                defered.resolve(this);
            });
            // this.primitiveArray.push(primitive)
        }).otherwise(function (error) {
            console.error(error)
        })
    }

    /**
     * 生成图形
     * @param {Array} _degreesArrayHeights 图形几何点集合
     * @param {Number} _extrudedHeight  拉伸高度
     * @return {PolygonGeometry}  面图形
     * @private
     */
    createGeometry (_degreesArrayHeights, _extrudedHeight) {
        return new PolygonGeometry({
            polygonHierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArrayHeights(_degreesArrayHeights)),
            extrudedHeight: _extrudedHeight,
            // height:this.height||0,
            perPositionHeight: true,  //与height不能同时用
            vertexFormat:  EllipsoidSurfaceAppearance.VERTEX_FORMAT
        })
    }

    /**
     * 是否显示
     * @property {Boolean}
     */
    get show(){
        return this._show;
    }
    set show(v) {
        this._show = v;
        this.feature && (this.feature.show = v);
        GeoDepository.scene.requestRender();
    };
    /**
     * 修改实体的颜色，十六进制的颜色字符串
     *
     * @property {String} color
     * @example
     primitiveSZ.color='#0000FF';
     *
     */
    get color() {
        return this._color;
    }

    set color(v) {
        // if (this._color === color) return;
        if (v && (this._color !== v)) {
            if ((typeof(v) !== 'string') && !(v instanceof Color)) throw new Error('Point.color: 请输入正确的值！')
            let color = (typeof(v) === 'string') ? Color.fromCssColorString(v) : v;
            defined(this._opacity) && (color = color.withAlpha(this._opacity))
            this.setMaterial(color);
            this._color = color.toCssHexString();
        }
    };

    /**
     * 透明度,范围为0-1。
     * @property {Number}
     * @example
     primitiveSZ.opacity=0.5;
     */
    get opacity() {
        return this._opacity;
    }

    set opacity(v) {
        if (isNaN(v) || (v < 0) || (v > 1)) {
            console.error('请传入大于等于0，小于等于1的数值！');
        } else {
            let color = new Color.fromCssColorString(this._color).withAlpha(v);
            this.setMaterial(color)
            this._opacity = v;
        }
    }
    /**
     * 设置material材质颜色
     * @param {Color} cesiumColor 颜色
     * @private
     */
    setMaterial( cesiumColor) {
        let appearance = this._appearance;
        this.feature.appearance.material.uniforms.baseWaterColor= cesiumColor;
        if (appearance instanceof PolylineColorAppearance || appearance instanceof PerInstanceColorAppearance) {
            // 通过设置attributes.color来修改颜色
            let attributes = this.feature.getGeometryInstanceAttributes(this.id);
            if (defined(attributes)) {
                let colorAttribute = ColorGeometryInstanceAttribute.toValue(cesiumColor);
                attributes.color = colorAttribute;
                attributes.depthFailColor = colorAttribute;
            }
        } else {
            // 通过设置材质属性来修改颜色
            appearance.material.uniforms.color = cesiumColor;
        }
        GeoDepository.scene.requestRender();
    }

    /**
     * 缩放至图层
     * @example
      dw.zoomTo()
     */
    zoomTo() {

        if (!defined(this.feature)) return;
        // 方法一：
        /*let position = this.position;
        if (this.primitiveType === 'ellipse') {
            GeoUtil.flyToOffset(position[0], position[1]);
        } else {
            let bbox = GeoUtil.getBBox(position);
            GeoUtil.flyToBBox(bbox);
        }*/
        // 方法二：
        // GeoDepository.camera.flyToBoundingSphere(this.feature._boundingSpheres[0], {duration: 2});
        GeoDepository.camera.flyToBoundingSphere(this.river._boundingSpheres[0], {duration: 2});

    };


    /**
     * 修改图形的填充颜色(后续用color属性代替)
	 * @ignore
     * @param {String} color 颜色
     * @example
     dw.setColor('#3182f9')
     */
    setColor(color) {
        GeoDepository.scene.requestRender();
        this._color = color;
        // this._opacity=opacity || (opacity==0)?opacity:this._opacity

        let appearance = this._appearance;
        let cesiumColor = Color.fromCssColorString(color).withAlpha(this._opacity);
        this.feature.appearance.material.uniforms.baseWaterColor= cesiumColor;
        if (appearance instanceof PolylineColorAppearance || appearance instanceof PerInstanceColorAppearance) {
            // 通过设置attributes.color来修改颜色
            let attributes = this.feature.getGeometryInstanceAttributes(this.id);
            if (defined(attributes)) {
                let colorAttribute = ColorGeometryInstanceAttribute.toValue(cesiumColor);
                attributes.color = colorAttribute;
                attributes.depthFailColor = colorAttribute;
            }
        } else {
            // 通过设置材质属性来修改颜色
            appearance.material.uniforms.color = cesiumColor;
        }
    };

    /**
     * 设置透明度(后续用opacity属性代替)
	 * @ignore
     * @param {Number} opacity 不透明度 ，范围0-1。
     * @example
     dw.setOpacity(0.8)
     */
    setOpacity(opacity) {
        GeoDepository.scene.requestRender();
        let color=this._color ;
        this._opacity=opacity
        let appearance = this._appearance;
        let cesiumColor = Color.fromCssColorString(color).withAlpha(this._opacity);
        this.feature.appearance.material.uniforms.baseWaterColor= cesiumColor;
    };

    /**
     * 设置显隐(后续用show属性代替)
	 * @ignore
     * @param {Boolean} visible true为显示，false为隐藏
     * @example
     dw.setVisible(false)
     */
    setVisible(visible) {
        GeoDepository.scene.requestRender();
        this._show = visible;
        this.feature && (this.feature.show = visible);
    };


    /**
     * 移除
     *  @example
     dw.remove()
     */
    remove(){
        if (!defined(this.feature)) return;
        GeoDepository.scene.requestRender();
        GeoDepository.scene.primitives.remove(this.feature);
        this.destroy();
    }

    /**
     * 销毁对象
     * @private
     *
     */
    destroy() {
        Util.removeFromArray(GeoDepository.geomap.requestRenderModeMethods, 'DynamicWater');//移除调用实时渲染的方法
        GeoDepository.geomap._requestRenderModeCheck();
        this.feature = void 0;
        return destroyObject(this);
    };

    /**
     * 添加材质
     * @private
     * @ignore
     */
    applyWaterMaterial() {
        let _appearance = new EllipsoidSurfaceAppearance({
            material : new Material({
                fabric : {
                    type : 'Water',
                    uniforms : {
                        baseWaterColor: Color.fromCssColorString(this._color || '#1E90FF').withAlpha(this._opacity),
                        blendColor: Color.fromCssColorString(this._color || '#258b8b').withAlpha(this._opacity),
                        normalMap: this._img,
                        frequency: 100.0,
                        animationSpeed: 0.01,
                        amplitude: 10.0,
                        // specularIntensity:0.5,
                    }
                }
            }),
            aboveGround : true
        });
        return _appearance
    }

    /**
     * 多边形，可以具有空洞或者拉伸一定的高度
     * @private
     * @ignore
     */
    createPrimitives() {
        let rectangle = GeoDepository.scene.primitives.add(new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new PolygonGeometry({
                    polygonHierarchy : new PolygonHierarchy( Cartesian3.fromDegreesArrayHeights([-108.0, 25.0, 0,
                        -107.0, 25.0, 0,
                        -107.0, 26.0, 0,
                        -108.0, 26.0, 0])
                    ),
                    extrudedHeight:5,
                    height:0,
                    vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
                })
            }),
            appearance : new EllipsoidSurfaceAppearance({
                aboveGround : false
            })
        }));
    }
}

export default DynamicWater;