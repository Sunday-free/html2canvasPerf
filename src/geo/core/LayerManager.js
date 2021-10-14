import DeveloperError from 'cesium/Core/DeveloperError';
import Clone from 'cesium/Core/Clone';
import TerrainLayer from '../layer/TerrainLayer';
import LineLayer from '../layer/LineLayer';
import AreaLayer from '../layer/AreaLayer';
import PointLayer from '../layer/PointLayer';
import Html2CanvasLayer from '../layer/Html2CanvasLayer';
import HtmlLayer from '../layer/HtmlLayer';
import ModelLayer from '../layer/ModelLayer';
import MapLayer from '../layer/MapLayer'
import GeoJsonLayer from '../layer/GeoJsonLayer';
import WFSLayer from '../layer/WFSLayer';
import KMLLayer from '../layer/KMLLayer';
import ClusterLayer from '../layer/ClusterLayer';
import GeometryLayer from '../layer/GeometryLayer';
import LayerType from "../constant/LayerType";
import LayerEventType from "../constant/LayerEventType";
import LayerManagerEventType from "../constant/LayerManagerEventType";
import defined from "cesium/Core/defined";
import DrawLayer from "../layer/DrawLayer";
import Listener from '../core/Listener.js';
import { GeoDepository } from "../core/GeoDepository"

class LayerManager {
    /**
     * 图层管理类，用于图层分组，点、线、几何、模型、地形、影像、GeoJson、WFS、KML、CLUSTER面等类型图层的创建、获取和删除等操作。
     * @alias LayerManager
     * @constructor
     * 
     * @param {GeoMap} geomap GeoMap对象
     * 
     * @example
     * var geomap = new BOSGeo.GeoMap('container', {
     *  requestRenderMode: true //是否实时渲染
     * });
     * var layerManager = geomap.layerManager;
     * 
     */
    constructor(geomap) {
        this.geomap = geomap;
        this._allLayers = {};
        const { TERRAIN, IMAGERY, MODEL, POINT, LINE, GEOMETRY, GEOJSON, WFS, DRAW, KML, CLUSTER, AREA, HTML2CANVAS, HTML} = LayerType;
        [TERRAIN, IMAGERY, MODEL, POINT, LINE, GEOMETRY, GEOJSON, WFS, DRAW, KML, CLUSTER, AREA, HTML2CANVAS, HTML].forEach(t => this._allLayers[t] = {})

        this._listener = new Listener();

        this._customLayerTree = null;
        this._customIds = [];
        this._layerTreeKeyToNode = {};

    }

    /**
     * 获取图层类型相关信息
     * 
     * @ignore
     * 
     * @returns {Object}
     */
    _getLayerTypeInfo() {
        const { TERRAIN, IMAGERY, MODEL, POINT, LINE, GEOMETRY, GEOJSON, WFS, DRAW, KML, CLUSTER, AREA, HTML2CANVAS, HTML} = LayerType;
        const LayerTypeToLayerClass = {};
        LayerTypeToLayerClass[TERRAIN] = TerrainLayer;
        LayerTypeToLayerClass[IMAGERY] = MapLayer;
        LayerTypeToLayerClass[MODEL] = ModelLayer;
        LayerTypeToLayerClass[POINT] = PointLayer;
        LayerTypeToLayerClass[LINE] = LineLayer;
        LayerTypeToLayerClass[GEOJSON] = GeoJsonLayer;
        LayerTypeToLayerClass[WFS] = WFSLayer;
        LayerTypeToLayerClass[GEOMETRY] = GeometryLayer;
        LayerTypeToLayerClass[DRAW] = DrawLayer;
        LayerTypeToLayerClass[KML] = KMLLayer;
        LayerTypeToLayerClass[CLUSTER] = ClusterLayer;
        LayerTypeToLayerClass[AREA] = AreaLayer;
        LayerTypeToLayerClass[HTML2CANVAS] = Html2CanvasLayer;
        LayerTypeToLayerClass[HTML] = HtmlLayer;
        const layerTypeText = {};
        layerTypeText[TERRAIN] = '地形';
        layerTypeText[IMAGERY] = '影像';
        layerTypeText[MODEL] = '模型';
        layerTypeText[POINT] = '点';
        layerTypeText[LINE] = '线';
        layerTypeText[GEOJSON] = 'geojson文件';
        layerTypeText[WFS] = 'WFS';
        layerTypeText[GEOMETRY] = '几何';
        layerTypeText[DRAW] = '绘图';
        layerTypeText[KML] = 'kml';
        layerTypeText[CLUSTER] = 'CLUSTER';
        layerTypeText[AREA] = '面';
        layerTypeText[HTML2CANVAS] = 'html2canvas';
        layerTypeText[HTML] = 'html';

        return { layerTypeText, LayerTypeToLayerClass }
    }

