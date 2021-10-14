import Cartesian2 from 'cesium/Core/Cartesian2'
import Cartesian3 from 'cesium/Core/Cartesian3'
import Matrix4 from 'cesium/Core/Matrix4'
import Color from 'cesium/Core/Color'
import Transforms from 'cesium/Core/Transforms'
import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import DeveloperError from 'cesium/Core/DeveloperError'
import HeadingPitchRoll from 'cesium/Core/HeadingPitchRoll'
import DistanceDisplayCondition from 'cesium/Core/DistanceDisplayCondition'
import IntersectionTests from 'cesium/Core/IntersectionTests'
import Ray from 'cesium/Core/Ray'
import CesiumMath from "cesium/Core/Math";

import Plane from 'cesium/Core/Plane'
import Event from 'cesium/Core/Event'

import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType'
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler'

import PolylineCollection from 'cesium/Scene/PolylineCollection'
import LabelCollection from 'cesium/Scene/LabelCollection'
import Material from 'cesium/Scene/Material'
import LabelStyle from 'cesium/Scene/LabelStyle'
import VerticalOrigin from 'cesium/Scene/VerticalOrigin'
import CustomDataSource from 'cesium/DataSources/CustomDataSource'

import GeoUtil from '../utils/GeoUtil'
import FeatureType from '../constant/FeatureType'
import {GeoDepository} from '../core/GeoDepository'


/**
 * @ignore
 * @param {*} options 
 * options.model 加载的模型
 * options.x 是否显示x轴
 * options.y 是否显示y轴
 * options.z 是否显示z轴
 * options.color 显示包围盒颜色
 * options.alpha 透明度设置
 * options.outlineColor 轮廓色
 * options.font 字体大小
 */
function MeasureAxis (options) {
    if (!defined(options) || !defined(options.model)) {
        throw new DeveloperError('model 模型必传');
    }
    this._polylines = null;
    this._boxs = null;
    this._labels = null;
    this._boxlabels = null;
    this._model = options.model;
    this._axiScale = options.axiScale || 1;
    this.x = defaultValue(options.x, true);
    this.y = defaultValue(options.y, true);
    this.z = defaultValue(options.z, true);
    this._color = defaultValue(options.color, '#fff');
    this._alpha = defaultValue(options.alpha, 0.3);
    this._outlineColor = defaultValue(options.outlineColor, '#151313cc');
    this._fillcolor = defaultValue(options.fillcolor, '#f10853');
    this._font = defaultValue(options.font, '12px sans-serif');
    this._width = defaultValue(options.width, 10);
    this.layertyle = options.model.featureType;
    this.ratio = options.ratio || 1;
    this._angle = {
        heading: 0,
        pitch: 0,
        roll: 0
};
    this.canMove = false; // 是否可移动
    this.moveType = ''; // 移动类型 x y z 
    this._handler = undefined; //事件监听
    this.moveEvent = new Event();

    this._position = this.layertyle === FeatureType.GLTF ? GeoUtil.modelToparams(this) : GeoUtil.tileToparams(this);

    this.init();
}

/**
 * 初始化
 */
MeasureAxis.prototype.init = function () {
    this._polylines = new PolylineCollection();
    this._boxs = new PolylineCollection();
    this._labels = new LabelCollection();
    this._boxlabels = new LabelCollection();
    
    this._dataSource = new CustomDataSource();
    GeoDepository.viewer.dataSources.add(this._dataSource);
    GeoDepository.viewer.scene.primitives.add(this._polylines);
    GeoDepository.viewer.scene.primitives.add(this._boxs);
    GeoDepository.viewer.scene.primitives.add(this._labels);
    GeoDepository.viewer.scene.primitives.add(this._boxlabels);
}
/**
 * 事件监听绑定
 */
MeasureAxis.prototype.bindEvent = function () {
    if(!this._handler) this._handler = new ScreenSpaceEventHandler(GeoDepository.scene.canvas);
    this.onLeftClick(true);
    this.onMouseMove(true);
    this.onMouseUp(true);
}

