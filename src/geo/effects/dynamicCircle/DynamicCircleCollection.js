
import DeveloperError from 'cesium/Core/DeveloperError';
import Check from 'cesium/Core/Check';
import destroyObject from 'cesium/Core/destroyObject';
import defaultValue from 'cesium/Core/defaultValue';
import defined from 'cesium/Core/defined';

import DynamicCircle from './DynamicCircle';

class DynamicCircleCollection {
    /**
     * 模型动态扫描圈集合
     * @alias DynamicCircleCollection
     * @constructor
     * 
     * @see DynamicCircle
     * @see TilesetDynamicCircle
     * 
     * @example
     * var dynamicCircles = new BOSGeo.DynamicCircleCollection()
     */
    constructor() {
        this._circles = [];

        this._multipleDirtyCircles = false;
    }

    /**
     * 集合大小
     * 
     * @property {Number}
     * @readonly
     * @default 0
     */
    get length() {
        return this._circles.length;
    }

    /**
     * 添加动态圆
     * 
     * @param {DynamicCircle} circle 
     * 
     * @returns {Number} 序号
     * 
     * @example
     * var dynamicCircle = new BOSGeo.DynamicCircle({
     *    position: BOSGeo.Cartesian3.fromDegrees(114.08298162601, 22.544403517),
     *    color: '#0000FF',
     *    radius: 1000,
     *    width: 100
     * });
     * dynamicCircles.add(dynamicCircle);
     */
    add(circle) {
        const newCircleIndex = this._circles.length;

        circle.onChangeCallback = () => {
            this._multipleDirtyCircles = true;
            // 调用回调方法
            defined(this.update) && this.update();
        };
        circle.index = newCircleIndex;

        this._circles.push(circle);

        this._multipleDirtyCircles = true;
       // 调用回调方法
        defined(this.update) && this.update();

        return newCircleIndex;
    }

    /**
     * 获取指定序号的动态圆对象
     * 
     * @param {Number} index 模型动态圆序号
     * 
     * @returns {DynamicCircle}
     */
    get(index) {
        Check.typeOf.number("index", index);
        if (index >= this._circles.length) {
            throw new DeveloperError("超出数组长度");
        }
        return this._circles[index];
    }

    /**
     * 移除指定序号的动态圆对象
     * 
     * @param {Number} index 模型动态圆序号
     * 
     * @returns {Boolean}
     */
    remove(index) {
        Check.typeOf.number("index", index);

        if (index >= this._circles.length || index === -1) {
            return false;
        }

        let circles = this._circles;

        const dynamicCircle = circles[index];
        if (dynamicCircle instanceof DynamicCircle) {
            dynamicCircle.onChangeCallback = undefined;
            dynamicCircle.index = -1;
        }

        const length = circles.length - 1;
        for (let i = index; i < length; ++i) {
            const circleToKeep = circles[i + 1];
            circles[i] = circleToKeep;
            if (circleToKeep instanceof DynamicCircle) {
                circleToKeep.index = i;
            }
        }

        circles.length = length;

        this._multipleDirtyCircles = true;
       // 调用回调方法
        defined(this.update) && this.update();
    }

    /**
     * 移除所有动态圆
     */
    removeAll() {
        var circles = this._circles;
        var circlesCount = circles.length;
        for (var i = 0; i < circlesCount; ++i) {
            var dynamicCircle = circles[i];
            if (dynamicCircle instanceof DynamicCircle) {
                dynamicCircle.onChangeCallback = undefined;
                dynamicCircle.index = -1;
            }
        }

        this._circles = [];

        this._multipleDirtyCircles = true;
        // 调用回调方法
        defined(this.update) && this.update();
    }

    /**
     * 销毁
     * @returns {undefined}
     */
    destroy() {
        return destroyObject(this);
    }
}

export default DynamicCircleCollection;