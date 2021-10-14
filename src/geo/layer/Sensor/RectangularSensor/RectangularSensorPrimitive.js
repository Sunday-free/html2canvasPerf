
import defined from '../../../../../cesium/Source/Core/defined.js'
import defaultValue from '../../../../../cesium/Source/Core/defaultValue.js'
import DeveloperError from '../../../../../cesium/Source/Core/DeveloperError.js'
import CesiumMath from '../../../../../cesium/Source/Core/Math.js'
import Cartesian3 from '../../../../../cesium/Source/Core/Cartesian3.js'
import Matrix3 from '../../../../../cesium/Source/Core/Matrix3.js'
import Matrix4 from "../../../../../cesium/Source/Core/Matrix4.js";
import Color from '../../../../../cesium/Source/Core/Color.js'
import SceneMode from '../../../../../cesium/Source/Scene/SceneMode.js'
import Material from "../../../../../cesium/Source/Scene/Material.js";
import VertexFormat from "../../../../../cesium/Source/Core/VertexFormat.js";
import JulianDate  from "../../../../../cesium/Source/Core/JulianDate.js";
import Buffer from "../../../../../cesium/Source/Renderer/Buffer.js";
import BlendingState from "../../../../../cesium/Source/Scene/BlendingState.js";
import VertexArray from "../../../../../cesium/Source/Renderer/VertexArray.js";
import RenderState from "../../../../../cesium/Source/Renderer/RenderState.js";
import ShaderProgram from "../../../../../cesium/Source/Renderer/ShaderProgram.js";
import DrawCommand from "../../../../../cesium/Source/Renderer/DrawCommand.js";
import ShaderSource  from '../../../../../cesium/Source/Renderer/ShaderSource.js';
import Pass from "../../../../../cesium/Source/Renderer/Pass.js";
import PrimitiveType from "../../../../../cesium/Source/Core/PrimitiveType.js";
import BoundingSphere from "../../../../../cesium/Source/Core/BoundingSphere.js";
import ComponentDatatype from "../../../../../cesium/Source/Core/ComponentDatatype.js";
import BufferUsage from "../../../../../cesium/Source/Renderer/BufferUsage.js";
import combine from "../../../../../cesium/Source/Core/combine.js"
import CullFace from "../../../../../cesium/Source/Scene/CullFace.js"
import EllipsoidOutlineGeometry  from "../../../../../cesium/Source/Core/EllipsoidOutlineGeometry.js"
import EllipsoidGeometry from "../../../../../cesium/Source/Core/EllipsoidGeometry.js"
import destroyObject from "../../../../../cesium/Source/Core/destroyObject.js";