/**
 * 显示包围盒
 */
MeasureAxis.prototype.showCube = function () {
    this.remove();

    let center = this._model.boundingSphere.center;
    let radius = this._model.boundingSphere.radius;

    // let point = { 暂时不加标注
    //     position: new Cartesian3(center.x + radius, center.y, center.z),
    //     point: {
    //         pixelSize: 0.05,
    //         color: Color.RED,
    //         outlineColor: Color.TRANSPARENT,
    //         outlineWidth: 1,
    //         scaleByDistance: 30000,
    //         distanceDisplayCondition: new DistanceDisplayCondition(0, 30000),
    //         // disableDepthTestDistance: this.displayDistance, // 会影响鼠标滚轮事件的触发
    //     }
    // }

    let box = {
        name : 'Red box with black outline',
        position: center,
        box : {
            dimensions : new Cartesian3(radius, radius, radius),
            material : Color.fromCssColorString(this._color).withAlpha(this._alpha),
            outline : true, //显示轮廓
            outlineColor : Color.fromCssColorString(this._outlineColor)
        },
        featureType: FeatureType.BOX
    };
    this._dataSource.entities.add(box);
    // this._dataSource.entities.add(point);
}

/**
 * 显示包围盒
 */
MeasureAxis.prototype.showBox = function (){
    
    let postion = this._position;
    
    let positions = GeoUtil.getBoundingPoints(center, radius / 2);
    let lines = []; //  positions.slice();
    for (let i = 0; i < positions.length; i++) {
        this.showPointlnglat(positions[i]);
        let newpos = new Cartesian3(positions[i].x, positions[i].y, positions[i].z + radius);
        let midVal = {};
        let  midH = Cartesian3.midpoint(positions[i], newpos, midVal)
        this.showPointlnglat(newpos);
        this.showPointlnglat(midH);
        lines.push(newpos);
        // 添加底部中点
        if (i > 0) {
            let mid = {};
            let midup = {};
            let index = i - 1;
            let midpos = Cartesian3.midpoint(positions[index], positions[i], mid)
            let midposup = Cartesian3.midpoint(lines[index], lines[i], midup)
            this.showPointlnglat(midpos);
            this.showPointlnglat(midposup);
        }

        this._boxs.add({
            positions: [positions[i], newpos],
            id: 'box' + i,
            width: this._width,
            material: new Material({
                fabric: {
                    type: 'Color',
                    uniforms: {
                        color: Color.fromCssColorString(this._color)
                    }
                }
            }),
            followSurface: true
        });
    }
    // 添加首尾中间点
    let midspos = {};
    let midsup = {};
    let startend = Cartesian3.midpoint(positions[0], positions[3], midspos)
    let startendup = Cartesian3.midpoint(lines[0], lines[3], midsup)
    this.showPointlnglat(startend);
    this.showPointlnglat(startendup);
    // 绘制顶部
    lines.push(lines[0]);
    this._boxs.add({
        positions: lines,
        id: 'box',
        width: this._width,
        material: new Material({
            fabric: {
                type: 'Color',
                uniforms: {
                    color: Color.fromCssColorString(this._color)
                }
            }
        }),
        followSurface: true
    });
    // 绘制底部
    positions.push(positions[0]);
    this._boxs.add({
        positions: positions,
        id: 'box',
        width: this._width,
        material: new Material({
            fabric: {
                type: 'Color',
                uniforms: {
                    color: Color.fromCssColorString(this._color)
                }
            }
        }),
        followSurface: true
    });
}
/**
 * 显示点的经纬度
 * @param {*} point 
 */
