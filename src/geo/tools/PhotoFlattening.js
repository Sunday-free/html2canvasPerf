import DeveloperError from 'cesium/Core/DeveloperError';
import destroyObject from 'cesium/Core/destroyObject';

import { GeoDepository } from "../core/GeoDepository"
import FeatureType from "../constant/FeatureType"

class PhotoFlattening {
    /**
     * 倾斜压平（只针对featureType为BOSGeo.FeatureType.PHOTO类型的数据--b3dm）
     * @alias PhotoFlattening
     * @constructor
     * 
     * @example
     * var photoFlatting = new BOSGeo.PhotoFlattening();
     * 
     */
    constructor() {
        const { scene } = GeoDepository;
        this.scene = scene;
        this._layers = getPhotoLayers(scene.primitives);
        this._flattenRegions = new FlattedRegionCollection();
    }

    /**
     * 参与倾斜压平的Cesium3DTileset图层集合（只针对featureType为BOSGeo.FeatureType.PHOTO类型的数据--b3dm）
     * @property {Array.<Cesium3DTileset>}
     * @default `场景中所有的倾斜`
     */
    get layers() {
        return this._layers;
    }
    set layers(value) {
        if (value && value.length > 0); {
            this._resetFlattenedLayers();
            value.forEach((item) => {
                if (item instanceof Cesium3DTileset && primitive.featureType === FeatureType.PHOTO) {
                    this._layers.push(item);
                    item.flattedRegions = this._flattenRegions;
                }
            });
        }
    }

    /**
     * 重置压平图层
     * @private
     */
    _resetFlattenedLayers() {
        for (let i = 0, num = this._layers.length; i < num; i++) {
            if (this._layers[i].flattedRegions instanceof FlattedRegionCollection) {
                this._layers[i].flattedRegions.removeAll();
            }
        }
        this._layers = [];
    }

    /**
     * 添加需要压平的倾斜图层
     * @param {Cesium3DTileset} layer 倾斜图层
     * 
     * @returns {Boolean} true表示添加成功或已经添加过， false表示添加失败
     */
    addFlattingLayer(layer) {
        let result = false;
        const existedLayer = this._layers.find((item) => item.id = layer.id);
        if (existedLayer) {
            result = true;
        } else if (layer instanceof Cesium3DTileset && layer.featureType === FeatureType.PHOTO) {
            this._layers.push(layer);
            layer.flattedRegions = this._flattenRegions;
        }
        return false;
    }

    /**
     * 移除不需要压平的倾斜图层
     * @param {String} layerId 倾斜图层id
     * 
     * @returns {Boolean} true表示删除成功， false表示移除失败或不存在该id的倾斜图层
     */
    removeFlattedLayerById(id) {
        let result = false;
        for (let i = 0, len = this._layers.length; i < len; i++) {
            if (this._layers[i].id === id) {
                result = true;
                this._layers[i]._flattenRegions = new FlattedRegionCollection();
                this._layers.splice(i, 1);
                break;
            }
        }
        return result;
    }

    /**
     * 添加新的压平区域
     * @param {Array.<number>} positions 压平区域顶点经纬度组成的数组，经纬度单位为度
     * @param {String} name 
     * @returns {String} 返回压平区域的id
     * 
     * @example
     * photoFlatting.add(
     * [ 123.45, 22.1, 
     *   123.45, 22.2,
     *   123.46, 22.2], '压平区域1');
     */
    addFlatteningRegion(positions, name) {
        if (positions.length < 6) {
            throw new DeveloperError('PhotoFlattening.addFlatteningRegion--指定区域顶点个数不对！', positions);
        }
        return this._flattenRegions.add(positions, name);
    }

    /**
     * 重命名压平区域
     * @param {String} name 新的压平区域名称
     * @param {String} id 压平区域的id
     * 
     * @returns {Boolean} true表示重命名成功,false表示重命名失败或者不存在该id的压平区域
     */
    renameFlattendRegion(name, id) {
        return this._flattenRegions.rename(name, id);
    }

    /**
     * 调整压平区域的高度
     * @param {Number} height 新的压平高度 
     * @param {String} id 压平区域的id
     * 
     * @returns {Boolean} true表示高度修改成功,false表示高度修改失败或者不存在该id的压平区域
     */
    adjustHeight(height, id) {
        return this._flattenRegions.adjustHeight(height, id);
    }

    /**
     * 定位到压平区域
     * @param {String} id 压平区域的id
     */
    flyToFlattenedRegion(id) {
        this._flattenRegions.flyTo(id);
    }

    /**
     * 移除指定id的压平区域
     * @param {String} id 压平区域的id
     * 
     * @returns {Boolean} true表示移除成功,false表示移除失败或者不存在该id的压平区域
     */
    removeFlattenedRegion(id) {
        return this._flattenRegions.remove(id);
    }

    /**
     * 移除所有压平区域
     */
    removeAll() {
        this._flattenRegions.removeAll();
    }

    /**
     * 销毁
     * @returns {undefined}
     */
    destroy() {
        this._resetFlattening();
        return destroyObject(this);
    }
}

/**
 * 获取图元集合中的所有倾斜图层(featureType === FeatureType.PHOTO)
 * 
 * @private
 * 
 * @param {PrimitiveCollection} primitiveCollection 
 * @param {Array.<Cesium3DTileset>} [list=[]] 
 * @returns {Array.<Cesium3DTileset>}
 */
function getPhotoLayers(primitiveCollection, list = []) {
    primitiveCollection._primitives.forEach(primitive => {
        if (primitive instanceof Cesium3DTileset && primitive.featureType === FeatureType.PHOTO) {
            list.push(primitive);
        } else if (primitive instanceof PrimitiveCollection) {
            list = getPhotoLayers(primitive, list)
        }
    });
    return list;
}

export default PhotoFlattening;