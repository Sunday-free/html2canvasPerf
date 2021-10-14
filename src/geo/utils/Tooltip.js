import Cartesian2 from 'cesium/Core/Cartesian2';
import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType';
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler';
import destroyObject from 'cesium/Core/destroyObject';
import Check from 'cesium/Core/Check';
import createGuid from 'cesium/Core/createGuid';
import DeveloperError from 'cesium/Core/DeveloperError';

import { GeoDepository } from '../core/GeoDepository';

class Tooltip {
    /**
     * 提示框
     * @constructor
     * @alias Tooltip
     * 
     * @param {Object} [options={}] 提示框配置参数
     * @param {Number} [options.fontSize=13] 字体大小
     * @param {String} [options.fontColor='rgba(255, 255, 255, 1)'] 字体颜色
     * @param {Cartesian2} [options.fontOffset=new BOSGeo.Cartesian2(8, 8)] 字体以左上角为原点的偏移量，横向为x，竖向为y，单位为像素
     * @param {String} [options.backgroundColor='rgba(0, 0, 0, 0.7)'] 背景色 
     * @param {Cartesian2} [options.offset=new BOSGeo.Cartesian2(10, 0)] 位置以左上角为原点的偏移量，横向为x，竖向为y，单位为像素
     * @param {Boolean} [options.show=true] 是否显示提示框
     * 
     * @example
     * var tooltip = new BOSGeo.Tooltip();
     */
    constructor(options = {}) {
        const {
            fontSize = 13,
            fontColor = 'rgba(255, 255, 255, 1)',
            fontOffset = new Cartesian2(8, 8),
            backgroundColor = 'rgba(0, 0, 0, 0.7)',
            offset = new Cartesian2(10, 0),
            show = true,
            id = createGuid(),
        } = options;

        if (document.getElementById(id)) {
            throw new DeveloperError(`id: ${id}已存在!`);
        }

        this._fontSize = fontSize;
        this._fontColor = fontColor;
        this._fontOffset = fontOffset;
        this._backgroundColor = backgroundColor;
        this._offset = offset;

        this._show = show;
        this._message = '';

        this.viewer = GeoDepository.viewer;

        /**
         * 提示框id
         * @property {String} id
         * @readonly
         * @default Globe_TOOLTIP_ID
         */
        this.id = id;

        /**
         * 是否已激活
         * @property {Boolean} isActivated
         * @readonly 
         */
        this.isActivated = false;

        // // 创建鼠标提示div
        // this._addTooltipDom();

        // 绑定事件
        this.handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        this.handler.setInputAction((movement) => {
            this.setTooltipPosition(movement.endPosition)
        }, ScreenSpaceEventType.MOUSE_MOVE);
    }

    /**
     * 激活提示框
     */
    active() {
        if (!this.tooltipDom) {
            // 创建鼠标提示div
            this._addTooltipDom();
            this.isActivated =  this.tooltipDom !== undefined;
        }
    }

    /**
     * 添加提示框DOM
     * 
     * @private
     * 
     */
    _addTooltipDom() {
        const { id, _show, _fontOffset, _fontColor, _backgroundColor, _fontSize, _message } = this;
        const tooltipDiv = document.createElement('div');
        tooltipDiv.id = id;
        tooltipDiv.setAttribute("class", 'bosgeo-tooltip'); 
        // tooltipDiv.style.position = 'absolute';
        tooltipDiv.style.display = _show ? '' : 'none';
        tooltipDiv.style.fontSize = _fontSize + 'px';
        this.viewer.container.append(tooltipDiv);
        this.tooltipDom = tooltipDiv;

        const leftArrowDiv = document.createElement('div');
        leftArrowDiv.id = id + '-leftArrow';
        leftArrowDiv.setAttribute("class", 'bosgeo-tooltip-arrow bosgeo-tooltip-rightArrow'); 
        tooltipDiv.append(leftArrowDiv);

        const innerDiv = document.createElement('div');
        innerDiv.id = id + '-inner';
        innerDiv.setAttribute("class", 'bosgeo-tooltip-inner'); 
        innerDiv.style.padding = `${_fontOffset.x}px ${_fontOffset.y}px`;
        innerDiv.style.borderRadius = '2px';
        innerDiv.style.color = _fontColor;
        innerDiv.style.backgroundColor = _backgroundColor;
        innerDiv.innerHTML = _message;
        tooltipDiv.append(innerDiv);
        this.innerTooltip = innerDiv;
        return tooltipDiv;
    }

