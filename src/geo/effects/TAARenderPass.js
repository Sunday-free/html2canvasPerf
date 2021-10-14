// import BoundingRectangle from "cesium/Core/BoundingRectangle.js";
// import Color from "cesium/Core/Color.js";
// import defined from "cesium/Core/defined.js";
// import destroyObject from "cesium/Core/destroyObject.js";
// import PixelFormat from "cesium/Core/PixelFormat.js";
// import WebGLConstants from "cesium/Core/WebGLConstants.js";
// import ClearCommand from "cesium/Renderer/ClearCommand.js";
// import DrawCommand from "cesium/Renderer/DrawCommand.js";
// import Framebuffer from "cesium/Renderer/Framebuffer.js";
// import PixelDatatype from "cesium/Renderer/PixelDatatype.js";
// import RenderState from "cesium/Renderer/RenderState.js";
// import Sampler from "cesium/Renderer/Sampler.js";
// import Texture from "cesium/Renderer/Texture.js";
// import AdjustTranslucentFS from "cesium/Shaders/AdjustTranslucentFS.js";
// import PassThrough from "cesium/Shaders/PostProcessStages/PassThrough.js";


// /**
//  * @private
//  */
// function TAARenderPass(context) {
//     this.taaShader = "uniform sampler2D previousColorTexture;\n"+
//     "uniform sampler2D colorTexture;\n"+
//     "uniform float weight1;\n"+
//     "uniform float weight2;\n\n"+
//     "varying vec2 v_textureCoordinates;\n\n"+
//     "void main() {\n"+
//     "    vec4 color = vec4(0.0);\n"+
//     "    color += texture2D(previousColorTexture, v_textureCoordinates) * weight1;\n"+
//     "    color += texture2D(colorTexture, v_textureCoordinates) * weight2;\n"+
//     "    gl_FragColor = color;\n"+
//     "}\n";
//     this._jitterIndex = 0;
//     this._maxFrameCount = 32;
//     this._jitterOffsets = this._generateHaltonJiters(this._maxFrameCount);
//     this._frameCount = 0;

//     this._lastFrameBuffer = undefined;
//     this._copyColorCommand = undefined;
//     this._taaColorTexture = undefined;
//     this._taaFrameBuffer = undefined;
//     this._taaDrawCommand = undefined;
//     this._currentColorTexture = undefined;
// }

// TAARenderPass.prototype.generateShader = function(context){
//     let that = this;
//     let uniformMap = {
//         previousColorTexture: function() {
//             return that._frameCount < 1 ? that._currentColorTexture :that._lastFrameBuffer.getColorTexture(0)
//         },
//         colorTexture: function() {
//             return that._currentColorTexture
//         },
//         weight1: function() {
//             return that._frameCount < 1 ? 0 : .9
//         },
//         weight2: function() {
//             return that._frameCount < 1 ? 1 : .1
//         } 
//     }
//     that._taaDrawCommand = context.createViewportQuadCommand(that.taaShader, {
//         uniformMap : uniformMap,
//         owner : that
//     });
//     that._copyColorCommand = context.createViewportQuadCommand(PassThrough, {
//         uniformMap : {
//             colorTexture: function(){
//                 return that._taaColorTexture;
//             } 
//         },
//         owner : that
//     });
// }

// TAARenderPass.prototype._generateHaltonJiters = function(length){
//     let jitters = [];

//     for (let i = 1; i <= length; i++)
//         jitters.push([(this._haltonNumber(2, i) - 0.5) * 2, (this._haltonNumber(3, i) - 0.5) * 2]);
//     return jitters;
// }

// TAARenderPass.prototype._haltonNumber = function(base, index){
//     let result = 0;
//     let f = 1;
//     while (index > 0) {
//         f /= base;
//         result += f * (index % base);
//         index = Math.floor(index / base);
//     }

//     return result;
// }

// TAARenderPass.prototype.createFramebuffer = function(context){
//     let width = context.drawingBufferWidth;
//     let height = context.drawingBufferHeight;

//     let texture = new Texture({
//         context: context,
//         width: width,
//         height: height,
//         pixelFormat: PixelFormat.RGBA,
//         sampler: Sampler.NEAREST,
//     });

//     return new Framebuffer({
//         context : context,
//         colorTextures : [texture],
//         depthTexture : new Texture({
//             context: context,
//             width: width,
//             height: height,
//             pixelFormat: PixelFormat.DEPTH_COMPONENT,
//             pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
//         })
//     });
// }

// TAARenderPass.prototype.beginFrame = function(scene){
//     // if (rx.currentFrameTaaEnabled) {
//     //     this._jitterIndex = (this._jitterIndex + 1) % this._jitterOffsets.length;
//     //     let context = scene.context;
//     //     let width = context.drawingBufferWidth;
//     //     let height = context.drawingBufferHeight;
//     //     let [jitterX, jitterY] = this._jitterOffsets[this._jitterIndex];
//     //     rx.jitterOffset = [jitterX / width, jitterY / height]
//     // } else {
//     //     rx.jitterOffset = [0, 0];
//     //     if(scene._frameState.passes.pick || (rx.historicalInvalid && (rx.historicalInvalid = false))){
//     //         this._frameCount = 0;
//     //     }
//     // }
// }

// TAARenderPass.prototype.render = function(scene, passState, texture){
    


//     return this._taaColorTexture;
// }

// function destroyFramebuffers(taa) {
//     taa._taaFrameBuffer = taa._taaFrameBuffer && !taa._taaFrameBuffer.isDestroyed() && taa._taaFrameBuffer.destroy();
//     taa._lastFrameBuffer = taa._lastFrameBuffer && !taa._lastFrameBuffer.isDestroyed() && taa._lastFrameBuffer.destroy();
// }

// function destroyResources(oit) {

// }

// function updateTextures(oit, context, width, height) {
  
// }

// function updateFramebuffers(oit, context) {
 
// }

// TAARenderPass.prototype.update = function (context, passState, framebuffer, useHDR) {
//     this.createFramebuffer(context);
// };


// TAARenderPass.prototype.isDestroyed = function () {
//   return false;
// };

// TAARenderPass.prototype.destroy = function () {
 
//   return destroyObject(this);
// };
// export default TAARenderPass;
