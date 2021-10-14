import isCrossOriginUrl from "cesium/Core/isCrossOriginUrl";
import buildModuleUrl from "cesium/Core/buildModuleUrl";
import StorageCache from 'cesium/Extend/Cache/StorageCache.js';
import ImageType from "../constant/ImageType";
import { GeoDepository } from "../core/GeoDepository";
import Canvas2Image from "./Canvas2image";
/**
 * 常用文件资源处理工具类
 * @constructor
 */
function FileUtil() {}

/**
 * 视频下载方法
 * @param {String} name 名称
 * @param {String} videoUrl 下载地址
 * @param {String} type 下载视频文件后缀类型，支持'mp4'、'avi'，默认为'mp4'
 * @private
 */
FileUtil.videoDownload = function (name, videoUrl, type = "mp4") {
    !name && (name = "未命名");
    var a = document.createElement("a");
    a.href = videoUrl;
    if (type === "avi") {
        a.download = name + ".avi";
    } else {
        a.download = name + ".mp4";
    }
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
};

/**
 * 将字符串打包下载
 *
 * @param {String} fileName 下载的文件名称，包含后缀名，如‘config.json’
 * @param {String} string 下载的文件主体
 * @ignore
 */
FileUtil.downloadFile = function (fileName, string) {
    let blob = new Blob([string]);
    download(fileName, blob);
};

/**
 * 将对象打包下载
 * @private
 * @param {Object} content 下载的文件主体内容
 * @param {String} fullFuleName 下载文件的完整名称，包括后缀名
 * @param {String} [mimeType='application/json']  要导出下载文件的MIME类型字符串
 */
FileUtil.downloadObjectFile = function (content, fullFuleName, mimeType = "application/json") {
    const blobContent = new Blob([JSON.stringify(content, null, 2)], {
        type: mimeType
    });
    download(fullFuleName, blobContent);
};

/**
 * 导出json文件
 * @param {Object} data 要导出的数据
 * @param {String} filename 要导出的文件名称
 * @example
 * 	let person = {
 * 		name: 'james',
 * 		age: 20
 * 	}
 *	BOSGeo.FileUtil.saveJSON(person, 'per');
 */
FileUtil.saveJSON = function (data, filename) {
    if (!data) {
        alert("保存的数据为空");
        return;
    }
    if (!filename) filename = "json.json";
    if (typeof data === "object") {
        data = JSON.stringify(data, undefined, 4);
    }
    var blob = new Blob([data], { type: "text/json" }),
        e = document.createEvent("MouseEvents"),
        a = document.createElement("a");
    a.download = filename + '.json';
    a.href = window.URL.createObjectURL(blob);
    a.dataset.downloadurl = ["text/json", a.download, a.href].join(":");
    e.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    a.dispatchEvent(e);
};
/**
 * 获取url的后缀名
 * @ignore
 */
FileUtil.getSuffixName = function (url) {
    return url.substring(url.lastIndexOf(".") + 1);
};

/**
 * 获取文件名
 * @private
 */
FileUtil.getFileName = function (str) {
    return str.substring(0, str.indexOf("."));
};

/**
 * 获取指定js的加载路径
 * @ignore
 */
FileUtil.retrieveUrl = function (filename) {
    let scripts = document.getElementsByTagName("script");
    if (!scripts || scripts.length === 0) return;

    for (let i = 0; i < scripts.length; i++) {
        let script = scripts[i];
        if (script.src && script.src.match(new RegExp(filename + "\\.js$"))) {
            return script.src.replace(new RegExp("(.*)" + filename + "\\.js$"), "$1");
        }
    }
};

/**
 * 获取跨域url
 * @ignore
 */
FileUtil.getUrlfromCors = function (arg) {
    var url = buildModuleUrl(arg);
    if (isCrossOriginUrl(url)) {
        // to load cross-origin, create a shim worker from a blob URL
        var script = 'importScripts("' + url + '");';

        var blob;
        try {
            blob = new Blob([script], {
                type: "application/javascript"
            });
        } catch (e) {
            var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
            var blobBuilder = new BlobBuilder();
            blobBuilder.append(script);
            blob = blobBuilder.getBlob("application/javascript");
        }
        url = URL.createObjectURL(blob);
    }

    return url;
};

/**
 * 保存为图片并下载
 * @ignore
 */
FileUtil.canvasToPNG = function (name = "未命名快照", canvas = GeoDepository.viewer.canvas) {
    var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    var link = document.createElement("a");
    var blob = dataURLtoBlob(image);
    var objurl = URL.createObjectURL(blob);
    link.download = name ? name : "pic.png";
    link.href = objurl;
    link.click();
};

// 快照常量设置
const StorageSetting = {
    store: "canvas2Img",
    version: 1,
    dbName: "imgList",
};

// 记录快照图片数据
 const storage = new StorageCache({
    store: StorageSetting.store,
    version: StorageSetting.version,
    dbName: StorageSetting.dbName, // 地图缓存库名称
});

 /**
  * 创建当前地图视图快照，然后存入浏览器缓存中（indexDB）
  * @param {String} id 快照id
  * @param {Number} width 图片缩放宽
  * @param {Number} height 图片缩放高
  * @param {Object} [canvas=geomap.viewer.canvas] HTMLCanvasElement对象,默认采用当前实例化的地图对象
  * @returns {Promise} 返回promise
  * @example
  * let id = BOSGeo.Util.generateUUID();
  * BOSGeo.FileUtil.createOrUpdateSnapShot(id, 1920, 1080).then(() => {
  *     console.log("存储成功");
  *   })
  *   .otherwise((e) => {
  *     console.log("存储失败", e);
  *   });
  */
