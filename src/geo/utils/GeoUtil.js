import defaultValue from 'cesium/Core/defaultValue'
import CesiumMath from 'cesium/Core/Math'
import Cartesian3 from 'cesium/Core/Cartesian3'
import clone from 'cesium/Core/clone'
import Cartesian2 from 'cesium/Core/Cartesian2'
import Cartographic from 'cesium/Core/Cartographic'
import Ellipsoid from 'cesium/Core/Ellipsoid'
import Matrix3 from 'cesium/Core/Matrix3'
import Matrix4 from "cesium/Core/Matrix4";
import Transforms from 'cesium/Core/Transforms'
import HeadingPitchRoll from 'cesium/Core/HeadingPitchRoll'
import Quaternion from 'cesium/Core/Quaternion'
import Rectangle from 'cesium/Core/Rectangle'
import EllipseGeometryLibrary from 'cesium/Core/EllipseGeometryLibrary'
import Entity from "cesium/DataSources/Entity";
import Color from 'cesium/Core/Color'
import PolylineDynamicMaterialProperty from 'cesium/DataSources/PolylineDynamicMaterialProperty'
import PolylineDashMaterialProperty from 'cesium/DataSources/PolylineDashMaterialProperty'
import PolylineGlowMaterialProperty from "cesium/DataSources/PolylineGlowMaterialProperty";
import Cesium3DTileset from "cesium/Scene/Cesium3DTileset";
import Primitive from "cesium/Scene/Primitive";
import Model from "cesium/Scene/Model";
import Cesium3DTile from "cesium/Scene/Cesium3DTile";
import Cesium3DTileFeature from "cesium/Scene/Cesium3DTileFeature";
import Cesium3DTileStyle from "cesium/Scene/Cesium3DTileStyle"
import DistanceDisplayCondition from "cesium/Core/DistanceDisplayCondition";
import SceneMode from 'cesium/Scene/SceneMode'

import ClippingPlaneCollection from 'cesium/Scene/ClippingPlaneCollection'
import { GeoDepository } from "../core/GeoDepository"
import Plane from 'cesium/Core/Plane'
import FeatureType from '../constant/FeatureType';
import LayerType from '../constant/LayerType';
import DefaultData from '../constant/DefaultData';
import defined from 'cesium/Core/defined'
import DeveloperError from 'cesium/Core/DeveloperError';
import LayerEventType from '../constant/LayerEventType';

import turf from "turf";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { BosApi } from '../service/bos/BosApi';



/**
 * Geo通用工具类
 * @constructor
 */
function GeoUtil() {
    this.EARTH_RADIUS = 6378137.0;
}

/**
 * 飞行至某个点的正上方
 * @param {Number} longitude 经度
 * @param {Number} latitude 纬度
 * @param {Number} height 高度
 * @param {Number} time 飞行时间[可选，默认2秒]
 * @example BOSGeo.GeoUtil.flyTo(120.009, 35.870, 1000); 
 */
GeoUtil.flyTo = function (longitude, latitude, height, time) {
    GeoDepository.camera.flyTo({
        destination: Cartesian3.fromDegrees(longitude, latitude, height),
        duration: defaultValue(time, 2),
    });
};

/**
 * 飞行至指定范围
 * @param {Array<Number>} bbox 通过西南角和东北角的经纬度坐标点表示范围[西,南,东,北]
 * @example BOSGeo.GeoUtil.flyToBBox([120.000222,35.867862,120.017962,35.872760]);
 */
GeoUtil.flyToBBox = function (bbox) {
    const bias = 0.001
    GeoDepository.camera.flyTo({
        destination: Rectangle.fromDegrees(bbox[0] - bias, bbox[1] - bias, bbox[2] + bias, bbox[3] + bias),
        duration: 2
    })
}

/**
 * 飞行至某个点位，45°俯视角
 * @param {Number} longitude    经度 
 * @param {Number} latitude 纬度
 * @param {Number} [time=2] 飞行时间，默认2秒
 * @param {Number} [height=150] 高度,默认150米
 * @example BOSGeo.GeoUtil.flyToOffset(120.009, 35.870,2,1000); 
 */
GeoUtil.flyToOffset = function (longitude, latitude, time, height) {
    GeoDepository.camera.flyTo({
        destination: Cartesian3.fromDegrees(longitude, latitude - 0.0014, height || 0 + 150),
        orientation: {
            heading: 0,
            pitch: CesiumMath.toRadians(-45),
            roll: 0
        },
        duration: defaultValue(time, 2),
    });
};

/**
 * 相机进入地上或者地下
 * @param {Boolean}  [undergroundStyle=true] 是否进入地下,true为是，false为否，默认为true。
 * @param {Number}  [altitude=-10]        进入地下或地上时相机的高度，进入地下的默认高度为-10，进入地上时的默认高度为50。
 * @param {Number}  [flyToPitch=-45]      进入地下或地上时相机的俯仰角，进入地下的默认俯仰角为2°，进入地上时的默认俯仰角为-45°。
 * @example
 * BOSGeo.GeoUtil.flyToUnderground(true); //切换进入地下地上
 */
GeoUtil.flyToUnderground = function (undergroundStyle, altitude, flyToPitch) {
    this.undergroundStyle = defaultValue(undergroundStyle, true)
    let viewer = GeoDepository.viewer
    var cartographic = Cartographic.fromCartesian(viewer.scene.camera.position),
        longitude = CesiumMath.toDegrees(cartographic.longitude),
        latitude = CesiumMath.toDegrees(cartographic.latitude);
    let iflyToPitch
    flyToPitch && (iflyToPitch = CesiumMath.toRadians(flyToPitch))
    if (this.undergroundStyle == true) { //进入地下
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = false; //true 禁止 false 允许 进入地下
        this.altitude = defaultValue(altitude, -10);
        this.flyToPitch = defaultValue(iflyToPitch, CesiumMath.toRadians(2));
        // viewer.scene.screenSpaceCameraController.minimumZoomDistance = -1;
        viewer.scene.camera.setView({
            destination: Cartesian3.fromDegrees(longitude, latitude, this.altitude),
            orientation: { heading: viewer.camera.heading, pitch: this.flyToPitch, roll: 0 }
        });
        // this.undergroundStyle = ! this.undergroundStyle ;
    } else {//进到地上
        this.altitude = defaultValue(altitude, 50)

        this.flyToPitch = defaultValue(iflyToPitch, CesiumMath.toRadians(-45));
        viewer.scene.camera.setView({
            destination: Cartesian3.fromDegrees(longitude, latitude, this.altitude),
            orientation: { heading: viewer.camera.heading, pitch: this.flyToPitch, roll: 0 }
        });
        // this.undergroundStyle = ! this.undergroundStyle
    }
}

/**
 * 获取当前相机的坐标和视角
 * @returns {Object} -返回相机笛卡尔坐标(position-{x,y,z})和视角信息(orientation-{heading, pitch, roll}分别代表偏航角、俯仰角和翻滚角,单位为弧度)
 * @example
  let posOri=BOSGeo.GeoUtil.getCameraPositionOrientation();
  console.log("相机坐标-对象",BOSGeo.GeoUtil.cartasian2degress(posOri.position));
  console.log("相机坐标-数组",BOSGeo.GeoUtil.cartesianToArray(posOri.position));
  console.log("相机视角",BOSGeo.Math.toDegrees(posOri.orientation.heading),BOSGeo.Math.toDegrees(posOri.orientation.pitch),BOSGeo.Math.toDegrees(posOri.orientation.roll));
 */
GeoUtil.getCameraPositionOrientation = function () {
    let position = GeoDepository.camera.position;
    position = { x: position.x, y: position.y, z: position.z };
    let orientation = {
        heading: GeoDepository.camera.heading,
        pitch: GeoDepository.camera.pitch,
        roll: GeoDepository.camera.roll,
    };
    let posAndOri = {
        position: position,
        orientation: orientation
    };
    return posAndOri;
}
/**
 * 获取当前相机的坐标和视角
 * @returns {Object} posAndOri -返回相机地理坐标(position-[经度,纬度,高度])和视角信息(orientation-[偏航角,俯仰角,翻滚角]，单位为角度)
 * @example
  let posOri=BOSGeo.GeoUtil.getCameraPositionOrientation();
  console.log("相机方位",posOri);
 */
GeoUtil.getCameraPositionOrientation2 = function () {
    let position = GeoDepository.camera.position;
    position = this.cartesianToArray(position);
    let orientation = [
        CesiumMath.toDegrees(GeoDepository.camera.heading),
        CesiumMath.toDegrees(GeoDepository.camera.pitch),
        CesiumMath.toDegrees(GeoDepository.camera.roll)
    ];
    let posAndOri = {
        position: position,
        orientation: orientation
    };
    return posAndOri;
}

/**
 * 根据相机视角高判断是否显示3DTiles模型
 * @param {Number} height  判断显示的最大高度
 * @param {Cesium3DTileset} tileset -3DTiles模型对象
 * @param {Boolean} isjudgeRange 是否进行判断在视角范围内进行显示
 * @param {Array<number>}[nearFar] 模型距离相机的最近和最远显示距离，默认值[0.0,Number.MAX_VALUE],模型之外范围均可见
 * @returns {Boolean} visible 返回3DTiles模型是否显示
 * @example
 * BOSGeo.GeoUtil.cameraJudgeVisible(3000 , tileset ,true,[0,4500])
 */
GeoUtil.cameraJudgeVisible = function (height, tileset, isjudgeRange = false, nearFar) {
    let check = (pos, bbox) => {
        if (pos.lon > bbox[0] && pos.lon < bbox[2] && pos.lat > bbox[1] && pos.lat < bbox[3]) {
            return true
        } else { return false }
    }
    let visible = true;
    let res = this.getCameraPositionOrientation2()
    if (res.position && res.position[2] > height) {
        visible = false;
    } else {
        if (isjudgeRange === true) {
            if (tileset && tileset._root) { //&& tileset.boundingSphere && tileset.boundingSphere.center
                const boundingVolume = tileset._root.boundingVolume
                const boundingVolumeClone = clone(boundingVolume)
                let frustum = GeoDepository.camera.frustum;
                let cloneFrustum = frustum.clone();
                const cullingVolume = cloneFrustum.computeCullingVolume(GeoDepository.camera.positionWC, GeoDepository.camera.directionWC, GeoDepository.camera.upWC);
                const intersection = cullingVolume.computeVisibility(boundingVolumeClone);
                visible = intersection > -1 ? true : false //check(cartographic,res.cameraRectangle)
            }
        } else {
            visible = true;
        }
    }
    if (tileset && nearFar) {
        let ddc = this.distanceDisplayConditionVisible(tileset, nearFar)
        visible = visible && ddc
    }
    return visible
}

/**
 * 模型距离相机的最近和最远显示距离
 * @param model {Object} model -3DTiles或model模型对象
 * @param {Array<number>} nearFar 模型距离相机的最近和最远显示距离，默认值[0.0,Number.MAX_VALUE],模型之外范围均可见
 * @returns {boolean} 是否可见
 * @example
 * BOSGeo.GeoUtil.distanceDisplayConditionVisible( tileset , [0,4500])
 */
GeoUtil.distanceDisplayConditionVisible = function (model, nearFar) {
    this.nearFar = defaultValue(nearFar, [0.0, Number.MAX_VALUE]);
    let ddc = new DistanceDisplayCondition(this.nearFar[0], this.nearFar[1])
    let scratchDisplayConditionCartesian = new Cartesian3();
    let scratchDistanceDisplayConditionCartographic = new Cartographic();
    let distance2;
    model.distanceDisplayCondition = ddc;
    let nearSquared = ddc.near * ddc.near;
    let farSquared = ddc.far * ddc.far;

    if (GeoDepository.scene.mode === SceneMode.SCENE2D) {
        let frustum2DWidth = GeoDepository.scene.camera.frustum.right - GeoDepository.scene.camera.frustum.left;
        distance2 = frustum2DWidth * 0.5;
        distance2 = distance2 * distance2;
    } else {
        // Distance to center of primitive's reference frame
        let modelMatrix, modelMatrixClone
        if (model._root && model._root.transform) {
            modelMatrix = model._root.transform
            modelMatrixClone = clone(modelMatrix)
        } else { modelMatrix = model.modelMatrix, modelMatrixClone = clone(modelMatrix) }
        let position = Matrix4.getTranslation(modelMatrixClone, scratchDisplayConditionCartesian);
        if (GeoDepository.scene.mode === SceneMode.COLUMBUS_VIEW) {
            let projection = GeoDepository.scene.mapProjection;
            let ellipsoid = projection.ellipsoid;
            let cartographic = ellipsoid.cartesianToCartographic(position, scratchDistanceDisplayConditionCartographic);
            position = projection.project(cartographic, position);
            Cartesian3.fromElements(position.z, position.x, position.y, position);
        }
        distance2 = Cartesian3.distanceSquared(position, GeoDepository.scene.camera.positionWC);
    }

    return (distance2 >= nearSquared) && (distance2 <= farSquared);
}

/**
 * 飞行至指定位置和视角
 * @param {Number} longitude 经度
 * @param {Number} latitude 纬度
 * @param {Number} height 相机高度
 * @param {Object} orientation  方位，{heading,pitch,roll}，分别代表偏航角、俯仰角、翻滚角，单位为度，
 *                              取值范围分别为-180≤heading≤180、-90≤pitch≤90、-180≤roll≤180
 * @param {Number} duration 飞行时间，单位为秒
 * @param {Function} complete 相机停止移动之后的回调函数
 * @example
   let orientation={heading:0,pitch:-45,roll:0};
   function completeCallback()
   {
       alert("您已到达目的地!")
   }
   BOSGeo.GeoUtil.viewFix(113.8,22.6,10000,orientation,3,completeCallback)
 */
GeoUtil.viewFix = function (longitude, latitude, height, orientation, duration, complete) {
    GeoDepository.camera.flyTo({
        destination: Cartesian3.fromDegrees(longitude, latitude, height),
        orientation: {
            heading: CesiumMath.toRadians(orientation.heading),
            pitch: CesiumMath.toRadians(orientation.pitch),
            roll: CesiumMath.toRadians(orientation.roll)
        },
        duration: duration || 2,
        complete: complete
    });
}

/**
 * 根据输入点集计算多边形区域
 * @param {Array<Number>} points 坐标数组
 * @param {Number} [gap=3] 当points为经纬度高度数组时 gap = 3，为经纬度数组时 gap = 2
 * @returns {Array<Number>} 范围最大最小经纬度范围坐标，格式为[minLon, minLat, maxLon, maxLat]
 * @example
   BOSGeo.GeoUtil.getRetangleFromPoints(points, gap)
 */
