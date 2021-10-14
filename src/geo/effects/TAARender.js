// import ClearCommand from "cesium/Renderer/ClearCommand";
// import Color from "cesium/Core/Color";
// import createGuid from "cesium/Core/createGuid";
// import PostProcessStage from "cesium/Scene/PostProcessStage";
// import Camera from "cesium/Scene/Camera";
// import BlendingState from "cesium/Scene/BlendingState";
// import BoundingRectangle from "cesium/Core/BoundingRectangle";
// import Cartesian3 from "cesium/Core/Cartesian3";
// import Cartesian2 from "cesium/Core/Cartesian2";
// import PostProcessStageSampleMode from "cesium/Scene/PostProcessStageSampleMode";
// import PostProcessStageComposite from "cesium/Scene/PostProcessStageComposite";
// import defined from "cesium/Core/defined";
// import PixelFormat from "cesium/Core/PixelFormat";
// import defaultValue from "cesium/Core/defaultValue";
// import Texture from "../../../cesium/Source/Renderer/Texture";
// import Sampler from "cesium/Renderer/Sampler";
// import Framebuffer from "cesium/Renderer/Framebuffer";
// import PixelDatatype from "cesium/Renderer/PixelDatatype";
// import PassState from "cesium/Renderer/PassState";
// import RenderState from "cesium/Renderer/RenderState";
// import Pass from "cesium/Renderer/Pass";

// class TAARender {
//     constructor(options){
//         let viewer = options.viewer;
//         this.scene = viewer.scene;
//         this.camera = viewer.scene.camera;
//         this.context = viewer.scene.context;
//         this._enabled = true;

//         this.sampleLevel = defaultValue(options.sampleLevel, 5);
//         this.accumulate = false;

//         this.JitterVectors = [
//             [
//                 [ 0, 0 ]
//             ],
//             [
//                 [ 4, 4 ], [ - 4, - 4 ]
//             ],
//             [
//                 [ - 2, - 6 ], [ 6, - 2 ], [ - 6, 2 ], [ 2, 6 ]
//             ],
//             [
//                 [ 1, - 3 ], [ - 1, 3 ], [ 5, 1 ], [ - 3, - 5 ],
//                 [ - 5, 5 ], [ - 7, - 1 ], [ 3, 7 ], [ 7, - 7 ]
//             ],
//             [
//                 [ 1, 1 ], [ - 1, - 3 ], [ - 3, 2 ], [ 4, - 1 ],
//                 [ - 5, - 2 ], [ 2, 5 ], [ 5, 3 ], [ 3, - 5 ],
//                 [ - 2, 6 ], [ 0, - 7 ], [ - 4, - 6 ], [ - 6, 4 ],
//                 [ - 8, 0 ], [ 7, - 4 ], [ 6, 7 ], [ - 7, - 8 ]
//             ],
//             [
//                 [ - 4, - 7 ], [ - 7, - 5 ], [ - 3, - 5 ], [ - 5, - 4 ],
//                 [ - 1, - 4 ], [ - 2, - 2 ], [ - 6, - 1 ], [ - 4, 0 ],
//                 [ - 7, 1 ], [ - 1, 2 ], [ - 6, 3 ], [ - 3, 3 ],
//                 [ - 7, 6 ], [ - 3, 6 ], [ - 5, 7 ], [ - 1, 7 ],
//                 [ 5, - 7 ], [ 1, - 6 ], [ 6, - 5 ], [ 4, - 4 ],
//                 [ 2, - 3 ], [ 7, - 2 ], [ 1, - 1 ], [ 4, - 1 ],
//                 [ 2, 1 ], [ 6, 2 ], [ 0, 4 ], [ 4, 4 ],
//                 [ 2, 5 ], [ 7, 5 ], [ 5, 6 ], [ 3, 7 ]
//             ]
//         ];

//         this.sampleRenderTarget = undefined;
//         this.holdRenderTarget = undefined;

//         this.unbiased = true;

//         this.copyShader =
// 		"uniform float opacity;\n"+
//         "uniform sampler2D tDiffuse;\n"+
//         "uniform sampler2D colorTexture;\n"+
// 		"varying vec2 v_textureCoordinates;\n"+
// 		"void main() {\n"+
//         "    vec4 color = vec4(0.0);\n"+
//         "    color += texture2D(tDiffuse, v_textureCoordinates) * opacity;\n"+
//         "    color += texture2D(colorTexture, v_textureCoordinates) * opacity;\n"+
//         "	gl_FragColor = color;\n"+
//         // "	gl_FragColor = vec4(1.);\n"+
//         "}\n";