let RectangularSensorVS = 'attribute vec4 position;\r\nattribute vec3 normal;\r\n\r\nvarying vec3 v_position;\r\nvarying vec3 v_positionWC;\r\nvarying vec3 v_positionEC;\r\nvarying vec3 v_normalEC;\r\n\r\nvoid main()\r\n{\r\n    gl_Position = czm_modelViewProjection * position;\r\n    v_position = vec3(position);\r\n    v_positionWC = (czm_model * position).xyz;\r\n    v_positionEC = (czm_modelView * position).xyz;\r\n    v_normalEC = czm_normal * normal;\r\n}'
let RectangularSensorFS = '#ifdef GL_OES_standard_derivatives\r\n#extension GL_OES_standard_derivatives : enable\r\n#endif\r\n\r\nuniform bool u_showIntersection;\r\nuniform bool u_showThroughEllipsoid;\r\n\r\nuniform float u_radius;\r\nuniform float u_xHalfAngle;\r\nuniform float u_yHalfAngle;\r\nuniform float u_normalDirection;\r\nuniform float u_type;\r\n\r\nvarying vec3 v_position;\r\nvarying vec3 v_positionWC;\r\nvarying vec3 v_positionEC;\r\nvarying vec3 v_normalEC;\r\n\r\nvec4 getColor(float sensorRadius, vec3 pointEC)\r\n{\r\n    czm_materialInput materialInput;\r\n\r\n    vec3 pointMC = (czm_inverseModelView * vec4(pointEC, 1.0)).xyz;\r\n    materialInput.st = sensor2dTextureCoordinates(sensorRadius, pointMC);\r\n    materialInput.str = pointMC / sensorRadius;\r\n\r\n    vec3 positionToEyeEC = -v_positionEC;\r\n    materialInput.positionToEyeEC = positionToEyeEC;\r\n\r\n    vec3 normalEC = normalize(v_normalEC);\r\n    materialInput.normalEC = u_normalDirection * normalEC;\r\n\r\n    czm_material material = czm_getMaterial(materialInput);\r\n\r\n    return mix(czm_phong(normalize(positionToEyeEC), material,czm_lightDirectionEC), vec4(material.diffuse, material.alpha), 0.4);\r\n\r\n}\r\n\r\nbool isOnBoundary(float value, float epsilon)\r\n{\r\n    float width = getIntersectionWidth();\r\n    float tolerance = width * epsilon;\r\n\r\n#ifdef GL_OES_standard_derivatives\r\n    float delta = max(abs(dFdx(value)), abs(dFdy(value)));\r\n    float pixels = width * delta;\r\n    float temp = abs(value);\r\n    // There are a couple things going on here.\r\n    // First we test the value at the current fragment to see if it is within the tolerance.\r\n    // We also want to check if the value of an adjacent pixel is within the tolerance,\r\n    // but we don\'t want to admit points that are obviously not on the surface.\r\n    // For example, if we are looking for "value" to be close to 0, but value is 1 and the adjacent value is 2,\r\n    // then the delta would be 1 and "temp - delta" would be "1 - 1" which is zero even though neither of\r\n    // the points is close to zero.\r\n    return temp < tolerance && temp < pixels || (delta < 10.0 * tolerance && temp - delta < tolerance && temp < pixels);\r\n#else\r\n    return abs(value) < tolerance;\r\n#endif\r\n}\r\n\r\nvec4 shade(bool isOnBoundary)\r\n{\r\n    if (u_showIntersection && isOnBoundary)\r\n    {\r\n        return getIntersectionColor();\r\n    }\r\n    if(u_type == 1.0){\r\n        return getLineColor();\r\n    }\r\n    return getColor(u_radius, v_positionEC);\r\n}\r\n\r\nfloat ellipsoidSurfaceFunction(vec3 point)\r\n{\r\n    vec3 scaled = czm_ellipsoidInverseRadii * point;\r\n    return dot(scaled, scaled) - 1.0;\r\n}\r\n\r\nvoid main()\r\n{\r\n    vec3 sensorVertexWC = czm_model[3].xyz;      // (0.0, 0.0, 0.0) in model coordinates\r\n    vec3 sensorVertexEC = czm_modelView[3].xyz;  // (0.0, 0.0, 0.0) in model coordinates\r\n\r\n    //vec3 pixDir = normalize(v_position);\r\n    float positionX = v_position.x;\r\n    float positionY = v_position.y;\r\n    float positionZ = v_position.z;\r\n\r\n    vec3 zDir = vec3(0.0, 0.0, 1.0);\r\n    vec3 lineX = vec3(positionX, 0 ,positionZ);\r\n    vec3 lineY = vec3(0, positionY, positionZ);\r\n    float resX = dot(normalize(lineX), zDir);\r\n    if(resX < cos(u_xHalfAngle)-0.00001){\r\n        discard;\r\n    }\r\n    float resY = dot(normalize(lineY), zDir);\r\n    if(resY < cos(u_yHalfAngle)-0.00001){\r\n        discard;\r\n    }\r\n\r\n    float ellipsoidValue = ellipsoidSurfaceFunction(v_positionWC);\r\n\r\n    // Occluded by the ellipsoid?\r\n\tif (!u_showThroughEllipsoid)\r\n\t{\r\n\t    // Discard if in the ellipsoid\r\n\t    // PERFORMANCE_IDEA: A coarse check for ellipsoid intersection could be done on the CPU first.\r\n\t    if (ellipsoidValue < 0.0)\r\n\t    {\r\n            discard;\r\n\t    }\r\n\r\n\t    // Discard if in the sensor\'s shadow\r\n\t    if (inSensorShadow(sensorVertexWC, v_positionWC))\r\n\t    {\r\n\t        discard;\r\n\t    }\r\n    }\r\n\r\n    // Notes: Each surface functions should have an associated tolerance based on the floating point error.\r\n    bool isOnEllipsoid = isOnBoundary(ellipsoidValue, czm_epsilon3);\r\n    //isOnEllipsoid = false;\r\n    //if((resX >= 0.8 && resX <= 0.81)||(resY >= 0.8 && resY <= 0.81)){\r\n    /*if(false){\r\n        gl_FragColor = vec4(1.0,0.0,0.0,1.0);\r\n    }else{\r\n        gl_FragColor = shade(isOnEllipsoid);\r\n    }\r\n*/\r\n    gl_FragColor = shade(isOnEllipsoid);\r\n\r\n}'
let RectangularSensor = "uniform vec4 u_intersectionColor;\nuniform float u_intersectionWidth;\nuniform vec4 u_lineColor;\n\nbool inSensorShadow(vec3 coneVertexWC, vec3 pointWC)\n{\n    // Diagonal matrix from the unscaled ellipsoid space to the scaled space.    \n    vec3 D = czm_ellipsoidInverseRadii;\n\n    // Sensor vertex in the scaled ellipsoid space\n    vec3 q = D * coneVertexWC;\n    float qMagnitudeSquared = dot(q, q);\n    float test = qMagnitudeSquared - 1.0;\n    \n    // Sensor vertex to fragment vector in the ellipsoid's scaled space\n    vec3 temp = D * pointWC - q;\n    float d = dot(temp, q);\n    \n    // Behind silhouette plane and inside silhouette cone\n    return (d < -test) && (d / length(temp) < -sqrt(test));\n}\n\n///////////////////////////////////////////////////////////////////////////////\n\nvec4 getLineColor()\n{\n    return u_lineColor;\n}\n\nvec4 getIntersectionColor()\n{\n    return u_intersectionColor;\n}\n\nfloat getIntersectionWidth()\n{\n    return u_intersectionWidth;\n}\n\nvec2 sensor2dTextureCoordinates(float sensorRadius, vec3 pointMC)\n{\n    // (s, t) both in the range [0, 1]\n    float t = pointMC.z / sensorRadius;\n    float s = 1.0 + (atan(pointMC.y, pointMC.x) / czm_twoPi);\n    s = s - floor(s);\n    \n    return vec2(s, t);\n}\n"
let RectangularSensorScanPlaneFS = '#ifdef GL_OES_standard_derivatives\r\n#extension GL_OES_standard_derivatives : enable\r\n#endif\r\n\r\nuniform bool u_showIntersection;\r\nuniform bool u_showThroughEllipsoid;\r\n\r\nuniform float u_radius;\r\nuniform float u_xHalfAngle;\r\nuniform float u_yHalfAngle;\r\nuniform float u_normalDirection;\r\nuniform vec4 u_color;\r\n\r\nvarying vec3 v_position;\r\nvarying vec3 v_positionWC;\r\nvarying vec3 v_positionEC;\r\nvarying vec3 v_normalEC;\r\n\r\nvec4 getColor(float sensorRadius, vec3 pointEC)\r\n{\r\n    czm_materialInput materialInput;\r\n\r\n    vec3 pointMC = (czm_inverseModelView * vec4(pointEC, 1.0)).xyz;\r\n    materialInput.st = sensor2dTextureCoordinates(sensorRadius, pointMC);\r\n    materialInput.str = pointMC / sensorRadius;\r\n\r\n    vec3 positionToEyeEC = -v_positionEC;\r\n    materialInput.positionToEyeEC = positionToEyeEC;\r\n\r\n    vec3 normalEC = normalize(v_normalEC);\r\n    materialInput.normalEC = u_normalDirection * normalEC;\r\n\r\n    czm_material material = czm_getMaterial(materialInput);\r\n\r\n    material.diffuse = u_color.rgb;\r\n    material.alpha = u_color.a;\r\n\r\n    return mix(czm_phong(normalize(positionToEyeEC), material,czm_lightDirectionEC), vec4(material.diffuse, material.alpha), 0.4);\r\n\r\n}\r\n\r\nbool isOnBoundary(float value, float epsilon)\r\n{\r\n    float width = getIntersectionWidth();\r\n    float tolerance = width * epsilon;\r\n\r\n#ifdef GL_OES_standard_derivatives\r\n    float delta = max(abs(dFdx(value)), abs(dFdy(value)));\r\n    float pixels = width * delta;\r\n    float temp = abs(value);\r\n    // There are a couple things going on here.\r\n    // First we test the value at the current fragment to see if it is within the tolerance.\r\n    // We also want to check if the value of an adjacent pixel is within the tolerance,\r\n    // but we don\'t want to admit points that are obviously not on the surface.\r\n    // For example, if we are looking for "value" to be close to 0, but value is 1 and the adjacent value is 2,\r\n    // then the delta would be 1 and "temp - delta" would be "1 - 1" which is zero even though neither of\r\n    // the points is close to zero.\r\n    return temp < tolerance && temp < pixels || (delta < 10.0 * tolerance && temp - delta < tolerance && temp < pixels);\r\n#else\r\n    return abs(value) < tolerance;\r\n#endif\r\n}\r\n\r\nvec4 shade(bool isOnBoundary)\r\n{\r\n    if (u_showIntersection && isOnBoundary)\r\n    {\r\n        return getIntersectionColor();\r\n    }\r\n    return getColor(u_radius, v_positionEC);\r\n}\r\n\r\nfloat ellipsoidSurfaceFunction(vec3 point)\r\n{\r\n    vec3 scaled = czm_ellipsoidInverseRadii * point;\r\n    return dot(scaled, scaled) - 1.0;\r\n}\r\n\r\nvoid main()\r\n{\r\n    vec3 sensorVertexWC = czm_model[3].xyz;      // (0.0, 0.0, 0.0) in model coordinates\r\n    vec3 sensorVertexEC = czm_modelView[3].xyz;  // (0.0, 0.0, 0.0) in model coordinates\r\n\r\n    //vec3 pixDir = normalize(v_position);\r\n    float positionX = v_position.x;\r\n    float positionY = v_position.y;\r\n    float positionZ = v_position.z;\r\n\r\n    vec3 zDir = vec3(0.0, 0.0, 1.0);\r\n    vec3 lineX = vec3(positionX, 0 ,positionZ);\r\n    vec3 lineY = vec3(0, positionY, positionZ);\r\n    float resX = dot(normalize(lineX), zDir);\r\n    if(resX < cos(u_xHalfAngle) - 0.0001){\r\n        discard;\r\n    }\r\n    float resY = dot(normalize(lineY), zDir);\r\n    if(resY < cos(u_yHalfAngle)- 0.0001){\r\n        discard;\r\n    }\r\n\r\n    float ellipsoidValue = ellipsoidSurfaceFunction(v_positionWC);\r\n\r\n    // Occluded by the ellipsoid?\r\n\tif (!u_showThroughEllipsoid)\r\n\t{\r\n\t    // Discard if in the ellipsoid\r\n\t    // PERFORMANCE_IDEA: A coarse check for ellipsoid intersection could be done on the CPU first.\r\n\t    if (ellipsoidValue < 0.0)\r\n\t    {\r\n            discard;\r\n\t    }\r\n\r\n\t    // Discard if in the sensor\'s shadow\r\n\t    if (inSensorShadow(sensorVertexWC, v_positionWC))\r\n\t    {\r\n\t        discard;\r\n\t    }\r\n    }\r\n\r\n    // Notes: Each surface functions should have an associated tolerance based on the floating point error.\r\n    bool isOnEllipsoid = isOnBoundary(ellipsoidValue, czm_epsilon3);\r\n    gl_FragColor = shade(isOnEllipsoid);\r\n\r\n}'