GeoUtil.getRetangleFromPoints = function (points, gap) {
    if (Array.isArray(points)) {
        let len = points.length
        let minLon = -999, maxLon = 999, minLat = -999, maxLat = 999
        // 当输入的点集为对象数组时
        if (Array.isArray(points[0])) {
            for (let i = 0; i < len; i++) {
                let elePoint = points[i]
                let point = Array.isArray(elePoint) ? elePoint : elePoint.position
                minLon = point[0] < minLon ? point[0] : minLon
                maxLon = point[0] > maxLon ? point[0] : maxLon
                minLat = point[1] < minLat ? point[1] : minLat
                maxLat = point[1] > maxLat ? point[1] : maxLat
            }
            // 当输入的点集为经纬度高度数组或者经纬度数组时
        } else {
            gap = gap || 3
            for (let i = 0; i < len; i += gap) {
                minLon = points[i] < minLon ? points[i] : minLon
                maxLon = points[i] > maxLon ? points[1] : maxLon
                minLat = points[i + 1] < minLat ? points[i + 1] : minLat
                maxLat = points[i + 1] > maxLat ? points[i + 1] : maxLat
            }
        }

        return [minLon, minLat, maxLon, maxLat]
    }
}
/**
 * 计算模型矩阵
 * @param {Number} longitude 经度（单位为度）
 * @param {Number} latitude 纬度（单位为度）
 * @param {Number} height 高度（单位为米）
 * @param {Number} heading 偏航角（单位为度）
 * @param {Number} pitch 俯仰角（单位为度）
 * @param {Number} roll 翻滚角（单位为度）
 * @returns {Matrix4} 返回4*4的转换矩阵
 * @example
    BOSGeo.GeoUtil.computeModelMatrix(120.12,34.0,0,0,0,0);
 */
GeoUtil.computeModelMatrix = function (longitude, latitude, height, heading, pitch, roll) {
    var center = Cartesian3.fromDegrees(longitude || 0, latitude || 0, height || 0);
    var hpr = new HeadingPitchRoll(CesiumMath.toRadians(heading || 0), CesiumMath.toRadians(pitch || 0), CesiumMath.toRadians(roll || 0))
    return Transforms.headingPitchRollToFixedFrame(center, hpr);
};

/**
 * 获取模型矩阵
 * @param {Number} longitude 经度（单位为度）
 * @param {Number} latitude 纬度（单位为度）
 * @param {Number} height 高度（单位为米）
 * @param {Number} heading heading角（单位为度）
 * @returns {Matrix4} 返回4*4的转换矩阵
 * @example
    BOSGeo.GeoUtil.getTileMatrix4(longitude, latitude, height, heading);
 */
GeoUtil.getTileMatrix4 = function (longitude, latitude, height, heading) {
    let position = Cartesian3.fromDegrees(longitude, latitude, height);
    let mat = Transforms.eastNorthUpToFixedFrame(position);
    let rotationX = Matrix4.fromRotationTranslation(Matrix3.fromRotationZ(CesiumMath.toRadians(heading)));
    Matrix4.multiply(mat, rotationX, mat);
    return mat;
};

/**
 * 校验是否为数字且在-180到180之间
 * @private
 * @param {Number} val 数字
 */
function curryNumber(val) {
    val = parseFloat(val);
    if (typeof val !== 'number' || isNaN(val)) return 0;
    if (val > 180 || val < -180) val = 0;
    return val;
}
GeoUtil.curryNumber = curryNumber;
/**
 * 设置3dtiles模型位置、角度、大小
 * NOTE: 可以直接传tileset._root.transform
 * @param {Array<number>} modelMatrix 模型转换矩阵. 
 * @param {Cartesian3|Array<number>} position 模型位置，三维笛卡尔坐标或者经纬度坐标
 * @param {Array<number>} orientation 模型角度，[偏航角,俯仰角,翻滚角],单位为角度
 * @param {Number} [scale=1] 缩放比例，取值范围(0-1]
 * @example
    BOSGeo.GeoUtil.setTilesetMatrix(modelMatrix, position, orientation, scale);
 */
GeoUtil.setTilesetMatrix = function (modelMatrix, position, orientation, scale) {

    let origin = position instanceof Cartesian3 ? position : Cartesian3.fromDegrees(position[0], position[1], position[2]);
    let mat4 = Transforms.eastNorthUpToFixedFrame(origin);
    let rotateMat3 = Matrix3.fromHeadingPitchRoll(new HeadingPitchRoll(
        CesiumMath.toRadians(curryNumber(orientation[0])),
        CesiumMath.toRadians(curryNumber(orientation[1])),
        CesiumMath.toRadians(curryNumber(orientation[2]))
    ));
    let rotMat4 = Matrix4.fromRotationTranslation(rotateMat3);
    Matrix4.multiply(mat4, rotMat4, modelMatrix);
    let scaleMat4 = Matrix4.fromUniformScale(scale || 1);
    Matrix4.multiply(modelMatrix, scaleMat4, modelMatrix);
    GeoDepository.scene.requestRender();
};

/**
 * 调整模型高度 
 * @param {Cesium3DTileset} tileset -3DTiles模型对象
 * @param {Number} heightOffset -模型需整体抬升或降低的高度
 * @example
 *      BOSGeo.GeoUtil.setTilesetHeight(tiles.feature,10);
 * @author ChenFei,20200624
 */
GeoUtil.setTilesetHeight = function (tileset, heightOffset) {
    heightOffset = defaultValue(heightOffset, 0);
    tileset._modifyOptions = {offset:[0,0,heightOffset]};
    let boundingSphere = tileset.boundingSphere;
    let cartographic = Cartographic.fromCartesian(boundingSphere.center);
    let surface = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
    let offset = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
    var translation = Cartesian3.subtract(offset, surface, new Cartesian3());
    tileset.modelMatrix = Matrix4.fromTranslation(translation);
    GeoDepository.scene.requestRender();
};

/**
 * 设置gltf模型位置、角度、大小
 * NOTE: 不能传model.modelMatrix
 * @param {Primitive} model glTF模型
 * @param {Cartesian3|Array<number>} position 模型位置，三维笛卡尔坐标或者经纬度坐标
 * @param {Array<number>} orientation 模型角度，[偏航角,俯仰角,翻滚角]
 * @param {Number} [scale=1] 缩放比例，取值范围(0-1]
 * @example
    BOSGeo.GeoUtil.setGltfModelMatrix(model, position, orientation, scale);
 */
GeoUtil.setGltfModelMatrix = function (model, position, orientation, scale) {
    orientation = defaultValue(orientation, [0, 0, 0]);
    scale = defaultValue(scale, 1);

    // 方法一：
    /*let origin = Cartesian3.fromDegrees(location[0], location[1], location[2]);
    let mat4 = Transforms.eastNorthUpToFixedFrame(origin);
    let rotateMat3 = Matrix3.fromHeadingPitchRoll(new HeadingPitchRoll(
        CesiumMath.toRadians(orientation[0]),
        CesiumMath.toRadians(orientation[1]),
        CesiumMath.toRadians(orientation[2])
    ));
    Matrix4.multiplyByMatrix3(mat4, rotateMat3, model.modelMatrix);
    let scaleMat4 = Matrix4.fromUniformScale(scale || 1);
    Matrix4.multiply(model.modelMatrix, scaleMat4, model.modelMatrix);*/

    // 方法二：
    let origin = position instanceof Cartesian3 ? position : Cartesian3.fromDegrees(position[0], position[1], position[2]);
    let hpr = new HeadingPitchRoll(
        CesiumMath.toRadians(orientation[0]),
        CesiumMath.toRadians(orientation[1]),
        CesiumMath.toRadians(orientation[2])
    );
    model.modelMatrix = Transforms.headingPitchRollToFixedFrame(origin, hpr);
    let scaleMat4 = Matrix4.fromUniformScale(scale || 1);
    Matrix4.multiply(model.modelMatrix, scaleMat4, model.modelMatrix);
    GeoDepository.scene.requestRender();
};

/**
 * 获取模型剖切面集合对应的转换矩阵
 * @author lyj 2021-03-26
 * 
 * @param {Cesium3DTileset} tileset 待剖切的3DTiles模型对象
 * @returns {Matrix4} 剖切面集合的转换矩阵
 * @example
    BOSGeo.GeoUtil.getTilesetClippingMatrix(tileset);
 */
GeoUtil.getTilesetClippingMatrix = function (tileset) {
    let clippingMatrix = Matrix4.IDENTITY;
    const { readyPromise, modelMatrix, root, boundingSphere } = tileset;
    if (readyPromise) {
        // Geo中tileset的尺寸缩放信息是存在scale属性中，而没有直接存放在modelMatrix中
        const scale = Matrix4.getScale(Matrix4.clone(tileset.featureType == FeatureType.GLTF ? tileset.modelMatrix : tileset._root.transform), new Cartesian3());
        // const scale = tileset.scale ? new Cartesian3(tileset.scale, tileset.scale, tileset.scale) : Matrix4.getScale(modelMatrix, new Cartesian3());
        // 裁切面在缩放变换上与tileset相反，尺寸不受平移变换和旋转变换的影响，可以先计算
        const scaleMatrix = Matrix3.fromScale(
            new Cartesian3(1 / scale.x, 1 / scale.y, 1 / scale.z),
            new Matrix3()
        );

        // tile坐标转换的过程是: modelMatrix * rootTransform * (T * T1 * T2) .... * Point
        const oldtransform = Matrix4.multiply(modelMatrix, root.transform, new Matrix4());
        const inverseOldTransform = Matrix4.inverse(oldtransform, new Matrix4());

        // 计算模型经过root.transform、modelMatrix转换到当前位置之前的世界坐标，以此计算过球心的裁切面到过模型中心点的平移向量
        const initOrigin = Matrix4.multiplyByPoint(inverseOldTransform, boundingSphere.center, new Cartesian3());
        const transform = Matrix4.fromTranslation(initOrigin, new Matrix4());

        // 计算 tile从模型空间转换到世界空间后的ENU局部坐标系朝向对应的转换矩阵
        const newtransform = Transforms.eastNorthUpToFixedFrame(Matrix4.getTranslation(oldtransform, new Cartesian3()));
        // 逆向转换操作（即从当前ENU坐标系-》modelMatrix` -》root.transform`到模型空间下）运算获取整个过程中的旋转矩阵
        const clippingRotate = Matrix3.getRotation(
            Matrix4.getMatrix3(Matrix4.multiply(inverseOldTransform, newtransform, new Matrix4()), new Matrix3()),
            new Matrix3()
        );
        // 整合 （平移矩阵 * 旋转矩阵 * 缩放矩阵） 得到最后的裁切面集合的转换矩阵
        clippingMatrix = Matrix4.multiplyByMatrix3(
            transform,
            Matrix3.multiply(clippingRotate, scaleMatrix, new Matrix3()),
            new Matrix4()
        );
    }
    return clippingMatrix;
}

/**
 * 笛卡尔坐标转地理坐标（经纬度和海拔高度）
 * @param {Cartesian3} cartesian3 三维笛卡尔坐标 
 * @param {Number} [lonlatAccuracy=8] 转换后经纬度坐标值的精确度（小数点后几位）
 * @param {Number} [heightAccuracy=2] 转换后高度坐标值的精确度（小数点后几位）
 * 
 * @returns {Array<Number>} 返回包含经纬度和高度的数组
 * @example
 *   let coord =BOSGeo.Cartesian3.fromDegrees(114.042, 22.516, 0);//经纬度坐标转笛卡尔坐标
 *   BOSGeo.GeoUtil.cartesianToArray(coord);  
 */
GeoUtil.cartesianToArray = function (cartesian, lonlatAccuracy = 8, heightAccuracy = 2) {
    if (!cartesian) return undefined;

    let cartographic = Cartographic.fromCartesian(cartesian);
    let lng = parseFloat(CesiumMath.toDegrees(cartographic.longitude).toFixed(lonlatAccuracy));
    let lat = parseFloat(CesiumMath.toDegrees(cartographic.latitude).toFixed(lonlatAccuracy));
    let height = parseFloat(cartographic.height.toFixed(heightAccuracy));

    return [lng, lat, height];
};

/**
 * 笛卡尔坐标转地理坐标（经纬度和海拔高度）
 * @param {Cartesian3} cartesian3 三维笛卡尔坐标
 * @returns {Object} 返回包含经纬度和高度的对象
 * @example
 *   let coord =BOSGeo.Cartesian3.fromDegrees(114.042, 22.516, 0);//经纬度坐标转笛卡尔坐标
 *   BOSGeo.GeoUtil.cartasian2degress(coord); 
 */
GeoUtil.cartasian2degress = function (cartesian3) {
    let coord = {};
    let pos = Cartographic.fromCartesian(cartesian3, Ellipsoid.WGS84, new Cartographic());
    coord.lon = CesiumMath.toDegrees(pos.longitude);
    coord.lat = CesiumMath.toDegrees(pos.latitude);
    coord.height = pos.height;
    return coord;
}

/**
 * 地理坐标转屏幕坐标
 * @param {Cartesian3|Array<Number>} geoCoord -可以是三维笛卡尔坐标也可以是经纬度坐标数组
 * @returns {Cartesian2} 二维屏幕坐标
 * @example
 *   let geoCoord =BOSGeo.Cartesian3.fromDegrees(114.042, 22.516, 0);//经纬度坐标转笛卡尔坐标
 *   BOSGeo.GeoUtil.geoCoord2windowCoord(geoCoord); 
 */
GeoUtil.geoCoord2windowCoord = function (geoCoord) {
    geoCoord = geoCoord || []
    let coordinate = geoCoord instanceof Cartesian3 ? geoCoord : Cartesian3.fromDegrees(geoCoord[0], geoCoord[1], geoCoord[2] || 1);

    return GeoDepository.scene.cartesianToCanvasCoordinates(coordinate)
}

/**
 * 屏幕坐标转地理坐标
 * @param {Cartesian2} 二维屏幕坐标
 * @returns {Object} geoCoord -经纬度高程坐标{x,y,z}
 * @example
 *   let windowCoord =BOSGeo.Cartesian2(150, 250);//屏幕坐标
 *   BOSGeo.GeoUtil.getCartographic(windowCoord);
 */
