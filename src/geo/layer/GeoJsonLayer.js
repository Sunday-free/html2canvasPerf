import Layer from "./Layer";
import GeoJsonDataSource from "cesium/DataSources/GeoJsonDataSource";
import DataSourceCollection from "cesium/DataSources/DataSourceCollection";
import LayerEventType from "../constant/LayerEventType";
import { GeoDepository } from "../core/GeoDepository";
import LayerType from "../constant/LayerType";

import createGuid from 'cesium/Core/createGuid'
import destroyObject from 'cesium/Core/destroyObject'
import DeveloperError from 'cesium/Core/DeveloperError'
import defaultValue from 'cesium/Core/defaultValue'

import Color from 'cesium/Core/Color'
import DistanceDisplayCondition from "cesium/Core/DistanceDisplayCondition";
import BoundingSphere from "cesium/Core/BoundingSphere";
import PolylineDashMaterialProperty from "cesium/DataSources/PolylineDashMaterialProperty";
import PolylineGlowMaterialProperty from "cesium/DataSources/PolylineGlowMaterialProperty";
import ShadowMode from "cesium/Scene/ShadowMode.js";
import Cartesian3 from "cesium/Core/Cartesian3";
import CesiumMath from "cesium/Core/Math";
import HeightReference from "cesium/Scene/HeightReference";
import FeatureType from "../constant/FeatureType";
import GeoUtil from "../utils/GeoUtil";

class GeoJsonLayer extends Layer {
    /**
     * GeoJSON/TopoJSON数据图层，可实现GeoJSON/TopoJSON数据的添加、移除、缩放至和显隐等操作
     * @alias GeoJsonLayer
     * @constructor
     *
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} [options.name] 图层名称；
     * @param {Boolean} [options.show] 是否显示；
     * @param {String} [options.customGroupId] 自定义分组的ID。
     *
     * @example
     * var geoJsonLayer = new BOSGeo.GeoJsonLayer({
     *   name: 'json图层1',
     *   show: true,
     *   customGroupId: '图层组1',
     * });
     *
     */
    constructor(options) {
        super(options);
        this._dataSources = {}
        this._show = options.show;
        this.layerType = LayerType.GEOJSON;
        this.colorHash = {};
        this.entityTypes = [
            ['box', 'ellipse', 'ellipsoid', 'polygon', 'polyline', 'polylineVolume', 'rectangle', 'wall', 'corridor', 'cylinder', 'path', 'plane'],
            ['billboard', 'point','model']];//子模型类型集合
        // 关闭地形深度检测
        GeoDepository.viewer.scene.globe.depthTestAgainstTerrain = false;
    }

