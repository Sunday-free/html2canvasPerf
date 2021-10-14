import ScreenSpaceEventHandler from "cesium/Core/ScreenSpaceEventHandler";
import ScreenSpaceEventType from "cesium/Core/ScreenSpaceEventType";
import defined from "cesium/Core/defined";
import CesiumMath from "cesium/Core/Math";
import PolylineGlowMaterialProperty from "cesium/DataSources/PolylineGlowMaterialProperty";
import Color from "cesium/Core/Color";
import Cartesian2 from "cesium/Core/Cartesian2";
import Cartesian3 from "cesium/Core/Cartesian3";
import PolygonHierarchy from "cesium/Core/PolygonHierarchy";
import defaultValue from "../../../cesium/Source/Core/defaultValue";
import Util from "../utils/Util";
import GeoUtil from "../utils/GeoUtil";
import ClassificationType from "cesium/Scene/ClassificationType";
import PolylineDashMaterialProperty from "cesium/DataSources/PolylineDashMaterialProperty";
import buildModuleUrl from "cesium/Core/buildModuleUrl";
import HorizontalOrigin from "cesium/Scene/HorizontalOrigin";
import HeightReference from "cesium/Scene/HeightReference";
import Matrix3 from "cesium/Core/Matrix3";
import Matrix4 from "cesium/Core/Matrix4";
import Billboard from 'cesium/Scene/Billboard';
import Transforms from "cesium/Core/Transforms";
import * as turf from "@turf/turf";
import LabelPlot from "../common/LabelPlot";

/**
 * 测量工具,可实现距离、高度、面积和三角测量
 * @alias MeasureTools
 * @constructor
 * @param {GeoMap} geomap GeoMap对象
 * @example
 * var measureTool = new BOSGeo.MeasureTools(geomap);
 */
class MeasureTools {
    /**
     * @param geomap
     */
    constructor(geomap) {
        this.geomap = geomap;
        this.viewer = geomap.viewer;

        this.positions = []; //三维笛卡尔坐标数组

        this.dragIcon = buildModuleUrl("resource/images/circle_center.png");

        this.distanceDic = {}; //记录所有的距离

        this.areaDic = {}; //记录所有的面积

        this.heightDic = {}; //记录所有的测高

        this.TriDic = {}; //记录三角测量
        this.entityList = [];
        //记录LabelPlot 每个为对象 对象的key是entity的id 值是label数组
        this.labelPlotList = { };
        this._mouseMovingIcon = `url(${buildModuleUrl("resource/images/cursor_move_measure.png")}),auto`//开始测量鼠标移动的样式
    }

