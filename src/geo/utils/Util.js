import CesiumMath from 'cesium/Core/Math';
import Cartesian3 from 'cesium/Core/Cartesian3';
import Cartographic from 'cesium/Core/Cartographic';
import WebMercatorProjection from 'cesium/Core/WebMercatorProjection';
import Check from 'cesium/Core/Check';
import defined from "cesium/Core/defined";
import DeveloperError from 'cesium/Core/DeveloperError';

/**
 * 通用工具类
 * @constructor
 */
class Util {
    constructor() {
    }
}

/**
 * 生成一个UUID
 * @returns {String} 返回36位的uuid通用唯一识别码
 * @example
 * let str = BOSGeo.Util.generateUUID();
 */
Util.generateUUID = function () {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    var uuid = new Array(36);
    var rnd = 0, r;

    for (var i = 0; i < 36; i++) {
        if (i == 8 || i == 13 || i == 18 || i == 23) {
            uuid[i] = '-';
        } else if (i == 14) {
            uuid[i] = '4';
        } else {
            if (rnd <= 0x02) rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
            r = rnd & 0xf;
            rnd = rnd >> 4;
            uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
    }
    return uuid.join('');	//返回36位的uuid通用唯一识别码 (Universally Unique Identifier).
};

/**
 * 世界坐标转经纬度
 * @param {Ellipsoid} ellipsoid 地球椭球体
 * @param {Cartesian3} position 世界坐标
 * @returns {Cartesian3} 经纬度坐标 Cartesian3(lng, lat, alt)
 * @example
 * let poisition = BOSGeo.Util.cartesianToDegrees(ellipsoid, position);
 */
Util.cartesianToDegrees = function (ellipsoid, position) {
    // var ellipsoid=viewer.scene.globe.ellipsoid;
    // var cartesian3= new Cartesian3(position);
    var cartographic = ellipsoid.cartesianToCartographic(position);
    var lat = CesiumMath.toDegrees(cartographic.latitude);
    var lng = CesiumMath.toDegrees(cartographic.longitude);
    var alt = cartographic.height;
    return new Cartesian3(lng, lat, alt);
};

/**
 * 计算顶点
 * @param {Object} start 起点,包含x,y,z
 * @param {Object} end 终点,包含x,y,z
 * @param {Number} arcFactor 因子 
 * @returns {Array} 顶点
 * @example
 * let coordinates = BOSGeo.Util.computeVertex(start, end, arcFactor);
 */
Util.computeVertex = function (start, end, arcFactor) {
    const coordinates = [];
    const sect = 50;
    const start_1 = Cartesian3.fromDegrees(start.x, start.y, start.z);
    const end_1 = Cartesian3.fromDegrees(end.x, end.y, end.z);
    // const distance = Util.computeSurfaceDistance(startx, starty, endx, endy);
    const distance = Cartesian3.distance(start_1, end_1);
    // console.log(distance);
    const d = distance / sect;
    const dx = (end.x - start.x) / sect;
    const dy = (end.y - start.y) / sect;
    // const a = -0.01;
    const a = -1 / distance * (arcFactor + 0.1);
    const b = (start.z - end.z + (a * distance * distance)) / (-distance);
    const c = start.z;
    for (let i = 0; i < sect; i++) {
        coordinates.push(start.x + i * dx);
        coordinates.push(start.y + i * dy);
        coordinates.push(a * d * i * d * i + b * d * i + c);
    }
    coordinates.push(end.x);
    coordinates.push(end.y);
    coordinates.push(end.z);
    return coordinates;
}

/**
 * 判断多边形点是否顺逆时针
 * @param {Array} coords 多边形点
 * @returns {*} 是否顺时针
 * @example
 * let res = BOSGeo.Util.isCoordShun(coords);
 */
Util.isCoordShun = function (coords) {
    if (coords.length < 3) {
		console.warn("坐标数组长度必须大于2!");
        return null;
    }
    if (coords[0] == coords[coords.length - 1]) {
        coords = coords.slice(0, coords.length - 1);
    }
    //角度和
    var angSum = 0;
    for (var i = 0; i < coords.length; i++) {
        var c1, c2, c3;
        if (i == 0) {
            c1 = coords[coords.length - 1];
            c2 = coords[i];
            c3 = coords[i + 1];
        } else if (i == coords.length - 1) {
            c1 = coords[i - 1];
            c2 = coords[i];
            c3 = coords[0];
        } else {
            c1 = coords[i - 1];
            c2 = coords[i];
            c3 = coords[i + 1];
        }
        var x1, y1, x2, y2, x3, y3;
        x1 = parseFloat(c1.x);
        y1 = parseFloat(c1.y);
        x2 = parseFloat(c2.x);
        y2 = parseFloat(c2.y);
        x3 = parseFloat(c3.x);
        y3 = parseFloat(c3.y);

        var angRight = Util.getCoordAngRight(x1, y1, x2, y2, x3, y3);
        angSum += angRight;
    }
    var isShunshizhen = Math.abs(angSum - (coords.length - 2) * 180);
    //涉及到平方和开方计算，因此结果与理论值会有一点偏差，所以使用一个容差值
    return isShunshizhen < coords.length;
}
/**
 * 计算两矢量所成的右侧角
 * @private
 * @param {Number} x1 
 * @param {Number} y1
 * @param {Number} x2
 * @param {Number} y2
 * @param {Number} x3
 * @param {Number} y3
 * @returns {Number}
 * @example
 * let res = BOSGeo.Util.getCoordAngRight(x1,y1,x2,y2,x3,y3);
 */
Util.getCoordAngRight = function (x1, y1, x2, y2, x3, y3) {
    // 要先判断是左转还是右转，如果是右转，右侧角=夹角，如果是左转，右侧角=360-夹角
    var s = ((x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3));
    var len12 = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    var len23 = Math.sqrt(Math.pow(x2 - x3, 2) + Math.pow(y2 - y3, 2));
    var len13 = Math.sqrt(Math.pow(x1 - x3, 2) + Math.pow(y1 - y3, 2));
    var cos2 = (Math.pow(len23, 2) + Math.pow(len12, 2) - Math.pow(len13, 2)) / (2 * len12 * len23);
    var angle2 = Math.round(Math.acos(cos2) * 180 / Math.PI);
    if (s < 0) {
        //顺时针
        return angle2;
    } else if (s > 0) {
        //逆时针
        return 360 - angle2;
    } else {
        //平行
        return 360;
    }
}

/**
 * 根据距离方向和观察点计算目标点（109.878321 19.963493 82 0 500）
 * @param {Object} viewer geomap.viewer
 * @param {Number} lon 经度
 * @param {Number} lat 维度
 * @param {Number} height 高度
 * @param {Number} direction 方向
 * @param {Number} radius 可视距离
 * @returns {Object} 目标点
 * @example
 * let poi = BOSGeo.Util.calculatingTargetPoints(viewer, lon, lat, height, direction, radius);
 */
Util.calculatingTargetPoints = function (viewer, lon, lat, height, direction, radius) {
    // 观察点
    var viewPoint = Cartesian3.fromDegrees(lon, lat, height);
    // 世界坐标转换为投影坐标
    var webMercatorProjection = new WebMercatorProjection(viewer.scene.globe.ellipsoid);
    var viewPointWebMercator = webMercatorProjection.project(Cartographic.fromCartesian(viewPoint));
    // 计算目标点
    var toPoint = new Cartesian3(viewPointWebMercator.x + radius * Math.cos(direction), viewPointWebMercator.y +
        radius * Math.sin(direction), 0);
    // 投影坐标转世界坐标
    toPoint = webMercatorProjection.unproject(toPoint);
    toPoint = Cartographic.toCartesian(toPoint.clone());
    // 世界坐标转地理坐标
    var cartographic = Cartographic.fromCartesian(toPoint);
    var point = { x: CesiumMath.toDegrees(cartographic.longitude), y: CesiumMath.toDegrees(cartographic.latitude) };
    return point;
}

/**
 * 计算一个点正北方向x米的另一个点的坐标
 * @param {Cartesian3} position 坐标点
 * @param {Number} distance 距离
 * @returns {Cartesian3} 结果坐标
 * @example
 * let res = BOSGeo.Util.getNorthPointByDistance(position, distance);
 */
Util.getNorthPointByDistance = function (position, distance) {
    //以点为原点建立局部坐标系（东方向为x轴,北方向为y轴,垂直于地面为z轴），得到一个局部坐标到世界坐标转换的变换矩阵
    var localToWorld_Matrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    return Cesium.Matrix4.multiplyByPoint(localToWorld_Matrix, Cesium.Cartesian3.fromElements(0, distance, 0), new Cesium.Cartesian3())
}

/**
 * 计算点到指定点方向偏移固定距离的坐标点
 * @param  {Cartesian3} a,起始点,格式如{x:1 , y: 2, z: 3}
 * @param  {Cartesian3} b,终点,格式如{x:1 , y: 2, z: 3}
 * @param  {Number} distance,偏移距离
 * @returns {Object} 目标点 {{x:* , y: *, z: *}}
 * @example
 * let p = BOSGeo.Util.getNewRollPoint({x:1 , y: 2, z: 3},{x:5 , y: 6, z: 3},10)
 */
Util.getNewRollPoint = function (a, b, distance) {
    let r = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)+ (a.z - b.z) * (a.z - b.z));
    let cx = (distance * (b.x - a.x)) / r + a.x;
    let cy = (distance * (b.y - a.y)) / r + a.y;
    let cz = (distance * (b.z - a.z)) / r + a.z;
    return {x: cx, y: cy, z: cz}
}

