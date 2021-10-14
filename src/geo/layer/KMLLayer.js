import defined from 'cesium/Core/defined'
import Layer from "./Layer";
import destroyObject from 'cesium/Core/destroyObject'
import DeveloperError from 'cesium/Core/DeveloperError'
import KmlDataSource from 'cesium/DataSources/KmlDataSource'
import Color from 'cesium/Core/Color'
import LayerEventType from "../constant/LayerEventType";
import LayerType from "../constant/LayerType";
import {GeoDepository} from "../core/GeoDepository"
import FeatureType from "../constant/FeatureType";
import GeoUtil from '../utils/GeoUtil';

class KMLLayer extends Layer {
    /**
     * KML数据图层,可实现KML数据的添加、移除、缩放至和显隐等操作
     * @alias KMLLayer
     * @constructor
     *
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} [options.name] 图层名称；
     * @param {Boolean} [options.show] 是否显示；
     * @param {String} [options.customGroupId] 若使用自定义分组，该图层所在分组的名称。
     *
     * @example
     * var kmlLayer = new BOSGeo.KMLLayer({
     *   name: 'KML1',
     *   show: true,
     *   customGroupId: '图层组1',
     * });
     *
     */
    constructor(options) {
        super(options);
        this._kmls = {};
        this._dataSources = {}
        this.layerType = LayerType.KML;
        this._show = options.show;
        this.entityTypes = [
            ['box', 'ellipse', 'ellipsoid', 'polygon', 'polyline', 'polylineVolume', 'rectangle', 'wall', 'corridor', 'cylinder', 'path', 'plane'],
            ['billboard', 'point','model']];//子模型类型集合
        // 关闭地形深度检测
        GeoDepository.viewer.scene.globe.depthTestAgainstTerrain = false;
    }

    /**
     * 是否显示图层
     * @property {Boolean}
     */
    get show() {
        return this._show;
    }

    set show(value) {
        this._show = value;
        Object.values(this._dataSources).forEach((ds) => ds.show = value);
        this.fire(LayerEventType.CHANGE, {toggleShow: true});
        GeoDepository.scene.requestRender();

    }

    /**
     * 颜色，十六进制的颜色字符串
     * @property {String}
     */
    get color() {
        return this._color;
    }

    set color(v) {
        let color;
        let setEntityColor = (ientity, icolor) => {
            this.entityTypes.map(ets => {
                ets.map(e=>{
                    GeoUtil.setEntityColorOpacity(ientity, e,{color:icolor})
                })
            })
        }
        if (v && (this.color !== v)) {
            if ((typeof(v) !== 'string') && !(v instanceof Color)) throw new Error('Point.color: 请输入正确的值！')
            color = (typeof(v) === 'string') ? Color.fromCssColorString(v) : v;
            defined(this._opacity) && (color = color.withAlpha(this._opacity))
            Object.keys(this._dataSources).map(enti => {
                let dataSource = this._dataSources[enti];
                let entities = dataSource.entities.values;
                for (let i = 0; i < entities.length; i++) {
                    let entity = entities[i];
                    setEntityColor(entity, color);
                    entity._children && entity._children.map(ent => {
                        setEntityColor(ent, color);
                    })
                }
            });
            this._color = color.toCssHexString();
            GeoDepository.scene.requestRender();
        }
    }

    /**
     * 透明度
     * @property {Number}
     */
    get opacity() {
        return this._opacity;
    }

    set opacity(v) {

        let setEntityOpacity = (ientity) => {
            this.entityTypes.map(ets => {
                ets.map(e=>{
                    GeoUtil.setEntityColorOpacity(ientity, e,{opacity:v})
                })
            })
        }
        if (isNaN(v) || (v < 0) || (v > 1)) {
            console.error('请传入大于等于0，小于等于1的数值！');
        } else {
            // let color = new Color.fromCssColorString(this._color).withAlpha(v);
            Object.keys(this._dataSources).map(enti => {
                let dataSource = this._dataSources[enti];
                let entities = dataSource.entities.values;
                for (let i = 0; i < entities.length; i++) {
                    let entity = entities[i];
                    setEntityOpacity(entity)
                    entity._children && entity._children.map(ent => {
                        setEntityOpacity(ent)
                    })
                }
            });
            this._opacity = v;
            GeoDepository.scene.requestRender();
        }
    }

