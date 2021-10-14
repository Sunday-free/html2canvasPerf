import Color from 'cesium/Core/Color';
import Cartesian3 from 'cesium/Core/Cartesian3';
import DeveloperError from 'cesium/Core/DeveloperError';
import Check from 'cesium/Core/Check';
import defined from 'cesium/Core/defined';
import GeometryInstance from 'cesium/Core/GeometryInstance';
import CoplanarPolygonGeometry from 'cesium/Core/CoplanarPolygonGeometry';
import PolygonHierarchy from 'cesium/Core/PolygonHierarchy';
import PolygonGeometry from 'cesium/Core/PolygonGeometry';
import Transforms from 'cesium/Core/Transforms';
import createGuid from 'cesium/Core/createGuid';
import Matrix4 from 'cesium/Core/Matrix4';

import Primitive from 'cesium/Scene/Primitive';
import GroundPrimitive from 'cesium/Scene/GroundPrimitive';
import Material from 'cesium/Scene/Material';
import MaterialAppearance from 'cesium/Scene/MaterialAppearance';
import EllipsoidSurfaceAppearance from 'cesium/Scene/EllipsoidSurfaceAppearance';
import PerInstanceColorAppearance from 'cesium/Scene/PerInstanceColorAppearance';
import Rectangle from 'cesium/Core/Rectangle';

import CustomPrimitive from './CustomPrimitive';
import GeoUtil from '../../utils/GeoUtil';
import DrawType from '../../constant/DrawType'

class CustomRectanglePrimitive extends CustomPrimitive {
    /**
     * 自定义正方形（矩形）图元类
     * @constructor
     * @alias CustomRectanglePrimitive
     * 
     * @private
     * 
     * @param {Object} options 配置参数
     * @param {Array.<Cartesian3>} options.positions 矩形四点坐标
     * @param {String} options.id 图元id
     * @param {String} [options.fillColor='#FF0000'] 填充颜色CSS Color ，如#FF0000
     * @param {Number} [options.alpha] 填充颜色不透明度，0~1
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.SQUARE] 矩形种类，正方形和常规矩形
     * @param {Boolean} [options.isGround=true] 是否贴地
     * @param {Number} [options.angleToCross=Math.PI/2] DrawType为Rectangle才有效，矩形对角线与另外一条对角线的顺时针方向的夹角，取值范围（0，Math.PI）
     * @param {Number} [options.extrudedHeight] 拉伸高度
     * @param {Number} [options.bottomHeight=0.0] 底面高度,isGround为false时起效，用于底面质心高度设置
     * @param {Boolean} [options.depthTestEnabled=true] 是否开启深度测试（开启则不采用深度测试失败材质），isGround为false时起效
     * 
     * @see DrawPrimitive 
     * @see EditorHelper
     */
    constructor(options = {}) {
        super();

        if (!defined(options.positions) || options.positions.length !== 4) {
            throw new DeveloperError('options.positions!');
        }

        const {
            positions,
            fillColor = '#FF0000',
            alpha,
            drawType = DrawType.SQUARE,
            isGround = false,
            id = createGuid(),

            angleToCross = Math.PI / 2,
            extrudedHeight,
            bottomHeight = 0.0,
            depthTestEnabled = true
        } = options;

        /**
         * 是否贴地
         * @property {Boolean} isGround
         * @default false
         * @readonly
         */
        this.isGround = isGround;
        this.isSquare = drawType === DrawType.SQUARE;
        /**
         * 矩形种类，正方形和常规矩形
         * @property {DrawType} drawType
         * @default BOSGeo.DrawType.SQUARE
         * @readonly
         */
        this.drawType = drawType;

        if (!this.isSquare && (angleToCross <= 0 || angleToCross >= Math.PI)) {
            throw new DeveloperError('angleToCross值不在取值范围内!');
        }

        this._angleToCross = angleToCross;

        /**
         * 标识id对象
         * @property {Object}
         * 
         * @readonly
         */
        this.id = id

        this._color = defined(alpha) ? Color.fromCssColorString(fillColor).withAlpha(alpha) : Color.fromCssColorString(fillColor);
        this._material = Material.fromType('Color', {
            color: this._color,
        });

        this._extrudedHeight = isGround || !defined(extrudedHeight) ? undefined : parseFloat(extrudedHeight);
        this._bottomHeight = bottomHeight;

        /**
         * 图元范围
         * @property {Rectangle} range
         * @readonly
         */
        this.range = Rectangle.MAX_VALUE;

        /**
         * 是否开启深度测试（开启则不采用深度测试失败材质），isGround为false时起效
         * @property {Boolean} depthTestEnabled
         * @readonly
         * @default true
         */
        this.depthTestEnabled = depthTestEnabled;

        this.primitive = this.createPrimitive();
        this.setPosition(positions)
    }

