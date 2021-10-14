import BoundingRectangle from 'cesium/Core/BoundingRectangle';
// import Cartesian3 from 'cesium/Core/Cartesian3';
import Color from 'cesium/Core/Color';
import defined from 'cesium/Core/defined';
import destroyObject from 'cesium/Core/destroyObject';
import Matrix3 from 'cesium/Core/Matrix3';
import Matrix4 from 'cesium/Core/Matrix4';

import ClearCommand from 'cesium/Renderer/ClearCommand';
import Framebuffer from 'cesium/Renderer/Framebuffer';
import PassState from 'cesium/Renderer/PassState';
import RenderState from 'cesium/Renderer/RenderState';
import Texture from 'cesium/Renderer/Texture';
import FrameBufferType from './FrameBufferType';
import RenderTexture from './RenderTexture';

class DepthFramebuffer {
    /**
     * 深度帧缓冲对象 _
     * @private
     * @alias DepthFramebuffer
     * 
     * @constructor
     * 
     * @param {Context} context 
     * @param {Number} farToNearRatio 
     */
    constructor(context, farToNearRatio) {
        this._renderTexture = undefined;
        this._depthTexture = [];
        this._copyDepthFramebuffer = [];
        this._maxFrustum = Math.ceil(Math.log(500000000) / Math.log(farToNearRatio));
        this._copyDepthFramebuffer = [];
        this._copyDepthCommand = undefined;
        this._clearColorCommand = new ClearCommand({
            color: new Color(0, 0, 0, 0)
        });
        this._viewport = new BoundingRectangle();
        this._rs = undefined;
        this._passState = new PassState(context);
        this._passState.viewport = this._viewport;
        this._context = context;
        this._isUpdate = true;
        this._preExecute = undefined;
        this._postExecute = undefined;
        this._environmentVisible = {
            isSunVisible: true,
            isMoonVisible: true,
            isSkyAtmosphereVisible: false,
            isSkyBoxVisible: false,
            isGlobalVisible: true,
            isObjectVisible: true
        };

        this._textureToCopy = undefined;
        this._manualDepth = true;
        this._visibleViewport = 1;
    }

    /** 
     * @property {Texture} depthTexture
     * @readonly
     */
    get depthTexture() {
        return this._depthTexture;
    }

    /**
     * @property {Object} environmentVisible
     * @readonly
     */
    get environmentVisible() {
        return this._environmentVisible;
    }

    get useType() {
        return 1;
    }

    /**
     * @property {FrameBufferType} frameBufferType
     * @readonly
     */
    get frameBufferType() {
        return FrameBufferType.DEPTH;
    }

    /**
     * @property {Boolean} isUpdate
     */
    get isUpdate() {
        // const { drawingBufferWidth, drawingBufferHeight } = this._context;
        // const renderTexture = this._renderTexture;
        // if (defined(renderTexture) && defined(renderTexture._fb) && renderTexture._width === drawingBufferWidth && renderTexture._height === drawingBufferHeight) {
        //     this._isUpdate = true;
        // }
        return this._isUpdate;
    }
    set isUpdate(value) {
        this._isUpdate = value;
    }

    /**
     * @property {Boolean} isManualDepth
     */
    get isManualDepth() {
        return this._manualDepth;
    }
    set isManualDepth(value) {
        if (this._manualDepth !== value) {
            this._manualDepth = value;
            this._isUpdate = true;
        }
    }


