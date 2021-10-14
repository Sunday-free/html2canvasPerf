
import Cartesian3 from 'cesium/Core/Cartesian3'
import Cartesian2 from 'cesium/Core/Cartesian2'
import Matrix4 from 'cesium/Core/Matrix4'
import Color from 'cesium/Core/Color'
import ArcType from 'cesium/Core/ArcType.js'
import defined from 'cesium/Core/defined'
import DeveloperError from 'cesium/Core/DeveloperError'
import BoundingSphere from 'cesium/Core/BoundingSphere'
import PrimitiveCollection from 'cesium/Scene/PrimitiveCollection';
import Model from 'cesium/Scene/Model'
import Material from 'cesium/Scene/Material'
import Cesium3DTileset from 'cesium/Scene/Cesium3DTileset'
import CustomDataSource from 'cesium/DataSources/CustomDataSource'
import PolylineArrowMaterialProperty from 'cesium/DataSources/PolylineArrowMaterialProperty'
import Transforms from 'cesium/Core/Transforms' 
import clone from 'cesium/Core/clone'

import GeoUtil from '../utils/GeoUtil';
import FeatureType from "../constant/FeatureType";
import Matrix3 from 'cesium/Core/Matrix3';
import CustomPolygonPrimitive from '../layer/basePrimitive/CustomPolygonPrimitive';
import CustomPolylinePrimitive from '../layer/basePrimitive/CustomPolylinePrimitive';
import EditorAxisType from '../constant/EditorAxisType';
import LinePrimitive from '../layer/basePrimitive/LinePrimitive';


/**
 * 坐标轴
 * @class AxisFrame
 * @param {Geomap} geomap 地图对象
 * @param {Object} options 属性选项
 * @param {Cesium3DTileset|Model|Point} options.target 目标对象，支持通过ModelLayer.add方法添加的三维模型对象（Model、Cesium3DTileset）和点实体对象（Entity）
 * @param {String} [options.xColor='#ff0000'] x轴颜色
 * @param {String} [options.yColor='#00ff00'] y轴颜色
 * @param {String} [options.zColor='#0000ff'] z轴颜色
 * @param {String} [options.xyColor='#0000ff85'] xy轴面颜色
 * @param {String} [options.yzColor='#ff000085'] yz轴面颜色
 * @param {String} [options.xzColor='#00ff0085'] xz轴面颜色
 * @param {Number} [options.radius] 坐标轴长度,若不指定长度，则长度根据当前目标对象大小而定。
 * @param {Number} [options.hasAxisPlane= true] 是否需要轴面
 * @param {Number} [options.hasDepth= false] 是否允许坐标轴在一定深度也显示，若为true，坐标轴总是置于被拖拽目标的前方。
 * @param {Number} [options.width= 20] 坐标轴宽度
 * @param {Number} [options.planeScale= 0.3] 轴面比例
 * @param {Number} [options.minimumScale= 0.3] 坐标轴最小比例
 * @param {Number} [options.maximumScale= 5] 坐标轴最大比例
 * @example
 *  let geomap = new BOSGeo.GeoMap('container');
 *  let layerManager = map.layerManager;
 *  let modelLayer = layerManager.createLayer(BOSGeo.LayerType.MODEL, "模型");
 *  let myModel = modelLayer.add({
 *      name: '模型名称',
 *      url: 'https://lab.earthsdk.com/model/3610c2b0d08411ea/tileset.json'
 *  });
 *  geomap.enableMoveFeature(new BOSGeo.AxisFrame(geomap, {target:myModel}));
 *
 *  //或者点击模型方式
 *  geomap.on(BOSGeo.MapEventType.LEFT_CLICK, (e) => {
        if(e.feature){  //拾取到模型时
            const f = BOSGeo.GeoUtil.getPickTargetFeature(e.feature).target;
            BOSGeo.GeoUtil.selectFeature(f);
            console.log(f);
            const axis = new BOSGeo.AxisFrame(geomap, { target: f, hasDepth:true});//对拾取模型创建坐标轴
            geomap.enableMoveFeature(axis, (e)=>console.log(e));  //拾取模型与坐标轴可移动
        }
    }, [BOSGeo.MapPickType.FEATURE]);

    document.addEventListener('keydown', function (event) {
        if (event.keyCode === 'I'.charCodeAt(0)) {
            geomap.disableMoveFeature(); //关闭要素移动事件功能
        }
    );

    @see GeoMap
 */

