import CesiumMath from 'cesium/Core/Math'
import Cartesian3 from 'cesium/Core/Cartesian3'
import Cartographic from 'cesium/Core/Cartographic'
import EasingFunction from 'cesium/Core/EasingFunction'
import VideoRecord from '../utils/VideoRecord'
import Transforms from 'cesium/Core/Transforms';
import Matrix4 from "cesium/Core/Matrix4";
import GeoUtil from '../utils/GeoUtil';


class Roam {
    /**
     * 路径漫游（自动漫游）
     * @alias Roam
     * @constructor
     * 
     * @param {Object} options 包含以下参数的Object对象：
     * @param {Array<Number>} [options.positions=[]] [lon1, lat1, height1, lon2, lat2, height2]/ [lon1, lat2, lon1, lat2],经纬度单位为度，高度单位为米；
     * @param {Boolean} [options.positionWithHeight=false] 坐标数组是否带有高程；
     * @param {Array} [options.height=1.2] 漫游路径高度小于等于0位置的修正高度;当设置该参数为-9999时使用未修正的真实高度；
     * @param {Array} [options.playSpeed=1] 漫游播放速度；
     * @param {Array} [options.requestAnimationFrameCallback] 动画请求更新事件回调函数；
     * @param {Function} [options.completeCallback] 路径漫游结束的回调函数；
     * @param {Function} [options.frameCallback] 路径漫游每一帧的回调函数；
     * @param {Boolean}  [options.videoExportAble = false]  是否录制视频，默认为false；
     * @param {Object} geomap geomap对象。
     * 
     * @example
	 * //Example 1.漫游
     * var geomap = new BOSGeo.Roam({
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
	 * 	let autoRoamer = new BOSGeo.Roam({
	 * 		positions:positions,
	 * 		playSpeed:5,
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
    }

    /**
     * 漫游播放速度
     * @property {Number}
     * @default 1
     */
    get playSpeed() {
        return this._playSpeed;
    }
    set playSpeed(val) {
        this._playSpeed = val;
        this.computeRoamTime();
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
            positions = [],
            positionWithHeight = false,
            height = 1.2,
            playSpeed = 1,
            requestAnimationFrameCallback,
            completeCallback,
            frameCallback,
            videoExportAble = false,
        } = options;
        this._playSpeed = playSpeed;
        this._complete = false; //表示路径漫游是否正常结束
        this.positionWithHeight = positionWithHeight;
		this._positions = positions;
        this.positions = positions;
        this.height = height;
        this.completeCallback = completeCallback;
        this.frameCallBack = frameCallback;
        this.isRoaming = false;    // 是否正在漫游
        this.requestAnimationFrameCallback = requestAnimationFrameCallback

