import defined from 'cesium/Core/defined';
import Cartesian3 from 'cesium/Core/Cartesian3'
import Camera  from "cesium/Scene/Camera"
import ShadowMode  from "cesium/Scene/ShadowMode";
import OrthographicOffCenterFrustum from "cesium/Core/OrthographicOffCenterFrustum.js";
import Cartographic  from "cesium/Core/Cartographic";
import EllipsoidTerrainProvider from "cesium/Core/EllipsoidTerrainProvider"

import HeadingPitchRoll  from 'cesium/Core/HeadingPitchRoll';
import when  from 'cesium/ThirdParty/when';
import sampleTerrain  from 'cesium/Core/sampleTerrain.js';
import ShadowMap  from 'cesium/Scene/ShadowMap.js';
import ScreenSpaceEventType  from 'cesium/Core/ScreenSpaceEventType';
import ScreenSpaceEventHandler  from 'cesium/Core/ScreenSpaceEventHandler';
import CesiumMath  from "cesium/Core/Math";
import  Transforms  from"cesium/Core/Transforms";
import Model from "cesium/Scene/Model";
import Entity  from 'cesium/DataSources/Entity.js';
import Ellipsoid  from 'cesium/Core/Ellipsoid.js';
import CzmlDataSource  from'cesium/DataSources/CzmlDataSource';
import JulianDate  from "cesium/Core/JulianDate";
import Clock from "cesium/Core/Clock.js";
import CustomDataSource  from 'cesium/DataSources/CustomDataSource.js';

import {GeoDepository} from "../core/GeoDepository";
import Util from "../utils/Util";

/**
* 卫星轨迹效果
 * @alias SatellitePassEffect
 *
 * @param {Object} options 配置
 * @param {Number} [options.STSpeed=10]  可选，飞行速度，默认为10。
 * @param {String} options.url  CZML数据地址，静止卫星、同步卫星轨迹等可在http://www.orbitalpredictor.com/home/中查询下载czml卫星轨迹数据。
 * @example
 let spe = new BOSGeo.SatellitePassEffect({
    url:'../data/data.czml',
    STSpeed:60
})
*/
class SatellitePassEffect {
    constructor(options) {
        // this._state = CV.INITIALIZED
        this.viewer = GeoDepository.viewer
        this.clock = GeoDepository.viewer.clock;
        this.handler = new ScreenSpaceEventHandler(this.viewer.canvas)
        this.layer = new CustomDataSource('cv-sate')
        this.viewer && this.viewer.dataSources.add(this.layer)

        this.url=options.url
        //时间速率
        this.STSpeed = options.STSpeed||10;

        //如果设置为true，则会在场景更新时渲染，否则实时渲染每帧
        this.viewer.scene.requestRenderMode=false;
        GeoDepository.geomap.requestRenderModeMethods.push('SatellitePassEffect');
        this.viewer.clock.shouldAnimate=true

        this._init();
    }

    /**
     * 初始化
     * @private
     * @ignore
     */
    _init() {

        // 卫星实体
        this.satelliteAll = [];
        //通信
        this.Transits = [];
        //格式数据存储
        //查看方式区分开 以免冲突
        this.passTime = [];
        this.passTime_old = [];
        //刷新的时间
        this.renderTime = null;
        //拾取的对象
        this.pickedFeature = null;
        //标识符
        this.iden = true;
        //实体
        this.EntityObj = [];
        //线实体
        this.lineEntity = [];

        this._bindEvent()
        this._loadCZML(this.url);
    }