/**
 * 根据起点坐标、heading、距离计算终点坐标
 * @param {Cartographic} startPoint 起点经纬度坐标
 * @param {Number} brng 旋转角度
 * @param {Number} 起点终点距离
 * @returns {Cartesian3} 最终终点
 * @private
 */
Util.calculateEndByHeading = function (startPoint, brng, dist) {
    var ct = {
        a: 6378137,
        b: 6356752.3142,
        f: 1 / 298.257223563
    };
    var a = ct.a,
        b = ct.b,
        f = ct.f;

    var lon1 = startPoint.longitude;
    var lat1 = startPoint.latitude;

    var s = dist;
    var alpha1 = (brng * Math.PI) / 180.0;
    var sinAlpha1 = Math.sin(alpha1);
    var cosAlpha1 = Math.cos(alpha1);

    var tanU1 = (1 - f) * Math.tan((lat1 * Math.PI) / 180.0);
    var cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1),
        sinU1 = tanU1 * cosU1;
    var sigma1 = Math.atan2(tanU1, cosAlpha1);
    var sinAlpha = cosU1 * sinAlpha1;
    var cosSqAlpha = 1 - sinAlpha * sinAlpha;
    var uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
    var A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    var B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

    var sigma = s / (b * A),
        sigmaP = 2 * Math.PI;
    while (Math.abs(sigma - sigmaP) > 1e-12) {
        var cos2SigmaM = Math.cos(2 * sigma1 + sigma);
        var sinSigma = Math.sin(sigma);
        var cosSigma = Math.cos(sigma);
        var deltaSigma = B * sinSigma * (cos2SigmaM + (B / 4) * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
        sigmaP = sigma;
        sigma = s / (b * A) + deltaSigma;
    }

    var tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1;
    var lat2 = Math.atan2(sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1, (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp));
    var lambda = Math.atan2(sinSigma * sinAlpha1, cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1);
    var C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    var L = lambda - (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));

    var revAz = Math.atan2(sinAlpha, -tmp); // final bearing

    return Cartographic.toCartesian(new Cartographic(lon1 + (L * 180) / Math.PI, (lat2 * 180) / Math.PI, startPoint.height));
}

