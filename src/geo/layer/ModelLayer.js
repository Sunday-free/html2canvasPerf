import Layer from "./Layer";
import PrimitiveCollection from "cesium/Scene/PrimitiveCollection"; 
import Cesium3DTileset from "cesium/Scene/Cesium3DTileset";
import Cesium3DTileStyle from "cesium/Scene/Cesium3DTileStyle";
import defined from "cesium/Core/defined";
import HeadingPitchRange from "cesium/Core/HeadingPitchRange";
import Model from "cesium/Scene/Model";
import Cartesian3 from "cesium/Core/Cartesian3";
import defaultValue from "cesium/Core/defaultValue";
import ShadowMode from "cesium/Scene/ShadowMode";
import createGuid from "cesium/Core/createGuid";
import DeveloperError from 'cesium/Core/DeveloperError'
import { GeoDepository } from "../core/GeoDepository"
import FeatureType from "../constant/FeatureType"
import GeoUtil from "../utils/GeoUtil";
import Rectangle from "cesium/Core/Rectangle";
import BoundingSphere from 'cesium/Core/BoundingSphere'
import HeadingPitchRoll from 'cesium/Core/HeadingPitchRoll'
import CesiumMath from "cesium/Core/Math";
import Color from "cesium/Core/Color";

import Matrix4 from "cesium/Core/Matrix4";
import LayerEventType from "../constant/LayerEventType";
import LayerType from "../constant/LayerType";
import Util from "../utils/Util";
import {ModelStyler} from "../utils/ModelStyler";

/**
 * 模型图层，可实现对3DTiles和glTF模型的添加、获取、移除、缩放至和显隐等操作
 * @class ModelLayer
 * @constructor
 * 
 * @param {Object} options 包含以下参数的Object对象:
 * @param {String} options.name 图层名称;
 * @param {Boolean} options.show 是否显示;
 * @param {String} customGroupId 自定义分组的ID。
 * @extends Layer
 */
class ModelLayer extends Layer {

    constructor(options) {
        super(options);
        this._modelCollection = new PrimitiveCollection();
        this.viewer.scene.primitives.add(this._modelCollection);
        this._models = {};
        this._show = options.show;

        this.layerType = LayerType.MODEL;
        this._color = undefined;
        this._opacity = 1;
        //模型添加之后的回调->modelLayer.on('add',callback)
        //this.modelAddedCallback = undefined;
        //模型移除之后的回调->modelLayer.on('remove',callback)
        //this.modelRemovedCallback = undefined;
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
        //this._modelCollection.show = value;

        for (let i = 0; i < this._modelCollection.length; i++) {
            let model = this._modelCollection.get(i);
            model.show = value;
        }
        this.geomap.render();
        this.fire(LayerEventType.CHANGE, { toggleShow: true });
    }
    /**
     * 不透明度
     * @property {Number}
     */
    get opacity() {
        return this._opacity;
    }
    set opacity(v) {
        if(v === this._opacity) return;
        if (isNaN(v) || (v < 0) || (v > 1)) {
            console.error('请传入大于等于0，小于等于1的数值！');
        } else {
            Object.values(this._models).map(m => m.readyPromise.then(model=>{
                if (model.featureType === FeatureType.GLTF) {
                    model.color = new Color(1, 1, 1, v);
                } else {
                    ModelStyler.setOpacity(model,v);
                }
            }))
            this._opacity = v;
            this.geomap.render();
        }
    }
    /**
     * 十六进制的颜色字符串
     * @property {String} 
     */
     get color() {
        return this._color;
    }
    set color(v) {
        if(v === this._color) return;
        if (!v) {
            Object.values(this._models).map(m => m.readyPromise.then(model=>{
                if(model.featureType === FeatureType.GLTF){
                    model.color = new Color(1,1,1,1);
                }else {
                    let style = new Cesium3DTileStyle({});
                    model.style && (style.show = model.style.show );
                    model.style = style;
                };
                
            }))
        }else{
            const c = Color.fromCssColorString(v).withAlpha(this.opacity);
            Object.values(this._models).map(m => m.readyPromise.then(model=>{
                if(model.featureType === FeatureType.GLTF){
                    model.color = c;
                }else ModelStyler.setTilesetColor(model,`color("${c.toCssColorString()}")`);
                
            }))
            
        }
        this._color = v;
        this.geomap.render();
    }
    /*
    * 所有模型
    * @property {Array<Model|Cesium3DTileset>} 
    */
    get models() {
        return Object.values(this._models)
    }

