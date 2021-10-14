/*
 * @Author: your name
 * @Date: 2021-03-19 11:26:58
 * @LastEditTime: 2021-04-01 12:50:15
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \Viewer\src\geo\service\bos\BosModelType.js
 */
/**
 * 模型数据类型（与BosGeo后台的模型数据对应）
 * @ignore
 */
const BosModelType = Object.freeze({
    /**
     * gltf格式模型
     * @private
     */
    gltf: 'GLTF',

    /**
     * 3dtiles格式模型
     * @private
     */
    tiles: '3DTILES'
});

export {BosModelType}