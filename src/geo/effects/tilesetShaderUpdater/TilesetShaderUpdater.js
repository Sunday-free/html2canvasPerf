// import { GeoDepository } from "../../core/GeoDepository";
import Cesium3DTileset from 'cesium/Scene/Cesium3DTileset';
import Cesium3DTile from 'cesium/Scene/Cesium3DTile';
import DeveloperError from 'cesium/Core/DeveloperError';
import defaultValue from 'cesium/Core/defaultValue';
import destroyObject from 'cesium/Core/destroyObject';
import GeoUtil from '../../utils/GeoUtil';


class TilesetShaderUpdater {
    /**
     * 模型(b3dm类型的图层)自定义着色器更新类
     * @alias TilesetShaderUpdater
     * @constructor
     * @abstract
     * @private
     *
     * @param {Cesium3DTileset} tileset
     * @param {Object} options 自定着色器相关参数
     * @param {Boolean} [options.show=true] 是否应用自定义着色器
     */
    constructor(tileset, options = {}) {
        if (!(tileset instanceof Cesium3DTileset)) {
            throw new DeveloperError('tileset must be an instance of BOSGeo.Cesium3DTileset！');
        }

        this._tileset = tileset;

        this._originalVertexShader = undefined;
        this._originalFragmentShader = undefined;
        this._hasSavedOriginalShaders = false; // 是否已经保存了原始着色器

        this._customVertexShader = undefined;
        this._customFragmentShader = undefined;

        if (!this._tileset.tilesLoaded) {
            this._tileLoadCallback = this._saveOriginalShaders.bind(this);
            this._tileset.tileLoad.addEventListener(this._tileLoadCallback);
        } else {
            setTimeout(() => {
                const tileCaches = GeoUtil.getTileCaches(tileset);
                // console.log('已加载完毕！', tileCaches.length);
                let res = false;
                for (let i = 0, len = tileCaches.length; i < len; i++) {
                    res = this._saveOriginalShaders(tileCaches[i]);
                    break;
                }
            }, 1000);
        }

        // console.log('是否已经加载完毕:', this._tileset.tilesLoaded);

        this._show = defaultValue(options.show, true);
        if (this._show) {
            this._addVisibleEvent();
        }
    }

    /**
     * 保存初始状态下的着色器程序
     * @private
     *
     * @param {Cesium3DTile} tile
     * @returns {Boolean}
     */
    _saveOriginalShaders(tile) {
        const modelList = getModelsFromTile(tile);
        for (let len = modelList.length, i = len - 1; i >= 0; i--) {
            const model = modelList[i];
            const { _sourcePrograms, _rendererResources } = model;
            // console.log(defined(model._vertexShaderLoaded));
            if (model && _sourcePrograms && _rendererResources) {
                Object.keys(_sourcePrograms).forEach(key => {
                    const { vertexShader, fragmentShader } = _sourcePrograms[key];
                    if (!this._hasSavedOriginalShaders) {
                        this._originalVertexShader = _rendererResources.sourceShaders[vertexShader];
                        this._originalFragmentShader = _rendererResources.sourceShaders[fragmentShader];
                        // console.log(this._originalVertexShader, this._originalFragmentShader);

                        this._tileset.tileLoad.removeEventListener(this._tileLoadCallback);
                        this._hasSavedOriginalShaders = true;
                        return true;
                    }
                });
            }
        }
        return false;
    }

    /**
     * 瓦片更新回调方法
     * @private
     *
     * @param {Cesium3DTile} tile
     */
    _updateTile(tile) {
        if (this._hasSavedOriginalShaders) {
            const customVS = defaultValue(this._customVertexShader, this._originalVertexShader);
            const customFS = defaultValue(this._customFragmentShader, this._originalFragmentShader);
            updateTileShaders(tile, customVS, customFS);
        }
    }

    /**
     * 绑定瓦片更新方法
     * @private
     */
    _addVisibleEvent() {
        if (!this._tileVisibleCallback) {
            this._tileVisibleCallback = this._updateTile.bind(this);
            this._tileset.tileLoad.addEventListener(this._tileVisibleCallback);
        } else {
            console.warn('You have added a tileVisibleEvent to the tileset!');
        }
    }