    /**
     * 添加GeoJSON/TopoJSON数据
     *
     * @param {Object} jsonParam 包含以下参数的Object对象：
     * @param {Resource|String|Object} jsonParam.url 可以是url、GeoJSON object或者TopoJSON object；
     * @param {Boolean} [jsonParam.clampToGround=false]  是否贴地，clampToGround为true时贴地，此时轮廓线设置将不起作用；
     * @param {String} [jsonParam.color]   填充色，可以是#rgb, #rrggbb, rgb(), rgba(), hsl(), 或者hsla()格式的CSS颜色；
     * @param {String} [jsonParam.name]   图形名称；
     * @param {Number} [jsonParam.opacity=1]  填充色不透明度，取值范围[0-1]；
     * @param {String} [jsonParam.stroke="#FF0000"]  轮廓线的颜色，可以是#rgb, #rrggbb, rgb(), rgba(), hsl(), 或者hsla()格式的CSS颜色；
     * @param {String} [jsonParam.lineType] -线的类型,"分段"-分段线，"发光"-发光线，"实线"-实线(默认值)；
     * @param {Number} [jsonParam.glowPower=0.25] -发光线的强度值，占线宽的百分比；
     * @param {Boolean} [jsonParam.zoomToTarget=false]  是否缩放至当前加载的GeoJson对象范围内；
     * @param {Boolean} [jsonParam.showPolyline =false]  是否添加轮廓线；
     * @param {Number} [jsonParam.strokeWidth=2]  showPolyline=true时有效，轮廓线的宽度，单位：像素；
     * @param {String} [jsonParam.showLabelField=null]  添加显示注记字段，即不显示；
     * @param {String} [jsonParam.labelFont='normal 16px MicroSoft YaHei']  注记字体大小和样式；
     * @param {String} [jsonParam.labelBackgroundColor]  注记背景颜色，可以是#rgb, #rrggbb, rgb(), rgba(), hsl(), 或者hsla()格式的CSS颜色；
     * @param {Boolean} [jsonParam.labelShowBackground]  是否显示注记背景；
     * @param {Number}  [jsonParam.labelNF=[0.0,Number.MAX_VALUE]] 注记可见的范围，所有地球范围可见；
     * @param {Number}  [jsonParam.nearFar=[0.0,Number.MAX_VALUE]] 面和线对象可见的范围，所有地球范围可见；
     * @param {Boolean} [jsonParam.show=true]  是否显示，默认为true，即显示；
     * @param {Resource} [jsonParam.loaded] 用于回调函数中，返回当前获取的json资源。
     * @param {Boolean} [jsonParam.showPolygon]  是否添加多边形，若为false则会将多边形从Entity中移除；
     * @param {Boolean} [jsonParam.showDynamicColorPolygon=false]  当showPolygon=true时，是否随机渲染多边形面颜色，对于面数据有效，设置后会覆盖color的设置；
     * @param {String} [jsonParam.extrudedHeightField]   当showPolygon=true时，面拉伸高度字段，来源于geojson数据的拉伸高度字段；
     * @param {String} [jsonParam.colorField]    当showPolygon=true时，面拉伸后颜色字段，来源于geojson数据的拉伸颜色字段，可以是 #rrggbb, rgb(), rgba()格式的CSS颜色，设置后会覆盖color和showDynamicColorPolygon的设置；
     *
     * @returns {Promise.<GeoJsonDataSource>|undefined}
     *
     * @example
     * let params={
        url:'http://bosgeo-alpha.boswinner.com/geoData/geojson/us_states.topojson',
        name:'json1',
        zoomToTarget:true,
        }
        let json1 = geoJsonLayer.add(params)
     */
    add(jsonParam) {
        let options = jsonParam || {};
        if (!jsonParam.url) throw new DeveloperError("GeoJson数据源服务地址不可缺少!");
        this.url = jsonParam.url;
        this.clampToGround = defaultValue(jsonParam.clampToGround, false);
        this._color = jsonParam.color || "#ffffff";
        this._opacity = defaultValue(jsonParam.opacity, 1);
        this.stroke = jsonParam.stroke || "#FF0000";
        this.strokeWidth = jsonParam.strokeWidth || 2;
        this.lineType = jsonParam.lineType || "实线";
        this.glowPower = defaultValue(jsonParam.glowPower, 0.25);
        this.zoomToTarget = defaultValue(jsonParam.zoomToTarget, false);
        this.showDynamicColorPolygon = defaultValue(jsonParam.showDynamicColorPolygon, false);
        this.showPolygon = defaultValue(jsonParam.showPolygon, false);
        this.showPolyline = defaultValue(jsonParam.showPolyline, false);
        this.showLabelField = defaultValue(jsonParam.showLabelField, null);

        this.labelFont = defaultValue(jsonParam.labelFont, 'normal 16px MicroSoft YaHei');
        this.labelBackgroundColor = jsonParam.labelBackgroundColor || "rgba(42,42,42,0.8)",
            this.labelShowBackground = defaultValue(jsonParam.labelShowBackground, true);

        this.labelNF = defaultValue(jsonParam.labelNF, [0.0, Number.MAX_VALUE]);
        this.nearFar = defaultValue(jsonParam.nearFar, [0.0, Number.MAX_VALUE]);
        this.shadowMode = defaultValue(jsonParam.shadowMode, ShadowMode.ENABLED);

        this.extrudedHeightField = defaultValue(jsonParam.extrudedHeightField, null);
        this.colorField = defaultValue(jsonParam.colorField, null);
        this.dataSource = null;

        this.loaded = jsonParam.loaded;

        let name = jsonParam.name || this.url;
        this.name = name;
        let show = defaultValue(jsonParam.show , true);
        if (!(name in this._dataSources)) {
            let json = GeoJsonDataSource.load(this.url, {
                stroke: Color.fromCssColorString(this.stroke),
                fill: Color.fromCssColorString(this._color).withAlpha(this._opacity),
                strokeWidth: this.strokeWidth,
                clampToGround: this.clampToGround
            }).then(data => {
                this.loaded && this.loaded(data);
                this.dataSource = data;
                this.zoomToTarget && this.zoomTo(data);

                GeoDepository.viewer.dataSources.add(this.dataSource);

                data.show = show;
                this._dataSources[name] = data;

                let entities = this.dataSource.entities.values;
                for (let i = 0; i < entities.length; i++) {
                    let entity = entities[i];
                    entity.featureType=FeatureType.ENTITY;

                    this.showPolyline && this.polylineRender(entity);


                    if (this.showPolygon) {
                        entity.polygon && (entity.polygon.distanceDisplayCondition = new DistanceDisplayCondition(this.nearFar[0], this.nearFar[1]));
                        entity.polygon && this.polygonRender(entity);
                    }
                    // else {
                    //     entity.polygon && (entity.polygon);
                    // }

                    this.showLabelField && this.labelRender(entity);
                }
                this.fire(LayerEventType.ADD, { data, entities });
                this.fire(LayerEventType.CHANGE);
                GeoDepository.scene.requestRender();
            });
            return json;
        }

    }