MeasureAxis.prototype.showPointlnglat = function (point) {
    let lonlat = GeoUtil.cartasian2degress(point);
    this._boxlabels.add({
        position: point,
        text: '{' + lonlat.lon.toFixed(3) + ',' + lonlat.lat.toFixed(3) + ',' + (+lonlat.height.toFixed(3)) + '}',
        font: this._font,
        style: LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 0,
        verticalOrigin: VerticalOrigin.BOTTOM,
        fillColor: Color.fromCssColorString(this._fillcolor),
        pixelOffset: new Cartesian2(-10, -10)
    });
}

/**
* 显示坐标轴
*/
MeasureAxis.prototype.showAxis = function () {

    this.bindEvent();
    let postion = this._position;
    this.remove();
    postion.radius = postion.radius * this._axiScale;
   let positionx = new Cartesian3(-postion.radius, 0, 0);
   let positiony = new Cartesian3(0, -postion.radius, 0);
   let positionz = new Cartesian3(0, 0, -postion.radius);
   let rollRadius = postion.radius / 2;
   let posx = new Cartesian3(0 + postion.radius, 0, 0);
   let posy = new Cartesian3(0, 0 + postion.radius, 0);
   let posz = new Cartesian3(0, 0, 0 + postion.radius);
   this.x && this._polylines.add({
       positions: [positionx, posx],
       id: 'movemodel_x',
       width: 20,
       followSurface: true
   });
   this.y && this._polylines.add({
       positions: [positiony, posy],
       id: 'movemodel_y',
       width: 20,
       followSurface: true
   });
   this.z && this._polylines.add({
       positions: [positionz, posz],
       id: 'movemodel_z',
       width: 20,
       followSurface: true
   });
   // heading line
   this._polylines.add({
       positions: this.drawRadius(90, -rollRadius, -rollRadius, 'x'),
       id: 'movemodel_heading',
       width: this._width,
       material: new Material({
        fabric: {
            type: 'Color',
            uniforms: {
                color: Color.RED
            }
        }
    }),
       followSurface: true
   });
   // pitch line
   this._polylines.add({
       positions: this.drawRadius(90, -rollRadius, -rollRadius, 'y'),
       id: 'movemodel_pitch',
       width: this._width,
       material: new Material({
        fabric: {
            type: 'Color',
            uniforms: {
                color: Color.BLUE
            }
        }
    }),
       followSurface: true
   });
   // roll line
   this._polylines.add({
       positions: this.drawRadius(90, -rollRadius, -rollRadius, 'z'),
       id: 'movemodel_roll',
       width: this._width,
       material: new Material({
        fabric: {
            type: 'Color',
            uniforms: {
                color: Color.GREEN
            }
        }
    }),
       followSurface: true
   });

   this.x &&  this._labels.add({
       position: posx,
       text: 'X',
       font: '20px sans-serif',
       style: LabelStyle.FILL_AND_OUTLINE,
       outlineWidth: 0,
       verticalOrigin: VerticalOrigin.BOTTOM,
       fillColor: Color.RED,
       pixelOffset: new Cartesian2(-10, -10)
   });
   this.y && this._labels.add({
       position: posy,
       text: 'Y',
       font: '20px sans-serif',
       style: LabelStyle.FILL_AND_OUTLINE,
       outlineWidth: 0,
       verticalOrigin: VerticalOrigin.BOTTOM,
       fillColor: Color.GREEN,
       pixelOffset: new Cartesian2(-10, -10)
   });
   this.z && this._labels.add({
       position: posz,
       text: 'Z',
       font: '20px sans-serif',
       style: LabelStyle.FILL_AND_OUTLINE,
       outlineWidth: 0,
       verticalOrigin: VerticalOrigin.BOTTOM,
       fillColor: Color.BLUE,
       pixelOffset: new Cartesian2(-5, -10)
   });
   let count1 = this._polylines.length;
   for (let i = 0; i < count1; ++i) {
       let p = this._polylines.get(i);
       if (p.id === 'movemodel_x') {
           p.material = new Material({
               fabric: {
                   type: 'PolylineArrow',
                   uniforms: {
                       color: Color.RED
                   }
               }
           });
           p.originalColorValue = Color.RED;
       } else if (p.id === 'movemodel_y') {
           p.material = new Material({
               fabric: {
                   type: 'PolylineArrow',
                   uniforms: {
                       color: Color.GREEN
                   }
               }
           });
           p.originalColorValue = Color.GREEN;
       } else if (p.id === 'movemodel_z') {
           p.material = new Material({
               fabric: {
                   type: 'PolylineArrow',
                   uniforms: {
                       color: Color.BLUE
                   }
               }
           });
           p.originalColorValue = Color.BLUE;
       }
   }

   let lon = Number(postion.lon);
   let lat =  Number(postion.lat);
   let height = Number(postion.height);
   let heading = Number(postion.heading || 0);
   if (this.layertyle === FeatureType.TILES || this.layertyle === FeatureType.BIM) {
    this._polylines.modelMatrix = GeoUtil.getTileMatrix4(lon, lat, height + postion.radius * this.ratio, heading);
   } else if (this.layertyle === FeatureType.GLTF) {
       this._polylines.modelMatrix = Transforms.headingPitchRollToFixedFrame(Cartesian3.fromDegrees(lon, lat, height), new HeadingPitchRoll(CesiumMath.toRadians(heading), 0, 0));
   }
   this._labels.modelMatrix = this._polylines.modelMatrix;

   
};
/**
 * 
 * @param {*} len 圆弧的长度
 * @param {*} cosRadius 轴半径
 * @param {*} sinRadius 轴半径
 */
