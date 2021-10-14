import PolygonGeometry from "cesium/Core/PolygonGeometry";
import Cartographic  from "cesium/Core/Cartographic";
import Matrix4 from "cesium/Core/Matrix4";
import ClassificationType from "cesium/Scene/ClassificationType";
import Cartesian3 from "cesium/Core/Cartesian3";
import Cartesian4 from "cesium/Core/Cartesian4";
import CesiumMath from "cesium/Core/Math";
import PolygonHierarchy from "cesium/Core/PolygonHierarchy";
import VertexFormat from "cesium/Core/VertexFormat";
import ComponentDatatype from "cesium/Core/ComponentDatatype";
import Framebuffer from "cesium/Renderer/Framebuffer";
import Texture from "cesium/Renderer/Texture";
import BufferUsage from "cesium/Renderer/BufferUsage";
import PixelFormat from "cesium/Core/PixelFormat";
import Material from "cesium/Scene/Material";
import PassState from "cesium/Renderer/PassState";
import Buffer from "cesium/Renderer/Buffer";
import Camera from "cesium/Scene/Camera";
import BlendingState from "cesium/Scene/BlendingState";
import BoundingRectangle from "cesium/Core/BoundingRectangle";
import ClearCommand from "cesium/Renderer/ClearCommand";
import PixelDatatype from "cesium/Renderer/PixelDatatype";
import VertexArray from "cesium/Renderer/VertexArray";
import RenderState from "cesium/Renderer/RenderState";
import ShaderProgram from "cesium/Renderer/ShaderProgram";
import DrawCommand from "cesium/Renderer/DrawCommand";
import Pass from "cesium/Renderer/Pass";
import Plane from "cesium/Core/Plane";
import PrimitiveType from "cesium/Core/PrimitiveType";
import BoundingSphere from "cesium/Core/BoundingSphere";
import DebugCameraPrimitive from "cesium/Scene/DebugCameraPrimitive";
import Color from "cesium/Core/Color";
import IndexDatatype from "cesium/Core/IndexDatatype";

/**
 *
 *反射镜面，有倒影
 * @ignore
 */
