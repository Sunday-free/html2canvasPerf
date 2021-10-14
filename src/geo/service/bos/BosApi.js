import defined from 'cesium/Core/defined'
import defaultValue from 'cesium/Core/defaultValue'
import Resource from 'cesium/Core/Resource'
import when from 'cesium/ThirdParty/when'
import GeoUtil from "../../utils/GeoUtil";
import { BosConfig } from "./BosConfig";
import axios from 'axios';

/**
 * 请求BOS后端服务的接口，详细内容请参考`http://prod-api.boswinner.com/bos3d_java_api/`
 * @constructor
 */
function BosApi() {
}


/**
 * 根据构件key获取构件中心点
 * @private
 * @param {String} key 构件key
 * @returns {Promise}
 * @example
 * BOSGeo.BosApi.getCenterByKey(key);
 */
BosApi.getCenterByKey = function (key) {
    let defer = when.defer();
    Resource.fetchJson({
        url: `${BosConfig.develop}/api/${BosConfig.datakey}/components?componentKey=${key}`
    }).then((data) => {
        defer.resolve(data);
    })
    return defer.promise;
}

/**
 * 根据属性查询构件
 * @private
 * @param {Object} data 属性
 * @returns {Promise}
 * @example
 * BOSGeo.BosApi.getFeatureByAtrribute(data);
 */
BosApi.getFeatureByAtrribute = function (data) {
    let deferred = when.defer();
    Resource.post({
        url: `${BosConfig.develop}/api/${BosConfig.datakey}/queries/attributes`,
        headers: {
            "Content-Type": "application/json",
        },
        data: JSON.stringify(data)
    }).then(result => {
        deferred.resolve(result);
    });
    return deferred.promise;
}

/**
 * 获取accessToken
 * @private
 * @param {String} appKey 数据所在bos项目文件夹的appkey
 * @return {Promise}
 * @example
 *  BOSGeo.BosApi.getAccessToken(appKey);
 */
BosApi.getAccessToken = function (appKey) {
    //获取当前时间
    let currentTime = new Date().getTime();
    let formData = new FormData();
    formData.append("name", BosConfig.name);
    formData.append("password", BosConfig.password);
    if (!appKey) {
        appKey = BosConfig.appKey;
    }
    formData.append("appKey", appKey);
    let accessTokenJson = {};
    return new Promise(function (resolve, reject) {
        //判断 本地存储的 access_token 是否有效
        if ((!accessTokenJson.access_token && parseFloat(accessTokenJson.expires || 0.0) < currentTime)
            || (!!accessTokenJson.appKey && appKey != accessTokenJson.appKey)) {
            let url = BosConfig.host + "boscenterservice/account/login";//+BosConfig.appKey + "/users/login";
            BOSGeo.Resource.post({
                url: url,
                data: formData, // JSON.stringify(formData),
                responseType: 'json',
                // queryParameters: ,
            }).then((data) => {
                accessTokenJson = data.data;
                accessTokenJson.appKey = appKey;
                setCookie('platform_access_token', accessTokenJson.access_token);
                setCookie('platform_modelDb', accessTokenJson.modelDb);
                setCookie('platform_appKey', appKey);
                if (accessTokenJson) {
                    resolve(accessTokenJson);
                } else {
                    reject();
                }
            }, (e) => {
                console.log(e);
                reject()
            })
        } else {
            resolve(accessTokenJson);
        }
    });
};

/**
 * 设置cookie过期时间
 * @private
 * @param {String} name 名称
 * @param {String} value 值
 * 
 */
function setCookie(name, value) {
    let str = name + "=" + escape(value);
    let date = new Date();
    date.setTime(date.getTime() + 6 * 60 * 60 * 1000); //设置过期时间为6小时
    str += ";expires=" + date.toGMTString() + ";path=/";
    document.cookie = str;
}

/**
 * 获取cookie
 * @private
 * @param {String} name 名称
 * 
 */
