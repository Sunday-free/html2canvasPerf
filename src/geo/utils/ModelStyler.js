import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import Color from 'cesium/Core/Color'
import Cesium3DTileStyle from 'cesium/Scene/Cesium3DTileStyle'
import Cesium3DTileFeature from 'cesium/Scene/Cesium3DTileFeature'
import PostProcessStageLibrary from 'cesium/Scene/PostProcessStageLibrary';
import Resource from "cesium/Core/Resource";
import Check from 'cesium/Core/Check';
import DeveloperError from 'cesium/Core/DeveloperError';
import StyleExpression from "cesium/Scene/StyleExpression";

import FeatureType from '../constant/FeatureType';
import { GeoDepository } from '../core/GeoDepository';


/**
 * 模型高亮样式类。可高亮显示被点击的glft、3dTiles模型，设置3dTiles模型的构件样式。
 * @constructor
 * @param {Object} [options] 属性配置
 * @param {String} [options.propertyName='id'] 构件属性名，用来区分构件。默认为：'id',主要针对3dTiles格式的BIM模型。
 * @param {String} [options.highlightColor='#56ebfd'] 模型高亮颜色。默认为'#56ebfd'。
 * @param {Number} [options.opacity=0.7] 不透明度，取值范围[0,1]
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler({
 * 		propertyName: 'id', //构件属性名 		
 * 		highlightColor: '#ff0000', //高亮的颜色
 * });
 */
function ModelStyler(options) {
    options = defaultValue(options, {});
    this._highlightColor = defaultValue(options.highlightColor, '#56ebfd');  //"rgba(86, 235, 253, 1.0)"
    this._propertyName = defaultValue(options.propertyName, 'id');
    this._opacity = options.opacity || 0.7;
    this._style = new Cesium3DTileStyle();

    this._highlightedGltfs = [];    // 保存已高亮的gltf模型
    this._highlightedObjectIds = [];    // 保存已高亮的构件属性值
    this._activeTileset = undefined;

    //保存当前选中的3dtiles模型要素
    this._selectedFeature = {
        feature: undefined,
        originalColor: new Color()
    };

    this._seletcedFeaturesArray = []; // 用于保存构件上色的feature
}

/**
 * 对选中的gltf或3dtiles模型对象进行高亮显示
 * @param {Cartesian2} windowCoord 屏幕坐标
 * @param {Boolean} [highlightComponent=true] 是否高亮构件。默认为true,表示只高亮当前选中的构件;若为false，则表示高亮整个模型,只但模型为3dTiles时有效。
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler(options);
 *  modelStyl.onClick(windowCoord);
 */
ModelStyler.prototype.onClick = function (windowCoord, highlightComponent = true) {
    let pickedObj = GeoDepository.scene.pick(windowCoord);
    if (!defined(pickedObj) || !defined(pickedObj.primitive) || !FeatureType.isModelType(pickedObj.primitive.featureType)) {
        this.resetGltfs();
        this.resetTilesets();
        if (this._selectedFeature.feature) {
            this._selectedFeature.feature.color = this._selectedFeature.originalColor;
            this._selectedFeature.feature = undefined;
        }
        return;
    };

    //被点击的模型为gltf格式         
    // if (defined(pickedObj.id) && pickedObj.id.featureType === FeatureType.GLTF) {
    if (defined(pickedObj.primitive) && pickedObj.primitive.featureType === FeatureType.GLTF) {
        this._activeTileset && this.resetTilesets();

        // let gltf = pickedObj.id;
        let gltf = pickedObj.primitive;
        // 判断是否是高亮状态
        if (gltf.highlighted) return;

        // 先重置。保证每次执行单击时只保留一个高亮模型
        this._highlightedGltfs.length > 0 && this.resetGltfs();
        this.highlightGltf(gltf);
    } // 被点击的模型为3DTiles模型
    else if (defined(pickedObj.primitive) && pickedObj instanceof Cesium3DTileFeature) {
        this._highlightedGltfs.length > 0 && this.resetGltfs();

        //高亮模型构件
        if (highlightComponent) {
            // 点击同一3dTiles时不重复赋值给this._activaTileset
            if (!defined(this._activeTileset)) {
                this._activeTileset = pickedObj.tileset;
                this._selectedFeature.feature = undefined;
            }
            else if (this._activeTileset.id !== pickedObj.tileset.id || (this._selectedFeature.feature && this._selectedFeature.feature.tileset && this._selectedFeature.feature.tileset.id != pickedObj.tileset.id)) {
                // 点击不同的3dTiles模型，或者上一个被选中的3Dtiles的id与当前选中的3DTiles的id不一致
                this.resetTilesets();
                this._activeTileset = pickedObj.tileset;
                this._selectedFeature.feature = undefined;
            }

            if (pickedObj.primitive.featureType === FeatureType.BIM) { //BIM模型，所有同属性构件的颜色作高亮显示
                let propertyVal = pickedObj.getProperty(this._propertyName);
                if (!propertyVal) return;

                // 保证每次执行单击时只保留一个构件的属性值
                let len = this._highlightedObjectIds.length;
                if (len > 0) {//将之前被选中的构件取消高亮
                    ModelStyler.reset3DTilesetColor(this._activeTileset);
                }

                this._highlightedObjectIds[0] = propertyVal;
                this.highlightTileset();
            } else {  //普通3DTiles模型,直接改变当前要素的颜色
                if (this._selectedFeature.feature) {
                    this._selectedFeature.feature.color = this._selectedFeature.originalColor;
                    this._selectedFeature.feature = undefined;
                }

                if (this._selectedFeature.feature == pickedObj) {
                    return;
                }
                this._selectedFeature.feature = pickedObj;
                Color.clone(pickedObj.color, this._selectedFeature.originalColor);
                pickedObj.color = Color.fromCssColorString(this._highlightColor).withAlpha(this._opacity);
                GeoDepository.scene.requestRender();
            }

        } else { //高亮整个模型
            // 点击同一3dTiles时不重复赋值给this._activaTileset
            if (!defined(this._activeTileset)) {
                this._activeTileset = pickedObj.tileset;
                this._selectedFeature.feature = undefined;
            } else if (this._activeTileset.id !== pickedObj.tileset.id ||
                (this._selectedFeature.feature && this._selectedFeature.feature.id != pickedObj.tileset.id)) {
                // 点击不同的3dTiles模型 或者上一个被选中的3Dtiles的id与当前选中的3DTiles的id不一致
                this.resetTilesets();
                this._activeTileset = pickedObj.tileset;
                this._selectedFeature.feature = undefined;
            }

            //判断以前是否选择要素
            if (pickedObj != this._selectedFeature.feature) {
                if (this._selectedFeature.feature != undefined) {
                    //还原前选择要素的本颜色
                    this._selectedFeature.feature.color = this._selectedFeature.originalColor;
                    //将当前选择要素及其颜色添加到this._selectedFeature
                    this._selectedFeature.feature = pickedObj.tileset;
                    this._selectedFeature.originalColor = pickedObj.color;
                }
                //将当前选择要素及其颜色添加到this._selectedFeature
                this._selectedFeature.feature = pickedObj.tileset;
                this._selectedFeature.originalColor = pickedObj.color;

            }
            //将模型变为高亮
            // let style = new BOSGeo.Cesium3DTileStyle({color: {conditions: [['true', "rgba(86, 235, 253, 0.7)"]]}});
            let style = new BOSGeo.Cesium3DTileStyle({ color: { conditions: [['true', "color(\'" + this._highlightColor + "\'," + this._opacity + ")"]] } });//color: {conditions: [['true', "color('cyan', 0.5)"]]}			
            defined(pickedObj.tileset.style) && (style.show = pickedObj.tileset.style.show);
            pickedObj.tileset.style = style;
            GeoDepository.scene.requestRender();
        }
    }
};

