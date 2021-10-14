import GeometryInstance from 'cesium/Core/GeometryInstance';
import PolylineGeometry from 'cesium/Core/PolylineGeometry';
import Primitive from 'cesium/Scene/Primitive';
import Material from 'cesium/Scene/Material';
import PolylineMaterialAppearance from 'cesium/Scene/PolylineMaterialAppearance';
import createGuid from "cesium/Core/createGuid";
import Matrix4 from 'cesium/Core/Matrix4';
import Cartesian3 from 'cesium/Core/Cartesian3';
import Check from 'cesium/Core/Check';
import Color from 'cesium/Core/Color';
import defaultValue from "cesium/Core/defaultValue.js";

import CustomPrimitive from "./CustomPrimitive";
import GeoUtil from '../../utils/GeoUtil';
import EditorAxisType from '../../constant/EditorAxisType';

class LinePrimitive extends CustomPrimitive {
    /**
     * 自定义轴线段
     * @constructor
     * @alias LinePrimitive
     * @private
     * 
     * @notes 右手坐标系
     * 
     * @param {Object} options 配置参数
     * @param {Object} options.id 图元id
     * @param {String} [options.color='#FF0000'] 线段颜色, css格式的颜色样式
     * @param {Number} [options.width=5] 线段宽度
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] 图元模型矩阵（模型空间->世界空间）
	 * @param {Boolean} [options.depthTestEnabled=true] 是否开启深度测试（开启则不采用深度测试失败材质）,非贴地图元才有效
     * @param {Boolean} [options.isInverse=false] 是否是坐标轴负方向
     * @param {Cartesian3} options.center 坐标轴中心点
     * @param {Number} [options.radius=10] 坐标轴半径
     * @param {EditorAxisType} [options.axisType=EditorAxisType.XPAN] 坐标轴类型
     * @param {Object} options.localAxisInfo 坐标轴单位向量信息 {normalX: Cartesian3, normalY: Cartesian3, normalZ: Cartesian3}
     * @param {Boolean} [options.hasArrow=false] 坐标轴是否包含箭头
     * @param {Number} [options.scalar=1.0] 坐标轴半径缩放尺寸
     * 
     * @example
     * const linePrimitive = new BOSGeo.LinePrimitive({
     *  center: new BOSGeo.Cartesian3(0, 0, 0),
     *  radius：6372000
     * });
     * geomap.scene.primitives.add(linePrimitive);
     */
    constructor(options = {}) {
        super();
        const {
            id = createGuid(),
            color = '#FF0000',
            width = 5,
            modelMatrix = Matrix4.IDENTITY,
            isInverse = false,
            center,
            radius = 10,
            axisType = EditorAxisType.XPAN,
            localAxisInfo,
            depthTestEnabled = true,

            hasArrow = false,
            scalar = 1.0,
        } = options;

        this.id = Object.assign({
            axisType,
            hasArrow
        }, id);
        // defaultValue(axisType, id);
        this._color = Color.fromCssColorString(color);
        this.width = width;
        /**
         * 是否开启深度测试（开启则不采用深度测试失败材质）,非贴地图元才有效
         * @property {Boolean} depthTestEnabled
         * @default true
         * @readonly
         */
        this.depthTestEnabled = depthTestEnabled;
        this._modelMatrix = modelMatrix;

        this._center = center;
        this.scalar =  Math.max(scalar, 0.1);
        this._radius = Math.max(radius, 0.1);

        this._localAxisInfo = defaultValue(localAxisInfo, GeoUtil.getLocalAxisInfo(center));
        if (isInverse && !localAxisInfo) {
            const { normalX, normalY, normalZ } = this._localAxisInfo;
            this._localAxisInfo.normalX = Cartesian3.negate(normalX, new Cartesian3());
            this._localAxisInfo.normalY = Cartesian3.negate(normalY, new Cartesian3());
            this._localAxisInfo.normalZ = Cartesian3.negate(normalZ, new Cartesian3());
        }

        /**
         * 当前轴类型
         * @type {EditorAxisType}
         * @default BOSGeo.EditorAxisType.XPAN
         * @readonly
         */
        this.axisType = axisType;

        this.hasArrow = hasArrow;

        this.positions = [];
        this.updateGeometry();

    }

