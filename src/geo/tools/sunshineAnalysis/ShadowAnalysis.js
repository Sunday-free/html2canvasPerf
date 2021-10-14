import BoundingRectangle from 'cesium/Core/BoundingRectangle';
import BoundingSphere from 'cesium/Core/BoundingSphere';
import defaultValue from 'cesium/Core/defaultValue';
import Cartesian3 from 'cesium/Core/Cartesian3';
import Cartesian4 from 'cesium/Core/Cartesian4';
import defined from 'cesium/Core/defined';
import destroyObject from 'cesium/Core/destroyObject';
import DeveloperError from 'cesium/Core/DeveloperError';
import IndexDatatype from 'cesium/Core/IndexDatatype';
import JulianDate from 'cesium/Core/JulianDate';
import CesiumMath from 'cesium/Core/Math';
import Matrix3 from 'cesium/Core/Matrix3';
import Matrix4 from 'cesium/Core/Matrix4';
import PixelFormat from 'cesium/Core/PixelFormat';
import PrimitiveType from 'cesium/Core/PrimitiveType';
import ComponentDatatype from 'cesium/Core/ComponentDatatype';
import Simon1994PlanetaryPositions from "cesium/Core/Simon1994PlanetaryPositions";
import OrthographicFrustum from 'cesium/Core/OrthographicFrustum';
import Transforms from 'cesium/Core/Transforms';

import BlendingState from 'cesium/Scene/BlendingState';
import Camera from "cesium/Scene/Camera";
import ShadowMap from "cesium/Scene/ShadowMap";

import Pass from 'cesium/Renderer/Pass';
import Buffer from 'cesium/Renderer/Buffer';
import BufferUsage from 'cesium/Renderer/BufferUsage';
import DrawCommand from 'cesium/Renderer/DrawCommand';
import Framebuffer from 'cesium/Renderer/Framebuffer';
import RenderState from 'cesium/Renderer/RenderState';
import Sampler from 'cesium/Renderer/Sampler';
import ShaderProgram from 'cesium/Renderer/ShaderProgram';
import ShaderSource from 'cesium/Renderer/ShaderSource';
import Texture from 'cesium/Renderer/Texture';
import TextureMagnificationFilter from 'cesium/Renderer/TextureMagnificationFilter';
import TextureMinificationFilter from 'cesium/Renderer/TextureMinificationFilter';
import TextureWrap from 'cesium/Renderer/TextureWrap';
import VertexArray from 'cesium/Renderer/VertexArray';

import DepthFramebuffer from './DepthFramebuffer';

import ShadowQueryVS from 'cesium/Shaders/ShadowQueryVS.js';
import ShadowQueryFS from 'cesium/Shaders/ShadowQueryFS.js';
import ShadowPointsVS from 'cesium/Shaders/ShadowPointsVS.js';
import ShadowPointsFS from 'cesium/Shaders/ShadowPointsFS.js';

import { GeoDepository } from '../../core/GeoDepository';
import GeoUtil from '../../utils/GeoUtil';
import Util from '../../utils/Util';
import ColorGradient from '../../utils/ColorGradient';

