import Layer from "./Layer";

import createGuid from 'cesium/Core/createGuid'
import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import destroyObject from 'cesium/Core/destroyObject'
import Color from 'cesium/Core/Color'
import Cartesian3 from 'cesium/Core/Cartesian3'
import Cartesian2 from 'cesium/Core/Cartesian2'
import Rectangle from 'cesium/Core/Rectangle'
import ColorGeometryInstanceAttribute from 'cesium/Core/ColorGeometryInstanceAttribute'
import GeometryInstance from 'cesium/Core/GeometryInstance'
import PolylineGeometry from 'cesium/Core/PolylineGeometry'
import PolygonGeometry from 'cesium/Core/PolygonGeometry'
import PolygonHierarchy from 'cesium/Core/PolygonHierarchy'
import RectangleGeometry from 'cesium/Core/RectangleGeometry'
import EllipseGeometry from 'cesium/Core/EllipseGeometry'
import BoxGeometry from 'cesium/Core/BoxGeometry'
import CorridorGeometry from 'cesium/Core/CorridorGeometry'
import PolylineVolumeGeometry from 'cesium/Core/PolylineVolumeGeometry'
import DistanceDisplayConditionGeometryInstanceAttribute from 'cesium/Core/DistanceDisplayConditionGeometryInstanceAttribute'
import CornerType from 'cesium/Core/CornerType'
import PolylineColorAppearance from 'cesium/Scene/PolylineColorAppearance'
import PerInstanceColorAppearance from 'cesium/Scene/PerInstanceColorAppearance'
import Primitive from 'cesium/Scene/Primitive'
import PrimitiveCollection from 'cesium/Scene/PrimitiveCollection'
import GroundPolylinePrimitive from 'cesium/Scene/GroundPolylinePrimitive'
import GroundPrimitive from 'cesium/Scene/GroundPrimitive'
import Material from 'cesium/Scene/Material'
import EllipsoidSurfaceAppearance from 'cesium/Scene/EllipsoidSurfaceAppearance'
import ClassificationType from 'cesium/Scene/ClassificationType'
import GroundPolylineGeometry from 'cesium/Core/GroundPolylineGeometry'
import when from 'cesium/ThirdParty/when'
import VertexFormat from 'cesium/Core/VertexFormat'
import LayerEventType from "../constant/LayerEventType";
import LayerType from "../constant/LayerType";
import DeveloperError from "cesium/Core/DeveloperError.js";

import FeatureType from "../constant/FeatureType";
import { GeoDepository } from "../core/GeoDepository";
import GeoUtil from "../utils/GeoUtil";
// import {BaseLayer} from "./BaseLayer";
import { isArray } from 'util';