FileUtil.createOrUpdateSnapShot= function(id, width, height, canvas = GeoDepository.viewer.canvas ){
    var w = canvas.width,
      h = canvas.height;
    var retCanvas = document.createElement("canvas");
    var retCtx = retCanvas.getContext("2d");
    retCanvas.width = width;
    retCanvas.height = height;
    // 将屏幕大小的图片数据存入indexDB中
    retCtx.drawImage(canvas, 0, 0, w, h, 0, 0, width, height);
    return storage.put(id, retCanvas.toDataURL("image/png"), StorageSetting.store)
}

/**
 * 从浏览器缓存（indexDB）中删除特定快照
 * @param {String} id 快照id
 * @example
 * BOSGeo.FileUtil.deleteSnapShot(id);
 */
FileUtil.deleteSnapShot = function(id){
    storage.delete(id, StorageSetting.store);
}

/**
 * 从浏览器缓存（indexDB）中获取特定快照
 * @param {String} id 快照id
 * @returns {Promise} 返回promise
 * @example
 * BOSGeo.FileUtil.getSnapShot(id);
 */
FileUtil.getSnapShot = function(id){
    return storage.get(id, StorageSetting.store);
}

/**导出当前地图视图的快照，可以保存图片到本地也可以返回base64的图片对象
 * @param {Object} [options] 包含以下参数的Object对象:
 * @param {String} [options.name="未命名快照"] 快照名称;
 * @param {String} [options.type= ImageType.PNG] 导出格式，默认为png;
 * @param {Array<Number>} [options.imageSize] 图片长宽尺寸，默认为当前地图视图窗口大小。单位为像素，如[1920,1080]表示尺寸为1920*1080（像素）的图片。
 * @param {Object} [canvas=geomap.viewer.canvas] HTMLCanvasElement对象,默认采用当前实例化的地图对象
 * @returns {Object} 返回base64的图片对象
 * @example
 * BOSGeo.FileUtil.exportCurrentSnapShot({type:BOSGeo.ImageType.JPEG});//导出jpeg格式的快照图片
 */
FileUtil.exportCurrentSnapShot = function ({ name = "未命名快照", type = ImageType.PNG,imageSize } = {}, canvas = GeoDepository.viewer.canvas) {
    let base64;
    let blob ;
    imageSize = imageSize ? {width:imageSize[0],height:imageSize[1]}:{width:canvas.width,height:canvas.height}    
    canvas = Canvas2Image.scaleCanvas(canvas, imageSize.width, imageSize.height)
    switch (type) {
        case ImageType.JPEG:
            base64 = canvas.toDataURL(type); // 默认格式为png
            blob = base64ImgToBlob(base64);
            download(name + ".jpeg", blob);
            break;
        case ImageType.BMP: 
            base64 = Canvas2Image.saveAsBMPImage(canvas, name);
            break;
        case ImageType.WEBP:
            base64 = canvas.toDataURL(type); // 默认格式为png
            blob = base64ImgToBlob(base64);
            download(name + ".webp", blob);
            break;
        default:
            base64 = canvas.toDataURL(type); // 默认格式为png
            blob = base64ImgToBlob(base64);
            download(name + ".png", blob);
            break;
    }
    return base64;
};

/**
 * 通过文件选择框导入json文件数据,需要通过另一个按钮的click事件触发调用该方法
 * @returns {Promise} 包含json文件中数据信息的promise对象
 * @example
 * 	document.getElementById('demo').onclick = () => {
 * 		let dataPromise = BOSGeo.FileUtil.addJsonDataSource();
 * 		dataPromise.then(data => {
 * 			console.log(data);
 * 		})
 *  }
 */
FileUtil.addJsonDataSource = function () {
	let element = document.createElement('input');
	element.type = 'file';
	element.click();

	let dataPromise = new Promise((resolve, reject) => {
		element.addEventListener("change", () => {

			let selectedFile = element.files[0];//获取读取的File对象
			// let name = selectedFile.name;//读取选中文件的文件名
			// let size = selectedFile.size;//读取选中文件的大小
			let reader = new FileReader();//这里是核心！！！读取操作就是由它完成的。
			reader.readAsText(selectedFile);//读取文件的内容

			reader.onload = function(){
				try {
                    let json = JSON.parse(this.result);
                    element = null;
                    resolve(json);
                } catch (error) {
                    reject(error)
                }
			};

		}, false);
	})

	return dataPromise;
}
/**
 * 生成二进制长对象的下载
 *
 * @param {String} fileName 下载的文件名称，包含后缀名，如‘config.json’
 * @param {Blob} blob 要下载的二进制长对象
 * @private
 */
function download(fileName, blob) {
    let a = document.createElement("a");
    a.download = fileName;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function base64ImgToBlob(code) {
    let parts = code.split(";base64,");
    let contentType = parts[0].split(":")[1];
    let raw = window.atob(parts[1]);
    let rawLength = raw.length;
    let uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
}

function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(","),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}


export default FileUtil;
