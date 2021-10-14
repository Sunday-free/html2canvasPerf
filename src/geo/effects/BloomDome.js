import Cartesian3 from "cesium/Core/Cartesian3";
import Color from "cesium/Core/Color";
import CesiumMath from "cesium/Core/Math";
import Matrix4 from "cesium/Core/Matrix4";
import Transforms from "cesium/Core/Transforms";
import Material from "cesium/Scene/Material";
import EllipsoidGeometry from "cesium/Core/EllipsoidGeometry";
import GeometryInstance from "cesium/Core/GeometryInstance";
import VertexFormat from "cesium/Core/VertexFormat";
import EllipsoidSurfaceAppearance from "cesium/Scene/EllipsoidSurfaceAppearance";
import MaterialAppearance from "cesium/Scene/MaterialAppearance";
import Primitive from "cesium/Scene/Primitive";
import buildModuleUrl from "cesium/Core/buildModuleUrl";
import {GeoDepository} from "../core/GeoDepository";
import Util from "../utils/Util";

/**
 * 穹顶
 *
 * @param {Object}  options 设置
 * @param {Cartesian3} options.center    中心点位置
 * @param {Number} [options.radius=250]  穹顶半径，默认250.
 * @param {String} [options.image='./resource/images/effect/dome.png']   渲染图片,默认'./resource/images/effect/dome.png'
 * @example
 let center = BOSGeo.Cartesian3.fromDegrees(121.467698 ,31.246150);
 //添加 护盾效果
 let dome = new BOSGeo.BloomDome({
    center: center,
    radius: 200,
    image:'./resource/images/effect/dome.png'
    });
 viewer.scene.primitives.add(dome);
 * @ignore
 */