class ReflectPlane {
    constructor(options){
        this._viewer = options.viewer;
        let center = options.center;
        var context = this._viewer.scene.context;
        this.modelViewMatrix = new Matrix4();
        this.modelViewProjection = new Matrix4();

        let that = this;
        var positions = [];
        var polygonHierarchy = new PolygonHierarchy();


        this.ellipsoid= this._viewer.scene.globe.ellipsoid;

        positions.push(Cartesian3.fromDegrees(center.x-0.03, center.y,0));
        positions.push(Cartesian3.fromDegrees(center.x, center.y-0.03,0));
        positions.push(Cartesian3.fromDegrees(center.x+0.03, center.y,0));
        positions.push(Cartesian3.fromDegrees(center.x, center.y+0.03,0));

        polygonHierarchy.positions = positions;

        var reflectPolygon = new PolygonGeometry({
            polygonHierarchy: polygonHierarchy,
            perPositionHeight : true,
            vertexFormat : VertexFormat.POSITION_NORMAL_AND_ST
        });

        this._reflectPolygon = reflectPolygon;
        this._planeCenterPos = undefined;

        let width = context.drawingBufferWidth;
        let height = context.drawingBufferHeight ;

        this._reflectCamera = new Camera( this._viewer.scene);
        var colorTexture = new Texture({
            context: context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA
        });

        var framebuffer = new Framebuffer({
            context :  context,
            colorTextures : [colorTexture],
            depthTexture : new Texture({
                context: context,
                width: width,
                height: height,
                pixelFormat: PixelFormat.DEPTH_COMPONENT,
                pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
            })
        });
        this._reflectPassState = new PassState( context);
        this._reflectPassState.viewport = new BoundingRectangle(0,0,width,height);
        this._reflectPassState.framebuffer = framebuffer;

        this.createGeometry();

        this.fragment ='#ifdef GL_OES_standard_derivatives\n' +
            '#extension GL_OES_standard_derivatives : enable\n' +
            '#endif\n'+
            'uniform sampler2D reflectTex; \n'+
            'varying vec3 pos; \n'+
            'varying vec3 v_positionEC; \n'+
            'varying vec3 v_vertexWC; \n'+
            'varying vec3 v_normalEC; \n'+
            'varying vec3 v_normalMC; \n'+
            'varying vec4 projectionCoord; \n'+
            'varying vec2 v_UV; \n'+
            'float rand(float n){\n' +
            '    return fract(sin(n) * 43758.5453123);\n' +
            '}\n' +
            '\n' +
            'float noise(float p){\n' +
            '    float fl = floor(p);\n' +
            '    float fc = fract(p);\n' +
            '    return mix(rand(fl), rand(fl + 1.0), fc);\n' +
            '}\n'+
            ' void main() \n' +
            '{ \n'+
            'vec2 final = projectionCoord.xy / projectionCoord.w;\n' +
            'final = final * 0.5 + 0.5;\n' +
            'final.y = 1.0 - final.y;\n'+
            'float diffuse = max(dot(vec3(0.0, 0.0, 1.0), v_normalEC), 0.0); \n'+
            'diffuse += max(dot(vec3(0.0, 1.0, 0.0), v_normalEC), 0.0);\n'+
            'diffuse += max(dot(vec3(1.0, 0.0, 1.0), v_normalEC), 0.0);\n'+
            'vec4 reflectColor = texture2D(reflectTex,final); \n'+
            ' gl_FragData[0] = mix(reflectColor * 0.2 , vec4(0.02,0.02,0.02,0.3) , 0.5);\n' +
            ' gl_FragData[0].a =reflectColor.a;\n' +
            '} \n';

        this.vertex = 'attribute vec3 position;\n' +
            'attribute vec3 normal;\n' +
            'attribute vec2 uv;\n' +
            'uniform mat4 u_modelViewMatrix; \n'+
            'varying vec3 pos; \n'+
            'varying vec4 color; \n'+
            'varying vec3 v_positionEC; \n'+
            'varying vec3 v_vertexWC; \n'+
            'varying vec3 v_normalEC; \n'+
            'varying vec3 v_normalMC; \n'+
            'varying vec2 v_UV; \n'+
            'varying vec4 projectionCoord; \n'+
            'void main() \n' +
            '{ \n' +
            '  gl_Position = czm_projection *  u_modelViewMatrix * vec4( position, 1.0 ); \n'+
            '  vec4 positionxyzw =  vec4(position, 1.0); \n' +
            '  pos = positionxyzw.xyz / positionxyzw.w; \n' +
            '  v_positionEC = position.xyz; \n'+
            ' v_vertexWC = (czm_model * vec4( position, 1.0 )).xyz;\n'+
            '  float eachHeight = clamp(position.z / 100.0,0.0,1.0);\n '+
            'v_normalEC = czm_normal * normal; \n'+
            'v_normalMC = normal; \n '+
            'v_UV = uv; \n'+
            'projectionCoord = gl_Position;\n'+
            '} \n';

        this._modelMatrix =new Matrix4(1, 0, 0, this._planeCenterPos.x,
            0, 1, 0, this._planeCenterPos.y,
            0, 0, 1, this._planeCenterPos.z,
            0, 0, 0, 1);


        var rs = RenderState.fromCache({
            depthTest :{
                enabled : true
            },
            blending : BlendingState.ALPHA_BELND
        });

        var sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : that.vertex,
            fragmentShaderSource : that.fragment
        })

        this._uniformMap = {
            u_modelViewMatrix : function() {
                return context.uniformState.modelView;
            },
            reflectTex : function() {
                return that._reflectPassState.framebuffer.getColorTexture(0);
            }
        };

        var bs = new BoundingSphere({
            center : Cartesian3.ZERO,
            radius :1.0
        });
        this.drawCommand = new DrawCommand({
            owner: that,
            cull : false,
            modelMatrix : that._modelMatrix,
            boundingVolume : bs,
            primitiveType: PrimitiveType.TRIANGLES,
            vertexArray: that._vertexInfo,
            shaderProgram: sp,
            uniformMap: that._uniformMap,
            renderState: rs,
            pass: Pass.TRANSLUCENT
        });


        this.command = new ClearCommand({
            color : new Color(0,0,0,0),
            depth : 1,
            framebuffer : that._reflectPassState.framebuffer
        });


    }
}