/**
 * 给构件上色（该方法可以用ModelStyler.onClick代替）
 * @param {Cartesian2} windowCoord 屏幕坐标
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler(options);
 *  modelStyl.setComponentColor(windowCoord);
 */
ModelStyler.prototype.setComponentColor = function (windowCoord) {
    let pickedObj = GeoDepository.scene.pick(windowCoord);

    // 如果没有点击到模型
    if (!defined(pickedObj) || !defined(pickedObj.primitive) || !FeatureType.isModelType(pickedObj.primitive.featureType)) {
        return;
    };

    if (defined(pickedObj.primitive) && pickedObj.primitive.featureType === FeatureType.GLTF) {
        // 点击gltf格式模型

        let gltf = pickedObj.primitive;
        // 判断是否是高亮状态
        if (gltf.highlighted) return;

        // 先重置。保证每次执行单击时只保留一个高亮模型
        this.highlightGltf(gltf);
        GeoDepository.scene.requestRender();
    } else if (defined(pickedObj.primitive) && pickedObj instanceof Cesium3DTileFeature) {
        // 点击3dtiles格式模型

        // 判断构件是否已被选取过，避免重复选取
        var isContained = false;
        this._seletcedFeaturesArray.forEach(tileFeature => {
            if (tileFeature.pickedObj == pickedObj) {
                isContained = true;
            }
        });
        if (isContained) {
            return;
        }

        this._seletcedFeaturesArray.push({ pickedObj, originalColor: pickedObj.color });
        pickedObj.color = Color.fromCssColorString(this._highlightColor).withAlpha(this._opacity);
        GeoDepository.scene.requestRender();
    }
};


/**
 * 还原构件颜色(该方法需要与setComponentColor配合使用)
 * @param {Cartesian2} windowCoord 屏幕坐标
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler(options);
 *  modelStyl.resetComponentColor(windowCoord);
 */
ModelStyler.prototype.resetComponentColor = function (windowCoord) {
    let pickedObj = GeoDepository.scene.pick(windowCoord);
    // 如果没有点击到模型
    if (!defined(pickedObj) || !defined(pickedObj.primitive) || !FeatureType.isModelType(pickedObj.primitive.featureType)) {
        return;
    };

    if (defined(pickedObj.primitive) && pickedObj.primitive.featureType === FeatureType.GLTF) {
        // 点击gltf格式模型

        let gltf = pickedObj.primitive;
        // 判断是否是高亮状态
        if (gltf.highlighted) {
            this.unHighlightGltf(gltf);
        };
        GeoDepository.scene.requestRender();
    } else if (defined(pickedObj.primitive) && pickedObj instanceof Cesium3DTileFeature) {
        // 点击3dtiles格式模型

        let seletcedFeaturesArray = this._seletcedFeaturesArray;
        let length = seletcedFeaturesArray.length;
        if (length) {
            for (let i = 0; i < length; i++) {
                if (seletcedFeaturesArray[i].pickedObj == pickedObj) {
                    pickedObj.color = seletcedFeaturesArray[i].originalColor;
                    seletcedFeaturesArray.splice(i, 1);
                };
            }
        }

        GeoDepository.scene.requestRender();
    }
}


/**
 * ctrl + click点击高亮效果
 * 
 * （无实际用途，可以用ModelStyler.onClick代替，建议从后续版本中删除）
 * @ignore
 * @param {Cartesian2} windowCoord 屏幕坐标
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler(options);
 *  modelStyl.onCtrlClick(windowCoord);
 */
