
import {GeoDepository} from "../core/GeoDepository";
/**
 * 位于页面顶部的提示信息组件
 * @ignore
 */
function ConstantTip(viewer) {
    
    let div;
    /**
     * 创建提示信息组件
     */
    this.createTip = function () {
        // if (div) return;
        div = document.createElement('div');
        div.className = 'constant-tip';
        div.style.left =  '100px'
        div.style.top = '50px'
        div.style.position='absolute';
        GeoDepository.viewer.container.appendChild(div);

    }

    /**
     * 设置提示信息内容
     * @param {String} text
     */
    this.setText = function (text) {
        div.innerText = text;
    };
    /**
     * 设置提示信息组件显示(true)隐藏（false）
     * @param visible
     */
    this.setVisible = function (visible) {
        if (visible) {
            div.style.display = 'block';
        } else {
            div.style.display = 'none';
        }
    };
}

//////////////////////////////////////////////

let constantTip = new ConstantTip();

export {ConstantTip,constantTip};