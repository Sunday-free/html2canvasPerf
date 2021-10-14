import PostProcessStage from 'cesium/Scene/PostProcessStage'
import { GeoDepository } from "../core/GeoDepository";

/**
 * 天气系统（雨、雪、夜晚、白天、大气）
 *
 * @constructor
 * @ignore
 */
class WeatherSystem {
    constructor(){
        this._lastStage = undefined;
        this._scene = false; // 是否存在场景
        this.viewer= GeoDepository.viewer
        this.geomap= GeoDepository.geomap;
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

        this.RAIN_FRAGMENT_SHADER = "uniform sampler2D colorTexture;\n" +
            "varying vec2 v_textureCoordinates;\n" +
            "float hash(float x){\n" +
            "   return fract(sin(x * 133.3) * 13.13);\n" +
            "}\n" +
            "void main(void){\n" +
            "   float time = czm_frameNumber / 180.0;\n " +
            "   vec2 resolution = czm_viewport.zw;\n" +
            "   vec2 uv=(gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);\n" +
            "   vec3 c=vec3(0.6, 0.7, 0.8);\n" +
            "   float a=-.4;\n" +
            "   float si=sin(a),co=cos(a);\n" +
            "   uv*=mat2(co,-si,si,co);\n" +
            "   uv*=length(uv+vec2(0,4.9))*.3+1.;\n" +
            "   float v=1.-sin(hash(floor(uv.x*100.))*2.);\n" +
            "   float b=clamp(abs(sin(20.*time*v+uv.y*(5./(2.+v))))-.95,0.,1.)*20.;\n" +
            "   c*=v*b;\n" +
            "   gl_FragData[0] = mix(texture2D(colorTexture, v_textureCoordinates), vec4(c,1), 0.5);\n" +
            " }\n";

        this.SNOW_FRAGMENT_SHADER = "uniform sampler2D colorTexture;\n" +
            "varying vec2 v_textureCoordinates;\n" +
            "float snow(vec2 uv,float scale){\n" +
            "   float time = czm_frameNumber / 60.0;\n" +
            "   float w=smoothstep(1.,0.,-uv.y*(scale/10.));if(w<.1)return 0.;\n" +
            "   uv+=time/scale;uv.y+=time*2./scale;uv.x+=sin(uv.y+time*.5)/scale;\n" +
            "   uv*=scale;\n" +
            "   vec2 s=floor(uv),f=fract(uv),p;\n" +
            "   float k=3.,d;\n" +
            "   p=.5+.35*sin(11.*fract(sin((s+p+scale)*mat2(7,3,6,5))*5.))-f;\n" +
            "   d=length(p);\n" +
            "   k=min(d,k);\n" +
            "   k=smoothstep(0.,k,sin(f.x+f.y)*0.01);\n" +
            "   return k*w;\n" +
            "}\n" +
            "void main(void){\n" +
            "   vec2 resolution = czm_viewport.zw;\n                                " +
            "   vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);\n                                " +
            "   vec3 finalColor=vec3(0);\n" +
            "   float c = 0.0;\n" +
            "   c+=snow(uv,30.)*.0;\n" +
            "   c+=snow(uv,20.)*.0;\n" +
            "   c+=snow(uv,15.)*.0;\n" +
            "   c+=snow(uv,10.);\n" +
            "   c+=snow(uv,8.);\n" +
            "   c+=snow(uv,6.);\n" +
            "   c+=snow(uv,5.);\n" +
            "   finalColor=(vec3(c)); \n" +
            "   gl_FragData[0] = mix(texture2D(colorTexture, v_textureCoordinates), vec4(finalColor,1), 0.5);\n" +
            "}\n";

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
     * 雨
     */
    showRain () {

        this.clear();
        let stageRain = new PostProcessStage({
            name: 'czm_rain',
            fragmentShader: this.RAIN_FRAGMENT_SHADER
        });
        this.viewer.scene.postProcessStages.add(stageRain);
        this._lastStage = stageRain;
        this._scene = true;
        this.viewer.scene.preRender.addEventListener( this.eventCallback);
        this.geomap.render();
    };
    /**
     * 雪
     */
    showSnow () {
        this.clear();
        let stageSnow = new PostProcessStage({
            name: 'czm_snow',
            fragmentShader: this.SNOW_FRAGMENT_SHADER
        });
        this.viewer.scene.postProcessStages.add(stageSnow);
        this._lastStage = stageSnow;
        this._scene = true;
        this.viewer.scene.preRender.addEventListener( this.eventCallback);
        this.geomap.render();

    };
    /**
     * 夜晚
     */
    showNight () {
        this.clear();
        this.setSkyAtmosphere(true);
        let stageNight = new PostProcessStage({
            name: 'czm_night',
            fragmentShader: this.NIGHT_FRAGMENT_SHADER
        });
        this.viewer.scene.postProcessStages.add(stageNight);
        this.lastStage = stageNight;
        this._scene = true;
    };
    /**
     * 白天
     */
    showDay () {
        this.clear();
        this.setSkyAtmosphere(false);
        let stageDay = new PostProcessStage({
            name: 'czm_day',
            fragmentShader: this.DAY_FRAGMENT_SHADER
        });
        this.viewer.scene.postProcessStages.add(stageDay);
        this.lastStage = stageDay;
        this._scene = true;
    };
    /**
     * 大气
     * @param {Boolean} isNight  是否为夜晚
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
     * 移除天气系统
     */
    clear () {
        let geomap=this.geomap
        this.viewer.scene.preRender.removeEventListener( this.eventCallback)
        this.setSkyAtmosphere(false);
        this._lastStage && this.viewer.scene.postProcessStages.remove(this._lastStage);
        this._lastStage = undefined;
        this._scene = false;
    };

}

export  default WeatherSystem