MeasureAxis.prototype.drawRadius = function (len, cosRadius, sinRadius, type) {
    let lines = [];
    for (let l = 0; l <= len; l += 10) {
        switch(type) {
            case 'x':
                lines.push(new Cartesian3(cosRadius * Math.cos((len -l) * 3.1415926 / 180), sinRadius * Math.sin((len -l) * 3.1415926 / 180), 0));
                break;
            case 'y':
                lines.push(new Cartesian3(0, cosRadius * Math.cos((len -l) * 3.1415926 / 180), sinRadius * Math.sin((len -l) * 3.1415926 / 180)));
                break;
            case 'z':
                lines.push(new Cartesian3(cosRadius * Math.cos((len -l) * 3.1415926 / 180), 0, sinRadius * Math.sin((len -l) * 3.1415926 / 180)));
                break;
            default:
                break;
        }
        
    }
    return lines;
}

/**
 * 相机控制
 * @param isCamera
 */
MeasureAxis.prototype.cameraControl = function (isCamera) {
    GeoDepository.scene.screenSpaceCameraController.enableRotate = isCamera;
    GeoDepository.scene.screenSpaceCameraController.enableTranslate = isCamera;
    GeoDepository.scene.screenSpaceCameraController.enableZoom = isCamera;
    GeoDepository.scene.screenSpaceCameraController.enableTilt = isCamera;
    GeoDepository.scene.screenSpaceCameraController.enableLook = isCamera;
}

/**
 * 点击坐标轴移动模型
 */
MeasureAxis.prototype.onLeftClick = function (active) {
    let that = this;
    if (active) {
        this._handler.setInputAction( (e) => {
            let pick = GeoDepository.scene.pick(e.position);
        if (!pick || !pick.id) return;

        // todo 改变轴形状
        switch(pick.id) {
            case 'movemodel_x':
                that.canMove = true;
                that.moveType = 'x';
                break;
            case 'movemodel_y':
                that.canMove = true;
                that.moveType = 'y';
                break;
            case 'movemodel_z':
                that.canMove = true;
                that.moveType = 'z';
                break;
            case 'movemodel_heading':
                that.canMove = true;
                that.moveType = 'heading';
                break;
            case 'movemodel_pitch':
                that.canMove = true;
                that.moveType = 'pitch';
                break;
            case 'movemodel_roll':
                that.canMove = true;
                that.moveType = 'roll';
                break;
        }
        }, ScreenSpaceEventType.LEFT_DOWN);
    } else {
        this._eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOWN);
    }
}

