
import Cartesian3 from 'cesium/Core/Cartesian3';
import Matrix4 from 'cesium/Core/Matrix4';
import PerspectiveFrustum from 'cesium/Core/PerspectiveFrustum';
import DeveloperError from 'cesium/Core/DeveloperError';
import Check from 'cesium/Core/Check';
import defined from 'cesium/Core/defined';
import VertexFormat from 'cesium/Core/VertexFormat';
import buildModuleUrl from 'cesium/Core/buildModuleUrl';
import GeometryInstance from 'cesium/Core/GeometryInstance';
import GeometryAttributes from 'cesium/Core/GeometryAttributes';
import GeometryAttribute from 'cesium/Core/GeometryAttribute';
import ComponentDatatype from 'cesium/Core/ComponentDatatype';
import Geometry from 'cesium/Core/Geometry';
import PrimitiveType from 'cesium/Core/PrimitiveType';
import BoundingSphere from 'cesium/Core/BoundingSphere';
import destroyObject from 'cesium/Core/destroyObject';
import ColorGeometryInstanceAttribute from 'cesium/Core/ColorGeometryInstanceAttribute';
import Color from 'cesium/Core/Color';
import ShowGeometryInstanceAttribute from 'cesium/Core/ShowGeometryInstanceAttribute';
import CesiumMath from 'cesium/Core/Math';

import Primitive from 'cesium/Scene/Primitive';
import ShadowVolumeAppearance from 'cesium/Scene/ShadowVolumeAppearance';
import MaterialAppearance from 'cesium/Scene/MaterialAppearance';
import ClassificationPrimitive from 'cesium/Scene/ClassificationPrimitive';
import PerInstanceColorAppearance from 'cesium/Scene/PerInstanceColorAppearance';
import Material from 'cesium/Scene/Material';
import ClassificationType from 'cesium/Scene/ClassificationType';
import createGuid from 'cesium/Core/createGuid';

import CustomPrimitive from './CustomPrimitive';
import Util from '../../utils/Util';

class VideoPrimitive extends CustomPrimitive {

