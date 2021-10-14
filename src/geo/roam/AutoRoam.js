import defaultValue from 'cesium/Core/defaultValue'
import CesiumMath from 'cesium/Core/Math'
import Cartesian3 from 'cesium/Core/Cartesian3'
import Cartographic from 'cesium/Core/Cartographic'
import EasingFunction from 'cesium/Core/EasingFunction'
import VideoRecord from '../utils/VideoRecord'

class AutoRoam {
    /**
     * 路径漫游(重构前的代码，待相关问题处理完毕后删除)
     * @alias AutoRoam
     * @constructor
	 * @private
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {Number} [options.speed=10] 漫游的速度；
     * @param {Number} [options.pitch=10] 漫游时的俯仰角，单位为度；
     * @param {Number} [options.roll=0] 漫游时的翻滚角，单位为度；
     * @param {Array<Number>} [options.positions=[]] [lon1, lat1, height1, lon2, lat2, height2]/ [lon1, lat2, lon1, lat2],经纬度单位为度，高度单位为米；
     * @param {Boolean} [options.positionWithHeight=false] 坐标数组是否带有高程；
     * @param {Array} [options.height=6] 漫游统一高度；
     * @param {Array} [options.playSpeed=1] 漫游播放速度；
     * @param {Array} [options.routeVisible=false] 是否显示漫游路径；
     * @param {Array} [options.requestAnimationFrameCallback] 动画请求更新事件回调函数；
     * @param {Function} [options.completeCallback] 路径漫游结束的回调函数；
     * @param {Function} [options.frameCallback] 路径漫游每一帧的回调函数；
     * @param {Boolean}  [options.videoExportAble = false]  是否录制视频，默认为false；
     * @param {Object} geomap geomap对象。
     * 
     * @example
	 * //Example 1.漫游
     * var geomap = new BOSGeo.AutoRoam({
     *  positions: [121.3559, 31.4611, 250.9,  121.356, 31.4592,250.3],
     *  positionWithHeight: true,
     * }, geomap);
	 * 
	 * @example
	 * //Example 2.进行路径漫游并录制漫游视频，然后导出
	 * 	let positions =  [
	 * 		116.981749, 36.6324,
	 * 		116.982747, 36.632305,
	 * 		116.982808, 36.632335,
	 * 		116.982808, 36.632335,
	 * 		116.983099, 36.631892,
	 * 		116.983099, 36.631888,
	 * 		116.983082, 36.63171,
	 * 		116.983077, 36.631706,
	 * 		116.983229, 36.63168, 
	 * 		116.983229, 36.63168,];
	 * 	let time = 0
	 * 	let autoRoamer = new BOSGeo.AutoRoam({
	 * 		positions:positions,
	 * 		speed:5,
	 * 		requestAnimationFrameCallback:e => {
	 * 			time += 16
	 * 			if(time / 1000 ==10){
	 * 				console.log('yes')
	 * 			}
	 * 		},
	 * 		videoExportAble:true
	 * 	},geomap);
	 * 	autoRoamer.start();
	 * 	//结束漫游后，导出视频
	 * 	setTimeout(()=>{
	 * 		autoRoamer.videoRecordExport()
	 * 	},10000)
	 */
    constructor(options, geomap) {
        this.geomap = geomap;
        this.initRoam(options, geomap);
        // this.lineLayer = geomap.layerManager.createLineLayer('_routeLineLayer');
    }

    /**
     * 播放速度
     * @property {Number}
     * @default 1
     */
    get playSpeed() {
        return this._playSpeed;
    }
    set playSpeed(val) {
        //取消漫游
        this.viewer.camera.cancelFlight();
        //赋值
        this._playSpeed = val;
        //重新计算飞行时间
        this.timeArray = this._timeArray  //取原始的时间数组
        let res = []
        this.timeArray.map(v => res.push(v / this.playSpeed))
        this.timeArray = res;
        //重新计算总时间
        this.sumTime = this._sumTime / this.playSpeed;
        setTimeout(e => {
            this.flyToKeyFrame()
        }, 100)
    }

    /**
     * 当前帧
     * @property {Number}
     * @default 0
     */
    get currentFrame() {
        return this._keyFrameNum;
    }
    set currentFrame(v) {
        this.viewer.camera.cancelFlight();
        this._keyFrameNum = v;

        setTimeout(e => {
            this.flyToKeyFrame()
        }, 100)
    }