class AxisFrame {
    constructor(geomap, options = {}) {
        const {
            target,
            xColor = '#ff0000', 
            yColor = '#00ff00',
            zColor = '#0000ff',
            xyColor = '#0000ff85',
            yzColor = '#ff000085',
            xzColor = '#00ff0085',
            radius = 100,
            width = 20,
            minimumScale = 0.3,
            hasAxisPlane = true,
            hasDepth = false,
            maximumScale = 5,
            planeScale = 0.3,
        } = options;

        this.geomap = geomap;
        this.hasAxisPlane = hasAxisPlane;
        this.hasDepth = hasDepth;
        //管理所有轴，轴面。
        this.allPrimitives = geomap.scene.primitives.add(new PrimitiveCollection());

        //保存轴，轴面颜色
        this.axisColor = {};
        this.planeColor = {};

        const {XPAN, YPAN, ZPAN, XY_PLANE, XZ_PLANE, YZ_PLANE} = EditorAxisType;
        this.axisColor[XPAN] = xColor;
        this.axisColor[YPAN] = yColor;
        this.axisColor[ZPAN] = zColor;

        this.planeColor[XY_PLANE] = xyColor;
        this.planeColor[XZ_PLANE] = xzColor;
        this.planeColor[YZ_PLANE] = yzColor;

        //轴，轴面primitive
        this.axisPrimitive = {};
        this.hasAxisPlane && (this.planePrimitive = {});

        //坐标轴大小  
        
        this.minimumScale = minimumScale;
        this.maximumScale = maximumScale;
        this.planeScale = planeScale;
        this.width = width;
        this.scale = 1;
        this.radius = this._getTargetRadius(target) || radius; //初始化半径

        this.target = target; //设置操作目标, 同时设置_localToWorldMatrix|_worldToLocalMatrix|_center
        this._highlightAxisOrPlane = undefined; //高亮轴
        this.createAxis();
        this.modelMatrix = Matrix4.IDENTITY;
        


    }

    /**
     * 坐标轴是否可见
     * @property {Boolean}
     * 
     * @default true
     */
    get show() {
        return this._show;
    }
    set show(value) {
        Check.typeOf.bool("value", value);
        if (value !== this._show) {
            this._show = value;
            this.allPrimitives.show = value;
            this.geomap.render();
        }
    }
    /**判断当前目标类型
     * @private
     * @ignore
     */
    _getTargetRadius(target) {
        let radius = 100;
        if (target instanceof Model) {
            // this._target = target;
            // this._targetType = targetTypes.model;
            const scale = (target.scale||1) * (target._modifyOptions?Math.max(...target._modifyOptions.scale):1);
            radius = target._boundingSphere.radius* scale*1.5 * this.scale;
        } else if (target instanceof Cesium3DTileset) {
            // this._target = target;
            // this._targetType = targetTypes.tiles;
            //const scale = (target._modifyOptions?Math.max(...target._modifyOptions.scale):1);

            let box = Matrix3.getScale(target._root.boundingVolume.boundingVolume.halfAxes, new Cartesian3());
            let maxLenInBox = Math.max(...Cartesian3.pack(box,[]));
            radius = maxLenInBox*1.5* this.scale;
        } else if (target.featureType === FeatureType.POINT) {
            // this._target = target;
            // this._targetType = targetTypes.poi;
            radius = (target._pedestalEffect.radius || 10) * 1.5* this.scale;
        } else{
            radius = 100;
        }
        return radius
        // else throw new DeveloperError('该对象不支持创建坐标轴！');
    }
    /**
       * @property {EditorAxisType} highlightAxisOrPlane 高亮
       */
    get highlightAxisOrPlane() {
        return this._highlightAxisOrPlane;
    }
    set highlightAxisOrPlane(value) {
        if (this._highlightAxisOrPlane === value) return; //若该轴已高亮则不继续执行

        const {XPAN, YPAN, ZPAN, XY_PLANE, XZ_PLANE, YZ_PLANE} = EditorAxisType;
        const axisOrPlane = this.axisPrimitive[value] || (this.hasAxisPlane && this.planePrimitive[value]);
        if(value && axisOrPlane){
            this._highlightAxisOrPlane = value;
            const unHighlight = '#c8c8c899';
            const highlight = '#ffcc00';
            const unHighlightMaterial = Material.fromType('Color', {color:Color.fromCssColorString(unHighlight)});
            const highlightMaterial = Material.fromType('Color', {color:Color.fromCssColorString(highlight)});

            this.axisPrimitive[XPAN].color = unHighlight;
            this.axisPrimitive[YPAN].color = unHighlight;
            this.axisPrimitive[ZPAN].color = unHighlight;
            if(this.hasAxisPlane){
                this.planePrimitive[XY_PLANE].material = unHighlightMaterial;
                this.planePrimitive[XZ_PLANE].material = unHighlightMaterial
                this.planePrimitive[YZ_PLANE].material = unHighlightMaterial;
            }
            
            if(axisOrPlane instanceof CustomPolygonPrimitive){
                axisOrPlane.material = highlightMaterial;
            }else axisOrPlane.color = highlight;

        }else{
            this._highlightAxisOrPlane = undefined;
            
            this.axisPrimitive[XPAN].color = this.axisColor[XPAN];
            this.axisPrimitive[YPAN].color = this.axisColor[YPAN];
            this.axisPrimitive[ZPAN].color = this.axisColor[ZPAN];
            if(this.hasAxisPlane){
                this.planePrimitive[XY_PLANE].material = Material.fromType('Color', {
                    color: Color.fromCssColorString(this.planeColor[XY_PLANE]),
                });
                this.planePrimitive[XZ_PLANE].material = Material.fromType('Color', {
                    color: Color.fromCssColorString(this.planeColor[XZ_PLANE]),
                });
                this.planePrimitive[YZ_PLANE].material = Material.fromType('Color', {
                    color: Color.fromCssColorString(this.planeColor[YZ_PLANE]),
                });
            }
            
        }

        this.geomap.render();

    }

