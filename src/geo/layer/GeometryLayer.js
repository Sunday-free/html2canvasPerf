import Layer from "./Layer";
import PrimitiveCollection from "cesium/Scene/PrimitiveCollection";
import ColorGeometryInstanceAttribute from "../../../cesium/Source/Core/ColorGeometryInstanceAttribute";
import defaultValue from "../../../cesium/Source/Core/defaultValue";
import GeometryInstance from "../../../cesium/Source/Core/GeometryInstance";
import Matrix4 from "../../../cesium/Source/Core/Matrix4";
import PerInstanceColorAppearance from "../../../cesium/Source/Scene/PerInstanceColorAppearance";
import Primitive from "../../../cesium/Source/Scene/Primitive";
import GroundPrimitive from "../../../cesium/Source/Scene/GroundPrimitive";
import PolygonGeometry from "cesium/Core/PolygonGeometry";
import PolygonHierarchy from "cesium/Core/PolygonHierarchy";
import Color from "cesium/Core/Color";
import Cartesian3 from "cesium/Core/Cartesian3";
import VertexFormat from "cesium/Core/VertexFormat";
import HeadingPitchRange from "cesium/Core/HeadingPitchRange";
import GeometryType from "../constant/GeometryType";
import BoundingSphere from "cesium/Core/BoundingSphere.js";
import LayerEventType from "../constant/LayerEventType";
import { GeoDepository } from "../core/GeoDepository"
import LayerType from "../constant/LayerType";