class PrimitiveLayer extends Layer {
    /**
     * 图元数据图层。包括直线，多边形，矩形，圆形，管线(方形)，管道(圆形)
     * TODO 多边形没有边框属性。当透明度小于1时，多边形显示效果不完整
     * @alias PrimitiveLayer
     * @constructor
     *
     * @param {Object} options 包含以下参数的Object对象
     * @param {String} [options.name] 图层名称，不设置则为undefined
     * @param {Boolean} [options.show=true] 是否显示，默认为true。
     * @param {String} [options.img] 图片材质路径
     * @param {String} [options.customGroupId] 若使用自定义分组，该图层所在分组的名称
     * @param {String} [options.type] 图形类型，可选项包括'line', 'polygon', 'rect', 'ellipse', 'pipeline' 'tube'
     * @param {Array<number>|Array<Array<Number>>} options.position 图形位置，[longitude0，latitude0, height0, ...]或者[longitude0，latitude0, ...]，需注意
     *     当options.type为'rect'时，position只包含两个点的位置信息。
     *     当options.type为'ellipse'时，position只包含一个点的位置信息。
     *     当options.type为'line',''polygon''时，position可包含多个点的位置信息,options.clampToGround为true且options.type为'line',''polygon''时，position传入经纬度数组[longitude0,latitude0...]，options.clampToGround为false且options.type为'line',''polygon''时，position传入经纬度高程数组[longitude0,latitude0, height0,...]。
     * @param {String} [options.color='#fff'] 图形颜色
     * @param {Number} [options.opacity=1] 图形透明度
     * @param {Number} [options.width] options.type为'line'或'pipleline'时有效
     *     当options.type为'line'时，width表示直线宽度，默认为1
     *     当options.type为'pipleline时，width表示管线宽度，默认为10
     * @param {Number} [options.height=0] 图形高度。options.type为'line'时无效
     * @param {Number} [options.radius] 半径，options.type为'ellipse'或'tube'时有效
     *     当options.type为'ellipse'时，radius表示圆形半径。为必传参数
     *     当options.type为'tube'时，radius表示管道半径。为必传参数
     * @param {Function} [options.onClick] 点击标记后的回调函数
     * @param {Object} [options.attribute] 属性信息
     * @param {Number} [options.displayDistance=10000] 可选，最远可视距离，默认为10000.
     * @param {Boolean} [options.clampToGround = false]  是否贴地，默认为false,为true且options.type为'line',''polygon''时，position传入经纬度数组[longitude0,latitude0...]，为false且options.type为'line',''polygon''时，position传入经纬度高程数组[longitude0,latitude0, height0,...]
     * @param {String}  [options.waterColor = '#548B54'] 动态水面的颜色, #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), 或者是 hsla() 格式的CSS颜色值
     * @param {Boolean} [options.dynamic=false] 是否添加动态水面，默认为false。
     *
     *
     * @example
     var primitiveSZ = new BOSGeo.PrimitiveLayer({
        name: '图形',
        type: 'polygon',// 'line', 'polygon', 'rect', 'ellipse', 'pipeline' 'tube'
        // polygon时首位坐标要相同
        position: [121.46665, 31.17088, 0, 121.4663, 31.16701, 0, 121.46384, 0, 121.46665, 31.17088, 0],
        height: 0,
        displayDistance: 10000000,
        minDisplayDistance:10000,
        clampToGround :false, //options.clampToGround为true且options.type为'line',''polygon''时，position传入经纬度数组[longitude0,latitude0...]，options.clampToGround为false且options.type为'line',''polygon''时，position传入经纬度高程数组[longitude0,latitude0, height0,...]
        show: true,
        color:'#0000FF',

     });
     *
     */
    constructor(options) {
        super(options);
        options = options || {};

        if (!defined(options.type)) {
            throw new DeveloperError('图形类型(options.type)是必传参数');
        }
        if (!defined(options.type) && this.isNotSupportType(options.type)) {
            throw new DeveloperError('不支持的图形类型');
        }
        if (!defined(options.position) || options.position.length === 0) {
            throw new DeveloperError('图形位置(options.position)是必传参数');
        }
        if ((options.type === 'ellipse' || options.type === 'tube') && !defined(options.radius)) {
            throw new DeveloperError('图形类型为圆形或管道时，半径(options.radius)是必传参数');
        }

        this.primitiveType = options.type;
        this._position = options.position; //color,opacity,dynamic,waterColor,img,,clampToGround,width,height,attribute
        this._color = defaultValue(options.color,'#fff');
        this.waterColor = defaultValue(options.waterColor,'#548B54');
        this.attribute = options.attribute;
        this._opacity = defaultValue(options.opacity, 1);
        this.dynamic = defaultValue(options.dynamic, false);
        this._img = defaultValue(options.img, Color.WHITE);
        this.clampToGround = defaultValue(options.clampToGround, false);
        defined(options.width) && (this.width = options.width);
        defined(options.height) && (this.height = options.height);
        defined(options.radius) && (this.radius = options.radius);
        this.displayDistance = options.displayDistance || 10000
        this.onClick = options.onClick;
        this.type = 'primitiveLayer';
        this._show = defaultValue(options.show, true);

        this._collection = void 0;
        this._appearance = void 0;
        if (this.primitiveType === 'line' || this.primitiveType === 'lines') {
            // NOTE：直线只能用PolylineColorAppearance或PolylineMaterialAppearance，不能用PerInstanceColorAppearance

            // 使用此appearance可通过改变attributes的color属性来改变颜色
            this._appearance = new PolylineColorAppearance({
                translucent: !this.clampToGround
            });
            // 使用此appearance(自定义material的方式)必须通过修改appearance来改变颜色
            /*this._appearance = new PolylineMaterialAppearance({
                /!*material: Material.fromType('PolylineGlow', {
                    color: Color.fromCssColorString(this._color || '#fff'),
                    glowPower: 0.5,
                }),*!/
                material: Material.fromType('Color', {
                    color: Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity),
                })
            });*/
        } else {
            // 使用此appearance可通过改变attributes的color属性来改变颜色
            this._appearance = new PerInstanceColorAppearance({
                // 默认为false，受太阳光影响，以显示轮廓
                // NOTE: 当绘制OutlineGeometry时，设置为false会导致错误，Appearance/Geometry mismatch. The appearance requires vertex shader attribute input 'compressedAttributes', which was not computed as part of the Geometry
                // flat: true
            });
            // 使用此appearance(自定义material的方式)必须通过修改appearance来改变颜色
            /*this._appearance = new EllipsoidSurfaceAppearance({
                flat: true,  // 不受光照影响
                material: Material.fromType('Color', {
                    color: Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity),
                })
            });*/
        }
        let primitiveCollection = new PrimitiveCollection();
        GeoDepository.scene.primitives.add(primitiveCollection);

        this.init(primitiveCollection);
    }

