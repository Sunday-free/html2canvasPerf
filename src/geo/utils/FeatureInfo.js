import Cesium3DTileFeature from 'cesium/Scene/Cesium3DTileFeature'
import Entity from 'cesium/DataSources/Entity.js'
import Cartesian2 from '../../../cesium/Source/Core/Cartesian2';
import FeatureType from "../constant/FeatureType";
import { GeoDepository } from "../core/GeoDepository";
import GeoUtil from "../utils/GeoUtil";

/**
 * 显示被点击实体的属性信息，包括标记、BIM模型等。
 * 标记弹框会一直跟随标记显示在标记上方，模型信息弹框则显示在鼠标点击的地方
 * @class FeatureInfo
 * @param {Event} event 事件
 * @param {Object} [options] 属性配置 
 * @param {Boolean} options.showAttribute 显示属性信息
 * @example
 *  let info = new BOSGeo.FeatureInfo(event, options);
 */
class FeatureInfo {
    constructor(event, options) {
        this.options = options || {};
        this.position = undefined;
        this.markAttribute = undefined;
        this.bimAttribute = undefined;
        this.attributeData = undefined;
        this.buttomClick = undefined;
        this.showAttribute = options.showAttribute; // showAttribute为false不创建feature-info-panel元素
        this.show = false;
        this.showTitle = true;
        this.billboardID = undefined; // 图标id
        this.changeImage = ''; // 改变后的图片
        this.flyTo = true;
        this.originImage = ''; // 原始图片路径
        this.collection = undefined; // 图层管理集合

        this._featureClick = event;

        this.featureNames = {
            marker: {},
            bim: {}
        }

        this.scene = GeoDepository.scene;
        this.viewer = GeoDepository.viewer;

        // let self = this;

        this.infoPanel = null;
        this.panelContent = null;
        this.title = null;
        this.button = null;

        if (this.showAttribute) {
            this.infoPanel = document.createElement('div');
            this.infoPanel.className = 'feature-info-panel';
            this.viewer.container.appendChild(this.infoPanel);

            let close = document.createElement('div');
            close.className = 'bosgeo-close';
            close.innerHTML = '<span class="window-close"></span>';
            this.infoPanel.appendChild(close);

            this.title = document.createElement('div');
            this.title.className = 'title';
            this.title.innerHTML = '';
            this.infoPanel.appendChild(this.title);

            let arrow = document.createElement('div');
            arrow.className = 'arrow';
            this.infoPanel.appendChild(arrow);

            this.panelContent = document.createElement('div');
            this.panelContent.className = 'content';
            this.infoPanel.appendChild(this.panelContent);

            this.button = document.createElement('div');
            this.button.className = 'link-button';
            this.infoPanel.appendChild(this.button);

            this.button.addEventListener('click', () => {
                this.buttomClick && this.buttomClick();
            });

            close.addEventListener('click', () => this.reset());
        }
    }

    /**
     * 恢复初始状态
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.reset();
     */
    reset() {
        this.position = undefined;
        this.attributeData = undefined;
        this.markAttribute = undefined;
        this.bimAttribute = undefined;
        this.show = false;
        this.scene.requestRender();
        this.hide()
    }