    /**
     * 视频图像投射图元类
     * 
     * @constructor
     * @alias VideoPrimitive
     * 
     * @private
     * 
     * @param {Object} options 
     * @param {String|Object} options.id 图元id
     * @param {Matrix4} options.inverseViewMatrix 视图矩阵的逆矩阵
     * @param {HTMLVideoElement|HTMLCanvasElement|String} options.mappingObject 投射对象——视频图像DOM对象
     * @param {Boolean} [options.showFrustum=false] 是否显示（投射的）视锥线
     * @param {PerspectiveFrustum} [options.frustum] 视频投影的视锥体对象
     * @param {String} [options.alpha=1.0] 视频纹理不透明度，范围0~1
     * @param {Number} [options.intensity=1.0] 投射颜色的亮度，大于0
     * @param {Number} [options.rotation=0] 投射内容旋转角度，单位为弧度
     * 
     * @see VideoMapping
     */
    constructor(options = {}) {
        super();

        if (!defined(options.inverseViewMatrix)) {
            throw new DeveloperError('options.inverseViewMatrix未定义!');
        }
        if (!defined(options.mappingObject)) {
            throw new DeveloperError('options.videoElement未定义!');
        }

        const {
            id = createGuid(),
            inverseViewMatrix,
            mappingObject,
            showFrustum = false,
            frustum = new PerspectiveFrustum({
                fov: CesiumMath.toRadians(30),
                aspectRatio: 1.333,
                near: 10,
                far: 100
            }),
            alpha = 1.0,
            intensity = 1.0,
            rotation = 0,
        } = options;

        this._inverseViewMatrix = Matrix4.clone(inverseViewMatrix);
        this._curInVMat = new Matrix4();

        this._mappingObject = mappingObject;

        this._showHelperPrimitive = showFrustum;

        this._frustum = frustum.clone();
        this._alpha = alpha;
        this._intensity = intensity;
        this._rotation = rotation;

        /**
         * 标识id对象
         * @property {Object}
         * 
         * @readonly
         */
        this.id = id;

        // 视锥的Model-View矩阵
        this._boxMV = new Matrix4();

        // 视锥的模型矩阵
        this._primitiveModelMatrix = new Matrix4();
        this._inverseBoxMV = new Matrix4();

        // 1.创建uniform
        this._uniformMap = {
            // MV 的逆矩阵
            u_inverseBoxMV: () => {
                return this._inverseBoxMV;
            },
            // MV 矩阵
            u_boxMV: () => {
                return this._boxMV;
            }
        };

        // 2.创建材质
        this.createAppearance();

        // 3.创建投影阴影体对象
        this.primitive = this.createPrimitive();

        const vertexShaderSource = 'attribute vec3 position3DHigh;\n' +
            'attribute vec3 position3DLow;\n' +
            'attribute vec4 color;\n' +
            'attribute float batchId;\n' +
            '\n' +
            'varying vec4 v_color;\n' +
            '\n' +
            'uniform mat4 u_boxMV;\n' +
            '\n' +
            'void main()\n' +
            '{\n' +
            '    v_color = color;\n' +
            '\n' +
            '    vec4 p = vec4(position3DHigh + position3DLow, 1.0);\n' + //计算模型坐标系下的坐标
            '    p.y -= 1.001;\n' +
            '    p = u_boxMV * p;\n' +
            '    p.xyz /= p.w;\n' +
            '    p.w = 1.0;\n' +
            '    gl_Position = czm_projection * p;\n' +
            '}';

        // 辅助线对象
        this._helperPrimitive = new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: createFrustumGeometry(true),
                attributes: {
                    color: ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 0.0, 0.0, 1.0)),
                    show: new ShowGeometryInstanceAttribute(true)
                },
                id: 'cameraVideoHelper'
            }),
            appearance: new PerInstanceColorAppearance({
                closed: false,
                flat: true,
                translucent: false,
                vertexShaderSource
            }),
            asynchronous: false,
            // compressVertices: false,
            // cull: false,
            show: showFrustum,
            allowPicking: false
        });

        this._helperPrimitive.appearance.uniforms = {
            u_boxMV: this._boxMV
        };

        this._projectionMatrix = new Matrix4();
        this._inverseViewProjectionMatrix = new Matrix4();
        this._viewProjectionMatrix = new Matrix4();
        this.show = true;
    }

    /**
     * 是否显示（投射的）视锥线
     * 
     * @property {Boolean} showFrustum
     * @default true
     */
    get showFrustum() {
        return this._showHelperPrimitive;
    }
    set showFrustum(value) {
        Check.typeOf.bool('value', value);
        this._helperPrimitive.show = value;
    }

    /**
     * 投射对象——视频图像DOM对象/图像地址
     * 
     * @property {HTMLVideoElement|HTMLCanvasElement|String} image
     */
    get mappingObject() {
        return this.primitive.appearance.material.uniforms.image;
    }
    set mappingObject(image) {
        this.primitive.appearance.material.uniforms.image = image;
    }

    /** 
     * 投射视椎体
     * 
     * @property {PerspectiveFrustum} frustum 
     */
    get frustum() {
        return this._frustum;
    }
    set frustum(value) {
        if (value instanceof PerspectiveFrustum && !value.equals(this._frustum)) {
            this._frustum = value;
        }
    }

    /**
     * 投射内容的不透明度，范围0~1
     * 
     * @property {Number} alpha
     * @default 1.0
     */
    get alpha() {
        return this._alpha;
    }
    set alpha(value) {
        Check.typeOf.number('value', value);
        if (value !== this._alpha && value >= 0) {
            this._alpha = value;
            this.createAppearance();
            this.primitive = this.primitive && this.primitive.destroy();
            this.primitive = this.createPrimitive();
        }
    }

    /**
     * 投射颜色的亮度，大于0
     * 
     * @property {Number} intensity
     * @default 1.0
     */
    get intensity() {
        return this._intensity;
    }
    set intensity(value) {
        Check.typeOf.number('value', value);
        if (value !== this._intensity && value >= 0) {
            this._intensity = value;
            this.createAppearance();
            this.primitive = this.primitive && this.primitive.destroy();
            this.primitive = this.createPrimitive();
        }
    }

    /**
     * 投射内容旋转角度，单位为弧度
     * 
     * @property {Number} rotation
     * @default 0.0
     */
    get rotation() {
        return this._rotation;
    }
    set rotation(value) {
        Check.typeOf.number('value', value);
        if (value !== this._rotation) {
            this._rotation = value;
            this.createAppearance();
            this.primitive = this.primitive && this.primitive.destroy();
            this.primitive = this.createPrimitive();
        }
    }

    /**
     * 视图矩阵的逆矩阵
     * @property {Matrix4} inverseViewMatrix
     */
    get inverseViewMatrix() {
        return this._inverseViewMatrix;
    }
    set inverseViewMatrix(value) {
        if (value instanceof Matrix4 && !value.equals(this._inverseViewMatrix)) {
            this._inverseViewMatrix = Matrix4.clone(value);
        }
    }

    /**
     * 更新外观材质
     * @private
     */
    createAppearance() {
        // 早diffuse进行了纹理坐标的旋转，是旋转了坐标，而不是纹理本身（所以需要在此处对旋转角度进行取反---逆时针为正）
        const cosThetaStr = Util.parseFloatWithDot(Math.cos(-this._rotation), 6);
        const sinThetaStr = Util.parseFloatWithDot(Math.sin(-this._rotation), 6);
        const lightnessStr = Util.parseFloatWithDot(this._intensity, 2);
        const material = new Material({
            fabric: {
                type: 'VideoPrimitive',
                uniforms: {
                    image: '',
                },
                components: {
                    diffuse:
                        `texture2D(image, fract( mat2(${cosThetaStr}, ${sinThetaStr}, -1.0 * ${sinThetaStr}, ${cosThetaStr}) * (materialInput.st - 0.5) + 0.5 )).rgb * ${lightnessStr}`,
                    // `texture2D(image, fract( mat2(${cosThetaStr}, ${sinThetaStr}, -${sinThetaStr}, ${cosThetaStr}) * materialInput.st)).rgb * ${lightnessStr}`,
                    // `czm_HSLToRGB(vec3(czm_RGBToHSL( texture2D(image, fract(materialInput.st)).rgb ).xy, ${Util.parseFloatWithDot(this._intensity, 2)}))`,
                    // 'texture2D(image, fract(materialInput.st)).rgb',
                    alpha: Util.parseFloatWithDot(this._alpha, 2)
                }
            }
        });
        material.uniforms.image = this._mappingObject;

        const appearance = new MaterialAppearance({
            material: material,
            closed: false
        });
        appearance._vertexFormat = VertexFormat.POSITION_ONLY;
        appearance.isCameraVideo = true;
        this._appearance = appearance;
    }

    /**
     * 创建图元
     * @private
     * 
     * @returns {Primitive}
     */
    createPrimitive() {
        const primitive = new ClassificationPrimitive({
            geometryInstances: new GeometryInstance({
                geometry: createFrustumGeometry(),
                attributes: {
                    color: ColorGeometryInstanceAttribute.fromColor(new Color(1, 0, 0, 1)),
                    show: new ShowGeometryInstanceAttribute(true),
                    isCameraVideo: new ShowGeometryInstanceAttribute(true)
                },
                id: this.id
            }),
            classificationType: ClassificationType.CESIUM_3D_TILE,
            _uniformMap: this._uniformMap,
            appearance: this._appearance,
            asynchronous: false,
            //compressVertices: false,
            allowPicking: false
        });

        // 设置阴影体的属性
        primitive.isCameraVideo = true;
        Object.defineProperties(primitive, {
            _sp: {
                set: function (sp) {
                    if (this.__sp === sp || !defined(sp)) {
                        return;
                    }
                    var vs = sp.vertexShaderSource;
                    if (vs.defines.indexOf('CAMERA_VIDEO') === -1) {
                        vs.defines.push('CAMERA_VIDEO');
                    }
                    this.__sp = sp;
                },
                get: function () {
                    return this.__sp;
                }
            }
        });

        return primitive;
    }

    /**
     * 视椎体图元更新方法(cesium内部调用)
     * @private
     * 
     * @param {FrameState} frameState 
     * @returns {undefined}
     */
    update(frameState) {
        if (!this.show) return;

        // 判断视锥的投影矩阵与原先上一帧存储的投影矩阵是否相等（视锥是否发生变化）
        const isProjMatrixChanged = Matrix4.equals(this._frustum.projectionMatrix, this._projectionMatrix);

        // 视锥的朝向，坐标是否变化
        const isViewMatrixChanged = Matrix4.equals(this._inverseViewMatrix, this._curInVMat);

        // 更新对应矩阵
        if (!isProjMatrixChanged) {
            Matrix4.clone(this._frustum.projectionMatrix, this._projectionMatrix);
        }

        if (!isViewMatrixChanged) {
            Matrix4.clone(this._inverseViewMatrix, this._curInVMat);
        }

        // 如果参数发生变化，即矩阵更新了
        if (!isProjMatrixChanged || !isViewMatrixChanged) {
            let inverseViewProjectionMatrix = this._inverseViewProjectionMatrix;
            Matrix4.inverse(this._projectionMatrix, inverseViewProjectionMatrix);

            // 获取VP的逆矩阵
            Matrix4.multiply(this._curInVMat, inverseViewProjectionMatrix, inverseViewProjectionMatrix);
            let viewProjectionMatrix = this._viewProjectionMatrix;
            Matrix4.inverse(inverseViewProjectionMatrix, viewProjectionMatrix);
            let primitiveModelMatrix = this._primitiveModelMatrix;
            Matrix4.fromUniformScale(this._frustum.far, primitiveModelMatrix);
            Matrix4.multiply(this._curInVMat, primitiveModelMatrix, primitiveModelMatrix);
            this._helperPrimitive.modelMatrix = this._primitiveModelMatrix;
        }
        if (this.primitive._primitive) {
            this.primitive._primitive.modelMatrix = this._primitiveModelMatrix;
        }

        // 计算相机坐标系转换矩阵
        Matrix4.multiply(frameState.camera.viewMatrix, this._inverseViewProjectionMatrix, this._boxMV);
        Matrix4.multiply(this._viewProjectionMatrix, frameState.camera.inverseViewMatrix, this._inverseBoxMV);

        this.primitive.update(frameState);
        this._helperPrimitive.update(frameState);
    }

    /**
     * 内部调用
     * @private
     * @returns {boolean}
     */
    isDestroyed() {
        return false;
    }

    /**
     * 内部调用
     * @private
     */
    destroy() {
        this.primitive = this.primitive && this.primitive.destroy();
        this._helperPrimitive = this._helperPrimitive && this._helperPrimitive.destroy();
        return destroyObject(this);
    }
}