class ShadowAnalysis {
    /**
     * 阴影分析 （通过对制定时间段内指定区域内的点进行阴影采样分析并可视化）
     * 
     * @private
     * @alias ShadowAnalysis
     * @constructor
     *
     * @param {Object} options 
     * @param {JulianDate} [options.startTime=BOSGeo.JulianDate.fromIso8601('2021-12-22T08:00:00')] 阴影分析开始统计的时刻
     * @param {JulianDate} [options.stopTime=BOSGeo.JulianDate.fromIso8601('2021-12-22T18:00:00')] 阴影分析终止统计的时刻
     * @param {Number} [options.timeIntervals=5] 采样时间间隔，单位为分钟，最小有效值为1
     * @param {Number} [options.spacingIntervals=10] 采样距离间隔，单位为米，最小有效值为1
     * @param {ColorGradient} [options.colorGradient] 颜色渐变梯度
     * 
     * @example
     * var shadowAnalysis = new BOSGeo.ShadowAnalysis();
     */
    constructor(options = {}) {
        const { scene, viewer } = GeoDepository;

        if (!scene.context.depthTexture) {
            throw new DeveloperError("BOSGeo.ShadowAnalysis：the depth buffer is not supported!")
        }
        this.scene = scene;
        this.viewer = viewer;

        const {
            startTime = JulianDate.fromIso8601('2021-12-22T08:00:00'),
            stopTime = JulianDate.fromIso8601('2021-12-22T18:00:00'),
            timeIntervals = 5,
            spacingIntervals = 10,
            colorGradient
        } = options;

        if (!(startTime instanceof JulianDate)) {
            throw new DeveloperError('ShadowAnalysis.constructor: options.startTime类型不对!');
        }

        if (!(stopTime instanceof JulianDate)) {
            throw new DeveloperError('ShadowAnalysis.constructor: options.stopTime类型不对!');
        }

        if (JulianDate.lessThan(stopTime, startTime)) {
            throw new DeveloperError('ShadowAnalysis.constructor: Invalid value, startTime must be less than the stopTime!');
        }

        this._colorGradient = defaultValue(
            colorGradient, 
            new BOSGeo.ColorGradient([
                {
                    key: 0,
                    value: new BOSGeo.Color(0, 0, 1)
                },
                {
                    key: 0.25,
                    value: new BOSGeo.Color(0, 1, 1)
                },
                {
                    key: 0.5,
                    value: new BOSGeo.Color(0, 1, 0)
                },
                {
                    key: 0.75,
                    value: new BOSGeo.Color(1, 1, 0)
                },
                {
                    key: 1.0,
                    value: new BOSGeo.Color(1, 0, 0)
                },
            ])
        );
        if (!(this._colorGradient instanceof ColorGradient)) {
            throw new DeveloperError('ShadowAnalysis.constructor: Invalid value, colorGradient must be an instance of ColorGradient!');
        } else if (this._colorGradient.length < 2) {
            throw new DeveloperError('ShadowAnalysis.constructor: Invalid value, the length of colorGradient must be no less than two !');
        }

        this._startTime = startTime;
        this._stopTime = stopTime;
        this._timeIntervals = Math.max(timeIntervals, 1); // 时间采样距离
        this._spacingIntervals = Math.max(spacingIntervals, 1);
        this._show = true;

        this._depthBuffer = undefined; // 深度缓冲区对象
        this._frameState = undefined;

        // 采样区间
        this._qureyRegion = []; 
        this._bottomHeight = 0;
        this._extrudedHeight = 0;

        // drawCommand集合
        this._arrPointCommand = [];
        this._arrRasterPointCommand = [];

        // 辅助纹理
        this._arrRasterTexture = []; // 对应于pointCommand的uniform-uTexture0,并绑定到了rasterPointCommand的FBO输出
        this._arrAssisTexture = []; // 存储以前时刻累计的日照率，并作为下一次时刻计算的uniform输入（相当于rasterPointCommand的全局中间变量）

        // 包围球和地理范围
        this._boundingSphere = new BoundingSphere();
        this._bounds = [];

        this._modelMatrix = Matrix4.IDENTITY.clone();

        this._currentTime = 0; // 当前更新的序号
        this._timeUpdate = true; // 标识采样时刻是否需要更新，为true时暂时不更新PointCommand1
        this._update = true; // 标识 1.drawCommand是否需要重新执行； 2.阴影率是否需要重新计算；
        this._name = ""; // 标识类名
        this._sceneName = ""; // 用于标识DepthFBO
        this._checking = false; // 记录当前shadow
        this._points = []; // 记录同一高度面中（一个drawCommand）采样点的世界坐标

       
        const { width, height } = this._colorGradient.colorCanvas;

        // 创建渐变纹理
        this._colorGradienceTexture = new Texture({
            context: scene.context,
            width,
            height,
            pixelFormat: PixelFormat.RGBA,
            sampler: new Sampler({
                wrapS: TextureWrap.CLAMP_TO_EDGE,
                wrapT: TextureWrap.CLAMP_TO_EDGE,
                minificationFilter: TextureMinificationFilter.NEAREST,
                magnificationFilter: TextureMagnificationFilter.NEAREST
            })
        });

        this._colorGradienceTexture.copyFrom(this._colorGradient.colorCanvas);
    }

    /**
     * 颜色梯度
     * @property {ColorGradient} colorGradient
     */
    get colorGradient() {
        return this._colorGradient;
    }
    set colorGradient(value) {
        if (!(value instanceof ColorGradient)) 
            throw new DeveloperError('ShadowAnalysis.colorGradient: Invalid value, colorGradient must be an instance of ColorGradient!');
        if (!value.equals(this._colorGradient) && defined(value.colorCanvas)) {
            this._colorGradient = value; // 暂时不需要clone
            this._colorGradienceTexture.copyFrom(value.colorCanvas);
        }
    }

    /**
     * 阴影分析开始统计的时刻
     * @property {JulianDate} startTime
     * @default BOSGeo.JulianDate.fromIso8601('2021-12-22T08:00:00')
     */
    get startTime() {
        return this._startTime;
    }
    set startTime(value) {
        if (!JulianDate.equals(this._startTime, value)) {
            this._startTime = value.clone();
            this._setUpdate(true);
        }
    }

    /**
     * 阴影分析终止统计的时刻
     * @property {JulianDate} stopTime
     * @default BOSGeo.JulianDate.fromIso8601('2021-12-22T18:00:00')
     */
    get stopTime() {
        return this._stopTime;
    }
    set stopTime(value) {
        if (!JulianDate.equals(this._stopTime, value)) {
            this._stopTime = value.clone();
            this._setUpdate(true);
        }
    }