ModelStyler.prototype.onCtrlClick = function (windowCoord) {
    let pickedObj = GeoDepository.scene.pick(windowCoord);
    if (!defined(pickedObj) || !defined(pickedObj.primitive) || !FeatureType.isModelType(pickedObj.primitive.featureType)) return;

    // if (defined(pickedObj.id) && defined(pickedObj.id.model)) {
    if (defined(pickedObj.primitive) && pickedObj.primitive.featureType === FeatureType.GLTF) {
        // 点击gltf格式的模型

        // 点击不同类型的模型
        this._activeTileset && this.resetTilesets();

        // let gltf = pickedObj.id;
        let gltf = pickedObj.primitive;
        // 判断是否是高亮状态
        if (gltf.highlighted) {
            this.unHighlightGltf(gltf);
            return;
        }
        this.highlightGltf(gltf);
    } else if (pickedObj instanceof Cesium3DTileFeature && pickedObj.primitive.featureType !== FeatureType.PHOTO) {
        // 点击3dtiles格式模型（不包含倾斜摄影）

        // 点击不同类型的模型
        this._highlightedGltfs.length > 0 && this.resetGltfs();

        // 点击同一3dTiles时不重复赋值给this._activaTileset
        if (!defined(this._activeTileset)) {
            this._activeTileset = pickedObj.tileset;
        } else if (this._activeTileset.id !== pickedObj.tileset.id) {
            // 点击不同的3dTiles模型
            this.resetTilesets();
            this._activeTileset = pickedObj.tileset;
        }
        let propertyVal = pickedObj.getProperty(this._propertyName);
        if (!propertyVal) return;

        let ids = this._highlightedObjectIds;
        let isInSelectedList = false;
        for (let i = 0, len = ids.length; i < len; i++) {
            if (ids[i] === propertyVal) {
                ids.splice(i, 1);
                isInSelectedList = true;
                break;
            }
        }
        if (!isInSelectedList) {
            this._highlightedObjectIds.push(propertyVal);
        }

        this.highlightTileset();
    }
};

/**
 * 高亮gltf模型
 * @param {Object} gltf  gltf模型
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler(options);
 *  modelStyl.highlightGltf(gltf);
 */
ModelStyler.prototype.highlightGltf = function (gltf) {
    // gltf.model.color = Color.fromCssColorString(this._highlightColor).withAlpha(0.5);
    gltf.color = Color.fromCssColorString(this._highlightColor).withAlpha(this._opacity);
    gltf.highlighted = true;    // 添加自定义状态属性
    GeoDepository.scene.requestRender();
    gltf.colorBlendAmount = 1;
    this._highlightedGltfs.push(gltf);
};


/**
 * 高亮3DTiles模型中指定属性字段的对象
 * @private
 */
ModelStyler.prototype.highlightTileset = function () {
    let hColorStr = 'color("' + this._highlightColor + '", ' + this._opacity + ')';
    let conditions = [];

    for (let i = 0, len = this._highlightedObjectIds.length; i < len; i++) {
        let id = this._highlightedObjectIds[i];
        let condition;
        if (typeof id === 'number') {
            condition = ['${' + this._propertyName + '}===' + id, hColorStr];
        } else if (typeof id === 'string') {
            condition = ['${' + this._propertyName + '}==="' + id + '"', hColorStr];
        }
        conditions.push(condition);
    }
    conditions.push(['true', 'color("white")']);
    this._style.color = { conditions: conditions };
    // defined(this._activeTileset.style) &&  (this._style.show = this._activeTileset.style.show);
    this._activeTileset.style = this._style;

    GeoDepository.scene.requestRender();
};

/**
 * 设置3dtiles的颜色（十六进制字符串）和透明度
 * @param {3DTileset} tileset  3dtiles模型
 * @param {Number} [opacity=0.7] 不透明度，取值范围[0,1]
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler(options);
 *  modelStyl.setTilesetColorWithAlpha(tileset, opacity);
 */
ModelStyler.prototype.setTilesetColorWithAlpha = function (tileset, opacity) {
    opacity ? opacity : (opacity = this._opacity);
    let hColorStr = 'color("' + this._highlightColor + '",' + opacity + ')';
    const style = new Cesium3DTileStyle({
        color: hColorStr
    });
    defined(tileset.style) && (style.show = tileset.style.show);
    tileset.unselectStyle = tileset.style = style
    GeoDepository.scene.requestRender();
};

/**
 * 针对BIM模型。根据楼层id数组显示该楼层，隐藏其他楼层
 * @param {Array} ids id数组
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler(options);
 *  modelStyl.showByIds(ids);
 */
ModelStyler.prototype.showByIds = function (ids) {
    this.reset(); // 点击楼层重置高亮元素
    let conditions = [];
    for (let i = 0; i < ids.length; i++) {
        let propertyVal = ids[i];
        if (typeof propertyVal === 'number') {
            conditions.push(['${' + this._propertyName + '}===' + propertyVal, 'true']);
        } else if (typeof propertyVal === 'string') {
            conditions.push(['${' + this._propertyName + '}==="' + propertyVal + '"', 'true']);
        }
    }
    conditions.push(['true', 'false']);
    this._style.show = { conditions: conditions };
    this._activeTileset.style && (this._style.color = this._activeTileset.style.color);
    this._activeTileset && (this._activeTileset.style = this._style);
    GeoDepository.scene.requestRender();
};

/**
 * 取消高亮gltf模型
 * @param {Object} gltf  gltf模型
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler(options);
 *  modelStyl.unHighlightGltf(gltf);
 */
ModelStyler.prototype.unHighlightGltf = function (gltf) {
    // gltf.model.color = new Color(1, 1, 1, 1);
    gltf.color = new Color(1, 1, 1, 1);
    gltf.highlighted = false;
    // debugger
    GeoDepository.scene.requestRender();

    let gltfs = this._highlightedGltfs;
    for (let i = 0; i < gltfs.length; ++i) {
        if (gltfs[i].id === gltf.id) {
            gltfs.splice(i, 1);
            break;
        }
    }
};

/**
 * 重置Gltfs模型集合的高亮效果
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler(options);
 *  modelStyl.resetGltfs();
 */
ModelStyler.prototype.resetGltfs = function () {
    let gltfs = this._highlightedGltfs;
    for (let i = 0; i < gltfs.length; ++i) {
        let gltf = gltfs[i];
        // gltf.model.color = new Color(1, 1, 1, 1);
        gltf.color = new Color(1, 1, 1, 1);
        gltf.highlighted = false;
    }
    this._highlightedGltfs = [];
    GeoDepository.scene.requestRender();
};

/**
 * 重置3dTilesets模型集合的高亮效果并取消被选中状态
 * @example
 *  let modelStyl = new BOSGeo.ModelStyler(options);
 *  modelStyl.resetTilesets();
 */
ModelStyler.prototype.resetTilesets = function () {
    if (this._activeTileset) {
        /* this._style.color = 'color("white")';
        this._activeTileset.style && (this._style.show = this._activeTileset.style.show);
        this._activeTileset.style = this._style;
        GeoDepository.scene.requestRender(); */
        ModelStyler.reset3DTilesetColor(this._activeTileset);

        this._activeTileset = undefined;
    }
    this._highlightedObjectIds = [];
};