// 重写Primitive类的_modifyShaderPosition方法
var _modifyShaderPosition = Primitive._modifyShaderPosition;
Primitive._modifyShaderPosition = function (primitive, vertexShaderSource, scene3DOnly) {
    var vs = _modifyShaderPosition(primitive, vertexShaderSource, scene3DOnly);
    if (primitive.isCameraVideo && vs.indexOf('CAMERA_VIDEO') === -1) {
        vs = vs.replace(
            'void main()',

            '#ifdef CAMERA_VIDEO\n' +
            'uniform mat4 u_boxMV;\n' +
            '#endif\n' +
            '\n' +
            'void main()'
        )
            .replace(
                'gl_Position = czm_depthClamp(czm_modelViewProjectionRelativeToEye * position);',

                '#ifdef CAMERA_VIDEO\n' +
                '\n' +
                '   position.y -= 1.000;\n' +
                '   position = u_boxMV * position;\n' + //将世界坐标转换至视点坐标系下
                '   position.xyz /= position.w;\n' +
                '   position.w = 1.0;\n' +
                // 将坐标投影至相机远平面,czm_projection:一个4*4的变换矩阵，用于将视点坐标转换至裁剪坐标
                '   gl_Position = czm_depthClamp(czm_projection * position);\n' +
                '\n' +
                '#else\n' +
                '\n' +
                '   gl_Position = czm_depthClamp(czm_modelViewProjectionRelativeToEye * position);\n' +
                '\n' +
                '#endif'
            )
            .replace(
                'vec4 position = czm_computePosition();',

                'vec4 position = czm_computePosition();\n' +
                '#ifdef CAMERA_VIDEO\n' +
                'position = vec4(position3DLow + position3DHigh, 1.0);\n' +
                '#endif'
            );
    }
    return vs;

};

