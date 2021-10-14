import Color from 'cesium/Core/Color';
import Cartesian3 from 'cesium/Core/Cartesian3';
import DeveloperError from 'cesium/Core/DeveloperError';
import Check from 'cesium/Core/Check';
import defined from 'cesium/Core/defined';
import GeometryInstance from 'cesium/Core/GeometryInstance';
import CoplanarPolygonGeometry from 'cesium/Core/CoplanarPolygonGeometry';
import PolygonHierarchy from 'cesium/Core/PolygonHierarchy';
import PolygonGeometry from 'cesium/Core/PolygonGeometry';
import createGuid from 'cesium/Core/createGuid';
import Cartographic from 'cesium/Core/Cartographic';

import Primitive from 'cesium/Scene/Primitive';
import GroundPrimitive from 'cesium/Scene/GroundPrimitive';
import Material from 'cesium/Scene/Material';
import MaterialAppearance from 'cesium/Scene/MaterialAppearance';
import EllipsoidSurfaceAppearance from 'cesium/Scene/EllipsoidSurfaceAppearance';
import PerInstanceColorAppearance from 'cesium/Scene/PerInstanceColorAppearance';
import Rectangle from 'cesium/Core/Rectangle';

import CustomPrimitive from './CustomPrimitive';
import GeoUtil from '../../utils/GeoUtil';
import DrawType from '../../constant/DrawType';

class CustomEllipsePrimitive extends CustomPrimitive {
    /**
     * 自定义椭圆图元类
     * @constructor
     * @alias CustomEllipsePrimitive
     * 
     * @private
     * 
     * @param {Object} options 配置参数
     * @param {Cartesian3} options.center 椭圆中心点
     * @param {String|Object} options.id 图元id
     * @param {String} [options.fillColor='#FF0000'] 填充颜色CSS Color ，如#FF0000
     * @param {Number} [options.alpha] 填充颜色不透明度，0~1
     * @param {DrawType} [options.drawType=BOSGeo.DrawType.CIRCLE] 椭圆类型，基本圆/椭圆及圆柱、椭圆柱
     * @param {Boolean} [options.isGround=true] 是否贴地
     * @param {Number} [options.rotation=0] 椭圆朝向，单位为弧度
     * @param {Number} [options.segment=10] 四分之一椭圆的分段数，最小值为1
     * @param {Number} [options.semiMinorAxis] 短半轴长度
     * @param {Number} [options.semiMajorAxis] 长半轴（圆的半径）长度
     * @param {Number} [options.extrudedHeight] 拉伸高度,相对于底面而言,isGround为false时起效
     * @param {Number} [options.bottomHeight=0.0] 底面高度,isGround为false时起效，用于底面质心高度设置
     * @param {Boolean} [options.depthTestEnabled=true] 是否开启深度测试（开启则不采用深度测试失败材质），isGround为false时起效
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
            fillColor = '#FF0000',
            alpha,
            drawType = DrawType.CIRCLE,
            isGround = true,
            id = createGuid(),

            rotation = 0,
            segment = 10,
            center,
            semiMinorAxis = 0.01,
            semiMajorAxis = 0.01,
            extrudedHeight,
            bottomHeight = 0.0,
            depthTestEnabled = true
        } = options;

        /**
         * 是否贴地
         * @property {Boolean} isGround
         * @default true
         * @readonly
         */
        this.isGround = isGround;
        this.isCircle = drawType === DrawType.CIRCLE;

        /**
         * 椭圆类型，基本圆/椭圆及圆柱、椭圆柱
         * @property {DrawType} drawType
         * @default BOSGeo.DrawType.CIRCLE
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
        this._material = Material.fromType('Color', {
            color: this._color,
        });

        this._rotation = rotation;
        this._segment = Math.max(1.0, parseInt(segment));
        this._center = center;

        this._semiMinorAxis = Math.max(0.01, semiMinorAxis);
        this._semiMajorAxis = Math.max(0.01, semiMajorAxis);
        this._extrudedHeight = isGround || !defined(extrudedHeight) ? undefined : parseFloat(extrudedHeight);
        this._bottomHeight = bottomHeight;

        /**
         * 局部坐标系信息
         * @property {Object} localAxisInfo
         * @readonly
         */
        this.localAxisInfo = getRotatedAxisInfo(this._center, this._rotation);