    /**
     * @property {Cesium3DTileset|Model|Point} target 目标
     */
    get target() {
        return this._target;
    }
    set target(target) {
        if(!target) throw new DeveloperError('AxisFrame.target: 请传入一个目标对象！');
        this._target = target;
        const {model,tiles} = TARGET_TYPES;
        if (target.featureType === FeatureType.GLTF) {
            this._targetType = model;
            this._localToWorldMatrix = target.modelMatrix; //局部转世界坐标
            
        } else if (target instanceof Cesium3DTileset) {
            this._targetType = tiles;
            this._localToWorldMatrix = target._root.transform;
        } else if (target.featureType === FeatureType.POINT_POINT) {
            this._targetType = TARGET_TYPES.point;
            this._localToWorldMatrix = Transforms.eastNorthUpToFixedFrame(target.position);
            
        } else throw new DeveloperError('AxisFrame.target: 该对象不支持创建坐标轴！');

        //世界坐标转局部坐标 
        this._worldToLocalMatrix = Matrix4.inverse(this._localToWorldMatrix, new Matrix4());

        //坐标轴中心
        this._center = Matrix4.multiplyByPoint(
            this._localToWorldMatrix,
            new Cartesian3(0, 0, 0),
            new Cartesian3()
        );

        //坐标轴单位向量信息
        this._localAxisInfo = GeoUtil.getLocalAxisInfo(this._center); //固定z轴朝上
        // this._localAxisInfo = GeoUtil.getLocalAxisInfo(this._center, this._localToWorldMatrix);//坐标轴与模型轴方向一致
    }
    
   
    /**
     * 绘制坐标轴
     * @private
     */
    createAxis(){
        const {geomap, _center,radius, width,_localAxisInfo, hasAxisPlane, allPrimitives, axisPrimitive, planePrimitive,hasDepth} = this;
        allPrimitives.removeAll();

        //创建轴
        AXIS_SETTING.forEach(c=>{
            const defaultConfig = {...AXIS_GRAPHIC_CONFIG};
            defaultConfig.id = {};
            defaultConfig.id.name = 'AxisFrame:' + c.axisType;
            defaultConfig.color = this.axisColor[c.axisType];

            axisPrimitive[c.axisType] = allPrimitives.add(
                new LinePrimitive({
                    ...defaultConfig,
                    ...c,
                    center:_center,
                    radius,
                    width,
                    depthTestEnabled: !hasDepth,
                    localAxisInfo:_localAxisInfo
                    //modelMatrix: Matrix4.IDENTITY,
                    
                })
            );
        })

        //创建面
        if(hasAxisPlane){
            PLANES_SETTING.forEach( c=>{
                const defaultConfig = {...PLANE_GRAPHIC_CONFIG};
                defaultConfig.id = {};
                defaultConfig.id.name = 'AxisFrame:'+ c.axisType;
                defaultConfig.id.axisType = c.axisType;
                defaultConfig.material = Material.fromType('Color', {
                    color: Color.fromCssColorString( this.planeColor[c.axisType] ),
                });
                //每个轴面都画在两个轴的夹角间
                const a1_end = getScaledVec(_center, axisPrimitive[ c.planeInAxis[0] ].positions[1], this.planeScale);
                const a2_end =  getScaledVec(_center, axisPrimitive[ c.planeInAxis[1] ].positions[1], this.planeScale);
                const positions = [
                    _center, 
                    a1_end, 
                    Cartesian3.subtract(Cartesian3.add(a1_end, a2_end, new Cartesian3()), _center, new Cartesian3()), 
                    a2_end
                ];
    
                planePrimitive[c.axisType] = allPrimitives.add(
                    new CustomPolygonPrimitive({
                        ...defaultConfig,
                        positions,
                        depthTestEnabled: !hasDepth,
                    })
                );
            })
        }
        
        //创建监听
        this.updateScaleByDistance = this._updateScaleByDistance.bind(this);
        geomap.scene.preRender.addEventListener(this.updateScaleByDistance);
        this.geomap.render();
    }

