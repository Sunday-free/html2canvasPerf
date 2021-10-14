import PostProcessStage from "cesium/Scene/PostProcessStage";
import buildModuleUrl from "cesium/Core/buildModuleUrl";
import Resource from "cesium/Core/Resource";
import Texture from "cesium/Renderer/Texture";
import Sampler from "cesium/Renderer/Sampler";
import Color from 'cesium/Core/Color';
import Cartesian4 from 'cesium/Core/Cartesian4'
import PostProcessStageLibrary from 'cesium/Scene/PostProcessStageLibrary';
import { GeoDepository } from "../core/GeoDepository";
import Util from "../utils/Util";

/**
 * 天气效果,下雨和下雪、雾、夜晚、白天
 * @alias WeatherEffect
 *
 * @class
 * @example
 let ws = new BOSGeo.WeatherEffect()
 ws.swicthRain(); //下雨
 ws.swicthSnow(); //下雪
 ws.swicthFog(0.5); //雾
 ws.swicthDay();  //白天
 ws.swicthNight(); //夜晚
 */
class WeatherEffect {    

    constructor() {
        this.geomap = GeoDepository.geomap;
        this.viewer = GeoDepository.viewer;
        this.stages = this.viewer.scene.postProcessStages;
        this.noiseReady = Resource.fetchImage(buildModuleUrl('resource/images/tex16.png')).then(function (image) {
            return new Promise( (resolve) =>{
                resolve(image);
            });
        });

        this.NIGHT_FRAGMENT_SHADER = "uniform sampler2D colorTexture;\n" +
            "varying vec2 v_textureCoordinates;\n" +
            "void main(void) {\n" +
            "   vec4 color = vec4(0, 0, 0, 0.6);\n" +
            "   gl_FragData[0] = mix(texture2D(colorTexture, v_textureCoordinates), color, 0.5);\n" +
            "}\n";

        this.DAY_FRAGMENT_SHADER = "uniform sampler2D colorTexture;\n" +
            "varying vec2 v_textureCoordinates;\n" +
            "void main(void) {\n" +
            "   gl_FragData[0] = texture2D(colorTexture, v_textureCoordinates);\n" +
            "}\n";

        this.rainStage = undefined;
        this.snowStage = undefined;
        this.fogStage = undefined;
        this.stageDayNight = undefined;
        this.viewer.scene.requestRenderMode = false;
        GeoDepository.geomap.requestRenderModeMethods.push('WeatherEffect');
        this.eventCallback = this.forceRender(this.geomap);
    }