    /**
     * 全局点击事件监听，点击模型和实体对象后显示属性信息
     * @param {Cartesian2} windowCoord 屏幕坐标
     * @returns {Object} 属性信息对象
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.onClick(windowCoord);
     */
    onClick(windowCoord) {
        let pick = this.scene.pick(windowCoord);
        if (!pick || (!pick.primitive && !pick.id)) {
            this.reset();
            return;
        }

        let attributes = null
        let primitive = pick.primitive || {};
        let id = pick.id || {};
        if (primitive.featureType === FeatureType.POINT || primitive.featureType === FeatureType.ICON || primitive.featureType === FeatureType.TEXT) {
            // 点击城市部件标记时使相机飞到指定位置
            let cartesian = primitive.position;
            let location = GeoUtil.cartesianToArray(cartesian);
            this.attributeData = primitive.attribute;
            this.flyTo && GeoUtil.flyTo(this.viewer.camera, location[0], location[1], location[2] + 50);
            if (primitive.featureType === FeatureType.ICON) {
                if (this.changeImage) {
                    if (!this.originImage) this.originImage = primitive.image;
                    this.resetBillboard();
                    primitive.image = this.changeImage;
                }
                this.billboardID = primitive.id;
            }
            attributes = this.showMarkInfoPanel(cartesian, primitive.featureType, primitive);
        }

        else if (primitive.featureType === FeatureType.TILES) {
            attributes = this.showBimInfoPanel(pick, windowCoord);
        } else if (primitive.featureType === FeatureType.BIM) {
            attributes = this.showBimInfoPanel(pick, windowCoord);
        } else if (primitive.featureType === FeatureType.WHITE_MODEL) {
            attributes = this.showWhiteModelInfoPanel(pick, windowCoord);
        } else if (primitive.featureType === FeatureType.GLTF || id.featureType === FeatureType.GLTF) {
            let model = primitive.featureType ? primitive : id;
            attributes = this.showShellInfoPanel(model, windowCoord);
        } else if (primitive.featureType === FeatureType.PIPLE) {
            attributes = this.showPipleInfoPanel(pick, windowCoord);
        }

        else if (id.featureType === FeatureType.POINT || id.featureType === FeatureType.ICON) {
            let cartesian = id.position._value;
            let location = GeoUtil.cartesianToArray(cartesian);
            this.attributeData = id.attribute
            this.flyTo && GeoUtil.flyTo(location[0], location[1], location[2] + 50);
            attributes = this.showMarkInfoPanel(cartesian, primitive.featureType, id);
        } else if (id.featureType === FeatureType.POLYGON) {
            this.attributeData = id.attribute;
            attributes = this.showEntityPanel(windowCoord, FeatureType.POLYGON, id);
        } else if (id.featureType === FeatureType.ENTITY) {
            this.attributeData = id.attribute;
            attributes = this.showEntityPanel(windowCoord, FeatureType.ENTITY, id);
        }
        else {
            // console.log(id)
            if (id && (id instanceof Entity)) {
                this.attributeData = id.attribute;
                attributes = this.showEntityPanel(windowCoord, FeatureType.ENTITY, id);
            } else if (primitive) {
                let cartesian = primitive.position;
                if(pick instanceof Cesium3DTileFeature){
                    attributes = this.showBimInfoPanel(pick, windowCoord);
                }else{
                    this.attributeData = primitive.attribute;
                    attributes = this.showPrimitiveInfoPanel(windowCoord, primitive.featureType, primitive);
                }
            }

            // this.reset();
        }

        return attributes;
    };

    /**
     * 全局事件监听，更新属性列表中的内容
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.onPostRender();
     */
    onPostRender() {
        if (this.position && this.show) {
            let windowCoord = this.scene.cartesianToCanvasCoordinates(this.position);
            if (!windowCoord) return;
            this.infoPanel.style.display = 'block';
            this.infoPanel.style.left = windowCoord.x - this.infoPanel.clientWidth / 2 + 'px';
            this.infoPanel.style.top = windowCoord.y - this.infoPanel.clientHeight - 35 + 'px';
        } else {
            this.hide();
        }
    };

