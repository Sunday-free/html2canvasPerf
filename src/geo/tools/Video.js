
import CustomDataSource from '../../cesium/DataSources/CustomDataSource'
import defaultValue from '../../cesium/Core/defaultValue'
import defined from '../../cesium/Core/defined'
import DeveloperError from '../../cesium/Core/DeveloperError'
import Cartesian3 from '../../cesium/Core/Cartesian3'
import Cartesian2 from '../../cesium/Core/Cartesian2'
import CallbackProperty from '../../cesium/DataSources/CallbackProperty'
import Rectangle from '../../cesium/Core/Rectangle'

import {GeoDepository} from "../core/GeoDepository";

/**
 * 添加视频展示
 * @ignore
 * @param {*} options 
 */
function Video (options) {
    options = options || {};
    if (!defined(options.position)) throw new DeveloperError('position is require!')
    if (!defined(options.url)) throw new DeveloperError('url is require!')
    this.position = options.position;

    if (options.type === 'img' && Object.prototype.toString.call(options.url) !== '[object Array]') throw new DeveloperError('images url must be array!')
    this.url = options.url; // 类型为img时  为url数组
    this.type = defaultValue(options.type, 'video'); // 类型为video img
    this.time = defaultValue(options.time, 3000); // 图片轮播时间间隔
    this.nowTime = ''; // 当前时间
    this.currentIndex = 0; // url数组下标  获取某个指定url

    this.videoType = defaultValue(options.videoType, 'video/mp4'); // 视频类型
    this.entityType = defaultValue(options.entityType, 'polygon'); // 播放视频的实体类型
    this.video = '';
    this.isRepeating = defaultValue(options.isRepeating, false); // 是否需要重复
    this.repeatNumx = defaultValue(options.repeatNumx, 8); // x方向的重复个数
    this.repeatNumy = defaultValue(options.repeatNumy, 8); // y方向的重复个数
    this.circlePlay = defaultValue(options.circlePlay, false); // 是否自动播放

    this.formArray = defaultValue(options.formArray, false); // 是否含高度的经纬度数组
    this.dataSource = ''; // 实体资源
    this.entity = ''; // 添加的实体

    this.init();
}

/**
 * 初始化容器
 */
Video.prototype.init = function () {
    this.dataSource = new CustomDataSource('screen');
    GeoDepository.viewer.dataSources.add(this.dataSource);
    if (this.type === 'video') { // 播放视频
        this.createElement();
        this.repeatPlay();
        this.repeat();
    }
    this.addEntity(this.entityType, this.dataSource);
}

/**
 * 创建video
 */
Video.prototype.createElement = function () {
    this.video = document.createElement('video');
    this.video.className = 'model-video';
    // play() failed because the user didn't interact with the document first.
    this.video.muted="muted";


    let source = document.createElement('source');
    source.type = this.videoType;
    source.src = this.url;

    this.video.appendChild(source);
    GeoDepository.viewer.container.appendChild(this.video);
}

/**
 * 添加实体
 */
Video.prototype.addEntity = function (type, dataSource) {
    let position = this.position;
    dataSource.entities.removeAll();
    let material = this.type === 'video' ? this.video : this.url[0];
    switch(type){
        case 'rectangle':
            this.entity = dataSource.entities.add({
                rectangle : {
                    coordinates : Rectangle.fromDegrees(position[0], position[1], position[2], position[3]),
                    material : material
                }
            })
        break;
        case 'ellipsoid':
            this.entity = dataSource.entities.add({
                position : Cartesian3.fromDegrees(position[0], position[1], position[2]),
                ellipsoid : {
                    radii : new Cartesian3(1000, 1000, 1000),
                    material : material
                }
            })
        break;
        case 'polygon':
            let hierarchy = position[0] instanceof Cartesian3 ? position : this.formArray ? Cartesian3.fromDegreesArray(position) : Cartesian3.fromDegreesArrayHeights(position);
            this.entity = dataSource.entities.add({
                polygon : {
                    hierarchy : {
                        positions: hierarchy
                    },
                    material : material
                }
            })
    }
}

/**
 * 材质重复
 */
Video.prototype.repeat = function () {
    if (!this.entity) return;
    let that = this;
    this.entity[this.entityType].material.repeat = new CallbackProperty(function(time, result) {
        if (!defined(result)) {
            result = new Cartesian2();
        }
        if (that.isRepeating) {
            result.x = that.repeatNumx;
            result.y = that.repeatNumy;
        } else {
            result.x = 1;
            result.y = 1;
        }
        return result;
    }, false);
}

/**
 * 循环播放
 */
Video.prototype.repeatPlay = function () {
    let that = this;
    if (!this.video) return;
    this.video.addEventListener("ended", function() {//为vedio添加ended监听，当视频播放完毕后执行对应函数
        if(that.circlePlay) {
            that.play();
        }
    })
}
/**
 * 视频播放
 */
Video.prototype.play = function () {
    switch(this.type){
        case 'video':
            // Uncaught (in promise) DOMException
            if (!this.video) return;
            this.video.load()
            let playPromise = this.video.play()
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.video.play()
                }).catch((e)=> {
                    throw new DeveloperError(e)
                })
            }
            break;
        case 'img':
            this.playImg();
            break;
    }
}

/**
 * 播放图片
 */
Video.prototype.replaceMaterial = function (url) {
    // GeoDepository.scene.requestRender();
    this.entity[this.entityType].material = url;
}

/**
 * 轮播图片
 */
Video.prototype.playImg = function () {
    let date = new Date();
    if (!this.nowTime) this.nowTime = date;
    if (date - this.nowTime > this.time) {
        this.replaceMaterial(this.url[this.currentIndex]);
        this.currentIndex++;
        if (this.currentIndex >= this.url.length) this.currentIndex = 0;
        this.nowTime = date;
    }
    requestAnimationFrame( () => {
        this.playImg();
    })
}

/**
 * 销毁视频
 */
Video.prototype.destroyed = function () {
    this.dataSource.entities.removeAll();
    this.video && GeoDepository.viewer.container.removeChild(this.video);
    this.video = '';
    this.entity = '';
    this.type = 'video/mp4';
    this.entityType = 'polygon';
    this.formArray = false;
    this.isRepeating = false;
    this.repeatNumx = 8;
    this.repeatNumy = 8;
}
/**
 * 视频暂停
 */
Video.prototype.pause = function () {
    if (!this.video) return;
    this.video.pause();
}

export {
    Video
}