    /**
     * 重新渲染
     * @param {Geomap} geomap geomap地图对象
     * @return {Function}  回调函数
     * @private
     */
    forceRender (geomap) {
        return function(){
            geomap.render();
        }
    }
    /**
     * 下雨shader
     * @returns {string}
     * @private
     */
    getRainShader() {
        let rain = 
        'uniform sampler2D colorTexture; \n' +
        'uniform sampler2D normalTexture; \n' +
        'uniform sampler2D depthTexture; \n' +
        'uniform sampler2D m_NoiseTexture; \n' +
        'varying vec2 v_textureCoordinates;\n' +
        'const float PI = 3.14159265352;\n'+
        'float sqr(float num) {\n'+
        '   return num * num;\n'+
        '}\n'+
        'float saturate(float num) {\n'+
        '   return clamp(num, 0.0, 1.0);\n'+
        '}\n'+
        'float D_GGX(float Roughness, float NdotH) {\n'+
        '   float a = Roughness * Roughness;\n'+
        '   float a2 = a * a;\n'+
        '   float d = (NdotH * a2 - NdotH) * NdotH + 1.0;\n'+
        '   return a2 / (PI * d * d);\n'+
        '}\n'+
        'float G_GGX(float Roughness, float NdotL, float NdotV) {\n'+
        '   float k = Roughness * Roughness * 0.5;\n'+
        '   float Vis_SchlickV = NdotV * (1.0 - k) + k;\n'+
        '   float Vis_SchlickL = NdotL * (1.0 - k) + k;\n'+
        '   return 0.25 / (Vis_SchlickV * Vis_SchlickL);\n'+
        '}\n'+
        'float SpecGGX(vec3 V, vec3 L, vec3 N, float Roughness) {\n' +
        '   if(Roughness == 1.) return 0.;\n' +
        '   vec3 H = normalize(L + V);\n' +
        '   float NdotH = saturate(dot(N, H));\n' +
        '   float NdotL = saturate(dot(N, L));\n' +
        '   float NdotV = saturate(dot(N, V));\n' +
        '   float D = D_GGX(Roughness, NdotH);\n' +
        '   float G = G_GGX(Roughness, NdotL, NdotV);\n' +
        '   return D * G;\n' +
        '}\n' +
        'vec4 getWorldPosition(vec2 uv, float depth) {\n' +
        '   vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));\n' +
        '   vec4 posInCamera = czm_inverseProjection * vec4(xy, depth, 1.0);\n' +
        '   posInCamera = posInCamera / posInCamera.w;\n' +
        '   return posInCamera;\n' +
        '}\n' +
        'float flash(vec3 point, vec3 normal) {\n' +
        '   vec3 pos = point;\n' +
        '   vec3 nor = normal;\n' +
        '   float shiny = 5.0;\n' +
        '   float dif;\n' +
        '   dif = clamp(dot(nor, -czm_sunDirectionWC), 0.0, 1.0);\n' +
        '   float brdf = 0.05 * dif;\n' +
        '   float ti = mod(czm_frameNumber * 0.02, 12.0);\n' +
        '   float f = 0.0;\n' +
        '   for (int i = 0; i < 4; i++) {\n' +
        '       f += .25;\n' +
        '       if (i == 2)\n' +
        '           f -= .1;\n' +
        '       brdf += smoothstep(1.3 + f, 1.35 + f, ti) * smoothstep(1.8 + f, 1.4 + f, ti) * 0.8;\n' +
        '   }\n' +
        '   brdf *= dif;\n' +
        '   return brdf;\n' +
        '}\n' +
        'float texNoise1(in vec3 x, float lod_bias) {\n' +
        '    vec3 p = floor( x );\n' +
        '    vec3 f = fract( x );\n' +
        '    f = f * f * ( 3.0 - 2.0 * f );\n' +
        '    vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;\n' +
        '    vec2 rg = texture2D(m_NoiseTexture, uv*(1./256.0), lod_bias ).yx;\n' +
        '    return mix( rg.x, rg.y, f.z );\n' +
        '}\n' +
        'float ground(vec3 point) {\n' +
        '    vec3 uvw = point;\n' +
        '    uvw *= 20.0;\n' +
        '    uvw.y += czm_frameNumber * 20.0;\n' +
        '    float dens = texNoise1( uvw, -100.0 );\n' +
        '    dens = pow( dens, 5. );\n' +
        '    dens=sin(dens);\n' +
        '    return dens;\n' +
        '}\n' +
        'void main() { \n' +
        '   vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
        // '   float depth = czm_unpackDepth(texture2D(depthTexture, v_textureCoordinates));\n'+
        '   float depth = czm_readDepth(depthTexture, v_textureCoordinates);\n'+
        '   vec4 rainColor;\n'+
        '   if(depth < 1.) {\n'+
        '       vec3 wPosition = getWorldPosition(v_textureCoordinates, depth).xyz;\n'+
        '       float rainingRatio = 0.8 * ground(wPosition);\n'+
        '       vec3 N = texture2D(normalTexture, v_textureCoordinates).xyz;\n'+
        '       if (N != vec3(0.)) {\n'+
        '           vec3 wNormal = N * 2. -1.;\n'+
        '           rainingRatio *= clamp(dot(wNormal, vec3(0., 1., 0.)), 0., 1.);\n'+
        '           vec3 cameraDir = normalize(wPosition - (czm_view * vec4(czm_viewerPositionWC,1.)).xyz);\n'+
        '           float specRatio = SpecGGX(cameraDir, czm_sunDirectionWC, wNormal, 0.55);\n'+
        '           rainingRatio = mix(rainingRatio += specRatio, rainingRatio *= specRatio, specRatio);\n'+
        '           color.rgb = mix(color.rgb, vec3(1.), rainingRatio);\n'+
        '           float flash = flash(wPosition, wNormal);\n'+
        '           color.rgb = mix(color.rgb, vec3(1.), flash);\n'+
        '       }\n'+
        '   }\n'+
        '   vec2 q = v_textureCoordinates;\n' +
        '   vec2 p = q * 2.0 - 1.0;\n' +
        '   p.x *= czm_viewport.z/ czm_viewport.w;\n' +
        '   float time = czm_frameNumber/500.0;\n' +
        '   vec2 st = p * vec2(.5, .01) + vec2(time * 0.3 - q.y * .15, time * 0.3);\n' +
        '   float f = texture2D(m_NoiseTexture, st).y * texture2D(m_NoiseTexture, st * .773).x * 1.55;\n' +
        '   f = clamp(pow(abs(f), 23.0) * 13.0, 0.0, q.y * .14) * (0.5 * .7 + 0.5);\n' +
        '   color.rgb += vec3(f);\n' +
        '   color.a = 1.;\n' +
        '   gl_FragColor = color;\n' +
        // '   gl_FragColor = vec4(depth);\n' +
        '}\n';
        return rain;
    }