function getCookie(name) {
    let cookieArray = document.cookie.split("; "); // 得到分割的cookie名值对
    // let cookie = {};
    for (let i = 0; i < cookieArray.length; i++) {
        let arr = cookieArray[i].split("=");
        if (arr[0] === name) {
            // return unescape(arr[1]);
            return decodeURI(arr[1]);
        }
    }
    return "";
}

/**
 * 删除cookie
 * @private
 * @param {String} name 名称
 * 
 */
function delCookie(name) {
    document.cookie = name + "=;expires=" + (new Date(0)).toGMTString() + ";path=/";
}

BosApi.getCookie = getCookie;
BosApi.setCookie = setCookie;

/**
 * get请求
 * @private 
 * @param {String} url 请求地址
 * @param {Object} [params={}] 请求参数
 * @param {object} [headers={}] 请求头
 * @returns {Promise}
 * @example
 *  BOSGeo.BosApi.getConfig(url, params, headers);
 */
BosApi.getConfig = function (url, params = {}, headers = {}) {
    return axios.get(url, {
        params,
        headers: { ...headers },
    }).catch(e => {
        console.error('getConfig', e);
    });
};


/**
 * 获取Geo模型构件信息。详见`http://prod-api.boswinner.com/bos3d_java_api/BOS3D/service/3D/GEOmodule/componentInformation.html?h=%2Fgeomodels%2Fcomponents%3Fkey`
 * 
 * @notes 后台请求地址：${site}/api/${databaseKey}/geomodels/components?key=
 *
 * @param {Object} urlParams 请求地址参数
 * @param {String} urlParams.site 请求服务域名/IP地址
 * @param {String} urlParams.databaseKey 数据库key
 * @param {Object} requestParams 请求地址参数
 * @param {String} requestParams.key 模型key，以'G-'开头的GeoModelKey
 * @param {String} [requestParams.share] 分享key
 * @param {String} [requestParams.componentKey] 构件key关键字
 * @param {String} [requestParams.componentName] 构件名称关键字
 * @param {String} [requestParams.componentType] 构件类型关键字
 * @param {String} [requestParams.pageNumber] 分页返回的页码，从0开始，后台默认为0
 * @param {String} [requestParams.pageSize] 分页返回每页最大条目，取值1~100,后台默认为10
 * @param {String} [requestParams.attributes] 返回属性列表，如不指定则返回全部
 * @param {String} [token=BosConfig.defaultToken] accessToken
 *
 * @example
 * var site = 'http://bos3d.bimwinner.com';
 * var databaseKey = 'e7466ee0834d4171920accea4c70fcb8';
 * var key = 'G1615364184515';
 * BOSGeo.BosApi.getComponentsInfo({site, databaseKey}, {key})
 *  .then(res => {
 *    console.log(res);
 *  });
 *
 * @returns {Promise}
 */
BosApi.getComponentsInfo = function (urlParams, requestParams = {}, token) {
    token = defaultValue(token, BosConfig.defaultToken);
    const { site, databaseKey } = urlParams;
    const url = `${site}/api/${databaseKey}/geomodels/components`;
    const accessToken = token === '' ? {} : { Authorization: token };
    return this.getConfig(url, requestParams, accessToken);
};

/**
 * 获取Geo模型的基本信息。详见`http://prod-api.boswinner.com/bos3d_java_api/BOS3D/service/3D/GEOmodule/getGEOmodule.html?h=databasekey%7D%2Fgeomodels%3Fkey%3D`
 * @notes 后台请求地址：${site}/api/${databaseKey}/geomodels?key=
 *
 * @param {Object} urlParams 请求地址参数
 * @param {Object} urlParams.site 请求服务域名/IP地址
 * @param {Object} urlParams.databaseKey 数据库key
 * @param {Object} requestParams 请求地址参数
 * @param {String} requestParams.key 模型key，以'G-'开头的GeoModelKey
 * @param {String} [requestParams.share] 分享key
 * @param {String} [token=BosConfig.defaultToken] accessToken
 *
 * @example
 * var site = 'http://bos3d.bimwinner.com';
 * var databaseKey = 'e7466ee0834d4171920accea4c70fcb8';
 * var key = 'G1615364184515';
 * BOSGeo.BosApi.getModelInfo({site, databaseKey}, {key})
 *  .then(res => {
 *    console.log(res);
 *  });
 *
 * @returns {Promise}
 */