var sin = Math.sin;
var cos = Math.cos;
var tan = Math.tan;
var atan = Math.atan;
var asin = Math.asin;

var attributeLocations = {
    position: 0,
    normal: 1
};

/**
 * 相控阵雷达范围Primitive
 * @param options
 * @constructor
 * @private
 */
function RectangularSensorPrimitive(options) {
    var self = this;

    options = defaultValue(options, defaultValue.EMPTY_OBJECT);

    /**
     * 是否显示
     */
    this.show = defaultValue(options.show, true);

    /**
     * 切分程度
     */
    this.slice = defaultValue(options.slice, 32);

    /**
     * 传感器的模型矩阵
     */
    this.modelMatrix = Matrix4.clone(options.modelMatrix, new Matrix4());
    this._modelMatrix = new Matrix4();
    this._computedModelMatrix = new Matrix4();
    this._computedScanPlaneModelMatrix = new Matrix4();

    /**
     * 传感器的半径
     */
    this.radius = defaultValue(options.radius, Number.POSITIVE_INFINITY);
    this._radius = undefined;

    /**
     * 传感器水平半角
     */
    this.xHalfAngle = defaultValue(options.xHalfAngle, 0);
    this._xHalfAngle = undefined;

    /**
     * 传感器垂直半角
     */
    this.yHalfAngle = defaultValue(options.yHalfAngle, 0);
    this._yHalfAngle = undefined;

    /**
     * 线的颜色
     */
    this.lineColor = defaultValue(options.lineColor, Color.WHITE);

    /**
     * 是否显示扇面的线
     */
    this.showSectorLines = defaultValue(options.showSectorLines, true);

    /**
     * 是否显示扇面和圆顶面连接的线
     */
    this.showSectorSegmentLines = defaultValue(options.showSectorSegmentLines, true);


    /**
     * 是否显示侧面
     */
    this.showLateralSurfaces = defaultValue(options.showLateralSurfaces, true);

    /**
     * 目前用的统一材质
     * @type {Material}
     */
    this.material = defined(options.material) ? options.material : Material.fromType(Material.ColorType);
    this._material = undefined;
    this._translucent = undefined;

    /**
     * 侧面材质
     * @type {Material}
     */
    this.lateralSurfaceMaterial = defined(options.lateralSurfaceMaterial) ? options.lateralSurfaceMaterial : Material.fromType(Material.ColorType);
    this._lateralSurfaceMaterial = undefined;
    this._lateralSurfaceTranslucent = undefined;

    /**
     * 是否显示圆顶表面
     */
    this.showDomeSurfaces = defaultValue(options.showDomeSurfaces, true);

    /**
     * 圆顶表面材质
     * @type {Material}
     */
    this.domeSurfaceMaterial = defined(options.domeSurfaceMaterial) ? options.domeSurfaceMaterial : Material.fromType(Material.ColorType);
    this._domeSurfaceMaterial = undefined;

    /**
     * 是否显示圆顶面线
     */
    this.showDomeLines = defaultValue(options.showDomeLines, true);

    /**
     * 是否显示与地球相交的线
     */
    this.showIntersection = defaultValue(options.showIntersection, true);

    /**
     * 与地球相交的线的颜色
     */
    this.intersectionColor = defaultValue(options.intersectionColor, Color.WHITE);

    /**
     * 与地球相交的线的宽度（像素）
     */
    this.intersectionWidth = defaultValue(options.intersectionWidth, 5.0);

    /**
     * 是否穿过地球
     */
    this.showThroughEllipsoid = defaultValue(options.showThroughEllipsoid, false);
    this._showThroughEllipsoid = undefined;

    /**
     * 是否显示扫描面
     */
    this.showScanPlane = defaultValue(options.showScanPlane, true);

    /**
     * 扫描面颜色
     */
    this.scanPlaneColor = defaultValue(options.scanPlaneColor, Color.WHITE);

    /**
     * 扫描面模式 垂直vertical/水平horizontal
     */
    this.scanPlaneMode = defaultValue(options.scanPlaneMode, 'horizontal');

    /**
     * 扫描速率
     */
    this.scanPlaneRate = defaultValue(options.scanPlaneRate, 10);

    this._scanePlaneXHalfAngle = 0;
    this._scanePlaneYHalfAngle = 0;

    //时间计算的起点
    this._time = JulianDate.now();


    this._boundingSphere = new BoundingSphere();
    this._boundingSphereWC = new BoundingSphere();

    //扇面 sector
    this._sectorFrontCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
    });
    this._sectorBackCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
    });
    this._sectorVA = undefined;

    //扇面边线 sectorLine
    this._sectorLineCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.LINES,
        boundingVolume: this._boundingSphereWC
    });
    this._sectorLineVA = undefined;

    //扇面分割线 sectorSegmentLine
    this._sectorSegmentLineCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.LINES,
        boundingVolume: this._boundingSphereWC
    });
    this._sectorSegmentLineVA = undefined;

    //弧面 dome
    this._domeFrontCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
    });
    this._domeBackCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
    });
    this._domeVA = undefined;

    //弧面线 domeLine
    this._domeLineCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.LINES,
        boundingVolume: this._boundingSphereWC
    });
    this._domeLineVA = undefined;

    //扫描面 scanPlane/scanRadial
    this._scanPlaneFrontCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
    });
    this._scanPlaneBackCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
    });

    this._scanRadialCommand = undefined;

    this._colorCommands = [];

    this._frontFaceRS = undefined;
    this._backFaceRS = undefined;
    this._sp = undefined;


    this._uniforms = {
        u_type: function () {
            return 0;//面
        },
        u_xHalfAngle: function () {
            return self.xHalfAngle;
        },
        u_yHalfAngle: function () {
            return self.yHalfAngle;
        },
        u_radius: function () {
            return self.radius;
        },
        u_showThroughEllipsoid: function () {
            return self.showThroughEllipsoid;
        },
        u_showIntersection: function () {
            return self.showIntersection;
        },
        u_intersectionColor: function () {
            return self.intersectionColor;
        },
        u_intersectionWidth: function () {
            return self.intersectionWidth;
        },
        u_normalDirection: function () {
            return 1.0;
        },
        u_lineColor: function () {
            return self.lineColor;
        }
    };

    this._scanUniforms = {
        u_xHalfAngle: function () {
            return self._scanePlaneXHalfAngle;
        },
        u_yHalfAngle: function () {
            return self._scanePlaneYHalfAngle;
        },
        u_radius: function () {
            return self.radius;
        },
        u_color: function () {
            return self.scanPlaneColor;
        },
        u_showThroughEllipsoid: function () {
            return self.showThroughEllipsoid;
        },
        u_showIntersection: function () {
            return self.showIntersection;
        },
        u_intersectionColor: function () {
            return self.intersectionColor;
        },
        u_intersectionWidth: function () {
            return self.intersectionWidth;
        },
        u_normalDirection: function () {
            return 1.0;
        },
        u_lineColor: function () {
            return self.lineColor;
        }
    };
}