    /**
    * 更新
    */
    updateByTarget() {
        
        const target = this.target;
        if (target) {
            //赋值操作，更新新_center, _localToWorldMatrix
            this.target = target;
            let {radius, _center, _localAxisInfo, axisPrimitive, planePrimitive, hasAxisPlane} = this;
        

            //更新轴
            const axises = Object.values(axisPrimitive);
            axises.forEach((a) => {
                a.radius = radius;
                a.center = _center;
                a.localAxisInfo = _localAxisInfo;
            });

            //更新轴面
            if(hasAxisPlane){
                PLANES_SETTING.forEach(c=>{
                    const plane = planePrimitive[c.axisType];
                    
                    //每个轴面都画在两个轴的夹角间
                    const a1_end = getScaledVec(_center, axisPrimitive[ c.planeInAxis[0] ].positions[1], this.planeScale);
                    const a2_end =  getScaledVec(_center, axisPrimitive[ c.planeInAxis[1] ].positions[1], this.planeScale);
                    const positions = [
                        _center, 
                        a1_end, 
                        Cartesian3.subtract(Cartesian3.add(a1_end, a2_end, new Cartesian3()), _center, new Cartesian3()), 
                        a2_end
                    ];
                    plane.setPosition(positions);
                })
            }
           
            //此时坐标轴_localToWorldMatrix等属性发生变化
            this.updateScale();
        }

    }


