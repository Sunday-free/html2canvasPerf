import defaultValue from "cesium/Core/defaultValue";
import { GeoDepository } from "../core/GeoDepository";
import FileUtil from "./FileUtil";

/**
 * 录制视频类，录制geo地图场景浏览视频。
 * @param {Object} options
 * @param {Number} [options.fps = 10] 录制的帧频率(FPS)
 * @example
	//通过视频录制类录制自己想要的内容
	let videoRecord = new BOSGeo.VideoRecord();
	videoRecord.start()
		setTimeout(()=>{
		//结束录制并导出视频
		videoRecord.stop();
		videoRecord.export();
	},10000)
 */
class VideoRecord{
    /**
     *
     * @param options
     */
    constructor(options  = {}){
        this.fps = defaultValue(options.fps , 10)// 设置帧频率(FPS)
        const mediaStream = GeoDepository.viewer.canvas.captureStream(this.fps);
        if(!this.mediaRecord){
            this.mediaRecord = new MediaRecorder(mediaStream, {
                videoBitsPerSecond: 8500000
            })
        }
        this.chunksList = []; //记录各个漫游的数据
        this.comleteList = [];
        this.comleteList[0] = false;
        this.createRecord(0,this.fps);
    }

    /**
     * 创建初始化
     * @param {Number} idx  录制数据索引值
     * @param {Number} [FPS =10]   帧频率
     * @private
     */
    createRecord  (idx,fps=10) {
        if(!this.chunksList[idx]){
            this.chunksList[idx] = new Set();
        }
        // !this.chunks && (this.chunks = new Set());
        if(!this.mediaRecord){
            this.mediaRecord = new MediaRecorder(GeoDepository.viewer.canvas.captureStream(fps), { // 设置帧频率(FPS)
                videoBitsPerSecond: 8500000
            })
        }
        this.mediaRecord.ondataavailable = (e) => { // 接收数据
            // this.chunks.add(e.data)
            if(!this.comleteList[idx]){
                this.chunksList[idx].add(e.data)
            }
        };
        this.mediaRecord.onstop = (e) => { // 结束并接收数据
            this.comleteList[idx] = true
        };
    }
    /**
     * 开始录制
     * @param {Number} idx  录制数据索引值
     * @example
     * videoRecord.start();
     */
    start (idx=0){
        this.chunksList.length > idx && this.chunksList[idx] && (this.chunksList[idx].clear() );
        this.comleteList.length > idx && this.comleteList[idx] && (this.comleteList[idx] = false);
        this.mediaRecord && this.mediaRecord.start();
    }
    /**
     * 暂停录制
     * @example
     * videoRecord.pause();
     */
    pause  (){
        this.mediaRecord && this.mediaRecord.state != 'inactive' && this.mediaRecord.pause();
    }
    /**
     * 继续录制
     * @example
     * videoRecord.resume();
     */
    resume  (){
        this.mediaRecord && this.mediaRecord.state != 'inactive' &&  this.mediaRecord.resume();
    }
    /**
     * 停止录制
     * @example
     * videoRecord.stop();
     */
    stop  (){
        this.mediaRecord && this.mediaRecord.state != 'inactive' && this.mediaRecord.stop() ;
    }

    /**
     * 视频录制导出，需已进行视频录制，录制长度为0（无数据）时则不会导出。
     * @param {Number} [idx =0]  录制数据索引值
     * @param {String} [name='未命名'] 名称
     * @param {String} [type='mp4'] 下载视频文件后缀类型，支持'mp4'、'avi'，默认为'mp4'。
     * @example
     * videoRecord.export (0,'rome', 'mp4');
     */
    export (idx=0,name ='未命名',type = 'mp4')  {
        this.isExport = true;
        if(!this.mediaRecord) return;
        let videoExport =()=>{
            this.isExport = false;
            let itype = type ==='avi' ? 'video/x-sgi-movie' : 'video/mp4';
            const videoBlob = new Blob(this.chunksList[idx], { 'type' : itype });
            if(videoBlob.size !== 0){
                let videoUrl = window.URL.createObjectURL(videoBlob);
                // let name=this.props.routeList[idx].name
                FileUtil.videoDownload(name,videoUrl,type)
            }else {
                console.warn('录制时间过短，文件为空！')
            }
        }
        setTimeout(function() {
            if (this.chunksList.length > idx && this.chunksList[idx]) {
                if (this.mediaRecord.state != 'inactive') {
                    this.mediaRecord.stop()
                    this.mediaRecord.onstop = (e) => { // 结束并接收数据
                        this.comleteList[idx] = true
                        if (this.isExport) {
                            videoExport();
                        }
                    };
                } else {
                    videoExport();
                }
            }
        }.bind(this),500)

    }

    /**
     * 清除之前录制数据
     * @example
     * videoRecord.clear();
     */
    clear(){
        this.chunksList = [];
        this.comleteList = [];
    }

}
export default VideoRecord;
