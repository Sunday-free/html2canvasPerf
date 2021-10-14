import defaultValue from 'cesium/Core/defaultValue'
import defined from 'cesium/Core/defined'
import CesiumMath from 'cesium/Core/Math'
import Cartesian3 from 'cesium/Core/Cartesian3'
import DeveloperError from 'cesium/Core/DeveloperError'
import PolygonHierarchy from "cesium/Core/PolygonHierarchy";
import Color from 'cesium/Core/Color'
import BoundingSphere from "cesium/Core/BoundingSphere";
import NearFarScalar from "cesium/Core/NearFarScalar.js";
import DistanceDisplayCondition from "cesium/Core/DistanceDisplayCondition";
import Cesium3DTileFeature from 'cesium/Scene/Cesium3DTileFeature'
import ClassificationPrimitive  from 'cesium/Scene/ClassificationPrimitive.js';
import GeometryInstance  from 'cesium/Core/GeometryInstance';
import PolygonGeometry  from 'cesium/Core/PolygonGeometry';
import ColorGeometryInstanceAttribute  from 'cesium/Core/ColorGeometryInstanceAttribute.js';
import ShowGeometryInstanceAttribute  from 'cesium/Core/ShowGeometryInstanceAttribute.js';
import ClassificationType  from 'cesium/Scene/ClassificationType.js';
import PrimitiveCollection  from 'cesium/Scene/PrimitiveCollection.js'
import HeadingPitchRange  from"cesium/Core/HeadingPitchRange";

import * as turf from '@turf/turf'

import {GeoDepository} from "../core/GeoDepository";
import createGuid from "cesium/Core/createGuid";
import FeatureType from "../constant/FeatureType";


/**
 * 红线分析  建筑物红线（退线）分析
 * @param {Object} options 包含以下参数的Object对象：
 * @param {Array<Number>} options.linePosition 红线的坐标集合，[longitude，latitude, height, ...]
 * @param {Boolean} [options.formArray=true] 是否以经度纬度（[longitude，latitude,...]）读取linePosition数组，默认为false,false为以经度纬度高程（[longitude，latitude, height, ...]）读取linePosition数组。
 *  @param {HeadingPitchRoll} [options.hpr ={heading: 2.205646,pitch: -0.399956,roll: 0}] 要观察的位置相机方位角,单位为弧度，默认为{heading: 2.205646,pitch: -0.399956,roll: 0}；
 *  @param {Number} [options.distance =3] 控制的缓冲距离，默认为3；
 *  @param {Number} [options.extrudedHeight =100] 缓冲面拉伸的高度，默认为100。
 *  @example
 *  var backLine = new BOSGeo.BackLineAnalysis({
    linePosition:[115.00787890205515, 39.00950957365, 10.1, 115.00780513629414, 39.00939287572396, 10.1, 115.00845873860158, 39.007961490024464, 10.1],
    distance:10
});
 *
 */
class BackLineAnalysis{
    constructor(options={}){

        if ((!defined(options.linePosition) || options.linePosition.length === 0)) {
            throw new DeveloperError('图形位置(options.linePosition)是必传参数');
        }
        this.hpr = defaultValue(options.hpr ,  {heading: 2.205646,pitch: -0.399956,roll: 0})
        this.linePosition = options.linePosition ;
        this.formArray = defaultValue(options.formArray , false);
        this.distance = defaultValue(options.distance,3);
        this.extrudedHeight = defaultValue(options.extrudedHeight ,100);
        this.overBufferBuild = null;
        this.polyLine = null ;
        this.bufferGraph = null;
        // linePosition = options.linePosition = linePosition.map((p) => Cartesian3.fromDegrees(...p));
        this.clear();
        // scene.layers.find("original").setObjsVisible([47], false);
        this.init(options);
    }