    /**
    * 根据坐标轴移动
    * @private
    * @ignore
    * @param {Cartesian2} win_start 屏幕起点
    * @param {Cartesian2} win_end 屏幕终点
    * @param {EditorAxisType} direction 方向
    * @example
    * let axis = new BOSGeo.AxisFrame({target:myModel});
    * axis.moveTargetOnDirection(start, end, direction)
    */
    moveTargetOnDirectionInWindow(win_start, win_end, direction) {
        let axises = [undefined, undefined, undefined]; //[x, y, z]与本次移动有关的轴, 若是轴拖动，相关轴就只有一个轴，若是面拖动，相关轴就有两个

        const {axisPrimitive, radius, target, _targetType} = this;
        const {XPAN, YPAN, ZPAN, XY_PLANE, XZ_PLANE, YZ_PLANE} = EditorAxisType;

        if([XPAN, YPAN, ZPAN].includes(direction)){
            switch(direction){
                case XPAN:
                    axises[0] = axisPrimitive[direction]; 
                break;
                case YPAN:
                    axises[1] = axisPrimitive[direction]; 
                break;
                case ZPAN:
                    axises[2] = axisPrimitive[direction]; 
                break;
            }
            axises.push();
        }else if([XY_PLANE, XZ_PLANE, YZ_PLANE].includes(direction)){
            switch(direction){
                case XY_PLANE:
                    axises[0] = axisPrimitive[XPAN]; //若是面拖动，相关轴就有两个
                    axises[1] = axisPrimitive[YPAN]; 
                break;
                case XZ_PLANE:
                    axises[0] = axisPrimitive[XPAN];
                    axises[2] = axisPrimitive[ZPAN]; 
                break;
                case YZ_PLANE:
                    axises[1] = axisPrimitive[YPAN];
                    axises[2] = axisPrimitive[ZPAN]; 
                break;
            }
        }else throw new Error("AxisFrame.moveTargetOnDirectionInWindow: 请传入正确的方向！");


        //将相关坐标的首尾点转为屏幕坐标
        const scene = this.geomap.scene;
        const axisStartEndArr = axises.map(ax => ax? ax.positions : ax);
        const axisStartEndArrInWin = axisStartEndArr.map(ax =>ax? ax.map( p => scene.cartesianToCanvasCoordinates(p)) : ax);
        
        //若从屏幕坐标转世界坐标失败:当前所有轴起终点均屏幕坐标转世界坐标失败 或 存在一个轴的起或终点转换失败
        const testStartEndArrInWin = axisStartEndArrInWin.filter(a => a); //过滤掉用于占位的undefined；
        if(!testStartEndArrInWin.length || testStartEndArrInWin.flat().every(p=>!Boolean(p)) || testStartEndArrInWin.find(startEnd=>{
            return (Boolean(startEnd[0]) !== Boolean(startEnd[1]))
        })){
            //TODO: 转屏幕坐标失败
            return;
        };
        

        //解算在各个轴上的移动距离，得到各方向移动分量移动量
        const moveVecInWin = Cartesian2.subtract(win_start, win_end, new Cartesian2()); //屏幕移动向量
        const moveOnAxisVec = axisStartEndArr.map((vec, i) =>{
            if(!vec) return 0; 
            const startEndInWin = axisStartEndArrInWin[i];
            const axVecInWin = Cartesian2.subtract(...startEndInWin, new Cartesian2()); //屏幕轴向量
            const axLengthInWin = Cartesian2.distance(...startEndInWin); //屏幕轴长度


            let moveLengthInWin = Cartesian2.dot(moveVecInWin, axVecInWin) / Cartesian2.magnitude(axVecInWin); //屏幕上的移动距离
            let moveLength = moveLengthInWin * radius / axLengthInWin; //移动量
            
            return  moveLength;
        })

        //得到最终移动向量
        /*
        * 开始移动
        */
        if(!moveOnAxisVec.find(v=> v !== 0)) return;
        //针对模型
        const { model, tiles, point } = TARGET_TYPES;
        if ([model, tiles].includes(_targetType)) {
            if (target._modifyOptions && target._modifyOptions.offset) { //非初次偏移：需要获取以往的移动
                const lastOffset = target._modifyOptions.offset;
                target._modifyOptions.offset = lastOffset.map( (l, i)=> l+moveOnAxisVec[i]);
                GeoUtil.modifyingModel(target, target._modifyOptions);
            } else { //初次偏移
                const initMove = [...moveOnAxisVec];
                const option = target._modifyOptions? {...target._modifyOptions, offset: initMove}: { offset: initMove };
                GeoUtil.modifyingModel(target, option)
            }
        } else if (point == _targetType) {
            if (target._modifyOptions && target._modifyOptions.point && target._modifyOptions.point.offset) { //非初次偏移：需要获取以往的移动
                const lastOffset = target._modifyOptions.point.offset;
                target._modifyOptions.point.offset = lastOffset.map( (l, i)=> l+moveOnAxisVec[i]);
                GeoUtil.modifyingElement(target, target._modifyOptions);
            } else { //初次偏移
                const initMove = [...moveOnAxisVec];
                const option = (target._modifyOptions && target._modifyOptions.point)? target._modifyOptions: { point:{offset: initMove} };
                option.point.offset = initMove;
                GeoUtil.modifyingElement(target, option)
            }
        }

    }
     /**
     * 按距离缩放尺寸
     * 
     * @private
     */
     _updateScaleByDistance() {
        const { _center, geomap, radius, scale, maximumScale, minimumScale } = this;
        const distance = Cartesian3.distance(_center, geomap.scene.camera.positionWC);
        const curScale = Math.round(distance / radius / 20 * 10) / 10;
        if (curScale !== scale && curScale <= maximumScale && curScale >= minimumScale) {
            this.scale = curScale;
            this.updateScale();

        }
    }
     /**
     * 缩放尺寸
     * 
     * @private
     */
    updateScale() {
        const { _localToWorldMatrix, _worldToLocalMatrix } = this;

        const scaleMatrix = Matrix4.fromScale(new Cartesian3(this.scale, this.scale, this.scale));


        this.modelMatrix = Matrix4.multiply(_localToWorldMatrix,
            Matrix4.multiply(
                scaleMatrix,
                _worldToLocalMatrix,
                new Matrix4()),
            new Matrix4());

        // 更新编辑轴图元（）
        this.allPrimitives._primitives.forEach((primitive) => {
            primitive.modelMatrix = this.modelMatrix;
        });
    }
  
