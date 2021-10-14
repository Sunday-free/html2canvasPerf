
import MapPickType from '../constant/MapPickType'
import MapEventType from '../constant/MapEventType'
import GeoUtil from '../utils/GeoUtil'
import DeveloperError from 'cesium/Core/DeveloperError'
import CoordTransform from '../utils/CoordTransform'
import Resource from 'cesium/Core/Resource'
import Cartesian3 from 'cesium/Core/Cartesian3'
import Roam from '../roam/Roam'
import { BosApi } from '../service/bos/BosApi'
import { OtherApi } from '../service/other/OtherApi'


/**
 * 室内外路径规划
 * @param {GeoMap} geomap GeoMap的实例对象
 * @param {Object} options 路径规划的配置选项
 * @param {String} [options.mode = 'driving'] 查询模式，默认为驾车, 可选'walking'    
 * @param {Number} [options.speed = 20] 驾车速度，默认20
 * @param {String} [options.startImg] 起点图片，默认为一张base64图片
 * @param {String} [options.EndMarkImg] 终点图片，默认为一张base64图片
 * @param {Boolean} [options.isAutoRequest = true] 点击终点后是否自动请求并渲染路径
 * @param {Object} [options.startModel = {}] 起点模型相关信息，包含门bim坐标，appKey、数据库key、geoKey
 * @param {Object} [options.endModel = {}] 终点模型相关信息，包含门bim坐标，appKey、数据库key、geoKey
 * @example
    var geomap = new BOSGeo.GeoMap('bosgeoContainer');
    var layerManager = geomap.layerManager;
    var pointLayer = layerManager.createLayer(BOSGeo.LayerType.POINT, "point");
    var modelLayer = layerManager.createLayer(BOSGeo.LayerType.MODEL, '模型图层');

    let testModel1 = modelLayer.add({
        name: 'testModel',
        // 江湖别墅,shp文件夹下
        url: 'http://bos3d.bimwinner.com/api/j798920c67de49e4aeb3634e52a84548/geomodels/G1622167164209/data/tileset.json',
        featureType: BOSGeo.FeatureType.BIM,
        position: [116.3972282409668, 39.90960456049752, 5],
    });
    modelLayer.zoomTo(testModel1);

    // 计算转换平移矩阵的对应点参数
    var gisPoints = [], bimPoints = [];

    // model1的坐标转换计算
    gisPoints[0] = new BOSGeo.Cartesian3(-2178129.197384819, 4388344.140116348, 4070291.1682924205); //第一个gis坐标系取点
    bimPoints[0] = { x: -5518.740713069945, y: -11686.319421872764, z: 6908.565989684334 }; //第一个bim坐标系取点

    var paramPoints = {
        gisPoints,
        bimPoints
    };


    //前期需要录入的信息:出发模型和终点模型的对象，包含： 门的bim坐标，模型所在的账号密码，文件夹的appKey，dataBaseKey，geoKey，并且需要提前提取好路网
    var modelInfo = {
        doorsInfo: [{
            bimPoint: { x: 117.79746874097204, y: -8938, z: 13.172837318709753 }
        }, {
            bimPoint: { x: -9321.217008705518, y: -8887, z: 6.242604241011122 }
        }, {
            bimPoint: { x: -10672.400352404693, y: 2263, z: 21.301608240939117 }
        }, {
            bimPoint: { x: -10128, y: -2929.8018259805017, z: 23.392377448263858 }
        }],
        appKey: 'z6faa9cffe0e499d91ef646661991ea4',
        databaseKey: 'j798920c67de49e4aeb3634e52a84548',
        geoKey: 'G1622167164209'
    }


    let testModel2 = modelLayer.add({
        name: 'testModel2',
        // 江湖别墅
        url: 'http://bos3d.bimwinner.com/api/le52fbc690684bca831905685f06a95d/geomodels/G1623317872900/data/tileset.json',
        featureType: BOSGeo.FeatureType.BIM,
        position: [116.3972282409668, 39.90915, 6],
        // rotation:[2.9,0,0]       //模型位置
    });


    //model2的坐标转换参数
    var model2gisPoints = [], model2bimPoints = [];
    model2gisPoints[0] = new BOSGeo.Cartesian3(-2178141.940259859, 4388370.481515943, 4070250.208285653);
    model2bimPoints[0] = { x: -5517.243744153587, y: -11686.318204661751, z: 3909.6417072394815 };

    model2gisPoints[1] = new BOSGeo.Cartesian3(-2178130.8168315007, 4388367.349097477, 4070259.386480476);
    model2bimPoints[1] = { x: -14087.999999999998, y: 326.05623500206286, z: 3857.852437266018 };

    var model2paramPoints = {
        gisPoints: model2gisPoints,
        bimPoints: model2bimPoints
    }

    // 前期需要录入的信息:出发模型和终点模型的对象，包含： 门的bim坐标，模型所在的账号密码，文件夹的appKey，dataBaseKey，geoKey，并且需要提前提取好相关模型路网
    var model2Info = {
        doorsInfo: [{
            bimPoint: { x: 117.79746874097204, y: -8938, z: 13.172837318709753 }
        }, {
            bimPoint: { x: -9321.217008705518, y: -8887, z: 6.242604241011122 }
        }, {
            bimPoint: { x: -10672.400352404693, y: 2263, z: 21.301608240939117 }
        }, {
            bimPoint: { x: -10128, y: -2929.8018259805017, z: 23.392377448263858 }
        }],
        appKey: 'k897cda8821145c380ff609e7e51e7ca',
        databaseKey: 'le52fbc690684bca831905685f06a95d',
        geoKey: 'G1623317872900'
    }

    var routePlan;
    var rootTransform2, coorTransform2;
    testModel2.readyPromise.then(() => {
        rootTransform2 = testModel2.root.transform;
        coorTransform2 = BOSGeo.GeoUtil.computeCoorTransform(rootTransform2, model2paramPoints);
        model2Info.coorTransform = coorTransform2;

        // 3dtiles的根节点transform
        var rootTransform, coorTransform;
        testModel1.readyPromise.then(() => {
            rootTransform = testModel1.root.transform;
            coorTransform = BOSGeo.GeoUtil.computeCoorTransform(rootTransform, paramPoints);
            modelInfo.coorTransform = coorTransform;

            routePlan = new BOSGeo.RoutePlan(geomap, {
                isAutoRequest: true,
                startModel: modelInfo,
                endModel: model2Info
            });
        })

    })    
 * 
 *  
 */
