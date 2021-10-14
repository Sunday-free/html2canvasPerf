
import CesiumHeatmap from "./Heatmap/CesiumHeatmap.js"


/**
 * 热力图
 * @alias HeatMap
 * @constructor
 * @param {Viewer} viewer GeoMap对象的viewer属性
 * @param {Object} data 数据
 * @param {Object} [bounds] {north, east, south, west} 数据矩形范围
 * @param {Object} [opts] 设置
 * @param {String} [opts.backgroundColor] 背景色
 * @param {Number} [opts.radius] 缓冲半径
 * @param {Number} [opts.opacity] 不透明度
 * @param {Number} [opts.maxOpacity] 最大不透明度
 * @param {Number} [opts.minOpacity] 最小不透明度
 * @param {Number} [opts.blur] 模糊因素将被应用到所有的数据点。模糊因子越高,平滑渐变
 * @param {Number} [opts.xField] 数据点的x坐标
 * @param {Number} [opts.yField] 数据点的y坐标
 * @param {Number} [opts.valueField] 数据点的值
 *
 * @example
 * const data=[
        {
            "x": 147.1383442264,
            "y": -41.4360048372,
            "value": 76
        },
    {
        "x": 147.1384363011,
        "y": -41.4360298848,
        "value": 63
    }]
 * var heatMap = new BOSGeo.HeatMap(geomap.viewer,data);
 */
class HeatMap {

    constructor(viewer, data = null, opts={},bounds = null) {
        this.viewer = viewer;
        this.data = data;
        this.opts={
            backgroundColor:opts.backgroundColor|| "rgba(255,0,0,0)",
            radius: opts.radius||50,
            opacity:opts.opacity||0,
            maxOpacity: opts.maxOpacity||.93,
            minOpacity: opts.minOpacity||0,
            blur: opts.blur||.75,
            xField:opts.xField||'x',
            yField:opts.yField||'y',
            valueField:opts.valueField||'value'
        }
        let xs = data.map(d => d[this.opts.xField])
        let ys = data.map(d => d[this.opts.yField])
        this.bounds=bounds||{
            west: Math.min(...xs),
            south: Math.min(...ys),
            east: Math.max(...xs),
            north: Math.max(...ys)
        };

        this._show =true;
        this.initHeatMap(this.bounds, data, this.opts);
    }

    /**
     * @ignore
     * @param bounds
     * @param data
     * @param opts
     * @example
     *  const data=[
             {
                "x": 147.1383442264,
                "y": -41.4360048372,
                "value": 76
             },
             {
                "x": 147.1384363011,
                "y": -41.4360298848,
                "value": 63
             }];
        var heatMap = new BOSGeo.HeatMap(geomap.viewer,data);
        heatMap.initHeatMap(bounds, data, opts)
     */
    initHeatMap(bounds, data, opts = null) {
        // init heatmap

        let heatMap = CesiumHeatmap.create(
            this.viewer, // your cesium viewer
            bounds, // bounds for heatmap layer
            {
                backgroundColor:opts.backgroundColor|| "rgba(255,0,0,0)",
                radius: opts.radius||50,
                opacity:opts.opacity||0,
                maxOpacity: opts.maxOpacity||.93,
                minOpacity: opts.minOpacity||0,
                blur: opts.blur||.75,
                xField:opts.xField||'x',
                yField:opts.yField||'y',
                valueField:opts.valueField||'value'
            }
        );
        this.heatMap = heatMap
        let values = data.map(d => d[opts.valueField])
        // let values = data.map(d => d.value)
        let valueMin = Math.min(...values);
        let valueMax = Math.max(...values);

        // add data to heatmap
        heatMap.setWGS84Data(valueMin, valueMax, data);
        // 因为大片都是空的啊，所以只是一小块数据,一个坑，如果范围小，会导致绘制出错
        this.viewer.zoomTo(heatMap._layer);

    }

    /**
     * 控制显示隐藏
     * @param {Boolean} flag true为显示，false为隐藏
     * @example
     *  var heatMap = new BOSGeo.HeatMap(geomap.viewer,data);
     *  heatMap.show(flag)
     */
    show(flag) {
        this.heatMap.show(flag)
        this._show=flag
    }

    /**
     * 更新数据源
     * @param {Object} data 数据
     * @example
     *  var heatMap = new BOSGeo.HeatMap(geomap.viewer,data);
     *  heatMap.update(data)
     */
    update(data) {
        let values = data.map(d => d[this.opts.valueField])
        let valueMin = Math.min(...values);
        let valueMax = Math.max(...values);

        // add data to heatmap
        this.heatMap.setWGS84Data(valueMin, valueMax, data);
        // 因为大片都是空的啊，所以只是一小块数据
        this.viewer.zoomTo(this.heatMap._layer);
    }

}
export default HeatMap;

