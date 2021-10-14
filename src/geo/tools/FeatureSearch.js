import defaultValue from '../../cesium/Core/defaultValue'
import Cesium3DTileStyle from '../../cesium/Scene/Cesium3DTileStyle'
import {BosApi} from '../service/bos/BosApi'
import {GeoDepository} from '../core/GeoDepository'
import GeoUtil from '../utils/GeoUtil'
/**
 * 根据构件属性查询定位构件
 * @ignore
 * @param {*} options 
 */
function FeatureSearch (options) {
    this.options = defaultValue(options, {});
    this._tileset = [];
    this._highlightColor = defaultValue(this.options.highlightColor, '#0f0');
    this._propertyName = this.options.propertyName || 'key';
    this._hightLighTile = [];

    this._style = new Cesium3DTileStyle();
}

Object.defineProperties(FeatureSearch.prototype, {
    tileset: {
        get: function () {
            return this._tileset
        },
        set: function (val) {
            this._tileset.push(val);
        } 
    }
})
/**
 * 测试
 */
FeatureSearch.prototype.test = function () {
    let data = {
        "model": "M1577444075512",
            "condition": [
                {
                    "type": "filter",
                    "field": "attribute.BaseQuantities.GrossArea",
                    "operator": "==",
                    "value": "36.670854086504"
                }
            ]
        }
        BosApi.getFeatureByAtrribute('msq', data).then( result => {
        let resultData = JSON.parse(result);
        if (!resultData.data) return
        //
        this.getFeatureByAtrribute('key', resultData.data);
    });
}

/**
 * 根据构件key定位到构件
 * @param key
 * @param originModel
 * @param orientation
 * @param scale
 */
FeatureSearch.prototype.flyToFeatureByKey = function (key, originModel, orientation, scale) {
    BosApi.getCenterByKey(key).then((data) => {
        let maxBoundary = data.data.maxBoundary;
        let minBoundary = data.data.minBoundary;
        GeoUtil.flyToFeatureByBoundsphere(maxBoundary, minBoundary, originModel, orientation, scale);
    })
}

/**
 * 根据属性名获取所有构件
 * @param propertyName
 * @param data
 */
FeatureSearch.prototype.getFeatureByAtrribute = function (propertyName, data) {
    // data.push('M1576661681588_3$KiPBYt1ABBRiW6216cJq');
    this._propertyName = propertyName;
    for (let i = 0; i < data.length; i++) {
        // 检查重复值
        let existLen = this._hightLighTile.length;
        if (existLen === 0) {
            this._hightLighTile.push(data[i]);
            this.hightLighTile();
            return;
        }
        for (let j = 0; j < existLen; j++) {
            let flag = false;
            if (this._hightLighTile[j] === data[i]) {
                flag = true;
            }
            !flag && this._hightLighTile.push(data[i]);
        }
    }
    this.hightLighTile();
}
/**
 * 高亮改属性下所有的构件
 */
FeatureSearch.prototype.hightLighTile = function () {
    let hColorStr = 'color("' + this._highlightColor + '", 0.5)';
    let conditions = [];

    for (let i = 0, len = this._hightLighTile.length; i < len; i++) {
        let id = this._hightLighTile[i];
        let condition;
        if (typeof id === 'number') {
            condition = ['${' + this._propertyName + '}===' + id, hColorStr];
        } else if (typeof id === 'string') {
            condition = ['${' + this._propertyName + '}==="' + id + '"', hColorStr];
        }
        conditions.push(condition);
    }
    conditions.push(['true', 'color("white")']);
    this._style.color = {conditions: conditions};
    this._tileset[0].style = this._style;
    GeoDepository.scene.requestRender();
}
/**
 * 重置构件属性
 */
FeatureSearch.prototype.reset = function () {
    this._style.color = 'color("white")';
    let len = this._tileset.length;
    for (let i = 0; i < len; i++) {
        this._tileset[i].style = this._style;
    }
    GeoDepository.scene.requestRender();
    this._tileset = [];
}

export {FeatureSearch}