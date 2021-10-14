

import defined from "cesium/Core/defined";
import Cartesian3 from "../../../cesium/Source/Core/Cartesian3";
import Cartesian2 from "../../../cesium/Source/Core/Cartesian2";
import Matrix4 from "../../../cesium/Source/Core/Matrix4";
import Matrix3 from "../../../cesium/Source/Core/Matrix3";
import Cesium3DTileFeature from "cesium/Scene/Cesium3DTileFeature";
import Color from "cesium/Core/Color";
import CesiumMath from "cesium/Core/Math";
import SceneTransforms from "cesium/Scene/SceneTransforms.js";
import Cartographic  from "cesium/Core/Cartographic";
import ClassificationPrimitive  from 'cesium/Scene/ClassificationPrimitive.js';
import GeometryInstance  from 'cesium/Core/GeometryInstance';
import PolygonGeometry  from 'cesium/Core/PolygonGeometry';
import PolygonHierarchy  from 'cesium/Core/PolygonHierarchy';
import ColorGeometryInstanceAttribute  from 'cesium/Core/ColorGeometryInstanceAttribute.js';
import ShowGeometryInstanceAttribute  from 'cesium/Core/ShowGeometryInstanceAttribute.js';
import ClassificationType  from 'cesium/Scene/ClassificationType.js';
import PrimitiveCollection  from 'cesium/Scene/PrimitiveCollection.js'
import BoxGeometry  from 'cesium/Core/BoxGeometry.js';
import PerInstanceColorAppearance  from 'cesium/Scene/PerInstanceColorAppearance.js';
import GroundPrimitive from 'cesium/Scene/GroundPrimitive'
import defaultValue from  'cesium/Core/defaultValue.js';
import VerticalOrigin from 'cesium/Scene/VerticalOrigin'
import LabelCollection from "cesium/Scene/LabelCollection";
import Primitive  from 'cesium/Scene/Primitive';
import MaterialAppearance from "cesium/Scene/MaterialAppearance.js";
import Material  from "cesium/Scene/Material";

import turf from "turf"

import GeoUtil from '../utils/GeoUtil'
import { GeoDepository } from "../core/GeoDepository";
import Query from "../tools/Query"
import FeatureType from "../constant/FeatureType";

/**
 * 倾斜摄影模型动态单体化，倾斜摄影模型和白模分层、分户选中效果 
 * @param {Object} options 配置
 * @param {String} [options.chooseType='building'] 可选，选中方法，方法有'building'（楼栋）,'floor'（楼层），'floor-house'（分户），默认为'building'。
 * @param {String} [options.floorHeightField] 楼层设置参数，chooseType='floor'时有效且选填，层高字段名，用于获取建筑每层高度。
 * @param {String} [options.altitudeField] 楼层设置参数，chooseType='floor'时有效且选填，建筑海拔高度字段名，用于获取建筑海拔高度。
 * @param {String} [options.useBuffer =false] 是否对楼层、楼栋图形进行缓冲突出显示，用于调节存在遮掩的情况，默认为false。
 * @param {String} [options.bufferDistance =0.1] 对楼层、楼栋图形进行缓冲的距离，当options.useBuffer为true时有效，用于调节存在遮掩的情况，默认为0.1。
 * @param {String} [options.levelsField]   楼层以及分户相关设置参数，chooseType='floor'或'floor-house'时有效且必填，楼层数量字段名，用于获取建筑楼层数量。
 * @param {Number} [options.floorHeight=3] 楼层以及分户相关设置参数，chooseType='floor'或'floor-house'时有效且选填，层高，用于获取建筑每层高度为空时进行层高设置,默认为3米一层。
 * @param {Number} [options.altitude=0] 楼层以及分户相关设置参数，chooseType='floor'或'floor-house'时有效且选填，建筑海拔高度，用于获取建筑海拔高度为空时进行建筑海拔高度设置，默认为0米。
 * @param {Number} [options.opacity=0] chooseType='floor'或'floor-house'时有效且选填,楼层或分户的初始不透明度，默认为0。
 * @param {String} [options.housefloorHeightField] 分户设置参数，chooseType='floor-house'时有效且选填，分户层高字段名，用于获取建筑每层高度。
 * @param {String} [options.housealtitudeField] 分户设置参数，chooseType='floor-house'时有效且选填，分户建筑海拔高度字段名，用于获取建筑海拔高度。
 * @param {String} [options.houseUrl]    分户设置参数，chooseType='floor-house'时有效且必填，分户图层wfs链接如: 'http://192.168.1.249:16080/geoserver/jssthx/wfs?SERVICE=WFS&VERSION=1.1.1&REQUEST=GetFeature&outputformat=json'
 * @param {String} [options.houseLayerName]  分户设置参数，chooseType='floor-house'时有效且必填，查询的分户图层名称
 * @param {String} [options.houseGeomType]  分户设置参数，chooseType='floor-house'时有效且必填，查询的分户空间字段,常用 ogc_geom,the_geom,geom,  shape具体查询分户图层的要素属性，需根据wfs的url确定。
 *
 * @example
 * //加载倾斜模型
 let model = modelLayer.add({
    url:'http://bosgeo-alpha.boswinner.com/geoData/models/3DTiles/dayantaQx/tileset.json',//倾斜模型服务地址
    featureType: BOSGeo.FeatureType.PHOTO,
});

 modelLayer.zoomTo(model);
 let dynamicdth = new BOSGeo.DynamicMonomer({
        chooseType:'building', //选中方法，按楼栋选中
    }); //倾斜动态单体化类
 */