    /**
     * 对多边形做随机渲染
     *
     * @param {Entity} entity Entity对象
     */
    polygonRender(entity) {
        if (!entity.polygon) return;

        let propertiesName = entity.properties.propertyNames;
        /*
        let name = entity.name;
        */
        var color
        if(this.colorField) {
            let colorStr;
            if (propertiesName.includes(this.colorField)) {
                colorStr = entity.properties[this.colorField].getValue();
            }

            if(colorStr && colorStr != '' && colorStr.indexOf("#") != -1){
                color = Color.fromCssColorString(colorStr) ;
            }else if(colorStr && colorStr != '' &&  colorStr.indexOf(",") != -1 && colorStr.split(",").length==4 ) {
                color = Color.fromCssColorString("rgba(" + colorStr + ")");
            }else if(colorStr && colorStr != '' &&  colorStr.indexOf(",") != -1 && colorStr.split(",").length==3 ) {
                color = Color.fromCssColorString("rgb(" + colorStr + ")");
            }
            if (!color) {
                color = Color.WHITE;
                // name && (this.colorHash[name] = color);
            }
        } else if(this.showDynamicColorPolygon ){
            //给面赋随机颜色，并指定不透明度
            color = Color.fromRandom({
                alpha: this._opacity,
            });
        }
        else{
            //统一赋予颜色
            color = Color.fromCssColorString(this._color).withAlpha(this._opacity)
        }
        entity.polygon.material = color;
        entity.polygon.heightReference = HeightReference.CLAMP_TO_GROUND;
        entity.polygon.outline = false;
        entity.polygon.shadows = ShadowMode.ENABLED;

        if(this.extrudedHeightField){
            let height=0;
            if(propertiesName.includes(this.extrudedHeightField)){
                height=entity.properties[this.extrudedHeightField].getValue()?entity.properties[this.extrudedHeightField].getValue():0;
                entity.polygon.extrudedHeight =height;
            }
        }

        // entity.polygon.outline = true;
        // entity.polygon.outlineColor = Color.LIGHTGREEN.withAlpha(1);
        // entity.polygon.outlineWidth = 2;
    }

