import createGuid from "cesium/Core/createGuid";
import SceneTransforms from "cesium/Scene/SceneTransforms";
import DeveloperError from "cesium/Core/DeveloperError";
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartesian2 from "cesium/Core/Cartesian2";
import defaultValue from "cesium/Core/defaultValue";
import destroyObject from "cesium/Core/destroyObject";
import EllipsoidalOccluder from "cesium/Core/EllipsoidalOccluder";
import Ellipsoid from "cesium/Core/Ellipsoid";

import { GeoDepository } from "../core/GeoDepository";

/**
 * 自定义标签类
 * @alias LabelPlot
 * @private
 * @class
 * @param {Object} options 包含以下参数的对象：
 * @param {String} [options.id]  标签id
 * @param {Cartesian3} [options.position]  标签位置,不传入则报错
 * @param {Cartesian2} [options.pixelOffset]  标签位置在屏幕坐标上的偏移，默认0 0
 * @param {String} [options.text]  标签内容，默认''
 * @param {Boolean} [options.show]  标签显示，默认显示
 * @param {Object} [options.style] 标签样式 包含以下参数的对象：
 * @param {String} [options.style.color]  标签文字颜色
 * @param {String} [options.style.fontFamily]  标签文字类型
 * @param {String} [options.style.fontSize]  标签文字大小
 * @param {Boolean} [options.style.showBackground]  是否显示标签背景
 * @param {String} [options.style.backgroundColor]  标签背景颜色
 */
class LabelPlot {
    constructor(options) {
        this.viewer = GeoDepository.viewer; //弹窗创建的viewer
        const { position,pixelOffset = new Cartesian2(0,0), text = "", show = true, style } = options;

        if (!options || !options.position) {
            throw new DeveloperError("缺少构造参数!");
        }

        this._position = position;
        this._pixelOffset = pixelOffset;
        this._text = text;
        this._show = show;
        this._style = style;
        this.id = defaultValue(options["id"], createGuid());

        this.createEl(style);
        // this.lastLeft = 0;
        // this.lastTop = 0;

        try {
            this._render();
            this.viewer.scene.postUpdate.addEventListener(this._render, this);
        } catch (e) {}
    }

    get position() {
        return this._position;
    }

    /**
     * 更新位置
     * @param {Cartesian3} position
     */
    set position(position) {
        this._position = position;
    }

    get text() {
        return this._text;
    }

    /**
     * 更新标签文字
     * @param {String} text
     */
    set text(text) {
        this._text = text;
        this.div.innerText = this._text;
    }

    get show() {
        return this._show;
    }

    /**
     * 更新标签显示隐藏
     * @param {Boolean} show
     */
    set show(show) {
        this._show = show;
        show ? (this.div.style.display = "block") : (this.div.style.display = "none");
    }

    /**
     * 设置标签的样式
     * @param {Object} [style] 标签样式 包含以下参数的对象：
     * @param {String} [style.color]  标签文字颜色
     * @param {String} [style.fontFamily]  标签文字类型
     * @param {String} [style.fontSize]  标签文字大小
     * @param {Boolean} [style.showBackground]  是否显示标签背景
     * @param {String} [style.backgroundColor]  标签背景颜色
     */
    setStyle(style) {
        this._style = style;
        const { color = "white", fontFamily = "Microsoft Yahei", fontSize = "12px", showBackground = true, backgroundColor = "black" } = style;
        this.div.style.color = color;
        this.div.style.fontSize = fontSize;
        this.div.style.fontFamily = fontFamily;
        if (showBackground) {
            this.div.style.backgroundColor = backgroundColor;
        }
    }

    /**
     * @private
     * 重新渲染标签位置
     */
    _render() {
        // 如果被隐藏（show控制）
        if (!this._show) return;
        // 如果div被隐藏（camera.positionCartographic.height控制）
        // if(this.div.style.display==="none")
        //计算屏幕坐标
        let position = SceneTransforms.wgs84ToWindowCoordinates(this.viewer.scene, this._position);
        if (position) {
            let left = position.x - this.div.offsetWidth / 2 + this._pixelOffset.x;
            let top = position.y - this.div.offsetHeight + this._pixelOffset.y;
            // 判断是否超出屏幕 --- 超出不更新
            // let cameraOccluder = new EllipsoidalOccluder(Ellipsoid.WGS84, this.viewer.camera.position);
            // let viewerVisible = cameraOccluder.isPointVisible(this._position);
            // if(!viewerVisible) return

            // 防止不操作时更新
            // if (this.lastLeft  === left && this.lastTop === top) return;
            // this.lastLeft = left;
            // this.lastTop = top;

            this.div.style.left = left + "px";
            this.div.style.top = top + "px";
            //摄像头高度超过一定值，标签隐藏
            let cameraHeight = this.viewer.camera.positionCartographic.height;
            if (cameraHeight > 50000) {
                this.div.style.display = "none";
            } else {
                this.div.style.display = "block";
            }
        }
    }

    /**
     * 生成标签
     * @private
     */
    createEl(style) {
        this.div = document.createElement("div");
        this.div.className = "bosgeo-LabelPlot-container";
        this.div.id = this.id;
        if (style) {
            this.setStyle(this._style);
        }
        this.div.innerHTML = this.text;
        /*屏蔽鼠标右键的默认事件*/
        this.div.oncontextmenu = function(){
            return false;
        };
        /*屏蔽按空格键是滚动条向下滚动*/    
        this.div.onkeydown = function(ev){
            var e = ev||event;
            if(e.keyCode == 32){
                return false;
            }
        }
        this.viewer.container.appendChild(this.div);
    }

    /**
     * 关闭当前标签
     */
    destroy() {
        this.viewer.scene.postUpdate.removeEventListener(this._render, this);
        this.viewer.container.removeChild(this.div);
        return destroyObject(this);
    }
}

export default LabelPlot;
