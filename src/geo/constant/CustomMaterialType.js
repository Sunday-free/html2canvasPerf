
/**
 * 自定义材质类型
 * @alias CustomMaterialType
 * 
 * @enum {String}
 * 
 * @see DrawHandler 
 * @see DrawPrimitive
 */
const CustomMaterialType = {
    /**
     * 颜色材质（实线）
     * @type {String}
     * @constant
     */
    LINE_COLOR: 'LineColor',
    /**
     * 发光线材质
     * @type {String}
     * @constant
     */
    LINE_GROW: 'LineGrow',
    /**
     * 虚线材质
     * @type {String}
     * @constant
     */
    LINE_DASH: 'LineDash',
    /**
     * 流动材质
     * @type {String}
     * @constant
     */
    LINE_FLOW: 'LineFlow',
}

export default Object.freeze(CustomMaterialType);