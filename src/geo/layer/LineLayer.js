import Layer from "./Layer"; 
import Material from "cesium/Scene/Material";
import PrimitiveCollection from "cesium/Scene/PrimitiveCollection";
import clone from 'cesium/Core/clone'
import PolylineDynamicMaterialProperty from 'cesium/DataSources/PolylineDynamicMaterialProperty'
import defined from 'cesium/Core/defined'
import ColorGeometryInstanceAttribute from "cesium/Core/ColorGeometryInstanceAttribute";
import GroundPolylineGeometry from "cesium/Core/GroundPolylineGeometry";
import VertexFormat from "cesium/Core/VertexFormat";
import CornerType from "cesium/Core/CornerType";
import PolylineGeometry from "cesium/Core/PolylineGeometry";
import GroundPolylinePrimitive from "cesium/Scene/GroundPolylinePrimitive";
import Primitive from "cesium/Scene/Primitive";
import Color from "cesium/Core/Color";
import GeometryInstance from "cesium/Core/GeometryInstance";
import Util from "../utils/Util";
import defaultValue from "cesium/Core/defaultValue";
import CustomDataSource from 'cesium/DataSources/CustomDataSource'
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartesian2 from "cesium/Core/Cartesian2";
import PolylineMaterialAppearance from "cesium/Scene/PolylineMaterialAppearance";
import Rectangle from "cesium/Core/Rectangle";
import LayerEventType from "../constant/LayerEventType";
import { GeoDepository } from "../core/GeoDepository"
import LayerType from "../constant/LayerType";
import FeatureType from "../constant/FeatureType";
import DefaultData from '../constant/DefaultData.js';
import GeoUtil from "../utils/GeoUtil";
import CustomPolylinePrimitive from './basePrimitive/CustomPolylinePrimitive';
import BoundingSphere from "cesium/Core/BoundingSphere.js";
import when from 'cesium/ThirdParty/when'
import { defaults } from "lodash";
import destroyObject from 'cesium/Core/destroyObject';
import createGuid from "cesium/Core/createGuid";

class LineLayer extends Layer {
    /**
     * 线图层,可实现线图层数据的添加、移除、缩放至和显隐等操作
     * @alias LineLayer
     * @constructor
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} [options.name] 图层名称；
     * @param {Boolean} [options.show] 是否显示；
     * @param {String} [options.customGroupId] 自定义分组的ID；
     * 
     * @example
     * let geomap = new BOSGeo.GeoMap('bosgeoContainer');
     * let lineLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.LINE, 'testLine');
     * 
     */
    constructor(options) {
        super(options);

        //管理普通线
        this.collection = new PrimitiveCollection();
        this.viewer.scene.primitives.add(this.collection);

        //管理动态线
        this.dataSource = new CustomDataSource('lineLayer');
        this.viewer.dataSources.add(this.dataSource);

        this.lines = [];
        this._show = this.collection.show = this.dataSource.show = options.show;
        this.layerType = LayerType.LINE;

        this._color = this._originColor = '#ff7575';
        this._opacity = 1;

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
        this.collection.show = value;
        this.dataSource.show = value;
        this.fire(LayerEventType.CHANGE, { toggleShow: true });
        GeoDepository.scene.requestRender();
    }