/**
 * 重置3DTiles模型的样式为原始状态
 * @param {Cesium3DTileset} tileset 3DTiles模型对象
 * @example
 * 	let layer  =geomap.layerManager.getLayer(BOSGeo.LayerType.MODEL,"model123");
 * 	BOSGeo.ModelStyler.reset3DTilesetColor(layer.getModelByName("testBIM12"));
 */
ModelStyler.reset3DTilesetColor = function (tileset) {
    let conditions = [];
    conditions.push(["true", `rgba(255.0,255.0,255.0, 1.0)`]);//conditions.push(['true', 'color("white")']);
    tileset.style = new Cesium3DTileStyle({
        color: {
            conditions: conditions,
        },
    });
    GeoDepository.scene.requestRender();
}

/**
 * 设置模型不透明度
 * @param {Primitive|Cesium3DTileset} model 模型对象
 * @param {Number} [opacity=1.0] 不透明度，默认1.0
 * @example
 *  BOSGeo.ModelStyler.setOpacity(model,opacity = 1.0);
 */
ModelStyler.setOpacity = function (model, opacity = 1.0) {
    Check.typeOf.number.greaterThanOrEquals('opacity', opacity, 0);
    Check.typeOf.number.lessThanOrEquals('opacity', opacity, 1);
    if (defined(model.featureType)) {
        const { GLTF, TILES, POINTCLOUD, BIM, PHOTO, WHITE_MODEL } = FeatureType;
        const tiles = [TILES, POINTCLOUD, BIM, PHOTO, WHITE_MODEL];
        if (model.featureType === GLTF) {
            model.color.alpha = opacity;
        } else if (tiles.includes(model.featureType)) {
            //  该方法容易替换已有样式
            const style = new Cesium3DTileStyle({
                color:
                {
                    conditions: [
                        // ["${swapFeature} == 'false'", 'rgba(${red}, ${green}, ${blue},' + '0' + ')'],
                        ['true', 'rgba(${red}, ${green}, ${blue},' + opacity + ')']
                    ]
                }
                // show : {
                //     conditions: [
                //         // [['${swapFeature} == false', 'false'],
                //         ['false', 'false'],
                //         ['true', 'true']
                //         ]
                // }
            });
            defined(model.style) && (style.show = model.style.show);
            model.unselectStyle = model.style = style
            // let setOpacity =(tile)=> {
            //     let content = tile.content;
            //     let featuresLength = content.featuresLength;
            //     for (let i = 0; i < featuresLength; i+=2) {
            //         content.getFeature(i).color && (content.getFeature(i).color = content.getFeature(i).color.withAlpha(Number(opacity)) );
            //     }
            // }
            // setOpacity.tileVisibleType ='tileVisible'
            // // //清除之前的事件,避免闪现
            // // for(let k=0;k < model.tileVisible._listeners.length;k++){
            // //     'tileVisible' ===model.tileVisible._listeners[k].tileVisibleType && (model.tileVisible.removeEventListener(model.tileVisible._listeners[k]) );
            // // }
            // model.tileVisible.addEventListener(setOpacity);
            model.opacity = opacity;
        } else {
            throw new DeveloperError('ModelStyler.setOpacity: 请传入正确的参数！')
        }
    }

    GeoDepository.scene.requestRender();
}

/**
 * 将白模模型设置为渐变色
 * @param {Primitive} model 模型对象
 * @param {Array<String>} [transColorRange=['#fff','#fff']] 渐变色范围，默认范围['#f44bff','#698aa6']
 * @param {String} [topColor='#fff'] 顶部颜色
 * @param {Array<Number>} [transHeightRange] 可选，模型渐变高度范围
 * @example
 * 
 * let geoViewer = new BOSGeo.GeoMap('container');
 * let layerManager = geoViewer.layerManager;
 * let modelLayer = layerManager.createModelLayer('模型图层test');
 * let myModel = modelLayer.add({
 *  name: 'test',
 *  url: 'https://lab.earthsdk.com/model/3610c2b0d08411eab7a4adf1d6568ff7/tileset.json',
 *  featureType: BOSGeo.FeatureType.WHITE_MODEL
 * })
 * transColorRange = ['#fff200', '#00ffcb'];
 * topColor = '#fb00ff'
 * //设置渐变色
 * BOSGeo.ModelStyler.setTransColorRange(myModel,transColorRange,topColor)
 */
