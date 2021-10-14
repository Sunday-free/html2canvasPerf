import { ModelStyler } from "./ModelStyler";
import JulianDate from "cesium/Core/JulianDate";

/**
 * BIM模型闪烁接口,参数：闪烁模型数组、颜色、透明度、闪烁时间间隔
 * @constructor
 * @param {Object} [options] 参数配置
 * @param {String} [options.color = '#ff0000'] 十六进制的颜色字符串
 * @param {Number} [options.opacity = 1] 透明度
 * @param {Number} [options.interval = 3] 时间间隔
 * @example
 *  var modelFlicker = new BOSGeo.ModelFlicker({
    color:"#0000ff",
    opacity: 0.9,
    interval: 3
    });
 */

class ModelFlicker {
  constructor(options = {}) {
    this._highlightColor = options.color || "#ff0000";
    this._opacity = options.opacity || 1;
    this._interval = options.interval || 3;
    this._timer = null;
  }

  /**
     * 开启模型闪烁
     * @param {Array} models 闪烁模型的数组
     * @param {Object} [options] 闪烁的样式配置
     * @param {String} [options.color = '#ff0000'] 十六进制的颜色字符串
     * @param {Number} [options.opacity = 1] 透明度
     * @param {Number} [options.interval = 3] 时间间隔
     * @example
     * let model = modelLayer.add({
            name: '模型3dtiles',
            // url: 'https://lab.earthsdk.com/model/887b3db0cd4f11eab7a4adf1d6568ff7/tileset.json',
            url: 'http://bosgw.bimwinner.com/bos3dengine/api/i432ee7c3af141249915d154d92084ca/geomodels/G1618196965800/data/tileset.json',
            featureType: BOSGeo.FeatureType.BIM,
            position: [113.107767, 23.02872, 25.78]
        });

        let gltfModel = modelLayer.add({
            name: 'gltfModel',
            url: 'http://localhost/build/tiyuguan.glb',
            featureType: BOSGeo.FeatureType.GLTF,
            position: [113.107, 23.0276, 100],
            rotation: [0, 90, 0],
            scale: 0.001
        });
        //创建模型对象数组
        var models = [model, gltfModel];

        var modelFlicker = new BOSGeo.ModelFlicker();
        modelFlicker.on(models, {
            color: "#00ff00",
            opacity: 0.5
        });
     */
  on(models, options = {}) {
    let modelStyler = new ModelStyler({
      highlightColor: options.color || this._highlightColor,
      opacity: options.opacity || this._opacity,
      propertyName: "id", //构件属性名
      highlightComponent: true,
    });
    let interval = options.interval ? options.interval + 1 : this._interval + 1;
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => {
      let julianTime = JulianDate.now();
      var txf = Math.floor(julianTime.secondsOfDay);
      if (txf % interval == 0) {
        models.forEach((model) => {
          if (model.featureType === BOSGeo.FeatureType.GLTF) {
            modelStyler.highlightGltf(model);
          }
          if (
            model.featureType === BOSGeo.FeatureType.BIM ||
            model.featureType === BOSGeo.FeatureType.TILES
          ) {
            modelStyler.setTilesetColorWithAlpha(model, modelStyler._opacity);
          }
        });
      } else {
        models.forEach((model) => {
          if (model.featureType === BOSGeo.FeatureType.GLTF) {
            modelStyler.unHighlightGltf(model);
          }
          if (
            model.featureType === BOSGeo.FeatureType.BIM ||
            model.featureType === BOSGeo.FeatureType.TILES
          ) {
            BOSGeo.ModelStyler.setTilesetColor(model);
          }
        });
      }
    }, 100);
  }
  /**
     * 关闭模型闪烁
     * @param {Array} models 闪烁模型的数组
     * @example
     * let model = modelLayer.add({
            name: '模型3dtiles',
            // url: 'https://lab.earthsdk.com/model/887b3db0cd4f11eab7a4adf1d6568ff7/tileset.json',
            url: 'http://bosgw.bimwinner.com/bos3dengine/api/i432ee7c3af141249915d154d92084ca/geomodels/G1618196965800/data/tileset.json',
            featureType: BOSGeo.FeatureType.BIM,
            position: [113.107767, 23.02872, 25.78]
        });

        let gltfModel = modelLayer.add({
            name: 'gltfModel',
            url: 'http://localhost/build/tiyuguan.glb',
            featureType: BOSGeo.FeatureType.GLTF,
            position: [113.107, 23.0276, 100],
            rotation: [0, 90, 0],
            scale: 0.001
        });
        //创建模型对象数组
        var models = [model, gltfModel];

        var modelFlicker = new BOSGeo.ModelFlicker();
        modelFlicker.on(models, {
            color: "#00ff00",
            opacity: 0.5
        });
        // 关闭模型闪烁
        modelFlicker.off(models);
     */
  off(models) {
    let modelStyler = new ModelStyler({});

    models.forEach((model) => {
      if (model.featureType === BOSGeo.FeatureType.GLTF) {
        modelStyler.unHighlightGltf(model);
      }
      if (
        model.featureType === BOSGeo.FeatureType.BIM ||
        model.featureType === BOSGeo.FeatureType.TILES
      ) {
        BOSGeo.ModelStyler.setTilesetColor(model);
      }
    });
    clearInterval(this._timer);
  }
}

export { ModelFlicker };
