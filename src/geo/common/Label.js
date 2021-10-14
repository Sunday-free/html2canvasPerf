import {GeoDepository} from '../core/GeoDepository'
// import defaultValue from 'cesium/Source/Core/defaultValue'
/**
 * 鼠标时的移动提示信息
 * @ignore
  */
function Label (options) {
    // options = defaultValue(options, {})
    this._div = null
    this.createEl();
}

/**
 * 创建移动提示信息div
 */
Label.prototype.createEl = function () {
    if (!this._div) {
        this._div = document.createElement('div');
        this._div.className = 'bosgeo-label'
        GeoDepository.viewer.container.appendChild(this._div);
    }
}
/**
 * 设置div的位置
 * @param {*} x 
 * @param {*} y 
 */
Label.prototype.setPosition = function (x, y) {
    this._div.style.left = x + 'px'
    this._div.style.top = y + 'px'
}
/**
 * 设置提示内容
 * @param {*} content innerHTML格式
 */
Label.prototype.setContent = function (content) {
    this._div.innerHTML = content
}
/** 
 * 设置是否显示
*/
Label.prototype.setVisible = function (val) {
    val ? this._div.style.display = 'block' : this._div.style.display = 'none'
}
/**
 * 销毁Label
 */
Label.prototype.distroy = function () {
    GeoDepository.viewer.container.removeChild(this._div);
    this._div = null
}

export {Label}