    /**
     * 添加轮廓线
     *
     * @param {Entity} entity Entity对象
     */
    polylineRender(entity) {
        if (!entity.polygon) return;
        entity.polyline = {
            positions: entity.polygon._hierarchy._value.positions,
            width: this.strokeWidth,
            material: this.stroke,
            clampToGround: this.clampToGround,
            distanceDisplayCondition: new DistanceDisplayCondition(this.nearFar[0], this.nearFar[1])
        };
        switch (this.lineType) {
            case "分段":
                entity.polyline.material = new PolylineDashMaterialProperty({
                    color: Color.fromCssColorString(this.stroke),
                    gapColor: Color.TRANSPARENT,
                    dashLength: 50
                });
                break;
            case "发光":
                entity.polyline.material = new PolylineGlowMaterialProperty({
                    color: Color.fromCssColorString(this.stroke),
                    glowPower: this.glowPower,
                    taperPower: 1
                })
                break;
            case "实线":
            default://实线
                entity.polyline.material = Color.fromCssColorString(this.stroke);
                break;
        }
    };

    /**
     * 添加注记
     *
     * @param {Entity} entity Entity对象
     */
    labelRender(entity) {
        let propertiesName = entity.properties.propertyNames;
        var name //= entity.name;
        if (propertiesName.includes(this.showLabelField)) {
            name = entity.properties[this.showLabelField].getValue();
        }
        entity.billboard = undefined;
        if (!entity.position && entity.polygon) {
            var polyPositions = entity.polygon._hierarchy._value.positions;
            var polyCenter = BoundingSphere.fromPoints(polyPositions).center; //获取polygon的几何中心点
            entity.position = polyCenter;
        }
        entity.label = {
            text: name,
            font: this.labelFont,
            backgroundColor: Color.fromCssColorString(this.labelBackgroundColor),
            showBackground: this.labelShowBackground,
            //   horizontalOrigin: HorizontalOrigin.LEFT_CLICK,
            //   verticalOrigin: VerticalOrigin.BOTTOM,
            distanceDisplayCondition: new DistanceDisplayCondition(this.labelNF[0], this.labelNF[1]),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
        };
    };
    /**
     * 是否显示图层
     * @property {Boolean}
     */
    get show() {
        return this._show;
    }
    set show(value) {
        Object.keys(this._dataSources).map(v => {
            this._dataSources[v].show = value;
            let dataSource =this._dataSources[v];
            let entities = dataSource.entities.values;
            for (let i = 0; i < entities.length; i++) {
                let entity = entities[i];
                this.showPolyline && entity.polyline && (entity.polyline.show = value );
                this.showPolygon && entity.polygon  && (entity.polygon.show = value );
                this.showLabelField && entity.label && (entity.label.show = value ) ;
            }
        })
        this._show = value;
        this.fire(LayerEventType.CHANGE, { toggleShow: true });
        GeoDepository.scene.requestRender();
    }

    /**
     * 颜色，十六进制的颜色字符串
     * @property {String}
     */
    get color(){
        return this._color;
    }
    set color(v){
        let color;
        if(v && (this.color !== v)){
            if((typeof(v) !=='string') && !(v instanceof Color)) throw new Error('Point.color: 请输入正确的值！')
            color = (typeof(v)==='string') ? Color.fromCssColorString(v):v;
            color = color.withAlpha(this._opacity)
            Object.keys(this._dataSources).map(enti => {
                let dataSource =this._dataSources[enti];
                let entities = dataSource.entities.values;
                for (let i = 0; i < entities.length; i++) {
                    let entity = entities[i];
                    GeoUtil.setEntityColor(entity, {color:color});
                    entity._children && entity._children.map(ent => {
                        GeoUtil.setEntityColor(ent, {color:color});
                    })
                    // this.showPolyline && entity.polyline && (entity.polyline.material.color = color , this.stroke=color.toCssHexString());
                    // this.showPolygon && entity.polygon  && (entity.polygon.material.color = color );
                    // this.showLabelField && entity.label && (entity.label.fillColor = color ) ;
                }
            })
            this._color = color.toCssHexString();
            GeoDepository.scene.requestRender();
        }
    }

