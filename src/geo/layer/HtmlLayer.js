import destroyObject from 'cesium/Core/destroyObject';
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler';
import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType'
import createGuid from 'cesium/Core/createGuid'
import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import DeveloperError from 'cesium/Core/DeveloperError'
import CesiumMath from 'cesium/Core/Math'
import Cartesian3 from 'cesium/Core/Cartesian3'

import { GeoDepository } from "../core/GeoDepository";
import GeoUtil from '../utils/GeoUtil';
import LayerEventType from "../constant/LayerEventType";
import Layer from "./Layer";

/**
 * html图层，创建的是html元素的集合，通过add方法添加私有类HtmlPoint生成单个html元素点标签
 * @constructor
 * @example
 * let geomap = new BOSGeo.GeoMap('bosgeoContainer'); //初始化
 * let htmlLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.HTML, 'HTML')
 */
class HtmlLayer extends Layer {
    constructor (options = {}) {
        super(options);
        this.layers = [];
        this.container = document.createElement('div');
        this.container.className = 'bosgeo-html-layer-collection';
    }

    /**
     * 刷新显示
     * @private
     */
    _onPostRender () {
        let len = this.layers.length;
        if (len === 0) return;
        for (let i = 0; i < len; ++i) {
            this.layers[i].update();
        }
        // debouncedUpdate.apply(this); //刷新监听由监听postRender改至监听viewChange后， htmllayer有定位不准的情况，所以防抖地再微调最后一次
        GeoDepository.geomap.render();
    }

    /**
     * 添加标签
     * @param {Object} options 配置选项
     * @param {String} [options.name] 名称。不设置则为undefined
     * @param {Array<number>} options.position 位置。[longitude, latitude, height]
     * @param {HTMLDocument|String} [options.html] html内容
     * @param {Boolean} [options.show] 是否显示
     * @param {Boolean} [options.autoShow] 是否需要自动在屏幕空间下进出显示隐藏
     * @param {Number} [options.nearFar = [0.0,1000000]] 可见距离范围,默认为[0.0,100000]米。
     * @param {NearFarScalar|Array<Number>} [options.scaleByDistance] 距离缩放配置，[near, nearValue, far, farValue],near-相机近距离，nearValue-近距离时的比例，near-相机远距离，nearValue-远距离时的比例，设置基于相机距离的缩放值，如[0, 1, 1.0e4, 0.0]；
     * @param {Function} [options.onClick] 点击数据图层后的回调函数
     * @param {Function} [options.clickType = 'onclick'] 点击事件类型，左击：'onclick'，左双击：'ondbclick'，默认为左击。
     * @returns {HtmlPoint} Html点标签内部私有类，只能通过HtmlLayer的add方法创建
     * @example
     * let geomap = new BOSGeo.GeoMap('bosgeoContainer'); //初始化
     * let htmlLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.HTML, 'HTML')
     * let p = htmlLayer.add({
            name: "事件撒点2",
            position: position2,
            html:   `<div class='PointContainer2' style="width: 512px; height:256px;">
                        <span class="pointText2">test2</span>
                        <span class="pointIcon2"></span>
                    </div>`,
            // clickType:'ondbclick',
            scaleByDistance: [0, 1, 1000, 0.0],
            onClick: () => {
                console.log('---click---')
            },
        });
     * 
     */
    add (options) {
        if (this.layers.length === 0) { //首次添加
            let updateFunc = throttle(this._onPostRender, 10);
            GeoDepository.scene.postRender.addEventListener(updateFunc, this);
            
            GeoDepository.viewer.container.appendChild(this.container);
        }

        let layer = new HtmlPoint(options);

        this.layers.push(layer);
        this.container.appendChild(layer.container);
        layer.update();
        
        this.fire(LayerEventType.ADD, layer);
        this.fire(LayerEventType.CHANGE);

        return layer;
    }

    /**
     * 移除
     * @param {HtmlPoint} layer Html点标签内部私有类，HtmlLayer的add方法创建的返回值
     * @example
     * let geomap = new BOSGeo.GeoMap('bosgeoContainer'); //初始化
     * let htmlLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.HTML, 'HTML')
     * let p = htmlLayer.add(options);
     * htmlLayer.remove(p);
     */
    remove (layer) {
        let len = this.layers.length;
        for (let i = 0; i < len; ++i) {
            if (this.layers[i].id === layer.id) {
                this.layers.splice(i, 1);
                len--;
                this.fire(LayerEventType.REMOVE, this.layers[i]);
                this.fire(LayerEventType.CHANGE);
                break;
            }
        }
        this.container.removeChild(layer.container);

        if (len === 0) {
            GeoDepository.viewer.camera.changed.removeEventListener(this._onPostRender);
            GeoDepository.viewer.container.removeChild(this.container);
        }
    }

