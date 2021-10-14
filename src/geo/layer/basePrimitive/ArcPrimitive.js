
import GeometryInstance from 'cesium/Core/GeometryInstance';
import PolylineGeometry from 'cesium/Core/PolylineGeometry';
import Primitive from 'cesium/Scene/Primitive';
import Material from 'cesium/Scene/Material';
import PolylineMaterialAppearance from 'cesium/Scene/PolylineMaterialAppearance';
import createGuid from 'cesium/Core/createGuid';
import Matrix4 from 'cesium/Core/Matrix4';
import Cartesian3 from 'cesium/Core/Cartesian3';
import Check from 'cesium/Core/Check';
import CesiumMath from 'cesium/Core/Math';
import Color from 'cesium/Core/Color';
import defaultValue from "cesium/Core/defaultValue.js";

import CustomPrimitive from './CustomPrimitive';
import GeoUtil from '../../utils/GeoUtil';
import EditorAxisType from '../../constant/EditorAxisType';

class ArcPrimitive extends CustomPrimitive {
    /**
     * 自定义圆弧图元，主要用于自由平面剖切编辑轴的生成
     * @constructor
     * @alias ArcPrimitive
     * @private
     * 
     * @param {Object} options 配置参数
     * @param {Object} [options.id] 图元id
     * @param {String} [options.color='#FF0000'] 线段颜色, css格式的颜色样式
     * @param {Number} [options.width=5] 线段宽度
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] 图元模型矩阵（模型空间->世界空间）
     * @param {Boolean} [options.isInverse=false] 是否是坐标轴负方向
     * @param {Cartesian3} options.center 坐标轴中心点
     * @param {Number} [options.radius=10] 坐标轴半径
     * @param {EditorAxisType} [options.axisType=EditorAxisType.XROTATE] 坐标轴类型
     * @param {Object} options.localAxisInfo 坐标轴单位向量信息 {normalX: Cartesian3, normalY: Cartesian3, normalZ: Cartesian3}
     * @param {Number} [options.segment=10] 弧的分段数
     * @param {Number} [options.minimumClock=0] 弧的起始方位，单位为度
     * @param {Number} [options.maximumClock=360] 弧的终止方位，单位为度
     * 
     * @notes 右手坐标系
     * @example
     * const arcPrimitive = new BOSGeo.ArcPrimitive({
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
            axisType = EditorAxisType.XROTATE,
            localAxisInfo,

            segment = 10,
            minimumClock = 0,
            maximumClock = 360, // 都是从右侧轴进行逆时针计算方位角（0~360之间）


        } = options;
        this.id = Object.assign({
            axisType
        }, id);
        // defaultValue(axisType, id);
        this._color = Color.fromCssColorString(color);
        this.width = width;
        this._modelMatrix = modelMatrix;
        this._isInverse = isInverse;
        this._center = center;
        this.radius = radius;

        this._localAxisInfo = defaultValue(localAxisInfo, GeoUtil.getLocalAxisInfo(center));
        if (isInverse && !localAxisInfo) {
            const { normalX, normalY, normalZ } = this._localAxisInfo;
            this._localAxisInfo.normalX = Cartesian3.negate(normalX, new Cartesian3());
            this._localAxisInfo.normalY = Cartesian3.negate(normalY, new Cartesian3());
            this._localAxisInfo.normalZ = Cartesian3.negate(normalZ, new Cartesian3());
        }

        this.segment = segment;
        this._minimumClock = minimumClock;
        // isInverse ? minimumClock + 180 : minimumClock;
        this._maximumClock = maximumClock;
        // isInverse ? maximumClock + 180 : maximumClock;

        /**
         * @type {EditorAxisType}
         * @default BOSGeo.EditorAxisType.XROTATE
         * @readonly
         */
        this.axisType = axisType;

