import Layer from "./Layer";
import Material from "cesium/Scene/Material";
import PrimitiveCollection from "cesium/Scene/PrimitiveCollection";
import ColorMaterialProperty from 'cesium/DataSources/ColorMaterialProperty'
import StripeMaterialProperty from 'cesium/DataSources/StripeMaterialProperty'
import CheckerboardMaterialProperty from 'cesium/DataSources/CheckerboardMaterialProperty'
import CallbackProperty from 'cesium/DataSources/CallbackProperty'
import StripeOrientation from 'cesium/DataSources/StripeOrientation'
import GridMaterialProperty from 'cesium/DataSources/GridMaterialProperty'
import ImageMaterialProperty from 'cesium/DataSources/ImageMaterialProperty'
import PolygonGeometry from "cesium/Core/PolygonGeometry";
import PolygonHierarchy from "cesium/Core/PolygonHierarchy";
import GroundPrimitive from "cesium/Scene/GroundPrimitive";
import MaterialAppearance from "cesium/Scene/MaterialAppearance";
import PerInstanceColorAppearance from "cesium/Scene/PerInstanceColorAppearance";
import EllipsoidSurfaceAppearance from "cesium/Scene/EllipsoidSurfaceAppearance";
import Transforms from 'cesium/Core/Transforms'
import Primitive from "cesium/Scene/Primitive";
import Color from "cesium/Core/Color"; 
import ColorGeometryInstanceAttribute from "cesium/Core/ColorGeometryInstanceAttribute"; 
import AxisAlignedBoundingBox from "cesium/Core/AxisAlignedBoundingBox"; 
import GeometryInstance from "cesium/Core/GeometryInstance";
import BoundingRectangle from "cesium/Core/BoundingRectangle";
import VertexFormat from "cesium/Core/VertexFormat";
import BoxOutlineGeometry  from "cesium/Core/BoxOutlineGeometry";
import Matrix4 from "cesium/Core/Matrix4";
import Util from "../utils/Util";
import defaultValue from "cesium/Core/defaultValue";
import CustomDataSource from 'cesium/DataSources/CustomDataSource'
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartesian2 from "cesium/Core/Cartesian2";
import Clone from "cesium/Core/Clone";
import LayerEventType from "../constant/LayerEventType";
import { GeoDepository } from "../core/GeoDepository"
import LayerType from "../constant/LayerType";
import FeatureType from "../constant/FeatureType";
import GeoUtil from "../utils/GeoUtil";
import BoundingSphere from "cesium/Core/BoundingSphere.js";
import CustomPolygonPrimitive from './basePrimitive/CustomPolygonPrimitive';
import defined from "cesium/Core/defined";
import { defaults } from "lodash";
import DeveloperError from "cesium/Core/DeveloperError";
import destroyObject from 'cesium/Core/destroyObject';
import createGuid from "cesium/Core/createGuid";