/**
 * 判断是否是凸多边形函数
 * @param {Array}  p：顶点数组(数组对象)
 * @returns {Number} 1：凸集；-1：凹集；0：曲线不符合
 * @example
 * let res = BOSGeo.Util.convex(p);
 */
Util.convex = function (p) {

    var j, k, z;
    var flag = 0;
    if (p.length < 3) {
        // console.log("不符合要求")
        return 0;
    }
    let n = p.length
    for (var i = 0; i < n; i++) {
        j = (i + 1) % n;
        k = (i + 2) % n;
        z = (p[j].x - p[i].x) * (p[k].y - p[j].y);
        z -= (p[j].y - p[i].y) * (p[k].x - p[j].x);
        if (z < 0) {
            flag |= 1;
        } else if (z > 0) {
            flag |= 2;
        }
        if (flag == 3) {
            // console.log("凹多边形，不符合要求")
            return -1; //CONCAVE
        }
    }
    if (flag != 0) {
        // console.log("凸多边形")
        return 1; //CONVEX
    } else {
        return 0;
    }
}

/**
 * 定义一个深拷贝函数  接收目标target参数
 * @param {Object}  target 拷贝对象
 * @returns {Object} 拷贝结果
 * @example
 * let res = BOSGeo.Util.deepClone(target);
 */
Util.deepClone = function (target) {
    // 定义一个变量
    let result;
    // 如果当前需要深拷贝的是一个对象的话
    if (typeof target === 'object') {
        // 如果是一个数组的话
        if (Array.isArray(target)) {
            result = []; // 将result赋值为一个数组，并且执行遍历
            for (let i in target) {
                // 递归克隆数组中的每一项
                result.push(this.deepClone(target[i]))
            }
            // 判断如果当前的值是null的话；直接赋值为null
        } else if (target === null) {
            result = null;
            // 判断如果当前的值是一个RegExp对象的话，直接赋值
        } else if (target.constructor === RegExp) {
            result = target;
        } else {
            // 否则是普通对象，直接for in循环，递归赋值对象的所有值
            result = {};
            for (let i in target) {
                result[i] = this.deepClone(target[i]);
            }
        }
        // 如果不是对象的话，就是基本数据类型，那么直接赋值
    } else {
        result = target;
    }
    // 返回最终结果
    return result;
}