class DynamicMonomer{
    constructor(options){
        options = options || {};
        this.viewer=GeoDepository.viewer;
        this.Query =new Query()
        this.geojsonfeature =null

        this.chooseType = options.chooseType || 'building'; //'building','floor','floor-house'

        //创建建筑物
        this.buildingPrimitives = new PrimitiveCollection({
            show:true
        });
        this.viewer.scene.primitives.add(this.buildingPrimitives);

        //创建楼层
        this.floorPrimitives = new PrimitiveCollection({
            show:true
        });
        //对primitive操作的时候并不销毁它，仅仅将他从floorPrimitives集合中删除
        this.floorPrimitives.destroyPrimitives = false;
        this.viewer.scene.primitives.add(this.floorPrimitives);
        //楼层相关字段
        this.levelsField = options.levelsField;
        this.floorHeightField = options.floorHeightField;
        this.altitudeField = options.altitudeField;
        this.floorHeight = defaultValue(options.floorHeight,3);
        this.altitude = defaultValue(options.altitude,0);

        this.opacity = defaultValue(options.opacity,0.01);

        this.floorData={}

        this.useBuffer = defaultValue(options.useBuffer,false);
        this.bufferDistance=defaultValue(options.bufferDistance,0.1);

        //创建房屋
        this.housePrimitives =new PrimitiveCollection({
            show:true
        });
        //对primitive操作的时候并不销毁它，仅仅将他从floorPrimitives集合中删除
        this.housePrimitives.destroyPrimitives = false;
        this.viewer.scene.primitives.add(this.housePrimitives);

        // this.labels =new LabelCollection()
        // this.labels.destroyPrimitives = false;
        this.labels = this.viewer.scene.primitives.add(new LabelCollection());
        // this.viewer.scene.primitives.add(this.labels);
        //楼户相关字段
        // this.houselevelsField = options.houselevelsField;
        this.housefloorHeightField = options.housefloorHeightField;
        this.housealtitudeField = options.housealtitudeField;
        // this.altitude = defaultValue(options.altitude,0);

        this.houseUrl = options.houseUrl;
        this.houseLayerName = options.houseLayerName;
        this.houseGeomType = options.houseGeomType;

        //鼠标事件类型，用于事件交互
        this.handleStyle=null

        this.currentObjId=undefined;
        this.currentAttributes=undefined;
        this.currentHouseId=undefined;
        this.currentHouseAttributes=undefined;
        this.currentColor = undefined;
        this.originalColor = undefined;
        this.selectObjId=undefined;
        this.selectAttributes=undefined;

        //如果设置为true，则会在场景更新时渲染，否则实时渲染每帧
        this.viewer.scene.requestRenderMode=false
        this.tempPicked=[]
        this.originalColor

        /**
         * 处理查询结果
         * @param {Object} result wfs空间查询结果
         * @private
         */
        this.handleQueryResult=(result)=> {
            if (this.chooseType== 'floor' || this.chooseType === 'floor-house') {
                this.handle(this.position);
            }

            //如果查询成功 那么返回的结果应该是一个geojson对象 类型为FeatureCollection
            if (!result || ! result.features || result.features.length<1) {
                if(this.handleStyle == 'LEFT_CLICK'){
                    //完全清除上一次结果
                    this.clearQueryResult();
                    this.geojsonfeature = null;
                }
                return ;
            };
            let feature = result.features[0]; //取第一个要素
            if (!feature) return ;
            if(this.geojsonfeature && this.geojsonfeature.id && feature && feature.id && this.geojsonfeature.id === feature.id) {
                this.geojsonfeature = feature;
                return
            }

            //清除上一次结果
            this.clearQueryResult();
            this.geojsonfeature = feature;

            for(let i=0;i<result.features.length;i++){
                let ifeature = result.features[i];
                let geometry = ifeature.geometry; //取要素的几何对象
                let properties = ifeature.properties; //取要素的属性信息
                let coordinates =undefined;
                let pointArr = [];
                let polygon =''
                if (geometry.type == "MultiPolygon") { //多面 房屋面一般不会出现空洞等现象 如果有需要另做处理
                    coordinates = geometry.coordinates[0][0];
                } else if (geometry.type == "Polygon") {
                    coordinates = geometry.coordinates[0];
                }

                for (let i = 0; i < coordinates.length; i++) {
                    const element = coordinates[i];
                    pointArr.push(element[0]);
                    pointArr.push(element[1]);
                    polygon += element[0] + ',' + element[1] + ' ' ;
                    // (this.chooseType== 'building') && pointArr.push(0);
                }
                if(coordinates  && this.useBuffer){
                    pointArr=[]
                    if(coordinates){
                        let polygonF = turf.polygon([coordinates]);
                        let buffered = turf.buffer(polygonF, this.bufferDistance,  'meters');
                        let bufferCoordinates = buffered.geometry.coordinates;
                        let points = bufferCoordinates[0];
                        points.map(item => {
                            pointArr.push(item[0]);
                            pointArr.push(item[1]);
                        });
                    }
                }
                this.addClampFeature(pointArr,properties);

                if(this.chooseType == 'floor-house'){
                    this.Query.geometryPolygonQuery (this.houseUrl, this.houseLayerName, this.houseGeomType ,polygon,this.handleQueryResultFH)
                }

                // let {pointArr,properties}=this.parseGeosjon (result);
                // pointArr,properties && this.addClampFeature(pointArr,properties);
            }

        }
        /**
         * 处理分户查询结果
         * @param {Object} result wfs空间查询结果
         * @private
         */
        this.handleQueryResultFH=(result)=> {

            //如果查询成功 那么返回的结果应该是一个geojson对象 类型为FeatureCollection
            if (!result || ! result.features || result.features.length<1) {
                if(this.handleStyle == 'LEFT_CLICK'){
                    //完全清除上一次结果
                    // this.clearQueryResult();
                    // this.geojsonfeature = null;
                }
                return ;
            };
            if (result.features.length<1) return ;
            /*
            if(this.geojsonfeature && this.geojsonfeature.id && feature && feature.id && this.geojsonfeature.id === feature.id){
                this.geojsonfeature = feature;
                return
            }

            //清除上一次结果
            this.clearQueryResult();
            this.geojsonfeature = feature;
            */
            let levels = this.floorData.levels;
            if(!isNaN(parseFloat(levels)) && isFinite(levels)) {
                for (let j = 0; j < Number(levels); j++) {
                    this.createHouses(result, this.housefloorHeightField, j, this.housealtitudeField)
                }
            }
        }
        /**
         * 处理wfs查询结果
         * @param {Object} result wfs空间查询结果
         * @private
         */
        this.handleWfsQueryResult =(result)=>{

            //如果查询成功 那么返回的结果应该是一个geojson对象 类型为FeatureCollection
            if (!result || !result.features || result.features.length < 1) {
                // if (this.handleStyle == 'LEFT_CLICK') {
                    //完全清除上一次结果
                    this.clearQueryResult();
                    this.geojsonfeature = null;
                // }
                return;
            };

            let feature = result.features[0]; //取第一个要素
            if (!feature) return;
            if (this.geojsonfeature && this.geojsonfeature.id && feature && feature.id && this.geojsonfeature.id === feature.id) {
                this.geojsonfeature = feature;
                return
            }

            //清除上一次结果
            this.clearQueryResult();
            this.geojsonfeature = feature;

            for (let i = 0; i < result.features.length; i++) {
                let ifeature = result.features[i];
                let geometry = ifeature.geometry; //取要素的几何对象
                let properties = ifeature.properties; //取要素的属性信息
                let coordinates = undefined;
                let pointArr = [];
                let polygon = ''
                if (geometry.type == "MultiPolygon") { //多面 房屋面一般不会出现空洞等现象 如果有需要另做处理
                    coordinates = geometry.coordinates[0][0];
                } else if (geometry.type == "Polygon") {
                    coordinates = geometry.coordinates[0];
                }

                for (let i = 0; i < coordinates.length; i++) {
                    const element = coordinates[i];
                    pointArr.push(element[0]);
                    pointArr.push(element[1]);
                    polygon += element[0] + ',' + element[1] + ' ';
                    // (this.chooseType== 'building') && pointArr.push(0);
                }
                if (coordinates && this.useBuffer) {
                    pointArr = []
                    if (coordinates) {
                        let polygonF = turf.polygon([coordinates]);
                        let buffered = turf.buffer(polygonF, this.bufferDistance, 'meters');
                        let bufferCoordinates = buffered.geometry.coordinates;
                        let points = bufferCoordinates[0];
                        points.map(item => {
                            pointArr.push(item[0]);
                            pointArr.push(item[1]);
                        });
                    }
                }
                this.addClampFeature(pointArr, properties);
            }

        }
        /**
         * 添加贴地对象
         * @param {Array} pointArr 经纬度坐标点集合
         * @private
         */
        this.addClampFeature =(pointArr,properties)=> {
            if (this.chooseType== 'building'){
                let id = properties.name ? properties.name: '楼栋'
                this.createBuilding(id, pointArr,properties)
                /*
                this.clampFeature = this.viewer.entities.add({
                    polygon: {
                        hierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArrayHeights(pointArr)),
                        classificationType: ClassificationType.CESIUM_3D_TILE,
                        material: Color.RED.withAlpha(0.3)
                    }
                })
                this.clampFeature.attribute = properties;
                this.clampFeature.featureType = FeatureType.ENTITY;
                */
            }
            else if(this.chooseType== 'floor' ){
                let id = properties.name ? properties.name: '楼层'
                let levels=properties[this.levelsField]
                if(!isNaN(parseFloat(levels)) && isFinite(levels)){
                    for(let j=0;j<Number(levels);j++){
                        this.createFloor(id+(j), pointArr,properties,this.floorHeightField,j,this.altitudeField)
                        /*for(var k=0;k<floor.houses.length;k++){
                            var house=floor.houses[k];
                            this.createHouses(house);
                        }*/
                    }
                }
            }
            else if(this.chooseType== 'floor-house' ) {
                this.floorData.boundary = pointArr;
                this.floorData.id = properties.name ? properties.name: '楼层'
                this.floorData.levels = properties[this.levelsField] ? properties[this.levelsField] :1 ;
            }
            GeoDepository.geomap.render();
        }

        /**
         * 创建楼栋图形
         * @param  {String} id          id值
         * @param {Array}  pointArr      几何点集合
         * @param  {Object} properties  属性信息
         * @private
         */
        this.createBuilding =(id, pointArr,properties) => {
            let instance=new GeometryInstance({
                geometry : new PolygonGeometry({
                    polygonHierarchy : new PolygonHierarchy(
                        Cartesian3.fromDegreesArray(pointArr)
                    ),
                    vertexFormat : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,

                }),
                id : id,
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 0.0, 1.0, 0.3)
                }
            });
            let buildingPrimitive=new GroundPrimitive({
                geometryInstances : instance,
                appearance : new MaterialAppearance({
                    materialSupport : MaterialAppearance.MaterialSupport.TEXTURED
                }),
                asynchronous:true,
                classificationType : ClassificationType.CESIUM_3D_TILE
            });