class AreaLayer extends Layer {
    /**
     * 区域图层,可实现面图层数据的添加、移除、缩放至和显隐等操作
     * @alias AreaLayer
     * @constructor
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {String} [options.name] 图层名称；
     * @param {Boolean} [options.show=true] 是否显示；
     * @param {String} [options.customGroupId] 自定义分组的ID；
     * 
     * @example
     * let geomap = new BOSGeo.GeoMap('bosgeoContainer');
     * let areaLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.AREA, 'testarea');
     * 
     */
    constructor(options) {
        super(options);

        //管理普通面
        this.collection = new PrimitiveCollection();
        this.viewer.scene.primitives.add(this.collection);

        //管理动态墙
        this.dataSource = new CustomDataSource('wallForAreaLayer');
        this.viewer.dataSources.add(this.dataSource);

        //所有面
        this.areas = [];

        this._show = this.collection.show = this.dataSource.show = defaultValue(options.show,true);
        this.layerType = LayerType.AREA;

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
        this.areas.forEach((a) => a.color = v);
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
            this.areas.forEach((a) => a.opacity = v);
            this._opacity = v;
            GeoDepository.scene.requestRender();
        }
    }

    /**
     * 添加面
     *
     * @param {Object} options 包含以下属性的对象：
     * @param {Array<Array<Number>|Cartesian3>} options.positions 必传经纬度与高程坐标数组。
     * @param {Boolean} [options.clampToGround = false] 是否贴地
     * @param {AreaMaterialConfig} [options.landMaterial] 特殊面材质参数, 选填。
     * @param {String} [options.id] 添加的面对象的id值, 默认为GUID值，选填。
     * @returns {Area}
     *
     * @example
	 * let areaLayer = layerManager.createLayer(BOSGeo.LayerType.AREA,"面图层");
     * const landMaterial = BOSGeo.AreaMaterialConfig.DOT; //获取一套材质配置参数模板
     * landMaterial.lightColor = '#ff0000'; //修改材质配置参数     * 
     * areaLayer.add({
     *   positions: [[113,24,0], [112,25,0],[112,20,0]],
     *   landMaterial:landMaterial
     * });
     */
    add(options) {
        let {
            positions,
            landMaterial = { type: 'Color', color: '#fff000' },
            clampToGround = false,
            id,
        } = options;
        if (!positions || (positions.length < 3)) console.error('请输入三个以上不相同的位置点！')
        landMaterial = Clone(landMaterial,true);

        
        //参数预处理：坐标
        options.positions = positions = positions.map(p => GeoUtil.getVerifiedPosition(p, 'AreaLayer.add: options.positions'));
   
        //判断首点与尾点是否一致，不一致则复制一份首点至尾部
        if (`${positions[0].x},${positions[0].y},${positions[0].z},` !== `${positions[positions.length - 1].x},${positions[positions.length - 1].y},${positions[positions.length - 1].z},`) {
            //若坐标未闭合
            positions = [...positions, positions[0]]
        }

        let baseHeight; //基础高度
        if (clampToGround) {
            baseHeight = 0;
        } else baseHeight = GeoUtil.cartesianToArray(positions[0])[2];


        //参数预处理：面材质
        let landMaterialConfig = {...landMaterial};
        let material = Area.createLandMaterial(landMaterial);
        
        const { color, evenColor, oddColor, darkColor, lightColor } = landMaterial;
        const landInitColor = color || (evenColor && [evenColor, oddColor]) || (lightColor && [darkColor, lightColor]);

        let land = new CustomPolygonPrimitive({
            isGround:clampToGround,
            material,
            positions,
        })
        land = this.collection.add(land);
        land.uuid = defaultValue(options.uuid, Util.generateUUID());


        const area = new Area({ clampToGround,layer: this, land, baseHeight, landInitColor });
        options.radius && (area.featureType = FeatureType.AREA_CIRCLE);
        area.landMaterial = landMaterialConfig;
        area.id =  id || createGuid();
        this.areas.push(area);

        GeoDepository.scene.requestRender();
        this.fire(LayerEventType.ADD, area);
        this.fire(LayerEventType.CHANGE);

        return area;

    }

    /**
     * 添加圆
     *
     * @param {Object} options 包含以下属性的对象：
     * @param {Array<Number>} options.center 圆的中心点。
     * @param {Number} options.radius 圆的半径。
     * @param {Boolean} [options.clampToGround = false] 是否贴地
     * @param {AreaMaterialConfig} [options.landMaterial] 特殊面材质参数, 选填。
     * @returns {Area}
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
     addCircle(options) {
        let {
            center,
            radius
        } = options;
        if(center && radius){
            try{
                center = GeoUtil.getVerifiedPosition(center, 'AreaLayer.addCircle: options.center');
            }catch(e){
                throw e;
            }
            options.positions = GeoUtil.computeCirclePolygon(center, radius);
            return this.add(options);
        }else{
            throw new DeveloperError('AreaLayer.addCircle: 请检查传入参数！')
        }
    }

    /**
     * 根据对象移除
     * @param {Area} area 区域。
     */
    remove(area) {
        if (area.bosGroup) area = area.bosGroup;

        if (this.areas.includes(area)) {
            this.areas = this.areas.filter(a => a != area);

            this.collection.remove(area.land);
            this.dataSource.entities.remove(area.wall);
            area.destroy();
            this.fire(LayerEventType.REMOVE, area);
            this.fire(LayerEventType.CHANGE);
            GeoDepository.scene.requestRender();
        }
    }

    /**
     * 移除所有线图层
     */
    removeAll() {
        
        this.collection.removeAll();
        this.dataSource.entities.removeAll();
        this.areas.forEach(a => a.destroy());
        this.areas = [];
        this.fire(LayerEventType.REMOVE);
        this.fire(LayerEventType.CHANGE);
        GeoDepository.scene.requestRender();
    }
    /**
     * 缩放至本图层
     * @param {Function} callback 回调函数
     */
    zoomToLayer(callback) {
        if (!this.areas.length) return;
        const camera = this.viewer.camera;

        const positions = this.areas.reduce((acc, cur) => {
            return acc.concat(cur.positions);
        }, [])
        const bs = BoundingSphere.fromPoints(positions);
        camera.flyToBoundingSphere(bs,{complete:callback});

    }

    /**
     * 销毁本图层
     */
    destroy() {
        this.areas = [];
        this.viewer.scene.primitives.remove(this.collection);
        this.viewer.dataSources.remove(this.dataSource);
        this._destroyBaseLayer();
    }

}
/**区域面图层中的区域元素，该类型无法独立创建，只能通过区域面图层生成；
 * @class
 */
