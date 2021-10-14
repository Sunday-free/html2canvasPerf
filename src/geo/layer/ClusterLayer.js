import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import destroyObject from 'cesium/Core/destroyObject'
import DeveloperError from 'cesium/Core/DeveloperError'
import Color from 'cesium/Core/Color'
import Cartesian3 from 'cesium/Core/Cartesian3'
import DistanceDisplayCondition from 'cesium/Core/DistanceDisplayCondition'
import HorizontalOrigin from 'cesium/Scene/HorizontalOrigin'
import VerticalOrigin from 'cesium/Scene/VerticalOrigin'
import PinBuilder from 'cesium/Core/PinBuilder'
import CesiumMath from 'cesium/Core/Math'
import when from 'cesium/ThirdParty/when'
import CustomDataSource from 'cesium/DataSources/CustomDataSource'
import buildModuleUrl from "cesium/Core/buildModuleUrl";
import Cartographic from "cesium/Core/Cartographic";

import FeatureType from "../constant/FeatureType";
import { GeoDepository } from "../core/GeoDepository";
import Layer from "./Layer";
import GeoUtil from "../utils/GeoUtil";

class ClusterLayer extends Layer {
    /**
     * 聚合图层, datasource聚合
     * @alias ClusterLayer
     * @constructor
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {Array<Object>} options.positions 包含位置position和属性attribute对象的数组；
     * @param {String} [options.entityType='billboard'] 实体类型，目前只支持“billboard”；
     * @param {Boolean} [options.show=true] 是否显示点图标；
     * @param {Boolean} [options.enabled=true] 是否进行聚合；
     * @param {String} [options.img='./resource/images/tools/start.png'] 点的图标；
     * @param {Number} [options.opacity=1] 点图标的透明度；
     * @param {String} [options.color='#FFFFFF'] 点图标的颜色，十六进制颜色值；
     * @param {String} options.iconColor 聚合图标的颜色，十六进制颜色值；
     * @param {Number} [options.size=50] 点图标尺寸；
     * @param {Number} [options.displayDistance=10000] 点图标最远显示距离；
     * @param {Number} [options.pixelRange=80] 图标聚合的像素范围；
     * @param {Number} [options.minimumClusterSize=1] 图标聚合的最小像素；
     * @param {String} [options.name] 图标名称。
     * 
     * @example
     * BOSGeo.Resource.fetchJson({
     *   url: 'http://192.168.1.42:8086/geo/code/BOSGeoDemo/static/html/data/bianpos.js'
     * }).then(features => {
     *   var pointspositon = [];
     *   for (var p = 0; p < features.length; p++) {
     *      pointspositon.push({
     *          position: [features[p].geometry.x, features[p].geometry.y, 0],
     *          attribute: features[p].attributes
     *      });
     *   }
     *  var clusterLayer = new BOSGeo.ClusterLayer({
     *    name: '聚类图层1',
     *    type: 'billboard',
     *    positons: pointspositon,
     *    displayDistance: 90000,
     *    show: true,
     *    iconColor: '#da1212',
     *    img: './resource/images/tools/start.png',
     *    pixelRange: 100,
     *    minimumClusterSize: 3
     *  });
     *  setTimeout(() => {
     *      clusterLayer.zoomTo();
     *  }, 500);
     * 
     */
    constructor(options = {}) {
        super(options)
        const {
            positons,
            type = 'billboard',
            show = true,
            enabled = true,
            img = buildModuleUrl('./resource/images/tools/start.png'),
            opacity = 1,
            color = '#FFFFFF',
            iconColor,
            size = 50,
            displayDistance = 10000,
            pixelRange = 80,
            minimumClusterSize = 1,
            name,
        } = options;
        this.positons = positons;
        this.entityType = type;
        // if (!this.entityType) throw new DeveloperError('聚合类型必传!');
        this.show = show; // 是否显示图标
        this.enabled = enabled; // 是否聚合
        this.opacity = opacity;
        this._img = img;
        this.color = color;
        this.iconColor = iconColor
        this.size = size;
        this.pixelRange = pixelRange;
        this.minimumClusterSize = minimumClusterSize;
        this.name = name;
        this.displayDistance = displayDistance;
        this._dataSource = undefined;
        this.clusterEvent = undefined;
        this.featureLength = 0;
        this.viewModel = {
            pixelRange: this.pixelRange,
            minimumClusterSize: this.minimumClusterSize
        }
        this.type = 'clusterLayer';
        this.clusterDataSource = new CustomDataSource('cluster');
        GeoDepository.viewer.dataSources.add(this.clusterDataSource);
        // self.clusterDataSource = clusterDataSource;
        (options.positons && options.type == 'billboard') && this.init(this.clusterDataSource);
    }

