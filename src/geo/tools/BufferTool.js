import Entity from 'cesium/DataSources/Entity';
import destroyObject from 'cesium/Core/destroyObject';
import * as turf from '@turf/turf'
import Color from "cesium/Core/Color";
import ConstantProperty from "cesium/DataSources/ConstantProperty";
import ColorMaterialProperty from "cesium/DataSources/ColorMaterialProperty";
import CustomDataSource from "cesium/DataSources/CustomDataSource";
import defined from "cesium/Core/defined";
import Cartesian3 from "cesium/Core/Cartesian3";
import Check from "cesium/Core/Check";
import PolygonHierarchy from "cesium/Core/PolygonHierarchy";
import FeatureType from '../constant/FeatureType.js';
import GeoMap from "../core/GeoMap";
import GeoUtil from "../utils/GeoUtil";
import HeightReference from "cesium/Scene/HeightReference";



/**
 * 缓冲分析工具
 * @class BufferTool
 * @param {GeoMap} geomap GeoMap对象
 * @example
 * var buftool = new BufferTool(geomap);
 */
class BufferTool {
    constructor(geomap){
        if(geomap instanceof GeoMap){
            this.map = geomap;
            this.dataSource = new CustomDataSource('BufferTool'); //存放多边形结果
            this.map.viewer.dataSources.add(this.dataSource);

            this.buffers = [];
            this._show = true;
            
        }else{
            throw Error("BufferTool.constructor: 请传入正确参数！");
        }
        
    }

    /**
     * 是否可见
     * @property {Boolean} 
     */
    get show(){
        return this._show;
    }
    set show(value) {
        Check.typeOf.bool("value", value);
        if(this.show !== value){
            this._show = value;
            this.dataSource.show = value;
        }
        
    }
    /** 创建缓冲区
     * @param {Point|Line|Area} center 基于点|线|面创建缓冲区
     * @param {Object} options 
     * @param {Number} [options.radius = 500] 缓冲区半径，单位米。
     * @param {String} [options.color = '#ffff00'] 缓冲区颜色
     * @param {Number} [options.opacity = 0.5] 缓冲区不透明度
     * @example
     *  var buftool = new BufferTool();
     *  buftool.createCircleBuffer(center, centerObject, options);
     */
    createBufferPlane(center, options = {}){
        //判断是否支持该类型,判断输入参数
        const {POINT_POINT, LINE_DYNAMIC,LINE_NORMAL,AREA_POLYGON,AREA_CIRCLE} = FeatureType;
        const surportTypes = [POINT_POINT, LINE_DYNAMIC,LINE_NORMAL,AREA_POLYGON,AREA_CIRCLE];
        if(!defined(center) || !surportTypes.includes(center.featureType)){
            throw new Error('BufferTool.createBufferPlane: 请输入正确参数！');
        }
        
        const featureType = center.featureType;
        const {
            radius = 100,
            color = '#ff0000',
            opacity = 0.5
        } = options;
        Check.typeOf.string("color", color);
        Check.typeOf.number.greaterThanOrEquals("opacity", opacity, 0);
        Check.typeOf.number.lessThanOrEquals("opacity", opacity, 1);


        //开始通过 turf 计算缓冲区(turf本身是面向二维地图的)
        let turfBuffer, bufferGraph;
        let bufferBaseHeight = 0; //缓冲区基础高度
        let bufferextrudedHeight = 0;  //缓冲区高度

        //如果是点元素
        if(featureType === POINT_POINT){
           let position = center.positionWGS84;
           bufferBaseHeight = Number(position[2]);
           //只需要经纬度位置
           position = [position[0], position[1]];

           turfBuffer = turf.buffer(turf.point(position), radius, {units: 'meters'});

        }else{//如果是线面元素
           let centerPositions = center.positionsWGS84;
           const h = centerPositions.map(p => p[2]);
           bufferBaseHeight = Number(Math.min(...h));
           bufferextrudedHeight = Math.max(...h) - Math.min(...h);

           //只需要经纬度位置
           centerPositions = centerPositions.map(p => [p[0],p[1]]);
           
           if([LINE_DYNAMIC,LINE_NORMAL].includes(featureType)){
                turfBuffer = turf.buffer(turf.lineString(centerPositions), radius, {units: 'meters'});
           }else if([AREA_POLYGON,AREA_CIRCLE].includes(featureType)){
                turfBuffer = turf.buffer(turf.polygon([centerPositions]), radius, {units: 'meters'});
                if(!turfBuffer) {//如果radius为负值，即内缓冲区小于半径值无法生成时直接返回
                    throw new Error('请设置合理的半径值！')
                    return;
                }
           }
        }

        //通过turf 创建的缓冲区多边形，获取其外轮廓坐标，并用cesium接口绘制出来
        let bufferPositionsWGS84 = turfBuffer.geometry.coordinates[0].map(p => [Number(p[0].toFixed(7)),Number(p[1].toFixed(7)),bufferBaseHeight]);
        let bufferPositions = Cartesian3.fromDegreesArrayHeights(bufferPositionsWGS84.flat());

        let config = {
            polygon: {
                hierarchy: new PolygonHierarchy(bufferPositions),
                material: Color.fromCssColorString(color).withAlpha(opacity),
                height: bufferBaseHeight,
            }
        }
        bufferextrudedHeight && (config.polygon.extrudedHeight = bufferextrudedHeight)
        if(!bufferBaseHeight) {//如果高度为0，则设置贴地
            config.polygon.height = undefined;
            config.polygon.heightReference = HeightReference.CLAMP_TO_GROUND;
        }
        bufferGraph = this.dataSource.entities.add(config);

        //创建buffer对象
        const buffer = new Buffer({
            positions: bufferPositions,
            positionWGS84: bufferPositionsWGS84,
            graph: bufferGraph, 
            baseHeight: bufferBaseHeight,
            height: bufferextrudedHeight + bufferBaseHeight,
            turfBuffer,
            color,
            opacity,
            radius,
            type: FeatureType.BUFFER_PLANE,
            map:this.map
        })
        this.buffers.push(buffer);
        this.map.render();
        return buffer;
        
    }

