import Layer from "./Layer";
import ImageryMapType from "../constant/ImageryMapType";
import MapBoxMap from "./imageryLayer/MapBoxMap";
import BingMap from "./imageryLayer/BingMap";
import SimpleImage from "./imageryLayer/SimpleImage";
import UrlTemplateImagery from "./imageryLayer/UrlTemplateImagery";
import ArcGISMap from "./imageryLayer/ArcGISMap";
import OpenStreetMap from "./imageryLayer/OpenStreetMap";
import defined from "../../../cesium/Source/Core/defined";
import WMTSImagery from "./imageryLayer/WMTSImagery";
import WMSImagery from "./imageryLayer/WMSImagery";
import BingMapsStyle from 'cesium/Scene/BingMapsStyle';
import LayerEventType from "../constant/LayerEventType";
import LayerType from "../constant/LayerType";
import { GeoDepository } from "../core/GeoDepository";
import Color from "cesium/Core/Color";
import Rectangle from 'cesium/Core/Rectangle';
import DeveloperError from "cesium/Core/DeveloperError";


class MapLayer extends Layer {
    /**
     * 影像与地图服务图层，可实现天地图、高德、ArcGIS、Google、MapBox、OpenStreetMap、Bing等在线底图和
     * SIMPLEIMAGE（简单图片）、WMS_IMAGE（WMS服务）、WMTS_IMAGE（WMTS服务）、URL_IMAGE（离线瓦片地图服务）的添加、获取、移除和显隐等操作。
     * @alias MapLayer
     * @constructor
     * @extends Layer
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} [options.name] 图层名称；
     * @param {Boolean} [options.show] 是否显示；
     * @param {String} [options.customGroupId] 若使用自定义分组，该图层所在分组的名称。
     * 
     * @example
     * var mapLayer = new BOSGeo.MapLayer({
     *   name: '影像地图1',
     *   show: true,
     *   customGroupId: '图层组1',
     * });
     */
    constructor(options) {
        super(options);
        this._imageryLayers = this.viewer.imageryLayers;
        this._show = options.show;
        this._maps = {};
        this._opacity = 1;
        this.layerType = LayerType.IMAGERY;
        this._color = null;


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
        Object.values(this._maps).forEach((m) => m.mapLayer.show = value);
        this.fire(LayerEventType.CHANGE, { toggleShow: true });
        this.geomap.GeoDepository.scene.requestRender();

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
            Object.values(this._maps).forEach((m) => m.mapLayer && (m.mapLayer.alpha = v));
            this.geomap.GeoDepository.scene.requestRender();
        }
    }

    /**
     * 颜色
     * @property {String}
     */
    get color() {
        return this._color;
    }
    set color(v) {
        this._color = v;
        if (v) {
            let c = Color.fromCssColorString(v);
            c = colorToHSL(c);
            Object.values(this._maps).forEach((m) => {
                m.mapLayer.hue = c.h;
                m.mapLayer.saturation = c.s;
                m.mapLayer.brightness = c.l;

            });
        } else {
            Object.values(this._maps).forEach((m) => {
                m.mapLayer.hue = 0;
                m.mapLayer.saturation = 1;
                m.mapLayer.brightness = 1;

            });
        }
        this.geomap.GeoDepository.scene.requestRender();
    }
     /**
     * 所有影像与地图服务图层
     * @property {BaseMap}
     */
    get maps() {
        return Object.values(this._maps);
    }

    /**
     * 添加一个影像服务
     * 
     * @param {Object} options 包含以下属性的对象
     * @param {ImageryMapType|BaseMap} options.map 影像与地图服务类型或基础地图类；
     * @param {String} [options.baseMapKey] 影像底图类型对应的key或token，如天地图、MapBox、BIYING底图等；若不填则默认使用内置Key
     * @param {String} options.name 若options.map为ImageryMapType.SIMPLEIMAGE时，需要填入简单影像图片名称；
     * @param {String} options.url 若options.map为ImageryMapType.SIMPLEIMAGE时，需要填入简单影像图片地址；
     * @param {Array<Number>} options.extent 若options.map为ImageryMapType.SIMPLEIMAGE时，需要填入简单影像图片范围。
     * @param {Boolean} [options.useCacheDB=false] 是否使用影像缓存
     * @returns {BaseMap} 基础地图类
     * @example
 	 * //Example 1.*****************************添加TDT_IMAGERY***********************************
        var layer = layerManager.createLayer(BOSGeo.LayerType.IMAGERY, "影像图层");
        layer.add({ map: BOSGeo.ImageryMapType.TDT_IMAGERY });        
     * @example
 	 * //Example 2.****************************添加SIMPLEIMAGE *********************************
        var layer = layerManager.createLayer(BOSGeo.LayerType.IMAGERY, "影像图层");
        layer.add({
            map: BOSGeo.ImageryMapType.SIMPLEIMAGE,
            name: "图片a",
            url: "http://bosgeo.boswinner.com/geoData/images/europe_vir_2016_lrg.png",
            extent: [-180, -90, 0, 90]
        });        
     * @example
 	 * //Example 3.***************************添加WMS_IMAGE***********************************
        var layer = layerManager.createLayer(BOSGeo.LayerType.IMAGERY, "影像图层");
        layer.add({
            map: BOSGeo.ImageryMapType.WMS_IMAGE,
            name: "wms",
            url: 'http://bosgeo.bimwinner.com/codex/topp/wms',
            layers: 'topp:tasmania_state_boundaries',
            rectangle: BOSGeo.Rectangle.fromDegrees(143.83482400000003, -43.648056, 148.47914100000003, -39.573891)
        });        
     * @example
 	 * //Example 4.***************************添加WMTS_IMAGE**********************************
        var layer = layerManager.createLayer(BOSGeo.LayerType.IMAGERY, "影像图层");
        layer.add({
            map: BOSGeo.ImageryMapType.WMTS_IMAGE,
            name: "wmts",
            url: "http://bosgeo.bimwinner.com/codex/service/wmts?",
            layer: "RasterImages:fsqcDOM3",
            style: "raster",
            format: "image/png",
            tileMatrixSetID: "EPSG:4326", // 900913
            tileMatrixLabels: [
                "EPSG:4326:0",
                "EPSG:4326:1",
                "EPSG:4326:2",
                "EPSG:4326:3",
                "EPSG:4326:4",
                "EPSG:4326:5",
                "EPSG:4326:6",
                "EPSG:4326:7",
                "EPSG:4326:8",
                "EPSG:4326:9",
                "EPSG:4326:10",
                "EPSG:4326:11",
                "EPSG:4326:12",
                "EPSG:4326:13",
                "EPSG:4326:14",
                "EPSG:4326:15",
                "EPSG:4326:16",
                "EPSG:4326:17",
                "EPSG:4326:18",
                "EPSG:4326:19",
                "EPSG:4326:20",
                "EPSG:4326:21",
            ],
            tilingScheme: new BOSGeo.GeographicTilingScheme()
        });

      
     * @example
 	 * //Example 5.****************************添加URL_IMAGE***********************************
        let imageryLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.IMAGERY, '离线地图服务');
        imageryLayer.add({
            map: BOSGeo.ImageryMapType.URL_IMAGE,
            url: './resource/gmaps/{z}/{x}/{y}.png',
            name: '某某离线地图服务'
        });

      
     * @example
 	 * //Example 6.*************************添加ArcGIS Mapserver服务***********************************
        let layer=layerManager.createLayer(BOSGeo.LayerType.IMAGERY,"ArcGIS Mapserver服务图层");
        layer.add({
            map: BOSGeo.ImageryMapType.ArcGisMapServerImageryProvider,
            name: "ArcGIS Mapserver服务1",
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/",//ArcGIS自然地图
        }); 
     */
    add(options) {
        let map = options.map;
        if (!defined(map)) {
            throw new DeveloperError("请在MapLayer.add方法的参数中定义options.map参数的类型");
        }
        if (!isNaN(map)) {
            switch (map) {                
                case ImageryMapType.SIMPLEIMAGE:	// 简单图形
                    options = Object.assign({
                        extent: [-180, -90, 180, 90],
                    }, options);
                    map = new SimpleImage(options);
                    break;
                case ImageryMapType.WMS_IMAGE:	// WMS服务
                    options = Object.assign({
                        style: 'default',
                        tileMatrixSetID: 'w',
                        format: 'image/png',
                        rectangle: Rectangle.MAX_VALUE,
                        transparent: true,
                        minimumLevel: 0,
                    }, options);
                    map = new WMSImagery(options);
                    break;
                case ImageryMapType.WMTS_IMAGE:	// WMTS服务
                    options = Object.assign({
                        layer: '',
                        format: 'image/jpeg',
                        minimumLevel: 0
                    }, options);
                    map = new WMTSImagery(options);
                    break;
                case ImageryMapType.URL_IMAGE:	// 自定义影像服务图层（离线地图服务）
                    map = new UrlTemplateImagery(options);
                    break;					
				case ImageryMapType.ArcGisMapServerImageryProvider:  // ArcGIS地图服务
                    map = new ArcGISMap(options);
                    break;
                default:
                    map = this._createMap(options);
                    break
            }
        }

        this._imageryLayers.add(map.mapLayer);
        this.geomap.GeoDepository.scene.requestRender();

        this._maps[map._name] = map;
        if (!this.show) map.mapLayer.show = false;
        this.fire(LayerEventType.ADD, map);
        this.fire(LayerEventType.CHANGE);
        return map;
    }

    // /**
    //  * 添加地形服务
    //  * @param {TerrainProvider} terrainProvider 
    //  */
    // addTerrain(terrainProvider) {
    //     this.viewer.terrainProvider = terrainProvider;
    //     GeoDepository.scene.requestRender();
    // }

    /**
     * 移除影像服务
     * 
     * @param {ImageryMapType|BaseMap} map 影像与地图服务类型或基础地图类；
	 * @example
	 	let layer=layerManager.createLayer(BOSGeo.LayerType.IMAGERY,"互联网在线地图服务",{customGroupId:'map'});
        let bingMap = layer.add({
			map: BOSGeo.ImageryMapType.BING_IMAGERY,
			name: "必应影像图"
		});
		setTimeout(()=>{
			layer.remove(bingMap);//移除bing影像图
		},5000)
     */
    remove(map) {
        let layer;
        if (!isNaN(map)) {
            //找到创建的map
            layer = this._getMapByType(map);
            delete this._maps[map]
        } else {
            layer = map.mapLayer;
            delete this._maps[map._name]
        }

        if (defined(layer)) {
            this._imageryLayers.remove(layer);
            this.geomap.GeoDepository.scene.requestRender();
        }
        this.fire(LayerEventType.REMOVE, map);
        this.fire(LayerEventType.CHANGE);
    }

    /**
     * 根据名称获取map
     * 
     * @param {String} name 影像服务名称
     * @return {BaseMap} 基础地图类
     * 
     */
    getMapByName(name) {
        return this._maps[name];
    }

    /**
     * 缩放至本图层
     */
    zoomToLayer() {
        //缩放至该图层中第一个地图
        const map = Object.values(this._maps)[0];
        if (map) {
            this.viewer.zoomTo(map.mapLayer);
        }
    }

    /**
     * 根据名称移除影像服务
     * 
     * @param {String} name 影像服务名称
     */
    removeByName(name) {
        this.remove(this._maps[name]);
    }

    /**
     * 移除该图层所有影像
     */
    removeAll() {
        Object.values(this._maps).forEach(m => {
            this.remove(m);
        })
    }

    /**
     * 根据类型查找图层
     * @private
     * @param {ImageryMapType} type 影像与地图服务类型；
     * @return {Object}
     */
    _getMapByType(type) {
        let layers = this._imageryLayers._layers;
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            let provider = layer._imageryProvider;
            let name = provider._name;
            if (ImageryMapType.equals(type, name)) {
                return layer;
            }
        }
        return null;
    }

    /**
     * 根据类型创建影像图
     * @private
     * @return {BaseMap} 基础地图类
     */
    _createMap(options) {
        let type = options.map;
        let tdt_keys = [
            '39d358c825ec7e59142958656c0a6864',//盈嘉企业开发者秘钥
            //'3669131581c051178afabed885766ac2', //天地图广州---容易出错
            '993470e78cc4324e1023721f57b23640',
            '5f5ced578c88ac399b0691415c56a9d7',
            // 'ed3729dc8ea92ffe87485f68907c6f6e',  ---容易出错          
            //'c1d6b49adb2ba817109873dbc13becb4',---容易出错
        ]

        //随机取值
        let tdt_key = tdt_keys[Math.floor(Math.random() * tdt_keys.length)];
        let layer;
        
        let baseMapKey = options.baseMapKey;

        // 采用此格式的url是为了满足天地图轮询机制的条件
        const BASEMAPURL = {
            TDT_IMG_W: "http://{s}.tianditu.gov.cn/img_w/wmts?service=wmts&request=GetTile&version=1.0.0" +
                "&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}" +
                "&style=default&format=tiles&tk=" + (baseMapKey ? baseMapKey : tdt_key), // 天地图影像底图(墨卡托投影)
            TDT_VEC_W: "http://{s}.tianditu.gov.cn/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0" +
                "&LAYER=vec&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}" +
                "&style=default&format=tiles&tk=" + (baseMapKey ? baseMapKey : tdt_key), // 天地图矢量底图(墨卡托投影)
            TDT_CVA_W: "http://{s}.tianditu.gov.cn/cva_w/wmts?service=wmts&request=GetTile&version=1.0.0" +
                "&LAYER=cva&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}" +
                "&style=default.jpg&tk=" + (baseMapKey ? baseMapKey : tdt_key), // 天地图矢量注记(墨卡托投影)
            TDT_CIA_W: "http://{s}.tianditu.gov.cn/cia_w/wmts?service=wmts&request=GetTile&version=1.0.0" +
                "&LAYER=cia&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}" +
                "&style=default.jpg&tk=" + (baseMapKey ? baseMapKey : tdt_key), // 天地图影像注记(墨卡托投影)
        }

        switch (type) {
            case ImageryMapType.TDT_IMAGERY:
                layer = new WMTSImagery({
                    name: options.name || '天地图影像底图',
                    useCacheDB: options.useCacheDB,
                    // url: "http://t0.tianditu.com/img_w/wmts?tk=" + tdt_key;,
                    url: BASEMAPURL.TDT_IMG_W,
                    layer: 'img',
                    style: 'default',
                    tileMatrixSetID: 'w',
                    format: 'tiles',
                    maximumLevel: 18,
                    subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7']
                });
                break;
            case ImageryMapType.TDT_VECTOR:
                layer = new WMTSImagery({
                    name: options.name || '天地图矢量底图',
                    useCacheDB: options.useCacheDB,
                    // url: "http://t0.tianditu.gov.cn/vec_w/wmts?tk=" + tdt_key,
                    url: BASEMAPURL.TDT_VEC_W,
                    layer: 'vec',
                    style: 'default',
                    tileMatrixSetID: 'w',
                    format: 'tiles',
                    maximumLevel: 18,
                    subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7']
                });
                break;
            case ImageryMapType.TDT_VECANNO:
                layer = new WMTSImagery({
                    name: options.name || '天地图矢量注记',
                    useCacheDB: options.useCacheDB,
                    // url: "http://t0.tianditu.gov.cn/cva_w/wmts?tk=" + tdt_key,
                    url: BASEMAPURL.TDT_CVA_W,
                    layer: 'cva',
                    style: 'default',
                    tileMatrixSetID: 'w',
                    format: 'tiles',
                    maximumLevel: 18,
                    subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7']
                });
                break;
            case ImageryMapType.TDT_IMGANNO:
                layer = new WMTSImagery({
                    name: options.name || '天地图影像注记',
                    useCacheDB: options.useCacheDB,
                    // url: "http://t0.tianditu.gov.cn/cia_w/wmts?tk=" + tdt_key,
                    url: BASEMAPURL.TDT_CIA_W,
                    layer: 'cia',
                    style: 'default',
                    tileMatrixSetID: 'w',
                    format: 'tiles',
                    maximumLevel: 18,
                    subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7']
                });
                break;
            case ImageryMapType.GD_IMAGERY:
                layer = new UrlTemplateImagery({
                    name: options.name || '高德影像底图',
                    useCacheDB: options.useCacheDB,
                    url: "http://webst{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
                    subdomains: ['01', '02', '03', '04']
                });
                break;
            case ImageryMapType.GD_VECTOR:
                layer = new UrlTemplateImagery({
                    name: options.name || '高德矢量底图',
                    useCacheDB: options.useCacheDB,
                    url: "http://webst{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
                    subdomains: ['01', '02', '03', '04']
                });
                break;
            case ImageryMapType.ARCGIS_IMAGERY:
                layer = new ArcGISMap({
                    name: options.name || 'ARCGIS_IMAGERY',
                    useCacheDB: options.useCacheDB,
                    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
                });
                break
            case ImageryMapType.GOOGLE_IMAGERY:
                layer = new UrlTemplateImagery({
                    name: options.name || 'GOOGLE_IMAGERY',
                    useCacheDB: options.useCacheDB,
                    subdomains: ["1", "2", "3"],
                    url: "http://mt{s}.google.cn/vt/lyrs=s&hl=zh-CN&x={x}&y={y}&z={z}&s=Gali"
                })
                break
            case ImageryMapType.OPENSTREET_MAPS:
                layer = new OpenStreetMap({
                    name: options.name || 'OPENSTREET_MAPS',
                    useCacheDB: options.useCacheDB,
                    url: 'https://{s}.tile.openstreetmap.org/',
                    subdomains: ['a', 'b', 'c']
                })
                break
            case ImageryMapType.OPENSTREET_VEC:
                layer = new UrlTemplateImagery({
                    name: options.name || 'OSM矢量',
                    useCacheDB: options.useCacheDB,
                    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    subdomains: ['a', 'b', 'c']
                })
                break
            case ImageryMapType.MAPBOX_IMAGERY:
                layer = new MapBoxMap({
                    name: options.name || 'MapBox',
                    useCacheDB: options.useCacheDB,
                    styleId: 'dark-v9',
                    accessToken: baseMapKey ? baseMapKey : 'pk.eyJ1IjoiaWNoYmFuZ2JhbmdiYW5nIiwiYSI6ImNra2RjM2M3dzA5dWUyb255c2NnZ21jOWsifQ.BXcifDAw7LXBRjyIEpfpDQ'
                })
                break
            case ImageryMapType.BING_IMAGERY:
                layer = new BingMap({
                    name: options.name || '必应影像底图',
                    useCacheDB: options.useCacheDB,
                    url: 'https://dev.virtualearth.net',
                    mapStyle: BingMapsStyle.AERIAL,
                    accessToken: baseMapKey ? baseMapKey : 'Armwi-LEPopf66EnfscXxaazuXLS0XZB2nR9I3JCmvD1YzL5vYvt8nO0X0ptiMDh'
                })
                break
            case ImageryMapType.BING_VEC:
                layer = new BingMap({
                    name: options.name || '必应矢量底图',
                    useCacheDB: options.useCacheDB,
                    url: 'https://dev.virtualearth.net',
                    mapStyle: BingMapsStyle.ROAD,
                    accessToken: baseMapKey ? baseMapKey : 'Armwi-LEPopf66EnfscXxaazuXLS0XZB2nR9I3JCmvD1YzL5vYvt8nO0X0ptiMDh'
                })
                break
            case ImageryMapType.BING_DARK:
                layer = new BingMap({
                    name: options.name || '必应暗黑风格底图',
                    useCacheDB: options.useCacheDB,
                    url: 'https://dev.virtualearth.net',
                    mapStyle: BingMapsStyle.CANVAS_DARK,
                    accessToken: baseMapKey ? baseMapKey : 'Armwi-LEPopf66EnfscXxaazuXLS0XZB2nR9I3JCmvD1YzL5vYvt8nO0X0ptiMDh'
                })
                break
            default:
                throw new Error('无效的影像类型')
        }

        return layer;

    }

    /**
     * 获取图层的显隐信息
     * 
     * @param {String} [name] 若不填则返回所有图层显隐信息
     * @return {Boolean|Array<Object>}
     */
    getMapsVisible(name) {
        if (name) {
            const m = this._maps[name];
            return m && m.mapLayer.show;
        } else {
            const maps = this._maps;
            return Object.keys(maps).map((name) => ({ title: name, show: maps[name].mapLayer.show, data: maps[name].mapLayer }))
        }
    }

    /**
     * 设置影像显隐
     * @param {String} name 影像服务名称
     * @param {Boolean} visible 是否显示
     */
    setMapsVisibleByName(name, visible) {
        this._maps[name].mapLayer.show = visible;
        this.fire(LayerEventType.CHANGE, { toggleShow: true });
    }

    /**
     * 销毁本图层
     */
    destroy() {
        Object.values(this._maps).forEach((m) => this.remove(m));
        this._destroyBaseLayer();
    }
}

const colorToHSL = function (c) {
    const r = c.red;
    const g = c.green;
    const b = c.blue;
    let max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (!max) max = 1;
    const s = (max - min) / max;
    const l = max; //目前设置亮度最大为1.0
    let h;
    if (r == max) {
        h = 4 + (b - g) * 2; //r g-b
    } else if (g == max) {
        h = 2 + (r - b) * 2;//g b-r
    } else if (b == max) {
        h = 6 + (g - r);//b r-g
    }
    return { h, s, l }
}

export default MapLayer;