    /**
     * 加载模型3DTiles/glTF/glb
     * @param {Object} modelParam 包含以下参数的Object对象：
	 * @param {String} [modelParam.id] 添加的模型对象的id值, 默认为GUID值，选填。
     * @param {String} modelParam.url 模型地址；
     * @param {String} [modelParam.featureType=BOSGeo.FeatureType.TILES] 模型类型,包括BOSGeo.FeatureType.TILES, FeatureType.GLTF,FeatureType.BIM,FeatureType.PHOTO和FeatureType.POINTCLOUD；
     * @param {String} [modelParam.name] 名称，不设置则为undefined；
     * @param {Cartesian3|Array<number>} [modelParam.position] 模型位置，三维笛卡尔坐标或者经纬度坐标；
     * @param {Array<number>} [modelParam.rotation=[0,0,0]] 模型角度，[偏航角,俯仰角,翻滚角]，单位为角度；
     * @param {Number} [modelParam.scale=1] 模型缩放比例；
     * @param {Boolean} [modelParam.enhance=false] 增强模型光，若为true,luminanceAtZenith=0.8，模型显示将变得更明亮；
     * @param {Number} [modelParam.luminanceAtZenith=0.2] 自定义太阳在天顶时模型的亮度，用于该模型的过程环境光，若enhance为true,该参数将不起作用(某些无PBR材质的3DTiles模型可能不起作用)；
     * @param {Number} [modelParam.maximumScreenSpaceError=16] 驱动3DTiles模型根据LOD更新的最大屏幕空间误差值；
     * @param {Number} [modelParam.maximumMemoryUsage=1024] tileset可使用的最大内存空间（单位MB），数据种类单一时建议设置为显存的50%；
     * @param {Object} [modelParam.gradualOptions] 模型渐变色，如 {startColor:"#1E476B",endColor:"#7D9EB8"}；
     * @param {MaterialType} [modelParam.materialType] BOSGeo.MaterialType,包括Normal（正常）、Gradual（渐变）、Science（科学）、GradualMixed（混合渐变）；
     *     
     * @param {Boolean} [modelParam.useCacheDB=true] 是否开启模型缓存；
     * @param {Object} [modelParam.attribute] 自定义模型属性；
     * @param {Number} [modelParam.version=1] 緩存数据版本；
     * 
     * @param {Object} [modelParam.cullWithChildrenBounds] 优化选项，请勿请求由于相机的移动而可能回来的未使用的图块；此优化仅适用于固定图块集；     *
     * @param {Boolean} [modelParam.preloadWhenHidden=false] 优化选项，当tileset.show是false时，预加载三维瓦片；当tileset可见时，加载三维瓦片，但不会渲染它们；
     * @param {Boolean} [modelParam.preloadFlightDestinations=true] 优化选项，相机飞行时，在相机飞往目的地的过程中预加载三维瓦片； 
     * @param {Boolean} [modelParam.skipLevelOfDetail=false] 优化选项，用于确定在空间树遍历期间是否跳过某些LOD；
     * @param {Boolean} [modelParam.preferLeaves=false] 优化选项，优先加载叶子节点的模型文件；
     * @param {Number} [modelParam.baseScreenSpaceError=1024] 优化选项，当skipLevelOfDetail为true时，则在跳过LOD之前必须达到的屏幕空间误差。；
     * @param {Number} [modelParam.skipScreenSpaceErrorFactor=16] 优化选项，当skipLevelOfDetail为true时，定义要跳过的最小屏幕空间误差的乘数，与skipLevels一起使用以确定要加载的瓦片；
     * @param {Number} [modelParam.skipLevels=1] 优化选项，当skipLevelOfDetail为时true，定义加载瓦片时要跳过的最小层级数；当它为0时，不跳过任何级别。与skipScreenSpaceErrorFactor一起使用以确定要加载的瓦片；
     * @param {Boolean} [modelParam.immediatelyLoadDesiredLevelOfDetail=false] 优化选项，当skipLevelOfDetail为true时，只有满足最大屏幕空间误差的瓦片会被下载；跳过因子将被忽略，仅加载所需的瓦片；
     * @param {Boolean} [modelParam.loadSiblings=false] 优化选项，当skipLevelOfDetail为true时，确定可见瓦片的兄弟姐妹在遍历过程中总是被下载。
     * @param {DistancePriorityType} [modelParam.distancePriorityType=DistancePriorityType.NORMAL] 瓦片加载优先级类型（其中NORMAL为正常的3dtiles加载策略；PREFER_DISTANCE优先以距离因子为主体并移除了foveatedDigits因子的影响；ONLY_DISTANCE仅以距离作为瓦片加载优先级的唯一判断因子，其它优化加载参数完全无效，慎用）
     * @param {Number} [modelParam.requestWeightFactor=0] 瓦片的请求权重因子，值越大，越先请求（慎用，建议在加载完后立马还原，否则可能会出现提高权重的图层在远处优先加载的情况）
     * 
     * @return {Primitive} primitive 模型对象
     * @example
     * let modelLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.MODEL, "模型"); //模型图层
     //添加模型
     let myModel = modelLayer.add(
     {
         name: '测试模型2',
         url: 'http://alpha-bigbos-bos3d.boswinner.com/api/d0ee39131a37426aa58a013c82fbbae4/geomodels/G1596620314217/data/tileset.json',
         position:[112.2491853712431, 24.94423899253814,100],
         rotation:[0,20,0],
         scale:2,
         featureType : BOSGeo.FeatureType.BIM,
         luminanceAtZenith:0.5,  //模型的亮度
         attribute:{name:'测试模型2'}
     }
     );
     */
    add(modelParam) {
        if (this.getModelByName(modelParam.name)) {
            throw new DeveloperError("同一图层下，不能出现模型同名！")
        }
        Util.validate(modelParam);
        let {
			id,
            url,
            name,
            featureType,
            maximumScreenSpaceError = 16,
            maximumMemoryUsage = 1024,
            useCacheDB = true,
            version = 1,
            rotation = [0, 0, 0],
            scale = 1,
            position,
            modelMatrix,
            attribute = {}
        } = modelParam;

        //增强模型光，若为true,luminanceAtZenith=0.8,模型显示将变得更明亮
        modelParam.enhance == true && (modelParam.luminanceAtZenith = 0.8);

        //通过判断文件后缀自动添加
        id = defined(attribute) && attribute.id ? attribute.id : (id || createGuid());

        if (!defined(url)) {
            throw new DeveloperError("必须指定模型的路径")
        }
        let obj;

        if (!defined(featureType)) featureType = FeatureType.TILES;//如果指定了模型类型就用指定的类型，否则统一为3DTiles
        if (featureType === FeatureType.GLTF) {
            obj = Model.fromGltf({
                ...modelParam,
                url,
                name,
                scale,
                useCacheDB,
                version
            })
        } else {
            obj = new Cesium3DTileset({
                ...modelParam,
                url,
                name,
                maximumScreenSpaceError,
                maximumMemoryUsage,
                useCacheDB,
                version
            })
        }
        obj.bosGroup = this;
        this.layer = this;
        let model = this._modelCollection.add(obj);
        this._models[name] = model;
        model.id = id;
        model.featureType = featureType;
        model.featureName = name;
        model.customData = attribute;
        model.dataUrl = url;
        model.layer = this;

        //将模型所在的图层的节点信息存储在模型上
        model.layerInfoForLayerManager = { layerName: this.name, customGroupId: this.customGroupId || null };
        if (!this.show) model.show = this.show;

        //模型准备好被渲染前添加或修改属性
        model.readyPromise.then((model) => {
            let mtrx;
            if (modelMatrix instanceof Matrix4) {
                if (featureType == FeatureType.GLTF) {
                    model.modelMatrix = modelMatrix;
                } else {
                    model._root.transform = modelMatrix;
                }
            } else if (position) {//设置模型位置

                model.model_position = [...position];
                if (featureType == FeatureType.GLTF) {
                    GeoUtil.setGltfModelMatrix(model, position, rotation, scale)
                } else {
                    model._root.initTransform = Util.deepClone(model._root.transform);
					/*
					//加上模型包围盒中心点高度，使得模型原点高度为0的模型显示在海平面上
					const center = GeoUtil.cartasian2degress(model.boundingSphere.center);
					const height =parseFloat(center.height.toFixed(2));
					position[2]= defaultValue(position[2],0.0);
					position[2] +=height;
					 */
                    GeoUtil.setTilesetMatrix(model._root.transform, position, rotation, scale);
                };
                model.scale = scale;
            }
            if (featureType == FeatureType.GLTF) {
                mtrx = model.modelMatrix;
            } else {
                mtrx = model._root.transform;
            };
            //计算经纬度
            let c = Matrix4.getTranslation(mtrx, new Cartesian3());
            if(!c.x) c = model.boundingSphere.center;
            model._modelPosition = GeoUtil.cartesianToArray(c);

            this.fire(LayerEventType.ADD, model);
            this.fire(LayerEventType.CHANGE);
            this.geomap.render();
        });
        return model;
    }