    /**
     * 下雪shader
     *  @returns {string} 下雪shader
     * @private
     */
    getSnowShader() {
        let snow = 
        'uniform sampler2D colorTexture; \n' +
        'uniform sampler2D normalTexture; \n' +
        'uniform sampler2D depthTexture; \n' +
        'uniform sampler2D m_NoiseTexture; \n' +
        'varying vec2 v_textureCoordinates;\n' +
        'const float PI = 3.14159265352;\n'+
        'float sqr(float num) {\n'+
        '   return num * num;\n'+
        '}\n'+
        'float saturate(float num) {\n'+
        '   return clamp(num, 0.0, 1.0);\n'+
        '}\n'+
        'void main() { \n' +
        '   vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
        '   float depth = czm_readDepth(depthTexture, v_textureCoordinates);\n'+
        '   if(depth < 1.) {\n'+
        '       float snowRatio;\n'+
        '       vec3 N = (texture2D(normalTexture, v_textureCoordinates)).xyz;\n'+
        '       if (N != vec3(0.)) {\n'+
        '           snowRatio = dot(N * 2. -1., vec3(0., 1., 0.)) * 0.9;\n'+
        '           color.rgb = mix(color.rgb, vec3(1.), snowRatio);\n'+
        '       }\n'+
        '   }\n'+
        '   float snow = 0.0;\n' +
        '   float time = czm_frameNumber * 0.015;\n' +
        '   float gradient = (1.0 - float(gl_FragCoord.y / czm_viewport.z)) * 0.4;\n' +
        '   for (int k = 0; k < 6; k++) {\n' +
        '       for (int i = 0; i < 12; i++) {\n' +
        '           float cellSize = 2.0 + (float(i) * 3.0);\n' +
        '           float downSpeed = 0.3 + (sin(time * 0.4 + float(k + i * 20)) + 1.0) * 0.00008;\n' +
        '           vec2 uv = (gl_FragCoord.xy / czm_viewport.z)\n' +
        '           + vec2(0.01 * sin((time + float(k * 6185)) * 0.6 + float(i)) * (5.0 / float(i)),\n' +
        '           downSpeed * (time + float(k * 1352)) * (1.0 / float(i)));\n' +
        '           vec2 uvStep = (ceil((uv) * cellSize - vec2(0.5, 0.5)) / cellSize);\n' +
        '           float x = fract(sin(dot(uvStep.xy, vec2(12.9898 + float(k) * 12.0, 78.233 + float(k) * 315.156))) * 43758.5453 + float(k) * 12.0) - 0.5;\n' +
        '           float y = fract(sin(dot(uvStep.xy, vec2(62.2364 + float(k) * 23.0, 94.674 + float(k) * 95.0))) * 62159.8432 + float(k) * 12.0) - 0.5;\n' +
        '           float randomMagnitude1 = sin(time * 2.5) * 0.7 / cellSize;\n' +
        '           float randomMagnitude2 = cos(time * 2.5) * 0.7 / cellSize;\n' +
        '           float d = 5.0 * distance((uvStep.xy + vec2(x * sin(y), y) * randomMagnitude1 + vec2(y, x) * randomMagnitude2), uv.xy);\n' +
        '           float omiVal = fract(sin(dot(uvStep.xy, vec2(32.4691, 94.615))) * 31572.1684);\n' +
        '           if (omiVal < 0.08 ? true : false) {\n' +
        '               float newd = (x + 1.0) * 0.4 * clamp(1.9 - d * (15.0 + (x * 6.3)) * (cellSize / 1.4), 0.0, 1.0);\n' +
        '               snow += newd;\n' +
        '           }\n' +
        '       }\n' +
        '   }\n' +
        '   gl_FragColor = color + vec4(snow);\n' +
        '}\n';
        return snow;
    }