/**
 * 将数值转换为带小数点的字符串（用于着色器）
 *
 * @param {Number} value 待转换的数值
 * @param {Number} [accuracy=3] 小数点后整数位
 * 
 * @returns {String}
 * 
 * @example
 * var str = BOSGeo.Util.parseFloatWithDot(1); // str---0.001
 * 
 */
Util.parseFloatWithDot = function (value, accuracy = 3) {
    return value.toFixed(accuracy);
}

/**
 * 将数值数组转换为带小数点的字符串数组（用于着色器）
 *
 * @param {Array.<Number>} numberList 待转换的数值
 * @param {Number} [accuracy=8] 小数点后整数位
 * 
 * @returns {Array.<String>}
 * 
 * @example
 * var str = BOSGeo.Util.parseFloatArrayWithDot([1, 2]); // str---[0.001, 0.002]
 */
Util.parseFloatArrayWithDot = function (numberList, accuracy = 8) {
    return numberList.map(item => item.toFixed(accuracy));
}

/**
 * 以origin为原点沿着normal方向平移scalar个尺寸
 * @private
 * 
 * @param {Cartesian3} origin 局部坐标系原点的世界坐标
 * @param {Cartesian3} normal 世界坐标系下矢量
 * @param {Number} scalar 尺寸
 */
Util.addVectorInScalar = function (origin, normal, scalar) {
    Check.typeOf.object("origin", origin);
    Check.typeOf.object("normal", normal);
    Check.typeOf.number("scalar", scalar);

    const x = origin.x + normal.x * scalar;
    const y = origin.y + normal.y * scalar;
    const z = origin.z + normal.z * scalar;
    return new Cartesian3(x, y, z)
}

/**
 * 移除对象中指定属性(不适用于cesium的嵌套对象)
 * @private
 * @param {Object} object 
 * @param {Array.<String>} keys 
 * 
 * @returns {Object}
 */
Util.removeObjectProperties = function(object, keys) {
    const result = this.deepClone(object);
    keys.map((key) => {
        delete result[key];
    })
    return result;
}

/**
 * 删除数组中指定的某个元素
 * @param {Array} arr 数组
 * @param {Object} val 数组中需要被删除的元素
 * @example
 *  //Example 1
 * var arr=[1,2,3]
 * BOSGeo.Util.removeFromArray(arr,2)
 * @example
 * //Example 2.
 * var emp = ['abs','dsf','sdf','fd']
 * BOSGeo.Util.removeFromArray(emp,"abs") * 
 */
Util.removeFromArray =function (arr, val){
	console.log("移除前",arr);
	var index = arr.indexOf(val);//指定元素的索引
    if (index > -1) {
        arr.splice(index, 1);//从数组中移除
    }
	console.log("移除后",arr);
} 

/**
 * 校验输入的经纬度、方位和缩放参数值
 * @param {Object} options 包含以下参数的Object对象:
 * @param {Array} [options.position] 经纬度坐标数组;
 * @param {Array} [options.rotation] 包含偏航角、俯仰角和方位角的方位数组;
 * @param {Number} [options.scale] 缩放比例。
 * @example
 * BOSGeo.Util.validate({position:[181,23]})
 */
Util.validate = function(options) {
    const { position, rotation, scale } = options;
    if (position) {
        const [lng, lat] = position;
        if (isNaN(lng) || (lng > 180) || (lng < -180)) {
            throw new DeveloperError('经度必须大于-180，小于180');
        }
        if (isNaN(lat) || (lat > 90) || (lat < -90)) {
            throw new DeveloperError('纬度必须大于-90，小于90');
        }
    }
    if (rotation) {
        const [heading, pitch, roll] = rotation;
        if (isNaN(heading) || (heading > 180) || (heading < -180)) {
            throw new DeveloperError('偏航角必须大于-180，小于180');
        }
        if (isNaN(pitch) || (pitch > 90) || (pitch < -90)) {
            throw new DeveloperError('俯仰角必须大于-90，小于90');
        }
        if (isNaN(roll) || (roll > 180) || (roll < -180)) {
            throw new DeveloperError('翻滚角必须大于-180，小于180');
        }
    }
    if (defined(scale)) {
        if (isNaN(scale) || (scale <= 0)) {
            throw new DeveloperError('缩放比例必须大于0');
        }
    }
}
   
export default Util;