    /**
     * 绑定事件
     * @private
     * @ignore
     */
    _bindEvent() {
        this.handler.setInputAction(e => {
            try {
                if (!e.position) {
                    return false;
                }
                this.pickedFeature = this.viewer.scene.pick(e.position);
                if (!defined(this.pickedFeature) && this.pickedFeature == undefined) {
                    return false;
                };
                if (this.pickedFeature.id.description == undefined) { //自己创建的
                    return false;
                };
                let f_name = this.pickedFeature.id.name, f_position, position;
                if (this.pickedFeature.id.idea == "radar") {
                    position = this.pickedFeature.id.position.getValue(this.clock.currentTime);
                    this.pickedFeature.type = "radar";
                } else {
                    position = this.pickedFeature.id.position.getValue(this.clock.currentTime);
                    this.pickedFeature.type = "satellite";
                }
                f_position =  Ellipsoid.WGS84.cartesianToCartographic(position)
                this.pickedFeature.id.description = this.infoTable_2(f_name, f_position);
                console.log(f_name, f_position);
                //viewer.selectedEntity = selectedEntity;
                this.pickedFeature.id.name = f_name;
                this.pickedFeature.temp = this.pickedFeature.id.description + "<h2> Passes <h2>";
                this.iden = false; //点击事件改变标识符
            } catch (error) {
                console.log(error);
            }
        }, ScreenSpaceEventType.LEFT_CLICK)
    }

    /**
     * load CZML数据
     * @param {String} url  CZML数据地址，静止卫星可在http://www.orbitalpredictor.com/home/中查询下载czml卫星轨迹数据。
     * @private
     */
    _loadCZML(url) { //

        this.viewer.dataSources.add(CzmlDataSource.load(url)).then((dataSource) => {
            dataSource._clock && (dataSource._clock=this.STSpeed)
            this.dataSource = dataSource;
            this.clock.multiplier = this.STSpeed;
            this.radar = dataSource.entities.getById("Facility/AGI");
            let satellite1 = dataSource.entities.getById("Satellite/ISS");
            let satellite2 = dataSource.entities.getById("Satellite/Geoeye1");
            let transit1 = dataSource.entities.getById("Facility/AGI-to-Satellite/ISS");
            let transit2 = dataSource.entities.getById("Facility/AGI-to-Satellite/Geoeye1");
            this.satelliteAll = [satellite1, satellite2];
            this.Transits = [transit1, transit2];
            this.radar && (this.radar.idea = "rader")

            try {
                this.scan();
                this.satelliteInfo();
                // _self.createEntity([_self.radar]);
                this.communication();
            } catch (e) {
                console.log(e);
            }
        })

    }
    /**
     * 卫星过境通信效果
     * @private
     * @ignore
     */
    communication() {
        this.p_line = []; //创建线的点

        if (this.radar == null) { //雷达
            return false;
        }

        let r_position = this.radar.position.getValue(this.clock.currentTime);
        let r_point = Ellipsoid.WGS84.cartesianToCartographic(r_position)
        this.rr_point = [parseInt(r_point.longitude / Math.PI * 180), parseInt(r_point.latitude / Math.PI * 180)];
        if (this.satelliteAll.length == 0) {
            return false;
        }
        //遍历卫星
        for (let i in this.satelliteAll) {
            this.p_line[i] = [];
            let sate = this.satelliteAll[i];
            let s_position = sate.position.getValue(this.clock.currentTime);
            this.s_point =  Ellipsoid.WGS84.cartesianToCartographic(s_position)
            this.p_line[i].push(r_position.clone());
            this.p_line[i].push(s_position.clone());
            let lineObj = CV.E.createDynamicPolyline({ positions: this.p_line[i], width: 1 })

            this.lineEntity.push(this.layer.entities.add(lineObj));
        }

    }
    /**
     *  判断一个点是否在圆的内部
     *  @param {Array} point  测试点坐标
     *  @param {Array} circle 圆心坐标
     *  @param {Number} r 圆半径
     *  @return {Boolean}返回true为真，false为假
     *  @private
     * @ignore
     *  */
    pointInsideCircle(point, circle, r) {
        if (r === 0) return false
        var dx = circle[0] - point[0]
        var dy = circle[1] - point[1]
        return dx * dx + dy * dy <= r * r
    }
    /**
     * 卫星信息
     * @private
     * @ignore
     */
    satelliteInfo() {
        if (this.Transits.length == 0) {
            return false;
        };
        this.formatTransit();
        this.selectedEntity = new Entity();
        this.selectedEntity.name = "PASS";
        this.selectedEntity.description = this.infoTable_1(dayjs(JulianDate.addHours(this.clock.currentTime, -8, new JulianDate())).format("YYYY-MM-DD HH:mm:ss"));
        this.viewer.selectedEntity = this.selectedEntity;

        this.clock.onTick.addEventListener(clock => {
            if (!clock.shouldAnimate) return;
            if (this.iden) this.selectedEntity.description = this.infoTable_1(this.pass(clock));//标识符  进来展示所有卫星信息
            if (!this.iden) {
                if (this.pickedFeature == null) return;
                if ("radar" == this.pickedFeature.type) {
                    this.pickedFeature.id.description = this.pickedFeature.temp + this.infoTable_1(this.pass(clock));
                } else {
                    let position = this.pickedFeature.id.position.getValue(clock.currentTime);
                    let f_position = Ellipsoid.WGS84.cartesianToCartographic(position)
                    this.pickedFeature.id.description = this.infoTable_2(this.pickedFeature.id.name, f_position) + ' <h2> Passes </h2>' + this.infoTable_3(this.pass(clock), this.pickedFeature.id.name);
                    this._addRadarScen(position)
                }
            }
            //判断是否在地面雷达通信范围
            if (this.satelliteAll.length == 0) {
                return false;
            }
            for (let i in this.satelliteAll) { //遍历卫星
                let sate = this.satelliteAll[i];
                let position = sate.position.getValue(clock.currentTime);
                let s_point =  Ellipsoid.WGS84.cartesianToCartographic(position)
                this.p_line[i].pop();
                this.p_line[i].push(position.clone());
                this.ss_point = [parseInt(s_point.longitude / Math.PI * 180), parseInt(s_point.latitude / Math.PI * 180)]
                let flag = this.pointInsideCircle(this.ss_point, this.rr_point, 30);
                if (flag) {
                    this.lineEntity[i].show = true;
                } else {
                    this.lineEntity[i].show = false;
                }
            }
        })
        //时间轴结束
        this.clock.onStop.addEventListener(clock => {
            if (this.Transits.length == 0) {
                return false;
            };
            //格式化卫星数据
            this.formatTransit();
        });
    }