    /**
     * 采样时间间隔，单位为分钟，最小有效值为1
     * @property {Number} timeIntervals
     * @default 5
     */
    get timeIntervals() {
        return this._timeIntervals;
    }
    set timeIntervals(value) {
        value = Math.max(1.0, value);
        if (this._timeIntervals !== value) {
            this._timeIntervals = value;
            this._setUpdate(true);
        }
    }

    /**
     * 采样距离间隔，单位为米，最小有效值为1
     * @property {Number} spacingIntervals
     * @default 10
     */
    get spacingIntervals() {
        return this._spacingIntervals;
    }
    set spacingIntervals(value) {
        value = Math.max(1.0, value);
        if (this.spacingIntervals !== value) {
            this._spacingIntervals = value;
            this._setUpdate(true);
        }
    }

    /**
     * 是否显示（日照时长采样点）
     * @property {Boolean} show
     * @default true 
     */
    get show() {
        return this._show;
    }
    set show(value) {
        this._show = value;
    }

    /**
     * 设置_update状态（避免频繁修改该值导致drawCommand不断更新创建）
     * 
     * @private
     * 
     * @param {Boolean} ifUpdate 是否更新
     * @param {Number} [intervals=500] 多少秒后更新，单位为毫秒
     */
    _setUpdate(ifUpdate, intervals = 500) {
        setTimeout(() => {
            this._update = ifUpdate;
        }, intervals);
    }

    /**
     * 更新方法，在scene中调用
     * @private
     * @param {FrameState} frameState 
     */
    update(frameState) {
        const commandList = frameState.commandList;
        const context = this.scene.context;
        if (this._update) {
            this._frameState = frameState;
            if (!defined(this._depthBuffer)) {
                this._depthBuffer = new DepthFramebuffer(context, this.scene.farToNearRatio);
                frameState.framebufferList[this._sceneName] = this._depthBuffer;
            }

            // 切换更新状态
            this._update = false;
            this._timeUpdate = true;
            this._currentTime = 1;
            for (var time = new JulianDate(), timeLength = 0; ;) {
                JulianDate.addMinutes(this._startTime, timeLength, time);
                timeLength += this._timeIntervals;
                if (JulianDate.lessThanOrEquals(this._stopTime, time)) {
                    break;
                }
                this._currentTime++;
            }

            // 不管是采样点改变还是采样时间发生变化(绑定的texture需要清空--》删除重新创建最快)都需要重新创建command
            this._updateCommands(context);

            this._updateShadowPoints(context, frameState);
        }
        if (!this._timeUpdate && this._show) {
            commandList.push(...this._arrPointCommand);
        }
    }

    /**
     * 更新commands（1.采样区间改变了{regions, bottomHeight, extrudedHeight}, 2.采样间隔改变了{spacingIntervals} 3. 绑定的FBO的纹理需要重置）
     * 
     * @private
     * 
     * @param {Context} context 
     */
    _updateCommands(context) {
        // 清空已有得资源
        this._clearPointCommands();
        this._clearTextures();

        // 获取最新得采样点
        var samplePoints = this._getSamplePoints();
        if (samplePoints.length > 0) {
            const { _startTime, _bottomHeight, _extrudedHeight, _spacingIntervals } = this;
            this._updateShadowMap(_startTime);

            for (let offset = 0; offset <= _extrudedHeight; offset += _spacingIntervals) {
                this._createCommand(context, samplePoints, _bottomHeight + offset);
            }
        }
    }

    /**
     * 清除commands -- Z
     * @private
     */
    _clearPointCommands() {
        for (var i = 0; i < this._arrPointCommand.length; i++) {
            if (defined(this._arrPointCommand[i])) {
                this._arrPointCommand[i].vertexArray = this._arrPointCommand[i].vertexArray && this._arrPointCommand[i].vertexArray.destroy();
                this._arrPointCommand[i].shaderProgram = this._arrPointCommand[i].shaderProgram && this._arrPointCommand[i].shaderProgram.destroy();
                this._arrPointCommand[i] = undefined;
            }
        }
        this._arrPointCommand.length = 0;
        for (var i = 0; i < this._arrRasterPointCommand.length; i++) {
            if (defined(this._arrRasterPointCommand[i])) {
                this._arrRasterPointCommand[i].vertexArray = this._arrRasterPointCommand[i].vertexArray && this._arrRasterPointCommand[i].vertexArray.destroy();
                this._arrRasterPointCommand[i].shaderProgram = this._arrRasterPointCommand[i].shaderProgram && this._arrRasterPointCommand[i].shaderProgram.destroy();
                this._arrRasterPointCommand[i] = undefined
            }
        }
        this._arrRasterPointCommand.length = 0;
    }

