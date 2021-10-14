import SurfaceEffectFS from "cesium/Shaders/Gis/SurfaceEffectFS";
import SurfaceEffectVS from "cesium/Shaders/Gis/SurfaceEffectVS";
import when from "cesium/ThirdParty/when";
import {GeoDepository} from "../core/GeoDepository";

/**
 * 表面渲染效果，添加云层效果
 * @returns {Material} 渲染效果材质
 * @constructor
 * @ignore
 */
function SurfaceEffect() {
    let viewer=GeoDepository.viewer;
    let context = viewer.scene.context;
    let scene = viewer.scene;
    let globe = scene.globe;
    let material = new BOSGeo.Material({
        fabric: {
            uniforms: {
                u_cloudImage: BOSGeo.Material.DefaultImageId,
            },
            source: SurfaceEffectFS,
            vertexSource: SurfaceEffectVS
        },
        translucent: true
    });
    let imagePromises = [];
    imagePromises.push(BOSGeo.Resource.fetchImage('resource/images/CloudOneImage.png'));
    when.all(imagePromises, function(images) {
        material.uniforms.u_cloudImage = new BOSGeo.Texture({
            context : context,
            source : images[0],
            pixelFormat: BOSGeo.PixelFormat.RGBA,
            pixelDatatype: BOSGeo.PixelDatatype.UNSIGNED_BYTE
        });
    });

    return material;

}

export default SurfaceEffect;