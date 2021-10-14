/**
 * 自由平面剖切模式枚举类型
 * @alias ClipModeType
 * 
 * @enum {String}
 * 
 * @example
 * new BOSGeo.PlaneClipTool(map, {
 *      clipMode: BOSGeo.ClipModeType.X,
 *      tileset: layer,
 * });
 */
const ClipModeType = {
    /**
     * ENU坐标系下X轴正方向的剖切模式
     * @type {String}
     * @constant
     */
    X: 'X',

    /**
     * ENU坐标系下Y轴正方向的剖切模式
     * @type {String}
     * @constant
     */
    Y: 'Y',

    /**
     * ENU坐标系下Z轴正方向的剖切模式
     * @type {String}
     * @constant
     */
    Z: 'Z',

    /**
     * ENU坐标系下X轴负方向的剖切模式
     * @type {String}
     * @constant
     */
    MINUS_X: 'MINUS_X',

    /**
     * ENU坐标系下Y轴负方向的剖切模式
     * @type {String}
     * @constant
     */
    MINUS_Y: 'MINUS_Y',

    /**
     * ENU坐标系下Z轴负方向的剖切模式
     * @type {String}
     * @constant
     */
    MINUS_Z: 'MINUS_Z',
};

export default Object.freeze(ClipModeType);