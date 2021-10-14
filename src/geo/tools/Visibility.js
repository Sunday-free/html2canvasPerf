import defined from "cesium/Core/defined";
import Cartesian3 from "cesium/Core/Cartesian3";
import Color from "cesium/Core/Color";
import VerticalOrigin from 'cesium/Scene/VerticalOrigin'
import Ray from "cesium/Core/Ray";
import DistanceDisplayCondition from 'cesium/Core/DistanceDisplayCondition'
import Cartographic  from "cesium/Core/Cartographic";
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler';
import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType';
import buildModuleUrl from "cesium/Core/buildModuleUrl";
import {GeoDepository} from "../core/GeoDepository";
import GeoUtil from "../utils/GeoUtil";

/**********
 * 通视分析
 * @class Visibility
 * @param {Object} options 包含以下参数的选项
 * @param {String} [options.start] 观察点
 * @param {String} [options.end] 目标点
 * @param {Number} [options.width=2] 线宽
 * @param {Number} [options.extrudedHeight=0.8] 抬升高度，避免贴地。
 * @param {String} [options.visibleColor = '#008000'] 可见部分颜色,默认绿色
 * @param {String} [options.inVisibleColor = '#ff0000'] 不可见部分颜色，默认红色
 * @example
 *  let visibility = new BOSGeo.Visibility(options);
 */
class Visibility {
    constructor(options={}) {
        this.geomap = GeoDepository.geomap;
        this.viewer = GeoDepository.viewer;
        this.scene = this.viewer.scene;
        this.odLayer &&(this.geomap.layerManager.remove(this.odLayer));
        this.intersectPointLayer &&(this.geomap.layerManager.remove(this.intersectPointLayer));
        this.viewLineLayer &&(this.geomap.layerManager.remove(this.viewLineLayer));

        this.odLayer = this.geomap.layerManager.createPointLayer('_visiblePoint');
        this.intersectPointLayer = this.geomap.layerManager.createPointLayer('_intersect');
        this.viewLineLayer = this.geomap.layerManager.createLineLayer('_viewLine');
        let {start, end, width, visibleColor, inVisibleColor,extrudedHeight} = options;
        this.visibleColor = visibleColor || '#008000';
        this.inVisibleColor = inVisibleColor || '#ff0000';
        this.width = width || 2;
        this._start = start;
        this._end = end;
        this.extrudedHeight = extrudedHeight ||0.8;
        this._handlerActive=true;//激活状态参数
        this.addTip()
        this.addEventListener()
        if (this._start && this._end) {
            this.startAnalysis()
        }
    }
    /**
     * 添加提示信息
     * @private
     * @example
     *  let visibility = new BOSGeo.Visibility(options);
     *  visibility.addTip();
     */
    addTip() {
        let selectPanel = document.createElement('div');
        selectPanel.innerHTML = "<span id='cd_label' style='position:absolute;display : block;left:45%;top:10px;font-size:13px;text-align:center;font-family:微软雅黑;color:#edffff;'>左键先添加观察点,再左键可添加多个目标点，右键结束分析</span>"
        this.viewer.container.appendChild(selectPanel);
        this._selectPanel = selectPanel;
        // this.bindEvent()
    }

    /**
     * 添加事件监听
     * @private
     * @example
     *  let visibility = new BOSGeo.Visibility(options);
     *  visibility.addEventListener();
     */
    addEventListener() {
        // 深度开启或关闭
        this.viewer.scene.globe.depthTestAgainstTerrain = true ;
        let handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        this.handler = handler;
        handler.setInputAction((movement) => {
            let windowCoord = movement.position;
            let cartesian1 = this.viewer.scene.pickPosition(windowCoord);
            // let pos = GeoUtil.getPickPosition(windowCoord);
            let cartographic = Cartographic.fromCartesian(cartesian1);
            if (cartographic) {
                // this._tempLocation = cartesian;
                if (this._handlerActive){
                    if(!this._start){
                        let cartesian = Cartesian3.fromRadians(cartographic.longitude,cartographic.latitude,cartographic.height + this.extrudedHeight)
                        this._start = cartesian;
                        this.odLayer.removeAll();
                        this.addPoint(cartesian, true);
                    }else if(this._start){
                        let extrudedHeight = this.extrudedHeight >0.45 ? 0.45 : this.extrudedHeight
                        let cartesian = Cartesian3.fromRadians(cartographic.longitude,cartographic.latitude,cartographic.height + extrudedHeight)
                        this.addPoint(cartesian, false);
                        this._end = cartesian;
                        if (this._start && this._end) {
                            this.startAnalysis()
                        }
                    }
                }
            }
        }, ScreenSpaceEventType.LEFT_DOWN);
        //点击右键结束
        handler.setInputAction((movement) => {
            this._handlerActive =false;
            this._selectPanel.style.display = 'none';
        }, ScreenSpaceEventType.RIGHT_CLICK);

    }

    /*******
     * 为起止点面板添加监听事件
     * @private
     * @example
     *  let visibility = new BOSGeo.Visibility(options);
     *  visibility.bindEvent();
     */
    /*
    bindEvent() {
        this._selectPanel.oncontextmenu = () => {
            return false;
        };
        this._selectPanel.addEventListener('click', (e) => {
            if (!this._tempLocation) return;
            this._selectPanel.style.display = 'none';
            let tempLocation = this._tempLocation;
            tempLocation.z += 2;
            switch (e.target.parentNode.id) {
                case 'select-start-point':
                    if (this._start && this._end) {
                        this.clear();
                    }
                    this._start = tempLocation;
                    this.odLayer.removeAll();
                    this.addPoint(tempLocation, true);
                    break;
                case 'select-end-point':
                    this.addPoint(tempLocation, false);
                    this._end = tempLocation;
                    if (this._start && this._end) {
                        this.startAnalysis()
                    }
                    break;
            }
        }, false);
    };
    */

