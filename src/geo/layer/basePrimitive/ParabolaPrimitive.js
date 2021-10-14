import GeometryInstance from 'cesium/Core/GeometryInstance';
import PolylineGeometry from 'cesium/Core/PolylineGeometry';
import Primitive from 'cesium/Scene/Primitive';
import createGuid from 'cesium/Core/createGuid';
import Check from 'cesium/Core/Check';
import Material from 'cesium/Scene/Material';
import PolylineMaterialAppearance from 'cesium/Scene/PolylineMaterialAppearance';
import defined from 'cesium/Core/defined';
import Rectangle from 'cesium/Core/Rectangle';
import Cartographic from 'cesium/Core/Cartographic';
import Cartesian3 from 'cesium/Core/Cartesian3';
import Transforms from 'cesium/Core/Transforms';
import Matrix4 from 'cesium/Core/Matrix4';
import DeveloperError from 'cesium/Core/DeveloperError';

import GeoUtil from '../../utils/GeoUtil';
import CustomPrimitive from './CustomPrimitive';

class ParabolaPrimitive extends CustomPrimitive {
    /**
     * 自定义抛物线图元
     * @constructor
     * @alias ParabolaPrimitive
     * 
     * @private
     * 
     * @param {Object} options 配置参数
     * @param {Object} options.id 图元id
     * @param {Material} options.material 折线颜色
     * @param {Number} [options.width=5] 折线宽度
     * @param {Cartesian3[]} options.positions 折线顶点集合
     * @param {Number} [options.vertexHeight=50000] 抛物线顶点高度
     * @param {Number} [options.samples=30] 抛物线包含起止点的采样点个数，最小值为2
     * @param {Number} [options.axisRadius=2000] 抛物线顶点编辑轴的半径
     * @param {Boolean} [options.depthTestEnabled=true] 是否开启深度测试（开启则不采用深度测试失败材质）
     * 
     * @example 
     * var parabolaPrimitive = new BOSGeo.ParabolaPrimitive({
     *      material: Material.fromType('Color', {
     *          color: Color.RED,
     *      })           
     * });
     * geomap.scene.primitives.add(parabolaPrimitive);
     * 
     */
    constructor(options = {}) {
        super();
        const {
            id = createGuid(),
            material,
            width = 5,
            positions,
            vertexHeight = 50000.0,
            samples = 30.0,
            axisRadius = 2000,
            depthTestEnabled = true
        } = options;

        if (!defined(positions)) {
            throw new DeveloperError('options.positions未定义!');
        } else if (positions.length < 2) {
            throw new DeveloperError('options.positions.length 小于2!');
        }

        this.id = id;
        this._material = material;
        this._width = Math.max(width, 0.01);

        this._vertexHeight = vertexHeight;
        this._samples = samples;

        /**
         * 图元范围
         * @property {Rectangle} range
         * @readonly
         */
        this.range = Rectangle.MAX_VALUE;

        /**
         * 顶点编辑轴半径
         * @property {Number} axisRadius
         * @readonly
         * @default 2000
         */
        this.axisRadius = axisRadius;

        /**
         * 是否开启深度测试（开启则不采用深度测试失败材质）
         * @property {Boolean} depthTestEnabled
         * @readonly
         * @default true
         */
        this.depthTestEnabled = depthTestEnabled;

        if (positions) {
            this.positions = positions;
            this._updateCentriod(positions);
        }

        this.primitive = this.createPrimitive();
    }

    /**
     * 复制当前图元对象
     * 
     * @returns {ParabolaPrimitive}
     */
    clone() {
        const {
            id,
            material,
            width,
            positions,
            vertexHeight,
            samples,
            axisRadius,
            depthTestEnabled
        } = this;
        const parabolaPrimitive = new ParabolaPrimitive({
            id,
            material,
            width,
            positions,
            vertexHeight,
            samples,
            axisRadius,
            depthTestEnabled
        });
        return parabolaPrimitive;
    }

    /**
     * 
     * 抛物线中心点
     * 
     * @property {Cartesian3} center
     */
    get center() {
        return this._center;
    }
    set center(value) {
        Check.typeOf.object('value', value);
        if (value instanceof Cartesian3 && !this._center.equals(value)) {
            this._updatePositionsByCenter(value);
            // const valueInDegrees = GeoUtil.cartesianToArray(value);
            // // notes: axisRadius等同于顶点高度，后续如果轴改变时需要再定义一个顶点高度对象
            // this._updatePositionsByCenter(Cartesian3.fromDegrees(valueInDegrees[0], valueInDegrees[1], this.axisRadius));
        }
    }