GeoUtil.getCartographic = function (position) {
    let viewer = GeoDepository.viewer;
    // 深度开启或关闭
    viewer.scene.globe.depthTestAgainstTerrain = true;
    let ray = viewer.scene.camera.getPickRay(position);
    let cartesian = null;
    let pickPostion;
    let feature = viewer.scene.pick(position);
    if (viewer.scene.pickPositionSupported && defined(feature)) { //&& feature.content
        cartesian = viewer.scene.pickPosition(position);
    } else if (feature instanceof Cesium3DTileFeature) {
        cartesian = viewer.scene.pickPosition(position);
    } else {
        cartesian = viewer.scene.pickPosition(position);
        // cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    }
    if (cartesian) {
        let cartographic = Cartographic.fromCartesian(cartesian); // 结果对象中的值将以弧度表示。
        let longitude = Number(CesiumMath.toDegrees(cartographic.longitude));
        let latitude = Number(CesiumMath.toDegrees(cartographic.latitude));
        let height = Number(cartographic.height);

        pickPostion = { x: Number(longitude.toFixed(8)), y: Number(latitude.toFixed(8)), z: Number(height.toFixed(8)) };
    }

    return pickPostion;
}

/**
 * 获取鼠标选中的坐标点
 * @param {Object} windowCoord 屏幕坐标
 * @returns {Array<Number>} 返回包含经纬度和高度的数组
 * @example
 *   BOSGeo.GeoUtil.getPickPosition(windowCoord);
 */
GeoUtil.getPickPosition = function (windowCoord) {
    let pickedObj = GeoDepository.scene.pick(windowCoord);
    if (pickedObj) {
        return GeoUtil.cartesianToArray(GeoDepository.scene.pickPosition(windowCoord));
    } else {
        return GeoUtil.cartesianToArray(GeoDepository.camera.pickEllipsoid(windowCoord));
    }
};

/**
 * 获取glTF模型的参数
 * @param {Primitive} modellayer gltf模型
 * @returns {Object} 返回包含模型经度、纬度、高度、偏航角、俯仰角、翻滚角和包围盒半径的对象
 * @example  
    BOSGeo.GeoUtil.modelToparams(model)
 */
GeoUtil.modelToparams = function (modellayer) {
    let showObject = {};
    if (modellayer._model.modelMatrix) {
        let pos = Matrix4.getTranslation(modellayer._model.modelMatrix, new Cartesian3());
        let cartographic = this.cartasian2degress(pos);
        showObject.lon = Number(cartographic.lon).toFixed(9) //cartographic.lon;
        showObject.lat = Number(cartographic.lat).toFixed(9) // cartographic.lat;
        showObject.height = cartographic.height;



        //模型视角
        let m1 = Transforms.eastNorthUpToFixedFrame(pos, Ellipsoid.WGS84, new Matrix4());
        let m2 = modellayer._model.modelMatrix;
        //模型缩放比例
        let scale = Matrix4.getScale(m2, new Cartesian3());
        showObject.scale = scale.y;
        var modelMatrix
        if (showObject.scale > 2) {
            let scaleMat4 = Matrix4.fromUniformScale(1 / showObject.scale || 1);
            modelMatrix = Matrix4.multiply(m2, scaleMat4, new Matrix4());
        } else {
            modelMatrix = m2
        }
        let m3 = Matrix4.multiply(Matrix4.inverse(m1, new Matrix4()), modelMatrix, new Matrix4());
        let mat3 = Matrix4.getMatrix3(m3, new Matrix3());

        let q = Quaternion.fromRotationMatrix(mat3);
        let hpr = HeadingPitchRoll.fromQuaternion(q);
        let heading = CesiumMath.toDegrees(hpr.heading);
        let pitch = CesiumMath.toDegrees(hpr.pitch);
        let roll = CesiumMath.toDegrees(hpr.roll);
        showObject.heading = heading.toFixed(3);
        showObject.pitch = pitch.toFixed(3);
        showObject.roll = roll.toFixed(3);
        showObject.hpr = hpr;
    }
    if (modellayer._model && modellayer._model.boundingSphere) {
        let radius = modellayer._model.boundingSphere.radius;
        showObject.radius = radius * 2;
    }
    return showObject;
};

/**
 * 获取3dtile模型的参数
 * @param {Cesium3DTileset} 3DTiles模型
 * @returns {Object} 返回包含模型经度、纬度、高度、偏航角、俯仰角、翻滚角和包围盒半径的对象
 * @example
    BOSGeo.GeoUtil.tileToparams(tileset)
 */
GeoUtil.tileToparams = function (tilelayer) {
    let showObject = {};
    if (tilelayer && tilelayer.boundingSphere && tilelayer.boundingSphere.center) {
        let center = tilelayer.boundingSphere.center;
        let pos1 = this.cartasian2degress(center);

        //去除计算小数位误差影响
        showObject.lon = Number(pos1.lon).toFixed(9)
        showObject.lat = Number(pos1.lat).toFixed(9);
        showObject.height = pos1.height;
    }
    if (tilelayer && tilelayer.boundingSphere && tilelayer.boundingSphere.radius) {
        let radius = tilelayer.boundingSphere.radius;
        showObject.radius = radius;
    }
    //存在模型矩阵情况下，计算缩放比例、姿态、位置
    if ((tilelayer._root && tilelayer._root.transform) || tilelayer instanceof Matrix4) {
        let m2 = undefined;
        let pos = undefined;

        if (tilelayer instanceof Matrix4) {
            m2 = tilelayer;
            // 模型位置
            pos = Matrix4.getTranslation(m2, new Cartesian3());
            let cartographic = this.cartasian2degress(pos);
            showObject.lon = Number(cartographic.lon).toFixed(9);
            showObject.lat = Number(cartographic.lat).toFixed(9);
            showObject.height = cartographic.height;
        } else {
            m2 = tilelayer._root.transform;
            // m2 =tilelayer._clippingPlanesOriginMatrix
            // 模型位置
            pos = Matrix4.getTranslation(m2, new Cartesian3());

            let cartographic = this.cartasian2degress(pos);
            showObject.lon = Number(cartographic.lon).toFixed(9);
            showObject.lat = Number(cartographic.lat).toFixed(9);
            showObject.height = cartographic.height;
        }

        if (pos.x === 0 && pos.y === 0 && pos.z === 0) {
            showObject.heading = 0;
        } else {
            //模型缩放比例
            let scale = Matrix4.getScale(m2, new Cartesian3());
            //去除计算小数位误差影响
            let a = [scale.x.toString().split(".").length < 2 ? 0 : scale.x.toString().split(".")[1].length,
            scale.y.toString().split(".").length < 2 ? 0 : scale.y.toString().split(".")[1].length,
            scale.z.toString().split(".").length < 2 ? 0 : scale.z.toString().split(".")[1].length]
            let scaleList = [scale.x, scale.y, scale.z]
            let i = a.indexOf(Math.min.apply(Math, a))
            let iscale = scaleList[i]
            showObject.scale = iscale.toString().split(".").length < 2 ? Number(iscale) : Number(iscale).toFixed(9) == 1 ? 1 : iscale.toString().split(".")[1].length > 9 ? Number(iscale).toFixed(9) : Number(iscale);
            //模型视角
            var m1, m3, mat3, modelMatrix
            if (showObject.scale < 2) {
                // modelMatrix=m2
                let scaleMat4 = Matrix4.fromUniformScale(1 / iscale || 1);
                modelMatrix = Matrix4.multiply(m2, scaleMat4, new Matrix4());

                m1 = Transforms.eastNorthUpToFixedFrame(
                    Matrix4.getTranslation(modelMatrix, new Cartesian3()),
                    Ellipsoid.WGS84,
                    new Matrix4(),
                );
            } else {
                let scaleMat4 = Matrix4.fromUniformScale(1 / iscale || 1);
                modelMatrix = Matrix4.multiply(m2, scaleMat4, new Matrix4());
                // m1 = Transforms.eastNorthUpToFixedFrame(pos);

                m1 = Transforms.eastNorthUpToFixedFrame(
                    Matrix4.getTranslation(modelMatrix, new Cartesian3()),
                    Ellipsoid.WGS84,
                    new Matrix4(),
                );
            }

            m3 = Matrix4.multiply(
                Matrix4.inverse(m1, new Matrix4()),
                modelMatrix,
                new Matrix4(),
            );
            // 得到旋转矩阵
            mat3 = Matrix4.getMatrix3(m3, new Matrix3());


            // // 得到旋转矩阵
            // var mat31 = Matrix3.getRotation(m3, new Matrix3());
            // // 计算四元数
            // var q1 = Quaternion.fromRotationMatrix(mat31);
            // // 计算旋转角(弧度)
            // var hpr1 = HeadingPitchRoll.fromQuaternion(q1);
            // // 得到角度
            // var heading1 = CesiumMath.toDegrees(hpr1.heading);
            // var pitch1 = CesiumMath.toDegrees(hpr1.pitch);
            // var roll1 = CesiumMath.toDegrees(hpr1.roll);
            // console.log('heading : ' + heading1, 'pitch : ' + pitch1, 'roll : ' + roll1);


            // let m1 = Transforms.eastNorthUpToFixedFrame(pos);
            // let m3 = Matrix4.multiply(Matrix4.inverse(m1, new Matrix4()), m2, new Matrix4());
            // let mat3 = Matrix4.getMatrix3(m3, new Matrix3());
            // mat3 = Matrix3.transpose(mat3, mat3);
            // 计算四元数
            let q = Quaternion.fromRotationMatrix(mat3);
            // 计算旋转角(弧度)
            let hpr = HeadingPitchRoll.fromQuaternion(q);
            // 得到角度
            let heading = CesiumMath.toDegrees(hpr.heading);
            let pitch = CesiumMath.toDegrees(hpr.pitch);
            let roll = CesiumMath.toDegrees(hpr.roll);
            showObject.heading = Number(heading).toFixed(9);
            showObject.pitch = Number(pitch).toFixed(9);
            showObject.roll = Number(roll).toFixed(9);;
            showObject.hpr = hpr;

        }
    }
    return showObject;
};

/**
 * 获取模型参数
 * @param {Cesium3DTileset|Model} model
 * @returns {Object} 返回包含模型经度、纬度、高度、偏航角、俯仰角、翻滚角和包围盒半径的对象
 * @example
    BOSGeo.GeoUtil.calculateModelPositionConfig(model)
 */
GeoUtil.calculateModelPositionConfig = function (model) {
    let result = {};
    let mtx;
    if (model.featureType === FeatureType.GLTF) {
        mtx = model.modelMatrix;
    } else mtx = model._root.transform;

    let pos = Matrix4.getTranslation(mtx, new Cartesian3());
    result.position = GeoUtil.cartesianToArray(pos);

    let heading, pitch, roll;
    if (pos.x === 0 && pos.y === 0 && pos.z === 0) {
        heading = pitch = roll = 0;
    } else {
        //模型缩放比例
        let scale = Matrix4.getScale(mtx, new Cartesian3());
        //去除计算小数位误差影响
        let a = [scale.x.toString().split(".").length < 2 ? 0 : scale.x.toString().split(".")[1].length,
        scale.y.toString().split(".").length < 2 ? 0 : scale.y.toString().split(".")[1].length,
        scale.z.toString().split(".").length < 2 ? 0 : scale.z.toString().split(".")[1].length]
        let scaleList = [scale.x, scale.y, scale.z]
        let i = a.indexOf(Math.min.apply(Math, a))
        let iscale = scaleList[i]
        result.scale = iscale.toString().split(".").length < 2 ? Number(iscale) : Number(iscale).toFixed(9) == 1 ? 1 : iscale.toString().split(".")[1].length > 9 ? Number(iscale).toFixed(9) : Number(iscale);
        //模型视角
        var m1, m2, m3, mat3, modelMatrix
        if (result.scale < 2) {
            // modelMatrix=m2
            let scaleMat4 = Matrix4.fromUniformScale(1 / iscale || 1);
            modelMatrix = Matrix4.multiply(mtx, scaleMat4, new Matrix4());

            m1 = Transforms.eastNorthUpToFixedFrame(
                Matrix4.getTranslation(modelMatrix, new Cartesian3()),
                Ellipsoid.WGS84,
                new Matrix4(),
            );
        } else {
            let scaleMat4 = Matrix4.fromUniformScale(1 / iscale || 1);
            modelMatrix = Matrix4.multiply(mtx, scaleMat4, new Matrix4());
            // m1 = Transforms.eastNorthUpToFixedFrame(pos);

            m1 = Transforms.eastNorthUpToFixedFrame(
                Matrix4.getTranslation(modelMatrix, new Cartesian3()),
                Ellipsoid.WGS84,
                new Matrix4(),
            );
        }

        m3 = Matrix4.multiply(
            Matrix4.inverse(m1, new Matrix4()),
            modelMatrix,
            new Matrix4(),
        );
        // 得到旋转矩阵
        mat3 = Matrix4.getMatrix3(m3, new Matrix3());

        // 计算四元数
        let q = Quaternion.fromRotationMatrix(mat3);
        // 计算旋转角(弧度)
        let hpr = HeadingPitchRoll.fromQuaternion(q);
        // 得到角度
        heading = Math.round(Number(CesiumMath.toDegrees(hpr.heading)), 3);
        pitch = Math.round(Number(CesiumMath.toDegrees(hpr.pitch)), 3);
        roll = Math.round(Number(CesiumMath.toDegrees(hpr.roll)), 3);
        result.scale = [Math.round(Number(scale.x), 3), Math.round(Number(scale.y), 3), Math.round(Number(scale.z), 3)];
    }

    result.rotation = [heading, pitch, roll];

    return result;
};
/**
 * 计算两点之间的弧线
 * @param {cartesian} startPosition 起始位置
 * @param {cartesian} endPosition 终点位置
 * @param {Number} length 最高点的高度
 * @param {Number} num 返回点的数量
 * @returns {Array} 弧线
 * @example
    BOSGeo.GeoUtil.getLinkedPointList(startPosition, endPosition, length, num);
 */
GeoUtil.getLinkedPointList = function (startPosition, endPosition, length, num) {
    let result = [];

    let startCartographic = Cartographic.fromCartesian(startPosition);
    let endCartographic = Cartographic.fromCartesian(endPosition);
    let startLonDegrees = 180 * startCartographic.longitude / Math.PI;
    let startLatDegrees = 180 * startCartographic.latitude / Math.PI;
    let endLonDegrees = 180 * endCartographic.longitude / Math.PI;
    let endLatDegrees = 180 * endCartographic.latitude / Math.PI;

    let distance = Math.sqrt((startLonDegrees - endLonDegrees) * (startLonDegrees - endLonDegrees) + (startLatDegrees - endLatDegrees) * (startLatDegrees - endLatDegrees));
    let h = distance * length;

    let startPosCloned = Cartesian3.clone(startPosition);
    let endPosCloned = Cartesian3.clone(endPosition);
    let startToZeroDistance = Cartesian3.distance(startPosCloned, Cartesian3.ZERO);
    let endToZeroDistance = Cartesian3.distance(endPosCloned, Cartesian3.ZERO);

    Cartesian3.normalize(startPosCloned, startPosCloned);
    Cartesian3.normalize(endPosCloned, endPosCloned);

    if (Cartesian3.distance(startPosCloned, endPosCloned) === 0) {
        return result;
    }

    let radians = Cartesian3.angleBetween(startPosCloned, endPosCloned);
    result.push(startPosition);

    for (let i = 1; i < num - 1; i++) {
        let rate = i / (num - 1);
        let w = 1 - rate;
        let b = Math.sin(w * radians) / Math.sin(radians);
        let x = Math.sin(rate * radians) / Math.sin(radians);
        let P = Cartesian3.multiplyByScalar(startPosCloned, b, new Cartesian3);
        let M = Cartesian3.multiplyByScalar(endPosCloned, x, new Cartesian3);
        let E = Cartesian3.add(P, M, new Cartesian3);
        let L = rate * Math.PI;
        let S = startToZeroDistance * w + endToZeroDistance * rate + Math.sin(L) * h;
        E = Cartesian3.multiplyByScalar(E, S, E);
        result.push(E);
    }

    result.push(endPosition);
    return result;
}

/**
 * 根据抛物线起始点及顶点相对高度获取顶点的绝对高程
 * @private
 *
 * @param {Cartesian3} startPosition 抛物线起始端点
 * @param {Cartesian3} endPosition 抛物线终止端点
 * @param {Number} length 抛物线顶点高度（x^2 + 2py = length）
 * 
 * @returns {Number}
 */
GeoUtil.getPalabolaHeight = function (startPosition, endPosition, length) {

    const startCartographic = Cartographic.fromCartesian(startPosition);
    const endCartographic = Cartographic.fromCartesian(endPosition);
    const startLonDegrees = 180 * startCartographic.longitude / Math.PI;
    const startLatDegrees = 180 * startCartographic.latitude / Math.PI;
    const endLonDegrees = 180 * endCartographic.longitude / Math.PI;
    const endLatDegrees = 180 * endCartographic.latitude / Math.PI;
    const heightDiff = Math.abs(startCartographic.height - endCartographic.height) / 2;

    const distance = Math.sqrt((startLonDegrees - endLonDegrees) * (startLonDegrees - endLonDegrees) + (startLatDegrees - endLatDegrees) * (startLatDegrees - endLatDegrees));
    return distance * length + heightDiff;
}

/** 模型替换
 * @param {Cesium3DTileset | Model} model 白模模型或替换白模模型的模型
 * @param {Object} previousIdConfig 提供被替换的要素信息，{key:'id', value:'xxxx'},表示唯一标志与值。
 * @param {String} [previousIdConfig.key='id'] 模型的唯一标志字段,默认为"id"；
 * @param {String} previousIdConfig.value 模型唯一标志字段的值，用于获取要替换的图块；
 *
 * @param {Object} nextModelParam 提供接替换模型要素的信息
 * @param {String} nextModelParam.url 模型地址；
 * @param {String} [nextModelParam.featureType=BOSGeo.FeatureType.TILES] 模型类型,包括BOSGeo.FeatureType.TILES, FeatureType.GLTF,FeatureType.BIM,FeatureType.PHOTO和FeatureType.POINTCLOUD；
 * @param {String} [nextModelParam.name] 名称，不设置则为undefined；
 * @param {Cartesian3|Array<number>} [nextModelParam.position] 模型位置，三维笛卡尔坐标或者经纬度坐标；
 * @param {Array<number>} [nextModelParam.rotation=[0,0,0]] 模型角度，[偏航角,俯仰角,翻滚角]，单位为角度；
 * @param {Number} [nextModelParam.scale=1] 模型缩放比例；
 * @param {Boolean} [nextModelParam.enhance=false] 增强模型光，若为true,luminanceAtZenith=0.8，模型显示将变得更明亮；
 * @param {Number} [nextModelParam.luminanceAtZenith=0.2] 自定义太阳在天顶时模型的亮度，用于该模型的过程环境光，若enhance为true,该参数将不起作用；

 * @param {Function} callback  替换成功的回调，会将当前新增的模型(Cesium3DTileset | Model)作为参数返回
 * @example
 * 
 *  const {WGS84_POSITION, FEATURE} = BOSGeo.MapPickType;
    geomap.on(BOSGeo.MapEventType.LEFT_CLICK,(e)=>{
        const p = e.wgs84_position;
    if(e.feature){
        const picked = BOSGeo.GeoUtil.getPickTargetFeature(e.feature);
        let pickedModel = picked.target; //点击的整个模型
        
        //属于白模
        if( pickedModel.featureType === BOSGeo.FeatureType.WHITE_MODEL){
            let pickedPart = picked.curentTarget;
            const uniqueId = 'name'; //f.getPropertyNames();
            const curBuilding = {
                key:uniqueId,
                value:pickedPart.getProperty(uniqueId),
            }
    
            const nextModelConfig = {
                url: 'http://bosgeo-alpha.boswinner.com/geoData/models/glTF/CesiumBoxTest.gltf',      
                position: [p.longitude, p.latitude, 100],
                featureType : BOSGeo.FeatureType.GLTF,
                scale:5,
            }
    
            //关键函数：
            BOSGeo.GeoUtil.swapFeature(pickedModel, curBuilding, nextModelConfig,()=>alert('更换模型加载完毕'));
        }
        //属于被替换后的模型,再次替换
        else if(picked.isForSwap){
            BOSGeo.GeoUtil.swapFeature(picked.swapTarget, picked.swapConfig, {
                url: 'http://bosgeo-alpha.boswinner.com/geoData/models/glb/WaterBottle.glb',      
                position: [p.longitude, p.latitude, 100],
                featureType : BOSGeo.FeatureType.GLTF,
                scale:30,
            },()=>alert('更换模型加载完毕'));

            //取消当前替换替换:
            //BOSGeo.GeoUtil.cancelSwapFeature(picked.swapTarget, picked.swapConfig); 

            //取消所有替换: 
            //BOSGeo.GeoUtil.cancelSwapFeature(picked.swapTarget); 
        }
       
    }

    },[WGS84_POSITION, FEATURE])
    */
GeoUtil.swapFeature = function (model, previousIdConfig, nextModelParam, callback) {
    //来自替换后的模型
    if (model && model._originConfig) {
        previousIdConfig = model._originConfig;
        model = model._originModel;
    }
    if (model.featureType !== FeatureType.WHITE_MODEL) console.error('只能对白模数据进行替换！');

    let { key = 'id', value } = previousIdConfig;

    if ((model._hiddenFtrByField != undefined) && (model._hiddenFtrByField != key)) {
        console.error(`feature唯一标识不一致，之前的设置为：${model._hiddenFtrByField},现在为：${key}`);
        return;
    };

    //新增替换模型
    const layer = model.layer;
    if (!layer._mapForSwapFeature) layer._mapForSwapFeature = {};
    if (!layer._mapForSwapFeature[model.id]) layer._mapForSwapFeature[model.id] = {};

    const dic = layer._mapForSwapFeature[model.id];
    const preFlagValue = value;
    

    //已有替换
    const lastSwapFeature = dic[preFlagValue];

    //若存在下一步替换参数则新增模型
    if (nextModelParam) {
        //若曾被替换过，获取位置信息并删除
        if (lastSwapFeature) layer.remove(lastSwapFeature);
        !defined(nextModelParam.name) && (nextModelParam.name = 'swap:' + preFlagValue);
        const nextSwapFeature = layer.add(nextModelParam);//当前新增的模型
        // if (callback) layer.once(LayerEventType.ADD, callback);
        callback && callback(nextSwapFeature);
        nextSwapFeature._originConfig = { ...previousIdConfig };
        nextSwapFeature._originModel = model;
        dic[preFlagValue] = nextSwapFeature;
    } else {
        if (lastSwapFeature) layer.remove(lastSwapFeature);//删除已有替换
        delete dic[preFlagValue];
    }

    this._style = new Cesium3DTileStyle();
    this._styleconditions = [];

    for (let i = 0; i < this._styleconditions.length; i++) {
        // let index = this._styleconditions.indexOf(['true', 'true']);
        if (this._styleconditions[i].toString() == "true,true") {
            this._styleconditions.splice(i, 1);
        }
    }


    for (let ikey in dic) {
        let propertyVal = ikey;
        if (typeof propertyVal === 'number') {
            !this._styleconditions.includes(['${' + key + '}===' + propertyVal, 'false']) && this._styleconditions.push(['${' + key + '}===' + propertyVal, 'false']);
        } else if (typeof propertyVal === 'string') {
            !this._styleconditions.includes(['${' + key + '}===' + propertyVal, 'false']) && this._styleconditions.push(['${' + key + '}==="' + propertyVal + '"', 'false']);
        }
    }

    this._styleconditions.push(['true', 'true']);
    this._style.show = { conditions: this._styleconditions };
    model.style && model.style.color && (this._style.color = model.style.color);
    model && (model.style = this._style);

    model._hiddenFtrFlag = Date();
    // model.readyPromise.then((ts) => {
    //
    //     //是否对该模型中存在过替换feature操作,隐藏被替feature，本监听确保只注册一次
    //     if (ts._hiddenFtrByField == undefined) {
    //         ts._hiddenFtrByField = key;
    //         //隐藏被替feature，本监听确保只注册一次
    //         ts.tileVisible.addEventListener((tile) => {
    //             if (tile._hiddenFtrFlag == ts._hiddenFtrFlag) return;
    //             tile._hiddenFtrFlag = ts._hiddenFtrFlag;
    //             //新增替换模型
    //             const layer = model.layer;
    //
    //             if (layer._mapForSwapFeature && layer._mapForSwapFeature[ts.id]) {
    //                 const _allHiddenFlagArr = Object.keys(layer._mapForSwapFeature[ts.id]);
    //                 const content = tile.content;
    //                 const featuresLength = content.featuresLength;
    //                 for (let i = 0; i < featuresLength; i += 1) {
    //                     const f = content.getFeature(i);
    //                     const f_id = f.getProperty(ts._hiddenFtrByField);
    //                     if (_allHiddenFlagArr.includes(f_id)) {
    //                         f.show = false;
    //                         // f.setProperty ('swapFeature', 'false')
    //                     } else {
    //                         f.show = true;
    //                         // f.setProperty ('swapFeature', 'true')
    //                     }
    //                 }
    //             }
    //         })
    //     }
    //     GeoDepository.scene.requestRender();
    // })
    GeoDepository.scene.requestRender();
}
/** 取消白模模型整体替换 
 * @param {Cesium3DTileset} whiteModel 需要取消的白模模型
 * @param {Object} [previousIdConfig] 选填，若提供则取消单个替换，否则取消所有替换，该参数中提供被替换的要素信息，{key:'id', value:'xxxx'},表示唯一标志与值。
 * */
GeoUtil.cancelSwapFeature = function (whiteModel, previousIdConfig) {
    if (previousIdConfig) {
        GeoUtil.swapFeature(whiteModel, previousIdConfig);
    } else {
        const layer = whiteModel.layer;
        if (layer._mapForSwapFeature && layer._mapForSwapFeature[whiteModel.id]) {
            const dic = layer._mapForSwapFeature[whiteModel.id];
            Object.keys(dic).forEach((preFlagValue) => {
                const lastSwapFeature = dic[preFlagValue];
                if (lastSwapFeature) layer.remove(lastSwapFeature);//删除已有替换
            })
            layer._mapForSwapFeature[whiteModel.id] = [];
            whiteModel._hiddenFtrFlag = Date();
            GeoDepository.scene.requestRender();
        }
    }

}

/** 获取地图拾取对象以及配置属性。结合地图监听事件，对地图拾取的feature判断是否为模型（Model、Cesium3DTileset）或矢量图标（Entity），获取对应的模型和矢量要素以及配置属性。
 * @param {Object} feature 来自地图拾取函数所获得的对象
 * @return {Object} 返回对象{type, target}
 * @example
 *  const {FEATURE} = BOSGeo.MapPickType;
    geomap.on(BOSGeo.MapEventType.LEFT_CLICK,(e)=>{
        if(e.feature){
            const target = BOSGeo.GeoUtil.getPickTargetFeature(e.feature).target;
        }
    },[FEATURE])
 */
GeoUtil.getPickTargetFeature = function (feature) {
    if (!feature) console.error('feature不能为空');
    let result;
    const allFeatureType = { model: 'model', element: 'element', point: 'point', line: 'line', area: 'area' };

    if (feature.bosGroup) {
        let result = { target: feature.bosGroup };
        switch (true) {
            case feature.bosGroup.featureType === FeatureType.POINT_POINT:
                result.type = allFeatureType.point;
                result.hasAxisFrame = true;
                break;
            case feature.bosGroup.featureType === FeatureType.LINE_DYNAMIC || feature.bosGroup.featureType === FeatureType.LINE_NORMAL:
                result.type = allFeatureType.line;
                break;
            case feature.bosGroup.featureType === FeatureType.AREA_POLYGON || feature.bosGroup.featureType === FeatureType.AREA_CIRCLE:
                result.type = allFeatureType.area;
                break;
        }
        return result;
    } else if (feature instanceof Cesium3DTileset) {
        result = { type: allFeatureType.model, target: feature, hasAxisFrame: true, isForSwap: Boolean(feature._originModel) };
        if (result.isForSwap) { //是否为替换模型
            result.swapTarget = feature._originModel;//原替换白膜
            result.swapConfig = feature._originConfig; //原替换单体的配置
        }
        return result;
    } else if (feature instanceof Model) {
        result = { type: allFeatureType.model, target: feature, hasAxisFrame: true, isForSwap: Boolean(feature._originModel) };
        if (result.isForSwap) {//是否为替换模型
            result.swapTarget = feature._originModel; //原替换白膜
            result.swapConfig = feature._originConfig; //原替换单体的配置
        }
        return result;
    } else if (feature instanceof Entity) {
        return { type: allFeatureType.element, target: feature };
    }
    //来自点击事件等的feature，需要深层判断。
    else if (feature.tileset instanceof Cesium3DTileset) {
        result = {
            type: allFeatureType.model,
            target: feature.tileset,
            curentTarget: feature,
            hasAxisFrame: true,
            isForSwap: Boolean(feature.tileset._originModel) //该模型是否为被替换的模型
        };
        if (result.isForSwap) {
            result.swapTarget = feature.tileset._originModel;
            result.swapConfig = feature.tileset._originConfig;
        }
        return result;
    } else if (feature.id instanceof Entity) {
        return GeoUtil.getPickTargetFeature(feature.id);
    } else if (feature.primitive) {
        return GeoUtil.getPickTargetFeature(feature.primitive);
    } else return { type: allFeatureType.element, target: feature }

}

/**创建变换矩阵的数组
 * @private
 * @param {Object} modifyOptions
 * @param {Array<Number>} [modifyOptions.scale] 对模型在xyz方向的缩放，默认[1,1,1]
 * @param {Array<Number>} [modifyOptions.rotation] 模型旋转，默认[0,0,0]；
 * @param {Array<Number>} [modifyOptions.offset] 模型在xyz方向的偏移，默认[0,0,0]
 * @returns {Array<Matrix4>} 变换矩阵数组
 */
const getTransformMatrix = (modifyOptions) => {
    // const getTransformMatrix = (modifyOptions, originScale) => {
    let { scale = [1, 1, 1], rotation = [0, 0, 0], offset = [0, 0, 0] } = modifyOptions;
    let hpr = new HeadingPitchRoll(
        CesiumMath.toRadians(rotation[0]),
        CesiumMath.toRadians(rotation[1]),
        CesiumMath.toRadians(rotation[2])
    );
    // originScale = [originScale.x,originScale.y,originScale.z];
    // offset = offset.map((o,i) =>o/scale[i]/originScale[i]); //偏移值在后面矩阵相乘时会被scale值影响，所以需提前处理

    let scaleMat4 = Matrix4.fromScale(Cartesian3.fromArray(scale), new Matrix4());
    let offsetMat4 = Matrix4.fromTranslation(Cartesian3.fromArray(offset), new Matrix4());
    let hprMat4 = Matrix4.fromRotationTranslation(Matrix3.fromHeadingPitchRoll(hpr));
    // const ct3 = Matrix4.getTranslation(offsetMat4, new Cartesian3())
    // Transforms.headingPitchRollToFixedFrame(ct3, hpr, Ellipsoid.WGS84, Transforms.eastNorthUpToFixedFrame, new Matrix4());
    Matrix4.multiply(offsetMat4, hprMat4, offsetMat4) //考虑方位角对偏移的影响，保持z轴正向
    return [offsetMat4, hprMat4, scaleMat4];
}

/**
 * 调整模型方位和缩放比例
 * @param {Cesium3DTileset | Model} model 3DTiles或glTF模型
 * @param {Object} modifyOptions
 * @param {Array<Number>} [modifyOptions.scale] 对模型在xyz方向的缩放，默认[1,1,1]
 * @param {Array<Number>} [modifyOptions.rotation] 模型旋转，默认[0,0,0]；
 * @param {Array<Number>} [modifyOptions.offset] 模型在xyz方向的偏移，默认[0,0,0]
 * @param {Function} callback 修改后的回调函数
 * @example
 *  //创建模型图层：modelLayer
 *  //添加模型
*   myModel = modelLayer.add( {
            name: '测试模型',
            url: 'http://bosgeo-alpha.boswinner.com/geoData/models/glTF/CesiumBoxTest.gltf',    //9kb  
            position:[113,23,10],
            featureType : BOSGeo.FeatureType.GLTF
        });
    BOSGeo.GeoUtil.modifyingModel(myModel,{offset:[0,0,100]});
 */
GeoUtil.modifyingModel = function (model, modifyOptions = {}, callback) {
    if (model.ready) {

        model._modifyOptions = modifyOptions;
        let mtrx;
        if (model.featureType == FeatureType.GLTF) {
            if (!defined(model._originModelMatrix)) model._originModelMatrix = Matrix4.clone(model.modelMatrix);
            const originScale = Matrix4.getScale(model._originModelMatrix, new Cartesian3());
            let transformArr = getTransformMatrix(modifyOptions, originScale);
            mtrx = Matrix4.clone(model._originModelMatrix);
            transformArr.forEach((mt) => {
                Matrix4.multiply(mtrx, mt, mtrx);
            })
            model.modelMatrix = mtrx;
        } else {
            if (!defined(model._originModelMatrix)) model._originModelMatrix = Matrix4.clone(model._root.transform);
            const originScale = Matrix4.getScale(model._originModelMatrix, new Cartesian3());
            let transformArr = getTransformMatrix(modifyOptions, originScale);

            mtrx = Matrix4.clone(model._originModelMatrix);
            transformArr.forEach((mt) => {
                Matrix4.multiply(mtrx, mt, mtrx);
            })
            model._root.transform = mtrx;
        };
        model._modelPosition = GeoUtil.cartesianToArray(Matrix4.getTranslation(mtrx, new Cartesian3()));
        
        //更新坐标轴
        if (GeoDepository.geomap._axisForMoveFeature) {
            const target = GeoDepository.geomap._axisForMoveFeature.target;
            if (model === target) GeoDepository.geomap._axisForMoveFeature.updateByTarget();
        }
        GeoDepository.scene.requestRender();
        callback && callback();
    } else {
        model.readyPromise.then((tileset) => {
            GeoUtil.modifyingModel(tileset, modifyOptions, callback);
        })

    }
}

/**获取图形移动向量：图形位置以eastNorthUpToFixedFrame作为局部坐标框架
 * @param {Cartesian3} center 起始位置
 * @param {Array<Number>} offset [x,y,z]方向的偏移量
 * @private
 */
GeoUtil.getMoveVec = function (center, offset) {
    let localToWorldMatrix = Transforms.eastNorthUpToFixedFrame(center);

    const xyz_arr = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];
    return offset.reduce((acc, cur, i) => { //对xyz三个方向分别找到对应坐标轴向量，乘上对应方向的偏移量。最后三个方向偏移向量相加
        if (cur) {//center
            let endPoint = Matrix4.multiplyByPoint(
                localToWorldMatrix,
                new Cartesian3(...xyz_arr[i]),
                new Cartesian3()
            );
            let vec = Cartesian3.subtract(endPoint, center, new Cartesian3());
            return Cartesian3.add(acc, Cartesian3.multiplyByScalar(vec, cur, new Cartesian3()), new Cartesian3());
        } else return acc

    }, new Cartesian3(0, 0, 0))
}

