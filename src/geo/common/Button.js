/**
 * 自定义按钮
 * @ignore
 * @param options
 * @constructor
 */
function Button (options) {

    this._button = null;
    this._tip = null;
    this._tool = null;
    options = options || {};

    let text = options.text || '';
    let parent = options.parent || options.viewer.container;

    let div = document.createElement('div');

    let tip = document.createElement('div');
    tip.className = 'button-tip';
    tip.style.display = 'none'
    tip.innerHTML = text;
    div.appendChild(tip);

    let bt = document.createElement('button');
    bt.onclick = options.click;
    bt.style.backgroundImage = 'url(' + require(`../images/${options.url}.png`) + ')';
    bt.style.backgroundSize = '100%';
    div.appendChild(bt);
    parent.appendChild(div);
    console.log(parent)

    div.onmouseenter = function () {
        tip.style.display = 'block';
    }
    div.onmouseleave = function () {
        tip.style.display = 'none';
    }

    this._button = bt;
    this._tip = tip;
    this._tool = div;
}

export {Button}