    /**
     * 字体大小
     * @property {Number} fontSize
     * @default 13
     */
    get fontSize() {
        return this._fontSize;
    }
    set fontSize(value) {
        Check.typeOf.number("value", value);
        if (this._fontSize !== value) {
            this._fontSize = value;
            this.tooltipDom && (this.tooltipDom.style.fontSize = value + 'px');
        }
    }

    /**
     * 字体颜色
     * @property {String} fontColor
     * @default 'rgba(255, 255, 255, 1)'
     */
    get fontColor() {
        return this._fontColor;
    }
    set fontColor(value) {
        Check.typeOf.string("value", value);
        if (this._fontColor !== value) {
            this._fontColor = value;
            this.innerTooltip && (this.innerTooltip.style.color = value);
        }
    }

    /**
     * 提示框中的字体以左上角为原点的偏移量，横向为x，竖向为y，单位为像素
     * 
     * @property {Cartesian2} fontOffset
     * @default 'new BOSGeo.Cartesian2(8, 8)'
     */
    get fontOffset() {
        return this._fontOffset;
    }
    set fontOffset(value) {
        Check.typeOf.object("value", value);
        if (value instanceof Cartesian2 && !this._fontOffset.equals(value)) {
            this._fontOffset = value;
            this.tooltipDom && (this.innerTooltip.style.padding = `${value.x}px ${value.y}px`);
        }
    }

    /**
     * 提示框的背景色
     * @property {String} backgroundColor
     * @default 'rgba(0, 0, 0, 0.7)'
     */
    get backgroundColor() {
        return this._backgroundColor;
    }
    set backgroundColor(value) {
        Check.typeOf.string("value", value);
        if (this._backgroundColor !== value) {
            this._backgroundColor = value;
            this.innerTooltip && (this.innerTooltip.style.backgroundColor = value);
        }
    }

    /**
     * 位置以左上角为原点的偏移量，横向为x，竖向为y，单位为像素
     * 
     * @property {Cartesian2} offset
     * @default 'new BOSGeo.Cartesian2(10, 0)'
     */
    get offset() {
        return this._offset;
    }
    set offset(value) {
        Check.typeOf.object("value", value);
        if (value instanceof Cartesian2 && !this._offset.equals(value)) {
            this._offset = value;
        }
    }

    /**
     * 提示框的显示文本
     * 
     * @property {String} message
     * 
     */
    get message() {
        return this._message;
    }
    set message(value) {
        Check.typeOf.string("value", value);
        if (this._message !== value) {
            this._message = value;
            this.tooltipDom && (this.innerTooltip.innerHTML = value);
        }
    }

    /**
     * 提示框的显隐
     * 
     * @property {Boolean} show
     * @default true
     */
    get show() {
        return this._show;
    }
    set show(value) {
        Check.typeOf.bool("value", value);
        if (this._show !== value) {
            !value && this.setTooltipPosition(new Cartesian2(0, -100));
            this._show = value;
            this.tooltipDom && (this.tooltipDom.style.display = value ? '' : 'none');  
        }
    }

    /**
     * 设置提示框位置
     * @private
     * 
     * @param {Cartesian2} screenPosition 屏幕坐标
     */
    setTooltipPosition(screenPosition) {
        if (screenPosition instanceof Cartesian2 && this.tooltipDom && this._message.length > 0 && this._show) {
            const { x, y } = screenPosition;
            const offsetX = this._offset.x;
            const offsetY = this._offset.y;

            this.tooltipDom.style.top =  (y + offsetY - this.tooltipDom.clientHeight / 2) + 'px' 
            this.tooltipDom.style.left =  (x + offsetX) + 'px' 
            // const isExceedHeight =  y + this.tooltipDom.clientHeight + 5 < this.viewer.container.offsetHeight;
            // this.tooltipDom.style.top = isExceedHeight ?  (y + offsetY) + 'px' : (y - offsetY - this.tooltipDom.clientHeight - 20) + 'px';
            // const isExceedWidth =  x + this.tooltipDom.clientWidth + 20 < this.viewer.container.offsetWidth;
            // this.tooltipDom.style.left = isExceedWidth ? (x + offsetX + 10) + 'px' : (x - offsetX - this.tooltipDom.clientWidth - 10) + 'px';
        }
    }

    /**
     * 销毁提示框类
     * 
     * 
     */
    destroy() {
        if (this.handler !== undefined) {
            this.handler.destroy();
            this.handler = undefined;
        }

        this.tooltipDom && this.viewer.container.removeChild(this.tooltipDom);
        this.tooltipDom = undefined;
        return destroyObject(this);
    }
}

export default Tooltip;