var hasAttributesForTextureCoordinatePlanes = ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes;
ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes = function (attributes) {
    if (defined(attributes.isCameraVideo)) {
        return true;
    }
    return hasAttributesForTextureCoordinatePlanes(attributes);

};

var createFragmentShader = ShadowVolumeAppearance.prototype.createFragmentShader;
ShadowVolumeAppearance.prototype.createFragmentShader = function (columbusView2D) {
    var shaderSource = createFragmentShader.bind(this)(columbusView2D);
    if (this._appearance.isCameraVideo) {
        var shaderDefines = ['TEXTURE_COORDINATES', 'CULL_FRAGMENTS', 'USES_ST'];
        shaderDefines.forEach(function (define) {
            var index = shaderSource.defines.indexOf(define);

            // 如果当前有该预编译指令
            if (index !== -1) {
                // 则将其删除
                shaderSource.defines.splice(index, 1);
            }
        });

        // 加入新的预编译指令
        shaderSource.defines.push('CAMERA_VIDEO');
        shaderSource.sources.forEach(function (source, index) {
            // 在头部传入预编译指令，以及uniform，修改默认position，以及st
            if (source.indexOf('uniform mat4 u_inverseBoxMV') < 0) {
                source = source.replace(
                    'void main(void)',
                    '#ifdef CAMERA_VIDEO\n' +
                    '   uniform mat4 u_inverseBoxMV;\n' +
                    '#endif\n' +
                    '\n' +
                    'void main(void)'
                );
            }
            if (source.indexOf('vec4 videoShadowPosition') < 0) {
                source = source.replace(
                    'czm_material material = czm_getMaterial(materialInput);',
                    '#ifdef CAMERA_VIDEO\n' +
                    '   vec4 videoShadowPosition = u_inverseBoxMV * eyeCoordinate;\n' +
                    // 这里执行透视除法
                    '   videoShadowPosition.xyz = videoShadowPosition.xyz / videoShadowPosition.w;\n' +
                    '   materialInput.st = videoShadowPosition.xy * 0.5 + 0.5;\n' +
                    '#endif\n' +
                    '\n' +
                    'czm_material material = czm_getMaterial(materialInput);'
                );
            }
            shaderSource.sources[index] = source;

        });
    }
    return shaderSource;
};

