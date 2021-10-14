import PostProcessStage from "cesium/Scene/PostProcessStage";

/**
 * 渲染SSR
 * @ignore
 */
class SSR {
    constructor(viewer) {
        this.viewer = viewer;
    }

    /**
     * 获取SSR的Shader
     * @return {string} SSR的Shader
     */
    getSSRShader() {
        let ssr = 
        'uniform sampler2D colorTexture; \n' +
        'uniform sampler2D normalTexture; \n' +
        'uniform sampler2D depthTexture; \n' +
        'uniform float m_Roughness; \n' +
        'uniform float m_Metallic; \n' +
        'varying vec2 v_textureCoordinates;\n' +
        'float rand(vec2 co) {\n'+
        '   return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);\n'+
        '}\n'+
        "float getDepth(vec4 depth)\n" +
        "{\n" +
           "float z_window = czm_unpackDepth(depth);\n" +
           "z_window = czm_reverseLogDepth(z_window);\n" +
           "float n_range = czm_depthRange.near;\n" +
           "float f_range = czm_depthRange.far;\n" +
           "return (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n" +
        "}\n" +
        'float linearizeDepth(float depth) {\n'+
        "    float n_range = czm_currentFrustum.x;\n" +
        "    float f_range = czm_currentFrustum.y;\n" +
        '   return (2.0 * n_range) / (f_range + n_range - depth * (f_range - n_range));\n'+
        // '   float z_ndc = (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n' +
        '}\n'+
        // 'float linearizeDepth(float depth) {\n'+
        // '    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);\n'+
        // '    return eyeCoordinate.z / eyeCoordinate.w;\n'+
        // '}\n'+
        'vec3 convertCameraSpaceToScreenSpace(vec3 cameraSpace) {\n'+
        '   vec4 clipSpace = czm_projection * vec4(cameraSpace, 1);\n'+
        '   vec3 NDCSpace = clipSpace.xyz / clipSpace.w;\n' +
        '   vec3 screenSpace = 0.5 * NDCSpace + 0.5;\n' +
        '   return screenSpace;\n'+
        '}\n'+
        'vec3 getViewPosition(vec2 uv) {\n' +
        // '   float depth = czm_readDepth(depthTexture, uv);\n' +
        '   float depth = getDepth(texture2D(depthTexture, v_textureCoordinates));\n' +
        '   vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));\n' +
        '   vec4 posInCamera = czm_inverseProjection * vec4(xy, depth , 1.0);\n' +
        '   posInCamera = posInCamera / posInCamera.w;\n' +
        '   return posInCamera.xyz;\n' +
        '}\n' +
        'vec3 getViewNormal(vec2 uv) {\n' +
        '   vec4 wNormalTex = texture2D(normalTexture, uv);\n' +
        // '   return normalize((czm_view * vec4( wNormalTex.xyz * 2. - 1., 0.)).xyz);\n' +
        // '   return normalize((czm_view * ( wNormalTex * 2. - 1.)).xyz));\n' +
        '   return normalize((czm_view * vec4(wNormalTex.xyz * 2. - 1., 0.)).xyz);\n' +
        '}\n' +
        'vec4 ComputeReflection(float roughness, vec3 viewSpacePos, vec3 viewSpaceNormal, vec3 viewSpaceCameraDir) {\n' +
        '   float initialStepAmount = .02;\n' +
        '   float stepRefinementAmount = .7;\n' +
        '   int maxRefinements = 10;\n' +
        '   int maxDepth = 1;\n' +
        '   vec3 cameraSpaceVector = normalize(reflect(viewSpaceCameraDir, viewSpaceNormal));\n' +
        '   vec3 screenSpacePosition = convertCameraSpaceToScreenSpace(viewSpacePos);\n' +
        '   vec3 cameraSpaceVectorPosition = viewSpacePos + cameraSpaceVector;\n' +
        '   vec3 screenSpaceVectorPosition = convertCameraSpaceToScreenSpace(cameraSpaceVectorPosition);\n' +
        '   vec3 screenSpaceVector = initialStepAmount * normalize(screenSpaceVectorPosition - screenSpacePosition);\n' +
        '   if (roughness > 0.) {\n' +
        '       float randomOffset1 = clamp(rand(v_textureCoordinates.xy), 0., 1.) * roughness / 1000.0;\n' +
        '       float randomOffset2 = clamp(rand(v_textureCoordinates.yy), 0., 1.) * roughness / 1000.0;\n' +
        '       screenSpaceVector += vec3(randomOffset1, randomOffset2, 0.);\n' +
        '   }\n' +
        '   vec3 oldPosition = screenSpacePosition + screenSpaceVector;\n' +
        '   vec3 currentPosition = oldPosition + screenSpaceVector;\n' +
        '   vec4 color = vec4(1., 1., 1., 0.);\n' +
        '   float count = 0.;\n' +
        '   int numRefinements = 0;\n' +
        '   int depth = 0;\n' +
        '   while (depth < maxDepth)\n' +
        '   {\n' +
        '       while (count < 500.) {\n' +
        '           if (currentPosition.x < 0. || currentPosition.x > 1. || currentPosition.y < 0. || currentPosition.y > 1. || currentPosition.z < 0.\n' +
        '               || currentPosition.z > 1.)\n' +
        '               break;\n' +
        '           vec2 samplePos = currentPosition.xy;\n' +
        '           float currentDepth = linearizeDepth(currentPosition.z);\n' +
        '           float sampleDepth = linearizeDepth(czm_readDepth(depthTexture, samplePos));\n' +
        // '           float currentDepth = currentPosition.z;\n' +
        // '           float sampleDepth = getDepth(texture2D(depthTexture, samplePos));\n' +
        '           float diff = currentDepth - sampleDepth;\n' +
        '           float error = length(screenSpaceVector);\n' +
        '           if (diff >= 0. && diff < error) {\n' +
        '               screenSpaceVector *= stepRefinementAmount;\n' +
        '               currentPosition = oldPosition;\n' +
        '               numRefinements++;\n' +
        '               if (numRefinements >= maxRefinements) {\n' +
        '                   vec3 normalAtPos = getViewNormal(samplePos);\n' +
        '                   float orientation = dot(cameraSpaceVector, normalAtPos);\n' +
        '                   if (orientation < 0.) {\n' +
        '                       color = texture2D(colorTexture, samplePos);\n' +
        '                   }\n' +
        '                   break;\n' +
        '               }\n' +
        '           }\n' +
        '           oldPosition = currentPosition;\n' +
        '           currentPosition = oldPosition + screenSpaceVector;\n' +
        '           count++;\n' +
        '       }\n' +
        '       depth++;\n' +
        '   }\n' +
        '   return color;\n' +
        '}\n' +
        'bool IsSky(vec2 uv) {\n' +
        '   return texture2D(depthTexture, uv).r >= 1.;\n' +
        '}\n' +
        'void main() { \n' +
        '   vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
        // '   float depth = czm_readDepth(depthTexture, v_textureCoordinates);\n' +
        '   float depth = getDepth(texture2D(depthTexture, v_textureCoordinates));\n' +
        // '   if (IsSky(v_textureCoordinates)) {\n' +
        // '       gl_FragColor = color;\n' +
        // '       return;\n' +
        // '   }\n' +
        '   float roughness = m_Roughness;\n' +
        '   float metallic = m_Metallic;\n' +
        '   if (roughness >= 1.) {\n' +
        '       gl_FragColor = color;\n' +
        '       return;\n' +
        '   }\n' +
        '   vec3 position = getViewPosition(v_textureCoordinates);\n' +
        '   vec3 normal = getViewNormal(v_textureCoordinates);\n' +
        '   vec3 viewSpaceCameraDir = normalize(position);\n' +
        '   vec4 refColor = ComputeReflection(roughness, position, normal, viewSpaceCameraDir);\n' +
        '   if (refColor.a <= 0.) {\n' +
        '       gl_FragColor = color;\n' +
        '       return;\n' +
        '   }\n' +
        '   float fresnel_pow = mix(5.0, 3.5, metallic);\n' +
        '   float fresnel = max(1.0 - abs(dot(normal, -viewSpaceCameraDir)), 0.0);\n' +
        '   fresnel = pow(fresnel, fresnel_pow);\n' +
        '   fresnel = clamp(fresnel, 0., 1.);\n' +
        '   refColor.rgb = mix(color.rgb, refColor.rgb, fresnel * refColor.a);\n' +
        '   color.rgb = mix(mix(color.rgb, refColor.rgb, 1. - roughness), refColor.rgb, metallic);\n' +
        '   gl_FragColor = color;\n' +
        // '   gl_FragColor = vec4(depth);\n' +
        '}\n';
        return ssr;
    }

