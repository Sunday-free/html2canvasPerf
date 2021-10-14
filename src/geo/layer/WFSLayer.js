import defined from 'cesium/Core/defined'
import GeoJsonDataSource from "cesium/DataSources/GeoJsonDataSource";
import DataSourceCollection from "cesium/DataSources/DataSourceCollection";
import DeveloperError from "cesium/Core/DeveloperError.js";
import { GeoDepository } from "../core/GeoDepository";
import GeoJsonLayer from "./GeoJsonLayer";
import LayerEventType from "../constant/LayerEventType";
import LayerType from "../constant/LayerType";
import when from "cesium/ThirdParty/when";
import Color from 'cesium/Core/Color'
import defaultValue from 'cesium/Core/defaultValue'
import Layer from "./Layer";
import FeatureType from "../constant/FeatureType";
import GeoUtil from '../utils/GeoUtil';

class WFSLayer extends Layer {
    /**
     * WFS地图服务类，可实现WFS地图服务的添加、移除、缩放至和显隐等操作
     * @alias WFSLayer
     * @constructor
     * @extends Layer
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} [options.name] 图层名称；
     * @param {String} options.wfsUrl 可以是wfs的服务地址；
     * @param {Boolean} [options.show=true] 是否显示；
     * @param {String} [options.customGroupId] 若使用自定义分组，该图层所在分组的名称；
     * @param {String} [options.stroke='#FF0000']  轮廓线的颜色，默认值为'#FF0000',格式为CSS颜色格式；
     * @param {String} [options.fill='#ffffff']  填充颜色，默认值为'#ffffff',格式为CSS颜色格式；
     * @param {Boolean} [options.zoomToTarget=false]  是否缩放至当前加载的GeoJson对象范围内，默认值为false。
     * @param {Boolean} [options.clampToGround=false]  是否贴地，默认值为false，clampToGround为true时贴地，此时轮廓线设置将不起作用。
     */
    constructor(options = {}) {
        super(options);
        this.options = options;
        this._jsons = {};
        this._dataSources = {}

        this.viewer = GeoDepository.viewer
        this._show = defaultValue(options.show , true);
        this.entityTypes = [
            ['box', 'ellipse', 'ellipsoid', 'polygon', 'polyline', 'polylineVolume', 'rectangle', 'wall', 'corridor', 'cylinder', 'path', 'plane'],
            ['billboard', 'point','model']];//子模型类型集合
        // 关闭地形深度检测
        GeoDepository.viewer.scene.globe.depthTestAgainstTerrain = false;
        // this.url = options.wfsUrl;
        // this.name = options.name || this.url;
        // this.options.clampToGround = defaultValue(options.clampToGround, true);
        // this.options.stroke = Color.fromCssColorString(defaultValue(options.stroke, "#FF0000"));

        // this.options.fill = defaultValue(options.fill, "#ffffff");
        // this.zoomToTarget = defaultValue(options.zoomToTarget, false);

        // this.add(this.options)
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
     * 添加WFS图层
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} [options.name] 图层名称；
     * @param {String} options.wfsUrl 可以是wfs的服务地址；
     * @param {Boolean} [options.show=true] 是否显示；
     * @param {String} [options.customGroupId] 若使用自定义分组，该图层所在分组的名称；
     * @param {String} [options.stroke='#FF0000']  轮廓线的颜色，默认值为'#FF0000',格式为CSS颜色格式；
     * @param {String} [options.fill='#ffffff']  填充颜色，默认值为'#ffffff',格式为CSS颜色格式；
     * @param {Boolean} [options.zoomToTarget=false]  是否缩放至当前加载的GeoJson对象范围内，默认值为false。
     * @param {Boolean} [options.clampToGround=false]  是否贴地，默认值为false。clampToGround为true时贴地，此时轮廓线设置将不起作用。
     * @returns {Promise<GeoJsonDataSource>}
     */
    add(options) {

        if (!options.wfsUrl || options.wfsUrl === '') {
            throw new DeveloperError('(options.wfsUrl)为必传参数');
        }

        // this.params = params
        // this.params.clampToGround = defaultValue(params.clampToGround, true);
        // this.params.stroke = defaultValue(params.stroke, undefined);

        // this.params.fill = defaultValue(params.fill, undefined);
        const {
            name,
            wfsUrl,
            show = true,
            customGroupId,
            clampToGround = false,
            stroke = '#FF0000',
            fill = '#ffffff',
            zoomToTarget = false,

        } = options;

        this.options = options;
        this.name = name || wfsUrl;
        this._show = show;
        this.options.clampToGround = clampToGround;
        this.options.stroke = Color.fromCssColorString(stroke);

        this.options.fill = Color.fromCssColorString(fill);
        this.zoomToTarget = zoomToTarget;

        let json = GeoJsonDataSource.load(wfsUrl, this.options)
        this._jsons[name] = json;
        // let defered = when.defer();
        let that = this
        // if(! (name in that._dataSources)){

        this.viewer.dataSources.add(json).then(function (dataSource) {
            dataSource.show = show;
            let entities = dataSource.entities.values;
            for (let i = 0; i < entities.length; i++) {
                let entity = entities[i];
                entity.featureType = FeatureType.ENTITY;
            }

            that._dataSources[name] = dataSource;
            that.zoomToTarget && that.viewer.zoomTo(dataSource)
            this.fire(LayerEventType.ADD, { dataSource, entities });
            this.fire(LayerEventType.CHANGE);
            that.geomap.render();
            // defered.resolve(that);
        })
        return json;
        // }
    }
    /**
     * 移除WFS图层
     * 
     * @param {GeoJsonDataSource} dataSource GeoJsonDataSource对象
     */
    remove(dataSource) {
        // let json=this._jsons[name]
        // if(json instanceof GeoJsonDataSource){

        this.viewer.dataSources.remove(dataSource);
        this.fire(LayerEventType.REMOVE, dataSource);
        this.fire(LayerEventType.CHANGE);
        this.geomap.render();
        // }
    }
    /**
     * 通过名称移除WFS图层
     * 
     * @param {String} name
     */
    removeByName(name) {
        let dataSource = this._dataSources[name]
        // if(json instanceof GeoJsonDataSource){
        this.viewer.dataSources.remove(dataSource);
        this.fire(LayerEventType.REMOVE, dataSource);
        this.fire(LayerEventType.CHANGE);
        delete this._dataSources[name]
        this.geomap.render();
        // }
    }
    /**
     * 销毁本图层
     */
    destroy() {
        Object.keys(this._dataSources).map(v => this.viewer.dataSources.remove(this._dataSources[v]))
        // this._dataSources.forEach(d=>this.viewer.dataSources.remove(this._dataSources[d]));
        this.geomap.render()
        this._destroyBaseLayer();
        delete this._dataSources;
    }
    /**
     * 移除所有WFS图层
     */
    removeAll() {
        // this.viewer.dataSources.removeAll();
        for (let i in this._dataSources) {
            this.viewer.dataSources.remove(this._dataSources[i])
            this.fire(LayerEventType.REMOVE, this._dataSources[i]);
            this.fire(LayerEventType.CHANGE);
            delete this._dataSources.i
        }
        // this._dataSources.forEach(d=>this.viewer.dataSources.remove(this._dataSources[d]));
        this.geomap.render();
    }
    /**
     * 缩放至wfs服务
     * @param {GeoJsonDataSource} dataSource GeoJsonDataSource对象
     */
    zoomTo(dataSource) {
        // let dataSource=this._dataSources[name]
        dataSource && this.viewer.zoomTo(dataSource)
    };