    /**
     * 显示图标信息
     * @param {Cartesian3} position 三维笛卡尔坐标
     * @param {FeatureType} type 对象类型
     * @param {Object} entity entity对象
     * @returns {Object} 图标信息
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.showMarkInfoPanel(position, type, entity);
     */
    showMarkInfoPanel(position, type, entity) {
        if (!this.attributeData) {
            entity.attributeData && (this.attributeData = entity.attributeData)
            if (entity && entity._properties && entity._properties._propertyNames) {
                this.attributeData = {}
                for (let i = 0; i < entity._properties._propertyNames.length; i++) {
                    this.attributeData[entity._properties._propertyNames[i]] = entity._properties[entity._properties._propertyNames[i]]
                }
            }
        }
        if (!this.attributeData && !this.markAttribute) return;
        this._featureClick.raiseEvent(this.attributeData, position, type);
        let attributes = this.markAttribute || this.attributeData;
        if (!this.showAttribute) return attributes;
        if (!this.markAttribute) {
            let html = '';
            this.title.innerHTML = '标记信息';
            html += '<table class="table table-bordered" border="0" cellpadding="0" cellspacing="0"><tr><td>属性名</td><td>属性值</td></tr>';
            for (let name in attributes) {
                if (attributes.hasOwnProperty(name)) {
                    let relateName = this.featureNames.marker[name] ? this.featureNames.marker[name] : name;
                    html += `<tr><td>${relateName}</td><td>${attributes[name]}</td></tr>`;
                }
            }
            html += '</table>';
            this.panelContent.innerHTML = html;
        }
        this.position = position;
        this.show = true;
        this.markAttribute = undefined;
        this.scene.requestRender();
        return attributes;
    };
    /**
     * 显示primitive信息
     * @param {Cartesian2} windowCoord 二维屏幕坐标
     * @param {Cartesian3} position 三维笛卡尔坐标
     * @param {FeatureType} type 对象类型
     * @param {Object} primitive Primitive对象
     * @returns {Object} primitive信息
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.showPrimitiveInfoPanel(position, type, primitive);
     */
    showPrimitiveInfoPanel(windowCoord, type, primitive) {
        if (!this.attributeData) {
            if (primitive && primitive._properties && primitive._properties._propertyNames) {
                this.attributeData = {}
                for (let i = 0; i < primitive._properties._propertyNames.length; i++) {
                    this.attributeData[primitive._properties._propertyNames[i]] = primitive._properties[primitive._properties._propertyNames[i]]
                }
            }
        }
        if (!this.attributeData){
            this.reset();
            return ;
        }
        this._featureClick.raiseEvent(this.attributeData, windowCoord, type);
        let attributes = this.attributeData;
        if (!this.showAttribute) return attributes;
        let html = '';
        this.title.innerHTML = '属性信息';
        html += '<table class="table table-bordered" border="0" cellpadding="0" cellspacing="0"><tr><td>属性名</td><td>属性值</td></tr>';
        if (typeof attributes === 'string') {
            let attra = attributes.split(',');
            for (let i = 0; i < attra.length; i++) {
                let subattr = attra[i].split(':');
                html += `<tr><td>${subattr[0]}</td><td>${subattr[1]}</td></tr>`;
            }
        } else {
            for (let name in attributes) {
                if (attributes.hasOwnProperty(name)) {
                    html += `<tr><td>${name}</td><td>${attributes[name]}</td></tr>`;
                }
            }
        }

        html += '</table>';
        this.panelContent.innerHTML = html;
        this.position = this.scene.pickPosition(windowCoord);
        this.show = true;
        this.scene.requestRender();
        return attributes
    };