        this.positions = [];
        this.updatePositions();
    }


    /**
     * 获取扇形所在平面的轴法向量 xy、yz、zx
     * @private
     * 
     * @param {EditorAxisType} editorAxisType
     */
    getSectionPlaneAxis(editorAxisType) {
        let planeAxis;
        if (this._localAxisInfo) {
            const { normalX, normalY, normalZ } = this._localAxisInfo;
            switch (editorAxisType) {
                case EditorAxisType.ZROTATE:
                    planeAxis = {
                        right: normalX,
                        left: normalY
                    };
                    break;
                case EditorAxisType.XROTATE: default:
                    planeAxis = {
                        right: normalY,
                        left: normalZ
                    };
                    break;
                case EditorAxisType.YROTATE:
                    planeAxis = {
                        right: normalZ,
                        left: normalX
                    };
                    break;
            }
        }
        return planeAxis;
    }

    /**
     * 获取逆时针方向从minClock-》maxClock，按segment分段的每个点的方位角度
     * @ignore
     * 
     * @param {Number} minClock 起始边方位角，单位为度
     * @param {Number} maxClock 终止方位角，单位为度
     * @param {Number} segment 分段数，为整数，最小为1
     * 
     * @returns {Number[]} 单位为弧度 
     */
    getSectorHeadings(minClock, maxClock, segment) {
        segment = Math.max(1, segment);
        minClock = minClock < 0 ? minClock + 360 : minClock;
        maxClock = maxClock <= minClock ? maxClock + 360 : maxClock;

        const segmentAngle = (maxClock - minClock) / segment;
        const sectorHeadings = [];
        for (let angle = minClock; angle < maxClock; angle += segmentAngle) {
            sectorHeadings.push(CesiumMath.toRadians(angle));
        }
        sectorHeadings.push(CesiumMath.toRadians(maxClock));
        return sectorHeadings;
    }

    /**
     * 计算局部坐标
     * @ignore
     * 
     * @param {Object} planeAxis {right: Cartesian3, left: Cartesian3}, 平面局部坐标系上轴方向向量
     * @param {Number} heading 平面上的极角（planeAxis从right-》left，逆时针方向），单位为弧度
     * @param {Number} radius 平面上的极径
     */
    caculateLocalCoord(planeAxis, heading, radius) {
        const { right, left } = planeAxis;
        const localX = Cartesian3.multiplyByScalar(right, Math.cos(heading) * radius, new Cartesian3());
        const localY = Cartesian3.multiplyByScalar(left, Math.sin(heading) * radius, new Cartesian3());
        return Cartesian3.add(localX, localY, new Cartesian3());
    }

    /**
     * 将局部坐标转为世界坐标
     * @ignore
     * 
     * @param {Cartesian3} origin 局部坐标系原点（世界坐标）
     * @param {Object} planeAxis {right: Cartesian3, left: Cartesian3}, 平面局部坐标系上轴方向向量
     * @param {Number} heading 平面上的极角（planeAxis从right-》left，逆时针方向），单位为弧度
     * @param {Number} radius 平面上的极径
     */
    transformLocalToWorld(origin, planeAxis, heading, radius) {
        const { right, left } = planeAxis;
        const localX = Cartesian3.multiplyByScalar(right, Math.cos(heading) * radius, new Cartesian3());
        const localY = Cartesian3.multiplyByScalar(left, Math.sin(heading) * radius, new Cartesian3());
        return Cartesian3.add(
            origin,
            Cartesian3.add(localX, localY, new Cartesian3()),
            new Cartesian3()
        );
    }


    /**
     * 计算扇形顶点坐标
     * @private
     */
    updatePositions() {
        let curPositions;
        const planeAxis = this.getSectionPlaneAxis(this.axisType);
        if (planeAxis) {
            const sectorHeadings = this.getSectorHeadings(this._minimumClock, this._maximumClock, this.segment);
            curPositions = sectorHeadings.map((angle) => {
                return this.transformLocalToWorld(this._center, planeAxis, angle, this.radius);
            });
        }
        this.setPosition(curPositions);
    }

    /**
     * @property {Cartesian3} 圆弧局部坐标系原点，圆弧的圆心
     * 
     * 圆弧中心
     */
    get center() {
        return this._center;
    }
    set center(value) {
        Check.typeOf.object("value", value);
        if (value instanceof Cartesian3) {
            this._center = value;

            this.updatePositions();
        }
    }
    
    /**
     * @property {Object} value 圆弧编辑轴所在局部空间直角坐标系的轴向量信息 
     * 
     */
    get localAxisInfo() {
        return _localAxisInfo;
    }
    set localAxisInfo(value) {
        Check.typeOf.object("value", value);
        const { normalX, normalY, normalZ } = value;
        if (normalX instanceof Cartesian3 && normalY instanceof Cartesian3 && normalZ instanceof Cartesian3) {
            this._localAxisInfo = value;

            this.updatePositions();
        }
    }

    /**
     * 圆弧颜色
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
            this.primitive.depthFailAppearance = appearance;
        }
    }

    /**
     * 扇形边框右侧（起始边）的方位角
     * @property {Number} value 
     * 
     */
    get minimumClock() {
        return this._minimumClock;
    }
    set minimumClock(value) {
        Check.typeOf.number("value", value);
        if (this._minimumClock !== value) {
            this._minimumClock = value;

            this.updatePositions();
        }
    }

    /**
     * 扇形边框左侧（终止边）的方位角
     * @property {Number} value 
     * 
     */
    get maximumClock() {
        return this._maximumClock;
    }
    set maximumClock(value) {
        Check.typeOf.number("value", value);
        if (this._maximumClock !== value) {
            this._maximumClock = value;

            this.updatePositions();
        }
    }

    /**
     * 模型矩阵
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
            depthFailAppearance: appearance,
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
        return new PolylineMaterialAppearance({
            material: new Material({
                fabric: {
                    type: 'Color',
                    uniforms: {
                        color: this._color,
                    },
                },
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
        // this.primitive = this.createPrimitive();
    }

    /**
     * 设置坐标
     * @private
     * 
     * @param {Cartesian3[]} positions 折线坐标串
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

export default ArcPrimitive;