    /**
     * 初始化，根据类型创建，添加到地球场景中。
     * @param {primitiveCollection} collection primitive图层集合
     * @private
     *
     */
    init(collection) {
        this._collection = collection;
        this.id = createGuid();
        return this._addGraphic();
    };

    /**
     * 根据类型创建
     * @returns {*}
     * @private
     */
    _addGraphic() {
        switch (this.primitiveType) {
            case 'line':
                return this._addLine();
            case 'polygon':
                return this._addPolygon();
            case 'rect':
                return this._addRect();
            case 'ellipse':
                return this._addEllipse();
            case 'pipeline':
                return this._addPipeline();
            case 'tube':
                return this._addTube();
            case 'box':
                return this._addBox();
        }
    };

    /**
     * 创建线
     * @private
     */
    _addLine() {
        let cesiumColor = Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity);
        let colorAttribute = ColorGeometryInstanceAttribute.fromColor(cesiumColor);
        let defered = when.defer();

        GeoDepository.scene.requestRender();
        let instances = [];
        let isLineArray = isArray((this._position[0]));
        for (let k = 0; k < this._position.length; k++) {
            let lineArray = isLineArray ? this._position[k] : this._position;

            instances.push(new GeometryInstance({
                geometry: this.clampToGround ? new GroundPolylineGeometry({
                    positions: Cartesian3.fromDegreesArray(lineArray),
                    width: defaultValue(this.width, 1),
                    vertexFormat: this._appearance.vertexFormat
                }) : new PolylineGeometry({
                    positions: Cartesian3.fromDegreesArrayHeights(lineArray),
                    width: defaultValue(this.width, 1),
                    vertexFormat: this._appearance.vertexFormat
                }),
                id: this.id,  // 方便通过此id获取attributes属性
                attributes: {
                    color: colorAttribute,
                    depthFailColor: colorAttribute,  // NOTE: 当使用下面的depthFailAppearance时，一定要添加此参数
                    distanceDisplayCondition: new DistanceDisplayConditionGeometryInstanceAttribute(0, this.displayDistance),
                    // show: new ShowGeometryInstanceAttribute(true)
                },
            }))
            if (!isLineArray) break;
        }
        let finalPrimitive = this.clampToGround ? new GroundPolylinePrimitive({
            geometryInstances: instances,
            appearance: this._appearance,
            depthFailAppearance: this._appearance,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            show: this._show,
            // classificationType: ClassificationType.TERRAIN
        }) : new Primitive({
            geometryInstances: instances,
            appearance: this._appearance,
            depthFailAppearance: this._appearance,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            show: this._show,
            // classificationType: ClassificationType.TERRAIN
        });
        this._collection.add(finalPrimitive).readyPromise.then(polyline => {
            polyline.id = this.id;
            polyline.features = FeatureType.LINE;
            polyline.attribute = this.attribute;
            this.feature = polyline;
            defered.resolve(this);
        });