            this.buildingPrimitives.add(buildingPrimitive).readyPromise.then(buildingPolygon => {
                buildingPolygon.attribute = properties;
                buildingPolygon.featureType = FeatureType.POLYGON;
            });
        }

        /**
         * 创建拉伸的分类多边形-楼层
         * @param  {String} id          id值
         * @param {Array}  pointArr     几何点集合
         * @param  {Object} properties  属性信息
         * @param {Number} floorHeight  楼层高度
         * @param {Number} level         第几层
         * @param {Number} altitude      海拔
         * @private
         */
        this.createFloor =(id, pointArr,properties,floorHeight,level,altitude) =>{
            let ifloorHeight = properties[floorHeight] && ! isNaN(properties[floorHeight]) ? Number(properties[floorHeight]) :this.floorHeight;

            let ialtitude = properties[altitude] && ! isNaN(properties[altitude]) ? Number(properties[altitude]) :this.altitude;

            //楼层海拔
            let faltitude =  Number(ialtitude)+Number(ifloorHeight)*Number(level) ;
            let extrudedHeight = ifloorHeight ? faltitude + ifloorHeight: faltitude + this.floorHeight ;

            let levels=properties[this.levelsField]
            this.useBuffer && level==Number(levels)-1 && (extrudedHeight += 0.01 );
            this.floorData.altitude = faltitude
            //单个楼层的Primitive
            let floorPrimitive = new ClassificationPrimitive({
                geometryInstances: new GeometryInstance({
                    geometry:  new PolygonGeometry({
                        polygonHierarchy: new PolygonHierarchy(
                            Cartesian3.fromDegreesArray(pointArr)
                        ),
                        height: faltitude ,
                        extrudedHeight: extrudedHeight ,//有层高按层高计算，没有则按3米层高计算
                        vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
                    }),
                    attributes: {
                        color: ColorGeometryInstanceAttribute.fromColor(Color.fromRandom({ alpha: this.opacity})),
                        show: new ShowGeometryInstanceAttribute(true),
                    },
                    id: id, //设置id有效,其他属性无效
                }),
                classificationType: ClassificationType.CESIUM_3D_TILE,
                asynchronous:false,
            })

            let ifloorPrimitive = this.floorPrimitives.add(floorPrimitive).readyPromise.then(floorPolygon => {
                floorPolygon.attribute = { '楼层':'第'+(level+1)+'层','楼层海拔高度':faltitude,'层高':ifloorHeight,... properties};
                // floorPolygon.attribute && (floorPolygon.attribute['楼层'] = '第'+(level+1)+'层')
                floorPolygon.featureType = FeatureType.POLYGON;
            });
        }

        /**
         * 创建拉伸的房屋
         * @param {Object} floorData   楼层查询的geojson
         * @param {Number} floorHeight  楼层高度
         * @param {Number} level         第几层
         * @param {Number} altitude      海拔
         * @private
         */
        this.createHouses =(floorData,floorHeight,level,altitude) => {
            let houseInstances=[];
            /*
            let bboxInstance=new GeometryInstance({
                geometry : new PolygonGeometry({
                    polygonHierarchy : new PolygonHierarchy(
                        Cartesian3.fromDegreesArray(this.floorData.boundary)
                    ),
                    vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                    height:this.floorData.altitude,
                }),
                id : this.floorData.id+'_bbox',
                attributes : {
                    color : ColorGeometryInstanceAttribute.fromColor(Color.fromRandom({
                        // maximumRed : 0.75,
                        alpha : 1
                    })),
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });
            houseInstances.push(bboxInstance);
*/
            for(let k=0;k<floorData.features.length;k++){
                let feature = floorData.features[k];
                if (!feature) continue ;
                let geometry = feature.geometry; //取要素的几何对象
                let properties = feature.properties; //取要素的属性信息
                let coordinates;
                let pointArr = [];
                if (geometry.type == "MultiPolygon") { //多面 房屋面一般不会出现空洞等现象 如果有需要另做处理
                    coordinates = geometry.coordinates[0][0];
                } else if (geometry.type == "Polygon") {
                    coordinates = geometry.coordinates[0];
                }

                for (let i = 0; i < coordinates.length; i++) {
                    const element = coordinates[i];
                    pointArr.push(element[0]);
                    pointArr.push(element[1]);
                    // (this.chooseType== 'building') && pointArr.push(0);
                }

                let ifloorHeight = properties[floorHeight] && ! isNaN(properties[floorHeight]) ? Number(properties[floorHeight]) :this.floorHeight;
                let ialtitude = properties[altitude] && ! isNaN(properties[altitude]) ? Number(properties[altitude]) :this.altitude;

                //楼层海拔
                let faltitude =  Number(ialtitude)+Number(ifloorHeight)*Number(level) ;
                let extrudedHeight = ifloorHeight ? faltitude + ifloorHeight: faltitude + this.floorHeight ;
                // var house=floorData.features[k];

                var instance=new GeometryInstance({
                    geometry : new PolygonGeometry({
                        polygonHierarchy : new PolygonHierarchy(
                            Cartesian3.fromDegreesArray(pointArr)
                        ),
                        vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                        height:faltitude,
                        extrudedHeight:extrudedHeight
                    }),
                    id : feature.id,
                    attributes : {
                        color :  ColorGeometryInstanceAttribute.fromColor(Color.fromRandom({
                            // maximumRed : 0.75,
                            alpha : this.opacity
                        })),
                        // show : new ShowGeometryInstanceAttribute(true)
                    }
                });

                houseInstances.push(instance);

                let position=this.getCenterOfGravityPoint(pointArr);
                // let label = this.labels.add({
                //     position : Cartesian3.fromDegrees(position[0],position[1],extrudedHeight+0.1),
                //     text :properties.name,
                //     font:'14px sans-serif',
                //     showBackground:true,
                //     verticalOrigin : VerticalOrigin.BOTTOM
                // });

                let housePrimitive = new Primitive({
                    geometryInstances : instance,
                    asynchronous:false,
                    appearance : new PerInstanceColorAppearance({
                        translucent:false,
                        // closed:true,
                        renderState : {
                            lineWidth : Math.min(2.0, this.viewer.scene.maximumAliasedLineWidth)
                        }
                    })
                })
                // let houseModelMatrix=housePrimitive.modelMatrix;
                // Matrix4.multiplyByTranslation(houseModelMatrix, new Cartesian3(20, 20.0, 15.0), houseModelMatrix);
                // housePrimitive.modelMatrix = houseModelMatrix;

                // let labelModelMatrix=label.modelMatrix;
                // Matrix4.multiplyByTranslation(labelModelMatrix, new Cartesian3(0.0, 0.0, 10.0), labelModelMatrix);
                // label.modelMatrix = labelModelMatrix;

                this.housePrimitives.add(housePrimitive).readyPromise.then(housePolygon => {
                    housePolygon.attribute = { '单元':level+'0'+(k+1),'楼层':'第'+(level+1)+'层','楼层海拔高度':faltitude,'层高':ifloorHeight,... properties};
                    // floorPolygon.attribute && (floorPolygon.attribute['楼层'] = '第'+(level+1)+'层')
                    housePolygon.featureType = FeatureType.POLYGON;
                });
            }
            /*
            // this.housePrimitive=this.viewer.scene.primitives.add(new Primitive({
            this.housePrimitive = new Primitive({
                geometryInstances : houseInstances,
                asynchronous:false,
                appearance : new PerInstanceColorAppearance({
                    translucent:false,
                    closed:true,
                    renderState : {
                        lineWidth : Math.min(2.0, this.viewer.scene.maximumAliasedLineWidth)
                    }
                })
            })
            // );
            // this.housePrimitive.destroyPrimitives = false;

            let houseModelMatrix=this.housePrimitive.modelMatrix;
            Matrix4.multiplyByTranslation(houseModelMatrix, new Cartesian3(20, 20.0, 15.0), houseModelMatrix);
            this.housePrimitive.modelMatrix = houseModelMatrix;
            this.housePrimitives.add(this.housePrimitive);

            let labelsModelMatrix=this.labels.modelMatrix;
            Matrix4.multiplyByTranslation(labelsModelMatrix, new Cartesian3(0.0, 0.0, 10.0), labelsModelMatrix);
            this.labels.modelMatrix = labelsModelMatrix;
            */
        }

        /**
         * 清除结果 this.clampFeature
         * @example
         dynamicdth.clearQueryResult();
         */
        this.clearQueryResult=()=>{
            /*
            if(this.clampFeature){
                this.viewer.entities.remove(this.clampFeature);
            }
            */
            this.chooseType== 'building' && this.buildingPrimitives.removeAll();
            this.chooseType== 'floor' && this.floorPrimitives.removeAll();
            if(this.chooseType== 'floor-house'){
                this.housePrimitives.removeAll() ;
                this.labels = this.viewer.scene.primitives.remove(this.labels) && this.viewer.scene.primitives.add(new LabelCollection());
            }
            GeoDepository.geomap.render();
        };

        /**
         * 根据边界计算重心
         * @param {Array} boundary 几何点集合
         * @return {number[]}
         * @private
         */
        this.getCenterOfGravityPoint =(boundary)=> {
            let  x1=boundary[0],y1=boundary[1],x2,y2,x3,y3;
            let sum_x=0,sum_y=0,sum_s=0;

            for(let i=2;i<boundary.length-2;i+=2){
                x2=boundary[i];
                y2=boundary[i+1];
                x3=boundary[i+2];
                y3=boundary[i+3];

                var s=((x2-x1)*(y3-y1)-(x3-x1)*(y2-y1))/2.0;
                sum_x+=(x1+x2+x3)*s;
                sum_y+=(y1+y2+y3)*s;
                sum_s+=s;
            }
            return [sum_x/sum_s/3.0,sum_y/sum_s/3.0];
        }
    }

    /**
     * 根据坐标点查询矢量wfs服务
     *
     * @param {String} url wfs图层链接如: 'http://192.168.1.249:16080/geoserver/jssthx/wfs?SERVICE=WFS&VERSION=1.1.1&REQUEST=GetFeature&outputformat=json'
     * @param {String}  layerName 查询的图层名称
     * @param {String}  geomType 查询的空间字段,常用 ogc_geom,the_geom,geom,  shape具体查询图层的要素属性，需根据wfs的url确定。
     * @param {Object}  position 屏幕坐标
     * @example
     let url='http://gis-alpha.bimwinner.com/geoserver/dayata/ows?service=WFS&version=1.0.0&request=GetFeature&outputformat=json'  //倾斜模型对应建筑的geoserver的wfs服务
     geomap.on(BOSGeo.MapEventType.LEFT_CLICK,e => { //鼠标左击选中
    let res = dynamicdth.excuteQuery( //倾斜选中渲染
    url,                              //倾斜模型wfs服务地址，需带有&outputformat=json
    'dayata:dayata_building',		 //wfs服务对应的图层名称
    'geom',							//wfs服务对应查询的空间字段,常用 ogc_geom,the_geom,geom,  具体查询图层的要素属性，需根据wfs的url中确定
    e.window_position				//屏幕坐标
    )
    })
     *
     */
    excuteQuery(url,layerName,geomType,position){
        if(!position) return
        this.position = position;
        this.url =url;
        this.layerName =layerName;
        this.geomType =geomType;
        let cartographic= GeoUtil.getCartographic(position)
        if(!cartographic) return
        let range = [Number(cartographic.x)-0.0000095,Number(cartographic.y)-0.0000095,Number(cartographic.x) + 0.0000095,Number(cartographic.y) + 0.0000095]
        let features = this.Query.bBOXQuery (url, layerName, geomType,range,this.handleQueryResult)

    }

    /**
     * 鼠标交互事件
     * @param {Object} position  屏幕坐标
     * @private
     */
    handle (position) {
        if(!position) return
        //鼠标移动事件
        if(this.handleStyle == 'MOUSE_MOVE') {
            var pickedObject = GeoDepository.scene.pick(position);

            if(defined(pickedObject)&& defined(pickedObject.id)&& defined(pickedObject.primitive)){
                GeoDepository.viewer.container.style.cursor='pointer';
            }else {
                GeoDepository.viewer.container.style.cursor='default';
            }

            if(defined(this.selectObjId)){
                if(defined(this.currentHouseAttributes)){
                    this.currentHouseAttributes.color=this.currentColor;
                }

                this.currentHouseId = undefined;
                // this.currentHouseAttributes=undefined;
                // setDescription(this.currentHouseId);

                if(!defined(pickedObject)){
                    return;
                }
                if (defined(pickedObject) && defined(pickedObject.id)&& defined(pickedObject.primitive)) {
                    if(defined(this.currentHouseId)){
                        if (pickedObject.id !== this.currentHouseId) {
                            this.currentHouseAttributes.color=this.currentColor;
                            this.currentHouseId=pickedObject.id;
                            this.currentHouseAttributes=pickedObject.primitive.getGeometryInstanceAttributes(this.currentHouseId);
                            this.currentColor=this.currentHouseAttributes.color;
                            this.currentHouseAttributes.color=[255, 0, 255, 128];
                        }else{
                            this.currentHouseId = pickedObject.id;
                            this.currentHouseAttributes.color=this.currentColor;
                            this.currentHouseAttributes.color=[255, 0, 255, 128];
                        }
                    }else {
                        this.currentHouseId=pickedObject.id;
                        // console.log(this.currentHouseId)
                        if(defined(this.currentHouseAttributes)){
                            this.currentHouseAttributes.color=this.currentColor;
                        }
                        this.currentHouseAttributes=pickedObject.primitive.getGeometryInstanceAttributes(this.currentHouseId);
                        this.currentColor=this.currentHouseAttributes.color;
                        this.currentHouseAttributes.color=[255, 0, 255, 128];
                    }
                }else {
                    if(defined(this.currentHouseAttributes)){
                        this.currentHouseAttributes.color=this.currentColor;
                    }
                    this.currentHouseId = undefined;
                    // this.currentHouseAttributes=undefined;
                }
                // setDescription(this.currentHouseId);
            }else {
                if (defined(pickedObject) && defined(pickedObject.id)&& defined(pickedObject.primitive)) {
                    if(defined(this.currentObjId)){
                        if (pickedObject.id !== this.currentObjId) {
                            this.currentAttributes.color=[255, 0, 255, 0];
                            this.currentObjId=pickedObject.id;
                            if(pickedObject.primitive.getGeometryInstanceAttributes){
                                this.currentAttributes=pickedObject.primitive.getGeometryInstanceAttributes(this.currentObjId);
                                this.currentAttributes.color=[255, 0, 255, 128];
                            }
                        }
                    }else {
                        this.currentObjId=pickedObject.id;
                        if(pickedObject.primitive.getGeometryInstanceAttributes) {
                            this.currentAttributes = pickedObject.primitive.getGeometryInstanceAttributes(this.currentObjId);
                            this.currentAttributes.color = [255, 0, 255, 128];
                        }
                    }
                }else {
                    if(defined(this.currentAttributes)){
                        this.currentAttributes.color=[255, 0, 255, 0];
                    }
                    this.currentObjId = undefined;
                    // this.currentAttributes=undefined;
                }
                // setDescription(this.currentObjId);
            }
        };

        //鼠标左击事件
        if(this.handleStyle == 'LEFT_CLICK')  {

            // GeoDepository.scene.primitives.remove(this.housePrimitive);
            // this.housePrimitives.removeAll();
            // this.labels=GeoDepository.scene.primitives.remove(this.labels) && GeoDepository.scene.primitives.add(new LabelCollection());
            if( this.opacity < 0.05){
                var pickedObject = GeoDepository.scene.pick(position);
                if(this.selectAttributes){
                    this.selectAttributes.color=  [255, 0, 255, 0];
                }
                if (defined(pickedObject) && defined(pickedObject.id)&& defined(pickedObject.primitive)) {
                    if(defined(this.selectObjId)){
                        if (pickedObject.id !== this.selectObjId) {
                            if(this.selectAttributes){
                                this.selectAttributes.color=  [255, 0, 255, 0];
                            }

                            // this.selectAttributes=undefined;
                            GeoDepository.geomap.render();
                            // }
                            this.selectObjId=pickedObject.id;
                            if(pickedObject.primitive.getGeometryInstanceAttributes) {
                                this.selectAttributes = pickedObject.primitive.getGeometryInstanceAttributes(this.selectObjId);
                                this.selectAttributes.color = [255, 0, 255, 128];
                            }
                            // let floorData=getFloorDataById(this.selectObjId);
                            // if(defined(floorData)){
                            //     this.createHouses(floorData);
                            // }
                        }else{
                            if(this.selectAttributes){
                                this.selectAttributes.color=  [255, 0, 255, 0];
                            }
                            // this.selectAttributes=undefined;
                            GeoDepository.geomap.render();
                            // }
                            this.selectObjId=pickedObject.id;
                            if(pickedObject.primitive.getGeometryInstanceAttributes) {
                                this.selectAttributes = pickedObject.primitive.getGeometryInstanceAttributes(this.selectObjId);
                                this.selectAttributes.color = [255, 0, 255, 128];
                            }
                        }
                    }else {
                        if(this.selectAttributes){
                            this.selectAttributes.color=  [255, 0, 255, 0];
                        }
                        this.selectObjId = undefined;
                        // this.selectAttributes=undefined;
                        GeoDepository.geomap.render();
                        this.selectObjId=pickedObject.id;
                        // }
                        if(pickedObject.primitive.getGeometryInstanceAttributes) {
                            this.selectAttributes = pickedObject.primitive.getGeometryInstanceAttributes(this.selectObjId);
                            this.selectAttributes.color = [255, 0, 255, 128];
                        }
                        // let floorData=getFloorDataById(this.selectObjId);
                        // if(defined(floorData)){
                        //     this.createHouses(floorData);
                        // }
                    }
                }else {
                    if(this.selectAttributes){
                        this.selectAttributes.color=  [255, 0, 255, 0];
                    }
                    this.selectObjId = undefined;
                    // this.selectAttributes=undefined;
                }
            }else{ //缓冲渲染方式交互
                let redColor = [255, 0, 255, 128];
                var pickedFeature = this.viewer.scene.pick(position);
                if (defined(pickedFeature) && defined(pickedFeature.id)&& defined(pickedFeature.primitive)){
                    //将本次选中元素的原颜色保存
                    // this.precolor //= pickedFeature.primitive.appearance.material.uniforms.color;
                    this.selectObjId=pickedFeature.id;
                    if(pickedFeature.primitive.getGeometryInstanceAttributes) {
                        this.selectAttributes = pickedFeature.primitive.getGeometryInstanceAttributes(this.selectObjId);
                        this.precolor =this.selectAttributes.color ;
                    }
                    //当tempPicked ==0时，说明此时没有被选中的元素。初选的颜色就是原始颜色值
                    if (this.tempPicked.length == 0) {
                        // this.originalColor = pickedFeature.primitive.appearance.material.uniforms.color;
                        this.selectObjId=pickedFeature.id;
                        if(pickedFeature.primitive.getGeometryInstanceAttributes) {
                            this.selectAttributes = pickedFeature.primitive.getGeometryInstanceAttributes(this.selectObjId);
                            this.originalColor =pickedFeature.primitive.getGeometryInstanceAttributes(this.selectObjId).color ;
                        }
                    } else {
                        //当lenth!=0时，说明有选中的数据，此时选中的数据颜色应为红色，原颜色应为之前保存的颜色，非改变后的红色
                        this.originalColor= this.tempPicked[0].precolor;
                    }
                    //改变颜色
                    let changeColor = function (factor, color) {
                        // factor.primitive.appearance.material.uniforms.color = color;
                        let selectObjId=factor.id;
                        if(factor.primitive.getGeometryInstanceAttributes) {
                            let selectAttributes = factor.primitive.getGeometryInstanceAttributes(selectObjId);
                            selectAttributes.color = color;
                        }
                    }
                    //也有可能本次与上次选中的是同一个元素，两种情况，
                    // 一种是上次为原色，本次需变红，上次为原，与初始化没选相同，不做考虑
                    // 一种是上次为红，本次需变原，该情况下先变色，后复原，与所要结果相同。
                    //选中的变色
                    changeColor(pickedFeature, redColor);
                    //上次选中的变为原始颜色
                    if (this.tempPicked.length ==1) {
                        changeColor(this.tempPicked[0], this.tempPicked[0].precolor);
                    }
                    this.selectObjId=pickedFeature.id;
                    // if(pickedFeature.primitive.getGeometryInstanceAttributes) {
                    //     this.selectAttributes = pickedFeature.primitive.getGeometryInstanceAttributes(this.selectObjId);
                    // }

                    //如果本次选择与上次相同，清空数组
                    if (pickedFeature.primitive.getGeometryInstanceAttributes && pickedFeature.primitive.getGeometryInstanceAttributes(this.selectObjId).color.toString()!=redColor.toString()) {
                        this.tempPicked.length = 0; //清空数组
                    } else {
                        //如果不同，清除上次元素，加入选择元素
                        this.tempPicked.length = 0; //清空数组
                        //把变红之前的颜色保存
                        pickedFeature.precolor = this.precolor;
                        this.tempPicked.push(pickedFeature);
                    }
                    //属性显示
                    //_this.showAttr(this.tempPicked, pickedFeature);
                }
            }

        };

        GeoDepository.geomap.render();
    }

    /**
     * 查询矢量wfs服务
     *
     * @param {String} url wfs图层链接如: 'http://192.168.1.249:16080/geoserver/jssthx/wfs?SERVICE=WFS&VERSION=1.1.1&REQUEST=GetFeature&outputformat=json'
     * @param {String}  layerName 查询的图层名称
     * @example
     let url='http://gis-alpha.bimwinner.com/geoserver/dayata/ows?service=WFS&version=1.0.0&request=GetFeature&outputformat=json'  //倾斜模型对应建筑的geoserver的wfs服务
     geomap.on(BOSGeo.MapEventType.LEFT_CLICK,e => { //鼠标左击选中
    let res = dynamicdth.excuteWfsQuery( //倾斜选中渲染
    url,                              //倾斜模型wfs服务地址，需带有&outputformat=json
    'dayata:dayata_building',		 //wfs服务对应的图层名称
    )
    })
     *
     */
    excuteWfsQuery(url,layerName){
        let results = this.Query.wfsQuery (url, layerName,this.handleWfsQueryResult)
    }

    /**
     * 更新面图形的图片材质
     * @param {String} imgUrl 图片地址
     */
    updateImageMaterial(imgUrl){
        if(!imgUrl) return
        let material =new Material({
            fabric: {
                type: 'Image',
                uniforms: {
                    image: imgUrl,
                    // radians: 0,
                },
            }
        })
        for (let i in this.buildingPrimitives._primitives) {
            if (i) {
                this.buildingPrimitives._primitives[i].appearance.material = material;
            }

        }
    }
}

export default DynamicMonomer;