class RoutePlan {
    constructor(geomap, options) {
        this.options = options || {};
        this.mode = this.options.mode || 'driving';
        this.speed = this.options.speed || 20;
        this.defaultHeight = 0;
        this.startImg = this.options.startImg || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAfCAYAAAAFkva3AAADVUlEQVR42qWUa0zNcRzG/2bMS/PG5gVzSyJ3ueeSg8LG2Bhzm0szRkyG0VG5RKhE7nNZK3OZUhgKbeQ2tNFm5dqy3A66Hef6f3yfX/abHEfF2T773p7n+Z/z4n8MAD5EJNa2E6KFW8I7wfmzFnDP+5989UN21rQQ4gX7xBQXJqUBkw8KR1RVM/e8U0f9H8PCd1S1FvIjkh2YdFiMR/zDO3WivyG0qRc2IaGyuZAXvteBCBGT2aeA9dns/UO9+AqFljps/Pavmyck2RFxGJqtV4Ccorp+1kk1a9ZlQevoo1+FjdtqayvYww94EX4IWJpZF3L3BVD6nr3eabinltBHP3MMy5ZPayy7azDukKmYecJE/GXg9AMGqp77X2FYvZl+yYk2wuI+3LCkOmE5aCoiM4D4S0CmhBVKGPsZx01cLIKmtALUauhnjjEmtuJD2H43wuTrkrhcE9lPoLDV1PWLM0yUfwFvirxiUKuhX3LeG6Ot5d7RaR78yvViE9OPeVBSAb3TvR+YY4zcVFY9ar8Lo9LcimnH3PwWqrc7ISEmMu57WbWGD1t93qNn+iWnygjd+PpJaHItQmVBrDke8LPqnIcBes/grMdeon7+VHko94qUWkhOkTFiw8uUETtsGL7PqUi/58GdUmVgmN5HnXUj5mIdU466uNPQLzmpxrD1JYOHWt9iSKpDYasG5p1yYuVZF3sVeOGRR3PtmVft0u+6tYd+5qg3YOja57eGbPuIQXu/Y8UZJyvR88Zslw9zTjrUnT769es0OLq4m+AISapGSIq90VBPH/06jAxa8zQ2ZHMZBiTXNhrq6fP5Cxq4uqiV8Kp/wkf0S65pEOqop88njAyIejyl/4YS9E6qbhDqqPf7T0v6rXiY1zu2DMF7qvzCu+jyqf9rWN/l93sJ3h67K+EP3qlrMIz0WVaYGRzzCkG7vvnAPe/UNSqs19LbQYIZmPgVv8M9740OI8GRBVmB1jfomvhFw5l73psU1nPJzbFBUQ/RZadNw5n7JocFLcpvJrzsvKUCneRFZuXMfZPDSPeF12MCop+iY8JnsMps5f6fwgIXXA0MiCxA+4RPYOX8z2Gk2/wrLzrElYOV83+FBcy7vK/j2mdg/e+wrnNzxwqVgqUh7Q8B5YCq9660DQAAAABJRU5ErkJggg==';
        this.endImg = this.options.endImg || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAfCAYAAAAFkva3AAAEIklEQVR42qWUW2ibdRjGI6J4Kd4IXrbNej6f2xybfDmnydpOwc276Z2g0F4IMrfplYgiihO2KwV3o65TZJa2ox7WgeDaiSJrt4rs0PSQpm3SL4cvyeP7/AOBkc2tW+HHm/d9n+f5/79+JCYAFSSHwy8IE8KccFvICqw/cc79vXx3NTvh0FPCu4KeCUdhhEdRCI+hGDrEqnrOuaeO+nuGJULBZ4VZPRRBISgBQQnwj6DgiQhhVvacqz11or8oPHdX2FbQ/6QwowdLQXn/QRQOHYbh8MKwa4r8yEuqz7sC3Csd9eKbF54uh20G/MeTgWHkA/IocoP88feAeBxG9EXkrG5V+We8OY6cTUOOh2glfUp89KuwdZ/veUHPyWmGN4qs3YPC0jKMYyeRe2MCWYsLhXPnUdR1zktcmqdODo6CPvqZY4p5veM7vhAM34ic6IfxwUcoLi4iO+BiAPtS/fwMZ+WDsgNu6pWPfsmZMN3xuC/uaRFkXVGkBzzKmP91vsTUDIo3byF36oyqxpdn1Tzd5yLUKx/9zDHdcrvX0u4oMo4QdApCY4ritWXovUNIv/KqqoWFq+qg7Nsn2RPqlY9+yYmZ/nU5CxnXQaStQez1DCkKEpR+fRy6hGZPnUaBt/r2PDISVIzH2XNOrfLRzxzTP05HUh+KQLcGkOoeQvaLr9QNiptx5KamkXn/Q+wdOQrjl3lkPjstGicrZ9QrH/2Ss2u6brct7NjD0AdDSHa5kPKNKZKdznIlqcMqkIeU59TTR7/kLJqWbNaP12w+6LYIUkdeQ/abSRhXrqpHyV9bQtI7WrqlBCVfPqr63Q6HItntVr4N8UvOJ6a/LYN9NywOpCwR7Pb6kflxGqm3TsjrHsV2u4Ooz5mvJ/n43Jd2HU7qlY9+5qhvwJ8D/XO3BzQk+4ex3elGosUh2CvY1kaQvTAtdYw6paeP/vLX6Y/+vlohk+iT5+8JINHmxFaz/b5wTx319NFfDiMLvT0nVnrkf9ETQqJVQ7zJjnijrQLOuaeOevoqfoJ+7+56RlhZ7dKw3RXAZpMDGw3WCjjnnjrq6asII791dUb/6hxEoj2IeLOG9Xob1uusZdhzzj111N/3l5Zc7mifWZHXvtUWkJs4sFZrKcOec+5FN0v9/4ZdamttEQpbrXxUTUKsiJktrKrnnHvqHhhGfm5tObvUbBOzH7FaB+5UD7KqnnPuqXuosLnmpgahuNHolxu5JcyqKnvOuX/oMDLb2Di53GDHeoMXq2anquw5535fYdMN9e7LDe3yFn2IHdBUZc/5vsOm6uueEG7cNLuxZvaBlT3n+w4jF2prjy2YexGr8YBV+nc4f6SwHw4cqJs1N2K12gNW9o8cRr4311xfqXKClf1jhX1XU/3pYlUvWB877Fx1lVvYEbQHaf8DXsIRTnndJhMAAAAASUVORK5CYII=';
        this.innerBaseUrl = 'http://bos3d.bimwinner.com/api/'; //bos3d室内导航的前缀

        this._isAutoRequuest = (this.options.isAutoRequest === undefined) ? true : this.options.isAutoRequest;
        this.startModel = this.options.startModel || {};
        this.endModel = this.options.endModel || {};

        this.geomap = geomap;
        this.viewer = geomap.viewer;
        this.pointLayer = geomap.layerManager.createPointLayer('_routePoint');
        this.lineLayer = geomap.layerManager.createLineLayer('_routeLine');


        this._initRoutePlan();
        this.accessToken = undefined;
        this.databaseKey = undefined;
        this.modelKey = undefined;
        this.routeKey = undefined;
        window.rt = this;

    }

