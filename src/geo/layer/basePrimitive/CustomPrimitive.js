import defined from 'cesium/Core/defined';
import destroyObject from 'cesium/Core/destroyObject';

class CustomPrimitive {
    /**
     * 自定义图元基类
     * @constructor
     * @alias CustomPrimitive
     * @private
     */
    constructor() {
        this.isUpdate = true;
        this.primitive = undefined;
        this.positions = [];
    }
    
    /**
     * 所属于的元素，例如基于CustomPrimitive创建面图层中area元素中land时，land需要以bosGroup字段指回area
     * {Point|Line|Area}
	 * @private 
     */
    get bosGroup() {
        return this._bosGroup;
    }
    set bosGroup(value) {
        if(typeof(value)==='object' && defined(value.featureType)){
            this._bosGroup = this.primitive.bosGroup = value;
        }
    }

    /**
     * 获取图元几何
     * 
     * @private
     */
    getGeometry() {
    }

    /**
     * 创建图元
     * 
     * @private
     */
    createPrimitive() {
        console.log('***********');
    }

    /**
     * 更新图元
     * @private
     * 
     * @param {FrameState} frameState 
     * @returns {undefined}
     */
    update(frameState) {
        if (!this.isUpdate && !defined(this.primitive)) {
            return;
        }
        if (this.isUpdate) {
            this.isUpdate = false;
            this.primitive = this.primitive && this.primitive.destroy();
            this.primitive = this.createPrimitive();

            if(this.bosGroup) this.primitive.bosGroup = this.bosGroup; //基于CustomPrimitive创建面图层中area元素中land时，land需要以bosGroup字段指回area
        }
        this.primitive.update(frameState);
    }

    /**
     * 销毁所有内部定义的变量和资源
     * @returns {Boolean} 销毁是否成功
     */
    destroy() {
        this.primitive = this.primitive && this.primitive.destroy();
        this.isUpdate = undefined;
        this.positions = undefined;
        return destroyObject(this);
    }
}

export default CustomPrimitive;