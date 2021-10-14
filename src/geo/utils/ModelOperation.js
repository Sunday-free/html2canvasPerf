import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType';
import {GeoDepository} from "../core/GeoDepository";
import defaultValue from 'cesium/Core/defaultValue'
import FeatureType from '../constant/FeatureType'
import GeoUtil from '../utils/GeoUtil'

/**
 * 模型平移旋转缩放交互类
 * @param options
 * @param {Event} [options.modelMove= new Event()] 模型移动事件
 * @ignore
 */
function ModelOperation (options) {
    this.options = defaultValue(options, {});
    this._enableModify = false;
    this._currentModel = null;
    this._modelmove = options.modelMove || null;
    this._handler = null;
    this._originHandler = null;
    this.newVal = {
        lng : 0,
        lat : 0,
        height : 0,
        heading : 0,
        pitch : 0,
        roll : 0,
        size : 1,
    }
}

/**
 * 激活
 */
ModelOperation.prototype.activate = function () {
    !this._handler && !this._originHandler ? this._bindEvent() : this._handler = this._originHandler;
}
/**
 * 鼠标事件
 * @private
 */
ModelOperation.prototype._bindEvent = function () {
    this._handler = GeoDepository.viewer.screenSpaceEventHandler;
    this._originHandler = this._handler;
    let scene = GeoDepository.scene;
    let camera = GeoDepository.camera;
    let that = this;

    //左键按下事件
    this._handler.setInputAction(e => {
        if (!this._handler) return;
        let pick = scene.pick(e.position);
        if (!pick) {
            that._enableModify = false;
            return;
        }

        let position;
        if (pick.primitive && (pick.primitive.featureType === FeatureType.TILES || pick.primitive.featureType === FeatureType.GLTF)) {
            // 3dtile
            let tileset = pick.primitive;
            that._currentModel = tileset;
            that._enableModify = true;
            position = tileset.gltf ? [0, 0, 0] : GeoUtil.cartesianToArray(tileset.boundingSphere.center);
        } else {
            that._enableModify = false;
        }

        that.newVal = {
            lng : position && position[0],
            lat : position && position[1],
            height : position && position[2],
            heading : that._currentModel.heading || 0,
            pitch : that._currentModel.pitch || 0,
            roll : that._currentModel.roll || 0,
            size : that._currentModel.size || 1,
        }
        that._modelmove && that._modelmove.raiseEvent({type: 'left_down', data: that.newVal});

    }, ScreenSpaceEventType.LEFT_DOWN);
  
    // this._handler.setInputAction(e => {
    //     let windowCoord = e.position;
    //     let pick = scene.pick(windowCoord);
    //     this.options.LEFT_CLICK_CTRL && this.options.LEFT_CLICK_CTRL(pick);
    // }, ScreenSpaceEventType.LEFT_CLICK, KeyboardEventModifier.CTRL);
    //鼠标移动事件
    this._handler.setInputAction(e => {
        if (!this._handler) return;
        let cartesian = camera.pickEllipsoid(e.endPosition);
        if (!that._enableModify) return;
    
        scene.screenSpaceCameraController.enableRotate = false;
        if (!cartesian) return;

        let position = GeoUtil.cartesianToArray(cartesian);
        that.newVal.lng = position[0];
        that.newVal.lat = position[1];
        that._modelmove && that._modelmove.raiseEvent({
            type: 'mouse_move',
            data: that.newVal
        });

        if (that._currentModel.featureType === FeatureType.GLTF) {
            GeoUtil.setGltfModelMatrix(that._currentModel, [that.newVal.lng, that.newVal.lat, that.newVal.height, that.newVal.heading]);
        } else if (that._currentModel.featureType === FeatureType.TILES || that._currentModel.featureType === FeatureType.BIM) {
            GeoUtil.setTilesetMatrix(that._currentModel._root.transform, [that.newVal.lng, that.newVal.lat, that.newVal.height], [that.newVal.heading, that.newVal.pitch, that.newVal.roll], that.newVal.size);
        }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    //左键松开事件
    this._handler.setInputAction(e => {
        if (!that._enableModify || !this._handler) return;
    
        scene.screenSpaceCameraController.enableRotate = true;
        that._enableModify = false;
    }, ScreenSpaceEventType.LEFT_UP);
}
/**
 * 销毁
 */
ModelOperation.prototype.destroy = function () {
    // this._handler && this._handler.destroy();
    this._handler = null;
}

export {ModelOperation}