    /**
     * 初始化,生成模型门的相关坐标信息
     * @private
     */
    _initRoutePlan() {
        let { startModel, endModel } = this;
        if (startModel.doorsInfo && !startModel.doorsInfo[0].gisPoint) {//门的bim坐标转为经纬度gis坐标
            this.startModel = this._computeModelDoors(startModel);
        }
        if (endModel.doorsInfo && !endModel.doorsInfo[0].gisPoint) {
            this.endModel = this._computeModelDoors(endModel);
        }

        this._addTip(); //添加提示面板，初始隐藏
        this._addRightClickEventListener(); //绑定场景右键点击
    }

    /**
     * 初始化key和token
     * @private
     */
    _initTokenKey() {
        this.accessToken = undefined;
        this.databaseKey = undefined;
        this.modelKey = undefined;
        this.routeKey = undefined;
    }

    /**
     * 初始化添加起点终点选择面板
     * @private
     */
    _addTip() {
        let selectPanel = document.createElement('div');
        selectPanel.className = 'bosgeo-float-panel bosgeo-route-select-panel';
        selectPanel.innerHTML = `
            <a class="bosgeo-item" id="start">
                <span class="bosgeo-icon bosgeo-start-icon">起</span>
                <span>设为起点</span>
            </a>
            <a class="bosgeo-item">
                <span class="bosgeo-icon bosgeo-end-icon">终</span>
                <span>设为终点</span>
            </a>
        `;
        this.viewer.container.appendChild(selectPanel);
        this._selectPanel = selectPanel;
        this._bindClickEvent();
    }

    /**
     * 为选择面板绑定点击事件
     * @private
     */
    _bindClickEvent() {
        this._selectPanel.oncontextmenu = () => { return false; };
        this._selectPanel.addEventListener('click', (e) => {
            if (!this._tempLocation) return; //若没有点击地球
            this._selectPanel.style.display = 'none';
            let id = e.target.parentNode.id;
            if (id) { //起点
                this.startLocation = this._tempLocation;
                this.startIndoor = this._tempIndoor;
                this.startObj = this._tempIndoor ? this._tempObj : 'undefined';
            } else { //终点
                this.endLocation = this._tempLocation;
                this.endIndoor = this._tempIndoor;
                this.endObj = this._tempIndoor ? this._tempObj : 'undefined';
            }

            this._addPoint(id);
            if (this.startLocation && this.endLocation && this._isAutoRequuest) {
                this.requestRoute();
            }
        }, false);
    }

    /**
     * 添加起点、终点
     * @private
     * @param {String} isStart 当字符串是'start'为起点，是空串''为终点
     */
    _addPoint(isStart) {
        let flag = isStart ? 'start' : 'end';
        this.pointLayer.points.forEach(POI => {
            if (POI.properties === flag) {
                this.pointLayer.remove(POI);
            }
        })
        let point = this.pointLayer.add({
            position: this._tempLocation,
            properties: flag,
            billboard: {
                image: isStart ? this.startImg : this.endImg,
                scale: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        })
    }



    /**
     * 绑定底图事件的右键监听，弹出选点提示面板
     * @private
     */
    _addRightClickEventListener() {
        const { WINDOW_POSITION, WORLD_POSITION } = MapPickType;

        this.geomap.on(MapEventType.RIGHT_CLICK, (movement) => {
            let windowCoord = movement.window_position;
            let obj = this.viewer.scene.pick(windowCoord);
            if (obj) { //室内
                let cartesian = movement.world_position;
                this._tempLocation = GeoUtil.cartesianToArray(cartesian);
                this._tempIndoor = true;
                this._tempObj = obj.tileset;
            } else { //室外直接使用WORLD_POSITION，点地面会跑到地下-25m左右
                let cartesian = this.viewer.camera.pickEllipsoid(windowCoord);
                this._tempLocation = GeoUtil.cartesianToArray(cartesian);
                this._tempIndoor = false;
            }

            this._selectPanel.style.cssText = `left: ${windowCoord.x}px; top: ${windowCoord.y}px; display: block;`;
            if (this.status === 'over') {
                this.clear();
                this.status = undefined;
                this.stopRoam();
            }

        }, [WINDOW_POSITION, WORLD_POSITION]);
    }

    /**
     * 解析路径
     * @private
     * @param {Object} route 高德请求返回的路线
     * @param {Object} options 室外路径的起点终点
     * @param {Array<Number>} [options.outStart] 起点，火星坐标的数组（单位：度）
     * @param {Array<Number>} [options.outEnd] 终点，火星坐标的数组（单位：度）
     * @returns {Array} 解析后坐标的数组
     */
    _parseOutdoorRoute(route, options = {}) { // 解析高德请求的路网
        let {
            outStart = this.startLocation,
            outEnd = this.endLocation
        } = options;

        let path = route.paths[0];
        let steps = path.steps;

        let routeLonLlatArr = [];
        routeLonLlatArr.push([outStart[0], outStart[1], outStart[2]]);

        for (let i = 0, length = steps.length; i < length; i++) {
            let step = steps[i];
            let routePositions = step.polyline.split(';');
            let interval = parseInt(step.duration) / routePositions.length;

            for (let j = 0; j < routePositions.length; j++) {
                let position = routePositions[j].split(',');
                // baseTime += interval;
                position = CoordTransform.gcj02towgs84(parseFloat(position[0]), parseFloat(position[1]));
                routeLonLlatArr.push([position[0], position[1], this.defaultHeight]);
            }
        }

        routeLonLlatArr.push([outEnd[0], outEnd[1], outEnd[2]]);
        return routeLonLlatArr;
    }

    /**
     * 显示高德路径
     * @private
     */
    _showRoute() {
        let viewer = this.viewer;
        viewer.scene.globe.depthTestAgainstTerrain = false;
        this.lineLayer.add({
            positions: this.routeCoorArr,
            color: '#E8E705',
            width: 5
        })
        this.status = 'over'; //判断是否完成绘制
    }

    /**
     * 室外路径规划请求
     * @private
     * @param {Array<Number>} start 经纬度表示的起点
     * @param {Array<Number>} end 经纬度表示的终点
     */
    _requestOutRoute(start, end) {
        let startLocation = CoordTransform.wgs84togcj02(parseFloat(start[0]), parseFloat(start[1]));
        startLocation = startLocation[0].toFixed(6) + ',' + startLocation[1].toFixed(6);
        let endLocation = CoordTransform.wgs84togcj02(parseFloat(end[0]), parseFloat(end[1]));
        endLocation = endLocation[0].toFixed(6) + ',' + endLocation[1].toFixed(6);

        let promise = OtherApi.getOutdoorRoute({
            mode: this.mode,
            start: startLocation,
            end: endLocation
        });

        return promise;

    }

    /**
     * 判断路网是否存在，若存在则返回routeKey，否则返回字符串no_route_network
     * @private
     * @param {Object} options 属性对象
     * @param {String} options.accessToken 模型的token
     * @param {String} options.databaseKey 模型的数据库key
     * @param {String} options.modelKey 模型以M开头的modelkey
     */
    _getRouteKey(options) {
        let { accessToken, databaseKey, modelKey } = options;

        let url = `http://bos3d.bimwinner.com/api/${databaseKey}/routes/list`;

        let promise = new Promise((resolve, reject) => {
            Resource.fetchJson({
                url,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": accessToken
                },
                queryParameters: { modelKey }
            }).then(data => {
                if (data.data[0]) {
                    resolve(data.data[0].key);
                } else {
                    resolve('no_route_network');
                }
            })
        })
        return promise
    }