ModelStyler.setTransColorRange = function (model, transColorRange = ['#fff', '#fff'], topColor = '#fff', transHeightRange) {
    if (!model || model.featureType != FeatureType.WHITE_MODEL) {
        console.error('ModelStyler.setTransColorRange: 本函数需接收白模模型[BOSGeo.FeatureType.WHITE_MODEL]！');
        return;
    }
    this.tsZScale = model._modifyOptions && model._modifyOptions.scale && model._modifyOptions.scale.length > 2 ? model._modifyOptions.scale[2] : 1.0;
    if (transHeightRange) transHeightRange = transHeightRange.map(h => h.toFixed(2));
    model.readyPromise.then((ts) => {
        //若从未设置过渐变
        if (ts._transColorRange == undefined) {
            ts._transColorRange = transColorRange.join(',');
            ts._transHeightRange = transHeightRange && transHeightRange.join(',');
            ts._topColor = topColor;
            ts.zScale = this.tsZScale; //Number(tsZScale) < 15 ? 1.0/ Number(tsZScale) *0.86 <0.28 ? 0.28: 1.0/ Number(tsZScale) *0.86 : 1.5/ Number(tsZScale)+0.1 ;
            // const xScale = tile._tileset && tile._tileset._modifyOptions && tile._tileset._modifyOptions.scale && tile._tileset._modifyOptions.scale.length>2 ? 1.0/ Number(tile._tileset._modifyOptions.scale[0]) *0.05 : 0.05 ;
            // const yScale = tile._tileset && tile._tileset._modifyOptions && tile._tileset._modifyOptions.scale && tile._tileset._modifyOptions.scale.length>2 ? 1.0/ Number(tile._tileset._modifyOptions.scale[1]) *0.05: 0.05 ;

            ts.styleFlag = `${ts._transColorRange}_${ts._transHeightRange}_${ts._topColor}`;
            // const changeColor =(tile) => {
            //确保即使多次调用该函数，而以下监听只注册一次
            ts.tileVisible.addEventListener((tile) => {
                this.zScale = tile._tileset && tile._tileset._modifyOptions && tile._tileset._modifyOptions.scale && tile._tileset._modifyOptions.scale.length > 2 ? tile._tileset._modifyOptions.scale[2] : 1.0;
                tile.zScale = this.zScale;
                // const xScale = tile._tileset && tile._tileset._modifyOptions && tile._tileset._modifyOptions.scale && tile._tileset._modifyOptions.scale.length>2 ? 1.0/ Number(tile._tileset._modifyOptions.scale[0]) *0.05 : 0.05 ;
                // const yScale = tile._tileset && tile._tileset._modifyOptions && tile._tileset._modifyOptions.scale && tile._tileset._modifyOptions.scale.length>2 ? 1.0/ Number(tile._tileset._modifyOptions.scale[1]) *0.05: 0.05 ;

                if (ts.styleFlag === tile.styleFlag && ts.zScale === tile.zScale) return;
                tile.styleFlag = ts.styleFlag;
                ts.zScale = tile.zScale;
                tile.nmzScale = Number(this.zScale) < 15 ? 1.0 / Number(this.zScale) * 0.86 < 0.28 && this.zScale > 3 ? 0.28 : 0.299 : 1.5 / Number(this.zScale) + 0.1;
                const _transColorRange = ts._transColorRange && ts._transColorRange.split(',');
                const _transHeightRange = ts._transHeightRange && ts._transHeightRange.split(',');

                const _topColor = ts._topColor || '#fff';
                const itopColor = Color.fromCssColorString(_topColor);
                topColor = [itopColor.red.toFixed(8), itopColor.green.toFixed(8), itopColor.blue.toFixed(8)].join(',');

                const content = tile.content;
                const featuresLength = content.featuresLength;
                if (featuresLength) {
                    const glslForFragment = {
                        'v_positionEC': '',
                        'v_pos': '',
                    };
                    const glslForVex = {
                        'v_positionEC': '',
                        'v_pos': '',
                    };
                    //若存在渐变色值
                    if (_transColorRange) {
                        var transRange_c = _transColorRange.map(v => {
                            var c = Color.fromCssColorString(v);
                            c = [c.red.toFixed(8), c.green.toFixed(8), c.blue.toFixed(8)]
                            return c
                        });

                        if (_transHeightRange) {

                            var c_range = [0, 1, 2].map(i => (transRange_c[1][i] - transRange_c[0][i]).toFixed(8));
                            var h_range = (_transHeightRange[1] - _transHeightRange[0]).toFixed(2);
                            Object.keys(glslForFragment).forEach((k) => {
                                glslForFragment[k] = `/* 渐变效果: start ${ts.styleFlag}*/
                  vec3 normalMC = normalize(czm_inverseNormal3D * ng);
                  // 可以修改的参数
                  if(normalMC.z > float(${tile.nmzScale})){ 
                    baseColor = vec3(${topColor});
                    }else{
                        float _heightRange = ${h_range}; 
                        vec4 _colorBase = vec4(${transRange_c[0]},1.0); 
                        // 建筑基础色
                        float vtxf_min = v_positionMC.z - ${_transHeightRange[0]};
                        float vtxf_max = v_positionMC.z - ${_transHeightRange[1]};
                        if(vtxf_max>0.0){
                          baseColor = vec3(${transRange_c[1].join(',')});
                        }else{
                          if(vtxf_min<0.0){
                            baseColor = vec3(${transRange_c[0].join(',')});
                          }else{
                            float vtxf_p = vtxf_min / _heightRange;
                            baseColor = vec3(vtxf_p*${c_range[0]}+_colorBase.x,vtxf_p*${c_range[1]}+_colorBase.y,vtxf_p*${c_range[2]}+_colorBase.z);
                          }
                        }
                  }
                   /* 渐变效果: end*/`;
                            })

                        } else {
                            transRange_c = transRange_c.map(c => {
                                return `${c.join(',')}`
                            });
                            Object.keys(glslForFragment).forEach((k) => {
                                glslForFragment[k] = ` /* 渐变效果: start ${ts.styleFlag}*/
                                 
                  vec3 normalMC = normalize(czm_inverseNormal3D * ng);
                  if(normalMC.z > float(${tile.nmzScale})){
                    baseColor = vec3(${topColor});
                    }else{
                        baseColor = v_color;
                    }
                    /* 渐变效果: end*/`;
                            })
                            Object.keys(glslForVex).forEach((k) => {
                                glslForVex[k] = `
                  /* 渐变效果: start ${ts.styleFlag}*/
                  if(v_positionMC.z >  1.5){
                      v_color =vec3(${transRange_c[1]});
                  }else{
                      v_color =vec3(${transRange_c[0]});
                  }
                    /* 渐变效果: end*/
                  } `;
                            })
                        }
                    }

                    for (let i = 0; i < featuresLength; i += 2) {
                        const feature = content.getFeature(i);
                        const _model = feature.content._model;
                        if (_model && _model._sourcePrograms && _model._rendererResources) {
                            Object.keys(_model._sourcePrograms).forEach((key) => {
                                const program = _model._sourcePrograms[key];
                                if (_model._rendererResources.sourceShaders[program.fragmentShader].indexOf(`渐变效果: start ${ts.styleFlag}`) + 1) {
                                    return;
                                }

                                this.fragmentShader1 = _model._rendererResources.sourceShaders[program.fragmentShader].replace(/\/\* 渐变效果: start[\s\S]*?渐变效果: end\*\/*/g, '');
                                this.vertexShader1 = _model._rendererResources.sourceShaders[program.vertexShader].replace(/\/\* 渐变效果: start[\s\S]*?渐变效果: end\*\/*/g, '');

                                if (ts._transColorRange) {

                                    var vPosition = ''
                                    if (this.fragmentShader1.indexOf(' v_positionEC;') !== -1) {
                                        vPosition = 'v_positionEC'
                                    } else if (this.fragmentShader1.indexOf(' v_pos;') !== -1) {
                                        vPosition = 'v_pos'
                                    }

                                    if (_transHeightRange) {
                                        this.fragmentShader1 = this.fragmentShader1.replace('vec3 baseColor = baseColorWithAlpha.rgb;',
                                            'vec3 baseColor = baseColorWithAlpha.rgb;' + glslForFragment[vPosition]);

                                    } else {

                                        this.vertexShader1 = this.vertexShader1.substr(0, this.vertexShader1.length - 2);
                                        //变色范围
                                        this.vertexShader1 = this.vertexShader1.replace('void main(void)',
                                            ` /* 渐变效果: start ${ts.styleFlag}*/
                            varying vec3 v_color;
                            /* 渐变效果: end*/
                            void main(void)
                            `);
                                        this.fragmentShader1 = this.fragmentShader1.replace('void main(void)',
                                            `/* 渐变效果: start ${ts.styleFlag}*/
                            varying vec3 v_color;
                            /* 渐变效果: end*/
                            void main(void)`);

                                        this.fragmentShader1 = this.fragmentShader1.replace('vec3 baseColor = baseColorWithAlpha.rgb;',
                                            'vec3 baseColor = baseColorWithAlpha.rgb;' + glslForFragment[vPosition]);

                                        this.vertexShader1 += glslForVex[vPosition];
                                    }
                                }

                                _model._rendererResources.sourceShaders[program.fragmentShader] = this.fragmentShader1;
                                _model._rendererResources.sourceShaders[program.vertexShader] = this.vertexShader1;

                            })
                            _model._shouldRegenerateShaders = true;
                        }
                    }
                }
            })
            // changeColor.setColorType = 'changeColor'
            // //清除之前的事件,避免闪现
            // for(let k=0;k < ts.tileVisible._listeners.length;k++){
            //     'changeColor' ===ts.tileVisible._listeners[k].setColorType && (ts.tileVisible.removeEventListener(ts.tileVisible._listeners[k]) , _model._shouldRegenerateShaders = false);
            // }
            // //确保即使多次调用该函数，而以下监听只注册一次
            // ts.tileVisible.addEventListener(changeColor)
        } else {
            ts.zScale = this.tsZScale;  //Number(tsZScale) < 15 ? 1.0/ Number(tsZScale) *0.86 <0.28 ? 0.28: 1.0/ Number(tsZScale) *0.86 : 1.5/ Number(tsZScale)+0.1 ;
            ts._transColorRange = transColorRange.join(',');
            ts._transHeightRange = transHeightRange && transHeightRange.join(',');
            ts._topColor = topColor;
            ts.styleFlag = `${ts._transColorRange}_${ts._transHeightRange}_${ts._topColor}`;
        }
        GeoDepository.scene.requestRender();
    })
}

