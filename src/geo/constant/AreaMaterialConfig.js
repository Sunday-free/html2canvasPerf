import clone from 'cesium/Core/clone'
/**
 * 面图层中面或墙的材质类型，枚举类
 * @alias AreaMaterialConfig
 * @readonly
 * @enum {Object}
 *  @example
 * //创建面图层：areaLayer
    * const landMaterial = BOSGeo.AreaMaterialConfig.DOT; //获取一套材质配置参数模板
    * landMaterial.lightColor = '#ff0000'; //修改材质配置参数
    * 
    * areaLayer.add({
    *   positions: [[113,24,0], [112,25,0],[112,20,0]],
    *   landMaterial
    * });
 */
var AreaMaterialConfig = {
    /**
     * 条纹纹理
     */
    STRIPE:{} ,
    /**
     * 棋盘纹理
     */
    CHECKERBOARD: {},
    /**
     * 网格纹理
     */
    GRID: {},
    /**
     * 点纹理
     */
    DOT:{} ,
    /**
     * 图片纹理
     */
    IMAGE: {},
    /**
     * 普通颜色
     */
    COLOR:{} 
};

Object.defineProperty(AreaMaterialConfig, "STRIPE", {
    get: function () {
        return {
            type:'Stripe',
            horizontal:true,
            evenColor: '#08ffc6',
            oddColor: '#fff0',
            offset: 0.0,
            repeat: 15,
        };
    }
});
Object.defineProperty(AreaMaterialConfig, "CHECKERBOARD", {
    get: function () {
        return {
            type: 'Checkerboard',
            repeat: [40, 5],
            lightColor: '#ffcf00',
            darkColor: '#00a6ff'
        };
    }
});
Object.defineProperty(AreaMaterialConfig, "GRID", {
    get: function () {
        return {
            type: 'Grid',
            lineCount: [20, 20],
            color: '#fff000',
            lineOffset:[0,0],
            lineThickness: [1, 1]
        };
    }
});
Object.defineProperty(AreaMaterialConfig, "DOT", {
    get: function () {
        return {
            type: 'Dot',
            repeat: [5, 5],
            lightColor: '#fff000',
            darkColor: '#c3c3c3'
        };
    }
});
Object.defineProperty(AreaMaterialConfig, "IMAGE", {
    get: function () {
        return {
            type: 'Image',
            image : null,
            repeat: [1,1],
            color: '#fff000'
        };
    }
});
Object.defineProperty(AreaMaterialConfig, "COLOR", {
    get: function () {
        return {
            type: 'Color',
            color: '#fff000'
        };
    }
});

export default Object.freeze(AreaMaterialConfig);