    /**
     * @param {Primitive} primitive 坐标系中是否包含该元素
     * @return {Boolean}
     */    
    contains(primitive){
        const all_custom = this.allPrimitives._primitives;
        const all = all_custom.map(p => p.primitive);
        return ((all_custom.includes(primitive)) || (all.includes(primitive)))
    }

    /**
     * 销毁
     * @see GeoMap
    */
    destroy() {
        this.geomap.scene.primitives.remove(this.allPrimitives, true);
        this.geomap.scene.preRender.removeEventListener(this.updateScaleByDistance);
        for (let key in this) {
            delete this[key];
        }
        delete this;

    }
}


//目标类型
const TARGET_TYPES = { point: 'point', model: 'model', tiles: 'tiles' };

//轴面设置
const PLANES_SETTING = [
    { axisType: EditorAxisType.XY_PLANE, planeInAxis:[ EditorAxisType.XPAN,  EditorAxisType.YPAN]}, 
    { axisType: EditorAxisType.XZ_PLANE, planeInAxis:[ EditorAxisType.XPAN,  EditorAxisType.ZPAN]},
    { axisType: EditorAxisType.YZ_PLANE, planeInAxis:[ EditorAxisType.YPAN,  EditorAxisType.ZPAN]},
];

//轴设置
const AXIS_SETTING = [
    { axisType: EditorAxisType.XPAN},
    { axisType: EditorAxisType.YPAN},
    { axisType: EditorAxisType.ZPAN},
];


//轴primitive配置
const AXIS_GRAPHIC_CONFIG = {
    color: '#00FFFF',
    width: 20,
    scalar: 1.3,
    hasArrow: true
}

//轴面primitive配置
const PLANE_GRAPHIC_CONFIG = {
    material:Material.fromType('Color', {
        color: Color.fromCssColorString('#00FFFF').withAlpha(0.4),
    })
}

/**
 * 获取缩放后的向量
 * @private
 * 
 * @param {Cartesian3} startPoint 向量起点
 * @param {Cartesian3} endPoint 向量终点
 * @param {Number} scaler 缩放比例
 * @returns {Cartesian3} 结果
 */
function getScaledVec(startPoint, endPoint, scaler){
    let result = new Cartesian3();
    let vec = Cartesian3.subtract(endPoint, startPoint, result);
    result = Cartesian3.multiplyByScalar(vec, scaler, result);
    return Cartesian3.add(startPoint, result, result);
}

/**
 * 获取局部坐标系相对于世界坐标系下的缩放矩阵
 * @private
 * 
 * @param {Object} localAxisInfo {normalX: Cartesian3, normalY: Cartesian3, normalZ: Cartesian3},表示局部坐标系XYZ轴对应的世界坐标
 * @param {Cartesian3} origin 局部坐标系原点
 * @param {Cartesian3} scale xyz分别表示在xyz方向的缩放尺寸 localAxisInfo, origin, scale
 */
 function getLocalScaleMatrix(localToWorldMatrix, worldToLocalMatrix, scale) {
    // const { normalX, normalY, normalZ } = localAxisInfo;
    // const points = [
    //     normalX.x, normalX.y, normalX.z, 0,
    //     normalY.x, normalY.y, normalY.z, 0,
    //     normalZ.x, normalZ.y, normalZ.z, 0,
    //     origin.x, origin.y, origin.z, 1];

    // const localToWorldMatrix = Matrix4.fromArray(points);
    // // 求世界坐标到局部坐标的变换矩阵 _worldToLocalMatrix
    // const worldToLocalMatrix = Matrix4.inverse(localToWorldMatrix, new Matrix4());

    const scaleMatrix = Matrix4.fromScale(scale);


    return Matrix4.multiply(localToWorldMatrix,
        Matrix4.multiply(
            scaleMatrix,
            worldToLocalMatrix,
            new Matrix4()),
        new Matrix4());
}

export default AxisFrame;