/**
 * 鼠标离开坐标轴
 */
MeasureAxis.prototype.onMouseUp = function (active) {
    let that = this;
    if (active) {
        this._handler.setInputAction( () => {
            that.canMove && that.cameraControl(true);
            that.canMove = false;
        }, ScreenSpaceEventType.LEFT_UP);
    } else {
        this._eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_UP);
    }
}

/**
 * 鼠标按下时监听鼠标移动
 */
MeasureAxis.prototype.onMouseMove = function (active) {
    
    let that = this;
    if (active) {
        this._handler.setInputAction( (e) => {
            if (!that.canMove) return;
    
        let startCartesian3 = GeoDepository.scene.pickPosition(e.startPosition);
        let endCartesian3 = GeoDepository.scene.pickPosition(e.endPosition);
    
        if (!endCartesian3) {
            that.canMove = false;
            that.cameraControl(false);
            return;
        }
    
        if (e.endPosition.x === 0) GeoDepository.camera.moveLeft(30);
        if (e.endPosition.y === 0) GeoDepository.camera.moveUp(30);
    
        that.cameraControl(false);

    
        let m = that._model.modelMatrix;
        let notChangeAxis1 = '', notChangeAxis2 = '', plane = {}, showPosition = {}, angle = {
            heading: 0,
            pitch: 0,
            roll: 0,
            flag: false
        }, signal = e.endPosition.x - e.startPosition.x;
        switch(that.moveType) {
            case 'x':
                notChangeAxis1 = 'y';
                notChangeAxis2 = 'z';
                plane = Cartesian3.UNIT_Z;
                break;
            case 'y':
                notChangeAxis1 = 'x';
                notChangeAxis2 = 'z';
                plane = Cartesian3.UNIT_Z;
                break;
            case 'z':
                notChangeAxis1 = 'x';
                notChangeAxis2 = 'y';
                plane = Cartesian3.UNIT_Y;
                break;
            case 'heading':
                angle.heading = signal >= 0 ? 1 : -1;
                angle.flag = true;
                break;
            case 'pitch':
                angle.pitch = signal >= 0 ? 1 : -1;
                angle.flag = true;
                break;
            case 'roll':
                angle.roll = signal >= 0 ? 1 : -1;
                angle.flag = true;
                break;
        }
        // 只是改变角度
        if (angle.flag) {
            showPosition = GeoUtil.tileToparams(that._model.modelMatrix);
            this._angle.heading += angle.heading;
            this._angle.pitch += angle.pitch;
            this._angle.roll += angle.roll;
            this._angle.heading = this.normalize(this._angle.heading);
            this._angle.pitch = this.normalize(this._angle.pitch);
            this._angle.roll = this.normalize(this._angle.roll);
            showPosition.heading = this._angle.heading;
            showPosition.pitch = this._angle.pitch;
            showPosition.roll = this._angle.roll;
            GeoUtil.setTilesetMatrix(that._model.modelMatrix, [showPosition.lon, showPosition.lat, showPosition.height], [
                showPosition.heading, showPosition.pitch, showPosition.roll
            ]);
        } else {
            if (!startCartesian3 || !endCartesian3) return;
            let axism = that.axisMove(that._polylines.modelMatrix, plane, notChangeAxis1, notChangeAxis2, startCartesian3,  endCartesian3);
            if (!axism) {
                that.canMove = false;
                that.cameraControl(true);
            }
            
            m = that.axisMove(m, plane, notChangeAxis1, notChangeAxis2, startCartesian3,  endCartesian3);
            if (!m) {
                that.canMove = false;
                that.cameraControl(true);
            }
        
            if (typeof axism === 'object') {
                that._polylines.modelMatrix = axism;
                that._labels.modelMatrix = axism;
            }

            if (typeof m === 'object') {
                that._model.modelMatrix = m;
                showPosition = GeoUtil.tileToparams(m);
            }
        }
        
        that.moveEvent.raiseEvent(showPosition);
        }, ScreenSpaceEventType.MOUSE_MOVE);
    } else {
        this._eventHandler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
    }
}
/**
 * 移动坐标轴
 */