/**
 * 取消白模模型渐变色设置
 * @param {Primitive} model 模型对象
 * @example
 *  BOSGeo.ModelStyler.clearTransColorRange(model);
 */
ModelStyler.clearTransColorRange = function (model) {
    if (model._transColorRange == undefined) return;
    model._transColorRange = null;
    GeoDepository.scene.requestRender();
}

/**
 * 外轮廓选中效果
 * @param {Primitive} feature 点击模型获取到的feature,若不传入，则取消当前外轮廓选中
 * @param {Object} options  外轮廓效果可选项
 * @param {String} [options.color = '#fff000'] 颜色,默认为'#fff000'
 * @param {Number} [options.width = 0.9] 宽度，取值范围[0,1]
 * @param {Number} [options.opacity = 1.0] 不透明度，取值范围[0,1]
 * @example
 *  //选中
    map.on(BOSGeo.MapEventType.LEFT_CLICK, (e)=>{
        if(e.feature){
            BOSGeo.ModelStyler.silhouetteSelectEffectForFeature(e.feature);
        }
    }, [BOSGeo.MapPickType.FEATURE]);
 */
ModelStyler.silhouetteSelectEffectForFeature = function (feature, options = { color: '#fff000', width: 0.9, opacity: 1.0, highlight: false }) {
	//ToDo：highlight参数是不是可以删除掉？显示外轮廓没必要对整个对象进行高亮吧？
    if (PostProcessStageLibrary.isSilhouetteSupported(GeoDepository.scene)) {

        if (!ModelStyler._silhouetteSelectEffect) {
            ModelStyler._silhouetteSelectEffect = PostProcessStageLibrary.createEdgeDetectionStage();
            const ef = ModelStyler._silhouetteSelectEffect;
            ef.uniforms.color = Color.fromCssColorString('#fff000');
            ef.uniforms.length = 0.01
            ef.selected = [];
            ModelStyler.silhouette = GeoDepository.scene.postProcessStages.add(
                PostProcessStageLibrary.createSilhouetteStage([ef])
            );
        };
        let s_effect = ModelStyler._silhouetteSelectEffect;

        const lastFeature = s_effect.selected[0];
        //清除上一次选中
        if (lastFeature) {
            if (lastFeature.featureType == FeatureType.GLTF) {
                lastFeature.silhouetteColor = lastFeature._originSilhouetteColor;
                lastFeature.silhouetteSize = 0.0;
            }else if (lastFeature.tileset) {					
				!options.highlight && (defined(lastFeature.tileset.opacity) && (lastFeature.color = lastFeature.color.withAlpha(lastFeature.tileset.opacity)));
				if (options.highlight) {
					defined(lastFeature.originalColor) && (lastFeature.color = lastFeature.originalColor);
					defined(lastFeature.tileset.opacity) && (lastFeature.color = lastFeature.originalColor.withAlpha(lastFeature.tileset.opacity));
				}
			}
            s_effect.selected = [];
        }

        //新增这一次选中
        if (feature) {
            let ifeature = {}, originalColor;
            const model = feature.tileset || feature.primitive;
            if(!options.highlight){
				feature.originalColor = feature.color;
				feature.color && (feature.color = feature.color.withAlpha(1));
			}
            options.highlight && (
                originalColor = { ...feature.color },
                ifeature.originalColor = new Color(originalColor.red, originalColor.green, originalColor.blue, originalColor.alpha),
                feature.originalColor = ifeature.originalColor,
                feature.color = Color.fromCssColorString(options.color).withAlpha(1))
            if (model && defined(model.featureType)) {
                options.color && (s_effect.uniforms.color = Color.fromCssColorString(options.color));
                defined(options.opacity) && (s_effect.uniforms.color = s_effect.uniforms.color.withAlpha(options.opacity));
                if (options.width) {
                    if ((options.width < 0) || ((options.width > 1))) throw new Error("宽度范围为0至1!");
                    //length 真实显式宽度指变化不为线性，所以进行调整
                    let w;
                    if (options.width > 0.5) {
                        w = 0.1 - options.width / 10;
                        // let opacity = defined(model.opacity) ? Number(model.opacity) :1 ;
                        // defined(opacity) && (w = Number(opacity)*Number(opacity) * w)
                        s_effect.uniforms.length = w || 0.0001;
                    } else {
                        s_effect.uniforms.length = options.width || 0.99;
                    }

                };

                //新增这一次选中
                if (model.featureType === FeatureType.GLTF) {
                    if (!feature.primitive._originSilhouetteColor) feature.primitive._originSilhouetteColor = feature.primitive.silhouetteColor;
                    model.silhouetteSize = options.width ? options.width * 10 : 5;
                    model.silhouetteColor = s_effect.uniforms.color;
                    s_effect.selected = [model];
                } else if (defined(model.featureType)) {
                    s_effect.selected = [feature];
                };
            }

        }
    } else console.warn('当前环境不支持轮廓高亮效果！');
    GeoDepository.scene.requestRender();
}