    /**
     * 通过顶点更新整条抛物线位置
     * @private
     * @param {Cartesian3} value 
     */
    _updatePositionsByCenter(value) {
        const oldLocalSystem = Transforms.eastNorthUpToFixedFrame(this._center);
        const worldToLocalMatrix = Matrix4.inverse(oldLocalSystem, new Matrix4());

        const localPoints = this.positions.map((position) => Matrix4.multiplyByPoint(worldToLocalMatrix, position, new Cartesian3()));

        const newLocalSystem = Transforms.eastNorthUpToFixedFrame(value);
        const newPositions = localPoints.map((position) => Matrix4.multiplyByPoint(newLocalSystem, position, new Cartesian3()));

        this._center = value;
        this.setPosition(newPositions, false);
    }

    /**
     * 
     * 抛物线端点一
     * 
     * @property {Cartesian3} start
     */
    get start() {
        return this._start;
    }
    set start(value) {
        Check.typeOf.object('value', value);
        if (value instanceof Cartesian3 && !this._start.equals(value)) {
            this._updateParabolaPositions(value, this._end);
        }
    }

    /**
     * 
     * 抛物线端点二
     * 
     * @property {Cartesian3} end
     */
    get end() {
        return this._end;
    }
    set end(value) {
        Check.typeOf.object('value', value);
        if (value instanceof Cartesian3 && !this._end.equals(value)) {
            this._updateParabolaPositions(this._start, value);
        }
    }

    /**
     * 
     * 抛物线顶点高度
     * 
     * @property {Cartesian3} vertexHeight
     * 
     * @default 50000
     */
    get vertexHeight() {
        return this._vertexHeight;
    }
    set vertexHeight(value) {
        Check.typeOf.number('value', value);
        if (value !== this._vertexHeight) {
            this._vertexHeight = value;
            this._updateParabolaPositions(this._start, this._end);
        }
    }

    /**
     * 
     * 抛物线包含起止点的采样点个数，最小值为2
     * 
     * @property {Number} samples
     * 
     * @default 30
     */
    get samples() {
        return this._samples;
    }
    set samples(value) {
        Check.typeOf.number('value', value);
        value = Math.max(value, 2);
        if (value !== this._samples) {
            this._samples = value;
            this._updateParabolaPositions(this._start, this._end);
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
     * 抛物线材质
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
     * 更新抛物线坐标
     * @private
     * 
     * @param {Cartesian3} start 抛物线端点一
     * @param {Cartesian3} end 抛物线端点二
     */
    _updateParabolaPositions(start, end) {
        const positions = GeoUtil.getLinkedPointList(start, end, this._vertexHeight, this._samples);
        this.setPosition(positions);
    }

    /**
     * 更新抛物线顶点
     * @private
     * @param {Array.<Cartesian3>} positions 
     * @param {Booleam} [needUpdateCentriol=true] 是否更新中心点
     */
    _updateCentriod(positions, needUpdateCentriol = true) {
        const range = Rectangle.fromCartesianArray(positions);
        this._start = positions[0];
        this._end = positions[positions.length - 1];
        if (range instanceof Rectangle) {
            this.range = range;
            const { longitude, latitude } = Rectangle.center(range, new Cartographic());
            const centerHeight = GeoUtil.getPalabolaHeight(this._start, this._end, this._vertexHeight);
            this.axisRadius = centerHeight;
            needUpdateCentriol && (this._center = Cartesian3.fromRadians(longitude, latitude, centerHeight));
        }
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
        const depthFailAppearance = this.depthTestEnabled ? undefined : new PolylineMaterialAppearance({
            material: material,
            translucent: false
        });
        return new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: this.getGeometry(),
                id: this.id
            }),
            appearance,
            depthFailAppearance,
            asynchronous: false,
        });
    }

    /**
     * 获取图形
     * 
     * @private
     */
    getGeometry() {
        return new PolylineGeometry({
            positions: this.positions,
            width: this._width,
            vertexFormat: PolylineMaterialAppearance.VERTEX_FORMAT,
        });
    }

    /**
     * 设置位置
     * 
     * @param {Array.<Cartesian3>} positions 折线坐标串
     * @param {Booleam} [needUpdateCentriol=true] 是否更新中心点
     */
    setPosition(positions, needUpdateCentriol = true) {
        const pointNum = positions.length;
        if (pointNum < 2) {
            throw new DeveloperError(`options.positions.length:${pointNum} 小于2!`);
        } else if (pointNum !== this._samples) {
            positions = this._updateParabolaPositions(positions[0], positions[pointNum - 1], this._vertexHeight, this._samples);
        }
        this.positions = positions;
        this._updateCentriod(positions, needUpdateCentriol);
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

export default ParabolaPrimitive