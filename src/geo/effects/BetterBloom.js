import ClearCommand from "cesium/Renderer/ClearCommand";
import Color from "cesium/Core/Color";
import createGuid from "cesium/Core/createGuid";
import PostProcessStage from "cesium/Scene/PostProcessStage";
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartesian2 from "cesium/Core/Cartesian2";
import PostProcessStageSampleMode from "cesium/Scene/PostProcessStageSampleMode";
import PostProcessStageComposite from "cesium/Scene/PostProcessStageComposite";
import defined from "cesium/Core/defined";
import DetectWebgl from "cesium/Extend/DetectWebgl"; 
import {GeoDepository} from "../core/GeoDepository";

/**
 * 自发光纹理（辉光）,只支持有多重纹理的模型，同时需要webgl2.0支持
 * @example
 let bloom = new BOSGeo.BetterBloom();
 bloom.render();
 */
class BetterBloom {
    constructor(){
		const { geomap, scene } = GeoDepository;
        this.scene = scene;
        this.geomap = geomap;

		this._requestRenderMode = geomap.requestRenderMode; // 保存最初的实时渲染参数值
		geomap.requestRenderMode = false;
    }

    /**
     * 获取Seperable模糊材料
     * @param kernelRadius
     * @returns {{shader: string, texSize: undefined}}  Seperable模糊材料shader
     * @private
     * @ignore
     */
    getSeperableBlurMaterial(kernelRadius) {
        let blurShaderFS = '#define KERNEL_RADIUS ' + kernelRadius + '\n' +
            '#define SIGMA ' + kernelRadius + '\n' +
            'varying vec2 v_textureCoordinates;\n' +
            'uniform sampler2D colorTexture; \n' +
            'uniform vec2 texSize; \n' +
            'uniform vec2 direction; \n' +
            'float gaussianPdf(in float x, in float sigma){ \n' +
            '   return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;\n' +
            '} \n' +
            'void main() { \n' +
            '  vec2 invSize = 1.0 / texSize;\n' +
            '  float fSigma = float(SIGMA); \n' +
            'float weightSum = gaussianPdf(0.0,fSigma); \n' +
            'vec3 diffuseSum = texture2D(colorTexture,v_textureCoordinates).rgb * weightSum ; \n' +
            'for( int i = 1; i < KERNEL_RADIUS; i ++ ) { \n' +
            '  float x = float(i);\n' +
            '  float w = gaussianPdf(x, fSigma);\n' +
            '  vec2 uvOffset = direction * invSize * x; \n' +
            '  vec3 sample1 = texture2D( colorTexture, v_textureCoordinates + uvOffset).rgb;\n' +
            '  vec3 sample2 = texture2D( colorTexture, v_textureCoordinates - uvOffset).rgb; \n' +
            '  diffuseSum += (sample1 + sample2) * w; \n' +
            '  weightSum += 2.0 * w;\n' +
            '}\n' +
            'gl_FragData[0] = vec4(diffuseSum/weightSum,1.0);\n' +
            '}\n';
        ;

        return {
            shader: blurShaderFS,
            texSize: undefined
        };
    }

    /**
     * 获取复合材质
     * @returns {string}  复合材质Shader
     * @private
     * @ignore
     */
    getCompositeShader(){
        let compositeShaderFS = 
            '#define NUM_MIPS '+this.nMips+'\n'+
            'varying vec2 v_textureCoordinates;\n'+
            'uniform sampler2D blurTexture1;\n' +
            'uniform sampler2D blurTexture2;\n' +
            'uniform sampler2D blurTexture3;\n' +
            'uniform sampler2D blurTexture4;\n' +
            'uniform sampler2D blurTexture5;\n' +
            'uniform sampler2D colorTexture;\n' +
            'uniform sampler2D depthTexture;\n' +
            'uniform float bloomStrength;\n' +
            'uniform float bloomRadius;\n' +
            'uniform float bloomFactors[NUM_MIPS];\n' +
            'uniform vec3 bloomTintColors[NUM_MIPS];\n'+
            'float lerpBloomFactor(const in float factor) {\n' +
            '    float mirrorFactor = 1.2 - factor;\n' +
            '    return mix(factor, mirrorFactor, bloomRadius);\n' +
            '}\n'+
            'void main() {\n' +
            ' vec4 outColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, v_textureCoordinates) +\n' +
            '                                   lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, v_textureCoordinates) +\n' +
            '                                   lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, v_textureCoordinates) +\n' +
            '                                   lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, v_textureCoordinates) +\n' +
            '                                   lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, v_textureCoordinates) );\n'+
            // ' vec4 maskColor = texture2D(maskTexture, v_textureCoordinates);\n' +
            ' vec4 mainColor = texture2D(colorTexture, v_textureCoordinates);\n' +
            ' vec4 finalColor = mainColor  + outColor; \n' +
            ' gl_FragData[0] = finalColor; \n' +
            '}\n';
        return compositeShaderFS;
    }