    /**
     * 清除纹理 -- $
     * @private
     * @param {Boolean} [ifClearColorTexture=false] 是否清空颜色渐变纹理
     */
    _clearTextures(ifClearColorTexture = false) {
        for (var i = 0; i < this._arrRasterTexture.length; i++) {
            defined(this._arrRasterTexture[i]) && (this._arrRasterTexture[i].destroy(), this._arrRasterTexture[i] = null)
        }
        this._arrRasterTexture.length = 0;
        for (var i = 0; i < this._arrAssisTexture.length; i++) {
            defined(this._arrAssisTexture[i]) && (this._arrAssisTexture[i].destroy(), this._arrAssisTexture[i] = null)
        }
        this._arrAssisTexture.length = 0;

        ifClearColorTexture && defined(this._colorGradienceTexture) && this._colorGradienceTexture.destroy();
    }

    /**
     * 创建单个平面的drawCommand
     * @private
     * @param {Context} context
     * @param {Array.<Number>} samplePoints [lon, lat, lon, lat]
     * @param {Number} height
     */
    _createCommand(context, samplePoints, height) {
        const pointNumber = samplePoints.length / 2;
        const positionIndices = ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, 3 * pointNumber);
        const textureIndices = ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, 2 * pointNumber);
        let indices = null;
        let indexDatatype = IndexDatatype.UNSIGNED_SHORT;
        if (pointNumber < 65535) {
            indices = ComponentDatatype.createTypedArray(ComponentDatatype.UNSIGNED_SHORT, pointNumber);
        } else {
            indices = ComponentDatatype.createTypedArray(ComponentDatatype.UNSIGNED_INT, pointNumber);
            indexDatatype = IndexDatatype.UNSIGNED_INT;
        }

        let lonLength = this._bounds[2] - this._bounds[0];
        let latLength = this._bounds[3] - this._bounds[1];
        const minLon = this._bounds[0] - 0.025 * lonLength;
        const minLat = this._bounds[1] - 0.025 * latLength;
        lonLength += 0.05 * lonLength;
        latLength += 0.05 * latLength;

        let cartesian4 = new Cartesian4(0, 0, 0, 1);
        let matrix = new Matrix4();
        matrix = Matrix4.inverse(this._modelMatrix, matrix);
        this._points.length = 0;

        // 存储数据
        for (let i = 0; i < pointNumber; i++) {
            const cartesian = Cartesian3.fromDegrees(samplePoints[2 * i], samplePoints[2 * i + 1], height);
            this._points.push(cartesian);
            cartesian4.x = cartesian.x;
            cartesian4.y = cartesian.y;
            cartesian4.z = cartesian.z;
            Matrix4.multiplyByVector(matrix, cartesian4, cartesian4);
            positionIndices[3 * i] = cartesian4.x;
            positionIndices[3 * i + 1] = cartesian4.y;
            positionIndices[3 * i + 2] = cartesian4.z;
            textureIndices[2 * i] = (samplePoints[2 * i] - minLon) / lonLength * 2 - 1;
            textureIndices[2 * i + 1] = (samplePoints[2 * i + 1] - minLat) / latLength * 2 - 1;
            indices[i] = i;
        }
        const positionVBO = Buffer.createVertexBuffer({
            context: context,
            typedArray: positionIndices,
            usage: BufferUsage.STATIC_DRAW
        });
        const textureVBO = Buffer.createVertexBuffer({
            context: context,
            typedArray: textureIndices,
            usage: BufferUsage.STATIC_DRAW
        });

        const attributeLocations = {
            aPosition: 0,
            aTexCoord0: 1
        }
        const attributes = [];
        attributes.push({
            index: attributeLocations.aPosition,
            vertexBuffer: positionVBO,
            componentsPerAttribute: 3,
            componentDatatype: ComponentDatatype.FLOAT,
            offsetInBytes: 0,
            strideInBytes: 12,
            normalize: false
        });
        attributes.push({
            index: attributeLocations.aTexCoord0,
            vertexBuffer: textureVBO,
            componentsPerAttribute: 2,
            componentDatatype: ComponentDatatype.FLOAT,
            offsetInBytes: 0,
            strideInBytes: 8,
            normalize: false
        });
        const indexBuffer = Buffer.createIndexBuffer({
            context: context,
            typedArray: indices,
            usage: BufferUsage.STATIC_DRAW,
            indexDatatype: indexDatatype
        });

        // 辅助纹理，用于存储每个采样点的光照率（rasterPointCommand的FBO输出，pointCommand的uniform输入）
        const uTexture0 = new Texture({
            context: context,
            width: DEFAULT_TEXTURE_SIZE,
            height: DEFAULT_TEXTURE_SIZE,
            pixelFormat: PixelFormat.RGBA,
            sampler: new Sampler({
                wrapS: TextureWrap.CLAMP_TO_EDGE,
                wrapT: TextureWrap.CLAMP_TO_EDGE,
                minificationFilter: TextureMinificationFilter.NEAREST,
                magnificationFilter: TextureMagnificationFilter.NEAREST
            })
        });
        this._arrRasterTexture.push(uTexture0);

        // 辅助纹理，用于阴影分析的媒介（上个rasterPointCommand的FBO输出，下个rasterPointCommand的uniform输入）
        const assisTexture = new Texture({
            context: context,
            width: DEFAULT_TEXTURE_SIZE,
            height: DEFAULT_TEXTURE_SIZE,
            pixelFormat: PixelFormat.RGBA,
            sampler: new Sampler({
                wrapS: TextureWrap.CLAMP_TO_EDGE,
                wrapT: TextureWrap.CLAMP_TO_EDGE,
                minificationFilter: TextureMinificationFilter.NEAREST,
                magnificationFilter: TextureMagnificationFilter.NEAREST
            })
        });
        this._arrAssisTexture.push(assisTexture);

        // 一、创建渲染点的drawCommand
        const pointCommand = new DrawCommand({
            primitiveType: PrimitiveType.POINTS,
            modelMatrix: this._modelMatrix,
            boundingVolume: this._boundingSphere,
            pass: Pass.OPAQUE, // ANALYSIS, // OPAQUE, // 
            owner: this,
            cull: true
        });
        this._arrPointCommand.push(pointCommand);
        pointCommand.vertexArray = new VertexArray({
            context: context,
            attributes: attributes,
            indexBuffer: indexBuffer
        });
        var vs = new ShaderSource({
            sources: [ShadowPointsVS]
        });
        vs.defines.push("RENDER_POINT");
        pointCommand.shaderProgram = ShaderProgram.fromCache({
            context: context,
            vertexShaderSource: vs,
            fragmentShaderSource: ShadowPointsFS,
            attributeLocations: attributeLocations
        });
        pointCommand.renderState = RenderState.fromCache({
            cull: { enabled: true },
            depthTest: { enabled: true },
            blending: BlendingState.ALPHA_BLEND
        });
        pointCommand.uniformMap = {
            uPointSize: () => {
                return 10;
            },
            uTexture0: () => {
                return uTexture0;
            },
            uGradienceTexture: () => {
                return this._colorGradienceTexture;
            }
        };

        // 二、创建计算阴影的drawCommand
        const rasterPointCommand = new DrawCommand({
            primitiveType: PrimitiveType.POINTS,
            modelMatrix: this._modelMatrix,
            boundingVolume: this._boundingSphere,
            pass: Pass.ANALYSIS, // OPAQUE, //
            owner: this,
            cull: false
        });
        this._arrRasterPointCommand.push(rasterPointCommand);
        rasterPointCommand.vertexArray = new VertexArray({
            context: context,
            attributes: attributes,
            indexBuffer: indexBuffer
        });
        vs = new ShaderSource({
            sources: [ShadowQueryVS]
        });
        vs.defines.push("RENDER_POINT");
        rasterPointCommand.shaderProgram = ShaderProgram.fromCache({
            context: context,
            vertexShaderSource: vs,
            fragmentShaderSource: ShadowQueryFS,
            attributeLocations: attributeLocations
        });
        rasterPointCommand.renderState = RenderState.fromCache({
            viewport: new BoundingRectangle(0, 0, DEFAULT_TEXTURE_SIZE, DEFAULT_TEXTURE_SIZE),
            cull: { enabled: false },
            depthTest: { enabled: false }
        });

        const uSpacing = 1 / this._currentTime; // 是一个常量（每次创建的时候）
        rasterPointCommand.uniformMap = {
            uPointSize: () => {
                return 4;
            },
            uSpacing: () => {
                return uSpacing;
            },
            uAssisTexture: () => {
                return assisTexture;
            },
            u_shadowMapTexture: () => {
                return this._shadowMap._shadowMapTexture;
            },
            u_shadowMapMatrix: () => {
                return this._shadowMap._shadowMapMatrix;
            },
        };

        rasterPointCommand.framebuffer = new Framebuffer({
            context: context,
            colorTextures: [uTexture0],
            destroyAttachments: false
        });
    }

    /**
     * 更新指定时刻的阴影图对象
     * @private
     * @param {JulianDate} time 
     */
    _updateShadowMap(time) {
        const { _center, _radius, scene, _near, _far } = this;

        const sunWC = getSunWorldPosition(time);
        const sunDirection = Cartesian3.normalize(sunWC, new Cartesian3());
        if (defined(this._shadowMapCamera)) {
            const lightWC = Util.addVectorInScalar(_center, sunDirection, _radius);
            this._shadowMapCamera.position = lightWC;

            const angle = CesiumMath.toDegrees(Cartesian3.angleBetween(sunDirection, _center));
            this._shadowMapCamera.direction = Cartesian3.negate(sunDirection, new Cartesian3());
            this._shadowMapCamera.up = Cartesian3.normalize(lightWC, new Cartesian3());
            this._shadowMapCamera.frustum = new OrthographicFrustum({
                width: _radius * 2,
                aspectRatio: 1.0,
                near: _near,
                far: angle < 90 ? _far : _near, // 无太阳光照时刻的相机强制拉近
            });
        } else {
            this._shadowMapCamera = new Camera(scene);
            const lightWC = Util.addVectorInScalar(_center, sunDirection, _radius);
            this._shadowMapCamera.position = lightWC;

            const angle = CesiumMath.toDegrees(Cartesian3.angleBetween(sunDirection, _center));
            this._shadowMapCamera.direction = Cartesian3.negate(sunDirection, new Cartesian3());
            this._shadowMapCamera.up = Cartesian3.normalize(lightWC, new Cartesian3());
            this._shadowMapCamera.frustum = new OrthographicFrustum({
                width: _radius * 2,
                aspectRatio: 1.0,
                near: _near,
                far: angle < 90 ? _far : _near, // 无太阳光照时刻的相机强制拉近
            });
            this._shadowMap = new ShadowMap({
                lightCamera: this._shadowMapCamera,
                enabled: false,
                isPointLight: false,
                isSpotLight: true,
                cascadesEnabled: false,
                context: scene.context,
                pointLightRadius: _radius
            });
        }
    }

    /**
     * 执行rasterPointCommand-- 更新采样阴影点 ie
     * @private
     * @param {Context} context
     * @param {FrameState} frameState
     */
    _updateShadowPoints(context, frameState) {
        this._depthBuffer.isUpdate = true;
        let times = 0;
        const commandNumber = this._arrRasterPointCommand.length;
        this._depthBuffer._preExecute = () => {
            const sampleTime = JulianDate.addMinutes(this._startTime, times, new JulianDate());
            this._updateShadowMap(sampleTime.clone());
            frameState.shadowMaps.push(this._shadowMap);

            times += this._timeIntervals;
        };
        this._depthBuffer._postExecute = () => {

            for (let index = 0; index < commandNumber; index++) {
                this._arrRasterPointCommand[index].execute(context);
                const pixelData = context.readPixels({
                    x: 0,
                    y: 0,
                    width: DEFAULT_TEXTURE_SIZE,
                    height: DEFAULT_TEXTURE_SIZE,
                    framebuffer: this._arrRasterPointCommand[index].framebuffer
                });
                this._arrAssisTexture[index].copyFrom({
                    width: DEFAULT_TEXTURE_SIZE,
                    height: DEFAULT_TEXTURE_SIZE,
                    arrayBufferView: pixelData
                });
            }

            if (--this._currentTime < 1) {
                this._depthBuffer.isUpdate = false;
                this._timeUpdate = false;
            }
        };
    }

    /**
     * 获取阴影率
     *
     * @param {Cartesian3} queryPosition
     * 
     * @returns {Number} -1表示不在采样点附近区域的点，无法查询有效值
     */
    getShadowRadio(queryPosition) {
        if (!(queryPosition instanceof Cartesian3)) return -1;
        const positionInDegrees = GeoUtil.cartesianToArray(queryPosition);
        let lonInDegrees = positionInDegrees[0];
        let latInDegrees = positionInDegrees[1];
        const height = positionInDegrees[2];
        if (!defined(lonInDegrees) || !defined(latInDegrees) || !defined(height)) {
            return -1;
        }
        if (lonInDegrees < this._bounds[0] || lonInDegrees > this._bounds[2] || latInDegrees < this._bounds[1] || latInDegrees > this._bounds[3]) {
            return -1
        }
        let isInSpacing = false;
        const samplingError = 0.1 * this._spacingIntervals;
        let commandIndex = 0;
        for (var u = 0; u <= this._extrudedHeight; u += this._spacingIntervals) {
            if (Math.abs(this._bottomHeight + u - height) < samplingError) {
                isInSpacing = true;
                break
            }
            commandIndex++
        }
        if (!isInSpacing) {
            return -1
        }
        // 获取采样点
        const samplePoints = this._getSamplePoints();
        const samples = samplePoints.length;
        if (samples < 0) {
            return -1;
        }
        isInSpacing = false;
        const cartesian = Cartesian3.fromDegrees(lonInDegrees, latInDegrees, height);
        for (var i = 0; i < samples; i += 2) {
            let anchor = Cartesian3.fromDegrees(samplePoints[i + 0], samplePoints[i + 1], height);
            const distance = Cartesian3.distance(anchor, cartesian);
            if (distance < samplingError) {
                isInSpacing = true;
                break
            }
        }
        if (!isInSpacing) {
            return -1
        }
        let lonLength = this._bounds[2] - this._bounds[0];
        let latLength = this._bounds[3] - this._bounds[1];
        let minLon = this._bounds[0] - 0.025 * lonLength;
        let minLat = this._bounds[1] - 0.025 * latLength;
        lonLength += 0.05 * lonLength;
        latLength += 0.05 * latLength;

        let canvasWidth = parseInt((lonInDegrees - minLon) / lonLength * DEFAULT_TEXTURE_SIZE);
        let canvasHeight = parseInt((latInDegrees - minLat) / latLength * DEFAULT_TEXTURE_SIZE);
        canvasWidth = Math.max(1, canvasWidth);
        canvasHeight = Math.max(1, canvasHeight);
        // 将四维点坐标转成一位，解决精度问题
        const shadowUnpack = new Cartesian4(1, 1 / 255, 1 / 65025, 1 / 160581375);
        let ratio = 0;
        for (var i = -1; i < 2; i++) {
            for (var j = -1; j < 2; j++) {
                var pixelData = this.scene.context.readPixels({
                    x: canvasWidth + i,
                    y: canvasHeight + j,
                    width: 1,
                    height: 1,
                    framebuffer: this._arrRasterPointCommand[commandIndex].framebuffer
                });
                const point = Cartesian4.unpack(pixelData, 0);
                Cartesian4.divideByScalar(point, 255, point);
                ratio = Math.max(ratio, Cartesian4.dot(point, shadowUnpack));
            }
        }
        return ratio = ratio > 0.999 ? 1 : ratio
    }

    /**
     * 开始阴影分析
     * 
     * @param {Object} options
     * @param {Array.<Number>} options.qureyRegion 指定分析区域的位置信息，由包含经度、纬度的数组表示[lon, lat, lon, lat]
     * @param {Number} [options.bottomHeight] 指定分析区域的底部高程
     * @param {Number} [options.extrudedHeight] 指定分析区域的拉伸高度
     * 
     */
    start(options) {
        if (!defined(options) || !defined(options.qureyRegion)) {
            throw new DeveloperError("BOSGeo.ShadowAnalysis：options.qureyRegion is required！")
        }
        
        if (this._name === "" && !this._checking) {
            this._name = "ShadowQueryPoints";
            this._sceneName = this._name + "_scene";
            defined(this.scene._shadowAnalysis) && this.scene._shadowAnalysis.destroy(); // 目前仅支持一个日照时长分析
            this.scene._shadowAnalysis = this;
            this._checking = true;
        }

        const {
            qureyRegion,
            bottomHeight,
            extrudedHeight
        } = options;

        this._update =
            !isSameNumberList(qureyRegion, this._qureyRegion) ||
            (defined(bottomHeight) && bottomHeight !== this._bottomHeight) ||
            (defined(extrudedHeight) && extrudedHeight !== this._extrudedHeight);

        this._qureyRegion = qureyRegion;
        this._bottomHeight = defaultValue(bottomHeight, this._bottomHeight);
        this._extrudedHeight = defaultValue(extrudedHeight, this._extrudedHeight);
        // this._update = true;
    }

    /**
     * 销毁
     * @returns {undefined}
     */
    destroy() {
        if (defined(this._frameState)) {
            defined(this._depthBuffer) && delete this._frameState.framebufferList[this._sceneName];
            this._frameState = undefined;
            this._depthBuffer = this._depthBuffer && this._depthBuffer.destroy();
            this._clearPointCommands();
            this._clearTextures(true);
            this.scene._shadowAnalysis = undefined;
        }
        return destroyObject(this);
    }

    /**
     * 获取采样点 te
     * @private
     * 
     * @returns {Array.<Number>} [lon, lat]
     */
    _getSamplePoints() {
        let west = Number.MAX_VALUE;
        let south = Number.MAX_VALUE;
        let east = -Number.MAX_VALUE;
        let north = -Number.MAX_VALUE;
        const pointNumber = this._qureyRegion.length / 2;
        for (let i = 0; i < pointNumber; i++) {
            west = Math.min(this._qureyRegion[2 * i], west);
            south = Math.min(this._qureyRegion[2 * i + 1], south);
            east = Math.max(this._qureyRegion[2 * i], east);
            north = Math.max(this._qureyRegion[2 * i + 1], north);
        }
        this._bounds.length = 0;
        this._bounds.push(west);
        this._bounds.push(south);
        this._bounds.push(east);
        this._bounds.push(north);

        let center = Cartesian3.fromDegrees(0.5 * (east + west), 0.5 * (north + south), this._bottomHeight + 0.5 * this._extrudedHeight);
        Cartesian3.clone(center, this._boundingSphere.center);
        Matrix4.setTranslation(this._modelMatrix, center, this._modelMatrix);

        const bottomPoint = Cartesian3.fromDegrees(west, south, this._bottomHeight);
        const topPoint = Cartesian3.fromDegrees(east, north, this._bottomHeight + this._extrudedHeight);
        center = Cartesian3.subtract(topPoint, bottomPoint, center);
        this._boundingSphere.radius = 0.5 * Cartesian3.magnitude(center);

        const distance = sphericalDistance(west, south, east, north); // 计算地理矩形范围的对角线在椭球面的弧长
        const samples = distance / this._spacingIntervals;
        const count = parseInt(samples) + 1;
        const sampleDistance = (east - west) / count * 0.2; // 水平采样间距缩小到0.2倍
        const result = [];
        for (var index = 0, lon = west; lon < east; lon += sampleDistance) {
            for (var lat = south; lat < north; lat += sampleDistance) {
                const point = {
                    x: lon,
                    y: lat
                };
                isInRange(point, this._qureyRegion) && (result[index++] = lon, result[index++] = lat)
            }
        }
        this._center = Cartesian3.clone(this._boundingSphere.center);
        this._radius = Math.max(this._boundingSphere.radius, distance);

        this._near = 0.1;
        this._far = 5000;
        return result;
    }

}

