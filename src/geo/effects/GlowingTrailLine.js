
import EchartsLayer from '../layer/EchartsLayer'
import {GeoDepository} from "../core/GeoDepository";

/**
 * 发光尾迹线
 * @alias GlowingTrailLine
 *
 * @param {Object} geoCoordMap  地点坐标字典表 {"上海": [121.4648, 31.2891],"东莞": [113.8953, 22.901]}
 * @param {Array} data      流动数据集合  [
 [{name:'西安'}, {name:'北京',value:100}],
 [{name:'西安'}, {name:'上海',value:100}]]
 * @param {Object} options   echarts配置,参考echarts的'lines'配置，https://echarts.apache.org/zh/option.html#series-lines。
 * @param {String} [options.color='#60ff44'] 可选，发光线颜色，默认为'#60ff44'。
 * @param {String} [options.symbol='arrow'] 可选，飞线的尾迹特效，默认为'none',其它可选"arrow"（箭头）、"plane"（飞机）。
 * @param {Number} [options.symbolSize=6] 可选，飞线的尾迹特效的尺寸，默认为6。
 * @param {Number} [options.width=1] 可选，飞线的宽度，默认为1。
 * @param {Number} [options.trailLength=0] 可选，特效尾迹的长度。取从 0 到 1 的值，数值越大尾迹越长,默认为0。
 * @param {Number} [options.period=5] 可选，特效动画的时间，单位为 s，默认为5。
 * @param {Number} [options.shadowBlur=6] 可选，图形阴影的模糊大小，默认为6。
 * @param {Boolean} [options.show=true] 可选，是否显示，true为显示，false为隐藏，默认为true。
 * @return {EchartsLayer}  返回EchartsLayer图层
 * @example
 var geoCoordMap = {
            "上海": [121.4648, 31.2891],
            "东莞": [113.8953, 22.901],
            "东营": [118.7073, 37.5513],}
 var outData = [
 [{name:'东莞'}, {name:'东营',value:100}],
 [{name:'东莞'}, {name:'上海',value:100}],
 ];
 let outechartsLayer2=new  BOSGeo.GlowingTrailLine(geoCoordMap,outData,
 {color:"#4bff81",
     symbol:'plane',
     symbolSize:10
 })
 */