//         this.clearCommand = new ClearCommand({
//             color : new Color(0,0,0,0),
//             depth : 1
//         });
        
//         this.stages = this.scene.postProcessStages;

//         this._copyColorCommand = undefined;
//     }
    
// }

// TAARender.prototype.render = function(context,frameState){
//     let that = this;
//     let width = context.drawingBufferWidth;
//     let height = context.drawingBufferHeight;
//     if(! this.sampleRenderTarget){
//         //创建framebuffer
//         let texture = new Texture({
//             context : context,
//             width : width,
//             height : height,
//             pixelFormat: PixelFormat.RGBA,
//             sampler: Sampler.NEAREST,
//         });
//         this.sampleRenderTarget = new Framebuffer({
//             context : context,
//             colorTextures : [texture],
//             depthTexture : new Texture({
//                 context: context,
//                 width: width,
//                 height: height,
//                 pixelFormat: PixelFormat.DEPTH_COMPONENT,
//                 pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
//             })
//         });

//         this.sampleRenderPassState = new PassState( context);
//         this.sampleRenderPassState.viewport = new BoundingRectangle(0,0,width,height);
//         this.sampleRenderPassState.framebuffer = this.sampleRenderTarget;

//         this.clearCommand.framebuffer = this.sampleRenderTarget;

//         this.SSAAPass = new PostProcessStage({
//             name : 'czm_ssaa_lxg',
//             fragmentShader : this.copyShader,
//             uniforms: {
//                 tDiffuse: that.sampleRenderPassState.framebuffer.getColorTexture(0),
//                 opacity: 1.0
//             }
//         });

//         this.stages.add(this.SSAAPass);
//     }
//     let jitterOffsets = this.JitterVectors[ Math.max( 0, Math.min( this.sampleLevel, 5 ) ) ];

//     let baseSampleWeight = 1.0 / jitterOffsets.length;
//     let roundingRange = 1 / 32;

//     let savedCamera = Camera.clone(this.camera);
//     savedCamera.frustum = this.camera.frustum;

//     let near = this.camera.frustum.near;
//     let fo = near * defaultValue(this.scene.focalLength, 5.0);
//     let eyeSeparation = defaultValue(this.scene.eyeSeparation, fo / 30.0);

//     let offset = (0.5 * eyeSeparation * near) / fo;
//     for (let i = 0; i < jitterOffsets.length; i++) {
//         const jitterOffset = jitterOffsets[i];
       
//         this.camera.setViewOffset(jitterOffset[ 0 ] * 0.00625, jitterOffset[ 1 ] *0.00625);
        
//         let sampleWeight = baseSampleWeight;

//         if ( this.unbiased ) {
//             let uniformCenteredDistribution = ( - 0.5 + ( i + 0.5 ) / jitterOffsets.length );
//             sampleWeight += roundingRange * uniformCenteredDistribution;
//         }

//         // this.SSAAPass.uniforms.opacity = sampleWeight;

//         //render to texture;
//         this.clearCommand.execute(context,this.sampleRenderPassState);
//         this.scene.renderColorTexture(this.sampleRenderPassState,this.camera);
//         this.scene.camera = this.camera;
//         // this.scene.executeCommands( this.scene, this.sampleRenderPassState);
       
//         this.scene.requestRender();
//         let drawCommand = this.updateDebugTexture(frameState, this.sampleRenderPassState.framebuffer.getColorTexture(0));

//         // drawCommand.uniformMap.opacity = function(){
//         //     return sampleWeight;
//         // }

//         // drawCommand.uniformMap.opacity = function(){
//         //     return sampleWeight;
//         // }

//         if(i === 0){
//             // Clear the pass state framebuffer.
//             let clear = this.scene._clearColorCommand;
//             Color.clone(frameState.backgroundColor,clear.color);
//             clear.execute(context, this.scene.view.passState);
//         }
//     }

//     this.camera.clearViewOffset();
//     Camera.clone(savedCamera, this.camera);
//     // this.updateDebugTexture(frameState, this.sampleRenderPassState.framebuffer.getColorTexture(0))
// }