    /**
     * 移除全部
     * @example
     * let geomap = new BOSGeo.GeoMap('bosgeoContainer'); //初始化
     * let htmlLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.HTML, 'HTML')
     * let p = htmlLayer.add(options);
     * htmlLayer.removeAll();
     */
    removeAll () {
        GeoDepository.viewer.camera.changed.removeEventListener(this._onPostRender);

        GeoDepository.viewer.container.removeChild(this.container);

        for (let i = 0, len = this.layers.length; i < len; ++i) {
            let layer = this.layers[i];
            this.container.removeChild(layer.container);
        }
        this.layers = [];
        this.fire(LayerEventType.REMOVE);
        this.fire(LayerEventType.CHANGE);
    }


    /**
     * 销毁
     * @example
     * let geomap = new BOSGeo.GeoMap('bosgeoContainer'); //初始化
     * let htmlLayer = geomap.layerManager.createLayer(BOSGeo.LayerType.HTML, 'HTML')
     * let p = htmlLayer.add(options);
     * htmlLayer.destroy();
     */
    destroy () {
        this.removeAll();
        this._destroyBaseLayer();
        return destroyObject(this);
    }

}



/**
 * html点，该类是内部私有类，只能通过HtmlLayer的add方法进行创建并添加
 * @param {Object} options 配置选项
 * @param {String} [options.name] 名称。不设置则为undefined
 * @param {Array<number>} options.position 位置。[longitude, latitude, height]
 * @param {HTMLDocument|String} [options.html] html内容
 * @param {Boolean} [options.show] 是否显示
 * @param {Boolean} [options.autoShow] 是否需要自动在屏幕空间下进出显示隐藏
 * @param {Number} [options.nearFar = [0.0,1000000]] 可见距离范围,默认为[0.0,100000]米。
 * @param {NearFarScalar|Array<Number>} [options.scaleByDistance] 距离缩放配置，[near, nearValue, far, farValue],near-相机近距离，nearValue-近距离时的比例，near-相机远距离，nearValue-远距离时的比例，设置基于相机距离的缩放值，如[0, 1, 1.0e4, 0.0]；
 * @param {Function} [options.onClick] 点击数据图层后的回调函数
 * @param {Function} [options.clickType = 'onclick'] 点击事件类型，左击：'onclick'，左双击：'ondbclick'，默认为左击。
 * @example
 * let hp = htmlLlayer.add(options);
 * 
 */

 class HtmlPoint {
    constructor (options) {
        options = options || {};

        if (!defined(options.position)) {
            throw new DeveloperError('位置(options.position)是必传参数');
        }

        this.position = options.position;
        this.show = defaultValue(options.show, true);
        this.onClick = options.onClick;
        this.clickType = options.clickType;
        this.type = 'htmlLayer';

        // 是否需要自动在屏幕空间下进出显示隐藏
        this.autoShow = defaultValue(options.autoShow, true);
        // 记录画布最大宽高
        this.maxWidth  = 0;
        this.maxHeight = 0;
        // 记录标牌初始宽高
        this.width = 0;
        this.height = 0;
        this.nearFar = defaultValue(options.nearFar, [0.0, 1000000]);
        if (options.scaleByDistance instanceof Array) this.scaleByDistance = options.scaleByDistance;

        this.container = document.createElement('div');
        this.container.className = 'bosgeo-html-layer';
        this.id = this.container.id = createGuid();
        this.container.innerHTML = options.html;
        if (this.onClick) {
            if(this.clickType === 'ondbclick'){
                this.container.ondblclick = () => this.onClick(this);
            }else{
                this.container.onclick = () => this.onClick(this);
            }
        }
        this._backAngle = CesiumMath.toRadians(75);
    }

    /**
     * 每次渲染时更新位置
     * @private
     */
    update () {
        if (!this.show && !this.autoShow) {
            this.container.style.display = 'none';
            return;
        }
    
        let scene = GeoDepository.scene;
        let position = this.position;
        if (!this.maxWidth) this.maxWidth = GeoDepository.viewer.container.clientWidth;
        if (!this.maxHeight) this.maxHeight = GeoDepository.viewer.container.clientHeight;
        let cartesian = Cartesian3.fromDegrees(position[0], position[1], position[2]);
        let windowCoord = scene.cartesianToCanvasCoordinates(cartesian);
        if (!defined(windowCoord) || !defined(windowCoord.x) || !defined(windowCoord.y)) {
            return;
        }
        let elWidth = this.container.clientWidth / 2 || this.width;
        let elHeight = this.container.clientHeight || this.height;
        if (!this.width && elWidth) this.width = elWidth;
        if (!this.height && elHeight) this.height = elHeight;
        // 标牌距离左右上下的距离
        let left = windowCoord.x - elWidth;
        let top = windowCoord.y - elHeight
        let wGap = windowCoord.x - this.maxWidth;
        let hGap = windowCoord.y - this.maxHeight;
        // 在标牌本身宽度范围内不更新显示
        if ((wGap >= -(elWidth) && wGap <= elWidth) || (hGap > -elHeight && hGap < elHeight)) return;
        if ((left < 0 || wGap > elWidth) || (top < 0 || hGap > elHeight)) {
            this.show = false;
            this.container.style.display = 'none';
            return;
        } else {
            this.show = true;
        }
    
        let camera = GeoDepository.camera;
        let distance = Cartesian3.distance(camera.position, cartesian);
        let radians = Cartesian3.angleBetween(camera.position, cartesian);
        if (distance >  this.nearFar[1] || distance <  this.nearFar[0] || radians > this.backAngle) {
            this.container.style.display = 'none';
            return;
        }
        // TODO 设置htmlLayer随距离的缩小比例
        let scale = 1 ;
        if (this.scaleByDistance instanceof Array && this.scaleByDistance.length ===4 ) {
            if (distance >=  this.scaleByDistance[0] && distance <  this.scaleByDistance[2]){
                scale = distance * (this.scaleByDistance[1]-this.scaleByDistance[3])*1.0/(this.scaleByDistance[0]-this.scaleByDistance[2]) + this.scaleByDistance[1];
            } else {scale = this.scaleByDistance[3];}
        }
        this.container.style.cssText = `
            left: ${left}px;
            top: ${top}px;
            display: true;
            transform:scale(${scale}, ${scale});
        `;
        this.left = left;
        this.top = top;
        GeoDepository.geomap.render();
    }
     
    /**
     * 缩放至标签
     * @example
     * let hp = htmlLlayer.add(options);
     * hp.zoomTo();
     */
    zoomTo () {
        let position = this.position;
        GeoUtil.flyToOffset(position[0], position[1]); 
    }

    /**
     * 设置标签位置
     * @param {Array<Number>} position 经纬度和高度组成的数组
     * @example
     * let hp = htmlLlayer.add(options);
     * hp.setPosition([112, 24, 20]);
     */
    setPosition (position) {
        this.position = position;
        this.update();  // NOTE：注意要更新一下位置，防止页面出现htmlLayer位移的效果
    }
    /**
     * 设置标签显隐
     * @param {Boolean} visible true为显示，false为隐藏 
     * @example
     * let hp = htmlLlayer.add(options);
     * hp.setVisible(true);
     */
    setVisible (visible) {
        this.show = visible;
        this.autoShow = visible;
        if (visible) {
            this.container.style.display = true;
        } else {
            this.container.style.display = 'none';
        }
        this.update();  // NOTE：注意要更新一下位置，防止页面出现htmlLayer位移的效果
    }

}

/**
 * 防抖函数
 * @private
 * @param {function} fn 需要防抖的函数
 * @param {Number} wait 时间间隔
 * @return {function} 被防抖后的函数
 */
 const debounce = function(fn, wait){
    let timeout = null;
    const others = window.onbeforeunload;
    window.onbeforeunload = function (event) {
        if (others) others();
        clearTimeout(timeout);
    };
    return function () {
        if (timeout !== null) clearTimeout(timeout);
        timeout = setTimeout(fn.bind(this), wait);
    }
}
const debouncedUpdate = debounce(function(){
    let len = this.layers.length;
    if (len === 0) return;

    for (let i = 0; i < len; ++i) {
        this.layers[i].update();
    }
},100);

//节流函数
function throttle(fn, wait) {
    let previous = 0;
    return function() {
        let now = Date.now();
        let context = this;
        let args = arguments;
        if (now - previous >= wait) {
            fn.apply(context, args);
            previous = now;
        }
    }
}

export default HtmlLayer;
