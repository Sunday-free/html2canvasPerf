import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import destroyObject from 'cesium/Core/destroyObject'
import DeveloperError from 'cesium/Core/DeveloperError'
import Color from 'cesium/Core/Color'
import Cartesian3 from 'cesium/Core/Cartesian3'
import Cartesian2 from 'cesium/Core/Cartesian2'
import Rectangle from 'cesium/Core/Rectangle'
import CornerType from 'cesium/Core/CornerType'
import DistanceDisplayCondition from 'cesium/Core/DistanceDisplayCondition'
import EllipseDynamicMaterialProperty from 'cesium/DataSources/EllipseDynamicMaterialProperty'
import PolylineDynamicMaterialProperty from 'cesium/DataSources/PolylineDynamicMaterialProperty'
// import HorizontalOrigin from 'cesium/Scene/HorizontalOrigin'
// import VerticalOrigin from 'cesium/Scene/VerticalOrigin'
import PolylineGlowMaterialProperty from 'cesium/DataSources/PolylineGlowMaterialProperty'
import when from 'cesium/ThirdParty/when'
import ClassificationType from 'cesium/Scene/ClassificationType'
import CustomDataSource from 'cesium/DataSources/CustomDataSource'

import FeatureType from "../constant/FeatureType";
import {GeoDepository} from "../core/GeoDepository";
import GeoUtil from "../utils/GeoUtil";
// import {BaseLayer} from "./BaseLayer";
import Layer from "./Layer";