class GlowingTrailLine{
    constructor(geoCoordMap,data,options){
        let color=options.color||"#60ff44"
        let symbol=options.symbol||"arrow"  //"arrow"、planePath
        let symbolSize=options.symbolSize||6
        this.layers=[]
        this.echartsLayer=null

        //城市坐标字典表
        this.geoCoordMap =geoCoordMap|| {
            "上海": [121.4648, 31.2891],
            "东莞": [113.8953, 22.901],
            "东营": [118.7073, 37.5513],
            "中山": [113.4229, 22.478],
            "临汾": [111.4783, 36.1615],
            "临沂": [118.3118, 35.2936],
            "丹东": [124.541, 40.4242],
            "丽水": [119.5642, 28.1854],
            "乌鲁木齐": [87.9236, 43.5883],
            "佛山": [112.8955, 23.1097],
            "保定": [115.0488, 39.0948],
            "兰州": [103.5901, 36.3043],
            "包头": [110.3467, 41.4899],
            "北京": [116.4551, 40.2539],
            "北海": [109.314, 21.6211],
            "南京": [118.8062, 31.9208],
            "南宁": [108.479, 23.1152],
            "南昌": [116.0046, 28.6633],
            "赣州": [116.0046, 25.6633],
            "南通": [121.1023, 32.1625],
            "厦门": [118.1689, 24.6478],
            "台州": [121.1353, 28.6688],
            "合肥": [117.29, 32.0581],
            "呼和浩特": [111.4124, 40.4901],
            "咸阳": [108.4131, 34.8706],
            "哈尔滨": [127.9688, 45.368],
            "唐山": [118.4766, 39.6826],
            "嘉兴": [120.9155, 30.6354],
            "大同": [113.7854, 39.8035],
            "大连": [122.2229, 39.4409],
            "天津": [117.4219, 39.4189],
            "太原": [112.3352, 37.9413],
            "威海": [121.9482, 37.1393],
            "宁波": [121.5967, 29.6466],
            "宝鸡": [107.1826, 34.3433],
            "宿迁": [118.5535, 33.7775],
            "宿州": [117.5535, 33.7775],
            "常州": [119.4543, 31.5582],
            "广州": [113.5107, 23.2196],
            "廊坊": [116.521, 39.0509],
            "延安": [109.1052, 36.4252],
            "张家口": [115.1477, 40.8527],
            "徐州": [117.5208, 34.3268],
            "德州": [116.6858, 37.2107],
            "惠州": [114.6204, 23.1647],
            "成都": [103.9526, 30.7617],
            "扬州": [119.4653, 32.8162],
            "承德": [117.5757, 41.4075],
            "拉萨": [91.1865, 30.1465],
            "无锡": [120.3442, 31.5527],
            "日照": [119.2786, 35.5023],
            "昆明": [102.9199, 25.4663],
            "杭州": [119.5313, 29.8773],
            "枣庄": [117.323, 34.8926],
            "曲阜": [117.323, 35.8926],
            "柳州": [109.3799, 24.9774],
            "株洲": [113.5327, 27.0319],
            "武汉": [114.3896, 30.6628],
            "汕头": [117.1692, 23.3405],
            "江门": [112.6318, 22.1484],
            "沈阳": [123.1238, 42.1216],
            "沧州": [116.8286, 38.2104],
            "河源": [114.917, 23.9722],
            "泉州": [118.3228, 25.1147],
            "泰安": [117.0264, 36.0516],
            "泰州": [120.0586, 32.5525],
            "济南": [117.1582, 36.8701],
            "济宁": [116.8286, 35.3375],
            "海口": [110.3893, 19.8516],
            "淄博": [118.0371, 36.6064],
            "淮安": [118.927, 33.4039],
            "深圳": [114.5435, 22.5439],
            "清远": [112.9175, 24.3292],
            "温州": [120.498, 27.8119],
            "渭南": [109.7864, 35.0299],
            "湖州": [119.8608, 30.7782],
            "湘潭": [112.5439, 27.7075],
            "滨州": [117.8174, 37.4963],
            "潍坊": [119.0918, 36.524],
            "烟台": [120.7397, 37.5128],
            "玉溪": [101.9312, 23.8898],
            "珠海": [113.7305, 22.1155],
            "盐城": [120.2234, 33.5577],
            "盘锦": [121.9482, 41.0449],
            "石家庄": [114.4995, 38.1006],
            "福州": [119.4543, 25.9222],
            "秦皇岛": [119.2126, 40.0232],
            "绍兴": [120.564, 29.7565],
            "聊城": [115.9167, 36.4032],
            "肇庆": [112.1265, 23.5822],
            "舟山": [122.2559, 30.2234],
            "苏州": [120.6519, 31.3989],
            "莱芜": [117.6526, 36.2714],
            "菏泽": [115.6201, 35.2057],
            "营口": [122.4316, 40.4297],
            "葫芦岛": [120.1575, 40.578],
            "衡水": [115.8838, 37.7161],
            "衢州": [118.6853, 28.8666],
            "西宁": [101.4038, 36.8207],
            "西安": [109.1162, 34.2004],
            "贵阳": [106.6992, 26.7682],
            "连云港": [119.1248, 34.552],
            "邢台": [114.8071, 37.2821],
            "邯郸": [114.4775, 36.535],
            "郑州": [113.4668, 34.6234],
            "鄂尔多斯": [108.9734, 39.2487],
            "重庆": [107.7539, 30.1904],
            "金华": [120.0037, 29.1028],
            "铜川": [109.0393, 35.1947],
            "银川": [106.3586, 38.1775],
            "镇江": [119.4763, 31.9702],
            "长春": [125.8154, 44.2584],
            "长沙": [113.0823, 28.2568],
            "长治": [112.8625, 36.4746],
            "阳泉": [113.4778, 38.0951],
            "青岛": [120.4651, 36.3373],
            "韶关": [113.7964, 24.7028]
        };

        this.data=data;
        this.options=options
        if(this.data){
            this.create(this.geoCoordMap,this.data,this.options)
        }
        else{
            throw new DeveloperError('(data为必传项');
        }

    }


