// import ODLineImg from "./Base64Img/ODLineImg"
import buildModuleUrl from "cesium/Core/buildModuleUrl";
/**
 * ODLine  OD线效果
 * @alias ODLineMaterial
 *
 * @param {Object} options   配置
 * @param {String} [options.color='#f7fcff'] 线颜色，默认为'#f7fcff'。
 * @param {String} [options.image=buildModuleUrl('./resource/images/effect/odline.png')] 线的图片材质，默认为静态资源下'./resource/images/effect/odline.png'。
 * @param {Number} [options.rate=6] 线的速度，默认为6。
 * @ignore
 */
class ODLineMaterial{
    constructor(options){
        let image = new Image();
        image.src = options.image||buildModuleUrl('./resource/images/effect/odline.png');
        return new BOSGeo.Material({
            translucent : true,
            fabric : {
                uniforms: {
                    odColor: options.color||'#f7fcff',
                    t_rate: options.rate ||2,
                    glowImage: image
                },
                source: 
                'float rand(float n){\n' +
                '    return fract(sin(n) * 43758.5453123);\n' +
                '}\n'+
                'float noise(float p){\n' +
                '    float fl = floor(p);\n' +
                '    float fc = fract(p);\n' +
                '    return mix(rand(fl), rand(fl + 1.0), fc);\n' +
                '}\n'+
                'czm_material czm_getMaterial(czm_materialInput m){\n'+
                '   czm_material dm = czm_getDefaultMaterial(m);\n'+
                '   vec2 st = m.st;\n'+
                '   vec4 color = vec4(odColor.rgb,0.);\n' +
                '   st.s -= fract(czm_frameNumber / t_rate) * 2. -1.;\n'+
                // '   st.s -= floor(st.s);\n'+
        
                '   vec4 tColor = texture2D(glowImage, st);\n'+
                '   vec4 tmp = tColor * color; \n'+
                '   vec4 outColor = czm_gammaCorrect(tmp);\n' +
                // '   dm.diffuse = tColor.rgb;\n'+
                '   dm.diffuse = outColor.xyz;\n'+
                '   dm.emission = outColor.rgb * 100.0;\n'+
                '   dm.alpha = pow(tColor.a ,20.);\n'+
                '   return dm;\n'+
                '}'
            }
        });
       
    }

}
export default ODLineMaterial;