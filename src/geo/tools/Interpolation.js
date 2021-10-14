import PolygonGeometry from "cesium/Core/PolygonGeometry.js";
import createGuid from 'cesium/Core/createGuid'
// import {BaseLayer} from "./BaseLayer";
import defined from 'cesium/Core/defined';
import {GeoDepository} from "../core/GeoDepository";
import SingleTileImageryProvider from "cesium/Scene/SingleTileImageryProvider";
import Rectangle from 'cesium/Core/Rectangle';
import CesiumMath from 'cesium/Core/Math';
import kriging from 'cesium/ThirdParty/kriging';
import PolygonHierarchy from "cesium/Core/PolygonHierarchy.js";
import Cartesian3 from "cesium/Core/Cartesian3";

/**
 * kriging插值
 */
class Interpolation {
    /**
     * @param options   echarts配置
     * @param {Object} options.points 数据点集合。
     * @param {Array} [options.colors=['#60ff44',"#01A600"]] 颜色条带。
     * @param {Array} options.bounds 范围。
     * @param {Array} [options.lngRange=[73.4766, 135.088]] 经度最大最小范围。
     * @param {Array} [options.latRange=[18.1055, 53.5693]] 纬度最大最小范围。
     * @param {String} [options.weight='weight'] 统计的value值，默认为'weight'。
     * @param {String} [options.x='x'] 统计的经度字段名，默认为'x'。
     * @param {String} [options.y='y'] 统计的纬度字段名，默认为'y'。
     * @param {Number} [options.gridDistance=0.005] 地图栅格分辨率，单位度。
     * @param {Number} [options.canvasWidth=2000] 插值图宽度。
     * @param {Number} [options.canvasHeight=2000] 插值图高度。
     * @param {Number} [options.opacity=0] 插值图层不透明度。
     * @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
     */
    constructor(options){
        options = options || {};

        if (!defined(options.points)) {
            throw new DeveloperError('插值点(options.points)是必传参数');
        }
        if (!defined(options.bounds)) {
            throw new DeveloperError('插值面边界(options.bounds)是必传参数');
        }
        if (options.points.length < 1) {
            throw new DeveloperError('插值点(options.points)不能为空');
        }
        // BaseLayer.call(this, options);
        this.points = options.points
        this.bounds = options.bounds
        this.valueName = options.weight || 'weight'
        this.x = options.x || 'x'
        this.y = options.y || 'y'
        this._opacity = options.opacity || 0
        this.model = options.model || 'exponential' // gaussian  exponential  spherical
        this.canvasWidth = options.canvasWidth || 2000
        this.canvasHeight = options.canvasHeight || 2000
        this.lngRange = options.lngRange || [73.4766, 135.088]
        this.latRange = options.latRange || [18.1055, 53.5693]
        this.rectangle = {}
        this.gridDistance = options.gridDistance || 0.005
        this._canvas = ''
        this._canvasId = options.id || createGuid();
        this.type = 'interpolation';
        this.colors = options.colors || ["#00A600", "#01A600", "#03A700", "#04A700", "#05A800", "#07A800", "#08A900", "#09A900", "#0BAA00", "#0CAA00", "#0DAB00", "#0FAB00", "#10AC00", "#12AC00", "#13AD00", "#14AD00", "#16AE00", "#17AE00", "#19AF00", "#1AAF00", "#1CB000", "#1DB000", "#1FB100", "#20B100", "#22B200", "#23B200", "#25B300", "#26B300", "#28B400", "#29B400", "#2BB500", "#2CB500", "#2EB600", "#2FB600", "#31B700", "#33B700", "#34B800", "#36B800", "#37B900", "#39B900", "#3BBA00", "#3CBA00", "#3EBB00", "#3FBB00", "#41BC00", "#43BC00", "#44BD00", "#46BD00", "#48BE00", "#49BE00", "#4BBF00", "#4DBF00", "#4FC000", "#50C000", "#52C100", "#54C100", "#55C200", "#57C200", "#59C300", "#5BC300", "#5DC400", "#5EC400", "#60C500", "#62C500", "#64C600", "#66C600", "#67C700", "#69C700", "#6BC800", "#6DC800", "#6FC900", "#71C900", "#72CA00", "#74CA00", "#76CB00", "#78CB00", "#7ACC00", "#7CCC00", "#7ECD00", "#80CD00", "#82CE00", "#84CE00", "#86CF00", "#88CF00", "#8AD000", "#8BD000", "#8DD100", "#8FD100", "#91D200", "#93D200", "#95D300", "#97D300", "#9AD400", "#9CD400", "#9ED500", "#A0D500", "#A2D600", "#A4D600", "#A6D700", "#A8D700", "#AAD800", "#ACD800", "#AED900", "#B0D900", "#B2DA00", "#B5DA00", "#B7DB00", "#B9DB00", "#BBDC00", "#BDDC00", "#BFDD00", "#C2DD00", "#C4DE00", "#C6DE00", "#C8DF00", "#CADF00", "#CDE000", "#CFE000", "#D1E100", "#D3E100", "#D6E200", "#D8E200", "#DAE300", "#DCE300", "#DFE400", "#E1E400", "#E3E500", "#E6E600", "#E6E402", "#E6E204", "#E6E105", "#E6DF07", "#E6DD09", "#E6DC0B", "#E6DA0D", "#E6D90E", "#E6D710", "#E6D612", "#E7D414", "#E7D316", "#E7D217", "#E7D019", "#E7CF1B", "#E7CE1D", "#E7CD1F", "#E7CB21", "#E7CA22", "#E7C924", "#E8C826", "#E8C728", "#E8C62A", "#E8C52B", "#E8C42D", "#E8C32F", "#E8C231", "#E8C133", "#E8C035", "#E8BF36", "#E9BE38", "#E9BD3A", "#E9BC3C", "#E9BB3E", "#E9BB40", "#E9BA42", "#E9B943", "#E9B945", "#E9B847", "#E9B749", "#EAB74B", "#EAB64D", "#EAB64F", "#EAB550", "#EAB552", "#EAB454", "#EAB456", "#EAB358", "#EAB35A", "#EAB35C", "#EBB25D", "#EBB25F", "#EBB261", "#EBB263", "#EBB165", "#EBB167", "#EBB169", "#EBB16B", "#EBB16C", "#EBB16E", "#ECB170", "#ECB172", "#ECB174", "#ECB176", "#ECB178", "#ECB17A", "#ECB17C", "#ECB17E", "#ECB27F", "#ECB281", "#EDB283", "#EDB285", "#EDB387", "#EDB389", "#EDB38B", "#EDB48D", "#EDB48F", "#EDB591", "#EDB593", "#EDB694", "#EEB696", "#EEB798", "#EEB89A", "#EEB89C", "#EEB99E", "#EEBAA0", "#EEBAA2", "#EEBBA4", "#EEBCA6", "#EEBDA8", "#EFBEAA", "#EFBEAC", "#EFBFAD", "#EFC0AF", "#EFC1B1", "#EFC2B3", "#EFC3B5", "#EFC4B7", "#EFC5B9", "#EFC7BB", "#F0C8BD", "#F0C9BF", "#F0CAC1", "#F0CBC3", "#F0CDC5", "#F0CEC7", "#F0CFC9", "#F0D1CB", "#F0D2CD", "#F0D3CF", "#F1D5D1", "#F1D6D3", "#F1D8D5", "#F1D9D7", "#F1DBD8", "#F1DDDA", "#F1DEDC", "#F1E0DE", "#F1E2E0", "#F1E3E2", "#F2E5E4", "#F2E7E6", "#F2E9E8", "#F2EBEA", "#F2ECEC", "#F2EEEE", "#F2F0F0", "#F2F2F2"]

        this._show=true;
        this.calExten(this.bounds)
        this.init()
        this.loadkriging()
        this.addInterpolation(this.rectangle);
    }