    /**
     * 根据名称获取模型
     * @param {String} name 模型名称
     * @example
     * modelLayer.getModelByName('测试模型2');
     */
    getModelByName(name) {
        return this._models[name];
    }
    /**
     * 缩放至本图层
     * @param {Function} callback 回调函数
     * @example
     * modelLayer.zoomToLayer();
     */
    zoomToLayer(callback) {
        const m_arr = Object.values(this._models);
        const len = m_arr.length;
        if (!len) return;
        if (len === 1) {
            this.zoomTo(m_arr[0], callback);
        }else{
            Promise.all(Object.values(this._models).map(m => m.readyPromise)).then(() => {
                const allBoundingSpheres = Object.values(this._models).map(m => {
                    let boundingSphere;
                    if (m.featureType == FeatureType.GLTF) {
                        let p = m.model_position;
                        boundingSphere = new BoundingSphere(Cartesian3.fromDegrees(p[0], p[1], p[2] + m.boundingSphere.radius), m.boundingSphere.radius);
                    }
                    return boundingSphere || m.boundingSphere
                });
                const result = BoundingSphere.fromBoundingSpheres(allBoundingSpheres);
                const camera = this.viewer.camera;
                camera.flyToBoundingSphere(result,{complete:callback});
            });
        }
    }
    /**
     * 获取该图层的所有模型
     */
    getAllModels() {
        return Object.values(this._models)
    }
    /**
     * 设置模型显隐
     * @param {String} name 模型名称
     * @param {Boolean} visible 是否显示
     * @example
     * modelLayer.setModelVisibleByName('测试模型2',false);
     */
    setModelVisibleByName(name, visible) {
        this._models[name].show = visible;
        this.fire(LayerEventType.CHANGE, { toggleShow: true });
    }
    /**
     * 获取模型的显隐信息
     * @param {String} name 若不填则返回所有显隐信息
     * @return {Boolean}
     * @example
     * let visible = modelLayer.getModelVisible('测试模型2');
     */
    getModelVisible(name) {
        const models = this._models;
        if (name) {
            return models[name] && models[name].show;
        } else {
            return Object.keys(models).map((name) => ({ title: name, show: models[name].show, data: models[name] }))
        }
    }