RectangularSensorPrimitive.prototype.update = function (frameState) {
    var mode = frameState.mode;
    if (!this.show || mode !== SceneMode.SCENE3D) {
        return;
    }
    var createVS = false;
    var createRS = false;
    var createSP = false;

    var xHalfAngle = this.xHalfAngle;
    var yHalfAngle = this.yHalfAngle;

    if (xHalfAngle < 0.0 || yHalfAngle < 0.0) {
        throw new DeveloperError('halfAngle must be greater than or equal to zero.');
    }
    if (xHalfAngle == 0.0 || yHalfAngle == 0.0) {
        return;
    }
    if (this._xHalfAngle !== xHalfAngle || this._yHalfAngle !== yHalfAngle) {
        this._xHalfAngle = xHalfAngle;
        this._yHalfAngle = yHalfAngle;
        createVS = true;
    }

    var radius = this.radius;
    if (radius < 0.0) {
        throw new DeveloperError('this.radius must be greater than or equal to zero.');
    }
    var radiusChanged = false;
    if (this._radius !== radius) {
        radiusChanged = true;
        this._radius = radius;
        this._boundingSphere = new BoundingSphere(Cartesian3.ZERO, this.radius);
    }

    var modelMatrixChanged = !Matrix4.equals(this.modelMatrix, this._modelMatrix);
    if (modelMatrixChanged || radiusChanged) {
        Matrix4.clone(this.modelMatrix, this._modelMatrix);
        Matrix4.multiplyByUniformScale(this.modelMatrix, this.radius, this._computedModelMatrix);
        BoundingSphere.transform(this._boundingSphere, this.modelMatrix, this._boundingSphereWC);
    }

    var showThroughEllipsoid = this.showThroughEllipsoid;
    if (this._showThroughEllipsoid !== this.showThroughEllipsoid) {
        this._showThroughEllipsoid = showThroughEllipsoid;
        createRS = true;
    }

    var material = this.material;
    if (this._material !== material) {
        this._material = material;
        createRS = true;
        createSP = true;
    }
    var translucent = material.isTranslucent();
    if (this._translucent !== translucent) {
        this._translucent = translucent;
        createRS = true;
    }

    if (this.showScanPlane) {
        var time = frameState.time;
        var timeDiff = JulianDate.secondsDifference(time, this._time);
        if (timeDiff < 0) {
            this._time = JulianDate.clone(time, this._time);
        }
        var percentage = Math.max((timeDiff % this.scanPlaneRate) / this.scanPlaneRate, 0);
        var angle;

        if (this.scanPlaneMode == 'horizontal') {
            angle = 2 * yHalfAngle * percentage - yHalfAngle;
            var cosYHalfAngle = cos(angle);
            var tanXHalfAngle = tan(xHalfAngle);

            var maxX = atan(cosYHalfAngle * tanXHalfAngle);
            this._scanePlaneXHalfAngle = maxX;
            this._scanePlaneYHalfAngle = angle;
            Matrix3.fromRotationX(this._scanePlaneYHalfAngle, matrix3Scratch);
        } else {
            angle = 2 * xHalfAngle * percentage - xHalfAngle;
            var tanYHalfAngle = tan(yHalfAngle);
            var cosXHalfAngle = cos(angle);

            var maxY = atan(cosXHalfAngle * tanYHalfAngle);
            this._scanePlaneXHalfAngle = angle;
            this._scanePlaneYHalfAngle = maxY;
            Matrix3.fromRotationY(this._scanePlaneXHalfAngle, matrix3Scratch);
        }

        Matrix4.multiplyByMatrix3(this.modelMatrix, matrix3Scratch, this._computedScanPlaneModelMatrix);
        Matrix4.multiplyByUniformScale(this._computedScanPlaneModelMatrix, this.radius, this._computedScanPlaneModelMatrix);
    }


    if (createVS) {
        createVertexArray(this, frameState);
    }
    if (createRS) {
        createRenderState(this, showThroughEllipsoid, translucent);
    }
    if (createSP) {
        createShaderProgram(this, frameState, material);
    }
    if (createRS || createSP) {
        createCommands(this, translucent);
    }

    var commandList = frameState.commandList;
    var passes = frameState.passes;
    var colorCommands = this._colorCommands;
    if (passes.render) {
        for (var i = 0, len = colorCommands.length; i < len; i++) {
            var colorCommand = colorCommands[i];
            commandList.push(colorCommand);
        }
    }
};