    /****
     * 添加起止点标志
     * @param {Cartesian3} position 点坐标
     * @param {Boolean} isStart true为起点照片,false为终点照片
     * @private
     * @example
     *  let visibility = new BOSGeo.Visibility(options);
     *  visibility.addPoint(position, isStart);
     * */
    addPoint(position, isStart) {
        let location = position instanceof Cartesian3 ? position : Cartesian3.fromDegrees(position[0], position[1], position[2]);
        this.odLayer.add({
            position: location,
            point:{
                color:isStart ? '#FFF':'#0000ff',
                pixelSize: 4
            }
            // billboard: {
            //     image: isStart ? this.StartMarkImg : this.EndMarkImg,
            //     scale: 2,
            //     verticalOrigin: VerticalOrigin.BOTTOM,
            //     distanceDisplayCondition: new DistanceDisplayCondition(0, 100000),
            //     disableDepthTestDistance: Number.POSITIVE_INFINITY
            // }
        })
        this.viewer.scene.requestRender();
    };
    /**
     * 添加可视线
     * @param {Cartesian3} start 起点
     * @param {Cartesian3} end 终点
     * @param {Boolean} isdash 线是否可见
     * @private
     * @example
     *  let visibility = new BOSGeo.Visibility(options);
     *  visibility.addViewLine(start,end,isdash);
     */
    addViewLine(start, end, isdash) {
        this.viewLineLayer.add({
            positions: [start, end],
            width: this.width,
            color: isdash ? this.visibleColor : this.inVisibleColor,
        });
    }
    /******
     * 开始通视分析
     * @private
     * @example
     *  let visibility = new BOSGeo.Visibility(options);
     *  visibility.startAnalysis();
     *
     */
    startAnalysis() {
        let direction = null;
        direction = Cartesian3.normalize(Cartesian3.subtract(this._end, this._start, new Cartesian3()), new Cartesian3());
        let ray = new Ray(this._start, direction);
        //相交的物体
        // let objectsToExclude = []
        let distance = Cartesian3.distance(this._start, this._end);
        //result相交的坐标
        let results = null;//清除
        results = this.scene.drillPickFromRay(ray);
        // 计算交互点，返回第一个
        // let result = this.viewer.scene.pickFromRay(ray);
        // let result=  this.scene.globe.pick(ray, this.scene);
        // results = [result]
        for (let i = 0; i < results.length; i++) {
            if (defined(results[i]) && defined(results[i].object)) {
                if (results[i].position) {
                    let distance1 = Cartesian3.distance(this._start, results[i].position);
                    if (distance1 < distance) {
                        this.addViewLine(this._start, results[i].position, true)
                        this.addViewLine(results[i].position, this._end)
                        break;
                    } else {
                        if (i === results.length - 1) {
                            this.addViewLine(this._start, this._end, true)
                        }
                    }
                } else if (!results[i].position && i === results.length - 1) {
                    this.addViewLine(this._start, this._end, true)
                }
            } else {
                this.addViewLine(this._start, this._end, true)
            }
            results.length === 0 && this.addViewLine(this._start, this._end, true)
        }
    }

    /*********
     * 添加相交的点
     * @param {Object} results 为射线检测的结果
     * @private
     * @example
     *  let visibility = new BOSGeo.Visibility(options);
     *  visibility.addIntersectPoint(results);
     */
    addIntersectPoint(results) {
        results.map(v => {
            this.intersectPointLayer.add({
                position: v.position,
                ellipsoid: {
                    radii: new Cartesian3(3.0, 3.0, 3.0),
                    material: Color.fromCssColorString(this.inVisibleColor)
                }
            })
        })
    }

    /**
     * 开始
     * @example
     * visibility.start();
     */
    start(){
        this.clear();
        this._handlerActive = true;
        this._selectPanel.style.display = 'block';
    }
    /*****
     * 清除标记图层，线图层，起止标识图层
     * @example
     *  let visibility = new BOSGeo.Visibility(options);
     *  visibility.clear();
     */
    clear() {
        if (this._start || this._end) {
            this._start =null;
            this._end =null;
        }
        this._handlerActive = false;
        this.odLayer && this.odLayer.removeAll();
        this.intersectPointLayer && this.intersectPointLayer.removeAll();
        this.viewLineLayer && this.viewLineLayer.removeAll();
        this._selectPanel && (this._selectPanel.style.display = 'none');
    }

    /****
     * 销毁
     * @example
     *  let visibility = new BOSGeo.Visibility(options);
     *  visibility.destory();
     */
    destory() {
        this.clear();
        if (this.handler) {
            this.handler.destroy();
            this.handler = null;
        }
        this.odLayer &&(this.clear(),this.geomap.layerManager.remove(this.odLayer));
        this.intersectPointLayer &&(this.geomap.layerManager.remove(this.intersectPointLayer));
        this.viewLineLayer &&(this.geomap.layerManager.remove(this.viewLineLayer));
        this.odLayer = null;
        this.intersectPointLayer=null;
        this.viewLineLayer = null;
        this._selectPanel = undefined;
        delete this;
    }
}

export default Visibility;