    /**
     * 用例创建
     * @param {Object} geoCoordMap  地点坐标字典表 {"上海": [121.4648, 31.2891],}
     * @param {Array} data      流动数据集合
     * @param {Object} options   echarts配置,参考echarts的'lines'配置
     * @return {EchartsLayer}  返回EchartsLayer图层
     * @private
     * @ignore
     */
    create(geoCoordMap,data,options) {
        let outOption={}
        outOption.echartsOption = this.getOption(geoCoordMap,data,options);

        if(outOption.echartsOption){
            let outechartsLayer=new  EchartsLayer(GeoDepository.viewer, outOption);
            this.echartsLayer= outechartsLayer
            return outechartsLayer
        }

        // var outData = [
        //     [{name:'西安'}, {name:'北京',value:100}],
        //     [{name:'西安'}, {name:'上海',value:100}],
        //     [{name:'西安'}, {name:'银川',value:100}]
        // ];
        // let outOption = getOption(geoCoordMap,outData,{color:"#ffc465",symbol:planePath,symbolSize:10});
        // if(outOption){
        //     let outechartsLayer=new  EchartsLayer(viewer, outOption);
        // }
        //
        // var inData =[
        //     [{name: "北京", value: 100}, {name: "无锡"}],
        //     [{name: "上海", value: 30}, {name: "无锡"}],
        //     [{name: "合肥", value: 30}, {name: "无锡"}]];
        // let inOption = this.getOption(geoCoordMap,inData);
        // if(inOption){
        //     this.echartsLayer=new EchartsLayer(viewer, inOption);
        // }
    }

    /**
     * 将数据起止点成对组织
     * @param {Array} data      流动数据集合
     * @returns {Array}
     * @private
     * @ignore
     */
    convertData(data) {
        let geoCoordMap=this.geoCoordMap
        let res=[]
        var fromCoord
        var toCoord
        data.map(v => {
            fromCoord = geoCoordMap[v[0].name];
            toCoord = geoCoordMap[v[1].name];
            if (fromCoord && toCoord) {
                res.push({
                    fromName: v[0].name,
                    toName: v[1].name,
                    coords: [fromCoord, toCoord],
                    value: v[1].value
                });
            }
        })
        return res
    }