    /**
     * 显示primitive信息
     * @param {Cartesian2} windowCoord 二维屏幕坐标
     * @param {FeatureType} type 对象类型
     * @param {Object} entity entity对象
     * @returns {*} 属性信息
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.showEntityPanel(windowCoord, type, entity);
     */
    showEntityPanel(windowCoord, type, entity) {
        if (!this.attributeData) {
            if (entity && entity._properties && entity._properties._propertyNames) {
                this.attributeData = {}
                for (let i = 0; i < entity._properties._propertyNames.length; i++) {
                    this.attributeData[entity._properties._propertyNames[i]] = entity._properties[entity._properties._propertyNames[i]]
                }
            }
        }
        if (!this.attributeData) return;
        this._featureClick.raiseEvent(this.attributeData, windowCoord, type);
        let attributes = this.attributeData;
        if (!this.showAttribute) return attributes;
        let html = '';
        this.title.innerHTML = '属性信息';
        html += '<table class="table table-bordered" border="0" cellpadding="0" cellspacing="0"><tr><td>属性名</td><td>属性值</td></tr>';
        if (typeof attributes === 'string') {
            let attra = attributes.split(',');
            for (let i = 0; i < attra.length; i++) {
                let subattr = attra[i].split(':');
                html += `<tr><td>${subattr[0]}</td><td>${subattr[1]}</td></tr>`;
            }
        } else {
            for (let name in attributes) {
                if (attributes.hasOwnProperty(name)) {
                    html += `<tr><td>${name}</td><td>${attributes[name]}</td></tr>`;
                }
            }
        }

        html += '</table>';
        this.panelContent.innerHTML = html;
        this.position = this.scene.pickPosition(windowCoord);
        this.show = true;
        this.scene.requestRender();
        return attributes
    }
    /**
     * 显示BIM模型信息
     * @param {Object} feature 被选中的模型要素
     * @param {Cartesian2} windowCoord 二维屏幕坐标
     * @returns {String} 模型信息
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.showBimInfoPanel(feature, windowCoord);     
     */
    showBimInfoPanel(feature, windowCoord) {
        // feature.show = false; // 隐藏构建
        if (!(feature instanceof Cesium3DTileFeature)) {
            this.reset();
            console.warn('Pick up object is not 3DTileFeature!');
            return;
        }
        // 位置
        let position = this.scene.pickPosition(windowCoord);
        let attributes = this.bimAttribute || feature.getProperty('attribute');
        // 获取属性
        let propertyNames = feature.getPropertyNames();
        let property = {
            position: position,
            windowCoord: windowCoord
        };

        for (let i = 0; i < propertyNames.length; i++) {
            property[propertyNames[i]] = feature.getProperty(propertyNames[i]);
        }

        attributes = typeof this.bimAttribute === 'string' ? this.bimAttribute ? JSON.parse(this.bimAttribute) : this.bimAttribute : this.bimAttribute || attributes ? JSON.parse(attributes) : attributes;
        // 添加类型标识
        Object.prototype.toString.call(attributes) === '[object Object]' ? attributes.type = FeatureType.TILES : property.type = FeatureType.TILES;
        attributes ? this._featureClick.raiseEvent(attributes, feature.tileset.customData, property) : this._featureClick.raiseEvent(property, feature.tileset.customData);
        !attributes && (attributes = property , delete attributes.position ,delete attributes.windowCoord)
        // property.id && (attributes.id = property.id);
        // property.name && (attributes.name = property.name);
        // property.key && (attributes.key = property.key);
        // property.projectId && (attributes.projectId = property.projectId);
        attributes = attributes ? attributes:{} ;
        for (let i = 0; i < propertyNames.length; i++) {
            propertyNames[i] !=='attribute' && (attributes[propertyNames[i]] = feature.getProperty(propertyNames[i]));
        }
        // property.windowCoord && (attributes.windowCoord=property.windowCoord);
        // property.position && (attributes.position=property.position);

        if (!this.showAttribute) return attributes;
        if (attributes) {
            // 如果是通过BOS后台解析过的模型，则显示解析后的构件属性信息
            if (!this.bimAttribute) {
                let that = this;
                let html = '';
                this.title.innerHTML = '属性信息';
                html += '<table class="table table-bordered" border="0" cellpadding="0" cellspacing="0"><tr><td>属性名</td><td>属性值</td></tr>';
                (function parseData(data) {
                    for (let propertyName in data) {
                        if (data.hasOwnProperty(propertyName)) {
                            let propertyVal = data[propertyName];
                            if (typeof propertyVal === 'object') {
                                parseData(propertyVal);
                            } else {
                                let relateName = that.featureNames.bim[propertyName] ? that.featureNames.bim[propertyName] : propertyName;
                                html += `<tr><td>${relateName}</td><td>${propertyVal}</td></tr>`;
                            }
                        }
                    }
                })(attributes);
                html += '</table>';
                this.panelContent.innerHTML = html;
            }
            this.position = position;
            this.show = true;
            this.scene.requestRender();
        } else {
            // 显示原本的属性信息
            this.showTilesInfoPanel(feature, position);
        }
        this.bimAttribute = undefined;

        return attributes;
    };