/**
 * 设置Cesium3DTileset的图片(贴图)
 * @param {Cesium3DTileset} tileset 3DTiles模型对象(3DTiles模型需已存在图片纹理)
 * @param {String} imagePath 贴图图片地址，图片最大不应超过30kb。
 * @param {Number} textureIndex 要替换的模型纹理的索引值,一般侧面为0，顶面为1。
 * @example
    BOSGeo.ModelStyler.setTilesetImage(model1, imagePath, 0)
 */
ModelStyler.setTilesetImage = function (tileset, imagePath, textureIndex) {
	Resource.fetchImage({
		url: imagePath
	}).then(function (image) {
		let setImageEvent = (tile) => {
			let content = tile.content
			let featuresLength = content.featuresLength
			for (let i = 0; i < featuresLength; i += 2) {
				let feature = content.getFeature(i)
				let model = feature.content._model
				// feature.color = BOSGeo.Color.fromRandom();
				if (model && model._sourcePrograms && model._rendererResources) {
					const program = model._sourcePrograms[0]
					if (!program && Object.keys(model._rendererResources.sourceShaders).length === 0) return
					// const fragmentShader = model._rendererResources.sourceShaders[program.fragmentShader]
					// const  vertexShader = model._rendererResources.sourceShaders[program.vertexShader]

					let textureIndexToReplace = defaultValue(textureIndex, 0);
					let textures = model._rendererResources.textures;
					// let samplers  = model._rendererResources.samplers;
					// let oldSampler = samplers[textureIndexToReplace];
					let oldTexture = textures[textureIndexToReplace];
					if (oldTexture) { //已有图片纹理
						//输入图片尺寸匹配已有纹理图片的尺寸，保持一致大小
						image.width = oldTexture.width
						image.height = oldTexture.height
						oldTexture.copyFrom(image);
						oldTexture.generateMipmap(); // Also replaces textures in mipmap
					}
				}
			}
		}
		setImageEvent.textureIndex = textureIndex;
		//清除之前的事件,避免闪现
		for (let k = 0; k < tileset.tileVisible._listeners.length; k++) {
			textureIndex === tileset.tileVisible._listeners[k].textureIndex && tileset.tileVisible.removeEventListener(tileset.tileVisible._listeners[k])
		}
		tileset.tileVisible.addEventListener(setImageEvent)
		GeoDepository.scene.requestRender();
	});
};
	
/**
 * 设置Cesium3DTileset的颜色
 * @param {Cesium3DTileset} tileset 3DTileset
 * @param {String} color 如'color("red")'表示设置所有要素为红色
 * @example
 *  BOSGeo.ModelStyler.setTilesetColor(tileset, color);
 */
ModelStyler.setTilesetColor = function (tileset, color) {
    const style = new Cesium3DTileStyle({
        color: color
    });
    defined(tileset.style) && (style.show = tileset.style.show);
    tileset.unselectStyle = tileset.style = style;
    GeoDepository.scene.requestRender();
};

/**
 * 设置3DTiles 颜色样式(只修改颜色样式，不影响已有的显隐样式)
 * @private
 * 
 * @param {Cesium3DTileset} tileset 3DTiles模型对象
 * @param {StyleExpression} colorStyle 
 */
ModelStyler.setTilesetColorStyle = function (tileset, colorStyle) {
    const style = new Cesium3DTileStyle();
    style.show = defined(tileset.style) ? tileset.style.show : undefined;
    style.color = colorStyle;
    tileset.style = style;
    GeoDepository.scene.requestRender();
}