    /**
     * 配置echarts
     * @ignore
     * @param {Object} geoCoordMaps  地点坐标字典表 {"上海": [121.4648, 31.2891],}
     * @param {Array} datas      流动数据集合
     * @param {Object} options   echarts配置,参考echarts的'lines'配置，https://echarts.apache.org/zh/option.html#series-lines。
     * @param {String} [options.color='#60ff44'] 可选，发光线颜色，默认为'#60ff44'。
     * @param {String} [options.symbol='arrow'] 可选，飞线的尾迹特效，默认为'none',其它可选"arrow"、"plane"。
     * @param {Number} [options.symbolSize=6] 可选，飞线的尾迹特效的尺寸，默认为6。
     * @param {Number} [options.width=1] 可选，飞线的宽度，默认为1。
     * @param {Number} [options.trailLength=0] 可选，特效尾迹的长度。取从 0 到 1 的值，数值越大尾迹越长，默认为0。
     * @param {Number} [options.period=5] 可选，特效动画的时间，单位为 s，默认为5。
     * @param {Number} [options.shadowBlur=6] 可选，图形阴影的模糊大小，默认为6。
     * @param {Boolean} [options.show=true] 可选，是否显示，true为显示，false为隐藏，默认为true。
     * @returns {}
     * @private
     * @ignore
     */
    getOption(geoCoordMaps,datas,options) {
        if(!geoCoordMaps){
            return
        }
        let option;
        if(!options){
            options={}
        }
        //飞机
        let planePath = 'path://M1705.06,1318.313v-89.254l-319.9-221.799l0.073-208.063c0.521-84.662-26.629-121.796-63.961-121.491c-37.332-0.305-64.482,36.829-63.961,121.491l0.073,208.063l-319.9,221.799v89.254l330.343-157.288l12.238,241.308l-134.449,92.931l0.531,42.034l175.125-42.917l175.125,42.917l0.531-42.034l-134.449-92.931l12.238-241.308L1705.06,1318.313z';

        let color=options.color||"#60ff44"
        let symbol=options.symbol ||"none"  //"arrow"、planePath
        options.symbol=='plane'&&(symbol=planePath)
        let show=options.show||true
        let symbolSize=options.symbolSize||6
        let width=options.width||1
        let trailLength=options.trailLength||0
        let period=options.period||5
        let shadowBlur=options.shadowBlur||6
        //设置Line和Point的颜色
        let LineColor =  ['#ff3333','orange','lime','aqua'];
        var inSeries = [];
        var igeoCoordMap=geoCoordMaps;
        var idata =[];
        var datac=[];
        idata.push("");
        idata.push(datas);
        datac.push(idata);
        if(!datac){
            return
        }
        let that=this

        datac.forEach(function (e, a) {
            inSeries.push({
                //tooltip的名称
                name: e[2],
                type: "lines",
                coordinateSystem: "GLMap",
                //组件所在的层
                zlevel: 2,
                //飞线的尾迹特效
                effect: {
                    show: show,
                    period: period,
                    trailLength: trailLength,
                    symbol: symbol,
                    // symbol: planePath,
                    symbolSize: symbolSize
                },
                //飞线的线条样式
                lineStyle: {
                    normal: {
                        shadowColor: '#fff',
                        shadowBlur: shadowBlur,
                        color: color,
                        width: width,
                        opacity: .5,
                        trailLength: 0.5,
                        curveness: .2
                    }
                },
                silent: true,
                blendMode: 'lighter',
                //配置数据或者单独的样式
                //https://www.echartsjs.com/zh/option-gl.html#series-lines3D.data
                data: that.convertData(e[1])
                //     function (e) {
                //     for (var a = [], n = 0; n < e.length; n++) {
                //         var t = e[n], r = igeoCoordMap[t[0].name], o = igeoCoordMap[t[1].name];
                //         r && o && a.push({fromName: t[0].name, toName: t[1].name, coords: [r, o]})
                //     }
                //     return a
                // }(e[1])
            }, {
                type: "effectScatter",
                coordinateSystem: "GLMap",
                zlevel: 2,
                rippleEffect: {brushType: "stroke"},
                label: {normal: {show: !0, position: "right", formatter: "{b}"}},
                symbolSize: function (e) {
                    return 3 + e[2] / 10
                },
                itemStyle: {normal: {color: color}},
                data: e[1].map(function (dataItem) {
                    return {
                        name: dataItem[0].name,
                        value: igeoCoordMap[dataItem[0].name].concat([dataItem[0].value])
                    }
                })
            })
            inSeries.push({
                type: "effectScatter",
                coordinateSystem: "GLMap",
                zlevel: 2,
                rippleEffect: {brushType: "stroke"},
                label: {normal: {show: !0, position: "right", formatter: "{b}"}},
                symbolSize: function (e) {
                    return 3 + e[2] / 10
                },
                itemStyle: {normal: {color: color}},
                data: e[1].map(function (dataItem) {
                    return {
                        name: dataItem[1].name,
                        value: igeoCoordMap[dataItem[1].name].concat([dataItem[1].value])
                    }
                })
            })
        });

        option = {
            animation: !1,
            GLMap: {},
            series: inSeries
        };

        return option;
    }
}

export default GlowingTrailLine