    /** 创建缓冲球
     * @param {Point} center 基于点
     * @param {Object} options 
     * @param {Number} [options.radius = 500] 半径，单位米。
     * @param {String} [options.color = '#ffff00'] 颜色
     * @param {Number} [options.opacity = 0.5] 不透明度
     * @example
     *  var buftool = new BufferTool();
     *  buftool.createCircleBuffer(center, centerObject, options);
     */
     createBufferBall(center, options = {}){
        //判断是否支持该类型,判断输入参数
        const {POINT_POINT} = FeatureType;
        const surportTypes = [POINT_POINT];
        if(!defined(center) || !surportTypes.includes(center.featureType)){
            throw new Error('BufferTool.createBufferBall: 请输入正确参数！');
        }
        
        const featureType = center.featureType;
        const {
            radius = 500,
            color = '#ffff00',
            opacity = 0.5,
            subdivisions=128,
            fill=true
        } = options;
        Check.typeOf.number.greaterThan("radius", radius, 0);
        Check.typeOf.string("color", color);
        Check.typeOf.number.greaterThanOrEquals("opacity", opacity, 0);
        Check.typeOf.number.lessThanOrEquals("opacity", opacity, 1);


        //计算缓冲区
        let ballBuffer, bufferGraph;

        //如果是点元素
        if(featureType === POINT_POINT){
           ballBuffer = {
               center:center.position,
               centerWGS84:center.positionWGS84,
               radius
           };

        }
        let config = {
            position: ballBuffer.center,
            ellipsoid  :{
                radii : new Cartesian3(ballBuffer.radius, ballBuffer.radius, ballBuffer.radius),
                material: Color.fromCssColorString(color).withAlpha(opacity),
                subdivisions,
                fill
            }
        }
        bufferGraph = this.dataSource.entities.add(config);

        //创建buffer对象
        const buffer = new Buffer({
            type: FeatureType.BUFFER_BALL,
            graph: bufferGraph, 
            ballBuffer,
            color,
            opacity,
            radius,
            map:this.map
        })
        this.buffers.push(buffer);
        this.map.render();
        return buffer;
        
    }
    /**
    * 删除一个缓冲区
    * @param {Buffer} buffer 需要销毁的缓冲区
    */
     remove(buffer){
        this.buffers = this.buffers.filter(b => b != buffer);
        this.dataSource.entities.remove(buffer.graph);
        destroyObject(buffer);
    }
    /**
     * 清空所有缓冲区
     */
    removeAll(){
        [...this.buffers].forEach(b=>this.remove(b));
    }
    /**
     * 销毁缓冲区工具
     */    