class Area {
    constructor(options = {}) {
        const { land, wall, layer, baseHeight, landInitColor, clampToGround } = options;
        this.land = land;
        this.wall = wall;
        this.layer = layer;
        this.baseHeight = baseHeight;
        this.clampToGround = clampToGround;
        this.landInitColor = landInitColor;
        this.wallHeight = 50;
        this.wallIsDynamic = false;
        this.wallSpeed = 5;

        this.featureType = FeatureType.AREA_POLYGON;
        this.positions = this.land.positions;
        this.boundingColor = undefined;

        this._positionsWGS84 = undefined;
        this._boundRectangle = undefined;
        this._perimeter = undefined;
        this.boundingVolume = undefined;
        this._opacity = 1;

        this.land.bosGroup = this;
        
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
            if(this.land && this.land.primitive && this.land.primitive.appearance && this.land.primitive.appearance.material){
                const uniforms = this.land.primitive.appearance.material.uniforms;
                if (uniforms.color){
                    uniforms.color.alpha = v;
                }else if (uniforms.evenColor) {
                    uniforms.evenColor.alpha = v;
                    uniforms.oddColor.alpha = v;
                }else if (uniforms.lightColor) {
                    uniforms.lightColor.alpha = v;
                    uniforms.darkolor.alpha = v;
                };
                if (this.wall && this.wall.wall){
                    let c;
                    const material = this.wall.wall.material;
                    if (material.color) {
                        c = material.color.getValue();
                        c.alpha = v;
                        material.color.setValue(c);
                    } else if (material.evenColor) {
                        c = material.evenColor.getValue();
                        c.alpha = v;
                        material.evenColor.setValue(c);
                        c = material.oddColor.getValue();
                        c.alpha = v;
                        material.oddColor.setValue(c);
                    } else if (material.lightColor) {
                        c = material.lightColor.getValue();
                        c.alpha = v;
                        material.lightColor.setValue(c);
                        c = material.darkolor.getValue();
                        c.alpha = v;
                        material.darkolor.setValue(c);
                    };
                }
                this._opacity = v;
                GeoDepository.scene.requestRender();
            }
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
        if(this.land && this.land.primitive && this.land.primitive.appearance && this.land.primitive.appearance.material) {
            const uniforms = this.land.primitive.appearance.material.uniforms;
            if (v && (this.color !== v)) {
                if ((typeof(v) !== 'string') && !(v instanceof Color)) throw new Error('Point.color: 请输入正确的值！')
                color = (typeof(v) === 'string') ? Color.fromCssColorString(v) : v;
                this._color = color.toCssHexString();
                const dark = color.darken(0.3, new Color());
                if (uniforms.color) {
                    uniforms.color = color
                } else if (uniforms.evenColor) {
                    uniforms.evenColor = color;
                    uniforms.oddColor = dark;
                } else if (uniforms.evenColor) {
                    uniforms.lightColor = color;
                    uniforms.darkolor = dark;
                };
                if (this.wall && this.wall.wall) {
                    const material = this.wall.wall.material;
                    if (material.color) {
                        material.color = color;
                    } else if (material.evenColor) {
                        material.evenColor = color;
                        material.oddColor = dark;
                    } else if (material.evenColor) {
                        material.lightColor = color;
                        material.darkolor = dark;
                    };
                }
            } else {
                this._color = undefined;
                const originLandColor = this.landInitColor;
                const originWallColor = this.wallInitColor;
                if (uniforms.color) {
                    uniforms.color = originLandColor
                } else if (uniforms.evenColor) {
                    uniforms.evenColor = originLandColor[0];
                    uniforms.oddColor = originLandColor[1];
                } else if (uniforms.lightColor) {
                    uniforms.lightColor = originLandColor[0];
                    uniforms.darkolor = originLandColor[1];
                };
                if (this.wall && this.wall.wall) {
                    const material = this.wall.wall.material;
                    if (material.color) {
                        material.color = originWallColor;
                    } else if (material.evenColor) {
                        material.evenColor = originWallColor[0];
                        material.oddColor = originWallColor[1];
                    } else if (material.lightColor) {
                        material.lightColor = originWallColor[0];
                        material.darkolor = originWallColor[1];
                    };
                }

            }
            GeoDepository.scene.requestRender();
        }
    }
     /**
     * 经纬度坐标
     * @readonly
     * @property {Array<Number>}
     */
    get positionsWGS84() {
        if(!this._positionsWGS84){
            this._positionsWGS84 = this.positions.map(p => GeoUtil.cartesianToArray(p))
        }
        return this._positionsWGS84;
    }
    