        this.videoExportAble = videoExportAble ;
        this.videoExportAble && (this.videoRecord = new VideoRecord()) ;
        //当前帧
        this._keyFrameNum = 0;
        this.viewer = geomap.viewer
        this._currentTime = 0;
        //首次进入需要计算视角旋转角度
        this.headingArray = []; // 分段偏转角
        this.pitchList = [];  //分段横滚角
        this.calcParamByPositionsSpeedWithPitch()
    }

    /**
     * 计算漫游时间
     * @private
     * @returns {Number} 事件
     */
    computeRoamTime() {
        this.roamTime = 0;
		this.walkTimeArray = [];
		this.switchTimeArray = [];
        let minTime = 0.8 / this._playSpeed;//飞行

        for(let i = 0; i < this.positions.length - 2; i++) {
            let t = 0.4 * this.distanceArray[i] / this._playSpeed;
            t = t < minTime ? minTime : t;
            this.roamTime += t;
			this.walkTimeArray.push(t);

			let st = this.switchDirectionTime * (180 - this.angleArray[i]) / 20;
            // this.roamTime += st;
			this.switchTimeArray.push(st);
        } 
        let t = 0.4 * this.distanceArray[this.positions.length - 2] / this._playSpeed;//最后一个点不再切换相机方向
        t = t < minTime ? minTime : t;
        this.roamTime += t;
		this.walkTimeArray.push(t);
		this.sumTime = this._sumTime = this.roamTime;

        return this.roamTime
    }

    /**
     * 计算三点之间的夹角
     * @private
     * @param {Cartesian3} origin 中间点
     * @param {Cartesian3} carteisan1 三点连线的一个端点
     * @param {Cartesian3} cartesian2 三点连线的另一端点
     */
    getAngles(origin, carteisan1, cartesian2) {
        
        let OA = Cartesian3.distance(origin, carteisan1);
        let OB = Cartesian3.distance(origin, cartesian2);
        let AB = Cartesian3.distance(carteisan1, cartesian2);

        let cosAngle = (OA * OA + OB * OB - AB * AB) / (OA * OB * 2);

        let angle = Math.acos(cosAngle);

        const PI = Math.PI;

        angle = angle * 180 / PI;

        return angle;
    }
    

    /**
     * 开始路径漫游
     * @param {Number} [distanceThreshold = 0.3] 当漫游路径两点间距离小于该值时忽略第二个点，为0(m)时则保留所有点，单位为米。
     * @param {Number} [switchDirectionTime = 0.7] 相机飞向下一点切换方向的时间，单位为秒。
     * @example
     * roam.start();
     */
    start(distanceThreshold = 0.3, switchDirectionTime = 0.7) {
		this.switchDirectionTime = switchDirectionTime;
        //若两点之间distance变化小，则删除中间点部分，避免相机不正常左右摇摆
        let positions = this.positions;
        let headingArray = this.headingArray;
        let distanceArray = this.distanceArray;
        for(let i = 0; i < headingArray.length; i++) {
            if(headingArray[i] === undefined || distanceArray[i] < distanceThreshold) {
				if (i !== headingArray.length - 1) {
					positions.splice(i+1, 1);
					
					let distance = Cartesian3.distance(positions[i], positions[i+1]);
					distanceArray.splice(i, 2, distance);
					let heading = this.getHeading(positions[i], positions[i+1]);
					headingArray.splice(i, 2, heading);
					i--;
				} else {//最后一点保留，删除前一个点
					positions.splice(i, 1);
					let distance = Cartesian3.distance(positions[i - 1], positions[i]);
					distanceArray.splice(i - 1, 2, distance);
					let heading = this.getHeading(positions[i - 1], positions[i]);
					headingArray.splice(i - 1, 2, heading);
					i--;
				}
            }
        }

        this.angleArray = [];
        for(let i = 1; i < positions.length - 1; i++) {
            let angle = this.getAngles(positions[i], positions[i-1], positions[i+1]);
            this.angleArray.push(angle);
        }

		if (!this.pitchList.length) {//如果外部不传入俯仰角数组的话，需要进行计算
			for(let i = 0; i < positions.length - 1; i++) {
				let pitch = this.getPitch(positions[i], positions[i+1]);
				pitch = pitch > 0 ? pitch / 3 : pitch; //实际测试效果较好，避免俯仰角过大
				this.pitchList.push(pitch);
			}
		}

        this.computeRoamTime();
        let camera = this.viewer.scene.camera;
        camera.setView({
            destination: positions[0],
            orientation: {
                heading: this.headingArray[0],
                pitch: this.pitchList[0],
                roll: 0,         
            }
        });
        this.isRoaming = true;
		this._complete = false;
		this._keyFrameNum = 0;
		this._sumFrameCount = positions.length - 1;
		this.romedTime = 0;
        this.flyToKeyFrame(switchDirectionTime);
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
		let camera = this.viewer.camera
        camera.cancelFlight();

		this.pauseCameraPosition = new Cartesian3();
		camera.position.clone(this.pauseCameraPosition);
		this.pauseCameraHeading = camera.heading;
		this.pauseCameraPitch = camera.pitch;
    }

    /**
     * 继续路径漫游
     * 
     * @example
     * roam.continue();
     */
    continue() {
		if(this._complete) {
			this.start();
		}else if(!this.isRoaming) {
			this.isRoaming = true;
			this.videoExportAble && this.videoRecord && this.videoRecord.resume();
			this.updateTime = true;

			this.viewer.camera.setView({
				destination: this.pauseCameraPosition,
				orientation: {
					heading: this.pauseCameraHeading,
					pitch: this.pauseCameraPitch,
					roll: 0
				}
			});
			this.flyToKeyFrame();
		}
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

        this.videoExportAble && this.videoRecord && this.videoRecord.stop();
        this.completeCallback && this.completeCallback();
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
     * 飞至关键帧
     * @private
     */
    flyToKeyFrame(switchDirectionTime = 0.7) {
        if (this.isRoaming) {
            let keyFrameNum = this._keyFrameNum;
            if (keyFrameNum >= this.positions.length) {
                this._complete = true;
                return
            }
            
            let positions = this.positions;
            let headingArray = this.headingArray;
            let distanceArray = this.distanceArray;
            let camera = this.viewer.scene.camera;
            let duraTime;
            if(!this.updateTime) {
                duraTime = 0.4 * distanceArray[keyFrameNum] / this._playSpeed;
            } else { //暂停后继续需要更新距离、时间
                this.updateTime = false;
                let position = camera.position;
                let distance = Cartesian3.distance(position, positions[keyFrameNum + 1]);
                duraTime = 0.4 * distance / this._playSpeed;
            }
            let minTime = 0.8 / this._playSpeed;
            camera.flyTo({
                destination: positions[keyFrameNum + 1],
                orientation: {
                    heading: headingArray[keyFrameNum],
                    pitch: this.pitchList[keyFrameNum],
                    roll: 0,
                },
                requestAnimationFrameCallback: this.requestAnimationFrameCallback,
                duration: duraTime < minTime ? minTime : duraTime,
                easingFunction: EasingFunction.LINEAR_NONE,
                complete: () => {
                    // 最后一个点时不再旋转相机
                    this.frameCallBack ? this.frameCallBack(keyFrameNum) : null
                    if (keyFrameNum === positions.length - 2) {
                        this._complete = true
                        this.stop();
                        return;
                    } 
                    camera.flyTo({
                        destination: positions[keyFrameNum + 1],
                        orientation: {
                            heading: headingArray[keyFrameNum + 1],
                            pitch: this.pitchList[keyFrameNum + 1],
                            roll: 0,
                        },
                        duration: switchDirectionTime * (180 -this.angleArray[keyFrameNum]) / 20,
                        requestAnimationFrameCallback: this.requestAnimationFrameCallback,
                        easingFunction: EasingFunction.LINEAR_NONE,
                        complete: () => {
							this.frameCallBack ? this.frameCallBack(keyFrameNum) : null
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
     * 计算carteisan1点朝向cartesian2点的heading值
     * @private
     * @param {Cartesian3} carteisan1 前一个点
     * @param {Cartesian3} cartesian2 将要飞向的后一个点
     * @returns {Number} heading值
     */
    getHeading(cartesian1, cartesian2) {
        //以carteisan1点为原点建立局部坐标系（东方向为x轴,北方向为y轴,垂直于地面为z轴），得到一个局部坐标到世界坐标转换的变换矩阵
        let localToWorld_Matrix = Transforms.eastNorthUpToFixedFrame(cartesian1);
        //求世界坐标到局部坐标的变换矩阵
        let worldToLocal_Matrix = Matrix4.inverse(localToWorld_Matrix, new Matrix4());       
        //carteisan1点在局部坐标的位置，其实就是局部坐标原点
        let localPosition_A = Matrix4.multiplyByPoint(worldToLocal_Matrix, cartesian1.clone(), new Cartesian3());
        //cartesian2点在以carteisan1点为原点的局部的坐标位置
        let localPosition_B = Matrix4.multiplyByPoint(worldToLocal_Matrix,cartesian2.clone(), new Cartesian3());

        let dy = (localPosition_B.y - localPosition_A.y);
        let dx = (localPosition_B.x - localPosition_A.x);
        if(dy === 0 & dx === 0) {
            return undefined;
        }
        //弧度
        const PI = Math.PI;
        let angle = Math.atan2(dy, dx)
        // 由于cesium中的heading值为0时指向North，因此需要做如下计算进行转换
        angle = -angle;
        if (angle < 0) {
            angle += (PI * 5 / 2);
            if (angle > (PI * 2)) {
                angle -= (PI * 2);
            }
        } else {
            angle += (PI / 2);
        }

        //角度
        let theta = angle*(180/PI);
        if (theta < 0) {
            theta = theta + 360;
        }
        return angle;
    }


    /**
     * 计算carteisan1点朝向cartesian2点的pitch值
	 * @private
     * @param {Cartesian3} cartesian1 前一个点
     * @param {Cartesian3} cartesian2 将要飞向的后一个点
     */
    getPitch(cartesian1, cartesian2) {
        //以carteisan1点为原点建立局部坐标系（东方向为x轴,北方向为y轴,垂直于地面为z轴），得到一个局部坐标到世界坐标转换的变换矩阵
        let localToWorld_Matrix = Transforms.eastNorthUpToFixedFrame(cartesian1);
        //求世界坐标到局部坐标的变换矩阵
        let worldToLocal_Matrix = Matrix4.inverse(localToWorld_Matrix, new Matrix4());       
        //carteisan1点在局部坐标的位置，其实就是局部坐标原点
        let localPosition_A = Matrix4.multiplyByPoint(worldToLocal_Matrix, cartesian1.clone(), new Cartesian3());
        //cartesian2点在以carteisan1点为原点的局部的坐标位置
        let localPosition_B = Matrix4.multiplyByPoint(worldToLocal_Matrix,cartesian2.clone(), new Cartesian3());

        let dz = (localPosition_B.z - localPosition_A.z);

        let sinAngle = dz / Cartesian3.distance(cartesian1, cartesian2);

        let angle = Math.asin(sinAngle);

        // angle = angle * 180 / Math.PI;
        return angle;
    }

    /**
     * 更新漫游路径坐标
     * @param {Array<Number>} positions 经纬度（度）和高程（米）组成的数组
     * @example
     *   let newPositions = [116.38957932,39.90649715,0,116.38957293215105,39.90652696401454,1.2,116.39125252362987,39.906547534047625,1.2,116.39271428804453,39.90659525673602,1.2,116.39271602,39.90661012,0];
     *   autoRoam.update(newPositions);
     */
    update(positions) {
        if(this.isRoaming){
            this.stop();
        }
        if(!positions) {
            console.error('请输入有效的位置信息！');
            return;
        };
        this.positions = positions;
        this.calcParamByPositionsSpeedWithPitch();
    }


    /**
     * 计算路径坐标、距离、heading等信息
     * @private
     */
    calcParamByPositionsSpeedWithPitch() {
        let positions = this.positions;
        if (!positions || positions.length < 2) {
            throw new Error("positions为必填参数且数组长度必须大于等于2");
        }
        positions = positions[0] < -180 ? positions : this.positionWithHeight ? Cartesian3.fromDegreesArrayHeights(positions) : Cartesian3.fromDegreesArray(positions);
        let length = positions.length;
        this.positions = [];
        this.timeArray = [];
        this.headingArray = [];
        let distanceArray = [];
        for (let i = 0; i < length - 1; ++i) {
            let cartesian1 = positions[i];
            let cartesian2 = positions[i + 1];
            let cartographic1 = Cartographic.fromCartesian(cartesian1);
            let cartographic2 = Cartographic.fromCartesian(cartesian2);
            let height1,height2;
            if(this.height !== -9999){
                height1 = cartographic1.height > 0 ? cartographic1.height : this.height;
                height2 = cartographic2.height > 0 ? cartographic2.height : this.height;
            } else {
                height1 = cartographic1.height;
                height2 = cartographic2.height;
            }
            cartesian1 = Cartesian3.fromRadians(cartographic1.longitude, cartographic1.latitude, height1);
            cartesian2 = Cartesian3.fromRadians(cartographic2.longitude, cartographic2.latitude, height2);
            this.positions.push(cartesian1);
            if (i === (length - 2)) {
                this.positions.push(cartesian2);
            }
            let distance = Cartesian3.distance(cartesian1, cartesian2);
            distanceArray.push(distance);
            let heading = this.getHeading(cartesian1, cartesian2);
            // 如果返回undefined，说明为垂直向下或垂直向上的情况
            if (!heading) {
                heading = this.headingArray[i];
            }
            this.headingArray.push(heading);
        }
        // 添加飞行到第一个点的默认duration
        this.distanceArray = distanceArray;
    }
}

export default Roam