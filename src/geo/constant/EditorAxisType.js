/**
 * 编辑轴类型
 * @alias EditorAxisType
 * @private
 * 
 * @enum {String}
 * 
 */
const EditorAxisType = {
    /**
    * ENU坐标系下X正方向拖动轴id
    * @type {String}
    * @static
    * @constant
    */
    XPAN: 'x-pan',

    /**
     * ENU坐标系下Y正方向拖动轴id
     * @type {String}
     * @static
     * @constant
     */
    YPAN: 'y-pan',

    /**
     * ENU坐标系下Z正方向拖动轴id
     * @type {String}
     * @static
     * @constant
     */
    ZPAN: 'z-pan',

    /**
     * ENU坐标系下YZ平面上旋转编辑轴id
     * @type {String}
     * @static
     * @constant
     */
    XROTATE: 'x-rotate',
    /**
     * ENU坐标系下ZX平面上旋转编辑轴id
     * @type {String}
     * @static
     * @constant
     */
    YROTATE: 'y-rotate',

    /**
     *  ENU XY平面上旋转编辑轴id
     * @type {String}
     * @static
     * @constant
     */
    ZROTATE: 'z-rotate',

    /**
     *  XY平面id 
     * @type {String}
     * @static
     * @constant
     */

     XY_PLANE: 'XY_PLANE',
     /**
     *  XZ平面id
     * @type {String}
     * @static
     * @constant
     */
      XZ_PLANE: 'XZ_PLANE',
    /**
     *  YZ平面id
     * @type {String}
     * @static
     * @constant
     */
     YZ_PLANE: 'YZ_PLANE',
};

export default Object.freeze(EditorAxisType);