    /**
     * 雾shader
     * @param {Number} depthcolorAlph 深度阈值,越大雾浓度效果越大，反之效果越弱，范围0-1.0，默认是0.4.
     * @returns {string} 雾shader
     * @private
     */
    getFogShader(depthcolorAlph) {
        let alph
        if(depthcolorAlph||depthcolorAlph==0){
            if(depthcolorAlph==0){
                alph=0.99
            }else if(depthcolorAlph==1){
                alph=0.01
            }
            else{
                alph=1.0-depthcolorAlph
            }
        }else{
            alph=0.4
        }
        //大雾效果
        let bigFog ="  uniform sampler2D colorTexture;\n" +
        "  uniform sampler2D depthTexture;\n" +
        "  varying vec2 v_textureCoordinates;\n" +
        "  void main(void)\n" +
        "  {\n" +
        "      vec4 origcolor=texture2D(colorTexture, v_textureCoordinates);\n" +
        "      vec4 fogcolor=vec4(0.8,0.8,0.8,0.5);\n" +
        "\n" +
        "      float depth = czm_readDepth(depthTexture, v_textureCoordinates);\n" +
        "      vec4 depthcolor=texture2D(depthTexture, v_textureCoordinates);\n" +
        "\n" +
        "      float f=(depthcolor.r-"+alph+")/0.4;\n" +
        "      if(f<0.0) f=0.0;\n" +
        "      else if(f>1.0) f=1.0;\n" +
        "      gl_FragColor = mix(origcolor,fogcolor,f);\n" +
        "   }";

        let fog =
            "float getDistance(sampler2D depthTexture, vec2 texCoords) \n" +
            "{ \n" +
            "    float depth = czm_unpackDepth(texture2D(depthTexture, texCoords)); \n" +
            "    if (depth == 0.0) { \n" +
            "        return czm_infinity; \n" +
            "    } \n" +
            "    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth); \n" +
            "    return -eyeCoordinate.z / eyeCoordinate.w; \n" +
            "} \n" +
            "//计算雾化距离（当它远离眼睛位置时，系数变小）\n" +
            "float interpolateByDistance(vec4 nearFarScalar, float distance) \n" +
            "{ \n" +
            "    float startDistance = nearFarScalar.x;//雾化的起点距离 \n" +
            "    float startValue = nearFarScalar.y; \n" +
            "    float endDistance = nearFarScalar.z; \n" +
            "    float endValue = nearFarScalar.w; \n" +
            "    float t = clamp((distance - startDistance) / (endDistance - startDistance), 0.0, 1.0); \n" +
            "    return mix(startValue,endValue,t ); \n" +
            "} \n" +
            "vec4 alphaBlend(vec4 sourceColor, vec4 destinationColor) \n" +
            "{ \n" +
            "    return sourceColor * vec4(sourceColor.aaa, 1.0) + destinationColor * (1.0 - sourceColor.a); \n" +
            "} \n" +
            "uniform sampler2D colorTexture; \n" +
            "uniform sampler2D depthTexture; \n" +
            "uniform vec4 fogByDistance; \n" +
            "uniform vec4 fogColor; //雾的颜色\n" +
            "varying vec2 v_textureCoordinates; \n" +
            "void main(void) \n" +
            "{ \n" +
            "    float distance = getDistance(depthTexture, v_textureCoordinates); \n" +
            "    vec4 sceneColor = texture2D(colorTexture, v_textureCoordinates); \n" +
            "    float blendAmount = interpolateByDistance(fogByDistance, distance); \n" +
            "    vec4 finalFogColor = vec4(fogColor.rgb, fogColor.a * blendAmount); \n" +
            "    gl_FragColor = alphaBlend(finalFogColor, sceneColor); \n" +
            "} \n";
        return bigFog;
    }