BosApi.getModelInfo = function (urlParams, requestParams = {}, token) {
    token = defaultValue(token, BosConfig.defaultToken);
    const { site, databaseKey } = urlParams;
    const url = `${site}/api/${databaseKey}/geomodels`;
    const accessToken = token === '' ? {} : { Authorization: token };
    return this.getConfig(url, requestParams, accessToken);
};

/**
 * 获取模型树列表。详见`http://prod-api.boswinner.com/bos3d_java_api/BOS3D/service/3D/moduleTree/upModuleTreeList.html?h=%2Ftrees%2Flist%3Fmodelkey%3D`
 * @notes 后台请求地址：${site}/api/${databaseKey}/trees/list?modelKey=
 *
 * @param {Object} urlParams 请求地址参数
 * @param {Object} urlParams.site 请求服务域名/IP地址
 * @param {Object} urlParams.databaseKey 数据库key
 * @param {Object} requestParams 请求地址参数
 * @param {String} requestParams.modelKey 模型key，以'M-'开头的ModelKey
 * @param {String} [requestParams.share] 分享key
 * @param {String} [token=BosConfig.defaultToken] accessToken
 *
 * @example
 * var site = 'http://bos3d.bimwinner.com';
 * var databaseKey = 'e7466ee0834d4171920accea4c70fcb8';
 * var modelKey = 'M1615364184515';
 * BOSGeo.BosApi.getModelTreeList({site, databaseKey}, {modelKey})
 *  .then(res => {
 *    console.log(res);
 *  });
 *
 * @returns {Promise}
 */
BosApi.getModelTreeList = function (urlParams, requestParams, token) {
    token = defaultValue(token, BosConfig.defaultToken);
    const { site, databaseKey } = urlParams;
    const url = `${site}/api/${databaseKey}/trees/list`;
    const accessToken = token === '' ? {} : { Authorization: token };
    return this.getConfig(url, requestParams, accessToken);
};

/**
 * 获取模型树信息
 * @notes 后台请求地址：${site}data?fileKey=
 *
 * @param {String} site 请求服务域名/IP地址
 * @param {String} fileKey 模型树fileKey,可通过BosApi.getModelTreeList获取到
 * @param {String} [token=BosConfig.defaultToken] accessToken
 *
 * @example
 * BOSGeo.BosApi.getTreeInfo('http://bos3d.bimwinner.com', 'Z3JvdXAxMCxNNEUvMDIvMDQvckJBQkIyQV9OZUdBU0NVa0FBQUZHcWEtd01NMTM2Ny5neg==')
 *  .then(res => {
 *    console.log(res);
 *  });
 *
 * @returns {Promise}
 */
BosApi.getTreeInfo = function (site, fileKey, token) {
    token = defaultValue(token, BosConfig.defaultToken);
    const url = `${site}/data`;
    const accessToken = token === '' ? {} : { Authorization: token };
    return this.getConfig(url, { fileKey }, accessToken);
};

/**
 * 获取M开头的模型key
 * @private
 * @param {String} databaseKey 数据库Key
 * @param {String} geoKey BOS解析模型后生成的G开头的geoKey
 * @param {String} accessToken BOS解析模型后对应的token
 * @param {Promise} 带有模型Key信息的promise对象
 */
BosApi.getModelKey = function (databaseKey, geoKey, accessToken) {
    let url = `http://bos3d.bimwinner.com/api/${databaseKey}/geomodels`;
    let params = {
        key: geoKey
    }

    let promise = new Promise((resolve, reject) => {
        Resource.fetchJson({
            url,
            queryParameters: params,
            headers: {
                "Content-Type": "application/json",
                "Authorization": accessToken
            }
        }).then(data => {
            resolve(data.data.models[0]);
        }, err => {
            console.log(err);
        })
    })

    return promise
}


export { BosApi }