    /**
     * 初始化
     * @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
        interpolation.init();
     */
    init() {
        let isExist = document.getElementById(this._canvasId);
        this._canvas = isExist ? isExist : document.createElement("CANVAS"); // 多次刷新插值面的时候一定要设置唯一id
        if (!isExist) document.body.appendChild(this._canvas);
        this._canvas.id = this._canvasId;
        this._canvas.style.display = 'none';
        this._canvas.width = this.canvasWidth;
        this._canvas.height = this.canvasHeight;
    }

    /**
     * 根据范围数据生成范围矩形点位置
     * @param {Array} bounds 范围数据
     * @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
        interpolation.calExten(bounds);
     */
    calExten(bounds){

        let newBounds=[]
        for (let k in bounds){
            if (typeof bounds[k][0] == 'object') {
                for (let h in bounds[k]){
                    if (typeof bounds[k][h][0] !== 'object'){
                        newBounds.push(bounds[k][h][0])
                        newBounds.push(bounds[k][h][1])
                    }
                    // else{
                    // }
                }
            }else {
                newBounds.push(bounds[k][0])
                newBounds.push(bounds[k][1])
            }
        }

        let extent =PolygonGeometry.computeRectangle ( {
            polygonHierarchy: new PolygonHierarchy (
                Cartesian3.fromDegreesArray ( newBounds )
            )
        } );//范围（弧度）
        this.extent=extent
        let minx = CesiumMath.toDegrees ( extent.west );//转换为经纬度
        let miny = CesiumMath.toDegrees ( extent.south );
        let maxx = CesiumMath.toDegrees ( extent.east );
        let maxy = CesiumMath.toDegrees ( extent.north );
        this.lngRange=[minx,maxx],this.latRange=[miny,maxy]
        this.rectangle = {rangs: [minx, miny, maxx, maxy]}
    }