    // /**
    //  * 路径点集
    //  * @property {Array}
    //  * @default []
    //  */
    // get _positons(){
    //     return this.positions
    // }
    // set _positons(p){
    //     if(p instanceof Array){
    //         this.positions =p;
    //         this.calcParamByPositionsSpeedWithPitch();
    //     }
    // }

    /**
     * 当前时间
     * @property {Number}
     * @default 0
     */
    get currentTime() {
        return this._currentTime;
    }
    set currentTime(v) {
        this.viewer.camera.cancelFlight();
        this._currentTime = v;
        this.isRoaming = false;
        this.createTweenByTime(v)
        // setTimeout(e => {
        //     this.flyToKeyFrame()
        // },100)
    }

    //
    /**
    * 根据时间计算当前时间所在的索引,时间轴调动时，传入的是时间.
    * @private
    * @param {Number} time
    */
    caculateStartIndexByTime(time) {
        let timeArr = this.timeArray, sum = 0, targetIndex, frameTime, duration;
        for (let i = 0; i < timeArr.length; i++) {
            sum += timeArr[i];
            if (sum > time) {
                targetIndex = i;
                break;
            }
        }
        //当前位置点已经走过的时长
        duration = sum - time;//剩余的时长
        frameTime = - duration + timeArr[targetIndex];
        return {
            startIndex: targetIndex,
            frameTime: frameTime,
            duration: duration
        };

    }

    /**
     * 根据time创建单个tween,compelete函数中增加其他链式回调
     * @private
     * @param {Number} time 时间
     */
    createTweenByTime(time) {
        //根据时间计算当前时间所在的索引，已经漫游过的时长和剩余的漫游时长
        let { startIndex, frameTime, duration } = this.caculateStartIndexByTime(time);
        let cameraPose = {
            x: CesiumMath.lerp(this.positions[startIndex].x, this.positions[startIndex - 1].x, frameTime * 1.0 / this.timeArray[startIndex]),
            y: CesiumMath.lerp(this.positions[startIndex].y, this.positions[startIndex - 1].y, frameTime * 1.0 / this.timeArray[startIndex]),
            z: CesiumMath.lerp(this.positions[startIndex].z, this.positions[startIndex - 1].z, frameTime * 1.0 / this.timeArray[startIndex]),
        }
        let camera = this.viewer.scene.camera
        camera.flyTo({
            destination: cameraPose,
            duration: duration,
            easingFunction: EasingFunction.LINEAR_NONE,
            complete: () => {
                this.isRoaming = true;
                this._keyFrameNum = startIndex + 1;
                console.log(this._keyFrameNum)
                this.flyToKeyFrame()
            },
            cancel: () => {
            }
        });
    }

    /**
     * 初始化
     * @private
     */
    initRoam(options, geomap) {
        const {
            speed = 10,
            pitch = 10,
            roll = 0,
            positions = [],
            positionWithHeight = false,
            height = 6,
            playSpeed = 1,
            routeVisible = false,
            requestAnimationFrameCallback,
            completeCallback,
            frameCallback,
            videoExportAble = false,
        } = options;
        this.speed = speed;  //漫游速度
        this.pitch = pitch;  //俯仰角
        this.roll = roll;
        this._playSpeed = playSpeed;
        this._complete = false; //表示路径漫游是否正常结束
        this.positionWithHeight = positionWithHeight;
        this.routeVisible = routeVisible;
        this.pitch = CesiumMath.toRadians(this.pitch);
        this.positions = positions;
        this.height = height;
        this.completeCallback = completeCallback;
        this.frameCallBack = frameCallback;
        this.timeArray = [];    // 分段时长
        this._timeArray = []; //原始分段时长存储
        this._sumTime = 0;//漫游总时长
        // this.headingArray = []; // 分段偏转角
        this.isRoaming = false;    // 是否正在漫游
        this.requestAnimationFrameCallback = requestAnimationFrameCallback

        this.videoExportAble = videoExportAble ;
        this.videoExportAble && (this.videoRecord = new VideoRecord()) ;
        //当前帧
        this._keyFrameNum = 0;
        this.viewer = geomap.viewer
        this._currentTime = 0;
        this.isRoaming = true
        if (this.routeVisible) {
            this.addRouteLine()
        }
        //首次进入需要计算视角旋转角度
        this.timeArray = [];    // 分段时长
        this.headingArray = []; // 分段偏转角
        this.rollList = []; //分段翻滚角
        this.pitchList = [];  //分段横滚角
        this.calcParamByPositionsSpeedWithPitch()
    }