/**
 * 判断点是否在包围盒范围内
 * @private
 * @param {Object} point {x, y}
 * @param {Array.<Number>} region
 * @returns {Boolean}
 */
function isInRange(point, region) {
    const pointNumber = region.length / 2;
    let isIn = false;
    let front = 0, back = 0;
    for (back = pointNumber - 1; front < pointNumber; back = front++) {
        var lon1 = region[2 * front],
            lat = region[2 * front + 1],
            lon2 = region[2 * back],
            lat2 = region[2 * back + 1],
            minLon = Math.min(lon1, lon2),
            maxLon = Math.max(lon1, lon2),
            minLat = Math.min(lat, lat2),
            maxLat = Math.max(lat, lat2);
        if (lat2 != lat) {
            if (minLat > point.y == maxLat < point.y) {
                var slope = (lon2 - lon1) * (point.y - lat) / (lat2 - lat) + lon1;
                if (point.x < slope) {
                    isIn = !isIn;
                } else {
                    if (point.x == slope) {
                        return true
                    }
                }
            }
        } else {
            if (point.y == lat && point.x >= minLon && point.x <= maxLon) {
                return true
            }
        }
    }
    return isIn
}

/**
 * 计算经纬度距离(单位为度）
 * 
 * @private
 * 
 * @param {Number} west
 * @param {Number} south
 * @param {Number} east
 * @param {Number} north
 * @returns {Number}
 */
