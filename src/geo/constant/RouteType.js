/*
 * @Author: your name
 * @Date: 2021-03-19 11:26:58
 * @LastEditTime: 2021-04-01 12:48:16
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \Viewer\src\geo\constant\RouteType.js
 */
/**
 * 室外路径规划类型
 * @private
 * @readonly
 * @enum {String}
 */
const RouteType = Object.freeze({
    /**
     * 公交
 	 * @private
     */
    BUS: "BUS",

    /**
     * 驾车
 	 * @private
     */
    CAR: "CAR",

    /**
     * 步行
 	 * @private
     */
    WALK: "WALK",

    /**
     * 骑行
     * @private
     */
    BIKE: "BIKE"
});

export default {RouteType};