    /**
     * 显示管网信息
     * @param {Cartesian2} windowCoord 二维屏幕坐标 
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.showPipleInfoPanel(windowCoord); 
     */
    showPipleInfoPanel(windowCoord) {
        // let propertyNames = feature.getPropertyNames();
        // let propertyName, propertyVal;
        // for (let i = 0; i < propertyNames.length; i++) {
        //     propertyName = propertyNames[i];
        //     propertyVal = feature.getProperty(propertyName);
        // }
        // 如果是通过BOS后台解析过的模型，则显示解析后的构件属性信息
        if (!this.showAttribute) return
        let html = '';
        this.title.innerHTML = '管网信息';
        html += '<table class="table table-bordered" border="0" cellpadding="0" cellspacing="0"><tr><td>属性名</td><td>属性值</td></tr>';
        html += `
        <tr><td>名称</td><td>地下管线</td></tr>
        <tr><td>类型</td><td>污水管线</td></tr>
        <tr><td>经度</td><td>113.102333</td></tr>
        <tr><td>纬度</td><td>23.029505</td></tr>
        <tr><td>高度</td><td>-10</td></tr>
        `;
        html += '</table>';
        this.panelContent.innerHTML = html;
        this.position = this.scene.pickPosition(windowCoord);
        this.show = true;
        this.scene.requestRender();
    };

    /**
     * 显示3DTiles模型属性信息
     * @param {Object} feature 被选中的模型要素
     * @param {Cartesian2} windowCoord 二维屏幕坐标 
     * @returns {Object} 模型属性信息
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.showTilesInfoPanel(feature, windowCoord); 
     */
    showTilesInfoPanel(feature, windowCoord) {
        let attr = {};
        let html = '';
        html += '<table class="table table-bordered" border="0" cellpadding="0" cellspacing="0"><tr><td>属性名</td><td>属性值</td></tr>';
        let propertyNames = feature.getPropertyNames();
        let propertyName, propertyVal;
        for (let i = 0; i < propertyNames.length; i++) {
            propertyName = propertyNames[i];
            propertyVal = feature.getProperty(propertyName);
            if (!attr.hasOwnProperty(propertyName)) {
                attr[propertyName] = propertyVal
            }
            html += `<tr><td>${propertyName}</td><td>${propertyVal}</td></tr>`;
        }
        html += '</table>';
        this._featureClick.raiseEvent(attr);
        if (!this.showAttribute) return attr
        this.title.innerHTML = '构件信息';
        this.panelContent.innerHTML = html;
        this.position = this.scene.pickPosition(windowCoord);
        this.show = true;
        this.scene.requestRender();
        return attr;
    };

    /**
     * gltf点击触发函数
     * @param {Object} primitive 被选中的模型要素
     * @param {Cartesian2} windowCoord 二维屏幕坐标 
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.showShellInfoPanel(primitive, windowCoord); 
     */
    showShellInfoPanel(primitive, windowCoord) {
        if (!windowCoord) return;
        // 保存点击位置的坐标
        let position = this.scene.pickPosition(windowCoord);
        let customData = primitive.customData || {};
        customData.windowPos = position;
        this._featureClick.raiseEvent(customData, windowCoord, primitive.featureType);
    }

    /**
     * 显示白模属性信息
     * @param {Object} feature 被选中的模型要素
     * @param {Cartesian2} windowCoord 二维屏幕坐标 
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.showWhiteModelInfoPanel(feature, windowCoord); 
     */
    showWhiteModelInfoPanel(feature, windowCoord) {
        this.showTilesInfoPanel(feature, windowCoord);
    };

    /**
     * 隐藏信息框
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.hide(); 
     */
    hide() {
        if (this.infoPanel) this.infoPanel.style.display = 'none';
    }

