import GeometryInstance from 'cesium/Core/GeometryInstance';
import CoplanarPolygonGeometry from 'cesium/Core/CoplanarPolygonGeometry';
import PolygonHierarchy from 'cesium/Core/PolygonHierarchy';
import EllipsoidSurfaceAppearance from 'cesium/Scene/EllipsoidSurfaceAppearance';
import PerInstanceColorAppearance from 'cesium/Scene/PerInstanceColorAppearance';
import PolygonGeometry from 'cesium/Core/PolygonGeometry';
import Primitive from 'cesium/Scene/Primitive';
import GroundPrimitive from 'cesium/Scene/GroundPrimitive';
import createGuid from 'cesium/Core/createGuid';
import Check from 'cesium/Core/Check';
import defined from 'cesium/Core/defined';
import Rectangle from 'cesium/Core/Rectangle';
import Cartographic from 'cesium/Core/Cartographic';
import Cartesian3 from 'cesium/Core/Cartesian3';
import Transforms from 'cesium/Core/Transforms';
import Matrix4 from 'cesium/Core/Matrix4';
import DeveloperError from 'cesium/Core/DeveloperError';

import Material from 'cesium/Scene/Material';
import MaterialAppearance from 'cesium/Scene/MaterialAppearance';

import CustomPrimitive from "./CustomPrimitive";
import GeoUtil from '../../utils/GeoUtil';



class CustomPolygonPrimitive extends CustomPrimitive {
    /**
     * 自定义多边形图元
     * @constructor
     * @alias CustomPolygonPrimitive
     * 
     * @private
     * 
     * @param {Object} options 配置参数
     * @param {String|Object} options.id 图元id
     * @param {Boolean} [options.isGround=false] 多边形图元是否贴地
     * @param {Boolean} [options.depthTestEnabled=true] 是否开启深度测试（开启则不采用深度测试失败材质）, isGround为false时起效
     * @param {Material} options.material 多边形图元填充材质
     * @param {Cartesian3[]} [options.positions] 多边形顶点集合
     * @param {Number} [options.extrudedHeight] 拉伸高度,相对于底面而言,isGround为false时起效
     * @param {Number} [options.bottomHeight=0.0] 底面高度,isGround为false时起效，用于底面质心高度设置
     * 
     * @example
     * var customPolygonPrimitive = new BOSGeo.CustomPolygonPrimitive({
     *   material: Material.fromType('Color', {
                    color: Color.RED,
                })
     * });
     * geomap.scene.primitives.add(customPolygonPrimitive);
     * 
     */
    constructor(options = {}) {
        super();
        const {
            id = createGuid(),
            isGround = false,
            depthTestEnabled = true,
            material,
            extrudedHeight,
            bottomHeight = 0.0,
            positions
        } = options;
        /**
         * 图元id
         * @property {String|Object} id
         * @readonly
         */
        this.id = id;
        this._material = material;
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

        this._extrudedHeight = isGround || !defined(extrudedHeight) ? undefined : parseFloat(extrudedHeight);
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
     * @returns {CustomPolygonPrimitive}
     */
    clone() {
        const {
            id,
            isGround,
            depthTestEnabled,
            material,
            extrudedHeight,
            bottomHeight,
            positions
        } = this;

        const customPolygonPrimitive = new CustomPolygonPrimitive({
            id,
            isGround,
            depthTestEnabled,
            material,
            extrudedHeight,
            bottomHeight,
            positions
        });
        customPolygonPrimitive.material = material;
        return customPolygonPrimitive;
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
     * 模型矩阵
     * @property {Matrix4} modelMatrix
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
     * 创建图元
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
                // this.isGround,
                modelMatrix: this._modelMatrix
            });
        } else {
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
                modelMatrix: this._modelMatrix
            });
        }
    }

    /**
     * 多边形填充材质
     * @property {Material} material
     */
    get material() {
        return this._material;
    }
    set material(value) {
        if (!(value instanceof Material)) {
            throw new DeveloperError('CustomPolygonPrimitive.material: 请传入正确的值！')
        }
        this._material = value;
        this.setUpdate(true);
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
     * 
     * 多边形质心（暂时使用矩形范围中心）
     * 
     * @property {Cartesian3} center
     */
    get center() {
        return this._center;
    }
    set center(value) {
        Check.typeOf.object("value", value);
        if (value instanceof Cartesian3 && !this._center.equals(value)) {
            this._bottomHeight = GeoUtil.cartesianToArray(value)[2];
            this._updatePositionsByCenter(value);
        }
    }


    /**
     * 获取图形
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
                    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                });
        }
    }

    /**
     * 更新多边形质心
     * @private
     * @param {Array.<Cartesian3>} positions 
     */
    _updateCentriod(positions) {
        const range = Rectangle.fromCartesianArray(positions);
        if (range instanceof Rectangle) {
            this.range = range;
            this._bottomHeight = GeoUtil.cartesianToArray(positions[0])[2];
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
        const { _center, positions, _bottomHeight} = this;
        const oldLocalSystem = Transforms.eastNorthUpToFixedFrame(_center);
        const worldToLocalMatrix = Matrix4.inverse(oldLocalSystem, new Matrix4());
        const newLocalSystem = Transforms.eastNorthUpToFixedFrame(value);

        // const localPoints = this.positions.map((position) => Matrix4.multiplyByPoint(worldToLocalMatrix, position, new Cartesian3()));
        // const newPositions = localPoints.map((position) => Matrix4.multiplyByPoint(newLocalSystem, position, new Cartesian3()));
        const pointNum = positions.length;
        const newPositions = [];

        for (let i = 0; i < pointNum; i++) {
            newPositions.push(
                Matrix4.multiplyByPoint(
                    newLocalSystem,
                    Matrix4.multiplyByPoint(
                        worldToLocalMatrix,
                        positions[i],
                        new Cartesian3()
                    ),
                    new Cartesian3()
                )
            );
        }
        const anchor = GeoUtil.cartesianToArray(newPositions[0]);
        newPositions[0] = Cartesian3.fromDegrees(anchor[0], anchor[1], _bottomHeight);
        // console.log(
        //     Matrix4.multiplyByPoint(
        //         worldToLocalMatrix,
        //         positions[0],
        //         new Cartesian3()
        //     ),
        //     GeoUtil.cartesianToArray(newPositions[0])[2]
        // );

        this.setPosition(newPositions);
    }

    /**
     * 设置位置
     * @param {Array.<Cartesian3>} positions 面的顶点坐标
     */
    setPosition(positions) {
        // console.log('setPosition', GeoUtil.cartesianToArray(positions[0])[2]);
        this.positions = positions;
        this._updateCentriod(positions);
        this.setUpdate(true);
    }

    /**
     * 设置更新开关
     * @private
     * @param {Boolean} isUpdate 是否更新
     */
    setUpdate(isUpdate) {
        this.isUpdate = isUpdate;
    }
}

export default CustomPolygonPrimitive