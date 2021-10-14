import Layer from "./Layer";
import echarts from 'echarts'
import defaultValue from 'cesium/Core/defaultValue'
import CesiumMath from 'cesium/Core/Math'
import Cartesian3 from "cesium/Core/Cartesian3";
import RegisterCoordinateSystem from "../../geo/utils/RegisterCoordinateSystem"
import LayerEventType from "../constant/LayerEventType";
import LayerType from "../constant/LayerType";


class EchartsLayer extends Layer {
    /**
     * echart图层 
     * @alias EchartsLayer
     * @constructor
     * @param {Viewer} map GeoMap实例对象的viewer属性对象；
     * @param {Object} options 包含以下参数的Object对象；
     * @param {String} [options.name] 图层名称；
     * @param {GeoMap} [options.geomap] GeoMap对象；
     * @param {Boolean} [options.show] 是否显示；
     * @param {String} [options.customGroupId] 若使用自定义分组，该图层所在分组的名称；
     * @param {Object} [options.echartsOption] echart设置。
     * @example
     * let geomap = new BOSGeo.GeoMap('bosgeoContainer');
     let viewer=geomap.viewer;
     let echartsLayer
     BOSGeo.Resource.fetchJson({
    url: 'http://bosgeo-alpha.boswinner.com/geoData/json/weibo.json'
    }).then(weiboData => {
    weiboData = weiboData.map(function (serieData, idx) {
        var px = serieData[0] / 1000;
        var py = serieData[1] / 1000;
        var res = [
            [px, py]
        ];
        for (var i = 2; i < serieData.length; i += 2) {
            var dx = serieData[i] / 1000;
            var dy = serieData[i + 1] / 1000;
            var x = px + dx;
            var y = py + dy;
            res.push([x.toFixed(2), y.toFixed(2), 1]);
            px = x;
            py = y;
        }
        return res;
    });
    let option = {
        GLMap: {roam: true},
        coordinateSystem: 'GLMap',
        title: {
            text: '微博签到数据点亮中国',
            subtext: 'From ThinkGIS',
            sublink: 'http://www.thinkgis.cn/public/sina',
            left: 'center',
            top: 'top',
            textStyle: {
                color: '#fff'
            }
        },
        tooltip: {},
        legend: {
            left: 'left',
            data: ['强', '中', '弱'],
            textStyle: {
                color: '#ccc'
            }
        },
        geo: {
            name: '强',
            type: 'scatter',
            map: 'GLMap',
            label: {
                emphasis: {
                    show: false}
            },
            itemStyle: {
                normal: {
                    areaColor: '#323c48',
                    borderColor: '#111'
                },
                emphasis: {
                    areaColor: '#2a333d'
                }
            }
        },
        series: [{
            name: '弱',
            type: 'scatter',
            coordinateSystem: 'GLMap',
            symbolSize: 1,
            large: true,
            itemStyle: {
                normal: {
                    shadowBlur: 2,
                    shadowColor: 'rgba(37, 140, 249, 0.8)',
                    color: 'rgba(37, 140, 249, 0.8)'
                }
            },
            data: weiboData[0]
        }, {
            name: '中',
            type: 'scatter',
            coordinateSystem: 'GLMap',
            symbolSize: 1,
            large: true,
            itemStyle: {
                normal: {
                    shadowBlur: 2,
                    shadowColor: 'rgba(14, 241, 242, 0.8)',
                    color: 'rgba(14, 241, 242, 0.8)'
                }
            },
            data: weiboData[1]
        }, {
            name: '强',
            type: 'scatter',
            coordinateSystem: 'GLMap',
            symbolSize: 1,
            large: true,
            itemStyle: {
                normal: {
                    shadowBlur: 2,
                    shadowColor: 'rgba(255, 255, 255, 0.8)',
                    color: 'rgba(255, 255, 255, 0.8)'
                }
            },
            data: weiboData[2]
        }]
    }
    echartsLayer = new BOSGeo.EchartsLayer(viewer, {
        echartsOption: option  //echarts 的配置
    })
})
     *
     */
    constructor(map, options) {
        super(options);

        if(!options.echartsOption) throw new DeveloperError("options.echartsOption不可缺少!");
        this._map = map;
        this._show = defaultValue(options.show, true);
        this._overlay = this._createChartOverlay();
        if (options.echartsOption) {
            this._registerMap();
        }
        this._overlay.setOption(options.echartsOption || {});

        if(this._show){
            this._echartsContainer && (this._echartsContainer.style.visibility = "visible");
        }else{
            this._echartsContainer && (this._echartsContainer.style.visibility = "hidden");
        }
    }