    /**
     * 设置太阳在天顶时模型的亮度，用于该模型的程序环境光
     * @param {Number} [val=0.2] 模型亮度值，默认0.2
     * @example
     *   let modelLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.MODEL, "模型"); //模型图层
         //添加模型
         let myModel = modelLayer.add({
             name: '测试模型2',
             url: 'http://alpha-bigbos-bos3d.boswinner.com/api/d0ee39131a37426aa58a013c82fbbae4/geomodels/G1596620314217/data/tileset.json',
             position:[112.2491853712431, 24.94423899253814,100],
             rotation:[0,20,0],
             scale:2,
             featureType : BOSGeo.FeatureType.BIM,
             luminanceAtZenith:0.5,  //模型的亮度
             attribute:{name:'测试模型2'}
         });
        myModel.luminanceAtZenith = 0.6; //设置模型光照亮度,默认为0.2
        modelLayer.setLuminanceAtZenith(100);//设置该模型图层下所有模型光照亮度,默认为0.2
     */
    setLuminanceAtZenith(val) {
        const models = this._models;
        Object.keys(models).map((name) => (
            models[name].luminanceAtZenith = val
        ))
        this.geomap.render();
    }
    /**
     * 根据对象名称移除模型
     * @param {String} name 模型名称
     * @example
     * modelLayer.removeByName('测试模型2');
     */
    removeByName(name) {
        const model = this._models[name];
        this._modelCollection.remove(model);
        delete this._models[name];
        for (let key in model) {
            delete model[key];
        }
        this.fire(LayerEventType.REMOVE, model);
        this.fire(LayerEventType.CHANGE);
        this.geomap.render();

    }
    /**
     * 删除模型
     * @param {Mode} model 模型
     * @example
     * zoomToLayer.remove(myModel)
     */
    remove(model) {
        this.removeByName(model.featureName);
    }