    /**
     * 透明度
     * @property {Number}
     */
    get opacity(){
        return this._opacity;
    }
    set opacity(v){
        if (isNaN(v) || (v < 0) || (v > 1)) {
            console.error('请传入大于等于0，小于等于1的数值！');
        } else {
            // this.color = Color.fromCssColorString(this._color).withAlpha(v);
            // let color = new Color.fromCssColorString(this._color).withAlpha(v);
            Object.keys(this._dataSources).map(enti => {
                let dataSource =this._dataSources[enti];
                let entities = dataSource.entities.values;
                for (let i = 0; i < entities.length; i++) {
                    let entity = entities[i];
                    GeoUtil.setEntityColor(entity, {opacity:v});
                    entity._children && entity._children.map(ent => {
                        GeoUtil.setEntityColor(ent, {opacity:v});
                    })
                    // this.showPolyline && entity.polyline && (entity.polyline.color = color );
                    // this.showPolygon && entity.polygon  && entity.polygon.material && entity.polygon.material.color && (entity.polygon.material = entity.polygon.material.color.getValue().withAlpha(v) );
                    // this.showLabelField && entity.label && (entity.label.fillColor = color ) ;
                }
            })
            this._opacity = v;
            GeoDepository.scene.requestRender();
        }
    }
    /**
     * 根据名称获取GeoJsonDataSource对象
     * @param {String} name 对象名称
     */
    getJSONByName(name) {
        return this._dataSources[name || this.name]
    }

    /**
     * 缩放至geojson
     * @param {DataSource} dataSource 数据源对象
     */
    zoomTo(dataSource) {
        // let dataSource=this._dataSources[name]
        dataSource && this.viewer.zoomTo(dataSource)
    };

    /**
     * 缩放至图层
     */
    zoomToLayer() {
        let dataSource = this._dataSources[this.name]
        dataSource && this.viewer.zoomTo(dataSource)
    };

    /**
     * 缩放至geojson By name
     *
     * @param {String} name 数据名
     */
    zoomToByName(name) {
        let dataSource = this._dataSources[name]
        dataSource && this.viewer.zoomTo(dataSource)
    };

    /**
     * 更新面图形的图片材质
     * @param {String} imgUrl  图片地址
     */
    updateImageMaterial(imgUrl){
        if(!imgUrl) return
        let entities = this.dataSource.entities.values;
        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i];
            if (this.showPolygon) {
                entity.polygon && (entity.polygon.material = imgUrl
                    // entity.polygon.closeTop =false, entity.polygon.closeBottom = false
                );
            }
        }
        this.fire(LayerEventType.CHANGE);
    }
    /**
     * 移除geojson数据
     *
     * @param {DataSource} dataSource 数据源对象
     */
    remove(dataSource) {
        this.viewer.dataSources.remove(dataSource);
        this.fire(LayerEventType.REMOVE, dataSource);
        this.fire(LayerEventType.CHANGE);
        GeoDepository.scene.requestRender();
    }

    /**
     * 移除geojson数据
     *
     * @param {String} name 数据名
     */
    removeByName(name) {
        let dataSource = this._dataSources[name]
        this.viewer.dataSources.remove(dataSource);
        delete this._dataSources[name]
        this.fire(LayerEventType.REMOVE, dataSource);
        this.fire(LayerEventType.CHANGE);
        GeoDepository.scene.requestRender();
    }


    /**
     * 移除全部json
     */
    removeAll() {
        // this.viewer.dataSources.removeAll();
        for (let i in this._dataSources) {
            this.viewer.dataSources.remove(this._dataSources[i])
            this.fire(LayerEventType.REMOVE, this._dataSources[i]);
            this.fire(LayerEventType.CHANGE);
            delete this._dataSources.i
        }
        // this._dataSources.forEach(d=>this.viewer.dataSources.remove(this._dataSources[d]));
        GeoDepository.scene.requestRender();
    }

    /**
     * 销毁本图层
     * @private
     */
    destroy() {
        this.removeAll();
        // this._dataSources.forEach(d=>this.viewer.dataSources.remove(this._dataSources[d]));
        GeoDepository.scene.requestRender();
        this._destroyBaseLayer();
        delete this._dataSources;
    }
}

export default GeoJsonLayer;