    /**
     * 关闭信息框
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.close(); 
     */
    close() {
        let close = document.getElementsByClassName('bosgeo-close')
        if (close) {
            close.onclick = function () {
                this.hide()
            }
        }
    }
    /**
     * 设置中英文名称对应
     * @param {FeatureType} type 模型或实体类型
     * @param {Object} table 表格
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.setFeatureName(type, table); 
     */
    setFeatureName(type, table) {
        switch (type) {
            case 'mark':
                this.featureNames.marker = table;
                break;
            case 'bim':
                this.featureNames.bim = table;
                break;
            default:
                break;
        }
    }
    /**
     * 设置按钮文字和点击事件
     * @param {String}  val 文本内容
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.setText(val); 
     */
    setText(val) {
        if (this.button) this.button.innerText = val;
    }
    /**
     * 传入文字和按钮点击事件
     * @param {String}  val 文本内容
     * @param {CallableFunction} callback 回调函数
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.setClick(text, callback); 
     */
    setClick(text, callback) {
        if (this.button) this.button.innerHTML = text;
        this.buttomClick = callback;
    }
    /**
     * 设置图标url
     * @param {Object} collection 图标集合
     * @param {URL} url 连接地址
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.setCollectionUrl(collection, url); 
     */
    setCollectionUrl(collection, url) {
        this.collection = collection;
        this.changeImage = url;
    }
    /**
     * 重置选中的图标
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.resetBillboard(); 
     */
    resetBillboard() {
        if (!this.collection) return;
        let layers = this.collection.layers;
        for (let i = 0; i < layers.length; i++) {
            let icon = layers[i].feature.icon;
            if (!icon) continue;
            if (icon.id === this.billboardID) {
                icon.image = this.originImage;
            }
        }
    }

    /**
     * 设置点击是否飞行 
     * @param {Boolean} val 是否飞行,默认为true
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.flyToFeature(val); 
     */
    flyToFeature(val) {
        this.flyTo = !!val
    }

    /**
     * 重新制定飞行角度
    * @param {Number} longitude 经度
    * @param {Number} latitude 纬度
    * @param {Number} height 相机高度
    * @param {Object} orientation  方位，{heading,pitch,roll}，分别代表偏航角、俯仰角、翻滚角，单位为度，
    *                              取值范围分别为-180≤heading≤180、-90≤pitch≤90、-180≤roll≤180
    * @param {Function} complete 相机停止移动之后的回调函数
    * @example
    * let info = new BOSGeo.FeatureInfo(event, options);
    * info.setFlyto(longitude, latitude, height, orientation, complete); 
    */
    setFlyto(longitude, latitude, height, orientation, complete) {
        this.viewer.camera.cancelFlight();
        orientation ? GeoUtil.viewFix(this.viewer.camera, longitude, latitude, height, orientation, complete) : GeoUtil.flyTo(longitude, latitude, height);
    }
    /**
     * 重置信息框内容
     * @param {Array} attributes 属性数组
     * @param {String} type 模型类型，[mark, bim]
     * @example
     * let info = new BOSGeo.FeatureInfo(event, options);
     * info.setContent(attributes, type); 
     */
    setContent(attributes, type) {
        if (!this.title || !this.panelContent) return;
        if (type === 'mark') {
            this.markAttribute = attributes
            let html = '';
            this.title.innerHTML = '标记信息';
            html += '<table class="table table-bordered" border="0" cellpadding="0" cellspacing="0"><tr><td>属性名</td><td>属性值</td></tr>';
            for (let name in attributes) {
                if (attributes.hasOwnProperty(name)) {
                    let relateName = this.featureNames.marker[name] ? this.featureNames.marker[name] : name;
                    html += `<tr><td>${relateName}</td><td>${attributes[name]}</td></tr>`;
                }
            }
            html += '</table>';
            this.panelContent.innerHTML = html;
        } else if (type === 'bim') {
            this.bimAttribute = attributes
            let html = '';
            this.title.innerHTML = '构件信息';
            html += '<table class="table table-bordered" border="0" cellpadding="0" cellspacing="0"><tr><td>属性名</td><td>属性值</td></tr>';
            (function parseData(data) {
                for (let propertyName in data) {
                    if (data.hasOwnProperty(propertyName)) {
                        let propertyVal = data[propertyName];
                        if (typeof propertyVal === 'object') {
                            parseData(propertyVal);
                        } else {
                            let relateName = this.featureNames.bim[propertyName] ? this.featureNames.bim[propertyName] : propertyName;
                            html += `<tr><td>${relateName}</td><td>${propertyVal}</td></tr>`;
                        }
                    }
                }
            })(attributes);
            html += '</table>';
            this.panelContent.innerHTML = html;
        }
    }
}

export default FeatureInfo;