//* TODO 不能设置outline，不然图形显示不完整。设置extrudedHeight和透明度后图形也会显示不完整
class EntityLayer extends Layer {
    /**
     * Entity实体数据图层。包括直线，动态线，多边形，矩形，圆形，椭球体，盒子，管线(方形)，管道(圆形)，墙体
     * @alias EntityLayer
     * @constructor
     *
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} options.type 实体类型，'line','dynamicline', 'polygon', 'rect', 'ellipse','ellipsoid','box','dynamiceclipse', 'pipeline' 'tube','wall'；
     * @param {Array<Number>} options.position 图形位置，[longitude，latitude, height, ...]，当type为'dynamicline'时，其设置时将覆盖startPoint和endPoint的设置；
     *     当options.type为'rect'时，position只包含两个点的位置信息；
     *     当options.type为'ellipse'时，position只包含一个点的位置信息；
     * @param {Array<Number>} [options.startPoint] 当type为'dynamicline'时有效，图形起始位置，[longitude，latitude, height]
     * @param {Array<Number>} [options.endPoint] 当type为'dynamicline'时有效，图形终止位置，[longitude，latitude, height]
     * @param {String} [options.img] 图片材质路径；
     * @param {String} [options.color='#fff'] 图形颜色，默认为'#fff'；
     * @param {Number} [options.opacity=1] 图形透明度，默认为1；
     * @param {Number} [options.scale=1] 图形缩放倍数，默认为1；
     * @param {Number} [options.width] options.type为'line'或'pipleline'时有效；
     *     当options.type为'line'时，width表示直线宽度，默认为1；
     *     当options.type为'pipleline时，width表示管线宽度，默认为10；
     * @param {Number} [options.extrudedHeight=0] 图形拉伸高度。options.type为'line'时无效；
     * @param {Number} [options.radius] options.type为'ellipse'或'tube'时有效；
     *     当options.type为'ellipse'时，radius表示圆形半径。为必传参数；
     *     当options.type为'tube'时，radius表示管道半径。为必传参数；
     *      options.maximumCone 为显示半球的终点角度；
     * @param {Object} [options.attribute] 属性信息；
     * @param {Boolean} [options.perPositionHeight=false]  可选，type为'polygon'时，指定是否使用每个位置的高度，false时，默认为false；
     * @param {Number} [options.duration=1000]  可选，持续时间，毫秒，默认为1000。
     * @param {Number} [options.displayDistance=500000] 可选，最远可视距离，超过则隐藏,默认为500000；
     * @param {Number} [options.minDisplayDistance] 可选，最近可视距离；
     * @param {Boolean} [options.outline=false]  可选，是否添加图形轮廓线，默认为false；
     * @param {String} [options.outlineColor='#fff'] 可选，图形轮廓线颜色，默认为'#fff'；
     * @param {Number} [options.outlineWidth=1] 可选，图形轮廓线宽度，默认为1；
     * @param {Boolean} [options.lineShadow=false]  可选，图形轮廓线是否阴影，默认为false；
     * @param {Function} [options.onClick] 点击标记后的回调函数；
     * @param {String} [options.classificationType="BOTH"] 贴合类型，默认是"BOTH"。
     * @param {Boolean} [options.dynamic=false]   面是否为动态材质，默认为false。
     * @param {Number} [options.maximumCone=180] 可选，最大圆锥角，默认为180；
     * @param {Boolean} [options.show=true] 是否显示，默认为true。
     * @param {Number} [options.minimumHeights] 可选，指定要用于墙底而不是地球表面的高度数组，如[-100, -100, -100, -100]。
     * @param {Number} [options.maximumHeights] 可选，指定要用于墙顶的高度数组，而不是每个位置的高度。，如[0.01, 0.01, 0.01, 0.01]。
     * @param {Number} [options.num=20] 可选，num 返回点的数量
     * @param {Number} [options.zIndex] 可选，zIndex,指定用于排序地面几何图形的zIndex。
     * @param {Boolean} [options.formArray=true] 是否以经度纬度（[longitude，latitude,...]）读取position数组，默认为true,false为以经度纬度高程（[longitude，latitude, height, ...]）读取position数组。
     * @param {Number} [options.repeat=2] 可选，repeat ,重复次数,默认为2。
     *
     * @example
     * var entityLayer = new BOSGeo.EntityLayer({
     *   name: '实体',
     *   type: 'dynamicline',  //流动线
     *   color: '#FF7F50',
     *   duration: 3000,
     *   width: 10,
     *   repeat: 1,
     *   startPoint: [114.10196, 22.532219, 0],
     *   endPoint: [114.108421, 22.551548, 0],
     *   img: 'http://192.168.1.42:8086/geo/code/cesiumDemo/scene/arrow_1.png',
     * });
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
        if (options.type !== 'dynamicline' && (!defined(options.position) || options.position.length === 0)) {
            throw new DeveloperError('图形位置(options.position)是必传参数');
        }
        if ((options.type === 'ellipse' || options.type === 'tube') && !defined(options.radius)) {
            throw new DeveloperError('图形类型为圆形或管道时，半径(options.radius)是必传参数');
        }

        if ((options.type === 'dynamicline') && ((!options.startPoint || !options.endPoint) && !options.position)) {
            throw new DeveloperError('dynamicline startpoint and endpoint is required!');
        }

        // BaseLayer.call(this, options);

        this.entityType = options.type;
        this.position = options.position;
        this._color = options.color;
        this.scale = options.scale || 1;
        this.zIndex = options.zIndex
        this._img = options.img;
        this.formArray = defaultValue(options.formArray, true); // fromArray fromHeightArray
        this.perPositionHeight = defaultValue(options.perPositionHeight, false);
        this._show = defaultValue(options.show, true);
        this.attribute = options.attribute;

        switch (options.classificationType) {
            case '地形':
                this.classificationType = ClassificationType.TERRAIN;
                break
            case '模型':
                this.classificationType = ClassificationType.CESIUM_3D_TILE;
                break
            case 'BOTH':
            default:
                this.classificationType = ClassificationType.BOTH;
        }
        this.startPoint = options.startPoint;
        this.endPoint = options.endPoint;
        // this.maximumHeights = options.maximumHeights || [0.01, 0.01, 0.01, 0.01];
        // this.minimumHeights = options.minimumHeights || [-100, -100, -100, -100];
        this.maximumHeights = options.maximumHeights;
        this.minimumHeights = options.minimumHeights;
        this.num = options.num || 20;
        this.repeat = options.repeat || 2;
        this.extrudedHeight = defaultValue(options.extrudedHeight, 0);
        this._opacity = defaultValue(options.opacity, 1);
        this.radius = defaultValue(options.radius, 30);
        this.duration = defaultValue(options.duration, 1000);
        this.dynamic = defaultValue(options.dynamic, false);
        this.width = defaultValue(options.width, 1);
        this.outline = defaultValue(options.outline, false);
        this.maximumCone = defaultValue(options.maximumCone, 180.0);
        this.outlineColor = options.outlineColor || '#fff';
        this.outlineWidth = options.outlineWidth || 1;
        this.lineShadow = defaultValue(options.lineShadow, false);
        this.displayDistance = defaultValue(options.displayDistance, 500000);
        // defined(options.displayDistance) && (this.displayDistance = options.displayDistance);
        defined(options.minDisplayDistance) && (this.minDisplayDistance = options.minDisplayDistance);
        this.onClick = options.onClick;
        this.type = 'entityLayer';

        this.features = [] //数据集合
        // 管理实体的集合
        this.dataSource = new CustomDataSource('entity');

        GeoDepository.viewer.dataSources.add(this.dataSource);
        this.entityCollection = this.dataSource.entities;

        this.init(this.entityCollection);
    }

    /**
     * 创建并添加至集合
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     *
     */
    init(collection) {
        let defered = when.defer();
        let material = this._img ? this._img : Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity);