    /**
     * 初始化
     *  @param {Object} options 包含以下参数的Object对象：
     *  @param {Array<Number>} options.linePosition 红线的坐标集合，[longitude，latitude, height, ...]
     *  @param {Boolean} [options.formArray=true] 是否以经度纬度（[longitude，latitude,...]）读取linePosition数组，默认为false,false为以经度纬度高程（[longitude，latitude, height, ...]）读取linePosition数组。
     *  @param {HeadingPitchRoll} [options.hpr] 要观察的位置相机方位角,单位为弧度，默认为{heading: 2.205646,pitch: -0.399956,roll: 0}；
     *  @param {Number} [options.distance =3] 控制的缓冲距离，单位为米，默认为3；
     *  @param {Number} [options.extrudedHeight =100] 缓冲面拉伸的高度，默认为100。
     *  @private
     */
     init(options){
         this.polyLineId = '红线_'+  createGuid() ;
        this.polyLine = new BOSGeo.EntityLayer(
            {name: this.polyLineId ,
                type: 'line',  //线
                color: '#ff0000',
                width: 6,
                position: options.linePosition,
                formArray :this.formArray,});
        // this.polyLine.zoomTo();
        this.polyLine && this.polyLine.feature && GeoDepository.viewer.flyTo(this.polyLine.feature, { duration: 2,offset: new HeadingPitchRange(0.0, -0.39, 0)});
         setTimeout(function() {
             let pTime = 0;
             let pTimeId = setInterval(function() {
                 if(pTime == 5) {
                     clearInterval(pTimeId);
                     this.backLine( options );
                 }
                 this.polyLine && this.polyLine.feature && (this.polyLine.feature.show = ! this.polyLine.feature.show);
                 pTime++;
             }.bind(this), 500)
         }.bind(this), 100);
     }
    /**
     * 退线分析-缓冲线
     *  @param {Object} options 包含以下参数的Object对象：
     *  @param {Array<Number>} options.linePosition 红线的坐标集合，[longitude，latitude, height, ...]
     *  @param {Boolean} [options.formArray=true] 是否以经度纬度（[longitude，latitude,...]）读取linePosition数组，默认为false,false为以经度纬度高程（[longitude，latitude, height, ...]）读取linePosition数组。
     *  @param {HeadingPitchRoll} [options.hpr] 要观察的位置相机方位角,单位为弧度，默认为{heading: 2.205646,pitch: -0.399956,roll: 0}；
     *  @param {Number} [options.distance =3] 控制的缓冲距离，单位为米，默认为3；
     *  @param {Number} [options.extrudedHeight =100] 缓冲面拉伸的高度，默认为100。
     *  @private
     */
    backLine (options) {
		setTimeout(function() {
            this.polyLine && (this.polyLine.show = true);
        }.bind(this), 500);

        let viewer = GeoDepository.viewer;

        //缓冲分析
        let bufferBaseHeight = 0; //缓冲区基础高度
        // let bufferextrudedHeight = 157;  //缓冲区高度

        //只需要经纬度位置
        let centerPositions = [] ;
        if(options.formArray){
            for(let i=0;i < this.linePosition.length -1 ;i++){
                centerPositions.push([this.linePosition[i] , this.linePosition[i+1]])
                i +=1;
            }
        }else{
            for(let i=0;i < this.linePosition.length -2 ;i++){
                centerPositions.push([this.linePosition[i] , this.linePosition[i+1], this.linePosition[i+2]])
                i +=2;
            }
            const h = centerPositions.map(p => p[2]);
            bufferBaseHeight = Number(Math.min(...h));
            // bufferextrudedHeight = Math.max(...h) - Math.min(...h);
        }

        centerPositions = centerPositions.map(p => [p[0],p[1]]);
        //开始通过 turf 计算缓冲区(turf本身是面向二维地图的)
        let turfBuffer, bufferGraph;
        turfBuffer = turf.buffer(turf.lineString(centerPositions), this.distance, {units: 'meters'});

        //通过turf 创建的缓冲区多边形，获取其外轮廓坐标，并用cesium接口绘制出来
        let bufferPositionsWGS84 = turfBuffer.geometry.coordinates[0].map(p => [Number(p[0].toFixed(7)),Number(p[1].toFixed(7)),bufferBaseHeight]);
        let bufferPositions = Cartesian3.fromDegreesArrayHeights(bufferPositionsWGS84.flat());
        this.bufferGraphId= '红线缓冲_' + createGuid();
        let config = {
            id: this.bufferGraphId,
            polygon: {
                hierarchy: new PolygonHierarchy(bufferPositions),
                // hierarchy: Cartesian3.fromDegreesArrayHeights(points),
                extrudedHeight: this.extrudedHeight,
                material: Color.ORANGE.withAlpha(0.5), //Color.fromCssColorString(color).withAlpha(opacity),
                height: bufferBaseHeight||0.1,
                perPositionHeight: true,
                outline: true,
                outlineColor: Color.BLACK,
                outlineWidth: 15.0
            }
        }

        this.bufferGraph = viewer.entities.add(config);

        this.bufferGraph.billboard = undefined;
        if (!this.bufferGraph.position && this.bufferGraph.polygon) {
            var polyPositions = this.bufferGraph.polygon._hierarchy._value.positions;
            var polyCenter = BoundingSphere.fromPoints(polyPositions).center; //获取polygon的几何中心点
            this.bufferGraph.position = polyCenter;
        }

        this.overBufferBuildId = '红线缓冲建筑_' + createGuid();

        let posi = new PolygonHierarchy(bufferPositions);
        this.overBufferBuild = GeoDepository.scene.primitives.add(// 超过缓冲距离部分
            new ClassificationPrimitive({
                geometryInstances: new GeometryInstance({
                    geometry: PolygonGeometry.fromPositions({
                        // positions: new PolygonHierarchy(bufferPositions),
                        positions: posi.positions, //Cartesian3.fromDegreesArrayHeights(bufferPositions),
                        height: bufferBaseHeight,
                        extrudedHeight: this.extrudedHeight
                    }),
                    attributes: {
                        color: ColorGeometryInstanceAttribute.fromColor(
                            // Color.fromAlpha(Color.fromCssColorString(this.highlightColor), this.highlightOpacity)
                            Color.RED.withAlpha(0.8),
                        ),
                        show: new ShowGeometryInstanceAttribute(true)
                    },
                    id: this.overBufferBuildId
                }),
                interleave:true,
                classificationType: ClassificationType.CESIUM_3D_TILE
            })
        )
        this.overBufferBuild.readyPromise.then(buildingPolygon => {
            buildingPolygon.featureType = FeatureType.POLYGON;
        });
        this.createLabel =()=>{
            // this.overBufferBuild.readyPromise.then(overBufferBuild => {
            if (this.overBufferBuild && this.overBufferBuild._primitive && this.overBufferBuild._primitive._pickIds && this.overBufferBuild._primitive._pickIds[0]) {
                for (let i in this.overBufferBuild._primitive._pickIds[0]._pickObjects) {
                    if (this.overBufferBuild._primitive._pickIds[0]._pickObjects[i] instanceof Cesium3DTileFeature) {
                        this.bufferGraph.label = {
                            // position:
                            text: '退线不足' + this.distance + '米',
                            color: Color.fromCssColorString('#fff'),
                            font: 'normal 32px MicroSoft YaHei',
                            showBackground: true,
                            scale: 0.5,
                            scaleByDistance: new NearFarScalar(0, 1.0, 10000, 0.0),
                            distanceDisplayCondition: new DistanceDisplayCondition(0.0, 10000.0),
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        }
                        break;
                    }
                }
            }
            // })
        }
        this.createLabel();
        //提示
        setTimeout(function() {
            this.createLabel();
        }.bind(this),5000);
    }
    /**
     * 清除
     */
    clear(){
        let viewer = GeoDepository.viewer ;
        this.overBufferBuild && (GeoDepository.scene.primitives.remove(this.overBufferBuild) ,this.overBufferBuild =null);
        this.polyLine && this.polyLine.feature && (this.polyLine.removeFromCollection(this.polyLine.feature.entityCollection), this.polyLine=null) ;
        this.bufferGraph = (viewer.entities.remove(this.bufferGraph) ,this.bufferGraph=null) ;
        // this.position && viewer.scene.camera.setView({
        //     destination: new Cartesian3.fromDegrees(this.position),
        //     orientation: this.hpr ,
        // });
    }

}

export default BackLineAnalysis;
