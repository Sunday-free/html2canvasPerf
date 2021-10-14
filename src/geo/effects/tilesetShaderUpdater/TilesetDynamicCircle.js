import destroyObject from 'cesium/Core/destroyObject';
import defaultValue from 'cesium/Core/defaultValue';

import ShaderSource from 'cesium/Renderer/ShaderSource';

import Axis from 'cesium/Scene/Axis';

import TilesetShaderUpdater from './TilesetShaderUpdater';
import DynamicCircle from '../dynamicCircle/DynamicCircle';
import DynamicCircleCollection from '../dynamicCircle/DynamicCircleCollection';
import Util from '../../utils/Util';



class TilesetDynamicCircle extends TilesetShaderUpdater {
    /**
     * 模型(b3dm类型的图层)动态圆效果
     * @alias TilesetDynamicCircle
     * @constructor
     *
     * @param {Cesium3DTileset} tileset b3dm类型的Cesium3DTileset对象
     * @param {Object} options 
     * @param {DynamicCircleCollection} [options.dynamicCircles] 动态圆集合
     * 
     * @see DynamicCircleCollection
     * @see DynamicCircle
     *
     * @example
     * var modelLayer = layerManager.createLayer(BOSGeo.LayerType.MODEL, "模型");
     * var tileset = modelLayer.add({
     *   url: 'http://192.168.1.8/Data/3D/3DTiles/shenzhen/tileset.json',
     *   featureType: BOSGeo.FeatureType.TILES,
     * });
	 * modelLayer.zoomToLayer();
     * var dynamicCircles = new BOSGeo.DynamicCircleCollection();
     * var tilesetDynamicCircle = new BOSGeo.TilesetDynamicCircle(tileset, {dynamicCircles});
     * var dynamicCircle = new BOSGeo.DynamicCircle({
     *    position: BOSGeo.Cartesian3.fromDegrees(114.08298162601, 22.544403517),
     *    color: '#0000FF',
     *    radius: 1000,
     *    width: 100
     * });
     * dynamicCircles.add(dynamicCircle);
     */
    constructor(tileset, options) {
        super(tileset, options);

        const {
            dynamicCircles,
            upAxis = Axis.Z
        } = options;

        this._upAxis = upAxis;
        this.dynamicCircles = defaultValue(dynamicCircles, new DynamicCircleCollection());
        this.dynamicCircles.update = () => {
            this.updateShaders();
        }

        this._extraVaryingStr = 'varying vec3 v_positionEC;';
        this._extraVaryingValue = 'v_positionEC = pos.xyz;';

        this.updateShaders();
    }

    /**
     * 获取新增varying变量修改后的VS
     * @private
     *
     * @returns {String}
     */
    _getDynamicCircleVS() {
        let modifyVS = ShaderSource.replaceMain(this._originalVertexShader, "dynamic_circle_main");

        const dynamicCircles = this.dynamicCircles;
        const len = dynamicCircles.length;

        for (let i = 0; i < len; i++) {
            modifyVS += `varying float v_dis_${i}; \n`;
        }

        modifyVS +=
            "void main() \n" +
            "{ \n" +
            "    dynamic_circle_main(); \n";

        modifyVS += modifyVS.indexOf('varying vec3 v_positionWC') > -1 ?
            "    vec4 world_vec4 = vec4(v_positionWC, 1.0);\n"
            : "    vec4 world_vec4 = czm_model * vec4(a_position, 1.0);\n";

        for (let i = 0; i < len; i++) {
            modifyVS += `    v_dis_${i} = length((mat4(${ dynamicCircles.get(i)._worldMatrixArray.toString() }) * world_vec4).xy); \n`; 
        }

        modifyVS += "} \n";
        return modifyVS;
    }

    /**
     * 获取动态圆的片源着色器修改片段
     * 
     * @private
     * 
     * @param {DynamicCircle} dynamicCircle 
     * @param {Number} index 动态圆序号
     * 
     * @returns {String}
     */
    getSingleCircleFS(dynamicCircle, index) {
        const { _color, radius, width, power, breathFactor } = dynamicCircle;
        const isCircle = (width === 0) || (width >= radius);
        let fsForDC = `    float radius_${index} = ${Util.parseFloatWithDot(radius)} * fract(czm_frameNumber / 120.0 * ${Util.parseFloatWithDot(breathFactor)}) ; \n`;
        fsForDC += `     gl_FragColor.rgb += vec3(${Util.parseFloatWithDot(_color.red)}, ${Util.parseFloatWithDot(_color.green)}, ${Util.parseFloatWithDot(_color.blue)})`;
        // step函数用于判断是否在圈内的作用， pow起设置一个抛物线渐变效果, max和min则是将所有渐变值限制在0~1区间内
        if (isCircle) {
            //   '     float edge1 = 1.0 - max(0.0, (radius - v_dis) / radius); \n' +
            //   `     gl_FragColor.rgb += color * pow(edge1, 10.0) * step(v_dis, radius) ; \n` +
            fsForDC += ` * pow(1.0 - max(0.0, (radius_${index} - v_dis_${index}) / radius_${index}), ${Util.parseFloatWithDot(power)}) * step(v_dis_${index}, radius_${index}) ; \n`;
        } else {
            // '     float edge2 = 1.0 - min(1.0, max(0.0, (radius - v_dis) / width)); \n' +
            // `     gl_FragColor.rgb += color * pow(edge2, 4.0) * step(v_dis, radius) * step(radius - width, v_dis) ; \n` +
            fsForDC += ` * pow(1.0 - min(1.0, max(0.0, (radius_${index} - v_dis_${index}) / ${Util.parseFloatWithDot(width)})), ${Util.parseFloatWithDot(power)}) * step(v_dis_${index}, radius_${index})`;
            fsForDC += `* step(radius_${index} - ${Util.parseFloatWithDot(width)}, v_dis_${index}) ; \n`;
        }

        return fsForDC;
    }

    /**
     * 获取新增varying变量修改后的VS
     * @private
     *
     * @returns {String}
     */
    _getDynamicCircleFS() {

        // const dcStr = this.getSingleCircleFS(this._dynamicCircle, 0);
        let modifyFS = ShaderSource.replaceMain(this._originalFragmentShader, "dynamic_circle_main");

        const dynamicCircles = this.dynamicCircles;
        const len = dynamicCircles.length;

        for (let i = 0; i < len; i++) {
            modifyFS += `varying float v_dis_${i}; \n`;
        }
        modifyFS +=
            "void main() \n" +
            "{ \n" +
            "    dynamic_circle_main(); \n";

        for (let i = 0; i < len; i++) {
            modifyFS += this.getSingleCircleFS(dynamicCircles.get(i), i);
        }
        dynamicCircles._multipleDirtyCircles = false;

        modifyFS += "} \n";
        return modifyFS;
    }

    /**
     * 更新着色器
     * 
     * @private
     */
    updateShaders() {
        // 必须先保存了原始着色器之后才允许更新
        if (this._hasSavedOriginalShaders) {
            if (this.dynamicCircles instanceof DynamicCircleCollection) {
                this.customVertexShader = this._getDynamicCircleVS();
                this.customFragmentShader = this._getDynamicCircleFS();
            }
        } else {
            setTimeout(() => {
                this.updateShaders();
            }, 100);
        }
    }

    /**
     * 销毁
     * @returns {undefined}
     */
    destroy() {
        return destroyObject(this);
    }
}


export default TilesetDynamicCircle;