    /**
     * 开启下雨效果
     * @example
     ws.swicthRain()
     */
    swicthRain() {
        let viewer = this.viewer;
        viewer.scene.requestRenderMode = false;
        let stages = this.stages;
        // if(stages.contains(this.snowStage)) {
        //     stages.remove(this.snowStage);
        // }
        if(stages.contains(this.rainStage)) {
            stages.remove(this.rainStage);
        }
        let scene = viewer.scene;
        let context = scene.context;
        // 添加是否已使用MRT判断和提示
        if (!context.useMRT || !context.webgl2) {
            console.error('该功能需要在地图初始化时设置‘requestWebgl2: true’和‘useMRT:true’!!');
            return;
        }
        let rainShader = this.getRainShader();
        this.noiseReady.then( (image)=> {
            let tex = new Texture({
                context: context,
                width: image.width,
                height: image.height,
                source: image,
                sampler: Sampler.REPEAT
            });
            let rainPass = new PostProcessStage({
                name: 'rain_lxg',
                fragmentShader: rainShader,
                uniforms: {
                    m_NoiseTexture: tex
                }
            });
            this.rainStage = rainPass;
            stages.add(rainPass);
        });

    }

    /**
     * 开启下雪效果
     * @example
     ws.swicthSnow()
     */
    swicthSnow () {
        let viewer = this.viewer;
        let stages = this.stages;
        if(stages.contains(this.snowStage)) {
            stages.remove(this.snowStage);
        }
        let scene = viewer.scene;
        let context = scene.context;
        // 添加是否已使用MRT判断和提示
        if (!context.useMRT || !context.webgl2) {
            console.error('该功能需要在地图初始化时设置‘requestWebgl2: true’和‘useMRT:true’!!');
            return;
        }
        let snowShader = this.getSnowShader();
        this.noiseReady.then( (image)=> {
            let tex = new Texture({
                context: context,
                width: image.width,
                height: image.height,
                source: image,
                sampler: Sampler.REPEAT
            });
            let snowPass = new PostProcessStage({
                name: 'snow_lxg',
                fragmentShader: snowShader,
                uniforms: {
                    m_NoiseTexture: tex
                }
            });
            this.snowStage = snowPass;
            stages.add(snowPass);
        });

    }

    /**
     * 开启雾效果
     * @param{Number} depthcolorAlph 深度阈值,越大雾浓度效果越大，反之效果越弱，范围0-1.0
     * @example
     ws.swicthFog(0.5)
     */
    swicthFog (depthcolorAlph) {
        let viewer = this.viewer;
        let stages = this.stages;
        if(stages.contains(this.fogStage)) {
            stages.remove(this.fogStage);
        }
        // let scene = viewer.scene;
        // let context = scene.context;
        let fogShader = this.getFogShader(depthcolorAlph);
        let fogPass
        // this.noiseReady.then( (image)=> {
        //     let tex = new Texture({
        //         context: context,
        //         width: image.width,
        //         height: image.height,
        //         source: image,
        //         sampler: Sampler.REPEAT
        //     });
        fogPass =PostProcessStageLibrary.createBrightnessStage();
        // fogPass.uniforms.brightness=0.5;//整个场景通过后期渲染变亮 1为保持不变 大于1变亮 0-1变暗 uniforms后面为对应glsl里面定义的uniform参数

        fogPass = new PostProcessStage({
                name: 'fog_lxg',
                fragmentShader: fogShader,
                uniforms: {
                    // m_NoiseTexture: tex,
                    fogByDistance: new Cartesian4(10, 0.0, 1500, 0.5),
                    // fogColor: new Color(1.0, 1.0, 1.0, 1.0),
                    // fogColor: Color.BLACK.withAlpha(0.5),
                }
            });
            // fogPass.enabled=true;
            this.fogStage = fogPass;
            stages.add(fogPass);
    }