    /**
     * 恢复所有图层初始化时的可见设置
     * 
     * @ignore
     */
    _toTheInitialVisible() {
        const setInitial = (layerTypeGroup) => {
            Object.values(layerTypeGroup).forEach((ly) => {
                ly.show = ly._initialShow;
            })
        }
        Object.values(this._allLayers).forEach(
            (g) => setInitial(g)
        )
    }

    /**
     * 是否使用自定义分组
     * 
     * @private
     * 
     * @returns {Boolean}
     */
    hasCustomLayerTree() {
        return Boolean(this._customLayerTree);
    }

    /**
     * 创建对图层的自定义分组
     * 
     * @param {Object} customTree 
     * 
     * @example
     * var customLayerGroup = [{
     *      title:'xx年',
     *      id:'xxYear',
     *      children:[{title:'1月',id:'1Month'},{title:'xx月',id:'xxMonth'}]
     *  }, {
     *      title:'yy年',
     *      id:'yyYear',
     *      children:[]
     *  }];
     * layerManager.initCustomLayerTree(customLayerGroup);
     * 
     */
    initCustomLayerTree(customTree) {
        if (!(customTree instanceof Array)) {
            throw new Error("传入参数不正确,参数格式应为:[ {title:String, id:String, children:Array},... ]");
        }
        customTree = Clone(customTree, true);

        //根据传入参数初始化树干（即仅包含分组结构，不包含任何图层）
        const tree = [
            ...customTree,
            { title: '其他', id: '_defaultExtraLayersGroup', children: [] } //创建一个分类，将这个棵树创建以前的所有图层放置其中（例如默认底图等）
        ];
        let ids = [];
        const findEveryNode = (root, parentKey) => {
            root.forEach((childNode) => {
                if (defined(childNode.id)) {
                    if (ids.includes(childNode.id)) {
                        throw new Error("图层组id存在重名：" + oldChild.key);
                    }else{
                        ids.push(childNode.id);
                        childNode.key = childNode.id;
                        childNode.order = 10000000;
                        childNode.nodeType = 'group';
                        childNode.parentKey = parentKey;
                        childNode.children = childNode.children || [];
                        childNode.children && childNode.children.length && findEveryNode(childNode.children, childNode.key)
                    }
                    
                };
                
            })
        }
        findEveryNode(tree);
        this._customLayerTree = tree;
        this._customIds = ids;


        this.fire(LayerManagerEventType.CHANGE);
    }

    /**
     * 根据类型创建图层
     * 
     * @param {layerType} layerType 图层类型；
     * @param {string} name 图层名称；
     * @param {Object} options 其他配置：
     * @param {String} options.customGroupId 自定义分组；
     * @param {Boolean} options.initialShow 创建时图层是否可见。
     * @return {Layer} 返回图层对象
     * 
     * @example
     * var modelLayer = layerManager.createLayer(BOSGeo.LayerType.MODEL, 'model123',{customGroupId:'model1'}); // 添加模型
     */
    createLayer(layerType, name, options) {
        let { customGroupId, initialShow = true } = options || {};
        const { layerTypeText, LayerTypeToLayerClass } = this._getLayerTypeInfo();

        const layerClass = LayerTypeToLayerClass[layerType];    //获取图层类

        this._validateCustomId(customGroupId);

        if (!this._allLayers[layerType][name]) {
            let layer = new layerClass({    //通过图层类的构造函数进行实例化
                name,
                show: initialShow,
                customGroupId,
                geomap: this.geomap
            })
            layer.layerType = layerType;
            if (layerType === LayerType.TERRAIN) {
                this._allLayers[layerType] = { name: layer };
                console.log("地形图层已超过一个，只有最后加载或者显示的那个才会起作用！");
            } else this._allLayers[layerType][name] = layer;
            layer.on(LayerEventType.CHANGE, (data) => this.fire(LayerManagerEventType.CHANGE, data));

            this.fire(LayerManagerEventType.ADD, layer);
            this.fire(LayerManagerEventType.CHANGE);
            return layer;
        } else {
            throw new DeveloperError(layerTypeText[layerType] + '图层定义了重复名称：' + name);
        }
    }