    /**
     * 添加Cluster聚合图层数据
     * 
     * @param {Object} options 聚合参数配置：
     * @param {Array<Object>} options.positions 包含位置position和属性attribute对象的数组；
     * @param {String} [options.entityType='billboard'] 实体类型，目前只支持“billboard”；
     * @param {Boolean} [options.show=true] 是否显示点图标；
     * @param {Boolean} [options.enabled=true] 是否进行聚合；
     * @param {String} [options.img='./resource/images/tools/start.png'] 点的图标；
     * @param {Number} [options.opacity=1] 点图标的透明度；
     * @param {String} [options.color='#FFFFFF'] 点图标的颜色，十六进制颜色值；
     * @param {String} options.iconColor 聚合图标的颜色,，十六进制颜色值；
     * @param {Number} [options.size=50] 点图标尺寸；
     * @param {Number} [options.displayDistance=10000] 点图标最远显示距离；
     * @param {Number} [options.pixelRange=80] 图标聚合的像素范围；
     * @param {Number} [options.minimumClusterSize=1] 图标聚合的最小像素；
     * @param {String} [options.name] 图标名称。
     */
    add(options = {}) {
        const {
            positons,
            type = 'billboard',
            show = true,
            enabled = true,
            img = buildModuleUrl('./resource/images/tools/start.png'),
            opacity = 1,
            color = '#FFFFFF',
            iconColor,
            size = 50,
            displayDistance = 10000,
            pixelRange = 80,
            minimumClusterSize = 1,
            name,
        } = options;
        this.positons = positons;
        this.entityType = type;
        if (!this.entityType) throw new DeveloperError('聚合类型必传!');
        this.show = show; // 是否显示图标
        this.enabled = enabled; // 是否聚合
        this.opacity = opacity;
        this._img = img;
        this.color = color;
        this.iconColor = iconColor;
        this.size = size;
        this.pixelRange = pixelRange;
        this.minimumClusterSize = minimumClusterSize;
        this.name = name;
        this.displayDistance = displayDistance;
        // this._dataSource = undefined;
        // this.clusterEvent = undefined;
        // this.featureLength = 0;
        // this.viewModel = {
        //     pixelRange: this.pixelRange,
        //     minimumClusterSize: this.minimumClusterSize
        // }
        // this.type = 'clusterLayer';

        this.init(this.clusterDataSource);
    }

    /**
     * 创建并添加至集合
     *
     * @private
     * @param {EntityCollection} collection   Entity实例的集合。
     *
     */
    init(collection) {
        let defered = when.defer();

        switch (this.entityType) {
            case 'billboard':
                this._billboard(collection);
                this.setCluster(collection);
                break;
        }
        defered.resolve(this);
        return defered.promise;
    };

    /**
     * 聚合
     * 
     * @private
     * 
     * @param {Object} dataSource  数据源对象
     * 
     */
    setCluster(dataSource) {
        dataSource.clustering.enabled = this.enabled;
        dataSource.clustering.pixelRange = this.pixelRange;
        dataSource.clustering.minimumClusterSize = this.minimumClusterSize;

        let that = this;
        let pinBuilder = new PinBuilder();
        if (defined(this.clusterEvent)) {
            this.clusterEvent();
            this.clusterEvent = undefined;
        } else {
            this.clusterEvent = dataSource.clustering.clusterEvent.addEventListener(function (clusteredEntities, cluster) {
                cluster.label.show = false;
                cluster.billboard.show = true;
                cluster.billboard.id = cluster.label.id;
                cluster.billboard.verticalOrigin = VerticalOrigin.BOTTOM;
                let color = that.iconColor ? Color.fromCssColorString(that.iconColor) : Color.VIOLET;
                cluster.billboard.image = pinBuilder.fromText('' + clusteredEntities.length, color, that.size).toDataURL();
            });
            let pixelRange = dataSource.clustering.pixelRange;
            dataSource.clustering.pixelRange = 0;
            dataSource.clustering.pixelRange = pixelRange;
        }

        this._dataSource = dataSource
    }