    /**
     * 线段颜色
     * @property {String} value The CSS color value in #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), or hsla() format.
     * 
     * @see {@link http://www.w3.org/TR/css3-color|CSS color values}
     * 
     */
    get color() {
        return this._color.toCssColorString();
    }
    set color(value) {
        Check.typeOf.string("value", value);
        const tempColor = Color.fromCssColorString(value);
        if (!Color.equals(this._color, tempColor)) {
            this._color = tempColor;
            const appearance = this.getAppearance();
            this.primitive.appearance = appearance;
            this.primitive.depthFailAppearance = this.depthTestEnabled ? undefined : appearance;
        }
    }

    /**
     * 线段长度（坐标轴半径）
     * @property {Number} value
     * @default 10
     */
    get radius() {
        return this._radius;
    }
    set radius(value) {
        Check.typeOf.number("value", value);
        value = Math.max(value, 0.1);
        if (value !== this._radius) {
            this._radius = value;
            this.updateGeometry();
        }
    }

    /**
     * 位置矩阵, 该变换矩阵用于将局部坐标转化为世界坐标
     * @property {Matrix4}
     */
    get modelMatrix() {
        return this._modelMatrix;
    }
    set modelMatrix(value) {
        Check.typeOf.object("value", value);
        this._modelMatrix = value;
        if (this.primitive) {
            this.primitive.modelMatrix = this._modelMatrix;
        }
    }

    /**
     * 线段起点
     * @property {Cartesian3} value
     */
    get center() {
        return this._center;
    }
    set center(value) {
        Check.typeOf.object("value", value);
        if (value instanceof Cartesian3) {
            this._center = value;
            this.updateGeometry();
        }
    }

    /**
     * 线段所在的局部坐标系轴单位方向向量信息
     * @property {Object} value 编辑轴
     */
    get localAxisInfo() {
        return _localAxisInfo;
    }
    set localAxisInfo(value) {
        Check.typeOf.object("value", value);
        const { normalX, normalY, normalZ } = value;
        if (normalX instanceof Cartesian3 && normalY instanceof Cartesian3 && normalZ instanceof Cartesian3) {
            this._localAxisInfo = value;
            this.updateGeometry();
        }
    }

    /**
     * 计算线段顶点坐标
     * @private
     */
    updatePositions() {
        const { _center, _localAxisInfo, _radius, axisType, scalar } = this;
        const curPositions = [_center];
        if (_localAxisInfo) {
            let direction;
            const { normalX, normalY, normalZ } = _localAxisInfo;
            switch (axisType) {
                case EditorAxisType.XPAN: default:
                    direction = normalX;
                    break;
                case EditorAxisType.YPAN:
                    direction = normalY;
                    break;
                case EditorAxisType.ZPAN:
                    direction = normalZ;
                    break;
            }
            curPositions.push(Cartesian3.add(
                _center,
                Cartesian3.multiplyByScalar(direction, _radius * scalar, new Cartesian3()),
                new Cartesian3()
            ));

        }
        this.positions = curPositions;
    }

    /**
     * 创建图元
     * @private
     * 
     * @returns {null}
     */
    createPrimitive() {
        if (!this.getGeometry()) {
            return null;
        }
        const appearance = this.getAppearance();
        return new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: this.getGeometry(),
                id: this.id
            }),
            appearance,
            asynchronous: false,
            depthFailAppearance: this.depthTestEnabled ? undefined : appearance,
            modelMatrix: this._modelMatrix
        });
    }

    /**
     * 获取外观
     * @private
     * 
     * @returns {PolylineMaterialAppearance}
     */
    getAppearance() {
        const fabric = this.hasArrow ?
            {
                type: 'PolylineArrow',
                uniforms: {
                    color: this._color,
                },
            }
            : {
                type: 'Color',
                uniforms: {
                    color: this._color,
                },
            }
        return new PolylineMaterialAppearance({
            material: new Material({
                fabric,
            }),
        });
    }

    /**
     * 获取图形
     * @private
     * 
     * @returns {PolylineGeometry}
     */
    getGeometry() {
        return new PolylineGeometry({
            positions: this.positions,
            width: this.width,
            vertexFormat: PolylineMaterialAppearance.VERTEX_FORMAT,
        });
    }

    /**
    * @private
    */
    updateGeometry() {
        this.updatePositions();
        this.primitive = this.createPrimitive();
    }

    /**
     * 设置位置
     * @private
     * 
     * @param {Cartesian3[]} positions 折线段坐标串
     */
    setPosition(positions) {
        this.positions = positions;
        this.setUpdate(true);
    }

    /**
     * 设置更新开关
     * @private
     * 
     * @param {Boolean} isUpdate 是否强制更新
     */
    setUpdate(isUpdate) {
        this.isUpdate = isUpdate;
    }

}

export default LinePrimitive;