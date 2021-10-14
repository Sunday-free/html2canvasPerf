
import Cesium3DTileset  from "cesium/Scene/Cesium3DTileset";
import Cesium3DTileStyle  from "cesium/Scene/Cesium3DTileStyle";
import HeadingPitchRange  from"cesium/Core/HeadingPitchRange";
import { GeoDepository } from "../core/GeoDepository";
import defaultValue from 'cesium/Core/defaultValue';
import Util from "../utils/Util";
/**
 * 白模动态纹理自发光
 * @alias TilesetBloom
 *
 * @example
 let tilesBloom=new BOSGeo.TilesetBloom()
 */
class TilesetBloom{
    constructor(){
        this.bloom=defaultValue(true);
        //如果设置为true，则会在场景更新时渲染，否则实时渲染每帧
        GeoDepository.viewer.scene.requestRenderMode=false;
        GeoDepository.geomap.requestRenderModeMethods.push('TilesetBloom');
    }

    /**
     * 渲染tileset自发光纹理
     * @param {Cesium3DTileset} tileset  回调的3DTileset
     * @param {Object}  options  配置
     * @param {Number} [options.baseHeight=-100.1]  可选，模型的基础高度，需要修改成一个合适的建筑基础高度,默认是 -100.1米。
     * @param {Number} [options.heightRange=80.1]  可选，高亮的范围(baseHeight ~ baseHeight + heightRange) 默认是 80.1米。
     * @param {Number} [options.glowRange=360]  可选， 光环的移动范围(高度) 默认是 360.0米。
     * @param {Number} [options.shaderTime=300.0]  可选，当前着色器的时间，帧率/（5*60），即时间放慢5倍，默认是 300.0。
     * @param {Boolean} [options.bloom=true]  可选，是否进行纹理自发光，true为启用，false则不启用，默认是true。
     * @return {Cesium3DTileset} tileset  回调添加自发光纹理的3DTileset
     * @example

     modelLayer.once(BOSGeo.LayerEventType.ADD,(tileset)=>{
     tilesBloom.tileRender(tileset,{
            baseHeight:-100.0, //模型的基础高度，需要修改成一个合适的建筑基础高度,默认是 -100.1米。
            heightRange:100.0, //高亮的范围(baseHeight ~ baseHeight + heightRange) 默认是 80.1米。
            glowRange:360,  //光环的移动范围(高度) 默认是 360.0米。
            shaderTime:200 //当前着色器的时间，帧率/（5*60），即时间放慢5倍 默认是 300.0。
        })
    });
     */
    tileRender(tileset,options={}){
        const {
            baseHeight=-100.1,
            heightRange=80.1,
            glowRange=360.0,
            shaderTime=300.0,
            bloom=true,
        }=options
        this.bloom=defaultValue(options.bloom,true);
        // 注入 shader
        tileset.tileVisible.addEventListener((tile) => {
                var content = tile.content
                var featuresLength = content.featuresLength
                for (var i = 0; i < featuresLength; i += 2) {
                    const feature = content.getFeature(i)
                    const model = feature.content._model

                    if (model && model._sourcePrograms && model._rendererResources) {
                        Object.keys(model._sourcePrograms).forEach((key) => {
                            const program = model._sourcePrograms[key]
                            const fragmentShader = model._rendererResources.sourceShaders[program.fragmentShader]
                            let vPosition = ''
                            if (fragmentShader.indexOf(' v_positionEC;') !== -1) {
                                vPosition = 'v_positionEC'
                            } else if (fragmentShader.indexOf(' v_pos;') !== -1) {
                                vPosition = 'v_pos'
                            }
                            const color = `vec4(${feature.color.toString()})`

                            // 自定义着色器
                            let shader1=`\n// 渐变效果 
                                vec4 v_helsing_position = czm_inverseModelView * vec4(${vPosition},1);// 解算出模型坐标
                                float stc_pl = fract(czm_frameNumber / 120.0) * 3.14159265 * 2.0;
                                float stc_sd = v_helsing_position.z / 60.0 + sin(stc_pl) * 0.1;
                                gl_FragColor =${color};// 基础蓝色
                                gl_FragColor *= vec4(stc_sd, stc_sd, stc_sd, 1.0);// 按模型高度进行颜色变暗处理
                                // 扫描线 
                                float glowRange = 360.0; // 光环的移动范围(高度)，最高到360米
                                float stc_a13 = fract(czm_frameNumber / 300.0);// 计算当前着色器的时间，帧率/（6*60），即时间放慢6倍
                                float stc_h = clamp(v_helsing_position.z / glowRange, 0.0, 1.0);
                                stc_a13 = abs(stc_a13 - 0.5) * 2.0;
                                float stc_diff = step(0.005, abs(stc_h - stc_a13));// 根据时间来计算颜色差异
                                gl_FragColor.rgb += gl_FragColor.rgb * (1.0 - stc_diff);// 原有颜色加上颜色差异值提高亮度
                                \n}\n`;

                            if(this.bloom ){
                                if(model._rendererResources.sourceShaders[program.fragmentShader].indexOf('#define bloom')== -1 &&
                                    model._rendererResources.sourceShaders[program.fragmentShader].indexOf('渐变效果')== -1
                                ){
                                    // this.shader2 = '#define bloom ' + '\n';
                                    // 引入 着色器
                                    this.shader2 = `\n 
                                #define bloom 
                                // 渐变效果                          
                                #ifdef bloom
                                // 可以修改的参数
                                // 注意shader中写浮点数是，一定要带小数点，否则会报错，比如0需要写成0.0，1要写成1.0
                                float _baseHeight = ${options.baseHeight.toFixed(2)}; // -80.0 物体的基础高度，需要修改成一个合适的建筑基础高度
                                float _heightRange = ${options.heightRange.toFixed(2)}; //80.0  高亮的范围(_baseHeight ~ _baseHeight + _heightRange) 默认是 0-60米
                                float _glowRange = ${options.glowRange.toFixed(2)}; //360.0 光环的移动范围(高度)
                                // 建筑基础色
                                vec4 v_stcVertex =czm_inverseModelView * vec4(${vPosition},1);// 解算出模型坐标
                                float vtxf_height = v_stcVertex.z - _baseHeight;
                                float vtxf_a11 = fract(czm_frameNumber / 120.0) * 3.14159265 * 2.0;
                                float vtxf_a12 = vtxf_height / _heightRange + sin(vtxf_a11) * 0.1;
                                gl_FragColor *= vec4(vtxf_a12, vtxf_a12, vtxf_a12, 1.0);
                                // 动态光环
                                float vtxf_a13 = fract(czm_frameNumber / ${options.shaderTime.toFixed(2)}); // 计算当前着色器的时间，帧率/（6*60），即时间放慢6倍
                                float vtxf_h = clamp(vtxf_height / _glowRange, 0.0, 1.0);
                                vtxf_a13 = abs(vtxf_a13 - 0.5) * 2.0;
                                float vtxf_diff = step(0.005, abs(vtxf_h - vtxf_a13));// 根据时间来计算颜色差异
                                gl_FragColor.rgb += gl_FragColor.rgb * (1.0 - vtxf_diff);// 原有颜色加上颜色差异值提高亮度
                                #endif\n
                                \n}\n`;

                                    let fragmentShader1 =fragmentShader.substr(0, fragmentShader.length-2 )
                                    if( fragmentShader1.indexOf('#define bloom')== -1){
                                        fragmentShader1=fragmentShader1 +this.shader2;
                                        model._rendererResources.sourceShaders[program.fragmentShader] = fragmentShader1
                                    }

                                }else{
                                    if( model._rendererResources.sourceShaders[program.fragmentShader].indexOf('//#define bloom')!= -1) {
                                        this.shader2.replace('//#define bloom', '#define bloom')
                                        model._rendererResources.sourceShaders[program.fragmentShader] = model._rendererResources.sourceShaders[program.fragmentShader].replace('//#define bloom', '#define bloom')
                                    }else{
                                        let fragmentShader1 =fragmentShader.substr(0, fragmentShader.length-2 )
                                        if( fragmentShader1.indexOf('渐变效果')== -1){
                                            fragmentShader1=fragmentShader1 +this.shader2;

                                            model._rendererResources.sourceShaders[program.fragmentShader] = fragmentShader1
                                        }
                                    }
                                }
                            }

                            else if(!this.bloom){
                                this.shader2 && this.shader2.replace('#define bloom','\n')
                                model._rendererResources.sourceShaders[program.fragmentShader]=model._rendererResources.sourceShaders[program.fragmentShader].replace('#define bloom','//#define bloom')
                            }
                        })
                        // 让系统重新编译着色器
                        model._shouldRegenerateShaders = true;

                        GeoDepository.scene.requestRender();
                    }
                }
            })

        return tileset;
    }

    /**
     * 取消tileset自发光纹理渲染
     * @example
        tilesBloom.clearRender();
        //或者
        tilesBloom.bloom=false;
     */
    clearRender(){
        this.bloom=false;
    }

    /**
     * 移除
     */
    remove(){
        this.clearRender();
        Util.removeFromArray(GeoDepository.geomap.requestRenderModeMethods, erModeMethods, 'TilesetBloom');//移除调用实时渲染的方法
        GeoDepository.geomap._requestRenderModeCheck();
    }

}
export default TilesetBloom;
