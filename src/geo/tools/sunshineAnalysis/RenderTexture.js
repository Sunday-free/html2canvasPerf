import BoundingRectangle from 'cesium/Core/BoundingRectangle';
import Color from 'cesium/Core/Color';
import defaultValue from 'cesium/Core/defaultValue';
import defined from 'cesium/Core/defined';
import destroyObject from 'cesium/Core/destroyObject';
import PixelFormat from 'cesium/Core/PixelFormat';

import Framebuffer from 'cesium/Renderer/Framebuffer';
import PassState from 'cesium/Renderer/PassState';
import PixelDatatype from 'cesium/Renderer/PixelDatatype';
import Renderbuffer from 'cesium/Renderer/Renderbuffer';
import RenderbufferFormat from 'cesium/Renderer/RenderbufferFormat';
import Sampler from 'cesium/Renderer/Sampler';
import Texture from 'cesium/Renderer/Texture';
import TextureMagnificationFilter from 'cesium/Renderer/TextureMagnificationFilter';
import TextureMinificationFilter from 'cesium/Renderer/TextureMinificationFilter';

class RenderTexture {
    /**
     * 渲染纹理类
     * @private
     * @alias RenderTexture
     * @constructor
     * 
     * @param {Context} context 
     */
    constructor(context) {
        var passState = new PassState(context);
        passState.blendingEnabled = true;
        passState.viewport = new BoundingRectangle();
        this._context = context;
        this._pixelDatatype = PixelDatatype.UNSIGNED_BYTE;
        this._fb = new Framebuffer({
            context: context,
            colorTextures: [
                new Texture({
                    context: context,
                    width: 1,
                    height: 1
                })],
            depthStencilRenderbuffer:
                new Renderbuffer({
                    context: context,
                    format: PixelFormat.DEPTH_STENCIL
                })
        });
        this._passState = passState;
        this._width = 1;
        this._height = 1;
    }

    update(e) {
        const context = this._context;
        const { drawingBufferWidth, drawingBufferHeight } = context;
        if (!(defined(this._fb) && this._width === drawingBufferWidth && this._height === drawingBufferHeight)) {
            this._width = drawingBufferWidth;
            this._height = drawingBufferHeight;
            this._fb = this._fb && this._fb.destroy();
            this._fb = new Framebuffer({
                context: context,
                colorTextures: [
                    new Texture({
                        context: context,
                        width: drawingBufferWidth,
                        height: drawingBufferHeight,
                        pixelDatatype: this._pixelDatatype,
                        sampler: new Sampler({
                            minificationFilter: TextureMinificationFilter.NEAREST,
                            magnificationFilter: TextureMagnificationFilter.NEAREST
                        })
                    })],
                depthStencilRenderbuffer: new Renderbuffer({
                    context: context,
                    format: RenderbufferFormat.DEPTH_STENCIL
                })
            });
            this._passState.framebuffer = this._fb;
        }

    }

    destroy() {
        this._fb = this._fb && this._fb.destroy();
        return destroyObject(this)
    }
}

export default RenderTexture;