    /**
     * 复制当前图元对象
     * 
     * @returns {CustomRectanglePrimitive}
     */
    clone() {
        const {
            material,
            positions,
            drawType,
            isGround,
            id,
            angleToCross,
            extrudedHeight,
            bottomHeight,
            depthTestEnabled
        } = this;
        const rectanglePrimitive = new CustomRectanglePrimitive({
            positions,
            drawType,
            isGround,
            id,
            angleToCross,
            extrudedHeight,
            bottomHeight,
            depthTestEnabled
        });
        rectanglePrimitive.material = material;
        return rectanglePrimitive;
    }

    /**
     * 底面高度, isGround为false时起效，用于底面质心高度设置
     * 
     * @property {Number} bottomHeight
     * @readonly
     * @default 0.0
     */
    get bottomHeight() {
        return this._bottomHeight;
    }

    /**
     * 
     * 矩形中心
     * 
     * @property {Cartesian3} center
     */
    get center() {
        return this._center;
    }
    set center(value) {
        Check.typeOf.object('value', value);
        if (value instanceof Cartesian3 && !this._center.equals(value)) {
            this._bottomHeight = GeoUtil.cartesianToArray(value)[2];

            const oldLocalSystem = Transforms.eastNorthUpToFixedFrame(this._center);
            const worldToLocalMatrix = Matrix4.inverse(oldLocalSystem, new Matrix4());
            const localA = Matrix4.multiplyByPoint(worldToLocalMatrix, this.positions[0], new Cartesian3());
            const localB = Matrix4.multiplyByPoint(worldToLocalMatrix, this.positions[1], new Cartesian3());

            const newLocalSystem = Transforms.eastNorthUpToFixedFrame(value);
            const positions = [
                Matrix4.multiplyByPoint(newLocalSystem, localA, new Cartesian3()),
                Matrix4.multiplyByPoint(newLocalSystem, localB, new Cartesian3()),
                Matrix4.multiplyByPoint(newLocalSystem, Cartesian3.negate(localA, new Cartesian3()), new Cartesian3()),
                Matrix4.multiplyByPoint(newLocalSystem, Cartesian3.negate(localB, new Cartesian3()), new Cartesian3()),
            ];
            this.setPosition(positions);
        }
    }

    /**
     * 矩形用于编辑的对角线起点
     * @property {Cartesian3} firstCorner
     * @readonly
     */
    get firstCorner() {
        return this._firstCorner;
    }
    set firstCorner(value) {
        Check.typeOf.object('value', value);
        if (value instanceof Cartesian3 && !this._firstCorner.equals(value)) {
            this.setPosition(GeoUtil.getRectangleByCorner([value, this._secondCorner], this.isSquare ? undefined : this._angleToCross, this._bottomHeight));
        }
    }

    /**
     * 矩形用于编辑的对角线终点
     * @property {Cartesian3} secondCorner
     * @readonly
     */
    get secondCorner() {
        return this._secondCorner;
    }
    set secondCorner(value) {
        Check.typeOf.object('value', value);
        if (value instanceof Cartesian3 && !this._secondCorner.equals(value)) {
            this.setPosition(GeoUtil.getRectangleByCorner([this._firstCorner, value], this.isSquare ? undefined : this._angleToCross, this._bottomHeight));
        }
    }