    /**
     * 夜晚
     * @example
     ws.swicthNight()
     */
    swicthNight () {
        // this.clear();
        this.setSkyAtmosphere(true);

        let viewer = this.viewer;
        let stages = this.stages;
        if(stages.contains(this.stageDayNight)) {
            stages.remove(this.stageDayNight);
        }

        let stageDayNight = new PostProcessStage({
            name: 'czm_night',
            fragmentShader: this.NIGHT_FRAGMENT_SHADER
        });

        this._scene = true;
        this.stageDayNight = stageDayNight;
        stages.add(stageDayNight);
    };
    /**
     * 白天
     * @example
     ws.swicthDay()
     */
    swicthDay () {
        // this.clear();
        this.setSkyAtmosphere(false);
        let viewer = this.viewer;
        let stages = this.stages;
        if(stages.contains(this.stageDayNight)) {
            stages.remove(this.stageDayNight);
        }

        let stageDayNight = new PostProcessStage({
            name: 'czm_day',
            fragmentShader: this.DAY_FRAGMENT_SHADER
        });
        this._scene = true;
        this.stageDayNight = stageDayNight;
        stages.add(stageDayNight);

    };
    /**
     * 是否添加大气系统
     * @param {Boolean} isNight  是否为夜晚
     * @private
     */
    setSkyAtmosphere (isNight) {
        let skyAtmosphere = this.viewer.scene.skyAtmosphere;
        if (isNight) {
            skyAtmosphere.hueShift = -0.8;
            skyAtmosphere.saturationShift = -0.7;
            skyAtmosphere.brightnessShift = -0.33;
        } else {
            skyAtmosphere.brightnessShift = 0;
            skyAtmosphere.hueShift = 0;
            skyAtmosphere.saturationShift = 0;
        }
    };

    /**
     * 移除夜晚白天效果
     * @example
     ws.clear()
     */
    clear () {
        this.viewer.scene.preRender.removeEventListener( this.eventCallback)
        this.setSkyAtmosphere(false);
        let stages = this.stages;
        if(stages.contains(this.stageDayNight)) {
            stages.remove(this.stageDayNight);
        }
        // this.stageDayNight && this.viewer.scene.postProcessStages.remove(this.stageDayNight);
        this.stageDayNight = undefined;
        this._scene = false;
    };

    /**
     * 移除天气系统
     * @example
     ws.remove();
     */
    remove(){
        Util.removeFromArray(GeoDepository.geomap.requestRenderModeMethods, 'WeatherEffect');//移除调用实时渲染的方法
        GeoDepository.geomap._requestRenderModeCheck();
        this.stopRain();
        this.stopSnow();
        this.stopFog();
        this.clear();
    }
    /**
     * 停止下雨
     * @example
     ws.stopRain()
     */
    stopRain(){
        let stages = this.stages;
        if(stages.contains(this.rainStage)) {
            stages.remove(this.rainStage);
        }
        this.geomap.render();
    }

    /**
     * 停止下雪
     * @example
     ws.stopSnow()
     */
    stopSnow(){
        let stages = this.stages;
        if(stages.contains(this.snowStage)) {
            stages.remove(this.snowStage);
        }
        this.geomap.render();
    }
    /**
     * 停止雾
     * @example
     ws.stopFog()
     */
    stopFog(){
        let stages = this.stages;
        if(stages.contains(this.fogStage)) {
            stages.remove(this.fogStage);
        }
        this.geomap.render();
    }
}


export default WeatherEffect;