    /**
     * 十六进制的颜色字符串
     * @property {String} 
     */
    get color() {
        return this._color;
    }
    set color(v) {
        this._color = v;
        this.lines.forEach((l)=>l.color=v)
        GeoDepository.scene.requestRender();
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
            this.lines.forEach((l)=>l.opacity=v)
            GeoDepository.scene.requestRender();
        }
    }

    /**
     * 添加线
     *
     * @param {Object} options 包含以下属性的对象：
     * @param {Array<Array<Number>>|Array<Cartesian3>} options.positions 必传经纬度与高程坐标数组 [[x1,y1,z1],[x2,y2,z2]]；
     * @param {Number} [options.width=10] 宽度；
     * @param {Boolean} [options.clampToGround = false] 是否贴地
     * @param {String} [options.color='#ff0000'] 颜色；
     * @param {Number} [options.opacity=1] 不透明度;
     * @param {Boolean} [options.isReverse=false] 是否逆向;
     * @param {Number} [options.lineType] 线的类型，1,普通颜色普通线，2为虚线普通线，3发光普通线，4为动态线
     * @param {String|Image} [options.dynamicImg] 使用动态材质时，是否使用自定义元素
     * @param {Number} [options.speed = 20] 使用动态材质时，动态材质速度
     * @param {Number} [options.repeat = 1] 使用动态材质时，自定义元素重复个数
     * @param {String} [options.id] 添加的线对象的id值, 默认为GUID值，选填。
     * @returns {Line}
     *
     * @example
    *  //创建线图层：lineLayer
        const line1 = lineLayer.add({
            positions:[[115.054437,25.551279,48], [115.07,25.279,48]],
            color:'#1748d2',
            lineType:1
        });
        const line2 = lineLayer.add({
            positions: [[115.054437, 25.51279, 48], [115.07, 25.279, 48],[115.017, 25.1279, 48]],
            color: '#ff0000',
            lineType: 4
        });
     *
     *
     */
    add(options) {
        
        let {
            positions,
            width = 10,
            color = '#ff0000',
            lineType,
            clampToGround = false,
            dynamicImg = '',
            speed = 20, 
            opacity = 1,
            repeat = 1,
            isReverse = false,
            id
        } = options;
        options.positions = positions = positions.map(p => GeoUtil.getVerifiedPosition(p, 'LineLayer.add: options.positions'));

        if(isReverse){
            positions = options.positions = positions.reverse();
        }

        //判断创建哪种线
        let line_obj;
        //1.动态线使用entity
        if (lineType === 4) {
            line_obj = this._addDynamicLine(options)
        }
        //2.其他线使用Primitive
        else {
            //线材质：虚线，发光线，单箭头线
            
            color = Color.fromCssColorString(color).withAlpha(opacity); //默认为普通颜色材质
            let material;
            switch (lineType) {
                case 2:
                    material = Material.fromType("PolylineDash", { color });
                    break
                case 3:
                    material = Material.fromType("PolylineGlow", {
                        color,
                        glowPower: 0.1,
                        taperPower: 1,
                    });
                    break;
                    //四为动态材质
                case 5:
                    material = Material.fromType("PolylineArrow", { color });
                    break;
                default:
                    material = Material.fromType("Color", { color });
                    break;
            }
          
            line_obj = new CustomPolylinePrimitive({isGround:clampToGround,width,material,color,positions})
            this.collection.add(line_obj);
        }

        line_obj.uuid = defaultValue(options.uuid, Util.generateUUID());

        const featureType = (options.lineType === 4) ? FeatureType.LINE_DYNAMIC:FeatureType.LINE_NORMAL;
        const line = new Line({line:line_obj, featureType, dynamicImg, speed,color, repeat, layer:this, clampToGround,width,isReverse});
        line.id =  id || createGuid();
        this.lines.push(line);
        GeoDepository.scene.requestRender();
        this.fire(LayerEventType.ADD, line);
        this.fire(LayerEventType.CHANGE);
        return line;

    }
    /**
     * 添加抛物线
     *
     * @param {Object} options 包含以下属性的对象：
     * @param {Array<Number>|Cartesian3} option.startPosition  弧线起始点位置
     * @param {Array<Number>|Cartesian3} option.endPosition  弧线终点位置
     * @param {Number} [option.arcHeight = 50000]  弧线最高点的高度
     * @param {Number} [option.arcDensity = 30]  弧线光滑度
     * @param {Number} [options.width=10] 宽度；
     * @param {Boolean} [options.clampToGround = false] 是否贴地
     * @param {String} [options.color='#ff0000'] 颜色；
     * @param {Number} [options.opacity=1] 不透明度;
     * @param {Boolean} [options.isReverse=false] 是否逆向;
     * @param {Number} [options.lineType] 线的类型，1,普通颜色普通线，2为虚线普通线，3发光普通线，4为动态线
     * @param {String|Image} [options.dynamicImg] 使用动态材质时，是否使用自定义元素
     * @param {Number} [options.speed = 20] 使用动态材质时，动态材质速度
     * @param {Number} [options.repeat = 1] 使用动态材质时，自定义元素重复个数
     * @returns {Line}
     *
     * @example
     * const landMaterial = BOSGeo.AreaMaterialConfig.DOT; //获取一套材质配置参数模板
     * landMaterial.lightColor = '#ff0000'; //修改材质配置参数
     * 
     * areaLayer.addCircle({
     *   center: [113,24,0],
     *   radius:120,
     *   landMaterial
     * });
     *
     *
     */
     addArcline(options) {
        let {
            arcHeight = 50000,
            arcDensity = 30,
            startPosition,
            endPosition
        } = options;
        try{
            startPosition = GeoUtil.getVerifiedPosition(startPosition, 'LineLayer.addArcline: options.startPosition ');
            endPosition = GeoUtil.getVerifiedPosition(endPosition, 'LineLayer.addArcline: options.endPosition ');
        }catch(e){
            throw e;
        }
        options.positions = GeoUtil.getLinkedPointList(startPosition, endPosition, arcHeight, arcDensity);
        return this.add(options);
    }

    /**
     * 添加动态线
     * @ignore
     * @param {Object} options 包含以下属性的对象：
     * @param {Array<Cartesian3>} options.positions 坐标；
     * @param {Number} [options.width=10] 宽度；
     * @param {String} [options.color='#ff0000'] 颜色；
     * @param {String|Image} [options.dynamicImg] 使用动态材质时，使用自定义元素
     * @param {Number} [options.repeat] 使用动态材质自定义元素时，重复个数
     * @param {Number} [options.speed = 20] 使用动态材质时，动态效果的速度。
     * @returns {Entity}
     *
     */
    _addDynamicLine(options) {
        let {
            positions,
            width = 10,
            color = '#ff0000',
            dynamicImg,
            clampToGround = false,
            speed = 20,
            opacity = 1,
            repeat = 1
        } = options; 

        
        const lineLength = positions.reduce((acc, cur) => {
            if (acc.pre) acc.sum += Cartesian3.distance(acc.pre, cur);
            acc.pre = cur;
            return acc;
        }, { pre: null, sum: 0 }).sum;
        
        //线材质：动态材质
        let material = new PolylineDynamicMaterialProperty({
            color: Color.fromCssColorString(color).withAlpha(opacity),
            duration:(speed>0)? (lineLength*100/speed) : 800,
            image: (dynamicImg) ? dynamicImg : DefaultData.IMG_DATA_TRANS,
            repeat: new Cartesian2(repeat,1)
        });
        //创建线：Entity
        const line = this.dataSource.entities.add({
            polyline: {
                positions,
                width,
                material,
                clampToGround
            }
        }); 
        return line;
    }


    /**
     * 根据对象移除
     * @param {Line} line
     */
    remove(line) {
        if (line.bosGroup) line = line.bosGroup;

        if(this.lines.includes(line)){
            line.deleteBoundingVolume();
            this.lines = this.lines.filter(l => l !== line);
            this.dataSource.entities.remove(line.line);
            this.collection.remove(line.line);
            line.destroy();
            this.fire(LayerEventType.CHANGE);
            this.fire(LayerEventType.REMOVE, line);
            GeoDepository.scene.requestRender();
        }
    }

    /**
     * 移除所有线图层
     */
    removeAll() {
        
        this.collection.removeAll();
        this.dataSource.entities.removeAll();
        this.lines.forEach(l => l.destroy());
        this.lines = [];
        this.fire(LayerEventType.CHANGE);
        GeoDepository.scene.requestRender();
    }
    /**
     * 缩放至本图层
     * @param {Function} callback 回调函数
     */
     zoomToLayer(callback) {
        if (!(this.lines.length)) return;
        const camera = this.viewer.camera;

        const positions = this.lines.reduce((acc, cur) => {
            return acc.concat(cur.positions);
        }, [])
        const bs = BoundingSphere.fromPoints(positions);
        camera.flyToBoundingSphere(bs,{complete:callback});

    }

    /**
     * 销毁本图层
     */
    destroy() {
        this.viewer.scene.primitives.remove(this.collection);
        this.viewer.dataSources.remove(this.dataSource);
        this._destroyBaseLayer();
    }

}
/**线图层中的线，该类型无法独立创建，只能通过线图层生成；
 * @class 
*/

 class Line {
    constructor(options = {}) {
        const { line, featureType, dynamicImg, speed, layer,repeat, clampToGround,width,isReverse } = options;
        this.line = line
        this.layer = layer;
        this.clampToGround = clampToGround;
        this.featureType = featureType;
        this.dynamicImg = dynamicImg;
        this.speed = speed;
        this.repeat = repeat;
        this.isReverse = isReverse; 
        this.boundingVolume = undefined;
        this.width = width; 
        this.baseHeight = 0; 
        this.boundingColor = undefined;

        if(featureType === FeatureType.LINE_DYNAMIC){
            this.positions = this.line.polyline.positions.getValue();
            this.lineInitColor = this.line.polyline.material._color.getValue();
        }else if(featureType === FeatureType.LINE_NORMAL){
            this.positions = this.line.positions;
            this.lineInitColor = this.line.primitive.appearance.material.uniforms.color;
        }

        this._positions = (this.isReverse)?[...this.positions].reverse():this.positions;//保存非逆向的原始坐标数据
        this._baseHeight = this._positions.map((p) => {
            return GeoUtil.cartesianToArray(p)[2];
        })
        this.line.bosGroup = this;
        this._opacity = 1;

    }

    /**
     * 十六进制的颜色字符串
     * @property {String|Color} 
     */
    get color() {
        return this._color;
    }
    set color(v) {
        const featureType = this.featureType;
        
        let color;
        if(v && (this.color !== v)){
            if((typeof(v) !=='string') && !(v instanceof Color)) throw new Error('Point.color: 请输入正确的值！')
            color = (typeof(v)==='string')?Color.fromCssColorString(v):v;
            this._color = color.toCssHexString();
        }else{
            color = this.lineInitColor;
            this._color = this.lineInitColor.toCssHexString();
        }
        if(featureType === FeatureType.LINE_DYNAMIC){
            this.line.polyline.material._color.setValue(color);
        }else if(featureType === FeatureType.LINE_NORMAL){
            this.line.primitive.appearance.material.uniforms.color = color;
        }
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
            const featureType = this.featureType;
            this._opacity = v;
            if(featureType === FeatureType.LINE_DYNAMIC){
                const c = this.line.polyline.material._color;
                const color = c.getValue();
                color.alpha = v;
                c.setValue(color);
            }else if(featureType === FeatureType.LINE_NORMAL){
                this.line.primitive.appearance.material.uniforms.alpha = v;
            }
        }
    }
    /**
     * 周长
     * @readonly
     * @property {Number}
     */
    get lineLength() {
        if (!this._lineLength) this._lineLength = this._positions.reduce((acc, cur) => {
            if (acc.pre) acc.sum += Cartesian3.distance(acc.pre, cur);
            acc.pre = cur;
            return acc;
        }, { pre: null, sum: 0 }).sum;
        return this._lineLength;
    }
    
    /**
     * 经纬度坐标
     * @readonly
     * @property {Array<Number>}
     */
    get positionsWGS84() {
        const _positionsWGS84 = this._positions.map(p => GeoUtil.cartesianToArray(p));
        return _positionsWGS84;
    }

    /**
     * 更改线基础宽度，高度，是否逆向
     * @param {Object} options 选项 
     * @param {Number} [options.width] 选填，宽度
     * @param {Number} [options.baseHeight] 选填，基础高度
     * @param {String} [options.color] 颜色
     * @param {Boolean} [options.isReverse] 选填，是否逆向 
     */
    changeLine(options) {
        const {featureType} = this;
        let { width, baseHeight, isReverse, color} = options;
        //改高度
        if (!isNaN(baseHeight) && (this.baseHeight !== baseHeight)) {
            if (this.clampToGround){
                console.error('无法升降贴地线，请创建时设置clampToGround为false!');
                return;
            }
            this.baseHeight = baseHeight;
            let offSetHeight;
            this._positions = this.positionsWGS84.map((degrees,i) => {
                if(i === 0) offSetHeight = baseHeight - this._baseHeight[i]; //基础高度以首点高度为基准，得到首点调整的高度差；

                this._baseHeight[i] = degrees[2] = this._baseHeight[i] + offSetHeight;
                return Cartesian3.fromDegrees(...degrees);
            });
            this.positions = (this.isReverse)?[...this._positions].reverse():this._positions;
            if(featureType === FeatureType.LINE_DYNAMIC){
                this.line.polyline.positions.setValue(this.positions);
            }else if(featureType === FeatureType.LINE_NORMAL){
                this.line.setPosition(this.positions);
            }
        }

        //改方向
        if(defined(isReverse) && (this.isReverse !== isReverse)){
            this.isReverse = isReverse;
            this.positions = (this.isReverse)?[...this._positions].reverse():this._positions;

            if(featureType === FeatureType.LINE_DYNAMIC){
                this.line.polyline.positions.setValue(this.positions);
                this.line.polyline.material = clone(this.line.polyline.material);
            }else if(featureType === FeatureType.LINE_NORMAL){
                this.line.setPosition(this.positions);
            }
        }

        //改宽度
        if ((width >= 0) && (this.width !== width)) {
            if(featureType === FeatureType.LINE_DYNAMIC){
                this.line.polyline.width.setValue(width);
            }else if(featureType === FeatureType.LINE_NORMAL){
                this.line.width = width;
                this.line.setPosition(this.positions);
            }
            this.width = width;
        }

        //改颜色
        if (color && (this.color !== color)) {
            color = Color.fromCssColorString(color);
            this.lineInitColor = color;
            this.color = color;
        }
        if(this.boundingVolume) this.addBoundingVolume();
        GeoDepository.scene.requestRender();
    }
    /**
     * 如果本线是动态线时，可修改动态线动态效果
     * @param {Object} options 修改动态线选项
     * @param {String} [options.dynamicImg] 动态材质
     * @param {Number} [options.speed] 速度
     * @param {Number} [options.repeat] 自定义材质重复
     */
    changeDynamicLineStyle(options) {
        let { dynamicImg = this.dynamicImg, speed = this.speed, repeat = this.repeat } = options;
        if(this.featureType === FeatureType.LINE_DYNAMIC){
            const m = this.line.polyline.material;

            if( dynamicImg && (this.dynamicImg !== dynamicImg)){
                this.dynamicImg = dynamicImg;
                m._image.setValue(dynamicImg);
            }
      
            if (repeat && (this.repeat !== repeat)) {
                this.repeat = repeat;
                m.repeat._value.x = repeat;
            }
            if (speed && (this.speed !== speed)) {
                this.speed = speed;
                m._duration = this.lineLength*100/speed;
            }
        }
        GeoDepository.scene.requestRender();
    }
    /**
     * 添加包围盒
     */
    addBoundingVolume(){
        let color = this.boundingColor
        this.deleteBoundingVolume();
        if(color){
            color = Color.fromCssColorString(color);
        }else color = Color.WHITE;

        const width = this.width * 2;
        this.boundingVolume = this.layer.dataSource.entities.add({
            polylineVolume: {
                positions: this.positions,
                shape: [
                    new Cartesian2(-width, -width),
                    new Cartesian2(width, -width),
                    new Cartesian2(width, width),
                    new Cartesian2(-width, width),
                  ],
                cornerType: CornerType.BEVELED,
                material: Color.WHITE.withAlpha(0),
                outline: true, 
                outlineWidth: this.width,
                outlineColor: Color.WHITE
            }
        });
        this.boundingVolume.bosGroup = this;
        GeoDepository.scene.requestRender();

    }

    /**
     * 删除包围盒
     */
    deleteBoundingVolume(){
        if(this.boundingVolume){
            this.layer.dataSource.entities.remove(this.boundingVolume);
            this.boundingVolume = null;
        }
    }
    /**
     * 销毁对象
     */
     destroy(){
        destroyObject(this);
    }
 
}

export default LineLayer;