    /**
     * 拉伸面高度值
     * @property {Number|undefined} extrudedHeight
     * @default undefined
     */
    get extrudedHeight() {
        return this._extrudedHeight;
    }
    set extrudedHeight(value) {
        Check.typeOf.number('value', value);
        if (!this.isGround && value !== this._extrudedHeight) {
            this._extrudedHeight = value;

            this.setUpdate(true);
        }
    }

    /**
     * DrawType为Rectangle才有效，矩形对角线与另外一条对角线的顺时针方向的夹角，取值范围（0，Math.PI）
     * @property {Number} angleToCross
     * @default Math.PI/2
     */
    get angleToCross() {
        return this._angleToCross;
    }
    set angleToCross(value) {
        Check.typeOf.number('value', value);
        if (!this.isSquare && value > 0 && value < Math.PI && value !== this._angleToCross) {
            this._angleToCross = value;
            this.setPosition(GeoUtil.getRectangleByCorner([this._firstCorner, this._secondCorner], value, this._bottomHeight));
        }
    }

    /**
     * 矩形材质
     * @property {Material} material
     */
    get material() {
        return this._material;
    }
    set material(value) {
        if (!(value instanceof Material)) {
            throw new DeveloperError('CustomPolylinePrimitive.material: 请传入正确的值！')
        }
        this._material = value;
        this.setUpdate(true);
    }

    /**
     * 获取图形
     * 
     * @private
     */
    getGeometry() {
        if (this.isGround) {
            return new PolygonGeometry({
                polygonHierarchy: new PolygonHierarchy(this.positions),
                vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            });
        } else {
            return defined(this._extrudedHeight) ? PolygonGeometry.fromPositions({
                height: this._bottomHeight,
                positions: this.positions,
                extrudedHeight: defined(this._center) ? GeoUtil.cartesianToArray(this._center)[2] + this._extrudedHeight : this._extrudedHeight,
                vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            })
                : new CoplanarPolygonGeometry({
                    polygonHierarchy: new PolygonHierarchy(this.positions),
                    vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
                });
        }
    }

    /**
     * 创建图元
     * 
     * @private
     */
    createPrimitive() {
        const { material } = this;
        if (!this.getGeometry()) {
            return null;
        }
        if (this.isGround) {
            return new GroundPrimitive({
                geometryInstances: new GeometryInstance({
                    geometry: this.getGeometry(),
                    id: this.id
                }),
                appearance: new EllipsoidSurfaceAppearance({
                    material
                }),
                // 同步会导致编辑时闪烁的问题
                asynchronous: false,
            });
        }
        return new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: this.getGeometry(),
                id: this.id
            }),
            appearance: new MaterialAppearance({
                flat: true, // 扁平化着色，不考虑光线的作用
                material
            }),
            depthFailAppearance: this.depthTestEnabled ? undefined : new MaterialAppearance({
                flat: true, // 扁平化着色，不考虑光线的作用
                material
            }),
            asynchronous: false,
        });
    }

    /**
     * 设置位置
     * 
     * @param {Array<Cartesian3>} positions 矩形的顶点坐标
     */
    setPosition(positions) {
        if (positions.length < 4) {
            throw new DeveloperError(`positions.length: ${positions.length}不能小于4!`);
        }
        this._firstCorner = positions[0];
        this._secondCorner = positions[2];
        this._center = Cartesian3.midpoint(positions[0], positions[2], new Cartesian3());
        this._bottomHeight = GeoUtil.cartesianToArray(this._center)[2];
        this.positions = positions;

        this.range = Rectangle.fromCartesianArray(positions); // 更新范围，用于定位

        const isSamePoint = positions[0].equals(positions[2]);
        this.setUpdate(!isSamePoint);
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



export default CustomRectanglePrimitive;