class GeometryLayer extends Layer {
    /**
     * 几何图层，目前主要是对几何面状数据的添加、获取、移除、缩放至和显隐等操作
     * @alias GeometryLayer
     * @constructor
     * 
     * @param {Object} options 包含以下参数的Object对象
     * @param {String} [options.name] 图层名称
     * @param {Boolean} [options.show] 是否显示
     * @param {String} [options.customGroupId] 若使用自定义分组，该图层所在分组的名称
     * 
     * @example
     * var geometryLayer = new BOSGeo.GeometryLayer({
     *   name: '几何图层1',
     *   show: true,
     *   customGroupId: '图层组1',
     * });
     * 
     */
    constructor(options) {
        super(options);
        this.collection = new PrimitiveCollection();
        this.viewer.scene.primitives.add(this.collection);

        this._geometryPosition = new Map();
        this._geometryColor = new Map();
        this._isFirstTimeHighlight = true;
        this._show = this.collection.show = options.show;
        this._color = '#ff7575';
        this._opacity = 1;
        this.layerType = LayerType.GEOMETRY;

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
        const geometries = [...this._geometryPosition.keys()];
        let temp, obj

        if (!v) {
            this._color = null;
            geometries.forEach((g, idx) => {
                obj = this._geometryColor.get(g)
                temp = Object.keys(obj).map(key => obj[key])
                g.getGeometryInstanceAttributes('geometry').color = temp;

            })

        } else {
            let color;
            const setColor = () => {
                geometries.forEach((g, idx) => {
                    if (this._isFirstTimeHighlight) {
                        this._geometryColor.set(g, JSON.parse(JSON.stringify(g.getGeometryInstanceAttributes('geometry').color)));
                    }

                    g.getGeometryInstanceAttributes('geometry').color = color.value;
                })
                this._isFirstTimeHighlight = false;
            }
            if (typeof (v) === 'string') {
                this._color = v;
                color = ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(v));
                setColor();
            } else if (v instanceof Color) {
                color = ColorGeometryInstanceAttribute.fromColor(v);
                setColor();
            }

        }
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
            this.color = Color.fromCssColorString(this.color).withAlpha(v);
            GeoDepository.scene.requestRender();
        }
    }

    /**
     * 添加几何体
     * 
     * @param {Object} options 参数配置：
     * @param {GeometryType} [options.geometryType] 几何体类型 （几何体类型与几何体对象二者选其一）；
     * @param {Geometry} [options.geometry] 几何体对象（几何体类型与几何体对象二者选其一）；
     * @param {Boolean} [options.clampToGround=false] 是否贴地显示；
     * @param {Array<Array<Number>>} options.positions 经纬度与高程坐标数组；
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] 模型放置的matrix4；
     * @param {String} [options.color='#ff7575'] 十六进制颜色字符串；
     * @param {Boolean} [options.translucent=false] 是否透明；
     * @param {Boolean} [options.closed=false] 是否闭合。
     * 
     * @returns {Primitive}
     */
    add(options) {

        let {
            opacity,
            positions,
            modelMatrix = Matrix4.IDENTITY,
            color = this.color,
            clampToGround = true,
            translucent = false,
            closed = true
        } = options;
        positions = options.positions = positions.map((p) => Cartesian3.fromDegrees(...p));
        if (typeof (color) === 'string') {
            color = Color.fromCssColorString(color)
        }
        let geomInstance = new GeometryInstance({
            id: 'geometry',
            geometry: this.getGeometry(options),
            modelMatrix: modelMatrix,
            attributes: {
                color: new ColorGeometryInstanceAttribute(color.red, color.green, color.blue, opacity || 1.0)
            }
        });

        const ptClass = clampToGround ? GroundPrimitive : Primitive;

        let primitive = new ptClass({
            geometryInstances: [geomInstance],
            asynchronous: clampToGround,
            releaseGeometryInstances: true,
            appearance: new PerInstanceColorAppearance({ closed, translucent })
        });

        let outprimitive = this.collection.add(primitive);

        GeoDepository.scene.requestRender();
        this._geometryPosition.set(outprimitive, positions);
        this.fire(LayerEventType.ADD, outprimitive);
        this.fire(LayerEventType.CHANGE);
        return outprimitive;
    }

    /**
     * 获取当前图层所有显隐情况
     * @ignore
     * @param {Object} options 选项
     * @param {Geometry} [options.geometry] 几何体（几何体类型与几何体二者选其一）
     * @param {GeometryType} [options.geometryType] 几何体类型 （几何体类型与几何体二者选其一）
     * @return {Geometry}
     */
    getGeometry(options) {
        if (options.geometryType == GeometryType.POLYGON) {
            return new PolygonGeometry({
                polygonHierarchy: new PolygonHierarchy(options.positions)
            });
        } else {
            return options.geometry;
        }
    }

    /**
     * 根据对象移除模型
     * @param {Primitive} target 几何对象
     */
    remove(target) {
        this.collection.remove(target);
        this._geometryPosition.delete(target);
        this.fire(LayerEventType.CHANGE);
        GeoDepository.scene.requestRender();
    }

    /**
     * 移除该图层所有模型
     */
    removeAll() {
        this.collection.removeAll();
        this._geometryPosition.clear();
        this.fire(LayerEventType.CHANGE);
        GeoDepository.scene.requestRender();
    }

    /**
     * 定位到某个几何体
     * @param {Primitive} target 几何对象
     */
    zoomTo(target) {
        let that = this;
        if (target instanceof Primitive) {
            target.readyPromise.then(function (target) {
                let boundingSphere = target._boundingSpheres[0];
                let camera = that.viewer.camera;
                let center = Matrix4.multiplyByPoint(
                    target.modelMatrix,
                    boundingSphere.center,
                    new Cartesian3()
                );
                camera.lookAt(
                    center,
                    new HeadingPitchRange(0.0, -0.5, boundingSphere.radius * 2)
                );
            });
        }
    }

    /**
     * 缩放至本图层
     */
    zoomToLayer() {
        if (!this._geometryPosition.size) return;
        const camera = this.viewer.camera;

        const positions = [...this._geometryPosition.values()].reduce((acc, cur) => {
            return acc.concat(cur);
        }, [])
        const bs = BoundingSphere.fromPoints(positions);
        camera.flyToBoundingSphere(bs);
    }

    /**
     * 销毁本图层
     */
    destroy() {
        this.viewer.scene.primitives.remove(this.collection);
        this._destroyBaseLayer();
    }

}

export default GeometryLayer;