var createVertexShader = ShadowVolumeAppearance.prototype.createVertexShader;
//这里重写了 ShadowVolumeAppearance.prototype.createVertexShader方法
ShadowVolumeAppearance.prototype.createVertexShader = function (defines, vertexShaderSource, columbusView2D, mapProjection) {
    var shaderSource = createVertexShader.bind(this)(defines, vertexShaderSource, columbusView2D, mapProjection);

    //这里判断如果是CameraVideo，则改些默认shader
    if (this._appearance.isCameraVideo) {
        var shaderDefines = ['TEXTURE_COORDINATES', 'CULL_FRAGMENTS', 'USES_ST'];
        shaderDefines.forEach(function (define) {
            var index = shaderSource.defines.indexOf(define);
            if (index !== -1) {
                shaderSource.defines.splice(index, 1);
            }
        });
        //重新添加预编译指令
        shaderSource.defines.push('CAMERA_VIDEO');
    }
    return shaderSource;
};

let lengthDir = new Cartesian3();

/**
 * 创建视椎体几何对象
 * 
 * @private
 * 
 * @param {Boolean} isLine 是线还是面
 * 
 * @returns {Geometry}
 */
function createFrustumGeometry(isLine) {
    var start = new Cartesian3(-1, -1, -1);
    var end = new Cartesian3(1, 1, 1);
    start.y += 1.001;
    end.y += 1.001;
    var position = new Float64Array(8 * 3);
    position[0] = start.x;
    position[1] = start.y;
    position[2] = start.z;
    position[3] = end.x;
    position[4] = start.y;
    position[5] = start.z;
    position[6] = end.x;
    position[7] = end.y;
    position[8] = start.z;
    position[9] = start.x;
    position[10] = end.y;
    position[11] = start.z;
    position[12] = start.x;
    position[13] = start.y;
    position[14] = end.z;
    position[15] = end.x;
    position[16] = start.y;
    position[17] = end.z;
    position[18] = end.x;
    position[19] = end.y;
    position[20] = end.z;
    position[21] = start.x;
    position[22] = end.y;
    position[23] = end.z;

    var attributes = new GeometryAttributes();
    attributes.position = new GeometryAttribute({
        componentDatatype: ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: position
    });

    var trianglesIndies = new Uint16Array(6 * 2 * 3);
    trianglesIndies[0] = 4;
    trianglesIndies[1] = 5;
    trianglesIndies[2] = 6;
    trianglesIndies[3] = 4;
    trianglesIndies[4] = 6;
    trianglesIndies[5] = 7;
    trianglesIndies[6] = 1;
    trianglesIndies[7] = 0;
    trianglesIndies[8] = 3;
    trianglesIndies[9] = 1;
    trianglesIndies[10] = 3;
    trianglesIndies[11] = 2;
    trianglesIndies[12] = 1;
    trianglesIndies[13] = 6;
    trianglesIndies[14] = 5;
    trianglesIndies[15] = 1;
    trianglesIndies[16] = 2;
    trianglesIndies[17] = 6;
    trianglesIndies[18] = 2;
    trianglesIndies[19] = 3;
    trianglesIndies[20] = 7;
    trianglesIndies[21] = 2;
    trianglesIndies[22] = 7;
    trianglesIndies[23] = 6;
    trianglesIndies[24] = 3;
    trianglesIndies[25] = 0;
    trianglesIndies[26] = 4;
    trianglesIndies[27] = 3;
    trianglesIndies[28] = 4;
    trianglesIndies[29] = 7;
    trianglesIndies[30] = 0;
    trianglesIndies[31] = 1;
    trianglesIndies[32] = 5;
    trianglesIndies[33] = 0;
    trianglesIndies[34] = 5;
    trianglesIndies[35] = 4;
    for (var i = 0; i < 36; i += 3) {
        trianglesIndies[i] = trianglesIndies[i] ^ trianglesIndies[i + 2];
        trianglesIndies[i + 2] = trianglesIndies[i] ^ trianglesIndies[i + 2];
        trianglesIndies[i] = trianglesIndies[i] ^ trianglesIndies[i + 2];
    }
    var lineIndies;
    if (isLine) {
        lineIndies = new Uint16Array(6 * 2 * 2);
        lineIndies[0] = 0;
        lineIndies[1] = 1;
        lineIndies[2] = 1;
        lineIndies[3] = 2;
        lineIndies[4] = 2;
        lineIndies[5] = 3;
        lineIndies[6] = 3;
        lineIndies[7] = 0;
        lineIndies[8] = 4;
        lineIndies[9] = 5;
        lineIndies[10] = 5;
        lineIndies[11] = 6;
        lineIndies[12] = 6;
        lineIndies[13] = 7;
        lineIndies[14] = 7;
        lineIndies[15] = 4;
        lineIndies[16] = 0;
        lineIndies[17] = 4;
        lineIndies[18] = 1;
        lineIndies[19] = 5;
        lineIndies[20] = 2;
        lineIndies[21] = 6;
        lineIndies[22] = 3;
        lineIndies[23] = 7;
    }
    Cartesian3.subtract(end, start, lengthDir);
    var radius = Cartesian3.magnitude(lengthDir) * 0.5;
    return new Geometry({
        attributes: attributes,
        indices: isLine ? lineIndies : trianglesIndies,
        primitiveType: isLine ? PrimitiveType.LINES : PrimitiveType.TRIANGLES,
        boundingSphere: new BoundingSphere(Cartesian3.ZERO, radius)
    });
}

export default VideoPrimitive;