RectangularSensorPrimitive.prototype.destroy = function () {
    return destroyObject(this)  ;
}

var matrix3Scratch = new Matrix3();
var nScratch = new Cartesian3();

//region -- VertexArray --

/**
 * 计算zoy面和zoy面单位扇形位置
 * @param primitive
 * @returns {{zoy: Array, zox: Array}}
 * @private
 */
function computeUnitPosiiton(primitive, xHalfAngle, yHalfAngle) {
    var slice = primitive.slice;

    //以中心为角度
    var cosYHalfAngle = cos(yHalfAngle);
    var tanYHalfAngle = tan(yHalfAngle);
    var cosXHalfAngle = cos(xHalfAngle);
    var tanXHalfAngle = tan(xHalfAngle);

    var maxY = atan(cosXHalfAngle * tanYHalfAngle);
    var maxX = atan(cosYHalfAngle * tanXHalfAngle);

    //ZOY面单位圆
    var zoy = [];
    for (var i = 0; i < slice; i++) {
        var phi = 2 * maxY * i / (slice - 1) - maxY;
        zoy.push(new Cartesian3(0, sin(phi), cos(phi)));
    }
    //zox面单位圆
    var zox = [];
    for (var i = 0; i < slice; i++) {
        var phi = 2 * maxX * i / (slice - 1) - maxX;
        zox.push(new Cartesian3(sin(phi), 0, cos(phi)));
    }

    return {
        zoy: zoy,
        zox: zox
    }
}

