/**
 * 初始化场景后的全局对象属性，方便其他js模块直接调用（在GeoMap初始化时赋值）
 * 
 * @private
 * 
 */
let GeoDepository = {
    geomap: undefined,
    viewer: undefined,
    scene: undefined,
    camera: undefined,
    // overViewer: undefined, //鹰眼
    // layerManager:undefinde  //图层管理对象
    _modelMove:undefined    //模型移动事件
};

export {GeoDepository}