        switch (this.entityType) {
            case 'line':
                this._addLine(collection);
                break;
            case 'dynamicline':

                this._addDynamicLine(collection);
                break;
            case 'polygon':
                this._addPolygon(collection, material);
                break;
            case 'rect':
                this._addRetangle(collection, material);
                break;
            case 'box':
                this._addBox(collection, material);
                break;
            case 'ellipse':
                this._addEllipse(collection, material);
                break;
            case 'ellipsoid':
                this._addEllipsoid(collection, material);
                break;
            case 'dynamiceclipse':
                this._addDynamicEllipse(collection);
                break;
            case 'pipeline':
                this._addPipeline(collection);
                break;
            case 'tube':
                this._addTube(collection);
                break;
            case 'wall':
                this._addWall(collection);
                break;
        }

        defered.resolve(this);
        return defered.promise;
    };

    /**
     * 创建线
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     */
    _addLine(collection) {
        let cesiumColor = this.lineShadow ? new PolylineGlowMaterialProperty({
            color: Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity), // CYAN,
            glowPower: 0.5
        }) : Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity);


        let position = this.position;
        if (position && position.length < 2) return;
        let positions = position[0] instanceof Cartesian3 ? position : Cartesian3.fromDegreesArrayHeights(position);

        GeoDepository.scene.requestRender();
        let line = collection.add({
            polyline: {
                positions: positions,
                width: defaultValue(this.width, 1),
                material: cesiumColor,
                depthFailMaterial: cesiumColor,
                // clampToGround: true,
                distanceDisplayCondition: new DistanceDisplayCondition(this.minDisplayDistance || 0, this.displayDistance),
                classificationType: this.classificationType,
            }
        });
        if (this.zIndex) line.polyline.zIndex = this.zIndex;
        line.featureType = FeatureType.LINE;
        line.attribute = this.attribute;
        line.show = this._show;
        this.id = line.id;
        this.feature = line;
        this.features.push(line);
    };

    /**
     * 创建动态线
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     *
     */
    _addDynamicLine(collection) {
        if (!this.startPoint || !this.endPoint) return;
        let cesiumColor = Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity);
        let start = this.startPoint;
        let end = this.endPoint;
        let position = this.position;
        if (position && position.length < 2) return;
        let positions = position ? position[0] instanceof Cartesian3 ? position : Cartesian3.fromDegreesArrayHeights(position) : GeoUtil.getLinkedPointList(Cartesian3.fromDegrees(start[0], start[1], start[2]), Cartesian3.fromDegrees(end[0], end[1], end[2]), 3e4, this.num);
        GeoDepository.scene.requestRender();
        let element = {
            polyline: {
                positions: positions,
                width: this.width,
                material: new PolylineDynamicMaterialProperty({
                    color: cesiumColor,
                    duration: this.duration,
                    image: this._img,
                    repeat: new Cartesian2(this.repeat, 1)
                }),
                classificationType: this.classificationType,
            }
        }
        if (this.zIndex) element.polyline.zIndex = this.zIndex;
        let line = collection.add(element);
        line.featureType = FeatureType.LINE;
        line.attribute = this.attribute;
        line.show = this._show;
        this.id = line.id;
        this.feature = line;
        this.features.push(line);
    };

    /**
     * 创建墙
     *
     * @private
     * @param {EntityCollection} collection   Entity实例的集合。
     */
    _addWall(collection) {
        let cesiumColor = Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity);
        let material = this._img ? this._img : cesiumColor;
        GeoDepository.scene.requestRender();
        let wallPosition = this.position[0] instanceof Cartesian3 ? this.position : Cartesian3.fromDegreesArrayHeights(this.position);
        let element = {
            wall: {
                positions: wallPosition,
                maximumHeights: this.maximumHeights,
                minimumHeights: this.minimumHeights,
                material: material,
                distanceDisplayCondition: new DistanceDisplayCondition(this.minDisplayDistance || 0, this.displayDistance)
            }
        }
        if (this.zIndex) element.wall.zIndex = this.zIndex;
        let wall = collection.add(element);
        wall.featureType = FeatureType.WALL;
        wall.attribute = this.attribute;
        wall.show = this._show;
        this.id = wall.id;
        this.feature = wall;
        this.features.push(wall);
    }

    /**
     * 创建面
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     * @param material  材质
     */
    _addPolygon(collection, material) {
        let currentMaterial = this.dynamic ? new PolylineDynamicMaterialProperty({
            color: Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity),
            duration: this.duration,
            image: this._img,
            repeat: new Cartesian2(this.repeat, 1)
        }) : material;
        GeoDepository.scene.requestRender();
        let hierarchy = this.position[0] instanceof Cartesian3 ? this.position : this.formArray ? Cartesian3.fromDegreesArray(this.position) : Cartesian3.fromDegreesArrayHeights(this.position);
        let element = {
            polygon: {
                hierarchy: {
                    positions: hierarchy
                },
                material: currentMaterial,
                perPositionHeight: this.perPositionHeight,
                distanceDisplayCondition: new DistanceDisplayCondition(this.minDisplayDistance || 0, this.displayDistance),
                classificationType: this.classificationType,
            }
        };

        if (this.extrudedHeight) element.polygon.extrudedHeight = this.extrudedHeight;
        if (this.zIndex) element.polygon.zIndex = this.zIndex;
        if (this.outline) {
            element.polygon.outline = true;
            element.polygon.outlineColor = Color.fromCssColorString(this.outlineColor);
            element.polygon.outlineWidth = this.outlineWidth;
        }
        let polygon = collection.add(element);
        polygon.featureType = FeatureType.POLYGON;
        polygon.attribute = this.attribute;
        polygon.show = this._show;
        this.id = polygon.id;
        this.feature = polygon;
        this.features.push(polygon);
    };

    /**
     * 创建矩形
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     * @param material
     *
     */
    _addRetangle(collection, material) {
        let bbox = this.position;
        let element = {
            rectangle: {
                coordinates: Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3]),
                material: material,
                distanceDisplayCondition: new DistanceDisplayCondition(this.minDisplayDistance || 0, this.displayDistance),
                classificationType: this.classificationType,
            }
        }
        if (this.extrudedHeight) element.rectangle.extrudedHeight = this.extrudedHeight;
        if (this.zIndex) element.rectangle.zIndex = this.zIndex;
        let retangle = collection.add(element);
        retangle.featureType = FeatureType.RECT;
        retangle.attribute = this.attribute;
        retangle.show = this._show;
        this.id = retangle.id;
        this.feature = retangle;
        this.features.push(retangle);
    }

    /**
     * 创建盒子
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     * @param material
     *
     */
    _addBox(collection, material) {
        let boxPosition = this.position;
        let position = boxPosition instanceof Cartesian3 ? boxPosition : Cartesian3.fromDegrees(boxPosition[0], boxPosition[1], boxPosition[2]);

        GeoDepository.scene.requestRender();
        let element = {
            name: this.name,
            position: position,
            box: {
                dimensions: new Cartesian3(this.radius, this.radius, this.extrudedHeight),
                material: material,
                outlineColor: Color.fromCssColorString(this.outlineColor),
                outline: this.outline,
                outlineWidth: this.outlineWidth,
                distanceDisplayCondition: new DistanceDisplayCondition(this.minDisplayDistance || 0, this.displayDistance)
            }
        }
        if (this.zIndex) element.box.zIndex = this.zIndex;
        let box = collection.add(element);
        box.featureType = FeatureType.BOX;
        box.attribute = this.attribute;
        box.show = this._show;
        this.id = box.id;
        this.feature = box;
        this.features.push(box);
    };

    /**
     * 创建椭圆
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     * @param material
     *
     */
    _addEllipse(collection, material) {
        let position = this.position;
        let radius = this.radius;

        GeoDepository.scene.requestRender();
        let element = {
            position: Cartesian3.fromDegrees(position[0], position[1], position[2]),
            ellipse: {
                semiMajorAxis: radius,
                semiMinorAxis: radius,
                material: material,
                distanceDisplayCondition: new DistanceDisplayCondition(this.minDisplayDistance || 0, this.displayDistance),
                classificationType: this.classificationType,
            }
        };
        if (this.extrudedHeight) element.ellipse.extrudedHeight = this.extrudedHeight;
        if (this.zIndex) element.ellipse.zIndex = this.zIndex;
        let ellipse = collection.add(element);
        ellipse.featureType = FeatureType.ELLIPSE;
        ellipse.attribute = this.attribute;
        ellipse.show = this._show;
        this.id = ellipse.id;
        this.feature = ellipse;
        this.features.push(ellipse);
    };

    /**
     * 创建椭球体
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     * @param material
     *
     */
    _addEllipsoid(collection, material) {
        let position = this.position;
        let radius = this.radius;

        GeoDepository.scene.requestRender();

        let element = {
            position: Cartesian3.fromDegrees(position[0], position[1], position[2]),
            ellipsoid: {
                radii: new Cartesian3(radius, radius, radius),
                material: material,
                maximumCone: CesiumMath.toRadians(this.maximumCone)
            }
        };
        if (this.zIndex) element.ellipsoid.zIndex = this.zIndex;
        let ellipsoid = collection.add(element);
        ellipsoid.featureType = FeatureType.ELLIPSOID;
        ellipsoid.attribute = this.attribute;
        ellipsoid.show = this._show;
        this.id = ellipsoid.id;
        this.feature = ellipsoid;
        this.features.push(ellipsoid);
    };

    /**
     * 创建动态椭圆
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     *
     */
    _addDynamicEllipse(collection) {
        let position = this.position;
        let radius = this.radius;
        let cesiumColor = Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity);

        GeoDepository.scene.requestRender();
        let element = {
            position: Cartesian3.fromDegrees(position[0], position[1], position[2]),
            ellipse: {
                semiMajorAxis: radius,
                semiMinorAxis: radius,
                material: new EllipseDynamicMaterialProperty({
                    color: cesiumColor,
                    duration: this.duration
                })
            }
        }
        if (this.zIndex) element.ellipse.zIndex = this.zIndex;
        let ellipse = collection.add(element);
        ellipse.featureType = FeatureType.ELLIPSE;
        ellipse.attribute = this.attribute;
        ellipse.show = this._show;
        this.id = ellipse.id;
        this.feature = ellipse;
        this.features.push(ellipse);
    };

    /**
     * 创建管线
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     *
     */
    _addPipeline(collection) {
        let cesiumColor = Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity);

        GeoDepository.scene.requestRender();
        let element = {
            corridor: {
                positions: Cartesian3.fromDegreesArrayHeights(this.position),
                width: defaultValue(this.width, 10),
                extrudedHeight: this.extrudedHeight,
                cornerType: CornerType.BEVELED,
                material: cesiumColor,
                distanceDisplayCondition: new DistanceDisplayCondition(this.minDisplayDistance || 0, this.displayDistance)
            }
        }
        if (this.zIndex) element.corridor.zIndex = this.zIndex;
        let pipeline = collection.add(element);
        pipeline.featureType = FeatureType.PIPELINE;
        pipeline.attribute = this.attribute;
        pipeline.show = this._show;
        this.id = pipeline.id;
        this.feature = pipeline;
        this.features.push(pipeline);
    };

    /**
     * 创建管
     *
     * @private
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     *
     */
    _addTube(collection) {
        let cesiumColor = Color.fromCssColorString(this._color || '#fff').withAlpha(this._opacity);

        GeoDepository.scene.requestRender();
        let element = {
            polylineVolume: {
                positions: Cartesian3.fromDegreesArrayHeights(this.position),
                shape: GeoUtil.computeCircle(this.radius),
                material: cesiumColor,
                distanceDisplayCondition: new DistanceDisplayCondition(this.minDisplayDistance || 0, this.displayDistance),
            }
        }
        if (this.zIndex) element.polylineVolume.zIndex = this.zIndex;
        let tube = collection.add(element);
        tube.featureType = FeatureType.TUBE;
        tube.attribute = this.attribute;
        tube.show = this._show;
        this.id = tube.id;
        this.feature = tube;
        this.features.push(tube);
    };

    /**
     * 缩放至该图层
     * @example
     entityLayer.zoomTo()
     */
    zoomTo() {
        if (!defined(this.feature)) return;
        GeoDepository.viewer.flyTo(this.feature, {duration: 2});
    };

    /**
     * 设置实体位置
     *
     * @param {Array<number>} position [lng, lat, height]
     * TODO 修改会有闪烁
     * @example
     entityLayer.setPosition([121.46665, 31.17088, 0, 121.4663, 31.16701, 0, 121.46384, 31.1663, 0, 121.46351, 31.16834, 0])
     */
    setPosition(position) {
        this.position = position;

        GeoDepository.scene.requestRender();
        switch (this.entityType) {
            case 'line':
                this.feature.polyline.positions.setValue(Cartesian3.fromDegreesArrayHeights(position));
                break;
            case 'polygon':
                this.feature.polygon.hierarchy.setValue(Cartesian3.fromDegreesArrayHeights(position));
                break;
            case 'rect':
                let bbox = GeoUtil.getBBox(position);
                this.feature.rectangle.coordinates.setValue(Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3]));
                break;
            case 'ellipse':
                this.feature.position.setValue(Cartesian3.fromDegrees(position[0], position[1], position[2]));
                break;
            case 'pipeline':
                this.feature.corridor.positions.setValue(Cartesian3.fromDegreesArrayHeights(position));
                break;
            case 'tube':
                this.feature.polylineVolume.positions.setValue(Cartesian3.fromDegreesArrayHeights(position));
                break;
        }
    };

    /**
     * 是否显示
     * @property {Boolean}
     */
    get show(){
        return this._show;
    }
    set show(v) {
        this._show = v
        for (let i in this.features) {
            this.features[i].show = v;
        }
        this.feature.show = v;
        GeoDepository.scene.requestRender();
    };
    /**
     * 修改实体的颜色，十六进制的颜色字符串
     *
     * @property {String} color
     * @example
     entityLayer.color='#0000FF';
     *
     */
    get color() {
        return this._color;
    }

    set color(v) {
        let color;
        // if (this._color === color) return;
        if (v && (this.color !== v)) {
            if ((typeof(v) !== 'string') && !(v instanceof Color)) throw new Error('Point.color: 请输入正确的值！')
            color = (typeof(v) === 'string') ? Color.fromCssColorString(v) : v;
            defined(this._opacity) && (color = color.withAlpha(this._opacity))
            this.setEntityMaterial(this.entityType,color)
            this._color = color.toCssHexString();
            GeoDepository.scene.requestRender();
        }
    };

    /**
     * 透明度,范围为0-1。
     * @property {Number}
     * @example
     entityLayer.opacity=0.5;
     */
    get opacity() {
        return this._opacity;
    }

    set opacity(v) {
        if (isNaN(v) || (v < 0) || (v > 1)) {
            console.error('请传入大于等于0，小于等于1的数值！');
        } else {
            let color = new Color.fromCssColorString(this._color).withAlpha(v);
            this.setEntityMaterial(this.entityType,color)
            this._opacity = v;
            GeoDepository.scene.requestRender();
        }
    }

    /**
     * 设置entity的material材质效果
     * @param {String} entityType
     * @private
     */
    setEntityMaterial(entityType, color) {
        switch (entityType) {
            case 'line':
                this.feature.polyline.material = color;
                this.feature.polyline.depthFailMaterial = color;
                break;
            case 'polygon':
                this.feature.polygon.material = color;
                break;
            case 'rect':
                this.feature.rectangle.material = color;
                break;
            case 'ellipse':
                this.feature.ellipse.material = color;
                break;
            case 'pipeline':
                this.feature.corridor.material = color;
                break;
            case 'tube':
                this.feature.polylineVolume.material = color;
                break;
        }
    }

    /**
     * 设置显隐
     * @param {Boolean} visible 为true时显示，false时隐藏
     * @example
     entityLayer.setVisible(false)
     */
    setVisible(visible) {
        this._show = visible
        for (let i in this.features) {
            this.features[i].show = visible;
        }
        this.feature.show = visible;
        GeoDepository.scene.requestRender();
    };


    /**
     * 从Entity实例的集合中移除
     *
     * @param {EntityCollection} collection   Entity实例的集合。
     */
    removeFromCollection(collection) {
        GeoDepository.scene.requestRender();
        this.entityCollection.remove(this.feature);
        this.destroy();
    };

    /**
     * 移除所有数据
     */
    removeAll() {
        this.entityCollection.removeAll();
        this.features = [];
    }

    /**
     * 销毁对象
     *
     * @private
     *
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
    isNotSupportType(type) {
        return type !== 'line' ||
            type !== 'polygon' ||
            type !== 'rect' ||
            type !== 'ellipse' ||
            type !== 'pipeline' ||
            type !== 'tube' ||
            type !== 'box';
    };
}

/**
 * 显示距离。即相机与数据层之间的距离小于此值时显示，否则隐藏
 * @type {Number}
 */
// EntityLayer.DEFAULT_DISPLAY_DISTANCE = 100000;

export default EntityLayer;