    /**
     * 生成kriging插值图
     * @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
        interpolation.loadkriging();
     */
    loadkriging () {
        let n = this.points.length;
        let t = [];
        let x = [];
        let y = [];
        for (let i = 0; i < n; i++) {
            let weight = this.points[i][this.valueName];
            t.push(weight); // 权重值
            x.push(this.points[i][this.x]); // x
            y.push(this.points[i][this.y]); // y
        }
        let variogram = kriging.train(t, x, y, this.model, 0, 100);

        let grid = kriging.grid(this.bounds, variogram, this.gridDistance);

        kriging.plot(this._canvas, grid, this.lngRange, this.latRange, this.colors);
    }
    /**
     *生成瓦片图片
     * @returns {String} 瓦片图片字符串
     * @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
        let img = interpolation.returnImgae();
     */
    returnImgae () {
        let mycanvas = document.getElementById(this._canvasId);
        return mycanvas.toDataURL("image/png");
    }

    /**
     *添加到地图
     * @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
        let feature = interpolation.addInterpolation();
     */
    addInterpolation() {
        // this.rectangle = rectangle;
        // let rangs = rectangle.rangs;
        this.feature = GeoDepository.viewer.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
            url: this.returnImgae(),
            rectangle: new Rectangle(
                // CesiumMath.toRadians(rangs[0]),
                // CesiumMath.toRadians(rangs[1]),
                // CesiumMath.toRadians(rangs[2]),
                // CesiumMath.toRadians(rangs[3])
                CesiumMath.toRadians(this.lngRange[0]),
                CesiumMath.toRadians(this.latRange[0]),
                CesiumMath.toRadians(this.lngRange[1]),
                CesiumMath.toRadians(this.latRange[1])
            )
        }));
        this.feature.alpha = this._opacity
        return this.feature
    }
    /**
     * 是否显示
     * @property {Boolean}
     */
    get show(){
        return this._show;
    }
    set show(v) {
        this.feature && (this.feature.show = v);
        this._show = v;
        GeoDepository.scene.requestRender();
    };
    /**
     * 透明度,范围为0-1。
     * @property {Number}
     * @example
     primitiveSZ.opacity=0.5;
     */
    get opacity() {
        return this._opacity;
    }

    set opacity(v) {
        if (isNaN(v) || (v < 0) || (v > 1)) {
            console.error('请传入大于等于0，小于等于1的数值！');
        } else {
            this.feature.alpha = v ;
            this._opacity = v;
        }
        GeoDepository.scene.requestRender();
    }
    /**
     *更新数据与范围
     * @param {Array} points 点合集
     * @param {Array} bounds 边界范围
     * @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
        interpolation.setData(points, bounds);
     */
    setData(points, bounds) {
        this.points = points;
        this.bounds = bounds;
        this.loadkriging();
        this.feature && GeoDepository.viewer.imageryLayers.remove(this.feature);
        this.addInterpolation(this.rectangle);
    }

    /**
     * 缩放至本图层
     * @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
        interpolation.zoomTo();
     */
    zoomTo(){
        this.extent && GeoDepository.viewer.camera.flyTo({
            destination: this.extent,
        });
    }
    /**
     *  支持layerCollection中的移除方法
     *  @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
        interpolation.removeFromCollection();
     */
    removeFromCollection() {
        this.remove();
    }

    /**
     * 添加前移除
     * @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
        interpolation.remove();
     */
    remove() { //
        GeoDepository.viewer.imageryLayers.remove(this.feature);
    }

    /**
     *设置显隐
     * @param {Boolean} val 设置显隐,false为隐藏
     * @example
     *  let interpolation = new BOSGeo.Interpolation({   //kriging插值
            points: point, //数据点集合。
            bounds: bounds, //边界范围,存在时，lngRange、latRange不起作用。
            lngRange: [113.748, 114.624],//经度最大最小范围。
            latRange: [22.4, 22.859],//纬度最大最小范围。
            opacity: 0.8,  // 插值图层不透明度。
            gridDistance : 0.002 //地图栅格分辨率，单位度。
        });
        interpolation.setVisible(true);
     */
    setVisible(val) {
        // val ? this.feature.alpha = this._opacity : this.feature.alpha = 0;
        this.feature.show=val;
        this._show=val;
    }
}


export default Interpolation;