/**
 * 调整点线面图层中的元素
 * @param {Point | Line |Area} feature 点图层(PointLayer,LayerType.POINT)添加的点，线图层(LineLayer,LayerType.LINE)添加的迁徙线（动态材质的线），面图层(AreaLayer,LayerType.AREA)添加的面。
 * @param {Object} modifyOptions 调整选项
 * @param {Object} [modifyOptions.point] 调整点图层中的Point对象,选项包括
 * @param {Array<Number>} [modifyOptions.point.offset] Point对象在xyz方向的偏移.
 * @param {Number} [modifyOptions.point.scale] Point对象缩放，默认1.0
 * @param {String} [modifyOptions.point.font] Point对象修改文字字体
 * @param {String} [modifyOptions.point.fontColor] Point对象修改文字颜色
 * @param {String|Image} [modifyOptions.point.image] Point对象修改图片
 * @param {String} [modifyOptions.point.imageColor] Point对象修改图片颜色
 * 
 * @param {Object} [modifyOptions.line] 调整线图层中的Line对象,选项包括
 * @param {Number} [modifyOptions.line.width]  Line对象粗细
 * @param {Boolean} [modifyOptions.line.isReverse]  Line对象是否逆向
 * @param {Number} [modifyOptions.line.baseHeight]  Line对象基础高度
 * @param {String} [modifyOptions.line.color]  Line对象颜色
 * @param {Number} [modifyOptions.line.speed]  Line对象为特殊动态线时，速度
 * @param {String|Image} [options.line.dynamicImg]  Line对象为特殊动态线时，可使用自定义贴图, 传入null恢复默认形式
 *
 * @param {Object} [modifyOptions.area] 调整面图层中的Area对象,选项包括
 * @param {AreaMaterialConfig} [modifyOptions.area.landMaterial]  Area对象中区域面的材质
 * @param {Number} [modifyOptions.area.areaBaseHeight]  Area对象基础高度
 * @param {Number} [modifyOptions.area.wallHeight]  Area对象存在墙时，墙高度。
 * @param {AreaMaterialConfig} [modifyOptions.area.wallMaterial]  Area对象存在墙时，墙材质。
 * @param {Boolean} [modifyOptions.area.isDynamic]  Area对象存在墙时，材质是否动态
 * @param {Number} [modifyOptions.area.wallSpeed]  Area对象存在墙时，动态材质速度
 * @param {Function} callback 修改后的回调函数
 * @example
 *  //创建点图层：pointLayer
 *  //添加点:point
    BOSGeo.GeoUtil.modifyingElement(point,{point:{fontColor:'#a31515',font:'italic bold 200px arial,sans-serif'}});
 *  //创建线图层：lineLayer
 *  //添加线: line
    BOSGeo.GeoUtil.modifyingElement(line,{line:{color:'#fff000'}});
    //创建面图层：areaLayer
 *  //添加面: area
    BOSGeo.GeoUtil.modifyingElement(area,{area:{landMaterial:BOSGeo.AreaMaterialConfig.CHECKERBOARD}});

 */