    /**
     * 绘制距离
     * @param {Object} options 包含以下参数的Object对象
     * @param {Color} [options.color] 线颜色 默认皇家蓝
     * @param {Number} [options.width] 线宽 默认1.0
     * @param {Number} [options.opacity] 线透明度 默认1.0
     * @param {Boolean} [options.clampToGround] 是否贴地 默认false
     * @param {Function} [okHandler] 绘制成功后的回调
     * @param {Function} [cancelHandler] 选点不足2个右键取消绘制后的回调
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.drawDistance(options, okHandler);
     */
    drawDistance(options, okHandler,cancelHandler) {
        this.viewer.container.style.cursor = this._mouseMovingIcon;
        if (!defined(this.drawHandler)) {
            this.drawHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        }
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        options.color = defaultValue(options.color, Color.ROYALBLUE);
        options.width = defaultValue(options.width, 1.0);
        options.opacity = defaultValue(options.opacity, 1.0);
        options.clampToGround = defaultValue(options.clampToGround, false);
        let objId = new Date().getTime();

        options.id = objId;

        let that = this;
        this.positions = [];
        let scene = this.viewer.scene;
        let tmpPolyline = undefined;
        let tmpLabel = undefined;
        //左键DOWN事件
        this.drawHandler.setInputAction(function (event) {
            let position = event.position;
            if (!defined(position)) {
                return;
            }

            let pickedPosition = scene.pickPosition(position);
            if (defined(pickedPosition)) {
                if (that.positions.length == 0) {
                    that.positions.push(pickedPosition);
                    //需要显示距离标签
                    [tmpPolyline, tmpLabel] = that._showPolyline2Map(options);
                }
                that.positions.push(pickedPosition);
                that.addPoint(pickedPosition, options);
            }
        }, ScreenSpaceEventType.LEFT_DOWN);
        //鼠标移动事件
        this.drawHandler.setInputAction(function (event) {
            let position = event.endPosition;
            let num = that.positions.length;
            if (!defined(position) || num < 1) {
                return;
            }

            let pickedPosition = scene.pickPosition(position);
            if (defined(pickedPosition)) {
                that.positions.pop();
                that.positions.push(pickedPosition);

                tmpPolyline.polyline.positions = that.positions;
                tmpLabel.position = that.positions[that.positions.length - 1];
                tmpLabel.text = that.calcDistance();

                that.geomap.render();
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);
        //右击事件
        this.drawHandler.setInputAction(function (event) {
            if (that.positions.length < 3) {
                that.clear();
                that.clearEntityById(objId);
                that.geomap.render();
                if (defined(cancelHandler)) {
                    cancelHandler();
                }
                return;
            }
            that.positions.pop();

            //记录位置信息
            that.distanceDic[objId] = that.positions;

            tmpPolyline.polyline.positions = that.positions;

            tmpLabel.position = that.positions[that.positions.length - 1];
            tmpLabel.text = that.calcDistance();
            that.geomap.render();

            that.clear();

            if (defined(okHandler)) {
                okHandler(options);
            }
        }, ScreenSpaceEventType.RIGHT_CLICK);
    }

    /**
     * 清除距离绘制
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.clearDistance();
     */
    clearDistance() {
        this.clear(); //清除监听
        for (const key in this.distanceDic) {
            this.clearEntityById(key);
        }
        this.geomap.render();
    }

    /**
     * 绘制面积
     * @param {Object} options 包含以下参数的Object对象
     * @param {Color} [options.color] 面颜色 默认皇家蓝
     * @param {Number} [options.opacity] 面透明度 默认0.5
     * @param {Function} [okHandler] 绘制成功后的回调
     * @param {Function} [cancelHandler] 选点不足2个右键取消绘制后的回调
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.drawArea(options, okHandler,cancelHandler);
     */
    drawArea(options, okHandler,cancelHandler) {
        this.viewer.container.style.cursor = this._mouseMovingIcon;
        if (!defined(this.drawHandler)) {
            this.drawHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        }
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        options.color = defaultValue(options.color, Color.ROYALBLUE);
        options.opacity = defaultValue(options.opacity, 0.5);
        options.clampToGround = defaultValue(options.clampToGround, false);
        let objId = new Date().getTime();
        options.id = objId;
        let that = this;

        this.positions = [];
        let scene = this.viewer.scene;
        let tmpPolygon = undefined;
        let tmpLabel = undefined;
        this.drawHandler.setInputAction(function (event) {
            let position = event.position;
            if (!defined(position)) {
                return;
            }

            let pickedPosition = scene.pickPosition(position);
            if (defined(pickedPosition)) {
                if (that.positions.length == 0) {
                    that.positions.push(pickedPosition);
                    [tmpPolygon, tmpLabel] = that._showPolygon2Map(options);
                }
                that.positions.push(pickedPosition);
                that.addPoint(pickedPosition, options);
            }
        }, ScreenSpaceEventType.LEFT_DOWN);

        this.drawHandler.setInputAction(function (event) {
            let position = event.endPosition;
            let num = that.positions.length;
            if (!defined(position) || num < 1) {
                return;
            }

            let pickedPosition = scene.pickPosition(position);
            if (defined(pickedPosition)) {
                that.positions.pop();
                that.positions.push(pickedPosition);

                tmpPolygon.polyline.positions = that.positions;
                tmpPolygon.polygon.hierarchy = new PolygonHierarchy(that.positions);

                if(that.positions.length > 2){
                    tmpLabel.position = that.positions[that.positions.length - 1];
                    tmpLabel.text = that.calcArea();
                }

                that.geomap.render();
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        this.drawHandler.setInputAction(function (event) {
            if (that.positions.length <= 3) {
                that.clear();
                that.clearEntityById(objId);
                that.geomap.render();
                if (defined(cancelHandler)) {
                    cancelHandler();
                }
                return;
            }
            that.positions.pop();

            //记录位置信息
            that.areaDic[objId] = that.positions;
            let pts = [...that.positions];
            pts.push(pts[0]);
            tmpPolygon.polyline.positions = pts;

            tmpPolygon.polygon.hierarchy = new PolygonHierarchy(that.positions);

            tmpLabel.position = that.positions[that.positions.length - 1];
            tmpLabel.text = that.calcArea();

            that.geomap.render();

            that.clear();

            if (defined(okHandler)) {
                okHandler(options);
            }
        }, ScreenSpaceEventType.RIGHT_CLICK);
    }

    /**
     * 清除面积绘制
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.clearArea();
     */
    clearArea() {
        this.clear(); //清除监听
        for (const key in this.areaDic) {
            this.clearEntityById(key);
        }
        this.geomap.render();
    }

    /**
     * 测高
     * @param {Object} options 包含以下参数的Object对象
     * @param {Color} [options.color] 线颜色 默认皇家蓝
     * @param {Number} [options.opacity] 线透明度 默认1.0
     * @param {Function} [okHandler] 绘制成功后的回调
     * @param {Function} [cancelHandler] 选点不足2个右键取消绘制后的回调
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.drawHeight(options, okHandler);
     */
    drawHeight(options, okHandler,cancelHandler) {
        this.viewer.container.style.cursor = this._mouseMovingIcon;
        if (!defined(this.drawHandler)) {
            this.drawHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        }
        let that = this;
        let scene = this.viewer.scene;
        let ellipsoid = scene.globe.ellipsoid;
        let objId = new Date().getTime();
        options.id = objId;

        this.positions = [];
        let lineA, lineB, lineC;
        let labelA, labelB, labelC;
        this.drawHandler.setInputAction(function (event) {
            let position = event.position;
            if (!defined(position)) {
                return;
            }
            let pickedPosition = scene.pickPosition(position);
            if (defined(pickedPosition)) {
                //测高
                if (that.positions.length == 0) {
                    [lineA, lineB, lineC, labelA, labelB, labelC] = that._showHeight2Map(options);
                    that.positions.push(pickedPosition);
                }
                if (that.positions.length == 2) {
                    that.heightDic[objId] = that.positions;

                    that.geomap.render();

                    that.clear();

                    if (defined(okHandler)) {
                        okHandler(options);
                    }
                }

                that.positions.push(pickedPosition);
                that.addPoint(pickedPosition, options);
            }
        }, ScreenSpaceEventType.LEFT_DOWN);

        this.drawHandler.setInputAction(function (event) {
            let position = event.endPosition;
            let num = that.positions.length;
            if (!defined(position) || num < 1) {
                return;
            }
            let pickedPosition = scene.pickPosition(position);
            if (defined(pickedPosition)) {
                that.positions.pop();
                that.positions.push(pickedPosition);

                let car1 = Util.cartesianToDegrees(ellipsoid, that.positions[0]);
                let car2 = Util.cartesianToDegrees(ellipsoid, that.positions[1]);
                let h_max = car1.z > car2.z ? car1 : car2;
                let h_min = car1.z < car2.z ? car1 : car2;
                let foot = Cartesian3.fromDegrees(h_max.x, h_max.y, h_min.z);

                lineA.polyline.positions = that.positions;
                lineB.polyline.positions = [Cartesian3.fromDegrees(h_max.x, h_max.y, h_max.z), foot];
                lineC.polyline.positions = [Cartesian3.fromDegrees(h_min.x, h_min.y, h_min.z), foot];

                labelA.position = that.computeCenter(that.positions[0], that.positions[1]);
                let disA = Cartesian3.distance(that.positions[0], that.positions[1]);
                let distanceA = disA > 1000 ? (disA / 1000).toFixed(2) + "km" : disA.toFixed(2) + "m";
                labelA.text = "空间距离：" + distanceA;

                labelB.position = that.computeCenter(Cartesian3.fromDegrees(h_max.x, h_max.y, h_max.z), foot);
                let disB = Cartesian3.distance(Cartesian3.fromDegrees(h_max.x, h_max.y, h_max.z), foot);
                let distanceB = disB > 1000 ? (disB / 1000).toFixed(2) + "km" : disB.toFixed(2) + "m";
                labelB.text = "垂直高度：" + distanceB;

                labelC.position = that.computeCenter(Cartesian3.fromDegrees(h_min.x, h_min.y, h_min.z), foot);
                let disC = Cartesian3.distance(Cartesian3.fromDegrees(h_min.x, h_min.y, h_min.z), foot);
                let distanceC = disC > 1000 ? (disC / 1000).toFixed(2) + "km" : disC.toFixed(2) + "m";
                labelC.text = "水平距离：" + distanceC;

                that.geomap.render();
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        //右击事件
        this.drawHandler.setInputAction(function (event) {
            that.clear();
            that.clearEntityById(objId);
            that.geomap.render();
            if (defined(cancelHandler)) {
                cancelHandler();
            }
        }, ScreenSpaceEventType.RIGHT_CLICK);
    }

    /**
     * 清除测高绘制
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.clearHeight();
     */
    clearHeight() {
        this.clear(); //清除监听
        for (const key in this.heightDic) {
            this.clearEntityById(key);
        }
        this.geomap.render();
    }

    /**
     * 三角测量
     * @param {Object} options 包含以下参数的Object对象
     * @param {Color} [options.color] 线颜色 默认皇家蓝
     * @param {Number} [options.opacity] 线透明度 默认1.0
     * @param {Function} okHandler 绘制成功后的回调
     * @param {Function} [cancelHandler] 选点不足3个右键取消绘制后的回调
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.drawTri(options, okHandler);
     */
    drawTri(options, okHandler,cancelHandler) {
        this.viewer.container.style.cursor = this._mouseMovingIcon;
        if (!defined(this.drawHandler)) {
            this.drawHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        }
        let that = this;
        let scene = this.viewer.scene;
        let ellipsoid = scene.globe.ellipsoid;
        let objId = new Date().getTime();
        options.id = objId;

        this.positions = [];
        let lineA, lineB, lineC;
        let labelA, labelB, labelC;
        this.drawHandler.setInputAction(function (event) {
            let position = event.position;
            if (!defined(position)) {
                return;
            }
            let pickedPosition = scene.pickPosition(position);
            if (defined(pickedPosition)) {
                //测高
                if (that.positions.length == 0) {
                    [lineA, lineB, lineC, labelA, labelB, labelC] = that._showTri2Map(options);
                    that.positions.push(pickedPosition);
                }
                if (that.positions.length == 3) {
                    that.TriDic[objId] = that.positions;

                    //显示角度标签
                    that.drawArc(options);

                    that.geomap.render();

                    that.clear();

                    if (defined(okHandler)) {
                        okHandler(options);
                    }
                }

                that.positions.push(pickedPosition);
                that.addPoint(pickedPosition, options);
            }
        }, ScreenSpaceEventType.LEFT_DOWN);

        this.drawHandler.setInputAction(function (event) {
            let position = event.endPosition;
            let num = that.positions.length;
            if (!defined(position) || num < 1) {
                return;
            }
            let pickedPosition = scene.pickPosition(position);
            if (defined(pickedPosition)) {
                that.positions.pop();
                that.positions.push(pickedPosition);

                lineA.polyline.positions = [that.positions[0], that.positions[1]];

                labelA.position = that.computeCenter(that.positions[0], that.positions[1]);
                let disA = Cartesian3.distance(that.positions[0], that.positions[1]);
                let distanceA = disA > 1000 ? (disA / 1000).toFixed(2) + "km" : disA.toFixed(2) + "m";
                labelA.text = distanceA;

                if (num > 2) {
                    lineB.polyline.positions = [that.positions[0], that.positions[2]];
                    lineC.polyline.positions = [that.positions[1], that.positions[2]];

                    labelB.position = that.computeCenter(that.positions[0], that.positions[2]);
                    let disB = Cartesian3.distance(that.positions[0], that.positions[2]);
                    let distanceB = disB > 1000 ? (disB / 1000).toFixed(2) + "km" : disB.toFixed(2) + "m";
                    labelB.text = distanceB;

                    labelC.position = that.computeCenter(that.positions[1], that.positions[2]);
                    let disC = Cartesian3.distance(that.positions[1], that.positions[2]);
                    let distanceC = disC > 1000 ? (disC / 1000).toFixed(2) + "km" : disC.toFixed(2) + "m";
                    labelC.text = distanceC;
                }

                that.geomap.render();
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        //右击事件
        this.drawHandler.setInputAction(function (event) {
            that.clear();
            that.clearEntityById(objId);
            that.geomap.render();
            if (defined(cancelHandler)) {
                cancelHandler();
            }
        }, ScreenSpaceEventType.RIGHT_CLICK);
    }

    /**
     * 绘制三角测量
     * @param {Object} options 属性信息
     * @param {Color} [options.color] 线颜色 默认皇家蓝
     * @param {Number} [options.opacity] 线透明度 默认1.0
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.drawArc(options);
     */
    drawArc(options) {
        let color = defaultValue(options.color, Color.ROYALBLUE); //线的颜色
        let opacity = defaultValue(options.opacity, 1.0); //线的透明度
        let material = color.withAlpha(opacity);

        // 计算positions[1]到对角边的 1/6长度
        let center = this.computeCenter(this.positions[0], this.positions[2]);
        let AD = Cartesian3.subtract(center, this.positions[1], new Cartesian3());
        let dis = Cartesian3.magnitude(AD) / 6;

        // 计算弧线：A、C取边10作为弧点
        let lineAVec = Cartesian3.subtract(this.positions[0], this.positions[1], new Cartesian3());
        lineAVec = Cartesian3.normalize(lineAVec, new Cartesian3());

        let lineCVec = Cartesian3.subtract(this.positions[2], this.positions[1], new Cartesian3());
        lineCVec = Cartesian3.normalize(lineCVec, new Cartesian3());

        let arcCenter = GeoUtil.cartasian2degress(this.positions[1]);

        // 求A、C与ENU的x轴夹角
        const { normalX, normalY, normalZ } = GeoUtil.getLocalAxisInfo(this.positions[1]);

        // 如果三个点同一高度不需要求旋转矩阵
        let pos0 = GeoUtil.cartasian2degress(this.positions[0]);
        let pos1 = GeoUtil.cartasian2degress(this.positions[1]);
        let pos2 = GeoUtil.cartasian2degress(this.positions[2]);
        let flag = parseInt(pos0.height) === parseInt(pos1.height) && parseInt(pos0.height) === parseInt(pos2.height);

        // 旋转矩阵和逆矩阵
        let tranfMInverse, tranfM;

        // 将旋转后的点 还原
        function recoverByMartrix(pos, orgin, dis, tranfMInverse) {
            let temp = Cartesian3.subtract(pos, orgin, new Cartesian3());
            temp = Cartesian3.normalize(temp, new Cartesian3());
            pos = Cartesian3.multiplyByScalar(temp, dis, new Cartesian3());
            pos = Matrix4.multiplyByPoint(tranfMInverse, pos, new Cartesian3());
            pos = Cartesian3.add(pos, orgin, new Cartesian3());
            return pos;
        }

        if (!flag) {
            // 计算平面法向量到坐标系z轴的旋转矩阵
            // 根据旋转前后的两个向量值，使用上面的方法，先求出旋转角度和旋转轴，然后用罗德里格旋转公式即可求出对应的旋转矩阵。
            let normal = Cartesian3.normalize(Cartesian3.cross(lineAVec, lineCVec, new Cartesian3()), new Cartesian3());
            if (normal.z < 0) normal = Cartesian3.negate(normal, new Cartesian3());
            let rotationMatrix3 = GeoUtil.calculateRotateMatrix(normalZ, normal);
            tranfM = Matrix4.fromRotationTranslation(rotationMatrix3);
            tranfMInverse = Matrix4.inverse(tranfM, new Matrix4());

            lineAVec = Matrix4.multiplyByPoint(tranfM, lineAVec, new Cartesian3());
            lineCVec = Matrix4.multiplyByPoint(tranfM, lineCVec, new Cartesian3());
        }

        let angle1 = turf.radiansToDegrees(Cartesian3.angleBetween(lineAVec, normalX));
        let angle2 = turf.radiansToDegrees(Cartesian3.angleBetween(lineCVec, normalX));
        let corssA = Cartesian3.cross(lineAVec, normalX, new Cartesian3());
        let corssC = Cartesian3.cross(lineCVec, normalX, new Cartesian3());

        // 判断夹角带方向 逆时针还是顺时针 顺时针为正
        if (corssA.z > 0) {
            angle1 = -angle1;
        }
        angle1 = 90 - angle1;
        if (corssC.z > 0) {
            angle2 = -angle2;
        }
        angle2 = 90 - angle2;

        // 计算圆弧
        var arc = turf.lineArc(turf.point([arcCenter.lon, arcCenter.lat]), dis / 1000, angle1, angle2);
        let result = [];
        let coordinates = arc.geometry.coordinates;
        // 如果圆弧数组中间点不在三角形内需要重新计算
        let mid = coordinates[parseInt(coordinates.length / 2)];
        //起点（this.positions[1]）弧度中点的向量
        let p1_mid_Vec = Cartesian3.subtract(Cartesian3.fromDegrees(mid[0],mid[1],pos1.height),this.positions[1],new Cartesian3())
        // 判断中点向量（p1_mid_Vec）和A向量（lineAVec）的角度值 > 90 中点向量和绘制角度同向，<90反向 需要调换绘制弧度
        let lineA_mid_angle = Cartesian3.angleBetween(p1_mid_Vec,lineAVec)

        if(lineA_mid_angle>=Math.PI/2){
            arc = turf.lineArc(turf.point([arcCenter.lon, arcCenter.lat]), dis / 1000, angle2, angle1);
            coordinates = arc.geometry.coordinates;
        }

        // 将truf二维坐标转为cesium坐标，并加入高度
        const height = pos1.height;
        dis = Cartesian3.magnitude(Cartesian3.subtract(Cartesian3.fromDegrees(coordinates[0][0], coordinates[0][1], height), this.positions[1], new Cartesian3()));
        coordinates.forEach(coord => {
            let pos = Cartesian3.fromDegrees(coord[0], coord[1], height);
            // 如果三点不是同一平面需要计算旋转
            if (!flag) {
                pos = recoverByMartrix(pos, this.positions[1], dis, tranfMInverse);
            }
            result.push(pos);
        });

        // 计算角度
        let vector1 = Cartesian3.subtract(this.positions[0], this.positions[1], new Cartesian3());
        let vector2 = Cartesian3.subtract(this.positions[2], this.positions[1], new Cartesian3());
        let dotVec = Cartesian3.dot(vector1, vector2);
        let vector1Length = Cartesian3.magnitude(vector1);
        let vector2Length = Cartesian3.magnitude(vector2);
        let angleCos = dotVec / (vector1Length * vector2Length);
        let angle = CesiumMath.toDegrees(CesiumMath.acosClamped(angleCos));

        // label位置取弧线中点与起点连线矢量要比 半径长10
        mid = coordinates[parseInt(coordinates.length / 2)];
        let lablePos = Cartesian3.fromDegrees(mid[0], mid[1], height+0.5);
        // 如果三点不是同一平面需要计算旋转
        if (!flag) {
            lablePos = recoverByMartrix(lablePos, this.positions[1], dis, tranfMInverse);
        }

        let lineArc = this.viewer.entities.add({
            attr: options,
            polyline: {
                positions: result,
                width: 2,
                material: new PolylineDashMaterialProperty({
                    color: material
                }),
                depthFailMaterial: new PolylineDashMaterialProperty({
                    color: material
                })
            }
        });

        let labelArc = new LabelPlot({
            position:lablePos,
            text: angle.toFixed(3) + "°",
            style:{
                color:"red"
            }
        })
        this.labelPlotList[options.id].push(labelArc)

        return { lineArc, labelArc };
    }

    /**
     * 清除三角测量
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.clearTri();
     */
    clearTri() {
        this.clear(); //清除监听
        for (const key in this.TriDic) {
            this.clearEntityById(key);
        }
        this.geomap.render();
    }

    /**
     * 根据entity的ID清除绘制的Entity
     * @param {Number} objId entity的id
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.clearEntityById(objId);
     */
    clearEntityById(objId) {
        let that = this;
        let entityList = that.viewer.entities.values;
        if (entityList == null || entityList.length < 1) {
            return;
        }
        for (let i = 0; i < entityList.length; i++) {
            let entity = entityList[i];
            if (defined(entity.attr) && entity.attr.id == objId) {
                that.viewer.entities.remove(entity);
                that.clearLabelById(objId);//清除标签
                delete this.distanceDic[objId];
                i--;
            }
        }
    }

    /**
     * 计算中心点
     * @param {Cartesian3} prePoint 上一个点
     * @param {Cartesian3} nextPoint 下一个点
     * @returns {Cartesian3} 中心点
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.computeCenter(prePoint, nextPoint);
     */
    computeCenter(prePoint, nextPoint) {
        let res1 = Cartesian3.add(prePoint, nextPoint, new Cartesian3());
        let center = Cartesian3.divideByScalar(res1, 2, new Cartesian3());
        return center;
    }

    /**
     * 添加绘制点
     * @param {Cartesian3} position 位置坐标
     * @param {Object} options 属性信息
     * @param {Color} [options.color] 线颜色 默认皇家蓝
     * @param {Number} [options.opacity] 线透明度 默认1.0
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.addPoint(position, options);
     */
    addPoint(position, options) {
        let that = this;
        let point = that.viewer.entities.add({
            position: position,
            attr: options,
            billboard: {
                image: that.dragIcon,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });
        return point;
    }

    /**
     * 移除监听 退出编辑状态
     * @private
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.clear();
     */
    clear() {
        // 清除鼠标样式
        this.viewer.container.style.cursor = 'default'
        this.positions = [];
        if (this.drawHandler) {
            this.drawHandler.destroy();
            this.drawHandler = null;
        }
    }

    /**
     * 按类型和id清除标签
     * @private
     * @param {Array} id 
     */
    clearLabelById(id){
        let labelArr = this.labelPlotList[id]
        if(!labelArr) return //防止多次删除
        for (let i = 0; i < labelArr.length; i++) {
            labelArr[i].destroy();
        }
        delete this.labelPlotList[id]
    }

    /**
     * 根据点绘制线
     * @param {Object} options 包含id,color,opacity,width,clampToGround和_category的对象
     * @returns {Array<Object>} 返回包含线和标记的对象数组
     * @private
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool._showPolyline2Map(options);
     */
    _showPolyline2Map(options) {
        let color = options.color; //线的颜色
        let width = options.width; //线的宽度
        let opacity = options.opacity; //线的透明度
        let material = color.withAlpha(opacity);
        let that = this;
        options._category = "measure";
        this.entityList.push(options.id);

        let bData = {
            attr: options,
            polyline: {
                positions: that.positions,
                width: width,
                material: material,
                depthFailMaterial: material,
                clampToGround: options.clampToGround
            }
        };
        let polyline = this.viewer.entities.add(bData);

        let label = new LabelPlot({
            position:new Cartesian3(0,0,0),
            text:"",
            pixelOffset:new Cartesian2(0, -20)
        })
        let labelArr = []
        labelArr.push(label)
        that.labelPlotList[options.id] = labelArr;
        that.geomap.render();
        return [polyline, label];
    }

    /**
     * 绘制面
     * @param {Object} options 包含id,color,opacity,width,clampToGround和_category的对象
     * @returns {Array<Object>} 返回包含线和标记的对象数组
     * @private
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool._showPolygon2Map(options);
     */
    _showPolygon2Map(options) {
        let color = options.color; //线的颜色
        let opacity = options.opacity; //线的透明度
        let material = color.withAlpha(opacity);
        let that = this;
        let hierarchy = new PolygonHierarchy();
        hierarchy.positions = that.positions;
        options._category = "measure";
        this.entityList.push(options.id);

        let bData = {
            attr: options,
            polyline: {
                positions: that.positions,
                width: 2,
                material: material,
                depthFailMaterial: material,
                clampToGround: options.clampToGround
            },
            polygon: {
                hierarchy: hierarchy,
                material: material,
                perPositionHeight: !options.clampToGround,
                classificationType: options.clampToGround ? ClassificationType.BOTH : null
            }
        };
        let polygon = this.viewer.entities.add(bData);
        polygon._category = "measure";
        let label = new LabelPlot({
            position:new Cartesian3(0,0,0),
            text:"",
            pixelOffset: new Cartesian2(0, -30),
        })
        
        let labelArr = []
        labelArr.push(label)
        that.labelPlotList[options.id] = labelArr;

        return [polygon, label];
    }

    /**
     * 绘制高程线
     * @param {Object} options 包含id,color,opacity,width,clampToGround和_category的对象
     * @returns {Array<Object>} 返回包含线和标记的对象数组
     * @private
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool._showHeight2Map(options);
     */
    _showHeight2Map(options) {
        let color = defaultValue(options.color, Color.ROYALBLUE); //线的颜色
        let opacity = defaultValue(options.opacity, 1.0); //线的透明度
        options._category = "measure";
        let material = color.withAlpha(opacity);
        let that = this;
        let lineA, lineB, lineC;
        let labelA, labelB, labelC;
        this.entityList.push(options.id);

        //需要创建三条动态线
        //两条虚线 一条实线
        //空间距离
        lineA = this.viewer.entities.add({
            attr: options,
            polyline: {
                positions: that.positions,
                width: 2,
                material: new PolylineDashMaterialProperty({
                    color: material
                }),
                depthFailMaterial: new PolylineDashMaterialProperty({
                    color: material
                })
            }
        });

        labelA = new LabelPlot({
            position:new Cartesian3(0,0,0),
            text:"",
        })

        lineB = this.viewer.entities.add({
            attr: options,
            polyline: {
                positions: that.positions,
                width: 5,
                material: material,
                depthFailMaterial: material
            }
        });

        labelB = new LabelPlot({
            position:new Cartesian3(0,0,0),
            text:"",
            pixelOffset:new Cartesian2(0,-20)
        })

        lineC = this.viewer.entities.add({
            attr: options,
            polyline: {
                positions: that.positions,
                width: 2,
                material: new PolylineDashMaterialProperty({
                    color: material
                }),
                depthFailMaterial: new PolylineDashMaterialProperty({
                    color: material
                })
            }
        });

        labelC = new LabelPlot({
            position:new Cartesian3(0,0,0),
            text:"",
        })

        let labelArr = []
        labelArr.push(labelA)
        labelArr.push(labelB)
        labelArr.push(labelC)
        that.labelPlotList[options.id] = labelArr;

        this.geomap.render();

        return [lineA, lineB, lineC, labelA, labelB, labelC];
    }

    /**
     *绘制线
     * @param {Object} options 包含id,color,opacity和_category的对象
     * @returns {Array<Object>} 返回包含线和标记的对象数组
     * @private
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool._showTri2Map(options);
     */
    _showTri2Map(options) {
        let color = defaultValue(options.color, Color.ROYALBLUE); //线的颜色
        let opacity = defaultValue(options.opacity, 1.0); //线的透明度
        let material = color.withAlpha(opacity);
        let that = this;
        options._category = "measure";
        this.entityList.push(options.id);

        let lineA, lineB, lineC;
        let labelA, labelB, labelC;

        //需要创建三条动态线
        //两条虚线 一条实线
        //空间距离
        lineA = this.viewer.entities.add({
            attr: options,
            polyline: {
                positions: that.positions,
                width: 2,
                material: new PolylineDashMaterialProperty({
                    color: material
                }),
                depthFailMaterial: new PolylineDashMaterialProperty({
                    color: material
                })
            }
        });

        labelA = new LabelPlot({
            position:new Cartesian3(0,0,0),
            text:"",
        })

        lineB = this.viewer.entities.add({
            attr: options,
            polyline: {
                positions: that.positions,
                width: 5,
                material: material,
                depthFailMaterial: material
            }
        });

        labelB = new LabelPlot({
            position:new Cartesian3(0,0,0),
            text:""
        })

        lineC = this.viewer.entities.add({
            attr: options,
            polyline: {
                positions: that.positions,
                width: 2,
                material: new PolylineDashMaterialProperty({
                    color: material
                }),
                depthFailMaterial: new PolylineDashMaterialProperty({
                    color: material
                })
            }
        });

        labelC = new LabelPlot({
            position:new Cartesian3(0,0,0),
            text:""
        })
        
        let labelArr = []
        labelArr.push(labelA)
        labelArr.push(labelB)
        labelArr.push(labelC)
        that.labelPlotList[options.id] = labelArr;

        this.geomap.render();

        return [lineA, lineB, lineC, labelA, labelB, labelC];
    }

    /**
     * 计算长度
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  measureTool.calcDistance();
     */
    calcDistance() {
        let num = this.positions.length;
        let start = this.positions[0];
        let dis = 0;
        for (let i = 0; i < num; i++) {
            const end = this.positions[i];
            dis += Cartesian3.distance(start, end);
            start = end;
        }
        let distance = dis > 1000 ? (dis / 1000).toFixed(2) + "km" : dis.toFixed(2) + "m";
        return "距离: " + distance;
    }

    /**
     * 计算面积
     * @returns {String} 返回计算的面积大小，但面积小于1000000㎡时输出单位为㎡，否则单位为k㎡
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  let aera = measureTool.calcArea();
     */
    calcArea() {
        let res = 0;
        //拆分三角曲面
        let points = this.positions;
        if (points.length < 3) {
            return "";
        }

        let a = 0,
            cosnx = 0,
            cosny = 0,
            cosnz = 0,
            s = 0,
            ss = 0;
        let j = (0 + 1) % points.length;
        let k = (0 + 2) % points.length;
        let p1 = points[0];
        let p2 = points[j];
        let p3 = points[k];

        a = Math.pow((p2.y - p1.y) * (p3.z - p1.z) - (p3.y - p1.y) * (p2.z - p1.z), 2) + Math.pow((p3.x - p1.x) * (p2.z - p1.z) - (p2.x - p1.x) * (p3.z - p1.z), 2) + Math.pow((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y), 2);
        cosnx = ((p2.y - p1.y) * (p3.z - p1.z) - (p3.y - p1.y) * (p2.z - p1.z)) / Math.pow(a, 1 / 2);
        cosny = ((p3.x - p1.x) * (p2.z - p1.z) - (p2.x - p1.x) * (p3.z - p1.z)) / Math.pow(a, 1 / 2);
        cosnz = ((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / Math.pow(a, 1 / 2);
        let lastPoint = points[points.length - 1];
        s = cosnz * (lastPoint.x * p1.y - p1.x * lastPoint.y) + cosnx * (lastPoint.y * p1.z - p1.y * lastPoint.z) + cosny * (lastPoint.z * p1.x - p1.z * lastPoint.x);

        for (let i = 0; i < points.length - 1; i++) {
            let p11 = points[i];
            let p21 = points[i + 1];
            ss = cosnz * (p11.x * p21.y - p21.x * p11.y) + cosnx * (p11.y * p21.z - p21.y * p11.z) + cosny * (p11.z * p21.x - p21.z * p11.x);
            s += ss;
        }
        s = Math.abs(s / 2.0);
        let area = s > 1000000 ? (s / 1000000).toFixed(2) + "km²" : s.toFixed(2) + "㎡";

        /*
        console.log('area3: '+area3);
        let res1 = 0;
        let points1 = []  //初始化清空
        points1 = this.positions;

        let points2 = []
        points2 = this.positions;
        //海伦公式
        let area2 = 0
        // points2.push(points2[0]) //添加
        for (let i = 0; i < points2.length; i ++) {
            let j = (i + 1) % points2.length;
            let k = (i + 2) % points2.length;
            let pt1 = points2[i]
            let pt2 = points2[j]
            let pt3 = points2[k]

            let totalAngle = this.calcAngle(pt1, pt2, pt3);
            let a = Cartesian3.distance(pt1, pt2)
            let b = Cartesian3.distance(pt2, pt3)
            let c = Cartesian3.distance(pt3, pt1)
            // Heron's formula 海伦公式
            let s = (a + b + c) / 2.0
            let triArea =Math.sqrt(s * (s - a) * (s - b) * (s - c))
            console.log('totalAngle ' +totalAngle)
            area2 += Math.sin(totalAngle)<0? -triArea :triArea;
        }

        area2 =  area2 > 1000000 ? (area2 / 1000000).toFixed(2) + 'km²' : area2.toFixed(2) + '㎡'
        console.log('area2: '+area2);
        // points2.pop() //移除

        //原有方法
        for (let i = 0; i < points.length - 2; i++) {
            let j = (i + 1) % points.length;
            let k = (i + 2) % points.length;
            let totalAngle = this.calcAngle(points[i], points[j], points[k]);
            let dis_temp1 = Cartesian3.distance(points[i],points[j]);
            let dis_temp2 = Cartesian3.distance(points[j],points[k]);
            res += dis_temp1 * dis_temp2 * Math.abs(Math.sin(totalAngle)) ;
        }

        res /= 2;
        let area = res > 1000000 ? (res / 1000000).toFixed(2) + 'km²' : res.toFixed(2) + '㎡'
        console.log('area: '+area);

        let h = 0
        points1.push(points1[0]) //添加
        for (let i = 1; i < points1.length; i++) {

            let oel = points1[i - 1]
            let el = points1[i]
            h += oel.x * el.y - el.x * oel.y
        }
        res1 = Math.abs(h);
        let area1 = res1 > 1000000 ? (res1 / 1000000).toFixed(2) + 'km²' : res1.toFixed(2) + '㎡'
        console.log('area1: '+area1);
        points1.pop() //移除
        */
        return "面积: " + String(area);
    }
    /**
     * 计算角度，三点按顺序连线构成的角度值
     * @param {Cartesian3} p1 三维笛卡尔坐标
     * @param {Cartesian3} p2 三维笛卡尔坐标
     * @param {Cartesian3} p3 三维笛卡尔坐标
     * @returns {Number} 返回角度值
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  let angle = measureTool.calcAngle(p1, p2, p3);
     */
    calcAngle(p1, p2, p3) {
        let bearing21 = this._bearing(p2, p1);
        let bearing23 = this._bearing(p2, p3);
        let angle = bearing21 - bearing23;
        if (angle < 0) {
            angle += 360;
        }
        return angle;
    }

    /**
     * 计算起止点连线与X轴构成的夹角
     * @param {Cartesian3} from 起点
     * @param {Cartesian3} to 终点
     * @returns {Number} 返回角度值
     * @private
     * @example
     *  var measureTool = new BOSGeo.MeasureTools(geomap);
     *  let res = measureTool._bearing(from, to);
     */
    _bearing(from, to) {
        //笛卡尔坐标转经纬度
        let ellipsoid = this.viewer.scene.globe.ellipsoid;
        from = Util.cartesianToDegrees(ellipsoid, from);
        to = Util.cartesianToDegrees(ellipsoid, to);
        //经纬度转弧度
        let lat1 = from.y * (Math.PI / 180.0);
        let lon1 = from.x * (Math.PI / 180.0);
        let lat2 = to.y * (Math.PI / 180.0);
        let lon2 = to.x * (Math.PI / 180.0);

        let angle = -Math.atan2(Math.sin(lon1 - lon2) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2));
        if (angle < 0) {
            angle += Math.PI * 2.0;
        }
        angle = angle * (180.0 / Math.PI); //角度
        return angle;
    }
}

export default MeasureTools;