ReflectPlane.prototype.createGeometry = function(){
    var vl = this;

    this.reflectGeometry = PolygonGeometry.createGeometry(this._reflectPolygon);
    var indices = this.reflectGeometry.indices;
    var position = this.reflectGeometry.attributes.position.values;
    var normals = this.reflectGeometry.attributes.normal.values;
    var st = this.reflectGeometry.attributes.st.values;

    var positions = this._reflectPolygon._polygonHierarchy.positions;

    var cart = Cartographic.fromCartesian(positions[0]);
    var lon = CesiumMath.toDegrees(cart.longitude);
    var lat  = CesiumMath.toDegrees(cart.latitude);

    var lon_1 = CesiumMath.toDegrees(cart.longitude);
    var lat_1 = CesiumMath.toDegrees(cart.latitude);
    this._zFactor = cart.height;
    for (var t = 0; t < positions.length; t++) {
        var now = Cartographic.fromCartesian(positions[t]);
        var lon1 = CesiumMath.toDegrees(now.longitude);
        var lat1 = CesiumMath.toDegrees(now.latitude);
        if(lon1>lon_1){
            lon_1 = lon1;
        }
        if(lon1<lon){
            lon = lon1;
        }

        if(lat1 > lat_1){
            lat_1 = lat1;
        }
        if(lat1 < lat){
            lat = lat1;
        }
    }
    this._planeCenterPos = new Cartesian3.fromDegrees((lon + lon_1) / 2, (lat_1 + lat) / 2, this._zFactor);

    for (var i = 0; i < position.length; i+=3) {
        position[i] = position[i] - this._planeCenterPos.x;
        position[i+1] = position[i+1] - this._planeCenterPos.y;
        position[i+2] = position[i+2] - this._planeCenterPos.z;
    }

    var vertexBuffer = Buffer.createVertexBuffer({
        context: this._viewer.scene.context,
        typedArray: ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, position),
        usage: BufferUsage.STATIC_DRAW
    });

    var normalBuffer = Buffer.createVertexBuffer({
        context: this._viewer.scene.context,
        typedArray: ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, normals),
        usage: BufferUsage.STATIC_DRAW
    });

    var uvBuffer = Buffer.createVertexBuffer({
        context: this._viewer.scene.context,
        typedArray: ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, st),
        usage: BufferUsage.STATIC_DRAW
    });

    var indexBuffer = Buffer.createIndexBuffer({
        context: this._viewer.scene.context,
        typedArray:  new Uint16Array(indices),
        usage: BufferUsage.STATIC_DRAW,
        indexDatatype : IndexDatatype.UNSIGNED_SHORT
    });

    var vaAttributes = [];
    vaAttributes.push({
        index : 0,
        enabled : true,
        vertexBuffer : vertexBuffer,
        componentDatatype : ComponentDatatype.FLOAT,
        componentsPerAttribute : 3,
        normalize : false
    });

    vaAttributes.push({
        index : 1,
        enabled : true,
        vertexBuffer : normalBuffer,
        componentDatatype : ComponentDatatype.FLOAT,
        componentsPerAttribute : 3,
        normalize : false
    });

    vaAttributes.push({
        index : 2,
        enabled : true,
        vertexBuffer : uvBuffer,
        componentDatatype : ComponentDatatype.FLOAT,
        componentsPerAttribute : 2,
        normalize : false
    });

    vl._vertexInfo = new VertexArray({
        context : this._viewer.scene.context,
        attributes: vaAttributes,
        indexBuffer: indexBuffer
    });
}

ReflectPlane.prototype.update = function(frameState) {
    var context = frameState.context;
    var commandList = frameState.commandList;

    let surnormal = this.ellipsoid.geodeticSurfaceNormal(this._planeCenterPos);

    let normal = Cartesian3.clone(this._planeCenterPos);
    Cartesian3.normalize(normal, normal);
    // let pointNormal = new Plane.fromPointNormal(this._planeCenterPos, normal);

    // 计算相机位置到反射平面位置到向量
    let view = Cartesian3.subtract(this._planeCenterPos, this._viewer.scene.camera.positionWC,new Cartesian3());
    // Cartesian3.normalize(view,view);
    // 当向量与反射面当法向量夹角说明相机在反射面的背面，则直接返回不进行倒影的渲染
    if(Cartesian3.dot(view ,normal) > 0 || -Cartesian3.dot(this._viewer.scene.camera.direction ,surnormal) > 0.99){
        // console.log('Avoid rendering when reflector is facing away');
    }else {

        this.updateReflectTexture();


        commandList.push(this.drawCommand);
    }

}