    /**
     * 移除该图层所有模型
     */
    removeAll() {
        this._modelCollection.removeAll();
        Object.values(this._models).forEach((m) => {
            for (let key in m) {
                delete m[key];
            }
            this.fire(LayerEventType.REMOVE, m);
        })
        this._models = {};
        this.fire(LayerEventType.CHANGE);
        this.geomap.render();
    }

    /**
     * 定位到某个模型
     * @param {Cesium3DTileset|Model} model 模型对象
     * @param {Function} callback 定位结束后的回调函数
     * @example
     * zoomToLayer.zoomTo(myModel)
     */
    zoomTo(model, callback) {
        let that = this;
        if (model instanceof Cesium3DTileset) {
            model.readyPromise.then(function () {
                that.viewer.zoomTo(model, new HeadingPitchRange(0.0, -0.5, model.boundingSphere.radius * 2)).then(() => {
                    callback();
                });
            });
        }
        if (model instanceof Model) {			
			that._requestRenderMode = that.geomap.requestRenderMode; // 保存最初的实时渲染参数值
			that.geomap.requestRenderMode = false;	//针对glTF模型,定位时需开启实时渲染			
            model.readyPromise.then(function (model) {	
                let camera = that.viewer.camera;

                let center = Matrix4.multiplyByPoint(
                    model.modelMatrix,
                    model.boundingSphere.center,
                    new Cartesian3()
                );				
			
                camera.lookAt(center, new HeadingPitchRange(0.0, -1, model.boundingSphere.radius * 4.0));
                camera.lookAtTransform(Matrix4.IDENTITY);
				that.geomap.requestRenderMode = that._requestRenderMode;//恢复最初的实时渲染参数值
                callback();
            });
        }
    }
    /**
     * 销毁本图层
     */
    destroy() {
        this.removeAll();
        this.viewer.scene.primitives.remove(this._modelCollection);
        this._destroyBaseLayer();
    }


}



String.prototype.endWith = function (endStr) {
    var d = this.length - endStr.length;
    return (d >= 0 && this.lastIndexOf(endStr) == d);
}


export default ModelLayer;