        return defered.promise;
    };

    /**
     * 创建面
     * @private
     */
    _addPolygon() {
        let cesiumColor = Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity);
        let colorAttribute = ColorGeometryInstanceAttribute.fromColor(cesiumColor);
        let defered = when.defer();

        GeoDepository.scene.requestRender();
        let instances = [];
        let isPolygonArray = isArray((this._position[0]));
        let vertexFormat = this.dynamic ? EllipsoidSurfaceAppearance.VERTEX_FORMAT : this._appearance.vertexFormat;

        for (let k = 0; k < this._position.length; k++) {
            let PolygonArray = isPolygonArray ? this._position[k] : this._position;
            instances.push(new GeometryInstance({
                geometry: this.clampToGround ? new PolygonGeometry({
                    polygonHierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArray(PolygonArray)),
                    extrudedHeight: defaultValue(this.height, 0),
                    vertexFormat: vertexFormat,
                }) : new PolygonGeometry({
                    polygonHierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArrayHeights(PolygonArray)),
                    extrudedHeight: defaultValue(this.height, 0),
                    perPositionHeight: true,
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

        if (this.dynamic) {
            this._appearance = new EllipsoidSurfaceAppearance({
                material: new Material({
                    fabric: {
                        type: 'Water',
                        uniforms: {
                            baseWaterColor: Color.fromCssColorString(this.waterColor || '#548B54').withAlpha(this._opacity),
                            blendColor: Color.fromCssColorString(this.waterColor || '#548B54').withAlpha(this._opacity),
                            normalMap: this._img,
                            frequency: 500.0,
                            animationSpeed: 0.01,
                            amplitude: 30.0
                        }
                    }
                })
            });
        }

        this._collection.add(this.clampToGround ? new GroundPrimitive({
            geometryInstances: instances,
            appearance: this._appearance,
            // depthFailAppearance: this._appearance,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            show: this._show,
        }) : new Primitive({
            geometryInstances: instances,
            appearance: this._appearance,
            // depthFailAppearance: this._appearance,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            show: this._show,
        })).readyPromise.then(polygon => {
            polygon.id = this.id;
            polygon.features = FeatureType.POLYGON;
            polygon.attribute = this.attribute;
            this.feature = polygon;
            defered.resolve(this);
        });

        return defered.promise;
    };

    /**
     * 创建矩形
     * @private
     */
    _addRect() {
        let cesiumColor = Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity);
        let colorAttribute = ColorGeometryInstanceAttribute.fromColor(cesiumColor);
        let defered = when.defer();

        GeoDepository.scene.requestRender();
        let instances = [];
        let isRectArray = isArray((this._position[0]));
        for (let k = 0; k < this._position.length; k++) {
            let RectArray = isRectArray ? this._position[k] : this._position;
            let bbox = GeoUtil.getBBox(RectArray);
            instances.push(new GeometryInstance({
                geometry: new RectangleGeometry({
                    rectangle: Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3]),
                    extrudedHeight: defaultValue(this.height, 0),
                    vertexFormat: this._appearance.vertexFormat,
                }),
                id: this.id,  // 方便通过此id获取attributes属性
                attributes: {
                    color: colorAttribute,
                    depthFailColor: colorAttribute,  // NOTE: 当使用下面的depthFailAppearance时，一定要添加此参数
                    distanceDisplayCondition: new DistanceDisplayConditionGeometryInstanceAttribute(0, this.displayDistance),
                },
            }))
            if (!isRectArray) break;
        }
        this._collection.add(new Primitive({
            geometryInstances: instances,
            appearance: this._appearance,
            depthFailAppearance: this._appearance,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            show: this._show,
        })).readyPromise.then(rect => {
            rect.id = this.id;
            rect.features = FeatureType.RECT;
            rect.attribute = this.attribute;
            this.feature = rect;
            defered.resolve(this);
        });

        return defered.promise;
    };

    /**
     * 创建椭圆
     * @private
     */
    _addEllipse() {
        let radius = this.radius;
        let colorAttribute = ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity));
        let defered = when.defer();

        GeoDepository.scene.requestRender();
        let instances = [];
        let isEllipseArray = isArray((this._position[0]));
        for (let k = 0; k < this._position.length; k++) {
            let EllipseArray = isEllipseArray ? this._position[k] : this._position;
            instances.push(new GeometryInstance({
                geometry: new EllipseGeometry({
                    center: Cartesian3.fromDegrees(EllipseArray[0], EllipseArray[1], EllipseArray[2]),
                    semiMajorAxis: radius,
                    semiMinorAxis: radius,
                    extrudedHeight: defaultValue(this.height, 0),
                    vertexFormat: this._appearance.vertexFormat,
                })
            }))
            if (!isEllipseArray) break;
        }
        this._collection.add(new Primitive({
            geometryInstances: instances,
            id: this.id,  // 方便通过此id获取attributes属性
            attributes: {
                color: colorAttribute,
                depthFailColor: colorAttribute,  // NOTE: 当使用depthFailAppearance时，一定要添加此参数
                distanceDisplayCondition: new DistanceDisplayConditionGeometryInstanceAttribute(0, this.displayDistance),
            },
            appearance: this._appearance,
            depthFailAppearance: this._appearance,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            show: this._show,
        })).readyPromise.then(ellipse => {
            ellipse.id = this.id;
            ellipse.features = FeatureType.ELLIPSE;
            ellipse.attribute = this.attribute;
            this.feature = ellipse;
            defered.resolve(this);
        });

        return defered.promise;
    };

    /**
     * 创建管线（方形）
     * @private
     */
    _addPipeline() {
        let colorAttribute = ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity));
        let defered = when.defer();

        GeoDepository.scene.requestRender();
        let instances = [];
        let isPipelineArray = isArray((this._position[0]));
        for (let k = 0; k < this._position.length; k++) {
            let PipelineArray = isPipelineArray ? this._position[k] : this._position;
            instances.push(new GeometryInstance({
                geometry: new CorridorGeometry({
                    positions: Cartesian3.fromDegreesArrayHeights(PipelineArray),
                    width: defaultValue(this.width, 10),
                    extrudedHeight: defaultValue(this.height, 0),
                    cornerType: CornerType.BEVELED,
                    vertexFormat: this._appearance.vertexFormat,
                }),
                id: this.id,  // 方便通过此id获取attributes属性
                attributes: {
                    color: colorAttribute,
                    depthFailColor: colorAttribute,  // NOTE: 当使用depthFailAppearance时，一定要添加此参数
                    distanceDisplayCondition: new DistanceDisplayConditionGeometryInstanceAttribute(0, this.displayDistance),
                }
            }))
            if (!isPipelineArray) break;
        }
        this._collection.add(new Primitive({
            geometryInstances: instances,
            appearance: this._appearance,
            depthFailAppearance: this._appearance,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            show: this._show,
        })).readyPromise.then(pipeline => {
            pipeline.id = this.id;
            pipeline.features = FeatureType.PIPELINE;
            pipeline.attribute = this.attribute;
            this.feature = pipeline;
            defered.resolve(this);
        });

        return defered.promise;
    };

    /**
     * 创建管道(圆形)
     * @private
     */
    _addTube() {
        let colorAttribute = ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity));
        let defered = when.defer();

        GeoDepository.scene.requestRender();
        let instances = [];
        let isTubeArray = isArray((this._position[0]));
        for (let k = 0; k < this._position.length; k++) {
            let TubeArray = isTubeArray ? this._position[k] : this._position;
            instances.push(new GeometryInstance({
                geometry: new PolylineVolumeGeometry({
                    polylinePositions: Cartesian3.fromDegreesArrayHeights(TubeArray),
                    shapePositions: GeoUtil.computeCircle(this.radius),
                    vertexFormat: this._appearance.vertexFormat,
                }),
                id: this.id,  // 方便通过此id获取attributes属性
                attributes: {
                    color: colorAttribute,
                    depthFailColor: colorAttribute,  // NOTE: 当使用depthFailAppearance时，一定要添加此参数
                    distanceDisplayCondition: new DistanceDisplayConditionGeometryInstanceAttribute(0, this.displayDistance),
                }
            }))
            if (!isTubeArray) break;
        }
        this._collection.add(new Primitive({
            geometryInstances: instances,
            appearance: this._appearance,
            depthFailAppearance: this._appearance,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            show: this._show,
        })).readyPromise.then(tube => {
            tube.id = this.id;
            tube.features = FeatureType.TUBE;
            tube.attribute = this.attribute;
            this.feature = tube;
            defered.resolve(this);
        });

        return defered.promise;
    };

    /**
     * 创建盒子
     * @private
     */
    _addBox() {
        let colorAttribute = ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity));
        let defered = when.defer();

        GeoDepository.scene.requestRender();
        let instances = [];
        let isEllipseArray = isArray((this._position[0]));
        for (let k = 0; k < this._position.length; k++) {
            let EllipseArray = isEllipseArray ? this._position[k] : this._position;
            var box = new BoxGeometry({
                vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
                maximum: EllipseArray[1],
                minimum: EllipseArray[0]
            });
            let boxGeometry = BoxGeometry.createGeometry(box);
            instances.push(new GeometryInstance({
                geometry: boxGeometry
            }))
            if (!isEllipseArray) break;
        }
        this._collection.add(new Primitive({
            geometryInstances: instances,
            id: this.id,  // 方便通过此id获取attributes属性
            attributes: {
                color: colorAttribute,
                depthFailColor: colorAttribute,  // NOTE: 当使用depthFailAppearance时，一定要添加此参数
                distanceDisplayCondition: new DistanceDisplayConditionGeometryInstanceAttribute(0, this.displayDistance),
            },
            appearance: this._appearance,
            depthFailAppearance: this._appearance,
            releaseGeometryInstances: true,  // Primitve不保留对输入geometryInstances的引用以节省内存（即geometryInstances为undefined）
            show: this._show,
            asynchronous: false,
        })).readyPromise.then(box => {
            box.id = this.id;
            box.features = FeatureType.BOX;
            box.attribute = this.attribute;
            this.feature = box;
            defered.resolve(this);
        });

        return defered.promise;
    };

    /**
     * 图形的位置。
     * @property {Array<number>} position. [lng, lat, height]
     * @example
     primitiveSZ.setPosition = [121.46665, 31.17088, 0, 121.4663, 31.16701, 0, 121.46384, 31.1663, 0, 121.46351, 31.16834, 0];
     */
    get position(){
        return this._position;
    }
    set position(position) {
        // GeoDepository.scene.requestRender();
        this._collection.remove(this.feature);
        this._position = position;
        this._addGraphic();
    };

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
     * 缩放至本图层
     * @example
     primitiveSZ.zoomTo()
     */
    zoomTo() {
        if (!defined(this.feature)) return;
        // 方法一：
        /*let position = this._position;
        if (this.primitiveType === 'ellipse') {
            GeoUtil.flyToOffset(position[0], position[1]);
        } else {
            let bbox = GeoUtil.getBBox(position);
            GeoUtil.flyToBBox(bbox);
        }*/
        // 方法二：
        GeoDepository.camera.flyToBoundingSphere(this.feature._boundingSpheres[0], { duration: 2 });
    };

    /**
     * 设置图形的位置。先删除后添加，对性能影响较大
     * @param {Array<number>} position. [lng, lat, height]
     * @example
     primitiveSZ.setPosition([121.46665, 31.17088, 0, 121.4663, 31.16701, 0, 121.46384, 31.1663, 0, 121.46351, 31.16834, 0])
     */
    setPosition(position) {
        GeoDepository.scene.requestRender();
        this._collection.remove(this.feature);
        this._position = position;
        this._addGraphic();
    };

    /**
     * 修改图形的填充颜色
     * @param {String} color
     * @example
        primitiveSZ.setColor('#0000FF')
     */
    setColor(color) {
        GeoDepository.scene.requestRender();
        this._color = color;
        let appearance = this._appearance;
        let cesiumColor = Color.fromCssColorString(color).withAlpha(this._opacity);
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
     * 设置显隐
     * @param {Boolean} visible 为true时显示，false时隐藏
     @example
     primitiveSZ.setVisible(false)
     */
    setVisible(visible) {
        GeoDepository.scene.requestRender();
        this._show = visible;
        this.feature && (this.feature.show = visible);
    };

    /**
     * 移除
     * @private
     * @see {LayerCollection#remove}
     */
    removeFromCollection(collection) {
        if (!defined(this.feature)) return;
        GeoDepository.scene.requestRender();
        collection.remove(this.feature);
        this.destroy();
    };

    /**
     * 销毁对象
     * @private
     * @see {LayerCollection#removeAll}
     */
    destroy() {
        this.feature = void 0;
        return destroyObject(this);
    };

    /**
     * 判断类型是否支持
     * @param {String} type 类型
     * @return {Boolean} 是否支持
     * @private
     */
    isNotSupportType  (type) {
        return type !== 'line' ||
            type !== 'polygon' ||
            type !== 'rect' ||
            type !== 'ellipse' ||
            type !== 'pipeline' ||
            type !== 'tube' ||
            type !== 'box';
    };
}

/* /**
 * 显示距离。即相机与数据图层之间的距离小于此值时显示，否则隐藏
 * @type {Number}
 */
//PrimitiveLayer.DEFAULT_DISPLAY_DISTANCE = 10000; */

export default PrimitiveLayer;