class BloomDome {
    constructor(options){
        let center = options.center;
        let radius = options.radius || 250;
        let base64 = options.image||buildModuleUrl('./resource/images/effect/dome.png');
        let img = new Image();
        img.src = base64;

        //如果设置为true，则会在场景更新时渲染，否则实时渲染每帧
        GeoDepository.viewer.scene.requestRenderMode=false
        GeoDepository.geomap.requestRenderModeMethods.push('BloomDome');
        // // Draw a blue ellipsoid and position it on the globe surface.

        let radii = new Cartesian3(radius, radius, radius);
        // Ellipsoid geometries are initially centered on the origin.
        // We can use a model matrix to position the ellipsoid on the
        // globe surface.
        let modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
        // let modelMatrix = Matrix4.multiplyByTranslation(
        //     Transforms.eastNorthUpToFixedFrame(center),
        //     new Cartesian3(0.0, 0.0, radii.z),
        //     new Matrix4()
        // );
        // Create a ellipsoid geometry.
        let ellipsoidGeometry = new EllipsoidGeometry({
            vertexFormat: MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
            radii: radii,
            maximumCone: CesiumMath.PI_OVER_TWO,
        });
        // Create a geometry instance using the geometry
        // and model matrix created above.
        let ellipsoidInstance = new GeometryInstance({
            geometry: ellipsoidGeometry,
            modelMatrix: modelMatrix
        });
        // Add the geometry instance to primitives.
        this.bloomDomePrimitive = new Primitive({
            geometryInstances: ellipsoidInstance,
            appearance:new MaterialAppearance({
                material:new Material({
                    translucent : true,
                    fabric:{
                        uniforms:{
                            mainTexture : img,
                            g_color: new Color(0.0,1.0,1.0),
                            rimColor: Color.WHITE,
                            width: 1.0,
                        },
                        source:
                            'float rand(float n){\n' +
                            '    return fract(sin(n) * 43758.5453123);\n' +
                            '}\n' +
                            'float noise(float p){\n' +
                            '    float fl = floor(p);\n' +
                            '    float fc = fract(p);\n' +
                            '    return mix(rand(fl), rand(fl + 1.0), fc);\n' +
                            '}\n'+
                            "czm_material czm_getMaterial(czm_materialInput materialInput){"+
                            '    czm_material material = czm_getDefaultMaterial(materialInput);\n' +
                            '    float d = 1.0 - dot(materialInput.normalEC, normalize(materialInput.positionToEyeEC));\n' +
                            // '    float s = smoothstep(1.0 - width, 1.0, d);\n' +
                            '    float s = pow(d, 2.0) * 2.0;\n' +
                            '    vec2 st = materialInput.st;\n' +
                            ' float flicker = 1.0;\n' +
                            ' flicker = clamp(noise(czm_frameNumber * 0.01), 0.03, 0.40);\n' +
                            '    float time = fract(czm_frameNumber / 120.) * 0.5 ;\n' +
                            '    vec2 new_st = fract(st-vec2(time,time));\n'+
                            '    vec4 outColor = czm_gammaCorrect(g_color) * texture2D(mainTexture,new_st);\n' +
                            '    vec4 outRimColor = czm_gammaCorrect(rimColor);\n' +
                            '    material.diffuse = outColor.rgb;\n' +
                            '    material.emission = outRimColor.rgb * s * 0.5;\n' +
                            '    material.alpha = mix(outColor.a, outRimColor.a, s) * flicker;\n' +
                            '    return material;\n' +
                            '}\n'
                    }
                }),
                vertexShaderSource: 'attribute vec3 position3DHigh;\n' +
                    'attribute vec3 position3DLow;\n' +
                    'attribute vec3 normal;\n' +
                    'attribute vec2 st;\n' +
                    'attribute float batchId;\n' +
                    '\n' +
                    'varying vec3 v_positionEC;\n' +
                    'varying vec3 v_normalEC;\n' +
                    'varying vec2 v_st;\n' +
                    '\n' +
                    'void main()\n' +
                    '{\n' +
                    '    vec4 p = czm_computePosition();\n' +
                    '\n' +
                    '    v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates\n' +
                    '    v_normalEC = czm_normal * normal;                         // normal in eye coordinates\n' +
                    '    v_st = st;\n' +
                    '\n' +
                    '    gl_Position = czm_modelViewProjectionRelativeToEye * p;\n' +
                    '}\n',
                fragmentShaderSource:
                    '#extension GL_EXT_draw_buffers : enable\n'+
                    'varying vec3 v_positionEC;\n' +
                    'varying vec3 v_normalEC;\n' +
                    'varying vec2 v_st;\n' +
                    '\n' +
                    'void main()\n' +
                    '{\n' +
                    '    vec3 positionToEyeEC = -v_positionEC;\n' +
                    '\n' +
                    '    vec3 normalEC = normalize(v_normalEC);\n' +
                    '#ifdef FACE_FORWARD\n' +
                    '    normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);\n' +
                    '#endif\n' +
                    '\n' +
                    '    czm_materialInput materialInput;\n' +
                    '    materialInput.normalEC = normalEC;\n' +
                    '    materialInput.positionToEyeEC = positionToEyeEC;\n' +
                    '    materialInput.st = v_st;\n' +
                    '    czm_material material = czm_getMaterial(materialInput);\n' +
                    '\n' +
                    '    gl_FragData[1] = vec4(material.emission, material.alpha) * 0.3;\n' +
                    '    gl_FragData[2] = vec4(material.emission, material.alpha) * 0.3;\n' +
                    '#ifdef FLAT\n' +
                    '    gl_FragData[0] = vec4(material.diffuse + material.emission, material.alpha);\n' +
                    '#else\n' +
                    '    gl_FragData[0] = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);\n' +
                    '#endif\n' +
                    '}\n'
            })
        });
        return this.bloomDomePrimitive;
    }

    /**
     * 移除
     */
    remove(){
        Util.removeFromArray(GeoDepository.geomap.requestRenderModeMethods, 'BloomDome');//移除调用实时渲染的方法
        GeoDepository.geomap._requestRenderModeCheck();
    }
}
export default BloomDome;