GeoUtil.modifyingElement = function (feature, modifyOptions = {}, callback) {
    const { POINT_POINT, LINE_DYNAMIC, AREA_POLYGON, AREA_CIRCLE } = FeatureType;


    //对象：来自PointLayer
    if (feature.featureType === POINT_POINT && modifyOptions.point) {
        let { scale, offset, text, font, fontColor, image, imageColor } = modifyOptions.point;
        feature._modifyOptions = { point: { offset: [0, 0, 0], ...modifyOptions.point } }; //用于基于坐标轴拖拽时，最后的返回值


        //不需要基于原始数据的修改：字体 颜色
        if (font || fontColor || text) {
            feature.changeLabel({ font, fontColor, text });
            feature.label && feature.label.unselectColor && (feature.label.unselectColor = new Color.fromCssColorString (fontColor));
        }
        if (image || imageColor) {
            feature.changeBillBoard({ image, imageColor });
        }

        //需要基于原始数据：偏移，比例
        if (offset) {
            feature.modeifyPosition(offset);
        }
        if (scale > 0) {
            feature.changeScale(scale);
        }
        GeoDepository.scene.requestRender();
        callback && callback();
    }

    //对象：来自LineLayer的动态线
    else if (feature.featureType === LINE_DYNAMIC && modifyOptions.line) {
        const { line } = feature;
        let { baseHeight, width, speed, color, dynamicImg, isReverse, repeat } = modifyOptions.line;

        //修改动态材质
        if (dynamicImg !== undefined || speed) {
            feature.changeDynamicLineStyle({ dynamicImg, repeat, speed });
        }
        //修改基础高度, 线粗细,线方向
        if (!isNaN(baseHeight) || width || (defined(isReverse)) || color) {
            feature.changeLine({ width, baseHeight, isReverse, color });
        }

        line._featureInfo = { ...line._featureInfo, ...modifyOptions };
        GeoDepository.scene.requestRender();
        callback && callback();
    }

    //对象：来自AreaLayer
    else if ([AREA_POLYGON, AREA_CIRCLE].includes(feature.featureType) && modifyOptions.area) {
        let { areaBaseHeight, wallHeight, wallMaterial, landMaterial, isDynamic, wallSpeed } = modifyOptions.area;
        if (defined(areaBaseHeight)) feature.changeBaseHeight(areaBaseHeight);
        if (landMaterial) feature.changeLandMaterial(landMaterial);
        if (wallMaterial || defined(isDynamic) || wallSpeed) feature.changeWallMaterial(wallMaterial, isDynamic, wallSpeed);
        if (wallHeight >= 0) feature.changeWallHeight(wallHeight);
        GeoDepository.scene.requestRender();
        callback && callback();
    }

}

/**********
 * 圆形细分
 * @param {Array<Number>|cartesian3} center 圆心坐标，可以是经纬度坐标数组，也可以是三维笛卡尔坐标对象  
 * @param {Number} radius 半径,须大于0
 * @returns {Array<cartesian3>} 返回圆形细分的坐标
 * @example
    BOSGeo.GeoUtil.computeCirclePolygon(center, radius);
 */
GeoUtil.computeCirclePolygon = function (center, radius) {
    try {
        if (!center || radius <= 0) {
            throw new Error('GeoUtil.computeCirclePolygon: 请检查传入参数是否正确');
        }
        if (center instanceof Array) {
            center = Cartesian3.fromDegrees(...center);
        }
        let cep = EllipseGeometryLibrary.computeEllipsePositions({
            center: center,
            semiMajorAxis: radius,
            semiMinorAxis: radius,
            rotation: 0,
            granularity: 0.005
        }, false, true);
        if (!cep || !cep.outerPositions) {
            return null;
        }
        let pnts = BOSGeo.Cartesian3.unpackArray(cep.outerPositions);
        let first = pnts[0];
        pnts[pnts.length] = first;
        return pnts;
    } catch (err) {
        throw err;
    }
}

/**
 * 获取tileset的当前Cesium3DTile对象缓存
 * @private
 * @param {Cesium3DTileset} tileset -3DTiles模型对象
 * @returns {Cesium3DTile[]}
 * @example 
 * var tiles = BOSGeo.GeoUtil.getTileCaches(tileset);
 */
GeoUtil.getTileCaches = function (tileset) {
    const tileCaches = [];
    const { head } = tileset._cache._list;
    let curDoublyLinkedListNode = head.next;
    while (curDoublyLinkedListNode !== undefined) {
        if (curDoublyLinkedListNode.item instanceof Cesium3DTile) {
            tileCaches.push(curDoublyLinkedListNode.item);
        }
        curDoublyLinkedListNode = curDoublyLinkedListNode.next;
    }
    return tileCaches;
}

/**
 * 获取tileset的当前缓存中属性key的Cesium3DTileFeature对象
 * @private
 * 
 * @param {Cesium3DTileset} tileset -3DTiles模型对象
 * @param {String} value 要素属性值value
 * @param {String} [key='key'] 要素属性key
 * @returns {Cesium3DTileFeature|undefined} 
 * 
 * @example
 * var feature = BOSGeo.GeoUtil.getFeatureByKey(tileset, keyValue, 'key');
 */
GeoUtil.getFeatureByKey = function (tileset, value, key = 'key') {
    let targetFeature;
    const { head } = tileset._cache._list;
    let curDoublyLinkedListNode = head.next;
    while (curDoublyLinkedListNode !== undefined) {
        if (curDoublyLinkedListNode.item instanceof Cesium3DTile) {
            const content = curDoublyLinkedListNode.item.content;
            const featuresLength = content.featuresLength;
            for (let i = 0; i < featuresLength; i++) {
                const feature = content.getFeature(i);
                if (feature instanceof Cesium3DTileFeature) {
                    if (feature.getProperty(key) === value) {
                        targetFeature = feature;
                        return targetFeature;
                    }
                }
            }
        }
        curDoublyLinkedListNode = curDoublyLinkedListNode.next;
    }
    return targetFeature;
}