    // //新增雷达探照
    // _addRadarScen(position) {
    //
    //     //console.log(CV.U.courseAngle(this.radar.position.getValue(viewer.clock.currentTime),position))
    //
    // }
    /**
     * 格式化通信数据
     * @private
     * @ignore
     */
    formatTransit() {
        if (this.Transits.length == 0) {
            return false;
        };
        this.passTime = [], this.passTime_old = []; //查看方式区分开 以免冲突
        for (let i in this.Transits) {
            let transit = this.Transits[i]
            let intervals = [], intervals_old = [];
            let n_interval = transit.availability._intervals;
            for (let ii in n_interval) {
                let interval = n_interval[ii]
                let start = dayjs(JulianDate.addHours(interval.start, -8, new JulianDate())).format("YYYY-MM-DD HH:mm:ss");
                let stop = dayjs(JulianDate.addHours(interval.stop, -8, new JulianDate())).format("YYYY-MM-DD HH:mm:ss");
                intervals.push({ name: transit.name, "startTime": start, "stopTime": stop, "interval": dayjs(stop).diff(dayjs(start), 'millisecond') });
                intervals_old.push({ name: transit.name, "startTime": start, "stopTime": stop, "interval": dayjs(stop).diff(dayjs(start), 'millisecond') });
            }
            this.passTime.push(intervals);
            this.passTime_old.push(intervals_old);
        }
    }