    /**
     * 开始路径漫游
     * 
     * @example
     * roam.start();
     */
    start() {
        let camera = this.viewer.scene.camera
        let positions = this.positions;
        // this.headingArray = []; // 分段偏转角
        // this.rollList = []; //分段翻滚角
        // this.pitchList = [] ;  //分段横滚角
        camera.setView({
            destination: positions[0],
            orientation: {
                heading: this.headingArray[0],
                pitch: this.pitchList[0],
                roll: this.rollList[0],         // default value
            }
        });
        this.flyToKeyFrame();
        this.videoExportAble && this.videoRecord && this.videoRecord.state !== 'recording' && this.videoRecord.start();
    }

    /**
     * 暂停路径漫游
     * 
     * @example
     * roam.pause();
     */
    pause() {
        this.isRoaming = false;
        this.videoExportAble && this.videoRecord && this.videoRecord.pause();
        this.viewer.camera.cancelFlight();
    }

    /**
     * 继续路径漫游
     * 
     * @example
     * roam.continue();
     */
    continue() {
        this.isRoaming = true;
        this.videoExportAble && this.videoRecord && this.videoRecord.resume();
        this.flyToKeyFrame();
    }

    /**
     * 停止路径漫游
     * 
     * @example
     * roam.stop();
     */
    stop() {
        this.isRoaming = false;
        this._keyFrameNum = 0;
        this.viewer.camera.cancelFlight();
        // this.viewer.camera.flyTo({
        //     destination: this.positions[0]?this.positions[0]:Cartesian3.fromDegrees(113.103194, 23.029554, 1000),
        //     orientation: {
        //         heading: this.headingArray[0],
        //         pitch: this.pitchList[0] ||CesiumMath.toRadians(-90),
        //         roll: this.rollList[0] || 0
        //     },
        //     duration: 1,
        //     maximumHeight: this.height,
        // });
        this.videoExportAble && this.videoRecord && this.videoRecord.stop();
        this.completeCallback && this.completeCallback();
        // this.removeRouteLine();
    }

    /**
     * 漫游视频录制导出,Roam类初始化需要设置options.videoExportAble 为true，即录制漫游视频。
     * @param {String} [name='roam'] 名称
     * @param {String} type 下载视频文件后缀类型，支持'mp4'、'avi'，默认为'mp4'。
     * @example
     * roam.videoRecordExport('roam','mp4' );
     */
    videoRecordExport(name='roam',type = 'mp4'){
        this.videoExportAble && this.videoRecord && this.videoRecord.export(0 , name ,type);;
    }
    /**
     * 飞至结尾帧
     * @private
     */
    flyToKeyFrame() {
        if (this.isRoaming) {
            let keyFrameNum = this._keyFrameNum;
            if (keyFrameNum >= this.positions.length) {
                this._complete = true;
                return
            }

            let positions = this.positions;
            let headingArray = this.headingArray;
            let timeArray = this.timeArray;
            // console.log(this.timeArray)
            let camera = this.viewer.scene.camera
            camera.flyTo({
                destination: positions[keyFrameNum],
                orientation: {
                    heading: headingArray[keyFrameNum],
                    pitch: this.pitchList.length > 0 ? this.pitchList[keyFrameNum] : this.pitch,
                    roll: this.rollList.length > 0 ? this.rollList[keyFrameNum] : this.roll,
                },
                requestAnimationFrameCallback: this.requestAnimationFrameCallback,
                duration: timeArray[keyFrameNum],
                easingFunction: EasingFunction.LINEAR_NONE,
                complete: () => {
                    // 最后一个点时不再旋转相机
                    this.frameCallBack ? this.frameCallBack(keyFrameNum) : null
                    if (keyFrameNum === positions.length - 1) {
                        this._complete = true
                        this.stop();
                        return;
                    }
                    camera.flyTo({
                        destination: positions[keyFrameNum],
                        orientation: {
                            heading: headingArray[keyFrameNum + 1],
                            pitch: this.pitchList.length > 0 ? this.pitchList[keyFrameNum] : this.pitch,
                            roll: this.rollList.length > 0 ? this.rollList[keyFrameNum] : this.roll,
                        },
                        duration: timeArray[keyFrameNum + 1],
                        requestAnimationFrameCallback: this.requestAnimationFrameCallback,
                        easingFunction: EasingFunction.LINEAR_NONE,
                        complete: () => {
                            this._keyFrameNum++;
                            this.flyToKeyFrame();
                        }
                    });

                },
                cancel: () => {
                }
            });
        }
    }