    /**
     * Echarts匹配至map地图
     * @private
     * @ignore
     */
    _registerMap() {
        if (!this._isRegistered) {
            echarts.registerCoordinateSystem("GLMap", GLMapCoordSys),
                // echarts.registerCoordinateSystem("GLMap", RegisterCoordinateSystem),
                echarts.registerAction({
                    type: "GLMapRoam", event: "GLMapRoam", update: "updateLayout"
                }, function (t, e) { }),
                echarts.extendComponentModel({
                    type: "GLMap", getBMap: function () {
                        return this.__GLMap
                    },
                    defaultOption: { roam: !1 }
                }),
                echarts.extendComponentView({
                    type: "GLMap",
                    init: function (t, e) {
                        this.api = e, echarts.glMap.postRender.addEventListener(this.moveHandler, this)
                    },
                    moveHandler: function (t, e) {
                        this.api.dispatchAction({ type: "GLMapRoam" })
                    },
                    render: function (t, e, i) { },
                    dispose: function (t) {
                        echarts.glMap.postRender.removeEventListener(this.moveHandler, this)
                    }
                });

            this._isRegistered = true;
        }
    }

    /**
     * 创建echarts叠加图层  基于canvas叠加
     * @private
     * @ignore
     */
    _createChartOverlay() {
        var scene = this._map.scene;
        scene.canvas.setAttribute("tabIndex", 0);
        const ele = document.createElement('div');
        return ele.style.position = "absolute",
            ele.style.top = "0px",
            ele.style.left = "0px",
            ele.style.width = scene.canvas.width + "px",
            ele.style.height = scene.canvas.height + "px",
            ele.style.pointerEvents = "none",
            ele.setAttribute("id", "echarts"),
            ele.setAttribute("class", "echartMap"),
            this._map.container.appendChild(ele),
            this._echartsContainer = ele,
            echarts.glMap = scene,
            this._chart = echarts.init(ele)
        this.resize()
    }

    /**
     * EchartsLayer释放
     */
    dispose() {
        this._echartsContainer && (this._map.container.removeChild(this._echartsContainer),
            this._echartsContainer = null),
            this._overlay && (this._overlay.dispose(), this._overlay = null);
    }

    /**
     * 更新叠加层
     * 
     * @param {Object} options 配置
     * @example
     * let geomap = new BOSGeo.GeoMap('bosgeoContainer');
     * let options = {
     *      echartsOption: {
     *          GLMap: { },
     *          animation: false,
     *          series: [{
     *              name: 'testLine',
     *              type: 'lines',
     *              coordinateSystem: 'GLMap',
     *              zlevel: 2
     *          },
     *          {
     *              type: 'effectScatter',
     *              coordinateSystem: 'GLMap',
     *              zlevel: 2,
     *          }]
     *      }
     * };
     * let echartsLayer = new BOSGeo.EchartsLayer(geomap.viewer, options);
     * let newOptions = {
     *      echartsOption: {
     *          GLMap: { },
     *          animation: true,
     *          series: [{
     *              name: 'testLine',
     *              type: 'lines',
     *              coordinateSystem: 'GLMap',
     *              zlevel: 2
     *          },
     *          {
     *              type: 'effectScatter',
     *              coordinateSystem: 'GLMap',
     *              zlevel: 2,
     *          }]
     *      }
     * };
     * echartsLayer.updateOverlay(newOptions);
     */
    updateOverlay(options) {
        this._overlay && this._overlay.setOption(options);
    }

    /**
     * 获取地图
     */
    getMap() {
        return this._map;
    }

    /**
     * 获取叠加层
     */
    getOverlay() {
        return this._overlay;
    }