    /**
     * 显示点图标
     * 
     * @private
     * 
     * @param {EntityCollection} collection   Entity实例的集合。
     * 
     */
    _billboard(collection) {
        let cesiumColor = Color.fromCssColorString(this.color || '#fff').withAlpha(this.opacity);
        GeoDepository.scene.requestRender();
        let positons = this.positons || [];
        this.featureLength = positons.length;
        if (this.featureLength === 0) return;
        let featureCan = [];
        for (let i = 0; i < this.featureLength; i++) {
            let position = positons[i].position;
            let billboard = collection.entities.add({
                position: Cartesian3.fromDegrees(position[0], position[1], position[2] || 1),
                billboard: {
                    image: position.img || this._img,
                    horizontalOrigin: HorizontalOrigin.CENTER, // default
                    verticalOrigin: VerticalOrigin.BOTTOM, // default: CENTER
                    scale: this.scale, // default: 1.0
                    color: cesiumColor, // default: WHITE
                    rotation: CesiumMath.PI_OVER_FOUR, // default: 0.0
                    alignedAxis: Cartesian3.ZERO, // default
                    distanceDisplayCondition: new DistanceDisplayCondition(0, this.displayDistance || 10000)
                }
            });
            billboard.featureType = FeatureType.ICON;
            billboard.attributeData = positons[i].attribute;
            billboard.show = this.show;
            featureCan.push(billboard);
        }
        this.feature = featureCan;
        // 释放内存
        this.positons = [];
    }

    /**
     * 缩放至该图层
     */
    zoomTo() {
        if (!defined(this.feature)) return;
        GeoDepository.viewer.flyTo(this.feature, { duration: 2 });
    };

    /**
     * 是否显示图层
     * @property {Boolean}
     */
    get _show() {
        return this.show;
    }
    set _show(value) {
        // visible ? this._dataSource.clustering.enabled = true : this._dataSource.clustering.enabled = false;
        for (let i = 0; i < this.feature.length; i++) {
            this.feature[i].show = value;
        }
        this.show = value;
        GeoDepository.scene.requestRender();
    };

    /**
     * 移除
     * 
     * @private
     * 
     * @param {EntityCollection} collection   Entity实例的集合。
     * @see {LayerCollection#remove}
     */
    removeFromCollection(collection) {
        GeoDepository.scene.requestRender();
        collection.entities.removeAll();
        this.destroy();
    };

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
     * 全局点击事件监听，点击模型和实体对象后显示属性信息
     * 
     * @param {Cartesian2} windowCoord 屏幕坐标
     * @return {Array|undefined} 返回聚合点的列表信息
     */
    onClick(windowCoord) {
        const viewer = GeoDepository.viewer;
        let pick = GeoDepository.scene.pick(windowCoord);
        if (!pick || (!pick.primitive && !pick.id)) {
            // this.reset();
            return;
        }

        const height = Cartographic.fromCartesian(viewer.camera.position).height;

        // let attributes=[]
        // let primitive = pick.primitive || {};
        let id = pick.id || {};
        let position = viewer.scene.pickPosition(windowCoord);
        let location = GeoUtil.cartesianToArray(position);
        if (id.length > 1) {
            //放大至点击位置
            // viewer.camera.zoomIn(height*0.4);
            GeoUtil.flyTo(location[0], location[1], height * 0.4);

            // for(let i=0;i<id.length;i++){
            //     let attributeData={}
            //     id[i].attributeData &&(attributeData=id[i].attributeData)
            //     if(id&& id[i]._properties &&id[i]._properties._propertyNames){
            //         this.attributeData={}
            //         for(let i=0;i<id[i]._properties._propertyNames.length;i++){
            //             attributeData[id[i]._properties._propertyNames[i]]=id[i]._properties[id[i]._properties._propertyNames[i]]
            //         }
            //     }
            //     attributes.push(attributeData)
            // }

        }
        //返回聚合点的列表信息
        return id;
    }
}


export default ClusterLayer;