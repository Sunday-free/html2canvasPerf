
/**
 * 绘制的几何类型
 * @alias DrawType
 * 
 * @enum {String}
 * 
 * @see DrawPrimitive
 * @see DrawHandler
 */
const DrawType = {
    /**
     * 椭圆
     * @type {String}
     * @constant
     */
    ELLIPSE: 'Ellipse',
    /**
     * 圆
     * @type {String}
     * @constant
     */
    CIRCLE: 'Circle',
    /**
     * 矩形
     * @type {String}
     * @constant
     */
    RECTANGLE: 'Rectangle',
    /**
     * 正方形
     * @type {String}
     * @constant
     */
    SQUARE: 'Square',
    /**
     * 椭球体
     * @type {String}
     * @constant
     */
    ELLIPSOID: 'Ellipsoid',
    /**
     * 球
     * @type {String}
     * @constant
     */
    SPHERE: 'Sphere',
    /**
     * 多边形
     * @type {String}
     * @constant
     */
    POLYGON: 'Polygon',
    /**
     * 折线
     * @type {String}
     * @constant
     */
    POLYLINE: 'Polyline',
    /**
     * 抛物线
     * @type {String}
     * @constant
     */
    PARABOLA: 'Parabola',
    /**
     * 图标
     * @type {String}
     * @constant
     */
    BILLBOARD: 'Billboard',
};

export default Object.freeze(DrawType);