    /**
     * 创建雷达实体
     * @param {Array} radars
     * @returns {boolean}
     * @private
     * @ignore
     */
    createEntity(radars) {
        try {
            if (radars.length == 0) {
                return false;
            }
            for (let i in radars) {
                let radar = radars[i], l, r;
                let positions = radar.position.getValue(this.clock.currentTime);
                this.r_point = positions;
                if (positions.length == 0) {
                    return false;
                };
                let cartographic =  Ellipsoid.WGS84.cartesianToCartographic(positions)
                let lat = CesiumMath.toDegrees(cartographic.latitude), lon = CesiumMath.toDegrees(cartographic.longitude), height = cartographic.height;
                //radarscan
                r = new HeadingPitchRoll(CesiumMath.toRadians(90),
                    CesiumMath.toRadians(0), CesiumMath.toRadians(0));
                l = Cartesian3.fromDegrees(lon, lat, height);
                this.EntityObj.push(this.layer.entities.add(CV.E.getCustomRadar(l, r)));
            }
        } catch (e) {
            console.log(e);
        }
    }
    /**
     * 添加扫描物
     * @private
     * @ignore
     */
    scan() {
        if (this.satelliteAll.length == 0) {
            return false;
        };
        for (let i in this.satelliteAll) {
            let entity = this.satelliteAll[i]
            let cartesian = entity.position.getValue(this.clock.currentTime);
            let position = CV.T.transformCartesianToWSG84(cartesian)
            //let positions = _self.mouseManager.worldToLonlat(cartesian);
            this.bindScan(position, entity);
        }
    }

    /**
     * 卫星通过时间
     * @param {Object} clock viewer.clock
     * @private
     * @ignore
     */
    pass(clock) { //当前时间
        let currentTime = dayjs(JulianDate.addHours(clock.currentTime, -8, new JulianDate())).format("YYYY-MM-DD HH:mm:ss");
        return currentTime;
    }

    /**
     * 删除第一个
     * @param {Number} n 索引值
     * @return {boolean}
     *@private
     * @ignore
     */
    index_rm(n) {
        if (this.passTime_old.length == 0) {
            return false;
        };
        this.passTime_old[n].splice(0, 1); //删除第一个
    }

    /**
     * 绑定扫描物
     * @param {Cartesian3} positions 坐标点
     * @param {Entity} entityObj  entity对象
     * @private
     * @ignore
     */
    bindScan(positions, entityObj) {
        //let modelMatrix = this.Primitives.countModelMatrix(positions);
        //this.scanEntity = new entityFactory({type:"createScan",data:{modelMatrix:modelMatrix,positions:positions,v:this.CoreV}});
        this.scanEntity = CV.E.createDynamicCylinder({ positions: positions, entity: entityObj, viewer: this.viewer, cylinder: { legnth: 600000, slices: 4, bottomRadius: 600000 / 2 } })
        this.EntityObj.push(this.layer.entities.add(this.scanEntity));
    }

    /**
     * table 1 卫星通过信息表1
     * @param  {JulianDate} currentTime 当前时间
     * @returns {}
     * @private
     * @ignore
     */
    infoTable_1(currentTime) {
        try {
            let _self = this, renderTime = _self.renderTime;
            if (_self.passTime_old.length == 0) {
                return false;
            };
            var tr = "", table = `<table class="cesium-infoBox-defaultTable"><thead><tr><th>卫星</th><th>倒计时(ms)</th><th>通信开始(date)</th><th>通信结束(date)</th><th>通信时长(ms)</th></tr></thead><tbody>`;
            for (var n in _self.passTime_old) {
                if (_self.passTime_old[n].length == 0) continue;
                var interval_pass = _self.passTime_old[n][0]; //始终取第一个
                renderTime = dayjs(interval_pass.startTime).diff(dayjs(currentTime));
                if (renderTime <= 0) {
                    if (renderTime <= -(interval_pass.interval)) {
                        _self.index_rm(n);
                    } else {
                        renderTime = "PASS";
                    }
                }
                tr += `<tr><td>${interval_pass.name}</td><td>${renderTime}</td><td>${interval_pass.startTime}</td><td> ${interval_pass.stopTime}</td><td> ${interval_pass.interval}</td></tr>`;
            }
            return table + tr + `</tbody></table>`;
        } catch (e) {
            console.log(e);
        }
    }