        // 分段角度集合
        this._segmentAngles = this._getSegmentAngles(this._segment);

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

        this._updatePositions();
        this.primitive = this.createPrimitive();
    }

    /**
     * 复制当前图元对象
     * 
     * @returns {CustomEllipsePrimitive}
     */
    clone() {
        const {
            material,
            center,
            id,
            drawType,
            isGround,
            rotation,
            segment,
            semiMinorAxis,
            semiMajorAxis,
            extrudedHeight,
            bottomHeight,
            depthTestEnabled
        } = this;
        const ellipsePrimitive = new CustomEllipsePrimitive({
            center,
            id,
            drawType,
            isGround,
            rotation,
            segment,
            semiMinorAxis,
            semiMajorAxis,
            extrudedHeight,
            bottomHeight,
            depthTestEnabled
        });
        ellipsePrimitive.material = material;
        return ellipsePrimitive;
    }

    /**
     * 四分之一椭圆的分段数，最小值为1
     * 
     * @property {Number} segment
     * @readonly
     * @default 10
     */
    get segment() {
        return this._segment;
    }

    /**
     * 底面高度,isGround为false时起效，用于底面质心高度设置
     * 
     * @property {Number} bottomHeight
     * @readonly
     * @default 0.0
     */
    get bottomHeight() {
        return this._bottomHeight;
    }

    /**
     * 椭圆朝向，单位为弧度
     * 
     * @property {Number} rotation
     * @default 0
     */
    get rotation() {
        return this._rotation;
    }
    set rotation(value) {
        Check.typeOf.number('value', value);
        if (value !== this._rotation) {
            this._rotation = value;

            this.localAxisInfo = getRotatedAxisInfo(this._center, this._rotation);
            this._updatePositions();
        }
    }

    /**
     * 短半轴长度
     * 
     * @property {Number} semiMinorAxis
     * @default 0.01
     */
    get semiMinorAxis() {
        return this._semiMinorAxis;
    }
    set semiMinorAxis(value) {
        Check.typeOf.number('value', value);
        if (value !== this._semiMinorAxis && value > 0) {
            this._semiMinorAxis = value;
            this._updatePositions();
        }
    }

    /**
     * 长半轴（圆的半径）长度
     * 
     * @property {Number} semiMajorAxis
     * @default 0.01
     */
    get semiMajorAxis() {
        return this._semiMajorAxis;
    }
    set semiMajorAxis(value) {
        Check.typeOf.number('value', value);
        if (value !== this._semiMajorAxis && value > 0) {
            this._semiMajorAxis = value;
            this.isCircle && (this._semiMinorAxis = value);
            this._updatePositions();
        }
    }

    /**
     * 
     * 椭圆圆心
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
            this._bottomHeight = GeoUtil.cartesianToArray(value)[2];

            this.localAxisInfo = getRotatedAxisInfo(this._center, this._rotation);
            this._updatePositions();
        }
    }

    /**
     * 长半轴上的点
     * @property {Cartesian3} majorAxisPoint
     * @readonly
     */
    get majorAxisPoint() {
        if (this.positions.length > 0) {
            return this.positions[0];
        }
        return undefined;
    }

    /**
     * 短半轴上的点
     * @property {Cartesian3} minorAxisPoint
     * @readonly
     */
    get minorAxisPoint() {
        if (this.positions.length > this._segment && this._segment > 0) {
            return this.positions[this._segment];
        }
        return undefined;
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
     * 椭圆材质
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
     * 计算分段的角度集合
     * @private
     * 
     * @param {*} segment 
     */
    _getSegmentAngles(segment) {
        const segmentAngles = new Array(segment * 4); // 局部极坐标
        let segmentAngle;
        for (let i = 0; i < segment; i++) {
            segmentAngle = Math.PI / 2 * (i / segment);
            segmentAngles[i] = segmentAngle;
            segmentAngles[i + segment] = Math.PI / 2 + segmentAngle;
            segmentAngles[i + segment * 2] = Math.PI + segmentAngle;
            segmentAngles[i + segment * 3] = Math.PI * 3 / 2 + segmentAngle;
        }
        return segmentAngles;
    }

    /**
     * 计算椭圆顶点
     * @private
     */
    _updatePositions() {
        const { _semiMajorAxis, _semiMinorAxis, _center, localAxisInfo } = this;

        const curPositions = this._segmentAngles.map((angle) =>
            transformLocalPolarToWorld(_center, localAxisInfo, {
                angle,
                xRadius: _semiMajorAxis,
                yRadius: _semiMinorAxis
            })
        );
        this.setPosition(curPositions);
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
                closed: true, // 开启背面裁剪
                flat: true, // 扁平化着色，不考虑光线的作用
                material
            }),
            depthFailAppearance: this.depthTestEnabled ? undefined : new MaterialAppearance({
                closed: true, // 开启背面裁剪
                flat: true, // 扁平化着色，不考虑光线的作用
                material
            }),
            asynchronous: false,
        });
    }

    /**
     * 设置位置
     * @param {Array.<Cartesian3>} positions 椭圆的顶点坐标
     */
    setPosition(positions) {
        this.positions = positions;
        const pointNumber = positions.length;
        if (pointNumber < 4) {
            console.error('CustomEllipsePrimitive.setPosition失败，点个数小于4！');
            return;
        }

        this.range = Rectangle.fromCartesianArray(positions); // 更新范围，用于定位
        const { longitude, latitude } = Rectangle.center(this.range, new Cartographic());
        this._bottomHeight = GeoUtil.cartesianToArray(positions[0])[2]; // 用于修改center的高度后，再还原坐标时_buttomHeight没更新的问题
        this._center = Cartesian3.fromRadians(longitude, latitude, this._bottomHeight);
        this._semiMajorAxis = Math.max(0.01, Cartesian3.distance(this._center, positions[0]));
        (this._segment < pointNumber) & (this._semiMinorAxis = Math.max(0.01, Cartesian3.distance(this._center, positions[this._segment])));
        this.setUpdate(true);
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

/**
 * 获取旋转后的局部坐标系轴信息
 * @private
 * 
 * @param {Cartesian3} center ENU局部坐标系原点
 * @param {Number} rotation 局部坐标系XOY平面上逆时针方向的旋转角度
 * 
 * @returns {Object|undefined} {normalX: Cartesian3, normalY: Cartesian3, normalZ: Cartesian3}
 */
function getRotatedAxisInfo(center, rotation) {
    const { normalX, normalY, normalZ } = GeoUtil.getLocalAxisInfo(center);

    let rotatedNormalX = Cartesian3.add(
        Cartesian3.multiplyByScalar(normalX, Math.cos(rotation), new Cartesian3()),
        Cartesian3.multiplyByScalar(normalY, Math.sin(rotation), new Cartesian3()),
        new Cartesian3(),
    );
    rotatedNormalX = Cartesian3.normalize(rotatedNormalX, rotatedNormalX);

    let rotatedNormalY = Cartesian3.add(
        Cartesian3.multiplyByScalar(normalX, Math.cos(rotation + Math.PI / 2), new Cartesian3()),
        Cartesian3.multiplyByScalar(normalY, Math.sin(rotation + Math.PI / 2), new Cartesian3()),
        new Cartesian3(),
    );
    rotatedNormalY = Cartesian3.normalize(rotatedNormalY, rotatedNormalY);

    return { normalX: rotatedNormalX, normalY: rotatedNormalY, normalZ };
}


/**
 * 将局部极坐标转为世界坐标
 * @private
 * 
 * @param {Cartesian3} origin 局部坐标系原点（世界坐标
 * @param {Object} localAxis 局部坐标系轴信息{normalX: Cartesian3, normalY: Cartesian3, normalZ: Cartesian3}
 * @param {Object} polarCoord 极坐标
 * @param {Number} polarCoord.angle 平面上的极角（planeAxis从normalX-》normalY，逆时针方向），单位为弧度
 * @param {Number} polarCoord.xRadius X轴上的半轴长
 * @param {Number} polarCoord.yRadius Y轴上的半轴长
 * @returns {Cartesian3}
 */
function transformLocalPolarToWorld(origin, localAxis, polarCoord) {
    const { normalX, normalY } = localAxis;
    const { angle, xRadius, yRadius } = polarCoord;

    const localX = Cartesian3.multiplyByScalar(normalX, Math.cos(angle) * xRadius, new Cartesian3());
    const localY = Cartesian3.multiplyByScalar(normalY, Math.sin(angle) * yRadius, new Cartesian3());

    return Cartesian3.add(
        origin,
        Cartesian3.add(localX, localY, new Cartesian3()),
        new Cartesian3()
    );
}


export default CustomEllipsePrimitive;