    /**
     * 最小外接矩形
     * @ignore
     * @property {Object}
     */
    get boundRectangle() {
        if (!this._boundRectangle) {
            //创建最小外接矩形盒子
            const rec = AxisAlignedBoundingBox.fromPoints(this.positions);
            const mtx = Transforms.eastNorthUpToFixedFrame(rec.minimum);

            const v = Cartesian3.subtract(rec.maximum, rec.minimum, new Cartesian3());
            let width = Math.abs(Cartesian3.dot(v, Matrix4.multiplyByPoint(
                mtx,
                new Cartesian3(1, 0, 0),
                new Cartesian3()
            )));
            let height = Math.abs(Cartesian3.dot(v, Matrix4.multiplyByPoint(
                mtx,
                new Cartesian3(0, 1, 0),
                new Cartesian3()
            ))); 

            this._boundRectangle = {
                center:GeoUtil.cartesianToArray(rec.center),
                width,
                height
            };
        }
        this._boundRectangle.center[2] = this.baseHeight;
        return this._boundRectangle;
    }
    /**
     * 最小圆
     * @ignore
     * @property {Object}
     */
     get boundingSphere() {
        if (!this._boundingSphere) {
            const {center,radius} =  BoundingSphere.fromPoints(this.positions);
            this._boundingSphere = {
                center:GeoUtil.cartesianToArray(center),
                radius
            };
        }
        this._boundingSphere.center[2] = this.baseHeight;
        return this._boundingSphere;
    }
     /**
     * 周长
     * @readonly
     * @property {Number}
     */
    get perimeter() {
        if (!this._perimeter) this._perimeter = this.positions.reduce((acc, cur) => {
            if (acc.pre) acc.sum += Cartesian3.distance(acc.pre, cur);
            acc.pre = cur;
            return acc;
        }, { pre: null, sum: 0 }).sum;
        return this._perimeter;
    }
    /**
     * 更改墙高度
     * @param {Number} height 高度；
     */
    changeWallHeight(height) {
        if (height>=0) {
            this.wallHeight = height;
            const maxHeight = this.baseHeight + height;
            this.wall.wall.maximumHeights.setValue(Array(this.positions.length).fill(maxHeight));
            if(this.boundingVolume) this.addBoundingVolume();
        }
    }
    /**
     * 更改区域基础高度
     * @param {Number} height 高度；
     */
    changeBaseHeight(height) {
        if (this.clampToGround){
            console.error('无法抬升贴地区域，请创建时设置clampToGround为false!');
            return;
        }
        if (!isNaN(height) && (this.baseHeight !== height)) {
 

            //抬升或下降地面
            this.baseHeight = height;
            this.positions = this.positionsWGS84.map(p=>Cartesian3.fromDegrees(p[0],p[1],height));
            this.land.setPosition(this.positions);
            //抬升墙
            const maxHeight = this.wallHeight + this.baseHeight;
            this.wall.wall.maximumHeights.setValue(Array(this.positions.length).fill(maxHeight));
            this.wall.wall.minimumHeights.setValue(Array(this.positions.length).fill(this.baseHeight));

            if(this.boundingVolume) this.addBoundingVolume();
        }
    }
    /**
     * 更改墙材质
     * @param {AreaMaterialConfig} [wallMaterial] 特殊墙材质，（仅支持AreaMaterialType.STRIPE|CHECKERBOARD|GRID|IMAGE）
     * @param {Boolean} [isDynamic] 选填，材质是否显示动态效果
     * @param {Number} [speed] 选填，使用动态材质时速度
     */
    changeWallMaterial(wallMaterial, isDynamic, speed) {
        if (this.wall) {
            wallMaterial = Clone(wallMaterial,true);
            if (defined(wallMaterial))this.wallMaterial = wallMaterial;
            wallMaterial = {...this.wallMaterial};

            if (defined(isDynamic)) this.wallIsDynamic = isDynamic;
            if (speed > 0) this.wallSpeed = speed;

            //如果是水平方向条纹
            let length = this.wallHeight;
            if ((wallMaterial.type === 'Stripe') && (wallMaterial.horizontal === false)) length = this.perimeter;
            this.wall.wall.material = Area.createWallMaterial(wallMaterial, this.wallIsDynamic, this.wallSpeed, length);
            const { color, evenColor, oddColor, darkColor, lightColor } = wallMaterial;
            this.wallInitColor = color || (evenColor && [evenColor, oddColor]) || (lightColor && [darkColor, lightColor]);
        }

    }