    destroy(){
        this.removeAll();
        this.map.viewer.dataSources.remove(this.dataSource);
        destroyObject(this);
    }
}

/**缓冲区类，该类型无法独立创建，只能通过缓冲区工具类BufferTool生成；
 * @class
 */
class Buffer {
    constructor(option){ 
        this.featureType = option.type;

        if(this.featureType === FeatureType.BUFFER_PLANE){
            this.positionWGS84 = option.positionWGS84;
            this.baseHeight = option.baseHeight;
            this.height = option.height;
            this.turfBuffer = option.turfBuffer;
        }else if(this.featureType === FeatureType.BUFFER_BALL){
            this.ballBuffer = option.ballBuffer;
        }
        this.map = option.map;
        this.radius = option.radius;
        this.graph = option.graph;
        this._color = option.color;
        this._opacity = option.opacity;

        this.graph.bosGroup = this;
    }
     /**
     * 不透明度
     * @property {Number}
     */
    get opacity() {
        return this._opacity;
    }
    set opacity(v) {
        Check.typeOf.number.greaterThanOrEquals("opacity", v, 0);
        Check.typeOf.number.lessThanOrEquals("opacity", v, 1);
        if(this.opacity !== v){
            this._opacity = v;
            let material;
            if(this.featureType === FeatureType.BUFFER_PLANE){
                material = this.graph.polygon.material;
                
            }else if(this.featureType === FeatureType.BUFFER_BALL){
                material = this.graph.ellipsoid.material;
            }
            const color = material._color.getValue();
            color.alpha = v;
            material._color.setValue(color);
            this.map.render();
        }
        
    }
    /**
     * 十六进制的颜色字符串
     * @property {String|Color} 
     */
    get color() {
        return this._color;
    }
    set color(v) {
        let color;
        if((typeof(v) !=='string') && !(v instanceof Color)) throw new Error('Point.color: 请输入正确的值！');

        if(v && (this.color !== v)){
            color = (typeof(v) === 'string')? Color.fromCssColorString(v).withAlpha(this.opacity) : v;
            this._color = color.toCssHexString();

            if(this.featureType === FeatureType.BUFFER_PLANE){
                this.graph.polygon.material._color.setValue(color);
            }else if(this.featureType === FeatureType.BUFFER_BALL){
                this.graph.ellipsoid.material._color.setValue(color);
            }
            this.map.render();
        }
    }

   /** 判断是否落在缓冲区内。
    * @param {Array<Number>|Cartesian3} position 坐标位置
    * @return {Boolean}
    * @example
    * //创建地图：geomap
     * //创建点图层：pointLayer
     * //添加点 ：point
     * const bufferTool = new BOSGeo.BufferTool(geomap); 
     * const buffer = bufferTool.createBufferPlane(point);
     * const testPosition = [113,24,0.1]
     * buffer.within(testPosition)
     */
   within(position){
    let isWithin = false;
    if((position instanceof Array) || (position instanceof Cartesian3)){
        if(position instanceof Cartesian3) position = GeoUtil.cartesianToArray(position);

        //普通缓冲区
        if(this.featureType === FeatureType.BUFFER_PLANE){
            //高度是否在范围内
            let { baseHeight, height } = this;
            if((position[2]>=baseHeight) && (position[2]<=height)){
                //经纬度是否在范围内
                isWithin = turf.booleanPointInPolygon(position, this.turfBuffer);
            }
        }
        //球状缓冲区
        else if(this.featureType === FeatureType.BUFFER_BALL){
            const {center, radius} = this.ballBuffer;
            const distance = Cartesian3.distance(position, center);
            isWithin = Boolean(distance <= radius);
        }
        return isWithin;
    }else{
        throw new Error("Buffer.filterWithin: 请传入正确参数！")
    }
       
   }
}

export default BufferTool;