    /**
     * _updateFramebuffer g
     * @param {Context} context 
     * @param {Event} event ?
     * @param {Number} wdith 
     * @param {Number} height 
     */
    _updateFramebuffer(context, event, wdith, height) {
        if (!defined(this._renderTexture)) {
            this._renderTexture = new RenderTexture(context);
        }
        var renderTexture = this._renderTexture;
        if (this._copyDepthFramebuffer.length < 1) {
            for (var i = 0; i < this._maxFrustum; i++) {
                this._depthTexture.push(
                    new Texture({
                        context: context,
                        width: 1,
                        height: 1
                    }));
                this._copyDepthFramebuffer.push(
                    new Framebuffer({
                        context: context,
                        colorTextures: [this._depthTexture[i]],
                        destroyAttachments: false
                    }))
            }
        }
        if (!defined(renderTexture._fb) || renderTexture._width !== wdith || renderTexture._height !== height) {
            for (var i = 0; i < this._maxFrustum; i++) {
                this._depthTexture[i] = this._depthTexture[i] && this._depthTexture[i].destroy();
                this._copyDepthFramebuffer[i] = this._copyDepthFramebuffer[i] && this._copyDepthFramebuffer[i].destroy();
            }
            this._renderTexture.update(event);
            const len = this._manualDepth ? 1 : this._maxFrustum;
            for (var i = 0; i < len; i++) {
                this._depthTexture[i] = new Texture({
                    context: context,
                    width: wdith,
                    height: height
                });
                this._copyDepthFramebuffer[i] = new Framebuffer({
                    context: context,
                    colorTextures: [this._depthTexture[i]],
                    destroyAttachments: false
                })
            }
        }
    }
    /**
     *  更新renderState v
     * @private
     * 
     * @param {*} context 
     * @param {*} wdith 
     * @param {*} height 
     */
    _updateRenderState(context, wdith, height) {
        this._viewport.width = wdith;
        this._viewport.height = height;
        // ？？
        if (defined(this._rs) && BoundingRectangle.equals(this._viewport, this._rs.viewport) || !defined(this._copyDepthCommand)) {
            this._rs = RenderState.fromCache({
                viewport: this._viewport
            });
            var fragmentShaderSource = "";
            fragmentShaderSource = this.isManualDepth ?
                "uniform sampler2D u_texture;\nvarying vec2 v_textureCoordinates;\nvoid main()\n{\n    gl_FragColor = czm_packDepth(texture2D(u_texture, v_textureCoordinates).r);\n}\n"
                : "uniform sampler2D u_texture;\nvarying vec2 v_textureCoordinates;\nvoid main()\n{\n    gl_FragColor = texture2D(u_texture, v_textureCoordinates);\n}\n";
            this._copyDepthCommand = context.createViewportQuadCommand(fragmentShaderSource, {
                uniformMap: {
                    u_texture: () => {
                        return this._textureToCopy;
                    }
                },
                owner: this
            })
        }
        this._copyDepthCommand.renderState = this._rs;
    }

    begin(e) {
        const context = this._context;
        const { drawingBufferWidth, drawingBufferHeight } = context;
        this._updateFramebuffer(context, e, drawingBufferWidth, drawingBufferHeight);
        this._updateRenderState(context, drawingBufferWidth, drawingBufferHeight);
        this._renderTexture._passState.viewport.width = drawingBufferWidth;
        this._renderTexture._passState.viewport.height = drawingBufferHeight;
        this._preExecute && this._preExecute();

        return this._renderTexture._passState;
    }

    end(e) {
        this._postExecute && this._postExecute(e);
    }
    /**
     * 
     * @param {PassState} passState
     * @param {Array.<PickDepth>} pickDepthList 
     */
    update(passState, pickDepthList) {
        const context = this._context;
        if (this._manualDepth) {
            if (defined(this._copyDepthCommand)) {
                this._copyDepthCommand.framebuffer = this._copyDepthFramebuffer[0];
                this._textureToCopy = this._renderTexture._passState.framebuffer._depthStencilTexture;
                this._clearColorCommand.execute(context, this._passState);
                this._copyDepthCommand.execute(context, this._passState)
            }
        } else {
            for (var i = 0; i < pickDepthList.length; i++) {
                var pickDepth = pickDepthList[i];
                if (defined(pickDepth)) {
                    this._textureToCopy = pickDepth._depthTexture;
                    this._copyDepthCommand.framebuffer = this._copyDepthFramebuffer[i];
                    this._clearColorCommand.execute(context, this._passState);
                    this._copyDepthCommand.execute(context, this._passState);
                }
            }
        }
    }

    /**
     * 销毁
     * @returns {undefined}
     */
    destroy() {
        this._renderTexture = this._renderTexture && this._renderTexture.destroy();
        for (var e = 0; e < this._maxFrustum; e++) {
            this._depthTexture[e] = this._depthTexture[e] && this._depthTexture[e].destroy();
            this._copyDepthFramebuffer[e] = this._copyDepthFramebuffer[e] && this._copyDepthFramebuffer[e].destroy();
        }
        defined(this._copyDepthCommand) && (this._copyDepthCommand.shaderProgram = this._copyDepthCommand.shaderProgram.destroy())
        this._textureToCopy = undefined;
        return destroyObject(this)
    }
}

export default DepthFramebuffer;