    /**
     * 清除辉光效果
     * @example
     bloom.clear()
     */
    clear(){
        let stages = this.scene.postProcessStages;
        if(defined(this.composite_Final)){
            stages.remove(this.composite_Final);
            this.composite_Final = null;
        }
		this.geomap.requestRenderMode = this._requestRenderMode;
        this.geomap.render();
    }

    /**
     * 对有多重纹理的模型进行辉光渲染
     * @example
     bloom.render()
     */
    render(){
        //判断是否支持webgl2.0
        let detectWebgl=new DetectWebgl()
        let os=detectWebgl.detectOS()
        let webgl=detectWebgl.detectWebgl()

        if(os=='Mac'){
            return
        }
        
        let context = this.scene.context;
        //需要webgl2支持
        if(webgl.webgl2 ==='supported_abled'){
            let width = context.drawingBufferWidth;
            let height = context.drawingBufferHeight;
            this.context = context;

            if (!context.useMRT) {
                console.warn('警告——请开启contextOpiotns中的requestWebgl2和useMRT!!')
                return;
            }
            this.framebuffer = this.scene._view.sceneFramebuffer;

            let that = this;


            this.bloomPass =
                'uniform sampler2D colorTexture;\n' +
                'uniform sampler2D bloomTexture;\n' +
                // 'uniform sampler2D opaqueBloomTexture;\n' +
                'uniform float contrast; \n'+
                'uniform float brightness; \n'+
                'uniform vec3 defaultColor; \n'+
                'uniform float defaultOpacity; \n'+
                'uniform float luminosityThreshold; \n'+
                'uniform float smoothWidth; \n'+
                'varying vec2 v_textureCoordinates;\n' +
                'void main(void)\n' +
                '{\n' +
                '    vec4 bloomColor = texture2D(bloomTexture, v_textureCoordinates);\n' +
                // '    vec4 opaqueBloomColor = texture2D(opaqueBloomTexture, v_textureCoordinates);\n' +
                // '    vec4 bColor = bloomColor + opaqueBloomColor;\n' +
                '    vec4 bColor = bloomColor;\n' +
                //计算 luminosityHigh
                // '  vec3 luma = vec3( 0.299, 0.587, 0.114 ); \n'+
                // '  float v = dot( bColor.xyz, luma );\n'+
                // '  vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );\n'+
                // '  float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );\n'+
                // '  gl_FragColor = mix( outputColor, bColor, alpha);\n'+
                'vec3 sceneColor = czm_RGBToHSB(bColor.xyz);\n' +
                'sceneColor.z += -brightness;\n' +
                'sceneColor = czm_HSBToRGB(sceneColor);\n' +
                'float factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));\n' +
                'sceneColor = factor * (sceneColor - vec3(0.5)) + vec3(0.5);\n' +
                'gl_FragColor = vec4(sceneColor,1.0);\n'+
                // 'gl_FragColor = bColor;\n'+
                '}\n';


            this.nMips = 5;
            this.separableBlur = [];
            let kernelSizeArray = [ 3, 5, 7, 9, 11 ];
            let resx = Math.round( width / 2 );
            let resy = Math.round( height / 2 );

            for (let i = 0; i < this.nMips; i++) {
                this.separableBlur.push(this.getSeperableBlurMaterial(kernelSizeArray[ i ]))

                this.separableBlur[i].texSize = new Cartesian2(resx,resy);
                resx = Math.round( resx / 2 );
                resy = Math.round( resy / 2 );
            }

            let name = createGuid();
            let bloomPass = new PostProcessStage({
                name : 'czm_bloom_lxg' + name,
                fragmentShader : that.bloomPass,
                uniforms: {
                    contrast: 128.0,
                    brightness: -0.3,
                    defaultColor: new Cartesian3(0,0,0),
                    defaultOpacity: 0,
                    luminosityThreshold: 0.85,
                    smoothWidth: 0.01
                }
            });

            let inputFrameTexture = bloomPass.name;

            let blurState = [];
            for (let i = 0; i < this.nMips; i++) {
                let texSize = this.separableBlur[i].texSize;
                let shader = this.separableBlur[i].shader;
                let blurX = new PostProcessStage({
                    name: 'czm_unreal_blur' + "_x_direction_" + i,
                    fragmentShader: shader,
                    uniforms: {
                        texSize: texSize,
                        direction: new Cartesian2(1.0,0.0),
                        colorTexture: inputFrameTexture
                    },
                    sampleMode: PostProcessStageSampleMode.LINEAR,
                });
                let blurY = new PostProcessStage({
                    name: 'czm_unreal_blur' + "_y_direction_"+i,
                    fragmentShader: shader,
                    uniforms: {
                        texSize: texSize,
                        direction: new Cartesian2(0.0,1.0),
                        colorTexture: blurX.name
                    },
                    sampleMode: PostProcessStageSampleMode.LINEAR,
                });
                inputFrameTexture = blurY.name;
                blurState.push(blurX, blurY);
            }

            let unrealBlur = new PostProcessStageComposite({
                name: name,
                stages: blurState,
                uniforms: {},
            });

            let generateComposite = new PostProcessStageComposite({
                name: "czm_unreal_bloom_contrast_bias_blur",
                stages: [bloomPass, unrealBlur],
                inputPreviousStageTexture: false,
            });
            let compositeShaderFS = this.getCompositeShader();
            let bloomTintColors = [new Cartesian3(1,1,1),new Cartesian3(1,1,1),new Cartesian3(1,1,1),new Cartesian3(1,1,1),new Cartesian3(1,1,1)];
            //bloomPass
            let bloomComposite = new PostProcessStage({
                name: "czm_unreal_bloom_generate_composite",
                fragmentShader: compositeShaderFS,
                uniforms: {
                    blurTexture1: blurState[0].name,
                    blurTexture2: blurState[1].name,
                    blurTexture3: blurState[2].name,
                    blurTexture4: blurState[3].name,
                    blurTexture5: blurState[4].name,
                    bloomStrength : 0.8,
                    bloomRadius : 0.01,
                    bloomFactors : [ 1.0, 0.8, 0.6, 0.4, 0.2 ],
                    bloomTintColors : bloomTintColors,
                }
            });

            let stages = this.scene.postProcessStages;
            if(stages.contains(this.composite_Final)) {
                stages.remove(this.composite_Final);
            }
            this.composite_Final = new PostProcessStageComposite({
                name: "czm_unreal_final",
                stages: [generateComposite, bloomComposite],
                inputPreviousStageTexture: false,
                uniforms: {},
            });


            // if(stages.contains(this.bloomPass)) {
            //     stages.remove(this.bloomPass);
            // }
            stages.add(this.composite_Final);
            // stages.add(bloomPass);
        } else {
            console.warn('警告——浏览器不支持webgl2!!')
        }

    }
}







