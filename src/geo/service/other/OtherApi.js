import Resource from 'cesium/Core/Resource'

/**
 * 请求外部的后台服务接口请求数据
 * @ignore
 */
function OtherApi() {

}

/**
 * 高德接口，室外路径规划
 * @ignore
 * @param {Object} options 请求参数
 * @param {String} options.mode 路径规划方式，driving、walking
 * @param {Number} options.start 火星坐标系下的起点
 * @param {Number} options.end 火星坐标系下的终点
 */

OtherApi.getOutdoorRoute = function (options) {
    let {mode, start, end} = options;
    let baseURL = 'https://restapi.amap.com/v3/direction/';
    let params = {
        origin: start,
        destination: end,
        key: '5b89a68941d5a2b421a9da330fdb0682',
        strategy: 10
    };

    const promise = new Promise(function (resolve, reject) {
        Resource.fetchJson({
            url: baseURL + mode,
            queryParameters: params
        }).then((data) => {
            resolve(data);
        }, (err) => {
            reject(err);
        });
    });

    return promise;
}

/**
 * 逆地理编码, 通过经纬度查询地址
 * @ignore
 * 
 * @param {String} location 经纬度'lng, lat'
 * @returns {Promise}
 * @example
 * BOSGeo.OtherApi.poiQueryByLocation(location);
 */
 OtherApi.poiQueryByLocation = function (location) {
    let deferred = when.defer();
    let parameters = {
        location: location,
        radius: 500,
        output: 'json',
        key: BosConfig.key
    };
    Resource.fetchJson({
        url: BosConfig.geocodeUrl,
        queryParameters: parameters
    }).then(function (data) {
        // callback(data.regeocode);
        deferred.resolve(data.regeocode);
    });
    return deferred.promise;
};

export {OtherApi}