    /**
     * 添加kml数据
     *
     * @param options 参数配置：
     * @param {Resource | String | Object} options.url 数据地址；
     * @param {String} [options.name] 数据命名；
     * @param {Boolean} [ options.show = true] 该数据是否显示；
     * @param {Boolean} [options.clampToGround = true] 是否贴地。
     *
     * @returns {Promise<GeoJsonDataSource>}
     */
    add(options) {
        let {
            url,
            name,
            clampToGround = true,
            show = true
        } = options;
        if (!url) throw new DeveloperError('url is require!')
        this.name = name = name || url;

        let opt = {
            camera: this.viewer.scene.camera,
            canvas: this.viewer.scene.canvas,
            clampToGround: clampToGround //开启贴地
        };
        let kml = KmlDataSource.load(url, opt)
        this._kmls[name] = kml;
        let that = this
        this.viewer.dataSources.add(kml).then(function (dataSource) {
            that.viewer.flyTo(dataSource)
            dataSource.show = show;
            that._dataSources[name] = dataSource;
            that.viewer.zoomTo(dataSource)
            var entities = dataSource.entities.values;
            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];　　　　　　　　　// 设置每个entity的样式
                entity.featureType = FeatureType.ENTITY; //用于查询等
                if (entity.billboard) {
                    entity.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY; //去掉地形遮挡
                    entity.billboard.color = Color.WHITE;
                    // entity.billboard.image =  '../img/fire.png';
                }
            }
            this.fire(LayerEventType.ADD, entities);
            this.fire(LayerEventType.CHANGE);
            GeoDepository.scene.requestRender();
        })
        return kml;
    }

    /**
     * 移除kml数据
     * @param {DataSource} dataSource 数据源对象
     */
    remove(dataSource) {
        // let kml=this._kmls[name]
        // if(kml instanceof KmlDataSource){
        this.viewer.dataSources.remove(dataSource);
        this.fire(LayerEventType.REMOVE, dataSource);
        this.fire(LayerEventType.CHANGE);
        GeoDepository.scene.requestRender();
        // }
    }

    /**
     * 通过数据名移除kml数据
     * @param {String} [name] 数据名
     */
    removeByName(name) {
        let dataSource = this._dataSources[name]
        // if(kml instanceof KmlDataSource){
        this.viewer.dataSources.remove(dataSource);
        this.fire(LayerEventType.REMOVE, dataSource);
        this.fire(LayerEventType.CHANGE);
        GeoDepository.scene.requestRender();
        // }
    }

    /**
     * 移除全部kml
     */
    removeAll() {
        Object.values(this._dataSources).forEach((ds) => this.remove(ds));
        GeoDepository.scene.requestRender();
    }

    /**
     * 缩放至kml
     * @param {DataSource} dataSource 数据源对象
     */
    zoomTo(dataSource) {
        // let dataSource=this._dataSources[name]
        dataSource && this.viewer.zoomTo(dataSource)
    };

    /**
     * 缩放至图层
     */
    zoomToLayer() {
        let dataSource = this._dataSources[this.name]
        dataSource && this.viewer.zoomTo(dataSource)
    };

    /**
     * 通过数据名缩放
     * @param {String} name 数据名
     */
    zoomToByName(name) {
        let dataSource = this._dataSources[name]
        dataSource && this.viewer.zoomTo(dataSource)
    };

    /**
     * 设置可见度
     * @param {DataSource} dataSource  数据源对象
     * @param {Boolean} show 数据是否显示
     */
    setVisible(dataSource, val) {
        // let dataSource=this._dataSources[name]
        if (dataSource) dataSource.show = val;
        this.viewer.scene.requestRender();
    }

    /**
     * 销毁对象
     */
    destroy() {
        this.removeAll();
        this.feature = null
        return destroyObject(this)
    }

}

export default KMLLayer;
