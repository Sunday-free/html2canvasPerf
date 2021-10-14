
import Color from 'cesium/Core/Color';
import Cartesian3 from 'cesium/Core/Cartesian3';
import DeveloperError from 'cesium/Core/DeveloperError';
import Check from 'cesium/Core/Check';
import defined from 'cesium/Core/defined';
import EllipsoidGeometry from 'cesium/Core/EllipsoidGeometry';
import GeometryInstance from 'cesium/Core/GeometryInstance';
import Transforms from 'cesium/Core/Transforms';
import ColorGeometryInstanceAttribute from 'cesium/Core/ColorGeometryInstanceAttribute';
import createGuid from 'cesium/Core/createGuid';
import Rectangle from 'cesium/Core/Rectangle';

// import EllipsoidPrimitive from 'cesium/Scene/EllipsoidPrimitive';
import Primitive from 'cesium/Scene/Primitive';
import PerInstanceColorAppearance from 'cesium/Scene/PerInstanceColorAppearance';
import Material from 'cesium/Scene/Material';
import MaterialAppearance from 'cesium/Scene/MaterialAppearance';

import CustomPrimitive from "./CustomPrimitive";
import GeoUtil from '../../utils/GeoUtil';
import DrawType from '../../constant/DrawType'

class CustomEllipsoidPrimitive extends CustomPrimitive {
    /**
     * 自定义球体（椭球体）图元类
     * @constructor
     * @alias CustomEllipsoidPrimitive
     * 
     * @private
     * 
     * @param {Object} options 配置参数
     * @param {Cartesian3} options.center 球体中心点
     * @param {String|Object} options.id 图元id
     * @param {Cartesian3} options.radii 椭球体半径
     * @param {String} [options.fillColor='#FF0000'] 填充颜色CSS Color ，如#FF0000
     * @param {Number} [options.alpha] 填充颜色不透明度，0~1
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.SPHERE] 椭球类型，球体Sphere（椭球：Ellipsoid）
     * 
     * @see DrawPrimitive 
     * @see EditorHelper
     */
    constructor(options = {}) {
        super();

        if (!defined(options.center)) {
            throw new DeveloperError('options.center未定义!');
        }

        const {
            center,
            radii,
            id = createGuid(),
            fillColor = '#FF0000',
            alpha,
            drawType = DrawType.SPHERE,
        } = options;

        this.isSphere = drawType === DrawType.SPHERE;

        /**
         * 椭球类型，球体Sphere（椭球：Ellipsoid）
         * @property {DrawType} drawType
         * @default BOSGeo.DrawType.SPHERE
         * @readonly
         */
        this.drawType = drawType;

        /**
         * 标识id对象
         * @property {Object}
         * 
         * @readonly
         */
        this.id = id;

        this._color = defined(alpha) ? Color.fromCssColorString(fillColor).withAlpha(alpha) : Color.fromCssColorString(fillColor);

        this._center = center;
        this._radii = radii;

        /**
         * 图元范围
         * @property {Rectangle} range
         * @readonly
         */
        this.range = GeoUtil.getRangeByEllipsoid(center, radii);

        /**
         * 顶点编辑轴半径
         * @property {Number} axisRadius
         * @readonly
         */
        this.axisRadius = defined(radii) && radii.z > 0 ? radii.z : 2000;

        this.primitive = this.createPrimitive();
    }

    /**
     * 复制当前图元对象
     * 
     * @returns {CustomEllipsoidPrimitive}
     */
    clone() {
        const {
            color,
            center,
            radii,
            id,
            drawType,
        } = this;
        const ellipsoidPrimitive = new CustomEllipsoidPrimitive({
            center,
            radii,
            id,
            drawType
        });
        ellipsoidPrimitive.color = color;
        return ellipsoidPrimitive;
    }

    /**
     * 
     * 球心
     * 
     * @property {Cartesian3} center
     */
    get center() {
        return this._center;
    }
    set center(value) {
        Check.typeOf.object("value", value);
        if (value instanceof Cartesian3 && !this._center.equals(value)) {
            this._center = value;
            this.range = GeoUtil.getRangeByEllipsoid(value, this._radii); // 更新范围，用于定位
            this.setUpdate(true);
        }
    }

    /**
     * 
     * 球体半径
     * 
     * @property {Cartesian3} radii
     */
    get radii() {
        return this._radii;
    }
    set radii(value) {
        Check.typeOf.object("value", value);
        if (value instanceof Cartesian3 && !this._radii.equals(value)) {
            const { x, y, z } = value;
            const isZChanged = this._radii.z !== z;
            if (!this.isSphere) {
                this._radii = value;
                // if (isZChanged) {
                //     const centerInDegrees = GeoUtil.cartesianToArray(this._center);
                //     this._center = Cartesian3.fromDegrees(centerInDegrees[0], centerInDegrees[1], z);
                // }
            } else {
                if (isZChanged) {
                    // const centerInDegrees = GeoUtil.cartesianToArray(this._center);
                    // this._center = Cartesian3.fromDegrees(centerInDegrees[0], centerInDegrees[1], z);
                    this._radii = new Cartesian3(z, z, z);
                } else {
                    this._radii = this._radii.x !== x ? new Cartesian3(x, x, x) : new Cartesian3(y, y, y);
                }
            }
            this.range = GeoUtil.getRangeByEllipsoid(this._center, this._radii); // 更新范围，用于定位
            this.axisRadius = this._radii.z;
            this.setUpdate(true);
        }
    }

    /**
     * 
     * 椭球填充颜色
     * 
     * @property {Color} color
     */
    get color() {
        return this._color;
    }
    set color(value) {
        Check.typeOf.object("value", value);
        if (value instanceof Color && !Color.equals(value, this._color)) {
            this._color = value;
            this.setUpdate(true);
        }
    }

    /**
     * 创建图元
     * 
     * @private
     */
    createPrimitive() {
        return new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: new EllipsoidGeometry({
                    vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
                    radii: this._radii
                }),
                modelMatrix: Transforms.eastNorthUpToFixedFrame(this._center),
                // attributes: {
                //     color: ColorGeometryInstanceAttribute.fromColor(this._color),
                // },
                id: this.id
            }),
            appearance: new MaterialAppearance({
                closed: true, // 开启背面裁剪
                flat: true, // 扁平化着色，不考虑光线的作用
                material: Material.fromType('Color', {
                    color: this._color
                })
            }),
            // new PerInstanceColorAppearance({
            //     // flat: true, // 扁平化着色，不考虑光线的作用
            //     closed: true,
            //     translucent: true
            // }),
            asynchronous: false,
        });
        // PerInstanceColorAppearance 材质存在translucent开启导致深度测试被关闭的问题
    }

    /**
     * 设置更新开关
     * @private 
     * 
     * @param {Boolean} isUpdate 是否更新
     */
    setUpdate(isUpdate) {
        this.isUpdate = isUpdate;
    }
}

export default CustomEllipsoidPrimitive;