/**
 * 获取局部坐标系三个轴的单位方向向量
 * 
 * @param {Cartesian3} origin 坐标系原点
 * @param {Matrix4} [localSystem] 选填，坐标系矩阵,默认ENU坐标系
 * 
 * @returns {Object|undefined} {normalX: Cartesian3, normalY: Cartesian3, normalZ: Cartesian3}
 * 
 * @example
 * var center = BOSGeo.Cartesian3.fromDegrees(113.2, 23.2);
 * var { normalX, normalY, normalZ } = GeoUtil.getLocalAxisInfo(center);
 */
GeoUtil.getLocalAxisInfo = function (origin, localSystem) {
    try {
        localSystem = localSystem || Transforms.eastNorthUpToFixedFrame(origin);

        let normalX = Matrix4.getColumn(localSystem, 0, new Cartesian3());
        normalX = Cartesian3.normalize(normalX, normalX);
        let normalY = Matrix4.getColumn(localSystem, 1, new Cartesian3());
        normalY = Cartesian3.normalize(normalY, normalY);
        let normalZ = Matrix4.getColumn(localSystem, 2, new Cartesian3());
        normalZ = Cartesian3.normalize(normalZ, normalZ);
        return { normalX, normalY, normalZ }
    } catch (e) {
        console.log(`GeoUtil.getLocalAxisInfo, error: ${e}`);
    }
    return undefined
}

/**
 * 获取ENU坐标系下绕三个局部轴的旋转矩阵
 * 
 * @param {Cartesian3} origin 局部坐标系原点
 * @param {Cartesian3} rotateAngles xyz分别表示由XYZ轴正方向朝原点逆时针旋转角度值，单位为度
 * 
 * @returns {Matrix4}
 * @example
 * const origin = Cartesian3.fromDegrees(113, 22, 10);
 * const pointA = Cartesian3.fromDegrees(113, 22, 20);
 * const rotation = GeoUtil.getLocalRotationMatrix(origin, new BOSGeo.Cartesian3(0, 180, 0));
 * const pointA1 = Matrix4.multiplyByPoint(rotation, pointA, new BOSGeo.Cartesian3());
 */
GeoUtil.getLocalRotationMatrix = function (origin, rotateAngles) {
    // 以O点为原点建立局部坐标系（东方向为x轴,北方向为y轴,垂直于地面为z轴），得到一个局部坐标到世界坐标转换的变换矩阵
    const localToWorldMatrix = Transforms.eastNorthUpToFixedFrame(origin);
    // 求世界坐标到局部坐标的变换矩阵
    const worldToLocalMatrix = Matrix4.inverse(localToWorldMatrix, new Matrix4());

    const rotationX = Matrix3.fromRotationX(CesiumMath.toRadians(rotateAngles.x));
    const rotationY = Matrix3.fromRotationY(CesiumMath.toRadians(rotateAngles.y));
    const rotationZ = Matrix3.fromRotationZ(CesiumMath.toRadians(rotateAngles.z));
    let rotation = Matrix3.multiply(
        Matrix3.multiply(rotationX, rotationY, new Matrix3()),
        rotationZ, new Matrix3());

    return Matrix4.multiply(localToWorldMatrix,
        Matrix4.multiply(
            Matrix4.fromRotationTranslation(rotation, new Cartesian3(0, 0, 0), new Matrix4()),
            worldToLocalMatrix,
            new Matrix4()),
        new Matrix4());
}

/**
 * 设置tileset的显示范围
 * @param {Cesium3DTileset} tileset -3DTiles模型对象
 * @param {GeoJSON} geojsonData 控制3DTiles显示范围的面状geojson对象
 * @param {String} [longitudeField='cesium#longitude'] 经度属性字段名
 * @param {String} [latitudeField='cesium#latitude'] 纬度属性字段名
 * @example
 * let url='http://gis-alpha.bimwinner.com/geoserver/fanwei/ows?service=WFS&version=1.0.0&request=GetFeature&outputformat=json&typename=fanwei:shenzhen'
 BOSGeo.Resource.fetchJson(url).then(function(result) {
    BOSGeo.GeoUtil.setTileVisibleRange(tileset, result);
 })
 */
GeoUtil.setTileVisibleRange = function (tileset, geojsonData, longitudeField = 'cesium#longitude', latitudeField = 'cesium#latitude') {
    let bbox = turf.bbox(geojsonData);
    let calPos = (pos) => {
        if (pos.longitude) {
            pos.point = turf.point([pos.longitude, pos.latitude]);
        } else if (pos.pos && pos.pos.toString() != "(0, 0, 0)") {
            pos.cartographic = Cartographic.fromCartesian(pos.pos, Ellipsoid.WGS84, new Cartographic()); // 结果对象中的值将以弧度表示。
            pos.longitude = Number(CesiumMath.toDegrees(pos.cartographic.longitude));
            pos.latitude = Number(CesiumMath.toDegrees(pos.cartographic.latitude));
            if (pos.longitude && pos.latitude) {
                pos.point = turf.point([pos.longitude, pos.latitude]);
            }
        }
        return pos
    }
    let check = (pos, bbox) => {
        if (pos.longitude > bbox[0] && pos.longitude < bbox[2] && pos.latitude > bbox[1] && pos.latitude < bbox[3]) {
            return true
        } else { return false }
    }
    let PointInPolygon = (point, features) => {
        let isIn = false;
        for (let i = 0; i < features.length; i++) {
            isIn = point ? booleanPointInPolygon(point, features[i]) : false;
            if (isIn) return isIn
        }
        return isIn;
    }
    let tileVisibleRange = (tile) => {
        const content = tile._content
        const featuresLength = content.featuresLength
        for (let i = 0; i < featuresLength; i += 2) {
            const feature = content.getFeature(i)
            const model = feature.content._model
            if (model) {
                let posRes = {}
                posRes.pos = {}
                posRes.pos1 = {}
                posRes.pos2 = {}
                posRes.pos3 = {}
                posRes.pos4 = {}
                posRes.pos5 = {}
                posRes.pos.pos = model._boundingSphere.center;
                posRes.pos1.pos = Matrix4.getTranslation(model.modelMatrix, new Cartesian3());
                posRes.pos3.pos = Matrix4.getTranslation(model._computedModelMatrix, new Cartesian3());
                posRes.pos2.pos = Matrix4.multiplyByPoint(model._computedModelMatrix, tile.boundingSphere.center, new Cartesian3());
                posRes.pos4.longitude = feature.getProperty(longitudeField);
                posRes.pos4.latitude = feature.getProperty(latitudeField);
                posRes.pos5.pos = feature.primitive.boundingSphere.center

                posRes.pos = calPos(posRes.pos)
                posRes.pos1 = calPos(posRes.pos1)
                posRes.pos2 = calPos(posRes.pos2)
                posRes.pos3 = calPos(posRes.pos3)
                posRes.pos4 = calPos(posRes.pos4)
                posRes.pos5 = calPos(posRes.pos5)

                if (posRes.pos.cartographic) {
                    if (check(posRes.pos, bbox) || check(posRes.pos1, bbox) || check(posRes.pos2, bbox) || check(posRes.pos3, bbox) || check(posRes.pos4, bbox) || check(posRes.pos5, bbox)) {
                        if (geojsonData && geojsonData.features && geojsonData.features.length > 0) {
                            let isB = posRes.pos.point ? PointInPolygon(posRes.pos.point, geojsonData.features) : false; //PointInPoly(point,geojsonData.data.features[0].geometry.coordinates) //
                            let isB1 = posRes.pos1.point ? PointInPolygon(posRes.pos1.point, geojsonData.features) : false;
                            let isB2 = posRes.pos2.point ? PointInPolygon(posRes.pos2.point, geojsonData.features) : false;
                            let isB3 = posRes.pos3.point ? PointInPolygon(posRes.pos3.point, geojsonData.features) : false;
                            let isB4 = posRes.pos4.point ? PointInPolygon(posRes.pos4.point, geojsonData.features) : false;
                            let isB5 = posRes.pos5.point ? PointInPolygon(posRes.pos5.point, geojsonData.features) : false;
                            if (isB || isB1 || isB2 || isB3 || isB4 || isB5) {
                                model.show = true;
                            } else {
                                model.show = false;
                            }
                        }
                    } else {
                        model.show = false;
                    }
                }
            }
        }
    }
    tileVisibleRange.VisibleRange = 'VisibleRange';
    //清除之前对应的事件,避免重复
    for (let k = 0; k < tileset.tileVisible._listeners.length; k++) {
        'VisibleRange' === tileset.tileVisible._listeners[k].VisibleRange && tileset.tileVisible.removeEventListener(tileset.tileVisible._listeners[k])
    }
    tileset.tileVisible.addEventListener(tileVisibleRange)
};

/**
 * 计算GIS坐标和BIM坐标之间的转换参数
 * @param {Matrix4} computedTransform tileset根节点的computedTransform
 * @param {Object} paramPoints 包含3个及以上gis坐标点和对应的bim坐标点
 * @param {Array<Cartesian3>}  paramPoints.gisPoints 包含3个及以上的cartesian3坐标点
 * @param {Array<Object>}  paramPoints.bimPoints 包含3个及以上对应的bim坐标点，bim坐标点对象包含x，y，z属性
 * @returns {Object} 返回转换参数包含computedTransform和dx、dy、dz的偏移值
 * @example
 *  let testModel = modelLayer.add({
    name: 'testModel',
    // 江湖别墅
    url: 'http://bos3d.bimwinner.com/api/j798920c67de49e4aeb3634e52a84548/geomodels/G1622167164209/data/tileset.json',
    featureType: BOSGeo.FeatureType.BIM,
});
modelLayer.zoomTo(testModel);


// 计算转换平移矩阵的对应点参数
var gisPoints = [], bimPoints = [];
// 获取gis坐标点方法，代码中添加以下代码并在gis场景中左键点击：
//   geomap.on(BOSGeo.MapEventType.LEFT_CLICK, (e) => {
//     console.log('position', e);
//   },[BOSGeo.MapPickType.WORLD_POSITION]);
//   获取bim坐标点的方法，控制台输入以下代码并在bos3d场景中左键点击：
//   viewer3D.viewerImpl.modelManager.addEventListener( BOS3D.EVENTS.ON_CLICK_PICK, 
//    function(event){ 
//        console.log(event.intersectInfo.point); 
//    }
// );
// 注意在bos3d中选点时不要将镜头拉的太近，会引起较大误差，应在适当距离（可以看清但不要尽量拉大）多次选取同一点来判断是否准确
gisPoints[0] = new BOSGeo.Cartesian3(-2306175.997040795, 5401542.534233195, 2478749.9094140474); //第一个gis坐标系取点
bimPoints[0] = {x: -5517.482001081882, y: -11686.318398392534, z: 6910.569410699635}; //第一个bim坐标系取点
gisPoints[1] = new BOSGeo.Cartesian3(-2306179.3834942114, 5401536.589428768, 2478759.7118662223); //第二个gis坐标系取点
bimPoints[1] = {x: -67.99999999999926, y: -1044.8105901346412, z: 6908.269118283033}; //第二个bim坐标系取点
gisPoints[2] = new BOSGeo.Cartesian3(-2306175.785566032, 5401533.93439871, 2478761.7414075597); //第三个gis坐标系取点
bimPoints[2] = {x: -2334.814467913469, y: 2323.0000000000023, z: 4147.070791432408}; //第三个bim坐标系取点
var paramPoints = {
    gisPoints,
    bimPoints
};

// 3dtiles的根节点computedTransform
var rootTransform, resPoint;

testModel.readyPromise.then(()=>{
    rootTransform = testModel.root.computedTransform;
    let coorTransform = BOSGeo.GeoUtil.computeCoorTransform(rootTransform, paramPoints);
    console.log(coorTransform);
})
 */

GeoUtil.computeCoorTransform = function (computedTransform, paramPoints) {
    let inverseMatrix4 = Matrix4.inverse(computedTransform, new BOSGeo.Matrix4());
    let { gisPoints, bimPoints } = paramPoints;
    var initGisP = []; //变换到世界坐标原点的gis坐标
    gisPoints.forEach(p => {
        let init = Matrix4.multiplyByPoint(inverseMatrix4, p, new Cartesian3());
        init.x *= 1000;
        init.y *= 1000;
        init.z *= 1000;
        initGisP.push(init);
    });
    var dxs = 0, dys = 0, dzs = 0;
    let length = gisPoints.length;
    for (let i = 0; i < length; i++) { // 计算平移量
        dxs += (bimPoints[i].x - initGisP[i].x);
        dys += (bimPoints[i].y - initGisP[i].y);
        dzs += (bimPoints[i].z - initGisP[i].z);
    };
    let dx = dxs / length;
    let dy = dys / length;
    let dz = dzs / length;

    let coorTransform = {
        computedTransform,
        dx,
        dy,
        dz
    };
    return coorTransform;
};

/**
 * GIS坐标转为BIM坐标
 * @param {Object} coorTransform 通过computeCoorTransform方法得到的转换参数
 * @param {Cartesian3} point 待转换的GIS坐标
 * @returns {Object} 包含x、y、z的BIM坐标
 * @example
 * let testModel = modelLayer.add({
    name: 'testModel',
    // 江湖别墅
    url: 'http://bos3d.bimwinner.com/api/j798920c67de49e4aeb3634e52a84548/geomodels/G1622167164209/data/tileset.json',
    featureType: BOSGeo.FeatureType.BIM,
});
modelLayer.zoomTo(testModel);


// 计算转换平移矩阵的对应点参数
var gisPoints = [], bimPoints = [];
// 注意在bos3d中选点时不要将镜头拉的太近，会引起较大误差，应在适当距离（可以看清但不要尽量拉大）多次选取同一点来判断是否准确
gisPoints[0] = new BOSGeo.Cartesian3(-2306175.997040795, 5401542.534233195, 2478749.9094140474); //第一个gis坐标系取点
bimPoints[0] = {x: -5517.482001081882, y: -11686.318398392534, z: 6910.569410699635}; //第一个bim坐标系取点
gisPoints[1] = new BOSGeo.Cartesian3(-2306179.3834942114, 5401536.589428768, 2478759.7118662223); //第二个gis坐标系取点
bimPoints[1] = {x: -67.99999999999926, y: -1044.8105901346412, z: 6908.269118283033}; //第二个bim坐标系取点
gisPoints[2] = new BOSGeo.Cartesian3(-2306175.785566032, 5401533.93439871, 2478761.7414075597); //第三个gis坐标系取点
bimPoints[2] = {x: -2334.814467913469, y: 2323.0000000000023, z: 4147.070791432408}; //第三个bim坐标系取点
var paramPoints = {
    gisPoints,
    bimPoints
};

// 3dtiles的根节点computedTransform
var rootTransform, resPoint;

testModel.readyPromise.then(()=>{
    rootTransform = testModel.root.computedTransform;
    let coorTransform = BOSGeo.GeoUtil.computeCoorTransform(rootTransform, paramPoints);
    console.log(coorTransform);
    var point = new BOSGeo.Cartesian3( -2306174.5516214916, 5401546.04463069, 2478750.522077943);
    resPoint = BOSGeo.GeoUtil.toBIMPoint(coorTransform,point);
})
 */