/**
 * 计算扇面的位置
 * @param unitPosition
 * @returns {Array}
 * @private
 */
function computeSectorPositions(primitive, unitPosition) {
    var xHalfAngle = primitive.xHalfAngle,
        yHalfAngle = primitive.yHalfAngle,
        zoy = unitPosition.zoy,
        zox = unitPosition.zox;
    var positions = [];

    //zoy面沿y轴逆时针转xHalfAngle
    var matrix3 = Matrix3.fromRotationY(xHalfAngle, matrix3Scratch)
    positions.push(zoy.map(function (p) {
        return Matrix3.multiplyByVector(matrix3, p, new Cartesian3());
    }));
    //zox面沿x轴顺时针转yHalfAngle
    var matrix3 = Matrix3.fromRotationX(-yHalfAngle, matrix3Scratch);
    positions.push(zox.map(function (p) {
        return Matrix3.multiplyByVector(matrix3, p, new Cartesian3());
    }).reverse());
    //zoy面沿y轴顺时针转xHalfAngle
    var matrix3 = Matrix3.fromRotationY(-xHalfAngle, matrix3Scratch);
    positions.push(zoy.map(function (p) {
        return Matrix3.multiplyByVector(matrix3, p, new Cartesian3());
    }).reverse());
    //zox面沿x轴逆时针转yHalfAngle
    var matrix3 = Matrix3.fromRotationX(yHalfAngle, matrix3Scratch);
    positions.push(zox.map(function (p) {
        return Matrix3.multiplyByVector(matrix3, p, new Cartesian3());
    }));
    return positions;
}

/**
 * 创建扇面顶点
 * @param context
 * @param positions
 * @returns {*}
 * @private
 */
function createSectorVertexArray(context, positions) {
    var planeLength = Array.prototype.concat.apply([], positions).length - positions.length;
    var vertices = new Float32Array(2 * 3 * 3 * planeLength);

    var k = 0;
    for (var i = 0, len = positions.length; i < len; i++) {
        var planePositions = positions[i];
        var n = Cartesian3.normalize(Cartesian3.cross(planePositions[0], planePositions[planePositions.length - 1], nScratch), nScratch);
        for (var j = 0, planeLength = planePositions.length - 1; j < planeLength; j++) {
            vertices[k++] = 0.0;
            vertices[k++] = 0.0;
            vertices[k++] = 0.0;
            vertices[k++] = -n.x;
            vertices[k++] = -n.y;
            vertices[k++] = -n.z;

            vertices[k++] = planePositions[j].x;
            vertices[k++] = planePositions[j].y;
            vertices[k++] = planePositions[j].z;
            vertices[k++] = -n.x;
            vertices[k++] = -n.y;
            vertices[k++] = -n.z;

            vertices[k++] = planePositions[j + 1].x;
            vertices[k++] = planePositions[j + 1].y;
            vertices[k++] = planePositions[j + 1].z;
            vertices[k++] = -n.x;
            vertices[k++] = -n.y;
            vertices[k++] = -n.z;
        }
    }

    var vertexBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: vertices,
        usage: BufferUsage.STATIC_DRAW
    });

    var stride = 2 * 3 * Float32Array.BYTES_PER_ELEMENT;

    var attributes = [{
        index: attributeLocations.position,
        vertexBuffer: vertexBuffer,
        componentsPerAttribute: 3,
        componentDatatype: ComponentDatatype.FLOAT,
        offsetInBytes: 0,
        strideInBytes: stride
    }, {
        index: attributeLocations.normal,
        vertexBuffer: vertexBuffer,
        componentsPerAttribute: 3,
        componentDatatype: ComponentDatatype.FLOAT,
        offsetInBytes: 3 * Float32Array.BYTES_PER_ELEMENT,
        strideInBytes: stride
    }];

    return new VertexArray({
        context: context,
        attributes: attributes
    });
}

/**
 * 创建扇面边线顶点
 * @param context
 * @param positions
 * @returns {*}
 * @private
 */
function createSectorLineVertexArray(context, positions) {
    var planeLength = positions.length;
    var vertices = new Float32Array(3 * 3 * planeLength);

    var k = 0;
    for (var i = 0, len = positions.length; i < len; i++) {
        var planePositions = positions[i];
        vertices[k++] = 0.0;
        vertices[k++] = 0.0;
        vertices[k++] = 0.0;

        vertices[k++] = planePositions[0].x;
        vertices[k++] = planePositions[0].y;
        vertices[k++] = planePositions[0].z;
    }

    var vertexBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: vertices,
        usage: BufferUsage.STATIC_DRAW
    });

    var stride = 3 * Float32Array.BYTES_PER_ELEMENT;

    var attributes = [{
        index: attributeLocations.position,
        vertexBuffer: vertexBuffer,
        componentsPerAttribute: 3,
        componentDatatype: ComponentDatatype.FLOAT,
        offsetInBytes: 0,
        strideInBytes: stride
    }];

    return new VertexArray({
        context: context,
        attributes: attributes
    });
}

/**
 * 创建扇面圆顶面连接线顶点
 * @param context
 * @param positions
 * @returns {*}
 * @private
 */
