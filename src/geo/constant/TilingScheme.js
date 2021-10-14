/**
 * 地图切片方案,枚举类
 * @readonly
 * @enum {Number}
 */
let TilingScheme = {
    /**GeographicTilingScheme */
    GeographicTilingScheme:0,
    /**WebMercatorTilingScheme */
    WebMercatorTilingScheme:1,
}

Object.freeze(TilingScheme);

export default TilingScheme;