GeoUtil.toBIMPoint = function (coorTransform, point) {
    let {
        computedTransform,
        dx,
        dy,
        dz
    } = coorTransform;

    let inverseMatrix4 = Matrix4.inverse(computedTransform, new BOSGeo.Matrix4());
    let initCart3 = Matrix4.multiplyByPoint(inverseMatrix4, point, new Cartesian3());
    let resPoint = {};
    resPoint.x = initCart3.x * 1000 + dx;
    resPoint.y = initCart3.y * 1000 + dy;
    resPoint.z = initCart3.z * 1000 + dz;

    return resPoint;
};

/**
 * BIM坐标转为GIS坐标
 * @param {Object} coorTransform 通过computeCoorTransform方法得到的转换参数
 * @param {Object} point 待转换的BIM坐标
 * @returns {Cartesian3} Cartesian3类型的GIS坐标
 * @example
 * let testModel = modelLayer.add({
    name: 'testModel',
    // 江湖别墅
    url: 'http://bos3d.bimwinner.com/api/j798920c67de49e4aeb3634e52a84548/geomodels/G1622167164209/data/tileset.json',
    featureType: BOSGeo.FeatureType.BIM,
});
modelLayer.zoomTo(testModel);


// 计算转换平移矩阵的对应点参数
var gisPoints = [], bimPoints = [];
// 注意在bos3d中选点时不要将镜头拉的太近，会引起较大误差，应在适当距离（可以看清但不要尽量拉大）多次选取同一点来判断是否准确
gisPoints[0] = new BOSGeo.Cartesian3(-2306175.997040795, 5401542.534233195, 2478749.9094140474); //第一个gis坐标系取点
bimPoints[0] = {x: -5517.482001081882, y: -11686.318398392534, z: 6910.569410699635}; //第一个bim坐标系取点
gisPoints[1] = new BOSGeo.Cartesian3(-2306179.3834942114, 5401536.589428768, 2478759.7118662223); //第二个gis坐标系取点
bimPoints[1] = {x: -67.99999999999926, y: -1044.8105901346412, z: 6908.269118283033}; //第二个bim坐标系取点
gisPoints[2] = new BOSGeo.Cartesian3(-2306175.785566032, 5401533.93439871, 2478761.7414075597); //第三个gis坐标系取点
bimPoints[2] = {x: -2334.814467913469, y: 2323.0000000000023, z: 4147.070791432408}; //第三个bim坐标系取点
var paramPoints = {
    gisPoints,
    bimPoints
};

// 3dtiles的根节点computedTransform
var rootTransform, resPoint;

testModel.readyPromise.then(()=>{
    rootTransform = testModel.root.computedTransform;
    let coorTransform = BOSGeo.GeoUtil.computeCoorTransform(rootTransform, paramPoints);
    console.log(coorTransform);
    var point = {x: -8224.824277898897, y: -12155.717773210326, z: 9599.429074945496};
    resPoint = BOSGeo.GeoUtil.toGISPoint(coorTransform,point);
})
 */

GeoUtil.toGISPoint = function (coorTransform, point) {
    let _point = {

    }
    _point.x = point.x;
    _point.y = point.y;
    _point.z = point.z;
    let {
        computedTransform,
        dx,
        dy,
        dz
    } = coorTransform;

    _point.x = (_point.x - dx) / 1000;
    _point.y = (_point.y - dy) / 1000;
    _point.z = (_point.z - dz) / 1000;
    let resPoint = Matrix4.multiplyByPoint(computedTransform, _point, new Cartesian3());

    return resPoint;
};

/**
 * 定位到构件OBB包围盒
 * 
 * @private
 * 
 * @param {Cesium3DTileset} tileset 构件所属BIM模型对象
 * @param {Array.<Number>} obbInfo 构件有向包围盒（OBB）信息，构件在初始状态时的局部坐标系信息，前三个数为原点的世界坐标值，后九位数字分别表示半轴长
 * @param {Function} callback 定位回调方法
 * 
 * @example
 * var modelLayer = layerManager.createLayer(BOSGeo.LayerType.MODEL,'model1', {customGroupId:'model'});
 * var tileset = modelLayer.add({
 *      url: "https://bos3d-alpha.bimwinner.com/api/y3f1d6fa04c54c728141b36880fac46a/geomodels/G1614756326311/data/tileset.json",
 *      name: "江湖别墅",
 *      featureType: BOSGeo.FeatureType.BIM,
 *      position: [114.028841, 22.550412, 4.6],
 *      rotation: [-17.6, 0, 0],
 *      scale: 0.001
 * });
 * BOSGeo.GeoUtil.flyToOBB(
 *     tileset,
 *     [-1487301.597805902,5395059.965191418,3061934.9457198908,4156.501719571534,0,0,0,3942.114326783456,0,0,0,5561.144355765078]
 * );
 * 
 * 
 */