function createSectorSegmentLineVertexArray(context, positions) {
    var planeLength = Array.prototype.concat.apply([], positions).length - positions.length;
    var vertices = new Float32Array(3 * 3 * planeLength);

    var k = 0;
    for (var i = 0, len = positions.length; i < len; i++) {
        var planePositions = positions[i];

        for (var j = 0, planeLength = planePositions.length - 1; j < planeLength; j++) {
            vertices[k++] = planePositions[j].x;
            vertices[k++] = planePositions[j].y;
            vertices[k++] = planePositions[j].z;

            vertices[k++] = planePositions[j + 1].x;
            vertices[k++] = planePositions[j + 1].y;
            vertices[k++] = planePositions[j + 1].z;
        }
    }

    var vertexBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: vertices,
        usage: BufferUsage.STATIC_DRAW
    });

    var stride = 3 * Float32Array.BYTES_PER_ELEMENT;

    var attributes = [{
        index: attributeLocations.position,
        vertexBuffer: vertexBuffer,
        componentsPerAttribute: 3,
        componentDatatype: ComponentDatatype.FLOAT,
        offsetInBytes: 0,
        strideInBytes: stride
    }];

    return new VertexArray({
        context: context,
        attributes: attributes
    });
}

/**
 * 创建圆顶面顶点
 * @param context
 * @private
 */
function createDomeVertexArray(context) {
    var geometry = EllipsoidGeometry.createGeometry(new EllipsoidGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        stackPartitions: 32,
        slicePartitions: 32
    }));

    var vertexArray = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: attributeLocations,
        bufferUsage: BufferUsage.STATIC_DRAW,
        interleave: false
    });
    return vertexArray;
}

/**
 * 创建圆顶面连线顶点
 * @param context
 * @private
 */
function createDomeLineVertexArray(context) {
    var geometry = EllipsoidOutlineGeometry.createGeometry(new EllipsoidOutlineGeometry({
        vertexFormat: VertexFormat.POSITION_ONLY,
        stackPartitions: 32,
        slicePartitions: 32
    }));

    var vertexArray = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: attributeLocations,
        bufferUsage: BufferUsage.STATIC_DRAW,
        interleave: false
    });
    return vertexArray;
}

/**
 * 创建扫描面顶点
 * @param context
 * @param positions
 * @returns {*}
 * @private
 */
function createScanPlaneVertexArray(context, positions) {
    var planeLength = positions.length - 1;
    var vertices = new Float32Array(3 * 3 * planeLength);

    var k = 0;
    for (var i = 0; i < planeLength; i++) {
        vertices[k++] = 0.0;
        vertices[k++] = 0.0;
        vertices[k++] = 0.0;

        vertices[k++] = positions[i].x;
        vertices[k++] = positions[i].y;
        vertices[k++] = positions[i].z;

        vertices[k++] = positions[i + 1].x;
        vertices[k++] = positions[i + 1].y;
        vertices[k++] = positions[i + 1].z;
    }

    var vertexBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: vertices,
        usage: BufferUsage.STATIC_DRAW
    });

    var stride = 3 * Float32Array.BYTES_PER_ELEMENT;

    var attributes = [{
        index: attributeLocations.position,
        vertexBuffer: vertexBuffer,
        componentsPerAttribute: 3,
        componentDatatype: ComponentDatatype.FLOAT,
        offsetInBytes: 0,
        strideInBytes: stride
    }];

    return new VertexArray({
        context: context,
        attributes: attributes
    });
}

/**
 * 创建顶点数组
 * @param primitive
 * @param frameState
 * @private
 */
function createVertexArray(primitive, frameState) {
    var context = frameState.context;

    var unitSectorPositions = computeUnitPosiiton(primitive, primitive.xHalfAngle, primitive.yHalfAngle);
    var positions = computeSectorPositions(primitive, unitSectorPositions);

    //显示扇面
    if (primitive.showLateralSurfaces) {
        primitive._sectorVA = createSectorVertexArray(context, positions);
    }

    //显示扇面线
    if (primitive.showSectorLines) {
        primitive._sectorLineVA = createSectorLineVertexArray(context, positions);
    }

    //显示扇面圆顶面的交线
    if (primitive.showSectorSegmentLines) {
        primitive._sectorSegmentLineVA = createSectorSegmentLineVertexArray(context, positions);
    }

    //显示弧面
    if (primitive.showDomeSurfaces) {
        primitive._domeVA = createDomeVertexArray(context);
    }

    //显示弧面线
    if (primitive.showDomeLines) {
        primitive._domeLineVA = createDomeLineVertexArray(context);
    }

    //显示扫描面
    if (primitive.showScanPlane) {

        if (primitive.scanPlaneMode == 'horizontal') {
            var unitScanPlanePositions = computeUnitPosiiton(primitive, CesiumMath.PI_OVER_TWO, 0);
            primitive._scanPlaneVA = createScanPlaneVertexArray(context, unitScanPlanePositions.zox);
        } else {
            var unitScanPlanePositions = computeUnitPosiiton(primitive, 0, CesiumMath.PI_OVER_TWO);
            primitive._scanPlaneVA = createScanPlaneVertexArray(context, unitScanPlanePositions.zoy);
        }

    }

}

//endregion

//region -- ShaderProgram --

function createCommonShaderProgram(primitive, frameState, material) {
    var context = frameState.context;

    var vs = RectangularSensorVS;
    var fs = new ShaderSource({
        sources: [RectangularSensor, material.shaderSource, RectangularSensorFS]
    });

    primitive._sp = ShaderProgram.replaceCache({
        context: context,
        shaderProgram: primitive._sp,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations
    });

    var pickFS = new ShaderSource({
        sources: [RectangularSensor, material.shaderSource, RectangularSensorFS],
        pickColorQualifier: 'uniform'
    });

    primitive._pickSP = ShaderProgram.replaceCache({
        context: context,
        shaderProgram: primitive._pickSP,
        vertexShaderSource: vs,
        fragmentShaderSource: pickFS,
        attributeLocations: attributeLocations
    });
}