// GBuffer.prototype.renderToScreen = function(stages){
//     let that = this;

//     let name = createGuid();
//     let bloomPass = new PostProcessStage({
//         name : 'czm_bloom_lxg' + name,
//         fragmentShader : that.bloomPass,
//         uniforms: {
//             contrast: 128.0,
//             brightness: -0.3,
//         }
//     });

//     let inputFrameTexture = bloomPass.name;

//     let blurState = [];
//     for (let i = 0; i < this.nMips; i++) {
//         let texSize = this.separableBlur[i].texSize;
//         let shader = this.separableBlur[i].shader;
//         let blurX = new PostProcessStage({
//             name: 'czm_unreal_blur' + "_x_direction_" + i,
//             fragmentShader: shader,
//             uniforms: {
//                 texSize: texSize,
//                 direction: new Cartesian2(1.0,0.0),
//                 colorTexture: inputFrameTexture
//             },
//             sampleMode: PostProcessStageSampleMode.LINEAR,
//         });
//         let blurY = new PostProcessStage({
//             name: 'czm_unreal_blur' + "_y_direction_"+i,
//             fragmentShader: shader,
//             uniforms: {
//                 texSize: texSize,
//                 direction: new Cartesian2(0.0,1.0),
//                 colorTexture: blurX.name
//             },
//             sampleMode: PostProcessStageSampleMode.LINEAR,
//         });
//         inputFrameTexture = blurY.name;
//         blurState.push(blurX, blurY);
//     }

//     let unrealBlur = new PostProcessStageComposite({
//         name: name,
//         stages: blurState,
//         uniforms: {},
//     });

//     let generateComposite = new PostProcessStageComposite({
//         name: "czm_unreal_bloom_contrast_bias_blur",
//         stages: [bloomPass, unrealBlur],
//         inputPreviousStageTexture: false,
//     });
//     let compositeShaderFS = this.getCompositeShader();
//     let bloomTintColors = [new Cartesian3(1,1,1),new Cartesian3(1,1,1),new Cartesian3(1,1,1),new Cartesian3(1,1,1),new Cartesian3(1,1,1)];
//     //bloomPass
//     let bloomComposite = new PostProcessStage({
//         name: "czm_unreal_bloom_generate_composite",
//         fragmentShader: compositeShaderFS,
//         uniforms: {
//             blurTexture1: blurState[0].name,
//             blurTexture2: blurState[1].name,
//             blurTexture3: blurState[2].name,
//             blurTexture4: blurState[3].name,
//             blurTexture5: blurState[4].name,
//             bloomStrength : 1.5,
//             bloomRadius : 0.01,
//             bloomFactors : [ 1.0, 0.8, 0.6, 0.4, 0.2 ],
//             bloomTintColors : bloomTintColors,
//         }
//     });

//     let composite_Final = new PostProcessStageComposite({
//         name: "czm_unreal_final",
//         stages: [generateComposite, bloomComposite],
//         inputPreviousStageTexture: false,
//         uniforms: {},
//     });
//     stages.add(composite_Final);
// }



export default BetterBloom;