    /**
     * 计算相下个点在当前出发点的朝向
     * @private
     * 
     * @param {Cartesian3} start
     * @param {Cartesian3} end
     * @return {Number} 角度
     */
    getRelativeNorthHeading(start, end) {
        if (start.equalsEpsilon(end, CesiumMath.EPSILON7)) return;
        var startCartogrpahic = Cartographic.fromCartesian(start);
        var endCartographic = Cartographic.fromCartesian(end);
        var tempCartesian = Cartesian3.fromRadians(startCartogrpahic.longitude, startCartogrpahic.latitude + 0.0001, startCartogrpahic.height);
        var subCartesian1 = Cartesian3.subtract(start, tempCartesian, new Cartesian3());
        var subCartesian2 = Cartesian3.subtract(start, end, new Cartesian3());
        var angle = Cartesian3.angleBetween(subCartesian1, subCartesian2);
        return startCartogrpahic.longitude > endCartographic.longitude ? -angle : angle;
    }

    /**
     * @private
     */
    calcParamByPositionsSpeedWithPitch() {
        let positions = this.positions,
            speed = this.speed;
        if (!positions || positions.length < 2) {
            throw new Error("positions为必填参数且数组长度必须大于等于2");
        }
        positions = positions[0] < -180 ? positions : this.positionWithHeight ? Cartesian3.fromDegreesArrayHeights(positions) : Cartesian3.fromDegreesArray(positions);
        let length = positions.length;
        this.positions = [];
        this.timeArray = [];
        this.headingArray = [];
        // 添加飞行到第一个点的默认heading、pitch
        this.headingArray.push(this.viewer.scene.camera.heading);
        let distanceArray = [];
        for (let i = 0; i < length - 1; ++i) {
            let cartesian1 = positions[i];
            let cartesian2 = positions[i + 1];
            let cartographic1 = Cartographic.fromCartesian(cartesian1);
            let cartographic2 = Cartographic.fromCartesian(cartesian2);
            let height1 = cartographic1.height > 0 ? cartographic1.height : this.height;
            let height2 = cartographic2.height > 0 ? cartographic2.height : this.height;
            cartesian1 = Cartesian3.fromRadians(cartographic1.longitude, cartographic1.latitude, height1);
            cartesian2 = Cartesian3.fromRadians(cartographic2.longitude, cartographic2.latitude, height2);
            this.positions.push(cartesian1);
            if (i === (length - 2)) {
                this.positions.push(cartesian2);
            }
            let distance = Cartesian3.distance(cartesian1, cartesian2);
            distanceArray.push(distance);
            let heading = this.getRelativeNorthHeading(cartesian1, cartesian2);
            // 如果返回undefined，说明为垂直向下或垂直向上的情况
            if (!heading) {
                heading = this.headingArray[i];
            }
            this.headingArray.push(heading);
        }
        // 添加飞行到第一个点的默认duration

        this._timeArray.push(0.8);
        this.timeArray.push(0.8 / this.playSpeed)
        // this._timeArray.push(0.1);
        // this.timeArray.push(0.1)
        for (let i = 0; i < distanceArray.length; i++) {
            this.timeArray.push(0.8 / this.playSpeed);
            this._timeArray.push(0.8);
            // this._timeArray.push(distanceArray[i] / speed)
            // this.timeArray.push(distanceArray[i] / speed/this.playSpeed);
        }
        this.sumTime = eval(this.timeArray.join("+"));
        this._sumTime = eval(this._timeArray.join("+"));
        this._sumFrameCount = this.timeArray.length
    }

    /**
     * 添加漫游路线
     * @private 
     */
    addRouteLine() {
        //通过线图层创建线
        this.lineLayer.add({
            positions: BOSGeo.Cartesian3.fromDegreesArrayHeights(this.positions),
            width: 5,
            material: BOSGeo.Color.fromRandom(),
            depthFailMaterial: BOSGeo.Color.fromRandom(),
            clampToGround: true
        });
    }

    /**
     * 移除所有漫游路线
     */
    removeRouteLine() {
        this.lineLayer.removeAll()
    }
}

export default AutoRoam