function createScanPlaneShaderProgram(primitive, frameState, material) {
    var context = frameState.context;

    var vs = RectangularSensorVS;
    var fs = new ShaderSource({
        sources: [RectangularSensor, material.shaderSource, RectangularSensorScanPlaneFS]
    });

    primitive._scanePlaneSP = ShaderProgram.replaceCache({
        context: context,
        shaderProgram: primitive._scanePlaneSP,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations
    });
}

function createShaderProgram(primitive, frameState, material) {
    createCommonShaderProgram(primitive, frameState, material);

    if (primitive.showScanPlane) {
        createScanPlaneShaderProgram(primitive, frameState, material);
    }
}

//endregion

//region -- RenderState --

function createRenderState(primitive, showThroughEllipsoid, translucent) {
    if (translucent) {
        primitive._frontFaceRS = RenderState.fromCache({
            depthTest: {
                enabled: !showThroughEllipsoid
            },
            depthMask: false,
            blending: BlendingState.ALPHA_BLEND,
            cull: {
                enabled: true,
                face: CullFace.BACK
            }
        });

        primitive._backFaceRS = RenderState.fromCache({
            depthTest: {
                enabled: !showThroughEllipsoid
            },
            depthMask: false,
            blending: BlendingState.ALPHA_BLEND,
            cull: {
                enabled: true,
                face: CullFace.FRONT
            }
        });

        primitive._pickRS = RenderState.fromCache({
            depthTest: {
                enabled: !showThroughEllipsoid
            },
            depthMask: false,
            blending: BlendingState.ALPHA_BLEND
        });
    } else {
        primitive._frontFaceRS = RenderState.fromCache({
            depthTest: {
                enabled: !showThroughEllipsoid
            },
            depthMask: true
        });

        primitive._pickRS = RenderState.fromCache({
            depthTest: {
                enabled: true
            },
            depthMask: true
        });
    }
}

//endregion

//region -- Command --

function createCommand(primitive, frontCommand, backCommand, frontFaceRS, backFaceRS, sp, va, uniforms, modelMatrix, translucent, pass, isLine) {
    if (translucent && backCommand) {
        backCommand.vertexArray = va;
        backCommand.renderState = backFaceRS;
        backCommand.shaderProgram = sp;
        backCommand.uniformMap = combine(uniforms, primitive._material._uniforms);
        backCommand.uniformMap.u_normalDirection = function () {
            return -1.0;
        };
        backCommand.pass = pass;
        backCommand.modelMatrix = modelMatrix;
        primitive._colorCommands.push(backCommand);
    }

    frontCommand.vertexArray = va;
    frontCommand.renderState = frontFaceRS;
    frontCommand.shaderProgram = sp;
    frontCommand.uniformMap = combine(uniforms, primitive._material._uniforms);
    if (isLine) {
        frontCommand.uniformMap.u_type = function () {
            return 1;
        }
    }
    frontCommand.pass = pass;
    frontCommand.modelMatrix = modelMatrix;
    primitive._colorCommands.push(frontCommand);
}

function createCommands(primitive, translucent) {
    primitive._colorCommands.length = 0;

    var pass = translucent ? Pass.TRANSLUCENT : Pass.OPAQUE;

    //显示扇面
    if (primitive.showLateralSurfaces) {
        createCommand(primitive, primitive._sectorFrontCommand, primitive._sectorBackCommand, primitive._frontFaceRS,
            primitive._backFaceRS, primitive._sp, primitive._sectorVA, primitive._uniforms, primitive._computedModelMatrix, translucent, pass);
    }
    //显示扇面线
    if (primitive.showSectorLines) {
        createCommand(primitive, primitive._sectorLineCommand, undefined, primitive._frontFaceRS, primitive._backFaceRS,
            primitive._sp, primitive._sectorLineVA, primitive._uniforms, primitive._computedModelMatrix, translucent, pass, true);
    }
    //显示扇面交接线
    if (primitive.showSectorSegmentLines) {
        createCommand(primitive, primitive._sectorSegmentLineCommand, undefined, primitive._frontFaceRS, primitive._backFaceRS,
            primitive._sp, primitive._sectorSegmentLineVA, primitive._uniforms, primitive._computedModelMatrix, translucent, pass, true);
    }
    //显示弧面
    if (primitive.showDomeSurfaces) {
        createCommand(primitive, primitive._domeFrontCommand, primitive._domeBackCommand, primitive._frontFaceRS,
            primitive._backFaceRS, primitive._sp, primitive._domeVA, primitive._uniforms, primitive._computedModelMatrix, translucent, pass);
    }
    //显示弧面线
    if (primitive.showDomeLines) {
        createCommand(primitive, primitive._domeLineCommand, undefined, primitive._frontFaceRS, primitive._backFaceRS,
            primitive._sp, primitive._domeLineVA, primitive._uniforms, primitive._computedModelMatrix, translucent, pass, true);
    }
    //显示扫描面
    if (primitive.showScanPlane) {
        createCommand(primitive, primitive._scanPlaneFrontCommand, primitive._scanPlaneBackCommand, primitive._frontFaceRS,
            primitive._backFaceRS, primitive._scanePlaneSP, primitive._scanPlaneVA, primitive._scanUniforms, primitive._computedScanPlaneModelMatrix, translucent, pass);
    }
}

//endregion

export {RectangularSensorPrimitive};