    /**
     * 移除瓦片更新方法
     * @private
     */
    _removeVisibleEvent() {
        if (this._tileVisibleCallback) {
            this._tileset.tileLoad.removeEventListener(this._tileVisibleCallback);
            this._tileVisibleCallback = undefined;
        } else {
            console.warn('You have removed tileVisibleEvent of the tileset in this class!');
        }
    }

    /**
     * 还原瓦片着色器代码
     * @private
     */
    _recoverTileShaders() {
        this._updateTileShaders(this._originalVertexShader, this._originalFragmentShader);
    }

    /**
     * 更新瓦片缓存的着色器代码
     * @private
     *
     * @param {String} vs
     * @param {String} fs
     */
    _updateTileShaders(vs, fs) {
        if (this._hasSavedOriginalShaders) {
            const tileCaches = GeoUtil.getTileCaches(this._tileset);
            for (let i = 0, len = tileCaches.length; i < len; i++) {
                updateTileShaders(tileCaches[i], vs, fs);
            }
        } else {
            console.warn('You have not saved the original shaders yet!');
        }
    }

    /**
     * 更新瓦片自定义着色器代码
     * @private
     */
    _updateTileCustomShaders() {
        if (this._show && this._hasSavedOriginalShaders) {
            const customVS = defaultValue(this._customVertexShader, this._originalVertexShader);
            const customFS = defaultValue(this._customFragmentShader, this._originalFragmentShader);
            // console.log(customVS, customFS);
            this._updateTileShaders(customVS, customFS);
        }
    }

    /**
     * 是否应用自定义着色器
     * @type {Boolean}
     * @default true
     */
    get show() {
        return this._show;
    }
    set show(value) {
        this._show = value;
        if (value) {
            this._addVisibleEvent();
            this._updateTileCustomShaders();
        } else {
            this._removeVisibleEvent();
            this._recoverTileShaders();
        }
    }

    /**
     * 完整的自定义顶点着色器
     * @type {String}
     * @default undefined
     */
    get customVertexShader() {
        return this._customVertexShader;
    }
    set customVertexShader(value) {
        if (this._customVertexShader !== value) {
            this._customVertexShader = value;
            //this._updateTileCustomShaders();
        }
    }

    /**
     * 完整的自定义片源着色器
     * @type {String}
     * @default undefined
     */
    get customFragmentShader() {
        return this._customFragmentShader;
    }
    set customFragmentShader(value) {
        if (this._customFragmentShader !== value) {
            this._customFragmentShader = value;
            this._updateTileCustomShaders();
        }
    }

    /**
     * 销毁
     * @returns {undefined}
     */
    destroy() {
        this._removeVisibleEvent();
        this._recoverTileShaders();
        return destroyObject(this);
    }
}

export default TilesetShaderUpdater

/**
 * 获取Cesium3DTile中的b3dm集
 * @private
 *
 * @param {Cesium3DTile} tile
 * @returns {Array.<Model>}
 */
function getModelsFromTile(tile) {
    const modelList = [];
    const content = tile.content;
    if (content) {
        const { featuresLength, _model } = content;
        if (featuresLength === 0) {
            _model && modelList.push(_model);
        } else {
            for (let i = 0; i < featuresLength; i++) {
                modelList.push(content.getFeature(i).content._model);
            }
        }
        for (let i = 0, num = tile.children.length; i < num; i++) {
            const childrenModelList = getModelsFromTile(tile.children[i]);
            modelList.push(...childrenModelList);
        }
    }
    return modelList;
}

/**
 * 更新Cesium3DTile着色器
 * @private
 *
 * @param {Cesium3DTile} tile
 * @param {String} vs 顶点着色器
 * @param {String} fs 片源着色器
 * @returns {Number} 更新的model个数
 */
function updateTileShaders(tile, vs, fs) {
    const modelList = getModelsFromTile(tile);
    for (let i = 0, len = modelList.length; i < len; i++) {
        const model = modelList[i];
        const { _sourcePrograms, _rendererResources } = model;
        if (model && _sourcePrograms && _rendererResources) {
            Object.keys(model._sourcePrograms).forEach(key => {
                const { vertexShader, fragmentShader } = model._sourcePrograms[key];
                vs && (model._rendererResources.sourceShaders[vertexShader] = vs);
                fs && (model._rendererResources.sourceShaders[fragmentShader] = fs);
            });
            model._shouldRegenerateShaders = true;
        }
    }
    return modelList.length;
}