GeoUtil.flyToOBB = function (tileset, obbInfo, callback) {
    if (obbInfo === undefined || obbInfo.length < 12) {
        console.error(`GeoUtil.flyToOBB: obbInfo——${obbInfo}不全!`);
        return;
    };
    const viewer = GeoDepository.viewer;
    const scale = defaultValue(tileset.scale, 1);
    let box;

    tileset.readyPromise && tileset.readyPromise.then(() => {
        const initBoxCenter = new Cartesian3(obbInfo[0], obbInfo[1], obbInfo[2]); // 构件包围盒中心世界坐标的位置
        const initRootTransform = tileset._root.initTransform; // 转换矩阵

        let curBoxCenter = initBoxCenter; // 构件当前包围盒中心坐标
        // 设置模型初始位置后，需要转换
        if (initRootTransform) {
            const transform = Matrix4.multiply(
                tileset.root.transform,
                Matrix4.inverse(initRootTransform, new Matrix4()),
                new Matrix4()
            );
            curBoxCenter = Matrix4.multiplyByPoint(
                transform,
                initBoxCenter,
                new Cartesian3()
            );
        }

        box = viewer.entities.add({
            name: "ComponentBox",
            position: curBoxCenter,
            box: {
                dimensions: new BOSGeo.Cartesian3(2 * scale * obbInfo[7], 2 * scale * obbInfo[11], 2 * scale * obbInfo[3]),  // y z x
                material: BOSGeo.Color.WHITE.withAlpha(0.001),
                outline: false,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
        });

        viewer.zoomTo(box);
        callback();
        setTimeout(e => {
            viewer.entities.remove(box);
        }, 3000);
    });
}

/**
 * 定位到构件
 * 
 * @param {Cesium3DTileset} tileset 构件所属BIM模型对象
 * @param {Object} serviceParams 构件定位信息查询后台服务参数
 * @param {String} serviceParams.site 请求服务域名/IP地址
 * @param {String} serviceParams.databaseKey 数据库key
 * @param {String} serviceParams.geoKey 模型key，以'G-'开头的GeoModelKey
 * @param {String} serviceParams.componentKey 构件key关键字
 * @param {String} [serviceParams.token=BosConfig.defaultToken] accessToken
 * @param {Object} highlightOptions 构件高亮配置
 * @param {Boolean} [highlightOptions.ifHighlight=true] 是否对定位构件的进行高亮着色
 * @param {String} [highlightOptions.highlightColor=BOSGeo.Color.RED] 定位构件的高亮颜色, ifHighlight为true时起效
 * @param {String} [highlightOptions.otherColor=BOSGeo.Color.WHITE] 其它构件的颜色, ifHighlight为true时起效（当定位构件在室内时可以通过设置改参数的颜色透明度来避免遮挡）
 * 
 * @example
 * var modelLayer = layerManager.createLayer(BOSGeo.LayerType.MODEL,'model1', {customGroupId:'model'});
 * var tileset = modelLayer.add({
 *      url: "https://bos3d-alpha.bimwinner.com/api/y3f1d6fa04c54c728141b36880fac46a/geomodels/G1614756326311/data/tileset.json",
 *      name: "江湖别墅",
 *      featureType: BOSGeo.FeatureType.BIM,
 *      position: [114.028841, 22.550412, 4.6],
 *      rotation: [-17.6, 0, 0],
 *      scale: 0.001
 * });
 * BOSGeo.GeoUtil.flyToComponent(
 *           tileset,
 *           {
 *              site: 'https://bos3d-alpha.bimwinner.com',
 *               databaseKey: 'y3f1d6fa04c54c728141b36880fac46a',
 *               geoKey: 'G1614756326311',
 *               componentKey: 'M1614755277553_232775',
 *               token: ''
 *           },
 *           {
 *              ifHighlight: true,
 *              highlightColor : BOSGeo.Color.fromCssColorString('#67ADDF'),
 *           }        
 *       );
 * 
 */
GeoUtil.flyToComponent = function (tileset, serviceParams, highlightOptions = {}) {
    const { site, databaseKey, geoKey, componentKey, token } = serviceParams;
    if (tileset instanceof Cesium3DTileset && site && databaseKey && geoKey && componentKey) {
        if (!tileset.readyPromise) {
            // 避免初次加载图层后立马调用该接口时报错
            setTimeout(() => {
                this.flyToComponent(tileset, serviceParams, highlightOptions);
            }, 100);
            return;
        }
        const {
            ifHighlight = true,
            highlightColor = Color.RED,
            otherColor = Color.WHITE
        } = highlightOptions;
        BosApi.getComponentsInfo(
            {
                site,
                databaseKey
            },
            {
                key: geoKey,
                componentKey
            },
            token
        ).then((res) => {
            const data = res.data.data;
            if (data && data.content && data.content.length > 0) {
                GeoUtil.flyToOBB(tileset, data.content[0].location, () => {
                    if (!ifHighlight) return;
                    if (!(highlightColor instanceof Color) || !(otherColor instanceof Color)) {
                        console.error(`BOSGeo.GeoUtil.flyToComponent：高亮颜色参数类型不属于BOSGeo.Color,无法进行有效的着色!`, highlightColor, otherColor);
                        return;
                    }
                    let style = new Cesium3DTileStyle({
                        color: {
                            conditions: [
                                ["${key}=== '" + componentKey + "'", highlightColor.toCssColorString()],
                                ["true", otherColor.toCssColorString()] //'rgba(${red}, ${green}, ${blue}, 1.0)']
                            ]
                        }
                    });
                    tileset.style && (style.show = tileset.style.show);
                    tileset.style = style;
                });
            } else {
                console.error(`BOSGeo.GeoUtil.flyToComponent：后台getComponentsInfo接口返回出错，不包含有效的定位信息！`, data);
            }
        });
    } else {
        console.error(`BOSGeo.GeoUtil.flyToComponent：参数不全，请确认后输入！`);
    }

}

/**
 * 选中模型或者点线面要素
 * 
 * @param {Model|Point|Line|Area} feature 选中要素，支持多个要素以数组方式传入
 * @param {String} [selectColor='#04fffd8c'] 被选中要素的颜色
 * @param {function} callback 选中后的回调函数,callback(last, current)参数包括上次选中的要素（存在数组中）与这次选中的要素
 * @example
 * geomap.on(BOSGeo.MapEventType.LEFT_CLICK, (e) => {
    if(e.feature){
        const f = BOSGeo.GeoUtil.getPickTargetFeature(e.feature).target;
        BOSGeo.GeoUtil.selectFeature(f,'#23a3de',function(last, current){
            console.log('上次选中元素：',last);
            console.log('这次选中元素：',current);
        });
    }
    
}, [BOSGeo.MapPickType.FEATURE]);
 */

GeoUtil.selectFeature = function (feature, selectColor, callback) {
    if (selectColor) GeoUtil.selectFeatureColor = Color.fromCssColorString(selectColor);
    if (!GeoUtil.selectFeatureColor) GeoUtil.selectFeatureColor = Color.fromCssColorString('#23a3de');

    //可被选中的几种类型
    const { GLTF, TILES, POINTCLOUD, BIM, PHOTO, WHITE_MODEL, POINT_POINT, LINE_NORMAL, LINE_DYNAMIC, AREA, POLYGON, AREA_CIRCLE, AREA_POLYGON, ELLIPSE } = FeatureType;
    const pointLineArea = [POINT_POINT, LINE_NORMAL, LINE_DYNAMIC, AREA, POLYGON, AREA_CIRCLE, AREA_POLYGON, ELLIPSE];
    const tiles = [TILES, POINTCLOUD, BIM, PHOTO, WHITE_MODEL];

    //清除上一次选中
    let clear = (ilast) => {
        if (ilast) {
            const lastFeatureType = ilast.featureType;
            if (lastFeatureType === GLTF && !ilast.isDestroyed()) {
                ilast.color = ilast.unselectColor;
            } else if (pointLineArea.includes(lastFeatureType) && !ilast.isDestroyed) {
                // ilast.color && (ilast.color = new Color.fromAlpha(ilast.billboard.unselectColor,ilast.billboard.unselectColor.alpha) ,ilast.billboard.unselectColor = null);
                if(lastFeatureType === POINT_POINT) {
                    ilast.billboard && (ilast.billboard.color = new Color.fromAlpha(ilast.billboard.unselectColor,ilast.billboard.unselectColor.alpha) ,ilast.billboard.unselectColor = null);
                    ilast.point && (ilast.point.color = new Color.fromAlpha(ilast.point.unselectColor,ilast.point.unselectColor.alpha) ,ilast.point.unselectColor = null);
                    ilast.label && (ilast.label.fillColor = new Color.fromAlpha(ilast.label.unselectColor,ilast.label.unselectColor.alpha), ilast.label.unselectColor = null);
                }else {
                    ilast.color = ilast.unselectColor;
                }
            } else if (tiles.includes(lastFeatureType) && !ilast.isDestroyed()) {
                const style = new Cesium3DTileStyle()
                defined(ilast.unselectStyle) && (style.show = ilast.unselectStyle.show);
                defined(ilast.unselectStyle) && (style.color = ilast.unselectStyle.color);
                ilast.style = style;
            }
        }
    };
    const last = GeoUtil.selectTarget;
    if (last instanceof Array) {
        last.map(l => clear(l))
        GeoUtil.selectTarget.splice(0,GeoUtil.selectTarget.length);
    } else {
        clear(last);
    }
    //选中上色
    let hightLight = (ifeature) => {
        const featureType = ifeature.featureType;
        if (featureType === GLTF) {
            !ifeature.unselectColor && (ifeature.unselectColor = ifeature.color);
            ifeature.color = GeoUtil.selectFeatureColor;
            // GeoUtil.selectTarget = ifeature;
            GeoUtil.selectTarget.push(ifeature);
        } else if (pointLineArea.includes(featureType)) {
            if(featureType === POINT_POINT){
                // !ifeature.unselectColor && (ifeature.unselectColor = ifeature.color);
                ifeature.billboard && !ifeature.billboard.unselectColor && (ifeature.billboard.unselectColor = new Color.fromAlpha(ifeature.billboard.color,ifeature.billboard.color.alpha));
                ifeature.point && !ifeature.point.unselectColor && (ifeature.point.unselectColor = new Color.fromAlpha(ifeature.point.color,ifeature.point.color.alpha));
                ifeature.label && !ifeature.label.unselectColor && (ifeature.label.unselectColor = new Color.fromAlpha(ifeature.label.fillColor,ifeature.label.fillColor.alpha));
                !ifeature.unselectColor && (ifeature.unselectColor = ifeature.color);

                let pointColor = GeoUtil.selectFeatureColor;
                ifeature.billboard && ifeature.billboard.color && (ifeature.billboard.color = pointColor);
                ifeature.point && ifeature.point.color && (ifeature.point.color = pointColor);
                ifeature.label && ifeature.label.fillColor && (ifeature.label.fillColor = pointColor);
                GeoDepository.scene.requestRender();
            }else {
                !ifeature.unselectColor && (ifeature.unselectColor = ifeature.color);
            }
            ifeature.color = GeoUtil.selectFeatureColor;
            // GeoUtil.selectTarget = ifeature;
            GeoUtil.selectTarget.push(ifeature);
        } else if (tiles.includes(featureType)) {
            !ifeature.unselectStyle && (ifeature.unselectStyle = ifeature.style);
            const style = new Cesium3DTileStyle({
                color: `color("${GeoUtil.selectFeatureColor.toCssHexString()}")`
            });
            defined(ifeature.style) && (style.show = ifeature.style.show);
            ifeature.style = style;
            // GeoUtil.selectTarget = ifeature;
            GeoUtil.selectTarget.push(ifeature);
        }
    }
    if (feature && !(feature instanceof Array)) {
        // GeoUtil.selectTarget = [];
        if (GeoUtil.selectTarget) {
            GeoUtil.selectTarget.splice(0, GeoUtil.selectTarget.length);
        } else {
            GeoUtil.selectTarget = new Array();;
        }
        hightLight(feature)
    } else if (feature && (feature instanceof Array)) {
        // GeoUtil.selectTarget = [];
        if (GeoUtil.selectTarget) {
            GeoUtil.selectTarget.splice(0, GeoUtil.selectTarget.length);
        } else {
            GeoUtil.selectTarget = new Array();;
        }
        feature.map(f => hightLight(f))

    }
    callback && callback(last, feature);
    GeoDepository.scene.requestRender();
}

/**
 * 检验 数组形式的坐标参数[longitude, latitude, height], 若符合要求就返回Cartesian3对象，否则抛出错误
 * @private
 * @param {Array<Number>} position 坐标参数值
 * @param {String} positionName 坐标参数名称
 * @returns {Cartesian3} 
 * @example
 * try{
 *  const position = GeoUtil.getVerifiedPosition([-300, 100, 20]);
 * }catch (error) {
    throw error;
   }
 */
GeoUtil.getVerifiedPosition = function (position, positionName = 'position') {
    if (position instanceof Cartesian3) return position;

    if ((position instanceof Array) && (position.length === 3)) {
        position = position.map(p => Number(p));
        if (position.findIndex(p => isNaN(p)) + 1) throw new Error(positionName + '坐标错误：请保证数组中元素均为数字！');

        const [lng, lat] = position;
        if ((lng > 180) || (lng < -180)) {
            throw new Error(positionName + '坐标错误：经度必须大于-180，小于180！');
        }
        if ((lat > 90) || (lat < -90)) {
            throw new Error(positionName + '坐标错误：纬度必须大于-90，小于90！');
        }
        return Cartesian3.fromDegrees(...position);
    } else {
        throw new Error(positionName + '坐标错误：请输入长度为3的数组！');
    }
}

/**
 * 根据矩形对角线上的两点AC获取重新计算后的四个顶点坐标
 * @private
 * 
 * @param {Array.<Cartesian3>} corner 
 * @param {Number} [angleToCross=Math.PI / 2] 当前对角线与另外一条对角线的顺时针方向的夹角，取值范围（0，Math.PI）
 * @param {Number} [centerHeight=0] 中心点高度
 * 
 * @returns {Array.<Cartesian3>}
 */
GeoUtil.getRectangleByCorner = function (corner, angleToCross = Math.PI / 2, centerHeight = 0) {

    if (corner.length < 2 || corner[0].equals(corner[1])) return [];
    angleToCross = angleToCross <= 0 || angleToCross >= Math.PI ? Math.PI / 2 : angleToCross;

    let center = Cartesian3.midpoint(corner[0], corner[1], new Cartesian3());
    const centerCart = this.cartesianToArray(center);
    center = Cartesian3.fromDegrees(centerCart[0], centerCart[1], centerHeight);
    const localSystem = Transforms.eastNorthUpToFixedFrame(center);
    const worldToLocalMatrix = Matrix4.inverse(localSystem, new Matrix4());

    // 投影到XOY平面上
    let localC1 = Matrix4.multiplyByPoint(worldToLocalMatrix, corner[1], new Cartesian3());
    localC1.z = 0;

    const pointC1 = Matrix4.multiplyByPoint(localSystem, localC1, new Cartesian3());
    const pointA1 = Matrix4.multiplyByPoint(localSystem, Cartesian3.negate(localC1, new Cartesian3()), new Cartesian3());

    // fromRotationZ: 逆时针旋转
    const localB1 = Matrix3.multiplyByVector(
        Matrix3.fromRotationZ(-angleToCross, new Matrix3()),
        localC1,
        new Cartesian3()
    );
    const pointB1 = Matrix4.multiplyByPoint(localSystem, localB1, new Cartesian3());
    const pointD1 = Matrix4.multiplyByPoint(localSystem, Cartesian3.negate(localB1, new Cartesian3()), new Cartesian3());

    return [pointA1, pointB1, pointC1, pointD1];
}

/**
 * 获取ol与or的夹角，单位为弧度（正表示顺时针，负则表示逆时针）
 * @private
 * 
 * @param {Cartesian3} origin 射线起点
 * @param {Cartesian3} leftPoint 左侧射线终点
 * @param {Cartesian3} rightPoint 右侧射线终点
 * 
 * @returns {Number}
 */
GeoUtil.getAngleByPoints = function (origin, leftPoint, rightPoint) {
    const { normalZ } = this.getLocalAxisInfo(origin);
    const ol = Cartesian3.subtract(leftPoint, origin, new Cartesian3());
    const or = Cartesian3.subtract(rightPoint, origin, new Cartesian3());
    const oz = Cartesian3.cross(ol, or, new Cartesian3());
    const angle = Cartesian3.angleBetween(ol, or);
    return Cartesian3.dot(oz, normalZ) > 0 ? angle : -angle;
}

/**
 * 获取椭球体的范围
 * @private
 *
 * @param {Cartesian3} center 椭球中心
 * @param {Cartesian3} radii 椭球球径
 * 
 * @returns {Rectangle}
 */
GeoUtil.getRangeByEllipsoid = function (center, radii) {
    const { normalX, normalY } = this.getLocalAxisInfo(center);
    const { x, y } = radii;
    const northEastOffset = Cartesian3.add(
        Cartesian3.multiplyByScalar(normalX, x, new Cartesian3()),
        Cartesian3.multiplyByScalar(normalY, y, new Cartesian3()),
        new Cartesian3()
    );

    return Rectangle.fromCartesianArray([
        Cartesian3.add(
            center,
            northEastOffset,
            new Cartesian3()
        ),
        Cartesian3.subtract(
            center,
            northEastOffset,
            new Cartesian3()
        ),
    ]);
}

/**
 * 设置Entity子对象图形颜色、透明度属性
 * @param {Entity} ientity   Entity图形
 * @param {String} entityType  图形子类型['box', 'ellipse', 'ellipsoid', 'polygon', 'polyline', 'polylineVolume', 'rectangle', 'wall', 'corridor', 'cylinder', 'path', 'plane'],
 ['billboard', 'point','model']
 * @param {Object} [options={}]  配置
 * @param {Number} [options.opacity]  透明度
 * @param {Color} [options.color]  颜色
 * @private
 */
GeoUtil.setEntityColorOpacity = function (ientity, entityType, options = {}) {
    this.entityTypes = [
        ['box', 'ellipse', 'ellipsoid', 'polygon', 'polyline', 'polylineVolume', 'rectangle', 'wall', 'corridor', 'cylinder', 'path', 'plane'],
        ['billboard', 'point', 'model']];//子模型类型集合
    if (this.entityTypes[0].indexOf(entityType) > -1) {
        if (ientity[entityType]) {
            defined(options.color) && (ientity[entityType].material = options.color);
            if (ientity[entityType].material) {
                defined(options.opacity) && (ientity[entityType].material.color = ientity[entityType].material.color.getValue().withAlpha(options.opacity));
            } else {
                defined(options.opacity) && (ientity[entityType].material = Color.WHITE.withAlpha(options.opacity));
            }
        }
    } else if (this.entityTypes[1].indexOf(entityType) > -1) {
        if (ientity[entityType]) {
            defined(options.color) && (ientity[entityType].color = options.color);
            if (ientity[entityType].color) {
                defined(options.opacity) && (ientity[entityType].color = ientity[entityType].color.getValue().withAlpha(options.opacity));
            } else {
                defined(options.opacity) && (ientity[entityType].color = Color.WHITE.withAlpha(options.opacity));
            }
        }
    }
}
/**
 * 遍历设置Entity类型颜色、透明度
 * @param  {Entity} ientity   Entity图形
 * @param {Object} [options={}]  配置
 * @param {Number} [options.opacity]  透明度
 * @param {Color} [options.color]  颜色
 * @private
 */
GeoUtil.setEntityColor = function (entity, options = {}) {
    this.entityTypes = [
        ['box', 'ellipse', 'ellipsoid', 'polygon', 'polyline', 'polylineVolume', 'rectangle', 'wall', 'corridor', 'cylinder', 'path', 'plane'],
        ['billboard', 'point', 'model']];//子模型类型集合
    this.entityTypes.map(ets => {
        ets.map(e => {
            defined(options.color) && GeoUtil.setEntityColorOpacity(entity, e, { color: options.color })
            defined(options.opacity) && GeoUtil.setEntityColorOpacity(entity, e, { opacity: options.opacity })
        })
    })
}


/**
 * 创建贝塞尔曲线
 * @ignore
 * @param {Array<Object>} anchorpoints 包含经纬度坐标的对象，组成的数组
 * @param {Number} pointsAmount 插值点的数量
 * @returns {Array<Object>} 贝塞尔曲线内插的点
 * @example
 *  let points = [{
 *      x: 114,
 *      y: 23
 *  },{
 *      x: 114.5,
 *      y: 23.5
 *  },{
 *      x: 114.6,
 *      y: 23.6
 *  }]
 *  let bsrPoints = BOSGeo.GeoUtil.createBezierPoints(points, 1000);
 */
/* 
GeoUtil.createBezierPoints = function (anchorpoints, pointsAmount) {
    var points = [];
        for (var i = 0; i < pointsAmount; i++) {
            var point = multiPointBezier(anchorpoints, i / pointsAmount);
            points.push(point);
        }
    return points;
}

function multiPointBezier(points, t) {
    var len = points.length;
    var x = 0, y = 0;
    var erxiangshi = function (start, end) {
        var cs = 1, bcs = 1;
        while (end > 0) {
            cs *= start;
            bcs *= end;
            start--;
            end--;
        }
        return (cs / bcs);
    };
    for (var i = 0; i < len; i++) {
        var point = points[i];
        x += point.x * Math.pow((1 - t), (len - 1 - i)) * Math.pow(t, i) * (erxiangshi(len - 1, i));
        y += point.y * Math.pow((1 - t), (len - 1 - i)) * Math.pow(t, i) * (erxiangshi(len - 1, i));
    }
    return { x: x, y: y };
} */

/**
 * 根据旋转前后的向量计算旋转矩阵
 * @private
 * @param {Cartesian3} vectorBefore 
 * @param {Cartesian3} vectorAfter 
 * @returns {Matrix3} 旋转矩阵
 */
GeoUtil.calculateRotateMatrix = (vectorBefore,vectorAfter)=>{
    // 旋转轴
    let axis = Cartesian3.normalize(Cartesian3.cross(vectorBefore, vectorAfter, new Cartesian3()), new Cartesian3());
    // 旋转角度
    let angle = Cartesian3.angleBetween(vectorBefore, vectorAfter);
    // 用罗德里格旋转公式计算旋转矩阵
    let rotatinMatrix = [];

    rotatinMatrix[0] = Math.cos(angle) + axis.x * axis.x * (1 - Math.cos(angle));
    rotatinMatrix[1] = axis.x * axis.y * (1 - Math.cos(angle)) - axis.z * Math.sin(angle);
    rotatinMatrix[2] = axis.y * Math.sin(angle) + axis.x * axis.z * (1 - Math.cos(angle));

    rotatinMatrix[3] = axis.z * Math.sin(angle) + axis.x * axis.y * (1 - Math.cos(angle));
    rotatinMatrix[4] = Math.cos(angle) + axis.y * axis.y * (1 - Math.cos(angle));
    rotatinMatrix[5] = -axis.x * Math.sin(angle) + axis.y * axis.z * (1 - Math.cos(angle));

    rotatinMatrix[6] = -axis.y * Math.sin(angle) + axis.x * axis.z * (1 - Math.cos(angle));
    rotatinMatrix[7] = axis.x * Math.sin(angle) + axis.y * axis.z * (1 - Math.cos(angle));
    rotatinMatrix[8] = Math.cos(angle) + axis.z * axis.z * (1 - Math.cos(angle));

    return Matrix3.fromArray(rotatinMatrix)
}

export default GeoUtil