    /**
     * 获取SSR的Shader2
     * @return {string} SSR的Shader2
     */
    getSSRShader2() {
        let ssr = 
        'uniform sampler2D colorTexture; \n' +
        'uniform sampler2D normalTexture; \n' +
        'uniform sampler2D depthTexture; \n' +
        'uniform float m_Roughness; \n' +
        'uniform float m_Metallic; \n' +
        'varying vec2 v_textureCoordinates;\n' +
        'struct ReflectionInfo {\n'+
        '   vec3 color;\n'+
        '   vec4 coords;\n'+
        '};\n'+
        'vec3 fresnelSchlick(float cosTheta, vec3 F0)\n' +
        '{\n' +
        '    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);\n' +
        '}\n' +
        "float getDepth(vec4 depth)\n" +
        "{\n" +
           "float z_window = czm_unpackDepth(depth);\n" +
           "z_window = czm_reverseLogDepth(z_window);\n" +
           "float n_range = czm_depthRange.near;\n" +
           "float f_range = czm_depthRange.far;\n" +
           "return (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n" +
        "}\n" +
        'vec3 getViewPosition(vec2 uv, float depth) {\n' +
        '   vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1. - uv.y) * 2.0 - 1.0));\n' +
        '   vec4 posInCamera = czm_inverseProjection * vec4(xy, depth , 1.0);\n' +
        '   posInCamera = posInCamera / posInCamera.w;\n' +
        '   return posInCamera.xyz;\n' +
        '}\n' +
        'vec3 getViewNormal(vec2 uv) {\n' +
        '   vec4 wNormalTex = texture2D(normalTexture, uv);\n' +
        // '   return normalize((czm_viewRotation *( wNormalTex.xyz * 2. - 1.)).xyz);\n' +
        '   return normalize((czm_view * vec4( wNormalTex.xyz* 2. - 1., 0.)).xyz);\n' +
        // '   return czm_viewRotation * normalize(wNormalTex.xyz);\n' +
        '}\n' +
        'ReflectionInfo getReflectionInfo(vec3 dir, vec3 hitCoord)\n' +
        '{\n' +
        '    ReflectionInfo info;\n' +
        '    vec4 projectedCoord;\n' +
        '    float sampledDepth;\n' +
        '\n' +
       
        '    dir *= 1.0;\n' +
        '\n' +
        '    for(int i = 0; i < 64; i++)\n' +
        '    {\n' +
        '        hitCoord += dir;\n' +
        '\n' +
        '        projectedCoord = czm_projection * vec4(hitCoord, 1.0);\n' +
        '        projectedCoord.xy /= projectedCoord.w;\n' +
        '\t    projectedCoord.xy = 0.5 * projectedCoord.xy + vec2(0.5);\n' +
        ' \n' +
        '       float depth2 = getDepth(texture2D(depthTexture, projectedCoord.xy));\n' +
        '        sampledDepth = getViewPosition(projectedCoord.xy, depth2).z;\n' +
        // '        sampledDepth = (view * texture2D(positionSampler, projectedCoord.xy)).z;\n' +
        ' \n' +
        '        float depth = sampledDepth - hitCoord.z;\n' +
        '\n' +
        '        if(((depth - dir.z) < 1.2) && depth <= 0.0)\n' +
        '        {\n' +
        // '            #ifdef ENABLE_SMOOTH_REFLECTIONS\n' +
        // '                return smoothReflectionInfo(dir, hitCoord);\n' +
        // '            #else\n' +
        '                info.color = texture2D(colorTexture, projectedCoord.xy).rgb;\n' +
        '                info.coords = vec4(projectedCoord.xy, sampledDepth, 0.0);\n' +
        '                return info;\n' +
        // '            #endif\n' +
        '        }\n' +
        '    }\n' +
        '    \n' +
        '    info.color = texture2D(colorTexture, projectedCoord.xy).rgb;\n' +
        '    info.coords = vec4(projectedCoord.xy, sampledDepth, 0.0);\n' +
        '    return info;\n' +
        '}\n' +
        '\n' +
        'vec3 hash(vec3 a)\n' +
        '{\n' +
        '    a = fract(a * 0.8);\n' +
        '    a += dot(a, a.yxz + 19.19);\n' +
        '    return fract((a.xxy + a.yxx) * a.zyx);\n' +
        '}\n' +

        'bool IsSky(vec2 uv) {\n' +
        '   return texture2D(depthTexture, uv).r >= 1.;\n' +
        '}\n' +
        'void main() { \n' +
        '   vec4 albedoFull = texture2D(colorTexture, v_textureCoordinates);\n' +
        '   float depth = getDepth(texture2D(depthTexture, v_textureCoordinates));\n' +
        '   vec3 albedo = albedoFull.rgb;\n' +
        '   float spec = 1.0;\n' +
        '   float roughness = m_Roughness;\n' +
        '   float metallic = m_Metallic;\n' +
        '   vec3 position = getViewPosition(v_textureCoordinates, depth);\n' +
        '   vec3 normal = getViewNormal(v_textureCoordinates);\n' +
        '   vec3 reflected = normalize(reflect(normalize(position), normalize(normal)));\n' +
        '   vec3 jitt = mix(vec3(0.0), hash(position), roughness) * 0.2;\n' +
        '   ReflectionInfo info = getReflectionInfo(jitt + reflected, position);\n' +
        '   vec2 dCoords = smoothstep(0.2, 0.6, abs(vec2(0.5, 0.5) - info.coords.xy));\n' +
        '   float screenEdgefactor = clamp(1.0 - (dCoords.x + dCoords.y), 0.0, 1.0);\n' +
        '   vec3 F0 = vec3(0.04);\n' +
        '   F0      = mix(F0, albedo, spec);\n' +
        '   vec3 fresnel = fresnelSchlick(max(dot(normalize(normal), normalize(position)), 0.0), F0);\n' +
        '   float reflectionMultiplier = clamp(pow(spec * 1., 3.) * screenEdgefactor * reflected.z, 0.0, 0.9);\n' +
        '   float albedoMultiplier = 1.0 - reflectionMultiplier;\n' +
        '   vec3 SSR = info.color * fresnel;\n' +
        '   gl_FragColor = vec4((albedo * albedoMultiplier) + (SSR * reflectionMultiplier), albedoFull.a);\n' +
        '}\n';
        return ssr;
    }

    /**
     * 渲染
     */
    render () {
        let viewer = this.viewer;
        let stages = viewer.scene.postProcessStages;

        let scene = viewer.scene;
        let context = scene.context;
        let ssrShader = this.getSSRShader();

        let ssrPass = new PostProcessStage({
            name: 'ssr_lxg',
            fragmentShader: ssrShader,
            uniforms: {
                m_Roughness: 0.0,
                m_Metallic: 1.0
            }
        });
        stages.add(ssrPass);
    }
}




export default SSR;