let normal = new Cartesian3();
let dir = new Cartesian3();

ReflectPlane.prototype.updateReflectTexture = function() {
    let scene = this._viewer.scene;
    let that = this;
    let context = scene.context;
    Matrix4.multiply(scene.camera.viewMatrix, that._modelMatrix, that.modelViewMatrix);
    Matrix4.multiply(scene.camera.frustum.projectionMatrix, that.modelViewMatrix,that.modelViewProjection);

    let cart3 = Cartesian3.clone(that._planeCenterPos);
    Cartesian3.normalize(cart3,normal);
    let pointNormal = new Plane.fromPointNormal(cart3, normal);
    let dot = -Cartesian3.dot(normal,cart3);
    let mat4 = new Matrix4(-2 * normal.x * normal.x + 1, -2 * normal.x * normal.y, -2 * normal.x * normal.z, -2 * normal.x * dot,
        -2 * normal.y * normal.x, -2 * normal.y * normal.y + 1, -2 * normal.y * normal.z, -2 * normal.y * dot,
        -2 * normal.z * normal.x, -2 * normal.z * normal.y, -2 * normal.z * normal.z + 1, -2 * normal.z * dot,
        0, 0, 0, 1);

    Cartesian3.clone(scene.camera.direction,dir);
    let direction = new Cartesian3();
    let t4 = new Cartesian3();
    Cartesian3.multiplyByScalar(normal, 2 * Cartesian3.dot(dir,normal),t4);
    Cartesian3.subtract(dir,t4,direction);
    Cartesian3.normalize(direction,direction);

    let m = new Cartesian3();
    Cartesian3.clone(scene.camera.up,m);

    let g = new Cartesian3();
    let t = new Cartesian3();
    let v = Cartesian3.dot(m,normal);
    Cartesian3.multiplyByScalar(normal, 2 * v,t);
    Cartesian3.add(m,t,g);
    Cartesian3.normalize(g,g);
    let up =  new Cartesian3(-g.x,-g.y,-g.z);
    let b = new Cartesian3();
    Cartesian3.clone(scene.camera.position,b);
    let position = new Cartesian3(mat4[0] * b.x + mat4[4] * b.y + mat4[8] * b.z + mat4[12], mat4[1] * b.x + mat4[5] * b.y + mat4[9] * b.z + mat4[13], mat4[2] * b.x + mat4[6] * b.y + mat4[10] * b.z + mat4[14]);
    let S = new Matrix4();
    scene.camera.frustum.far = 1e8;
    Matrix4.clone(scene.camera.frustum.projectionMatrix,S);
    that._reflectCamera.direction = direction;

    if(v<0.5){
        that._reflectCamera.up = up;
    }

    if(v>0.5){
        that._reflectCamera.up = g;
    }

    that._reflectCamera.position = position;
    let w = new Matrix4();
    Matrix4.inverse(that._reflectCamera.viewMatrix , w);
    Matrix4.transpose(w,w);

    let T = new Cartesian4(pointNormal.normal.x,pointNormal.normal.y,pointNormal.normal.z, -Cartesian3.dot(normal,cart3));
    Matrix4.multiplyByVector(w,T,T);
    let E = T.w / Math.sqrt(T.x * T.x + T.y * T.y + T.z * T.z);
    let A = new Cartesian3(T.x,T.y,T.z);
    Cartesian3.normalize(A,A);
    let P = new Cartesian3(A.x,A.y,A.z);
    let D = new Cartesian4();
    D.x = (Math.sign(P.x) + S[8]) / S[0];
    D.y = (Math.sign(P.y) + S[9]) / S[5];
    D.z = -1;
    D.w = (1 + S[10]) / S[14];
    //
    // let clipPlane = new Cartesian4(P.x,P.y,P.z,E);
    // let result = new Cartesian4();

    // Cartesian4.multiplyByScalar(clipPlane,2/ Cartesian4.dot(clipPlane,D),result);
    // S[2] = result.x;
    // S[6] = result.y;
    // S[10] = result.z + 1.0;
    // S[14] = result.w;

    // Matrix4.clone(S,scene.camera.frustum.projectionMatrix);


    this.command.execute(context,that._reflectPassState);
    that._viewer.scene.renderColorTexture(that._reflectPassState, that._reflectCamera);
}

export default ReflectPlane;