    /**
     * table 2 卫星通过信息表2
     * @param {String} f_name  点击pickedFeature的名称
     * @param {cartesian3} cartesian 点
     * @returns {}
     * @private
     * @ignore
     */
    infoTable_2(f_name, cartesian) {
        if (f_name == undefined && cartesian == undefined) {
            return false;
        };
        let tr = "", table = `<h2> Position </h2><table class="cesium-infoBox-defaultTable"><thead><tr><th>Name</th><th>Latitude</th><th>Longitude</th><th>Elevation</th></tr></thead><tbody>`;
        let f_point = [parseInt(cartesian.longitude / Math.PI * 180), parseInt(cartesian.latitude / Math.PI * 180)];
        tr = `<tr><td>${f_name}</td><td>${f_point[0]}°</td><td>${f_point[1]}°</td><td> ${parseInt(cartesian.height)}</td></tr>`;
        return table + tr + `</tbody></table>`;
    }

    /**
     * table 3 卫星通过信息表3
     * @param {JulianDate} currentTime  当前时间
     * @param  {String} featureName  点击pickedFeature的名称
     * @returns {}
     * @private
     * @ignore
     */
    infoTable_3(currentTime, featureName) {
        let _self = this, renderTime = _self.renderTime;
        if (_self.passTime.length == 0 && featureName == undefined) {
            return false;
        };
        let t_interval = function () {
            for (var i in _self.passTime) { if (_self.passTime[i][0].name.indexOf(featureName) != -1) return _self.passTime[i]; }
        }
        let intervals = t_interval();
        var tr = "", table = `<table class="cesium-infoBox-defaultTable"><thead><tr><th>卫星</th><th>倒计时(ms)</th><th>通信开始(date)</th><th>通信结束(date)</th><th>通信时长(ms)</th></tr></thead><tbody>`;
        for (let i in intervals) {
            let interval = intervals[i]
            renderTime = dayjs(interval.startTime).diff(dayjs(currentTime));
            if (renderTime <= 0) renderTime = 0;
            tr += `<tr><td>${interval.name}</td><td>${renderTime}</td><td>${interval.startTime}</td><td> ${interval.stopTime}</td><td> ${interval.interval}</td></tr>`;
        }
        return table + tr + `</tbody></table>`;
    }
    /**
     * 向后飞行
     * @example
     spe.back();
     */
    back() {
        this.STSpeed = this.STSpeed>0?-this.STSpeed:this.STSpeed;
        this.clock.multiplier = this.STSpeed;
    }
    /**
     * 向前飞行
     *@example
     spe.forward();
     */
    forward() {
        this.STSpeed = this.STSpeed>0?this.STSpeed:-this.STSpeed;
        this.clock.multiplier = this.STSpeed;
    }

    /**
     * 设置飞行速度
     * @param {Number} speedNum  飞行速度
     * @example
     spe.setSpeed(600);
     */
    setSpeed(speedNum) {
        // console.log(speedNum);
        this.clock.multiplier = speedNum;
    }
    /**
     * 开始飞行
     * @example
     spe.start()
     */
    start() {
        this.clock.shouldAnimate = true;
    }
    /**
     * 暂停飞行
     * @example
     spe.stop()
     */
    stop() {
        this.clock.shouldAnimate = false;
    }
    /**
     * 清除飞行
     * @example
     spe.remove()
     */
    remove() {
        Util.removeFromArray(GeoDepository.geomap.requestRenderModeMethods, 'SatellitePassEffect');//移除调用实时渲染的方法
        GeoDepository.geomap._requestRenderModeCheck();
        this.layer.entities.removeAll();
        this.viewer.dataSources.remove(this.dataSource);
        this.clock.dataSources&& this.clock.dataSources.remove(this.dataSource);
        this.clock.shouldAnimate = false;
        // this.handlerAction.destroy();
        this.handlerAction = null;
        if (this.EntityObj.length == 0) {
            return false;
        }
        this.EntityObj = [];

    }
}
export default SatellitePassEffect;