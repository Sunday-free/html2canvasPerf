
import defined from "cesium/Core/defined";
import Resource from 'cesium/Core/Resource';

import Entity from 'cesium/DataSources/Entity';
import Color from "cesium/Core/Color";
import PolygonHierarchy from "cesium/Core/PolygonHierarchy";
import ClassificationType from "cesium/Scene/ClassificationType";
import Cartesian3 from "cesium/Core/Cartesian3";
import FeatureType from '../constant/FeatureType.js';
import DefaultData from '../constant/DefaultData.js';
import {GeoDepository} from "../core/GeoDepository";

/**
 * 辅助工具，工具功能参见本类方法。
 * @alias SubsideTool
 * @param {Object} options 包含以下参数的Object对象
 * @param {String} [options.amapKey] 若要使用高德相关工具，先传入高德密钥
 * @param {String} [options.mapboxKey] 若要使用mapBox相关工具，先传入密钥
 * @example
 *  const myTool = new BOSGeo.SubsideTool({
        mapboxKey: 'pk.eyJ1IjoiaWNoYmFuZ2JhbmdiYW5nIiwiYSI6ImNrbW4ycnhxcTFyMjc'
    });
 */
class SubsideTool {
    constructor(options){

        this._amapKey = options.amapKey;
        this._mapboxKey = options.mapboxKey;

        this._show = true;
        
        this._isochroneEntity = {centerPoint:null, isochrone:null};
    }
    /**
     * 是否显示该工具相关数据
     * @property {Boolean} show 是否显示数据
     */
    get show(){
        return this._show;
    }
    set show(value) {
        if(this._isochroneEntity.isochrone){
            this._isochroneEntity.isochrone.show = value;
        } 
        if(this._isochroneEntity.centerPoint){
            this._isochroneEntity.centerPoint.show = value;

        };
        this._show = value;
        GeoDepository.geomap.render();
        
    }
    /**
     * 根据出发位置，出行模式，出行时间创建可达区
     * @param {Object} options 配置项
     * @param {Object} [options.center] {longitude,latitude} 出发位置
     * @param {Number} [options.time] 出行时间，单位：分钟
     * @param {String} [options.profile] 默认'walking',可选：'walking','driving','cycling '
     * @param {String} [options.color] 缓冲区颜色
     * @param {Number} [options.opacity] 缓冲区不透明度
     * @param {String} [options.centerImage] 出发位置标记图片
     * @param {Function} successCallback 创建成功时的回调函数
     * @param {Function} errorCallback 创建失败时的回调函数
     * @example
       const myTool = new SubsideTool({
            mapboxKey:'pk.keyStringGetFromMapboxWebsite'
       });  
       myTool.createIsochrone({
        center:{longitude:114.08,latitude:22.51},
        time:20,
        profile:'driving'
      },res =>alert('创建成功！'),erro =>alert('创建失败！'));
     */
    createIsochrone(options,successCallback,errorCallback){
        let {
            center,
            time,
            profile='walking',
            color="#4286f4", 
            opacity=0.3, 
            centerImage = DefaultData.IMG_DATA_LOCATE
        } = options;
        if(!defined(this._mapboxKey)) throw '创建时未传入mapbox密钥，无法进行以下操作：addIsochrone';
        if(!['walking','driving','cycling '].includes(profile)) throw `并无此模式选项，可选：'walking','driving','cycling '`;
        if(!(time > 0)) throw '请传入大于0的数字！';  
        this.deleteIsochrone();

        opacity = Number(opacity);
        time = Number(time);
        center = [Number(center.longitude.toFixed(4)),Number(center.latitude.toFixed(4))];
        const url = `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${center[0]},${center[1]}?contours_minutes=${time}&polygons=true&access_token=${this._mapboxKey}`;
        Resource.fetchJson({url}).then(
            res => {
                this.createIsochroneEntity({coordinates:res.features[0].geometry.coordinates[0], color, opacity,center,profile,centerImage});
                GeoDepository.viewer.scene.requestRender();
                successCallback && successCallback(res);
            },
            e => { 
                errorCallback && errorCallback();
                console.error(e) }
        )
        
        
    }
    /**
     * 创建可达圈entity对象（仅用于createIsochrone中，获取到可达区结果以后调用。）
     * @ignore
     */
    createIsochroneEntity(options){
        const {
            coordinates, 
            profile, 
            center,
            centerImage,
            color="#4286f4", 
            opacity=0.3
        } = options;
        const position = Cartesian3.fromDegrees(...center);

    
        const outline = coordinates.map((p)=>Cartesian3.fromDegrees(...p));
        this._isochroneEntity.isochrone =GeoDepository.viewer.entities.add({polygon :{
            hierarchy: new PolygonHierarchy(outline),
            material: Color.fromCssColorString(color).withAlpha(opacity),
            classificationType: ClassificationType.BOTH
        }});
        this._isochroneEntity.isochrone.featureType = FeatureType.ISOCHRONE_AREA;

        this._isochroneEntity.centerPoint = GeoDepository.viewer.entities.add({
            position,
            billboard:{
                id:'isochrone',
                scale:1,
                height: 25,
                image:centerImage
            }
        })
        this._isochroneEntity.centerPoint.featureType = FeatureType.ISOCHRONE_CENTER;

    }
    /**
     * 删除可达圈
     * @example
       const myTool = new SubsideTool({
            mapboxKey:'pk.keyStringGetFromMapboxWebsite'
       });  
       myTool.createIsochrone({
        center:{longitude:114.08,latitude:22.51},
        time:20,
        profile:'driving'
      },res =>alert('创建成功！'),erro =>alert('创建失败！'));
      myTool.deleteIsochrone();
     */
    deleteIsochrone(){
        if(this._isochroneEntity.isochrone){
            GeoDepository.viewer.entities.remove(this._isochroneEntity.isochrone);
            this._isochroneEntity.isochrone = null
        } 
        if(this._isochroneEntity.centerPoint){
            GeoDepository.viewer.entities.remove(this._isochroneEntity.centerPoint);
            this._isochroneEntity.centerPoint = null

        };
    }
    /**
     * 销毁工具
     * @example
       const myTool = new SubsideTool({
            mapboxKey:'pk.keyStringGetFromMapboxWebsite'
       });  
       myTool.createIsochrone({
        center:{longitude:114.08,latitude:22.51},
        time:20,
        profile:'driving'
      },res =>alert('创建成功！'),erro =>alert('创建失败！'));
      myTool.destroy();
     */
    destroy(){
        this.deleteIsochrone();
        for(let key in this){
            delete this[key];
        }
    }

 
}
export default SubsideTool;