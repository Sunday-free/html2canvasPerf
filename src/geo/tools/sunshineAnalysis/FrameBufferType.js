/**
 * 帧缓存对象类型
 * @private
 */
var FrameBufferType = {
    /**
     * 法线
     * @type {Number}
     * @constant
     */
    NORMAL: 0,
    /**
     * 法线
     * @type {Number}
     * @constant
     */
    REFLECT: 1,
    /**
     * 深度
     * @type {Number}
     * @constant
     */
    DEPTH: 2,
    /**
     * 发现深度
     * @type {Number}
     * @constant
     */
    NORMAL_AND_DEPTH: 3,
    /**
     * 后处理过滤
     * @type {Number}
     * @constant
     */
    POSTEFFECT_FILTER: 4,
    /**
     * 栅格
     * @type {Number}
     * @constant
     */
    RASTER: 5,
    /**
     * 贴地
     * @type {Number}
     * @constant
     */
    CLAMP: 6
};

export default Object.freeze(FrameBufferType);
