/**
 * 地图上加载的实体类型
 * @readonly
 * @enum {Number}
 * @example
 * var geomap = new BOSGeo.GeoMap('container')
 * let modelLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.MODEL, 'model123', {customGroupId: 'model'});
 * let testBIMModel = modelLayer.add({
 *     name: 'testBIM',
 *     url: 'http://bosgeo.boswinner.com/geoData/models/3DTiles/BIM_G1598257565598/tileset.json',
 *     featureType: BOSGeo.FeatureType.BIM,
 *     position: [114.2, 22.6, 10]
 * });
 */
const FeatureType = {
  /**
   * 点
   */
  POINT: 0,

  /**
   * 文字
   */
  TEXT: 1,

  /**
   * 图标
   */
  ICON: 2,

  /**
   * htmlLayer
   */
  // HTML: 3,

  /**
   * 线
   */
  LINE: 4,

  /**
   * 多边形
   */
  POLYGON: 5,

  /**
   * 矩形
   */
  RECT: 6,

  /**
   * 圆形
   */
  ELLIPSE: 7,

  /**
   * 管线
   */
  PIPELINE: 8,

  /**
   * 组合图形
   */
  COMBINE_GRAPHIC: 9,

  /**
   * 管道
   */
  TUBE: 10,

  /**
   * glTF格式的模型
   */
  GLTF: 11,

  /**
   * 3dTiles格式的模型
   */
  TILES: 12,

  /**
   * 3dTiles格式的点云模型
   */
  POINTCLOUD: 13,

  /**
   * 3dTiles格式的BIM模型
   */
  BIM: 14,

  /**
   * 3dTiles格式的倾斜摄影模型
   */
  PHOTO: 15,

  /**
   * 圆柱体
   */
  CYLINDER: 16,

  /**
   * 立方体 box
   */
  CUBE: 17,

  /**
   * 自由画立体图形
   */
  POLYGONHEIGHT: 18,

  /**
   * 墙
   */
  WALL: 19,

  /**
   * 长方体
   */
  TRIANGEL: 20,

  /**
   * 盒子
   */
  BOX: 21,

  /**
   * 白模
   */
  WHITE_MODEL: 22,

  /**
   * 地下管线
   */
  PIPLE: 23,

  /**
   * 空间网格
   */
  GRID: 24,

  /**
   * 球
   */
  ELLIPSOID: 25,
  /**
   * 球缓冲区
   */
   BUFFER_BALL: 26,
  /**
   * 面缓冲区
   */
  BUFFER_PLANE: 27,
  /**
   * 可达区
   */
  ISOCHRONE_CENTER: 28,
  /**
   * 可达区
   */
  ISOCHRONE_AREA: 29,
  /**
   * Entity
   */
  ENTITY: 30,
  /**
   * CLUSTER
   */
  CLUSTER: 31,
    /**
     * 来自点图层的点 
     */
    POINT_POINT: 32,
    /**
     * 来自线图层的动态线 
     */
     LINE_DYNAMIC: 33,
    /**
     * 来自线图层的普通线
     */
     LINE_NORMAL: 34,
    /**
     * 来自面图层的多边形区域面
     */
    AREA_POLYGON: 35,
    /**
     * 来自面图层的圆形区域面
     */
    AREA_CIRCLE: 36,

  /**
   * 单个位置的实体类型。如：点、图标、文本 ISOCHRONE
   */
  isSinglePositionType: function (type) {
    return (
      type === FeatureType.POINT ||
      type === FeatureType.MARK ||
      type === FeatureType.ICON ||
      type === FeatureType.LABEL
    );
  },
  /**
   * 模型类型
   */
  isModelType: function (type) {
    return (
      type === FeatureType.GLTF ||
      type === FeatureType.TILES ||
      type === FeatureType.POINTCLOUD ||
      type === FeatureType.BIM ||
      type === FeatureType.PHOTO ||
      type === FeatureType.WHITE_MODEL
    );
  },
};

export default Object.freeze(FeatureType);