function sphericalDistance(west, south, east, north) {
    if (!defined(west) || !defined(east)) {
        throw new DeveloperError("longitude is required.")
    }
    if (!defined(south) || !defined(north)) {
        throw new DeveloperError("latitude is required.")
    }
    if (west === east && south === north) {
        return 0;
    }
    var minLon = CesiumMath.toRadians(south);
    var maxLon = CesiumMath.toRadians(north);
    var minLat = CesiumMath.toRadians(west);
    var maxLat = CesiumMath.toRadians(east);
    var southWest = minLat * minLat + minLon * minLon;
    var northEast = maxLat * maxLat + maxLon * maxLon;
    var distanceSquare = (minLat - maxLat) * (minLat - maxLat) + (minLon - maxLon) * (minLon - maxLon);
    var distance = (southWest + northEast - distanceSquare) / (2 * Math.sqrt(southWest) * Math.sqrt(northEast));
    distance = CesiumMath.clamp(distance, -1, 1); // 计算弧度
    return Math.acos(distance) * 6378137;  // CesiumMath.Radious = 6378137
}

/**
 * 获取某一时刻下世界坐标系下的太阳位置
 * @private
 * @param {JulianDate} time 
 * 
 * @returns {Cartesian3}
 */
function getSunWorldPosition(time) {
    if (!(time instanceof JulianDate)) {
        throw new DeveloperError('getSunWorldPosition: time不属于JulianDate类型!', time);
    }
    const sunPosition = Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(time);
    const matrix = Transforms.computeTemeToPseudoFixedMatrix(time, new Matrix3());
    // const sunWC = Matrix3.multiplyByVector(matrix, sunPosition, new Cartesian3());
    return Matrix3.multiplyByVector(matrix, sunPosition, new Cartesian3());
}