    /**
     * 创建线图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {LineLayer} 线图层
     * 
     * @example
     * var lineLayer = layerManager.createLineLayer('testLineLayer');
     * 
     */
    createLineLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.LINE, layerName, (customGroupId, initialShow));
    }
    /**
     * 创建面图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {AreaLayer} 面图层
     * 
     * @example
     * var AreaLayer = layerManager.createAreaLayer('testAreaLayer');
     * 
     */
    createAreaLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.AREA, layerName, (customGroupId, initialShow));
    }

    /**
     * 创建地形图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {TerrainLayer} 地形图层
     * 
     * @example
     * var terrainLayer = layerManager.createTerrainLayer('testTerrainLayer');
     * 
     */
    createTerrainLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.TERRAIN, layerName, (customGroupId, initialShow));
    }

    /**
     * 创建点图层
     * 
     * @private
     *  
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {PointLayer} 点图层
     * 
     * @example
     * var pointLayer = layerManager.createPointLayer('testPointLayer');
     * 
     */
    createPointLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.POINT, layerName, (customGroupId, initialShow));
    }

    /**
     * 创建模型图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {ModelLayer} 模型图层
     * 
     * @example
     * var modelLayer = layerManager.createModelLayer('testModelLayer');
     * 
     */
    createModelLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.MODEL, layerName, (customGroupId, initialShow));
    }

    /**
     * 创建GeoJson图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {GeoJsonLayer} GeoJson图层
     * 
     * @example
     * var geoJsonLayer = layerManager.createGeoJsonLayer('testGeoJsonLayer');
     * 
     */
    createGeoJsonLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.GEOJSON, layerName, (customGroupId, initialShow));
    }

    /**
     * 创建WFS图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {WFSLayer} WFS图层
     * 
     * @example
     * var wfsLayer = layerManager.createWFSLayer('testWFSLayer');
     * 
     */
    createWFSLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.WFS, layerName, (customGroupId, initialShow));
    }

    /**
     *  创建kml图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {KMLLayer} kml图层
     * 
     * @example
     * var kmlLayer = layerManager.createKmlLayer('testKMLLayer');
     * 
     */
    createKmlLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.KML, layerName, (customGroupId, initialShow));
    }

    /**
     * 创建几何体图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {GeometryLayer} 几何图层
     * 
     * @example
     * var geometryLayer = layerManager.createGeometryLayer('testGeometryLayer');
     * 
     */
    createGeometryLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.GEOMETRY, layerName, (customGroupId, initialShow));
    }

    /**
     * 创建影像图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {MapLayer} 影像图层
     * 
     * @example
     * var mapLayer = layerManager.createImageryLayer('testMapLayer');
     * 
     */
    createImageryLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.IMAGERY, layerName, (customGroupId, initialShow));
    }

    /**
     * 创建绘制图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {DrawLayer} 绘制图层
     * 
     * @example
     * var drawLayer = layerManager.createDrawLayer('testDrawLayer');
     * 
     */
    createDrawLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.DRAW, layerName, (customGroupId, initialShow));
    }

    /**
     * 创建Cluster图层
     * 
     * @private
     * 
     * @param {String} layerName 图层名称
     * @param {Boolean} initialShow 是否显示
     * @param {String} customGroupId 若使用自定义分组，该图层所在分组的名称
     * @return {ClusterLayer} Cluster图层
     * 
     * @example
     * var clusterLayer = layerManager.createClusterLayer('testClusterLayer');
     * 
     */
    createClusterLayer(layerName, initialShow = true, customGroupId) {
        return this.createLayer(LayerType.CLUSTER, layerName, (customGroupId, initialShow));
    }

    /**
     * 根据图层类型与名称获取对应的图层
     * 
     * @param {layerType} layerType 图层类型
     * @param {String} name 图层名称
     * @return {Layer}
     * 
     * @example
     * var modelLayer = layerManager.getLayer(BOSGeo.LayerType.MODEL, 'testModelLayer');
     * 
     */
    getLayer(layerType, name) {
        let layer = this.getLayerGroup(layerType)[name];
        if (defined(layer)) {
            return layer;
        }
        throw new DeveloperError('没有在该类型下找到对应名称的图层: ' + name);
    }

    /**
     * 获取某种类型的所有图层
     * 
     * @param {LayerType} layerType 图层类型
     * @return {Object} 以图层名称与图层对象构成的键值对对象
     * 
     * @example
     * var modelLayers = layerManager.getLayerGroup(BOSGeo.LayerType.MODEL)
     * 
     */
    getLayerGroup(layerType) {
        return this._allLayers[layerType];
    }

    /**
     * 获取当前图层所有显隐情况
     * 
     * @return {Object}
     * 
     * @example
     * layerManager.getLayerVisibleTree();
     * 
     */
    getLayerVisibleTree() {
        //const {layerTypeText} = this. _getLayerTypeInfo();
        const { TERRAIN, IMAGERY, MODEL, POINT, LINE, GEOMETRY, GEOJSON, WFS, DRAW, CLUSTER, KML,AREA } = LayerType;
        const allLayerTypeInTree = { TERRAIN, IMAGERY, MODEL, POINT, LINE, GEOMETRY, GEOJSON, WFS, CLUSTER, KML,AREA }; //仅这些可以通过tree获取到

        let layerVisibleTree;

        if (this.hasCustomLayerTree()) {
            layerVisibleTree = JSON.parse(JSON.stringify(this._customLayerTree));
            //遍历所有图层
            Object.values(allLayerTypeInTree).forEach((type) => {
                const layers = Object.values(this.getLayerGroup(type));
                layers.forEach((layer) => {
                    //找到需要推送至的分组位置 
                    let targetNode;

                    if (layer.customGroupId !== undefined) {
                        const targetKey = layer.customGroupId;
                      
                        const findTargetNode = (root) => {
                            root.find((childNode) => {
                                if (childNode.id === targetKey) {
                                    targetNode = childNode;
                                    return childNode;
                                }else if(childNode.children && childNode.children.length ){
                                    return findTargetNode(childNode.children)
                                }
                            })
                        }
                        findTargetNode(layerVisibleTree);
                    } else {
                        //无分组信息则：推送至其他
                        targetNode = layerVisibleTree[layerVisibleTree.length - 1]
                    }


                    //将图层页节点创建并推送至分组文字

                    let layerNode = { title: layer.name, parentKey: targetNode.key, show: layer.show, nodeType: 'layer', layerType: type, data: layer, order: layer.order, key: `${targetNode.key}_${layer.name},${type}` };
                    if (type == MODEL) {
                        layerNode.children = layer.getModelVisible().map((m, i) => {
                            layer.getModelByName(m.title).layerInfoForLayerManager.key = `${layerNode.key},${m.title}`;
                            return { ...m, key: `${layerNode.key},${m.title}`, parentKey: layerNode.key, nodeType: 'layerItem', layerType: type, layerName: layerNode.title }
                        });
                    } else if (type == IMAGERY) {
                        layerNode.children = layer.getMapsVisible().map((m, i) => {
                            return { ...m, key: `${layerNode.key},${m.title}`, parentKey: layerNode.key, nodeType: 'layerItem', layerType: type, layerName: layerNode.title }
                        });
                    };
                    targetNode.children.unshift(layerNode);

                })
            })
            if (!layerVisibleTree[layerVisibleTree.length - 1].length) layerVisibleTree.pop();

        } else {
            layerVisibleTree = [{ title: '所有图层', key: '0', nodeType: 'group', children: [] }];
            let targetNode = layerVisibleTree[0];

            //遍历所有图层
            Object.values(allLayerTypeInTree).forEach((type) => {
                const layers = Object.values(this.getLayerGroup(type));
                layers.forEach((layer) => {
                    //将图层页节点创建并推送至分组文字

                    let layerNode = {parent:targetNode, title: layer.name, parentKey: targetNode.key, show: layer.show, nodeType: 'layer', layerType: type, data: layer, order: layer.order, key: `${targetNode.key}_${layer.name},${type}` };
                    if (type == MODEL) {
                        layerNode.children = layer.getModelVisible().map((m, i) => {
                            layer.getModelByName(m.title).layerInfoForLayerManager.key = `${layerNode.key},${m.title}`;
                            return { ...m, key: `${layerNode.key},${m.title}`, parentKey: layerNode.key, nodeType: 'layerItem', layerType: type, layerName: layerNode.title }
                        });
                    } else if (type == IMAGERY) {
                        layerNode.children = layer.getMapsVisible().map((m, i) => {
                            return { ...m, key: `${layerNode.key},${m.title}`, parentKey: layerNode.key, nodeType: 'layerItem', layerType: type, layerName: layerNode.title }
                        });
                    };
                    targetNode.children.unshift(layerNode);

                })
            })

        }


        const findEveryNode = (root, parent) => {
            if (defined(root[0].order)) root.sort((a, b) => a.order - b.order);
            root.forEach((childNode) => {
                if (defined(childNode.key)) {
                    childNode.parent = parent;
                    this._layerTreeKeyToNode[childNode.key] = childNode;
                };
                childNode.children && childNode.children.length && findEveryNode(childNode.children, childNode)
            })
        }
        findEveryNode(layerVisibleTree);

        return layerVisibleTree;

    }

    /**
     * 绑定事件
     * 
     * @param {String | LayerManagerEventType} eventType 图层管理器事件类型
     * @param {Function} callBack 回调函数
     * 
     * @returns {Boolean}
     */
    on(eventType, callBack) {
        (!this.hasOn(eventType, callBack)) && this._listener.on(eventType, callBack);
    }

    /**
     * 触发事件
     * 
     * @param {String} eventType 监听事件
     * @param {*} value 触发事件时可传入任意值
     * 
     */
    fire(eventType, value) {
        this._listener.fire(eventType, value);
    }

    /**
     * 判断该函数是否已绑定该事件
     * 
     * @param {String} eventType 监听事件
     * @param {Function} callBack 回调函数
     * 
     */
    hasOn(eventType, callBack) {
        return this._listener.hasOn(eventType, callBack);
    }

    /**
     * 触发本实例的change事件
     * 
     * @private
     * 
     * @param {undefined|String|Object} customGroupId 
     */
    _validateCustomId(customGroupId) {
        //如果设置了自定义图层分组则需要注明添加至图层分组的哪个节点
        if (this.hasCustomLayerTree()) {
            if (customGroupId === undefined) {
                throw new Error("存在自定义图层组，请指定该图层添加至的图层组id！");
            } else if (typeof customGroupId !== 'string') {
                throw new Error("不存在图层组id：" + customGroupId);
            } else if (!this._customIds.includes(customGroupId)) {
                throw new Error("不存在图层组id：" + customGroupId);
            }
        }
    }

    /**
     * 删除图层
     * @param {LayerType} layerType 图层类型
     * @param {String} name 需要删除的图层名
     * 
     * @example
     * layerManager.removeLayer(BOSGeo.LayerType.MODEL, 'testModelLayer');
     * 
     */
    removeLayer(layerType, name) {
        const layer = this._allLayers[layerType][name];
        delete this._allLayers[layerType][name];
        layer.off('change', this._changeFromLayer);
        layer.destroy();
        this.fire(LayerManagerEventType.REMOVE);
        this.fire(LayerManagerEventType.CHANGE);
    }

    /**
     * 删除图层
     * 
     * @param {Layer} layer 需要删除的图层
     * 
     * @example
     * var modelLayer = layerManager.getLayer(BOSGeo.LayerType.MODEL, 'testModelLayer');
     * layerManager.remove(modelLayer);
     * 
     */
    remove(layer) {
        this.removeLayer(layer.layerType, layer.name);
    }
    /**
     * 删除所有图层
     * 
     */
     removeAll() {
        for (const [layerType, layers] of Object.entries(this._allLayers)) {
            Object.keys(layers).forEach(name => this.removeLayer(layerType, name))
        }
    }
}



export default LayerManager;