    /**
     * 是否显示图层
     * @property {Boolean}
     * @example
     echartsLayer.show = !echartsLayer.show
     */
    get show() {
        return this._show;
    }
    set show(value) {
        if (value) {
            this._echartsContainer && (this._echartsContainer.style.visibility = "visible");
        } else {
            this._echartsContainer && (this._echartsContainer.style.visibility = "hidden");
        }
        this._show = value;
        // this.collection.show = value;
        this.fire(LayerEventType.CHANGE, { toggleShow: true });
        this.geomap.render();
    }

    /**
     * 移除
     * @example
     echartsLayer.remove()
     */
    remove() {
        this._chart.clear();
        if (this._echartsContainer.parentNode)
            this._echartsContainer.parentNode.removeChild(this._echartsContainer);
        this._map = undefined;
    }
    
    /**
     * 重置canvas大小
     */
    resize() {
        const me = this;
        window.onresize = function () {
            const scene = me._map.scene;
            me._echartsContainer.style.width = scene.canvas.style.width;
            me._echartsContainer.style.height = scene.canvas.style.height;
            me._chart.resize();
        }
    }
}



/**
 * echarts与cesium投影匹配
 *
 * @private
 *
 * @param GLMap
 * @param api
 */
function GLMapCoordSys(GLMap, api) {
    this._GLMap = GLMap,
        this.dimensions = ['lng', 'lat'],
        this._mapOffset = [-100, 0],
        this._api = api;
    this.radians = CesiumMath.toRadians(80)
}

GLMapCoordSys.prototype.dimensions = ['lng', 'lat'];

/**
 * 设置偏移量
 *
 * @param mapOffset
 */
GLMapCoordSys.prototype.setMapOffset = function (mapOffset) {
    this._mapOffset = mapOffset
}

/**
 * 获取地图map
 *
 * @returns {*}
 */
GLMapCoordSys.prototype.getBMap = function () {
    return this._GLMap
}

/**
 * 数据转点
 *
 * @param data
 * @returns {*}
 */
GLMapCoordSys.prototype.dataToPoint = function (data) {
    var e = [99999, 99999],
        i = Cartesian3.fromDegrees(data[0], data[1]);
    if (!i) return e;
    var n = this._GLMap.cartesianToCanvasCoordinates(i);
    if (!n) return e;
    return !(Cartesian3.angleBetween(this._GLMap.camera.position, i) > CesiumMath.toRadians(75)) && [n.x - this._mapOffset[0], n.y - this._mapOffset[1]]
}

/**
 * 点转数据
 *
 * @param pt
 * @returns {Array}
 */
GLMapCoordSys.prototype.pointToData = function (pt) {
    var mapOffset = this._mapOffset
    pt = this._bmap.project(
        [pt[0] + mapOffset[0],
            pt[1] + mapOffset[1]]
    )
    return [pt.lng, pt.lat]
}

/**
 * 获取边界范围
 *
 * @returns {BoundingRect}
 */
GLMapCoordSys.prototype.getViewRect = function () {
    var api = this._api
    return new echarts.graphic.BoundingRect(0, 0, api.getWidth(), api.getHeight())
}

/**
 * 获取echarts矩阵
 */
GLMapCoordSys.prototype.getRoamTransform = function () {
    return echarts.matrix.create()
}


GLMapCoordSys.dimensions = GLMapCoordSys.prototype.dimensions;

/**
 * 创建
 *
 * @param ecModel
 * @param api
 */
GLMapCoordSys.create = function (ecModel, api) {
    var coordSys;

    ecModel.eachComponent('GLMap', function (GLMapModel) {
        var viewportRoot = api.getZr().painter.getViewportRoot()
        var GLMap = echarts.glMap;
        coordSys = new GLMapCoordSys(GLMap, api)

        coordSys.setMapOffset(GLMapModel._mapOffset || [0, 0])
        GLMapModel.coordinateSystem = coordSys
    })

    ecModel.eachSeries(function (seriesModel) {
        if (seriesModel.get('coordinateSystem') === 'GLMap') {
            seriesModel.coordinateSystem = coordSys
        }
    })
}
// create();

export default EchartsLayer