    /**
     * 更改区域材质
     * @param {AreaMaterialConfig} landMaterial 区域材质
     */
    changeLandMaterial(landMaterial) {
        landMaterial = Clone(landMaterial,true);
        if (defined(landMaterial))this.landMaterial = landMaterial;
        
        landMaterial = {...this.landMaterial};
        this.land.material = Area.createLandMaterial(landMaterial);
        const { color, evenColor, oddColor, darkColor, lightColor } = landMaterial;
        this.landInitColor = color || (evenColor && [evenColor, oddColor]) || (lightColor && [darkColor, lightColor]);
    }
    /**
     * 添加区域四周的墙
     * @param {Object} options 包含以下属性的对象：
     * @param {Number} [options.height=100] 高度；
     * @param {AreaMaterialConfig} [options.wallMaterial] 墙材质，（仅支持AreaMaterialType.COLOR|STRIPE|CHECKERBOARD|GRID|IMAGE），AreaMaterialType.STRIPE 的repeat为数值；AreaMaterialType.CHECKERBOARD|GRID|DOT|IMAGE的repeat为数组,AreaMaterialType.CHECKERBOARD时，wallMaterial.repeat默认为[40,5]
     * @param {Boolean} [options.isDynamic] 材质是否显示动态效果 （仅支持AreaMaterialType.STRIPE|CHECKERBOARD|GRID)
     * @param {Number} [options.speed] 使用动态材质时速度
     * @returns {Entity} 实体对象
     * @example
     * const area = areaLayer.add({
     *   positions: [[113,24,0], [112,25,0],[112,20,0]],
     *   landMaterial:BOSGeo.AreaMaterialConfig.COLOR
     * });
     * const wallMaterial = BOSGeo.AreaMaterialConfig.STRIPE; //获取一套材质配置参数模板
     * wallMaterial.repeat = 10; //修改模板中参数，AreaMaterialType.STRIPE 的repeat为数值；AreaMaterialType.CHECKERBOARD|GRID|DOT|IMAGE的repeat为数组,AreaMaterialType.CHECKERBOARD时，wallMaterial.repeat默认为[40,5]。
     * area.addWall({
     *       wallMaterial,
     *       isDynamic: true,
     *       speed: 8
     *   })
     */
    addWall(options) {
        this.deleteWall();
        //创建新墙
        if (options) {
            let {
                wallMaterial = { type: 'Color', color: '#fff000' },
                height = this.wallHeight,
                isDynamic = this.wallIsDynamic,
                speed = this.wallSpeed,
            } = options;
            wallMaterial = Clone(wallMaterial,true);

            this.wallHeight = height;
            this.wallIsDynamic = isDynamic;
            this.wallSpeed = speed;
            this.wallMaterial = {...wallMaterial};
            

            height = this.baseHeight + this.wallHeight;

            let positions = this.positions;

            //创建材质
            let length = height;
            if ((wallMaterial.type === 'Stripe') && (wallMaterial.horizontal === false)) length = this.perimeter;//如果是水平方向条纹
            let material = Area.createWallMaterial(wallMaterial, isDynamic, speed, length);
            const { color, evenColor, oddColor, darkColor, lightColor } = wallMaterial;
            if(!this.wallInitColor)this.wallInitColor = color || (evenColor && [evenColor, oddColor]) || (lightColor && [darkColor, lightColor]);

            //创建墙：Entity 
            const wall = this.layer.dataSource.entities.add({
                wall: {
                    positions,
                    minimumHeights: Array(positions.length).fill(this.baseHeight),
                    maximumHeights: Array(positions.length).fill(height),
                    material
                }
            });
            this.wall = wall;
            wall.bosGroup = this;
            return wall;
        }
    }
    /**
     * 删除墙
     */
    deleteWall() {
        //清除旧墙
        if (this.wall) {
            const oldWall = this.wall;
            this.wall = null;
            delete oldWall.bosGroup;
            this.layer.dataSource.entities.remove(oldWall);
        }
    }
    /**
     * 包围盒
     */
    addBoundingVolume(){
        let color = this.boundingColor
        this.deleteBoundingVolume();
        if(color){
            color = Color.fromCssColorString(color);
        }else color = Color.WHITE;
      
        const center = this.boundRectangle.center;
        const h = (this.wall)? this.wallHeight/2+this.baseHeight : this.baseHeight;
        const mtx = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(center[0],center[1],h+0.25));
        const box = new GeometryInstance({
            geometry: BoxOutlineGeometry.createGeometry(BoxOutlineGeometry.fromDimensions ({
                dimensions : new Cartesian3(this.boundRectangle.width, this.boundRectangle.height, (this.wall)?this.wallHeight:4)
              })),
            modelMatrix: mtx,
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(Color.WHITE)
            }
        });
        this.boundingVolume = this.layer.collection.add(new Primitive({
            geometryInstances: [box],
            asynchronous:false,
            appearance : new PerInstanceColorAppearance({
                flat : true,
                translucent : false,
                renderState : {
                    lineWidth : Math.min(4.0, GeoDepository.scene.maximumAliasedLineWidth)
                }
            })
        }));
        this.boundingVolume.bosGroup = this;
        GeoDepository.scene.requestRender();

    }
    /**
     * 删除包围盒
     */
    deleteBoundingVolume(){
        if(this.boundingVolume){
            this.layer.collection.remove(this.boundingVolume)
            //this.layer.dataSource.entities.remove(this.boundingVolume);
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
/**
* 创建墙材质
* @ignore
* @param {AreaMaterialConfig} [wallMaterial] 特殊墙材质，（仅支持AreaMaterialType.STRIPE|CHECKERBOARD|GRID|IMAGE）
* @param {Boolean} [isDynamic] 材质是否显示动态效果
* @param {Number} [speed] 使用动态材质时速度
* @param {Number} [length] 动画距离；
* @returns {materialProperty}
*/
Area.createWallMaterial = function (wallMaterial, isDynamic, speed, length) {
    let material;
    if(['Checkerboard','Grid','Image','Dot'].indexOf(wallMaterial.type)>-1 &&  typeof  wallMaterial.repeat === "number"){
        let irepeat = wallMaterial.repeat;
        wallMaterial.repeat = [irepeat,irepeat];
    }
    //参数预处理
    for (const [key, value] of Object.entries(wallMaterial)) {
        //处理颜色
        if (key.toLowerCase().endsWith('color')) wallMaterial[key] = Color.fromCssColorString(value);

        //处理数组
        if (value instanceof Array && (value.length === 2)) wallMaterial[key] = new Cartesian2(...value);
    }
    //处理特殊属性
    switch (wallMaterial.type) {
        case 'Stripe':
            if (wallMaterial.horizontal) {
                wallMaterial.startToTrans = 0.2;
                wallMaterial.orientation = StripeOrientation.HORIZONTAL;
            } else wallMaterial.orientation = StripeOrientation.VERTICAL;


            break;
        case 'Checkerboard':
            wallMaterial.evenColor = wallMaterial.lightColor;
            wallMaterial.oddColor = wallMaterial.darkColor;
            break;
    }
    //处理动态效果
    if (isDynamic) {
        wallMaterial._speed = speed;
        wallMaterial._offsetStep = ((length+0.1) / 1000);
        switch (wallMaterial.type) {
            case 'Stripe'://条纹跑马灯
                wallMaterial.offset = new CallbackProperty((time) => {
                    if(!time) time = {secondsOfDay:0};
                    return (1 - Math.floor(time.secondsOfDay * wallMaterial._speed) % 1000) * wallMaterial._offsetStep;
                }, false)
                break;
            case 'Checkerboard': //棋盘闪烁
                wallMaterial._lightColor = wallMaterial.lightColor;
                wallMaterial._darkColor = wallMaterial.darkColor;
                wallMaterial.evenColor = new CallbackProperty((time) => {
                    if(!time) time = {secondsOfDay:0};

                    const flag = Math.floor(time.secondsOfDay * wallMaterial._speed) % 1000 % 2;
                    if (flag) {
                        wallMaterial._lightColor.alpha = 1;
                    } else {
                        wallMaterial._lightColor.alpha = 0.5;
                    }
                    return wallMaterial._lightColor;
                }, false)
                wallMaterial.oddColor = new CallbackProperty((time) => {
                    if(!time) time = {secondsOfDay:0};

                    const flag = Math.floor(time.secondsOfDay * wallMaterial._speed) % 1000 % 2;
                    if (flag) {
                        wallMaterial._darkColor.alpha = 0.5;
                    } else {
                        wallMaterial._darkColor.alpha = 1;
                    }
                    return wallMaterial._darkColor;
                }, false)
                break;
            case 'Grid':
                wallMaterial.lineOffset = new CallbackProperty((time) => {
                    if(!time) time = {secondsOfDay:0};

                    const off = Math.floor(time.secondsOfDay * wallMaterial._speed) % 1000 * wallMaterial._offsetStep;
                    return new Cartesian2(off, off);
                }, false)

                break;
            case 'Image':
                break;
        }
    }

    //创建材质
    switch (wallMaterial.type) {
        case 'Stripe':
            material = new StripeMaterialProperty(wallMaterial);
            break;
        case 'Checkerboard':
            material = new CheckerboardMaterialProperty(wallMaterial);
            break;
        case 'Grid':
            material = new GridMaterialProperty(wallMaterial);
            break;
        case 'Image':
            material = new ImageMaterialProperty(wallMaterial);
            break;
        case 'Color':
            material = Color.fromCssColorString(wallMaterial.color);
            break;
        default:
            console.error(wallMaterial.type + '材质不支持，请使用其他材质！')
    }
    return material;
}

/**
* 创建区域材质
* @ignore
* @param {AreaMaterialConfig} [landMaterial] 区域材质
* @returns {material}
*/
Area.createLandMaterial = function (landMaterial) {
    for (const [key, value] of Object.entries(landMaterial)) {
        //处理颜色
        if (key.toLowerCase().endsWith('color')) landMaterial[key] = Color.fromCssColorString(value);
        //处理数组
        if (value instanceof Array && (value.length === 2)) landMaterial[key] = new Cartesian2(...value);
    }
    return Material.fromType(landMaterial.type, { ...landMaterial });
}


export default AreaLayer;