// TAARender.prototype.update = function(frameState){
    
//     let context = this.context;
//     let width = context.drawingBufferWidth;
//     let height = context.drawingBufferHeight;

//     if(! this.accumulate) {
//         this.render(context,frameState);
//         //SSAA
//         this.accumulateIndex = -1;
//         return; 
//     }


//     // let jitterOffsets = this.JitterVectors[ Math.max( 0, Math.min( this.sampleLevel, 5 ) ) ];

//     // if(! this.sampleRenderTarget){
//     //     //创建framebuffer
//     //     let texture = new Texture({
//     //         context : context,
//     //         width : width,
//     //         height : height,
//     //         pixelFormat: PixelFormat.RGBA,
//     //         sampler: Sampler.NEAREST,
//     //     });
//     //     this.sampleRenderTarget = new Framebuffer({
//     //         context : context,
//     //         colorTextures : [texture],
//     //         depthTexture : new Texture({
//     //             context: context,
//     //             width: width,
//     //             height: height,
//     //             pixelFormat: PixelFormat.DEPTH_COMPONENT,
//     //             pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
//     //         })
//     //     });
//     // }

//     // if(! this.holdRenderTarget){
//     //        //创建framebuffer
//     //        let context = this.context;
//     //        let width = context.drawingBufferWidth;
//     //        let height = context.drawingBufferHeight;
//     //        let texture = new Texture({
//     //            context : context,
//     //            width : width,
//     //            height : height,
//     //            pixelFormat: PixelFormat.RGBA,
//     //            sampler: Sampler.NEAREST,
//     //        });
//     //        this.holdRenderTarget = new Framebuffer({
//     //            context : context,
//     //            colorTextures : [texture],
//     //            depthTexture : new Texture({
//     //                context: context,
//     //                width: width,
//     //                height: height,
//     //                pixelFormat: PixelFormat.DEPTH_COMPONENT,
//     //                pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
//     //            })
//     //        });
//     // }

//     // if( this.accumulate && this.accumulateIndex == -1) {
//     //     TAARender.prototype.update.call();
//     //     this.accumulateIndex = 0;
//     // }

//     // let sampleWeight = 1.0 / (jitterOffsets.length);

//     // if ( this.accumulateIndex >= 0 && this.accumulateIndex < jitterOffsets.length ) {
//     //     let numSamplesPerFrame = Math.pow( 2, this.sampleLevel );
//     //     for (let i = 0; i < numSamplesPerFrame; i++) {
//     //         let j = this.accumulateIndex;
//     //     }
//     // }

// }
// let scratchViewport = new BoundingRectangle();
// TAARender.prototype.updateDebugTexture = function(frameState,texture) {
//     if(texture == null){
//         return;
//     }
//     let context = this.context;
//     let screenWidth = context.drawingBufferWidth;
//     //
//     let viewport = scratchViewport;
//     viewport.x = screenWidth - 500;
//     viewport.y = 0;
//     viewport.width = 500;
//     viewport.height = 500;


//     let fs =
// 		"uniform float opacity;\n"+
// 		"uniform sampler2D tDiffuse;\n"+
// 		"varying vec2 v_textureCoordinates;\n"+
// 		"void main() {\n"+
// 		"	vec4 texel = texture2D( tDiffuse, v_textureCoordinates );\n"+
//         "	gl_FragColor = opacity * texel;\n"+
//         // "	gl_FragColor = vec4(1.);\n"+
//         "}\n";
        
//     let rs = new RenderState.fromCache({
//         depthTest : {
//             enabled : false
//         },
//         depthMask : false,
//         blending : BlendingState.ADDITIVE_BLEND
//     });

//     let drawCommand = context.createViewportQuadCommand(fs, {
//         uniformMap : {
//             tDiffuse : function() {
//                 return texture;
//             },
//             opacity : function(){
//                 return 1.0;
//             }
//         },
//         renderState : rs
//     });
//     drawCommand.pass = Pass.OVERLAY;
//     drawCommand.renderState = RenderState.fromCache({
//         viewport : BoundingRectangle.clone(viewport)
//     });
//     frameState.commandList.push(drawCommand);
//     return drawCommand;
// }

// export default TAARender;