MeasureAxis.prototype.axisMove = function (m, surface, zeroAxis1, zeroAxis2, startCartesian3, endCartesian3) {
    let point = this.axisTransForm(m, surface, startCartesian3, endCartesian3);
    // 两点差值
    if (point.end && point.start) {
        let sub = Cartesian3.subtract(point.end, point.start, new Cartesian3());
        sub[zeroAxis1] = 0;
        sub[zeroAxis2] = 0;
        let sub2 = Matrix4.multiplyByPoint(m, sub, new Cartesian3());
        // 移动模型
        m[12] = sub2.x;
        m[13] = sub2.y;
        m[14] = sub2.z;
        return m;
    }
    return false;
};
/**
 * 获取视线与面的交点
 * @param {*} m 
 * @param {*} surface 
 * @param {*} startCartesian3 
 * @param {*} endCartesian3 
 */
MeasureAxis.prototype.axisTransForm = function (m, surface, startCartesian3, endCartesian3) {
    var matrix = Matrix4.inverseTransformation(m, new Matrix4());
    // 获取相机坐标
    var camera1 = GeoDepository.camera.position;
    // 转模型坐标
    var camera = Matrix4.multiplyByPoint(matrix, camera1, new Cartesian3());
    var startM = Matrix4.multiplyByPoint(matrix, startCartesian3, new Cartesian3());
    var endM = Matrix4.multiplyByPoint(matrix, endCartesian3, new Cartesian3());
    // 从相机看模型的方向
    var startDirection = Cartesian3.normalize(Cartesian3.subtract(startM, camera, new Cartesian3()), new Cartesian3());
    var endDirection = Cartesian3.normalize(Cartesian3.subtract(endM, camera, new Cartesian3()), new Cartesian3());
    // 面
    var plane = Plane.fromPointNormal(Cartesian3.ZERO, surface);
    // 射线
    var startRay = new Ray(camera, startDirection);
    var endRay = new Ray(camera, endDirection);
    // 射线和面交点
    var start = IntersectionTests.rayPlane(startRay, plane);
    var end = IntersectionTests.rayPlane(endRay, plane);
    return {start: start, end: end};
};
/**
 * 检验数值合格性
 */
MeasureAxis.prototype.normalize = function (val) {
    return val >= 180 ? 0 : val <= -180 ? 0 : val;
}

/**
 * 事件监听
 */
MeasureAxis.prototype.on = function (type, callback) {
    switch(type) {
        case 'mousemove':
            this.moveEvent.addEventListener(callback);
        break;
    }
}
/**
 * 移除
 */
MeasureAxis.prototype.remove  = function () {
    this._polylines.removeAll();
    this._labels.removeAll();
    this._boxs.removeAll();
    this._boxlabels.removeAll();
    // this._polylines = null;
    // this._boxs = null;
    // this._labels = null;
    // this._boxlabels = null;
    // this._cube = null;
}
/**
 * 移除包围盒
 */
MeasureAxis.prototype.removeBox = function () {
    this._boxs.removeAll();
    this._boxlabels.removeAll();
    // this._boxs = null;
    // this._boxlabels = null;
}

MeasureAxis.prototype.removeCube = function () {
    this._dataSource.entities.removeAll();
}
/**
 * 移除坐标轴
 */
MeasureAxis.prototype.removeAxis = function () {
    this._polylines.removeAll();
    this._labels.removeAll();
    
    this.onLeftClick(false);
    this.onMouseMove(false);
    this.onMouseUp(false);
    // this._polylines = null;
    // this._labels = null;
}

export default MeasureAxis;