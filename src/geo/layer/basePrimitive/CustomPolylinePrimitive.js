import GeometryInstance from 'cesium/Core/GeometryInstance';
import PolylineGeometry from 'cesium/Core/PolylineGeometry';
import GroundPolylineGeometry from 'cesium/Core/GroundPolylineGeometry';
import Primitive from 'cesium/Scene/Primitive';
import createGuid from 'cesium/Core/createGuid';
import Check from 'cesium/Core/Check';
import Material from 'cesium/Scene/Material';
import PolylineMaterialAppearance from 'cesium/Scene/PolylineMaterialAppearance';
import GroundPolylinePrimitive from 'cesium/Scene/GroundPolylinePrimitive';
import DeveloperError from 'cesium/Core/DeveloperError';
import Rectangle from 'cesium/Core/Rectangle';
import Cartographic from 'cesium/Core/Cartographic';
import Cartesian3 from 'cesium/Core/Cartesian3';
import Transforms from 'cesium/Core/Transforms';
import Matrix4 from 'cesium/Core/Matrix4';

import GeoUtil from '../../utils/GeoUtil';
import CustomPrimitive from './CustomPrimitive';

class CustomPolylinePrimitive extends CustomPrimitive {
    /**
     * 自定义多边形图元
     * @constructor
     * @alias CustomPolylinePrimitive
     * 
     * @private
     * 
     * @param {Object} options 配置参数
     * @param {Object} options.id 图元id
     * @param {Boolean} [options.isGround=false] 折线图元是否贴地
     * @param {Boolean} [options.depthTestEnabled=true] 是否开启深度测试（开启则不采用深度测试失败材质）, isGround为false时起效
     * @param {Material} options.material 折线颜色
     * @param {Number} [options.width=5] 折线宽度
     * @param {Cartesian3[]} options.positions 折线顶点集合
     * @param {Number} [options.bottomHeight=0.0] 底面高度,isGround为false时起效，用于底面质心高度设置
     * 
     * @example
     * var customPolylinePrimitive = new BOSGeo.CustomPolylinePrimitive({
     *      material: Material.fromType('Color', {
                        color: Color.RED,
                    })
     * });
     * geomap.scene.primitives.add(customPolylinePrimitive);
     * 
     */
    constructor(options = {}) {
        super();
        const {
            id = createGuid(),
            isGround = false,
            depthTestEnabled = true,
            material,
            width = 5,
            positions,
            bottomHeight = 0.0,
        } = options;
        this.id = id;
        this._material = material;
        this._width = Math.max(width, 0.01);
        /**
         * 是否贴地
         * @property {Boolean} isGround
         * @default false
         * @readonly
         */
        this.isGround = isGround;
        /**
         * 是否开启深度测试（开启则不采用深度测试失败材质）, isGround为false时起效
         * @property {Boolean} depthTestEnabled
         * @default true
         * @readonly
         */
         this.depthTestEnabled = depthTestEnabled;

        this._bottomHeight = bottomHeight;

        /**
         * 图元范围
         * @property {Rectangle} range
         * @readonly
         */
        this.range = Rectangle.MAX_VALUE;

        if (positions) {
            this.positions = positions;
            this._updateCentriod(positions);
        }

        this.primitive = this.createPrimitive();
    }

    /**
     * 复制当前图元对象
     * 
     * @returns {CustomPolylinePrimitive}
     */
    clone() {
        const {
            id,
            isGround,
            depthTestEnabled,
            material,
            width,
            positions,
            bottomHeight,
        } = this;
        const customPolylinePrimitive = new CustomPolylinePrimitive({
            id,
            isGround,
            depthTestEnabled,
            material,
            width,
            positions,
            bottomHeight,
        });
        return customPolylinePrimitive;
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
     * 折线材质
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
     * 
     * 折线范围质心（暂时使用矩形范围中心）
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
            this._updatePositionsByCenter(value);
        }
    }

    /**
     * 
     * 设置抛物线线宽,最小值为0.01
     * 
     * @property {Number} width
     * 
     * @default 5
     * 
     */
    get width() {
        return this._width;
    }
    set width(value) {
        Check.typeOf.number('value', value);
        value = Math.max(value, 0.01);
        if (value !== this._width) {
            this._width = value;
            this.setUpdate(true);
        }
    }

    /**
     * 更新折线质心
     * @private
     * @param {Array.<Cartesian3>} positions 
     */
    _updateCentriod(positions) {
        const range = Rectangle.fromCartesianArray(positions);
        if (range instanceof Rectangle) {
            this.range = range;
            const { longitude, latitude } = Rectangle.center(range, new Cartographic());
            this._center = Cartesian3.fromRadians(longitude, latitude, this._bottomHeight);
        }
    }

    /**
     * 通过质心更新整个多边形位置
     * @private
     * @param {Cartesian3} value 
     */
    _updatePositionsByCenter(value) {
        const oldLocalSystem = Transforms.eastNorthUpToFixedFrame(this._center);
        const worldToLocalMatrix = Matrix4.inverse(oldLocalSystem, new Matrix4());

        const localPoints = this.positions.map((position) => Matrix4.multiplyByPoint(worldToLocalMatrix, position, new Cartesian3()));

        const newLocalSystem = Transforms.eastNorthUpToFixedFrame(value);
        const newPositions = localPoints.map((position) => {
            const { longitude, latitude } = Cartographic.fromCartesian(Matrix4.multiplyByPoint(newLocalSystem, position, new Cartesian3()));
            return Cartesian3.fromRadians(longitude, latitude, this._bottomHeight);
        });
        // localPoints.map((position) => Matrix4.multiplyByPoint(newLocalSystem, position, new Cartesian3()));

        this.setPosition(newPositions);
    }

    /**
     * 创建图元
     * 
     * @private
     */
    createPrimitive() {
        const material = this.material;
        if (!this.getGeometry()) {
            return null;
        }
        const appearance = new PolylineMaterialAppearance({
            material: material,
            translucent: false
        });
        const depthFailAppearance = new PolylineMaterialAppearance({
            material: material,
            translucent: false
        });

        if (this.isGround) {
            return new GroundPolylinePrimitive({
                geometryInstances: new GeometryInstance({
                    geometry: this.getGeometry(),
                    id: this.id
                }),
                appearance,
                // 同步会导致编辑时闪烁的问题
                asynchronous: false,
            });
        } else {
            return new Primitive({
                geometryInstances: new GeometryInstance({
                    geometry: this.getGeometry(),
                    id: this.id
                }),
                appearance: new PolylineMaterialAppearance({
                    translucent: false,
                    material: material,
                }),
                depthFailAppearance: this.depthTestEnabled ? undefined : depthFailAppearance,
                asynchronous: false,
            });
        }
    }

    /**
     * 获取图形
     * 
     * @private
     */
    getGeometry() {
        if (this.isGround) {
            return new GroundPolylineGeometry({
                positions: this.positions,
                width: this._width,
            });
        } else {
            return new PolylineGeometry({
                positions: this.positions,
                width: this._width,
                vertexFormat: PolylineMaterialAppearance.VERTEX_FORMAT,
            });
        }
    }

    /**
     * 设置位置
     * 
     * @param {Array<Cartesian3>} positions 折线坐标串
     */
    setPosition(positions) {
        this.positions = positions;
        this._updateCentriod(positions);
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

export default CustomPolylinePrimitive