    /**
     * 提取路网，并返回routeKey
     * @private
     * @param {Object} options 属性对象
     * @param {String} options.accessToken 模型的token
     * @param {String} options.databaseKey 模型的数据库key
     * @param {String} options.modelKey 模型以M开头的modelkey
     */
    _extractRouteNetwork(options) {
        let { accessToken, databaseKey, modelKey } = options;
        let url = `http://bos3d.bimwinner.com/api/${databaseKey}/routes`

        let promise = new Promise((resolve, reject) => {
            Resource.post({
                url,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": accessToken
                },
                data: JSON.stringify({
                    modelKey,
                }),
                responseType: 'json'
            }).then(data => {
                resolve(data.data.key)
            })
        })
        return promise
    }

    /**
     * 获取路网提取状态
     * @private
     * @param {Object} options 属性对象
     * @param {String} options.accessToken 模型的token
     * @param {String} options.databaseKey 模型的数据库key
     * @param {String} options.routeKey 模型路网以R开头的routeKey
     */
    _getRouteStatus(options) {
        let { accessToken, databaseKey, routeKey } = options;

        let url = `http://bos3d.bimwinner.com/api/${databaseKey}/routes/status`;
        let params = {
            routeKey
        }

        let promise = new Promise((resolve, reject) => {
            Resource.fetchJson({
                url,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": accessToken
                },
                queryParameters: params
            }).then(data => {
                resolve(data.data.status)
            })
        })

        return promise
    }

    /**
     * 获取室内最短路径
     * @private
     * @param {Object} options 属性对象
     * @param {String} options.accessToken 模型的token
     * @param {String} options.databaseKey 模型的数据库key
     * @param {String} options.routeKey 模型路网以R开头的routeKey
     * @param {Object} options.start 起点的bim坐标,包含x、y、z坐标值的对象
     * @param {Object} options.end 终点的bim坐标,包含x、y、z坐标值的对象
     */
    _getShortestIndoorPath(options) {
        let { accessToken, databaseKey, routeKey, start, end } = options;
        start = start.x + ',' + start.y + ',' + start.z;
        end = end.x + ',' + end.y + ',' + end.z;
        let url = `http://bos3d.bimwinner.com/api/${databaseKey}/routes/shortestPath`;
        let params = {
            routeKey,
            start,
            end
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
                resolve(data.data)
            }, err => {
                reject(err);
            })
        })
        return promise

    }

    /** 
     * 获取模型的token、key等信息
     * @private
     * @param {Object} modelInfo 模型信息
     * @param {String} modelInfo.appKey 模型所在bos项目文件夹的appkey
     * @param {String} modelInfo.databaseKey 模型对应的数据库key
     * @param {String} modelInfo.geoKey 模型对应的以G开头的geokey
     * 
     */
    async _getTokenKey(modelInfo) {

        this.accessToken = await BosApi.getAccessToken(modelInfo.appKey);
        this.accessToken = this.accessToken.access_token;

        this.databaseKey = modelInfo.databaseKey; //可以通过modelInfo手动传进来

        this.modelKey = await BosApi.getModelKey(modelInfo.databaseKey, modelInfo.geoKey, this.accessToken);

        this.routeKey = await this._getRouteKey({
            accessToken: this.accessToken,
            databaseKey: modelInfo.databaseKey,
            modelKey: this.modelKey
        });
    }

    /**
     * 室内路径规划请求
     * @private
     * @param {Object} start 起点的bim坐标,包含x、y、z坐标值的对象
     * @param {Object} end 终点的bim坐标,包含x、y、z坐标值的对象
     */
    async _requestIndoorRoute(start, end) {
        let { accessToken, databaseKey, routeKey } = this;

        let indoorRoutePromise = this._getShortestIndoorPath({
            accessToken,
            databaseKey,
            routeKey,
            start,
            end
        });

        return indoorRoutePromise


        // if (routeKey === 'no_route_network') { // 如果route不存在，则提取路网 this._extractRouteNetwork
        //     routeKey = await this._extractRouteNetwork({
        //         accessToken,
        //         databaseKey,
        //         modelKey
        //     })
        //     let routeStatus = 0;
        //     while (routeStatus != 1) {
        //         routeStatus = await this._getRouteStatus({
        //             accessToken,
        //             databaseKey,
        //             routeKey,
        //         });
        //     }
        // }



    }

    /**
     * 计算室内路径长度
     * @private
     * @param {Array} route  室内路径的笛卡尔坐标Cartesian3数组
     */
    _computeIndoorRouteDistance(route) {
        let distance = 0;
        route.reduce((pre, cur) => {
            let dx = cur.x - pre.x;
            let dy = cur.y - pre.y;
            let dz = cur.z - pre.z;
            dx = dx * dx;
            dy = dy * dy;
            dz = dz * dz;
            distance += Math.sqrt(dx + dy + dz);
            return cur
        })

        return distance
    }

    /**
     * 将室内路径bim坐标点转为Cartesian3坐标，并以数组的形式返回,用于后续距离计算
     * @private
     * @param {Array<Array<Number>>} indoorRoute  室内路径
     * @param {Object} modelInfo 模型信息
     * @param {Object} modelInfo.coorTransform GeoUtil.computeCoorTransform计算得到的坐标转换参数
     */
    _bimRouteToCar3Positions(indoorRoute, modelInfo) {
        let routeArray = [];
        indoorRoute.forEach(point => {// bim坐标转为gis坐标
            let bimPoint = {
                x: point[0],
                y: point[1],
                z: point[2]
            }
            let gisPoint = GeoUtil.toGISPoint(modelInfo.coorTransform, bimPoint);
            routeArray.push(gisPoint);
        })

        return routeArray
    }

    /**
     * 选取室内外路径中的距离最短路径
     * @private
     * @param {Array} routes 室内外的路径组成的数组,包含每个路径的distance信息
     */
    _selectShortestRoute(routes) {
        let shortRoute = { distance: Number.POSITIVE_INFINITY };
        routes.forEach(route => {
            if (route.distance < shortRoute.distance) {
                shortRoute = route;
            }
        })
        return shortRoute
    }

    /**
     * 设置路径坐标点的高度，优化漫游效果
     * @private
     * 
     */
    _setRouteCoorArrHeight() {
        // this.routeCoorArr[0][2] -= 1.2;
        // this.routeCoorArr[this.routeCoorArr.length - 1][2] -= 1.2;
        this.routeCoorArr.forEach(point => {
            point[2] += 1.2
        })
    }


    /**
     * 计算门的gis坐标信息并返回
     * @private
     * @param {Object} modelInfo 模型门坐标和转换矩阵信息
     * @param {Array} modelInfo.doorsInfo 模型门坐标信息，包含bimPoint信息（含x、y、z值的bim坐标对象）
     */
    _computeModelDoors(modelInfo) {
        modelInfo.doorsInfo.forEach((door) => {
            door.gisPoint = GeoUtil.toGISPoint(modelInfo.coorTransform, door.bimPoint);
            door.gisPoint = GeoUtil.cartesianToArray(door.gisPoint)
        })
        return modelInfo
    }

    /**
     * 发送路径规划请求
     * @example
     * var geomap = new BOSGeo.GeoMap('bosgeoContainer');
var layerManager = geomap.layerManager;
var pointLayer = layerManager.createLayer(BOSGeo.LayerType.POINT, "point");
var modelLayer = layerManager.createLayer(BOSGeo.LayerType.MODEL, '模型图层');

let testModel1 = modelLayer.add({
    name: 'testModel',
    // 江湖别墅,shp文件夹下
    url: 'http://bos3d.bimwinner.com/api/j798920c67de49e4aeb3634e52a84548/geomodels/G1622167164209/data/tileset.json',
    featureType: BOSGeo.FeatureType.BIM,
    position: [116.3972282409668, 39.90960456049752, 5],
});
modelLayer.zoomTo(testModel1);

// 计算转换平移矩阵的对应点参数
var gisPoints = [], bimPoints = [];

// model1的坐标转换计算
gisPoints[0] = new BOSGeo.Cartesian3(-2178129.197384819, 4388344.140116348, 4070291.1682924205); //第一个gis坐标系取点
bimPoints[0] = { x: -5518.740713069945, y: -11686.319421872764, z: 6908.565989684334 }; //第一个bim坐标系取点

var paramPoints = {
    gisPoints,
    bimPoints
};



 //前期需要录入的信息:出发模型和终点模型的对象，包含： 门的bim坐标，模型所在的账号密码，文件夹的appKey，dataBaseKey，geoKey，并且需要提前提取好路网
var modelInfo = {
    doorsInfo: [{
        bimPoint: { x: 117.79746874097204, y: -8938, z: 13.172837318709753 }
    }, {
        bimPoint: { x: -9321.217008705518, y: -8887, z: 6.242604241011122 }
    }, {
        bimPoint: { x: -10672.400352404693, y: 2263, z: 21.301608240939117 }
    }, {
        bimPoint: { x: -10128, y: -2929.8018259805017, z: 23.392377448263858 }
    }],
    appKey: 'z6faa9cffe0e499d91ef646661991ea4',
    databaseKey: 'j798920c67de49e4aeb3634e52a84548',
    geoKey: 'G1622167164209'
}


let testModel2 = modelLayer.add({
    name: 'testModel2',
    // 江湖别墅
    url: 'http://bos3d.bimwinner.com/api/le52fbc690684bca831905685f06a95d/geomodels/G1623317872900/data/tileset.json',
    featureType: BOSGeo.FeatureType.BIM,
    position: [116.3972282409668, 39.90915, 6],
    // rotation:[2.9,0,0]       //模型位置
});


//model2的坐标转换参数
var model2gisPoints = [], model2bimPoints = [];
model2gisPoints[0] = new BOSGeo.Cartesian3(-2178141.940259859, 4388370.481515943, 4070250.208285653);
model2bimPoints[0] = { x: -5517.243744153587, y: -11686.318204661751, z: 3909.6417072394815 };

model2gisPoints[1] = new BOSGeo.Cartesian3(-2178130.8168315007, 4388367.349097477, 4070259.386480476);
model2bimPoints[1] = { x: -14087.999999999998, y: 326.05623500206286, z: 3857.852437266018 };

var model2paramPoints = {
    gisPoints: model2gisPoints,
    bimPoints: model2bimPoints
}

// 前期需要录入的信息:出发模型和终点模型的对象，包含： 门的bim坐标，模型所在的账号密码，文件夹的appKey，dataBaseKey，geoKey，并且需要提前提取好相关模型路网
var model2Info = {
    doorsInfo: [{
        bimPoint: { x: 117.79746874097204, y: -8938, z: 13.172837318709753 }
    }, {
        bimPoint: { x: -9321.217008705518, y: -8887, z: 6.242604241011122 }
    }, {
        bimPoint: { x: -10672.400352404693, y: 2263, z: 21.301608240939117 }
    }, {
        bimPoint: { x: -10128, y: -2929.8018259805017, z: 23.392377448263858 }
    }],
    appKey: 'k897cda8821145c380ff609e7e51e7ca',
    databaseKey: 'le52fbc690684bca831905685f06a95d',
    geoKey: 'G1623317872900'
}

var routePlan;
var rootTransform2, coorTransform2;
testModel2.readyPromise.then(() => {
    rootTransform2 = testModel2.root.transform;
    coorTransform2 = BOSGeo.GeoUtil.computeCoorTransform(rootTransform2, model2paramPoints);
    model2Info.coorTransform = coorTransform2;

    // 3dtiles的根节点transform
    var rootTransform, coorTransform;
    testModel1.readyPromise.then(() => {
        rootTransform = testModel1.root.transform;
        coorTransform = BOSGeo.GeoUtil.computeCoorTransform(rootTransform, paramPoints);
        modelInfo.coorTransform = coorTransform;

        routePlan = new BOSGeo.RoutePlan(geomap, {
            isAutoRequest: false,
            startModel: modelInfo,
            endModel: model2Info
        });
    })

})

document.getElementById('requestRoute').onclick = function () {
    routePlan.requestRoute();
}
     */
    async requestRoute() {
        let { startModel, endModel } = this;
        if (!this.startLocation || !this.endLocation) {
            throw new DeveloperError('start and end positions are both required.')
        }

        // 室内外路径规划一共分五种情况
        if (!this.startIndoor && !this.endIndoor) {
            // 1.从室外到室外
            let promise = this._requestOutRoute(this.startLocation, this.endLocation);
            promise.then((data) => {
                let route = data.route || data.data;
                this.routeCoorArr = this._parseOutdoorRoute(route);
                this._setRouteCoorArrHeight();
                this._showRoute();
            })

        } else if (!this.startIndoor && this.endIndoor) {
            // 2.从室外到室内

            // 如果终点点在了startModel上，则将startModel的值赋给endModel，并在导航结束后还原；
            var isInversed = false;//是否交换起点、终点模型
            var tempObj;
            let dataUrl = this.endObj.dataUrl;
            let key = endModel.geoKey;
            if(dataUrl.indexOf(key) === -1){
                tempObj = endModel;
                endModel = startModel;
                isInversed = true;
            }

            var routes = [];
            let doors = endModel.doorsInfo;
            
            let routePromise = new Promise(async (resolve, reject) => {
                var promiseSum = 0;
                for (let i = 0, length = doors.length; i < length; i++) {
                    // 获取室外路径
                    let outdoorRoute = await this._requestOutRoute(this.startLocation, doors[i].gisPoint);
                    outdoorRoute = outdoorRoute.route || outdoorRoute.data;


                    // 获取室内路径
                    let endPoint = Cartesian3.fromDegrees(this.endLocation[0], this.endLocation[1], this.endLocation[2])
                    endPoint = GeoUtil.toBIMPoint(endModel.coorTransform, endPoint)
                    if (!this.accessToken) {
                        await this._getTokenKey(endModel)
                    }
                    let indoorRoutePrimsie = this._requestIndoorRoute(doors[i].bimPoint, endPoint);

                    indoorRoutePrimsie.then(indoorRoute => {
                        promiseSum += 1; //判断是否全部promise都返回结果
                        let indoorRoutePositions = [];
                        if (indoorRoute) { //如果室内路径存在

                            indoorRoutePositions = this._bimRouteToCar3Positions(indoorRoute, endModel);

                            let indoorRouteDistance = this._computeIndoorRouteDistance(indoorRoutePositions);
                            let routeDistance = parseFloat(outdoorRoute.paths[0].distance) + indoorRouteDistance;//计算内外距离的和

                            routes.push({
                                distance: routeDistance,
                                outdoorRoute,
                                door: doors[i],
                                indoorRoute: indoorRoutePositions
                            })
                            if (promiseSum === length) {
                                resolve(routes);
                            }
                        }
                    })

                }
            })

            routePromise.then(routes => {
                if (routes.length > 0) {
                    let shortRoute = this._selectShortestRoute(routes);// 选取最短路径

                    this.routeCoorArr = this._parseOutdoorRoute(shortRoute.outdoorRoute, {
                        outStart: this.startLocation,
                        outEnd: shortRoute.door.gisPoint
                    });
                    shortRoute.indoorRoute.forEach(point => {
                        let _point = GeoUtil.cartesianToArray(point);
                        this.routeCoorArr.push(_point);
                    });

                    this._setRouteCoorArrHeight();

                    this._showRoute();

                    if(isInversed) {
                        endModel = tempObj;
                        tempObj = null;
                        isInversed = false;
                    }

                } else {
                    if(isInversed) {
                        endModel = tempObj;
                        tempObj = null;
                        isInversed = false;
                    }
                    throw new DeveloperError('没有规划出可行的路径！')
                }
            })

        } else if (this.startIndoor && !this.endIndoor) {
            // 3.从室内到室外

            // 如果起点点在了endModel上，则将endModel的值赋给startModel，并在导航结束后还原；
            var isInversed = false;//是否交换起点、终点模型
            var tempObj;
            let dataUrl = this.startObj.dataUrl;
            let key = startModel.geoKey;
            if(dataUrl.indexOf(key) === -1){
                tempObj = startModel;
                startModel = endModel;
                isInversed = true;
            }

            var routes = [];
            let doors = startModel.doorsInfo;
            let routePromise = new Promise(async (resolve, reject) => {
                var promiseSum = 0;
                for (let i = 0, length = doors.length; i < length; i++) {

                    // 获取室内路径
                    let startPoint = Cartesian3.fromDegrees(this.startLocation[0], this.startLocation[1], this.startLocation[2]);
                    startPoint = GeoUtil.toBIMPoint(startModel.coorTransform, startPoint);
                    if (!this.accessToken) {
                        await this._getTokenKey(startModel);
                    }
                    let indoorRoutePromise = this._requestIndoorRoute(startPoint, doors[i].bimPoint);

                    indoorRoutePromise.then(async (indoorRoute) => {
                        promiseSum += 1; //判断是否全部promise都返回结果
                        let indoorRoutePositions = [];
                        if (indoorRoute) { //如果室内路径存在

                            // 获取室外路径
                            let outdoorRoute = await this._requestOutRoute(doors[i].gisPoint, this.endLocation);
                            outdoorRoute = outdoorRoute.route || outdoorRoute.data;

                            indoorRoutePositions = this._bimRouteToCar3Positions(indoorRoute, startModel);

                            let indoorRouteDistance = this._computeIndoorRouteDistance(indoorRoutePositions);
                            let routeDistance = parseFloat(outdoorRoute.paths[0].distance) + indoorRouteDistance;//计算内外距离的和
                            routes.push({
                                distance: routeDistance,
                                outdoorRoute,
                                door: doors[i],
                                indoorRoute: indoorRoutePositions
                            });
                            if (promiseSum === length) {
                                resolve(routes);
                            }

                        }
                    })


                }

            })

            routePromise.then(routes => {
                // 选取最短路径
                if (routes.length > 0) {
                    let shortRoute = this._selectShortestRoute(routes);// 选取最短路径

                    this.routeCoorArr = [];
                    shortRoute.indoorRoute.forEach(point => {
                        let _point = GeoUtil.cartesianToArray(point);
                        this.routeCoorArr.push(_point);
                    })

                    let outdoorRouteCoor = this._parseOutdoorRoute(shortRoute.outdoorRoute, {
                        outStart: shortRoute.door.gisPoint,
                        outEnd: this.endLocation
                    });

                    this.routeCoorArr = this.routeCoorArr.concat(outdoorRouteCoor);//内外路径拼接
                    this._setRouteCoorArrHeight();

                    this._showRoute();
                    if(isInversed) {
                        startModel = tempObj;
                        tempObj = null;
                        isInversed = false;
                    }

                } else {
                    if(isInversed) {
                        startModel = tempObj;
                        tempObj = null;
                        isInversed = false;
                    }
                    throw new DeveloperError('没有规划出可行的路径！')
                }
            })

        } else {
            if (this.startObj === this.endObj) {
                // 4.从室内到本栋楼的室内
                // 如果起点点在了endModel上，则将endModel的值赋给startModel，并在导航结束后还原；
                var isInversed = false;//是否交换起点、终点模型
                var tempObj;
                let dataUrl = this.startObj.dataUrl;
                let key = startModel.geoKey;
                if(dataUrl.indexOf(key) === -1){
                    tempObj = startModel;
                    startModel = endModel;
                    isInversed = true;
                }

                let satrtPoint = Cartesian3.fromDegrees(this.startLocation[0], this.startLocation[1], this.startLocation[2]);
                satrtPoint = GeoUtil.toBIMPoint(startModel.coorTransform, satrtPoint);
                let endPoint = Cartesian3.fromDegrees(this.endLocation[0], this.endLocation[1], this.endLocation[2]);
                endPoint = GeoUtil.toBIMPoint(startModel.coorTransform, endPoint);
                if (!this.accessToken) {
                    await this._getTokenKey(startModel);
                }
                let indoorPromise = this._requestIndoorRoute(satrtPoint, endPoint);
                indoorPromise.then(indoorRoute => {
                    if (indoorRoute) {
                        this.routeCoorArr = [];

                        indoorRoute.forEach(point => {
                            let bimPoint = {
                                x: point[0],
                                y: point[1],
                                z: point[2]
                            }
                            let gisPoint = GeoUtil.toGISPoint(startModel.coorTransform, bimPoint)
                            gisPoint = GeoUtil.cartesianToArray(gisPoint);
                            this.routeCoorArr.push(gisPoint);
                        })

                        this._setRouteCoorArrHeight();

                        this._showRoute();
                        if(isInversed) {
                            startModel = tempObj;
                            tempObj = null;
                            isInversed = false;
                        }
                    } else {
                        if(isInversed) {
                            startModel = tempObj;
                            tempObj = null;
                            isInversed = false;
                        }
                        throw new DeveloperError('没有规划出可行的路径！')
                    }
                })
            } else {
                // 5.从室内到另一栋楼的室内
                // 如果起点点在了endModel上，则将endModel与startModel互换，并在导航结束后还原；
                var isInversed = false;//是否交换起点、终点模型
                var tempObj;
                let dataUrl = this.startObj.dataUrl;
                let key = startModel.geoKey;
                if(dataUrl.indexOf(key) === -1){
                    tempObj = startModel;
                    startModel = endModel;
                    endModel = tempObj;
                    isInversed = true;
                }


                var routes = [];
                let startDoors = startModel.doorsInfo;
                let endDoors = endModel.doorsInfo;

                let promise = new Promise(async (resolve, reject) => {

                    let promiseSum = 0;//统计返回promise的数量,和两个模型的门数量乘积进行比较
                    let startIndoorRoutePromiseArray = []; //存放出发点模型的最短路径请求的promise数组
                    // 获取生成多个路径
                    for (let i = 0; i < startDoors.length; i++) { //出发点模型的多个门
                        let startPoint = Cartesian3.fromDegrees(this.startLocation[0], this.startLocation[1], this.startLocation[2]);
                        startPoint = GeoUtil.toBIMPoint(startModel.coorTransform, startPoint)
                        //请求出发点模型的室内路径

                        if (!this.accessToken) {
                            await this._getTokenKey(startModel);
                        }

                        let startIndoorRoutePromise = this._requestIndoorRoute(startPoint, startDoors[i].bimPoint);
                        startIndoorRoutePromiseArray.push({
                            promise: startIndoorRoutePromise,
                            startDoor: startDoors[i]
                        });
                    }

                    let indoorRoutePromiseArray = []; //两个模型的室内路径组成的数组
                    let startDoorsPromiseSum = 0;
                    this._initTokenKey(); //查找另一个模型，初始化key和token
                    for (let j = 0; j < startIndoorRoutePromiseArray.length; j++) {
                        if (!this.accessToken) {
                            await this._getTokenKey(endModel);
                        }
                        startIndoorRoutePromiseArray[j].promise.then(async (startIndoorRoute) => {
                            if (startIndoorRoute) {// 如果室内存在，继续请求
                                startDoorsPromiseSum += 1;

                                for (let k = 0; k < endDoors.length; k++) { 
                                    
                                    
                                    //终点模型的多个门
                                    // 请求终点模型的室内路径
                                    let endPoint = Cartesian3.fromDegrees(this.endLocation[0], this.endLocation[1], this.endLocation[2]);
                                    endPoint = GeoUtil.toBIMPoint(endModel.coorTransform, endPoint);

                                    let endIndoorRoutePromise = this._requestIndoorRoute(endDoors[k].bimPoint, endPoint);

                                    indoorRoutePromiseArray.push({
                                        startIndoorRoute,
                                        startDoor: startIndoorRoutePromiseArray[j].startDoor,
                                        promise: endIndoorRoutePromise,
                                        endDoor: endDoors[k]
                                    })
                                }

                                if (startDoorsPromiseSum === startModel.doorsInfo.length) {
                                    for (let m = 0; m < indoorRoutePromiseArray.length; m++) {
                                        // 室外路径规划
                                        let startDoor = indoorRoutePromiseArray[m].startDoor;
                                        let endDoor = indoorRoutePromiseArray[m].endDoor;
                                        let outdoorRoute = await this._requestOutRoute(startDoor.gisPoint, endDoor.gisPoint);
                                        outdoorRoute = outdoorRoute.route || outdoorRoute.data;

                                        indoorRoutePromiseArray[m].promise.then(async (endIndoorRoute) => {
                                            if (endIndoorRoute) {
                                                promiseSum += 1;

                                                let startIndoorRoute = indoorRoutePromiseArray[m].startIndoorRoute;

                                                // 计算距离，加入路径的数组
                                                let startIndoorRoutePositions = [];
                                                startIndoorRoutePositions = this._bimRouteToCar3Positions(startIndoorRoute, startModel);

                                                let startIndoorDistance = this._computeIndoorRouteDistance(startIndoorRoutePositions);

                                                let endIndoorRoutePositions = [];
                                                endIndoorRoutePositions = this._bimRouteToCar3Positions(endIndoorRoute, endModel);

                                                let endIndoorDistance = this._computeIndoorRouteDistance(endIndoorRoutePositions);
                                                let routeDistance = parseFloat(outdoorRoute.paths[0].distance) + startIndoorDistance + endIndoorDistance;

                                                routes.push({
                                                    distance: routeDistance,
                                                    outdoorRoute,
                                                    startIndoorRoute: startIndoorRoutePositions,
                                                    endIndoorRoute: endIndoorRoutePositions,
                                                    startDoor,
                                                    endDoor
                                                })
                                                if (promiseSum === (startModel.doorsInfo.length * endModel.doorsInfo.length)) {
                                                    resolve(routes);
                                                }

                                            } else {
                                                promiseSum += 1;
                                            }
                                        })
                                    }
                                }
                            } else {
                                startDoorsPromiseSum += 1;
                                promiseSum += endDoors.length;
                            }
                        })
                    }
                })

                promise.then(routes => {
                    // 选择最短路径
                    if (routes.length > 0) {
                        let shortRoute = this._selectShortestRoute(routes);// 选取最短路径

                        this.routeCoorArr = [];
                        shortRoute.startIndoorRoute.forEach(point => {
                            let _point = GeoUtil.cartesianToArray(point);
                            this.routeCoorArr.push(_point);
                        })

                        let outdoorRouteCoor = this._parseOutdoorRoute(shortRoute.outdoorRoute, {
                            outStart: shortRoute.startDoor.gisPoint,
                            outEnd: shortRoute.endDoor.gisPoint
                        })
                        this.routeCoorArr = this.routeCoorArr.concat(outdoorRouteCoor);

                        shortRoute.endIndoorRoute.forEach(point => {
                            let _point = GeoUtil.cartesianToArray(point);
                            this.routeCoorArr.push(_point);
                        })

                        this._setRouteCoorArrHeight();

                        this._showRoute();
                        if(isInversed) {
                            endModel = startModel;
                            startModel = tempObj;
                            tempObj = null;
                            isInversed = false;
                        }
                    } else {
                        if(isInversed) {
                            endModel = startModel;
                            startModel = tempObj;
                            tempObj = null;
                            isInversed = false;
                        }
                        throw new DeveloperError('没有规划出可行的路径！')
                    }
                })
            }
        }

    }

    /**
     * 开始漫游,根据解析渲染后的路径漫游
     * @param {Number} playSpeed 漫游速度，默认值为1，值越大速度越快
     * @param {Number} distanceThreshold 默认值为0.3，漫游路径会根据该值忽略距离过近的线段，值为0时保留全部线段
     * @example
     * var routePlan = new BOSGeo.RoutePlan(geomap, {
            isAutoRequest: false,
            startModel: modelInfo,
            endModel: model2Info
        });
        // 选点生成坐标路径后
        routePlan.startRoam();
     */
    startRoam(playSpeed = 1, distanceThreshold = 0.3) {
        if (!this.routeCoorArr) return;
        let roamCoorArr = [];
        this.routeCoorArr.forEach((arr) => {
            arr.forEach((p) => {
                roamCoorArr.push(p);
            })
        });
        this.autoRoam = new Roam({
            positions: roamCoorArr,
            positionWithHeight: true,
            playSpeed,
        }, this.geomap);
        this.autoRoam.start(distanceThreshold);
    }
    /**
     * 停止漫游
     * @example
     * var routePlan = new BOSGeo.RoutePlan(geomap, {
            isAutoRequest: false,
            startModel: modelInfo,
            endModel: model2Info
        });
        // 选点生成坐标路径后
        routePlan.startRoam();
        routePlan.stopRoam();
     */
    stopRoam() {
        if (this.autoRoam) {
            this.autoRoam.stop();
        }
    }


    /**
     * 清除规划的路线信息
     * @example
     * var routePlan = new BOSGeo.RoutePlan(geomap, {
            isAutoRequest: false,
            startModel: modelInfo,
            endModel: model2Info
        });
        // 选点生成坐标路径后
        routePlan.clear();
     */
    clear() {
        this.startLocation = undefined;
        this.endLocation = undefined;
        this.pointLayer.removeAll();
        this.lineLayer.removeAll();
        this._initTokenKey();
        this.geomap.render();
    }
}

export default RoutePlan;