    /**
     * 缩放至本图层
     */
    zoomToLayer() {
        let dataSource = this._dataSources[this.name]
        dataSource && this.viewer.zoomTo(dataSource)
    };
    /**
     * 缩放至wfs服务数据
     * @param {String} name
     */
    zoomToByName(name) {
        let dataSource = this._dataSources[name]
        dataSource && this.viewer.zoomTo(dataSource)
    };
    /**
     * 设置WFS图层显隐
     * 
     * @param {String} name
     * @param {Boolean} show 数据是否显示
     */
    setVisible(name, show) {
        let dataSource = this._dataSources[name]
        if (dataSource) dataSource.show = show;
        this.viewer.scene.requestRender();
    }
    /**
     * 是否显示图层
     * @property {Boolean}
     * @default true
     */
    get show() {
        return this._show;
    }
    set show(value) {
        this._show = value;
        Object.keys(this._dataSources).map(v => this._dataSources[v].show = value)
        this.fire(LayerEventType.CHANGE, { toggleShow: true });
        this.geomap.render();
    }

    // /**
    //  * 添加wfs地图服务
    //  * @param {GeoJsonDataSource} json GeoJsonDataSource对象
    //  */
    // add(params){
    //     let url=params.wfsUrl
    //     this.laod(url,params);
    // let that=this
    // fetch(url).then(response => response.json())
    //     .then(data => console.log(data))
    //     .catch(e => console.log("Oops, error", e)
    //     )
    // fetch(url,{
    //     method: 'GET',
    //     headers: {
    //         'Content-Type': 'application/x-www-form-urlencoded',
    //     },
    // }).then(response => response.text())
    //     .then((text) => {
    //         if (typeof text === 'string' && text !== '') {
    //             try {
    //                 return JSON.parse(text);
    //             }
    //             catch (e)
    //             { return null; }
    //         }
    //         return null;
    //     }).then((json) => {
    //     console.log('object data', json);
    //     debugger
    //     that.laod(json)
    // });

    // $.ajax({
    //     url:this.url,
    //     cache: false,
    //     async: true,
    //     success: function(data) {
    //         that.laod(data);
    //     },
    //     error: function(data) {
    //
    //         console.error(data);
    //     }
    // });
    // }
}

export default WFSLayer;