/**
 * 数组的内容是否一致
 * @private
 * @param {Array.<Number>} numberList1 
 * @param {Array.<Number>} numberList2 
 * @return {Boolean}
 */
function isSameNumberList(numberList1, numberList2) {
    const len = numberList1.length;
    if (len !== numberList2.length) {
        return false;
    }

    for (let i = 0; i < len; i++) {
        if (numberList1[i] !== numberList2[i]) {
            return false;
        }
    }
    return true;
}

/**
 * 获取范围内的采样点
 * @private
 * @param {Array.<Cartesain3>} range 
 * @param {Number} [spacingIntervals=5] 采样距离,单位为m
 * 
 * @example
 * var samplePoints = getSamplePointsByRange(range, spacingIntervals);
 */
function getSamplePointsByRange(range, spacingIntervals = 5) {
    const pointsInDegrees = range.map((carteisan3) => GeoUtil.cartesianToArray(carteisan3));
    pointsInDegrees.push(pointsInDegrees[0]);

    const turfPolygon = turf.polygon([pointsInDegrees]);
    const bbox = turf.bbox(turfPolygon);
    const features = turf.pointGrid(bbox, spacingIntervals, {
        mask: turfPolygon,
        units: 'meters'
    }).features;
    return features.map((feature) => feature.geometry.coordinates);
}

// 纹理尺寸
const DEFAULT_TEXTURE_SIZE = 1024;

export default ShadowAnalysis;