/**
 * 根据属性值设置3DTiles 颜色样式(只修改颜色样式，不影响已有的显隐样式)
 * @param {Cesium3DTileset} tileset 3DTiles模型对象
 * @param {Array.<Array.<String>|Array.<Number>, Color>} colorOptions 要素属性keyValues与对应颜色的键值对，[[keyValues1, Color1], [keyValues2, Color2]]
 * @param {String} [key='key'] 要素属性key
 * @param {Color} [defaultColor=BOSGEO.Color.WHITE] 条件以外的要素颜色值
 * 
 * @example
 * //Example 1. 设置BIM模型中type类型为‘屋顶’和‘墙’的颜色为红色，'门'和'窗'的颜色为绿色
 * //添加模型
	let modelLayer = layerManager.createLayer(BOSGeo.LayerType.MODEL, 'model123',{customGroupId:'model'});  //创建模型图层
	let testBIMModel = modelLayer.add({
		name: 'testBIM123',    //模型名称
		url:"http://bosgeo.boswinner.com/geoData/models/3DTiles/BIM_G1598257565598/tileset.json",
		featureType: BOSGeo.FeatureType.BIM,    //模型类型，包括BOSGeo.FeatureType.GLTF, FeatureType.TILES, FeatureType.BIM,FeatureType.PHOTO和FeatureType.POINTCLOUD
		position:[114.054437,22.551279,100],       //模型位置
	});
	modelLayer.zoomTo(testBIMModel); //缩放至模型
 * BOSGeo.ModelStyler.setTilesetColorByKey(tileset, [ [['屋顶', '墙'], BOSGeo.Color.RED.withAlpha(0.3)], [['门', '窗'], BOSGeo.Color.BLUE] ], 'type');
 * @example
 * //Example 2. 设置BIM模型中构件key值为"M1611818399552_140056"和"M1611818399552_111931"的构件为指定颜色
	//添加的模型和过程同上一个示例
	let keyV1 = "M1611818399552_140056",keyV2="M1611818399552_111931";
	let color = BOSGeo.Color.fromCssColorString("#56ebfd");
	BOSGeo.ModelStyler.setTilesetColorByKey(testBIMModel,[[[keyV1,keyV2],color]],'key');
 */
ModelStyler.setTilesetColorByKey = function (tileset, colorOptions, key = 'key', defaultColor = Color.WHITE) {
    if (!defined(colorOptions) || colorOptions.length < 0) {
        throw new DeveloperError('GeoUtil.setTilesetColorByKey--colorOptions颜色键值对参数不合法!');
    }
    let conditions = [];

    let colorOption, colorStr;
    for (let i = 0, len = colorOptions.length; i < len; i++) {
        colorOption = colorOptions[i];
        if (!defined(colorOption) || colorOption.length < 2 || colorOption[0].length < 0 || !(colorOption[1] instanceof Color)) {
            throw new DeveloperError(`GeoUtil.setTilesetColorByKey--colorOptions颜色键值第个${i + 1}值不合法!`);
        }
        colorStr = colorOption[1].toCssColorString();
        switch (typeof colorOption[0][0]) {
            case 'string':
                colorOption[0].forEach((value) => conditions.push(["${" + key + `} === '${value}'`, colorStr]));
                break;
            case 'number':
                colorOption[0].forEach((value) => conditions.push(["${" + key + `} === ${value}`, colorStr]));
                break;
        }
    }
    if (!(defaultColor instanceof Color)) {
        throw new DeveloperError('GeoUtil.setTilesetColorByKey--defaultColor类型不对!');
    }
    conditions.push(['true', defaultColor.toCssColorString()]);
    this.setTilesetColorStyle(tileset, { conditions });
}

/**
 * 设置3DTiles显隐样式(只修改显隐样式，不影响已有的颜色样式)
 * @private
 * 
 * @param {Cesium3DTileset} tileset 3DTiles模型对象
 * @param {StyleExpression} showStyle 
 * 
 * @see StyleExpression
 * @augments showStyle 不能直接写StyleExpression，会报错
 */
ModelStyler.setTilesetShowStyle = function (tileset, showStyle) {
    const style = new BOSGeo.Cesium3DTileStyle();
    style.color = defined(tileset.style) ? tileset.style.color : undefined;
    style.show = showStyle;
    tileset.style = style;
    GeoDepository.scene.requestRender();
}

/**
 * 根据属性值设置3DTiles 显隐样式(只修改显隐样式，不影响已有的颜色样式)
 * @param {Cesium3DTileset} tileset 3DTiles模型对象
 * @param {Array.<String>|Array.<Number>} values 要素属性值列表keyValue
 * @param {String} [key='key'] 要素属性key
 * @param {Boolean} [isShow=true] 满足属性keyValue在values列表的显隐
 * 
 * @example 
 * // tileset为模型图层对象，数据地址可参考'http://bos3d-alpha.bimwinner.com/api/z71e26c47d1646c6baf0d7c07aa70e2b/geomodels/G1628646692115/data/tileset.json'
 * BOSGeo.ModelStyler.setTilesetShowByKey(tileset, ['窗', '墙'], 'type', false);
 */
ModelStyler.setTilesetShowByKey = function (tileset, values = [], key = 'key', isShow = true) {
    if (!defined(values) || values.length < 0) {
        throw new DeveloperError('GeoUtil.setTilesetShowByKey--values参数不合法!');
    }
    let conditions = [];
    switch (typeof values[0]) {
        case 'string':
            conditions = values.map((value) => ["${" + key + `} === '${value}'`, `${isShow}`]);
            break;
        case 'number':
            conditions = values.map((value) => ["${" + key + `} === ${value}`, `${isShow}`]);
            break;
    }
    conditions.push(['true', `${!isShow}`]);

    this.setTilesetShowStyle(tileset, { conditions });
}

/**
 * 更新3DTiles样式 （颜色样式和显隐样式）
 * 
 * @param {Cesium3DTileset} tileset 3DTiles模型对象
 * @param {Object} styleOptions 包含以下参数的Object对象:
 * @param {StyleExpression} styleOptions.colorStyle 颜色样式
 * @param {StyleExpression} styleOptions.showStyle 显隐样式
 * 
 * @example
 * BOSGeo.ModelStyler.updateTilesetStyle(tileset, {
 *    colorStyle: {
 *        conditions: [
 *            ["${type} === '窗'", 'rgba(255,0,0,1)'],
 *            ['true', 'rgba(255,255,255,1)']
 *        ]
 *    },
 *    showStyle: {
 *        conditions: [
 *            ["${type} === '墙'", 'false'],
 *            ['true', `true`]
 *         ]
 *    }
 * });
 */
ModelStyler.updateTilesetStyle = function (tileset, styleOptions = {}) {
    const { color, show } = tileset.style || {};
    const { colorStyle = color, showStyle = show } = styleOptions;
    const style = new BOSGeo.Cesium3DTileStyle();
    style.color = colorStyle;
    style.show = showStyle;
    tileset.style = style;
    GeoDepository.scene.requestRender();
}

export { ModelStyler }
