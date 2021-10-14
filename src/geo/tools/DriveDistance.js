import CoordTransform from '../utils/CoordTransform';
import Cartographic from 'cesium/Core/Cartographic';
import CesiumMath from 'cesium/Core/Math';
import CzmlDataSource from 'cesium/DataSources/CzmlDataSource.js';
import Resource from 'cesium/Core/Resource'
import MapEventType from '../constant/MapEventType.js';
import MapPickType from '../constant/MapPickType.js';
import Cartesian2 from 'cesium/Core/Cartesian2'
import HeightReference from "cesium/Scene/HeightReference.js";
import ClockRange from "cesium/Core/ClockRange";
import GeoUtil from "../utils/GeoUtil";



const Event = require('eventemitter3');
/**
 * 驾车距离（路线）查询分析
 * 
 * @param {Object} options 驾车距离参数，包含以下属性
 * @param {String} [options.mode = 'driving'] 查询模式，默认为驾车, 可选'walking'
 * @param {Number} [options.speed = 20] 驾车速度，默认20
 * @param {String} [options.startImg] 起点图片，默认为一张base64图片
 * @param {String} [options.endImg] 终点图片，默认为一张base64图片
 * @example
    let geomap = new BOSGeo.GeoMap('bosgeoContainer');
    let dd = new BOSGeo.DriveDistance({speed: 10});
    dd.addTo(geomap); 
 */
class DriveDistance extends Event {
    constructor(options) {
        super();
        this.options = options || {};
        this.options.baseUrl = 'https://restapi.amap.com/v3/direction/'; //高德API的前缀
        this.mode = this.options.mode || 'driving'; //查询模式，默认为 驾车
        this.speed = this.options.speed || 20;
        this.defaultHeight = 0;
        this.StartMarkImg = this.options.startImg || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAfCAYAAAAFkva3AAADVUlEQVR42qWUa0zNcRzG/2bMS/PG5gVzSyJ3ueeSg8LG2Bhzm0szRkyG0VG5RKhE7nNZK3OZUhgKbeQ2tNFm5dqy3A66Hef6f3yfX/abHEfF2T773p7n+Z/z4n8MAD5EJNa2E6KFW8I7wfmzFnDP+5989UN21rQQ4gX7xBQXJqUBkw8KR1RVM/e8U0f9H8PCd1S1FvIjkh2YdFiMR/zDO3WivyG0qRc2IaGyuZAXvteBCBGT2aeA9dns/UO9+AqFljps/Pavmyck2RFxGJqtV4Ccorp+1kk1a9ZlQevoo1+FjdtqayvYww94EX4IWJpZF3L3BVD6nr3eabinltBHP3MMy5ZPayy7azDukKmYecJE/GXg9AMGqp77X2FYvZl+yYk2wuI+3LCkOmE5aCoiM4D4S0CmhBVKGPsZx01cLIKmtALUauhnjjEmtuJD2H43wuTrkrhcE9lPoLDV1PWLM0yUfwFvirxiUKuhX3LeG6Ot5d7RaR78yvViE9OPeVBSAb3TvR+YY4zcVFY9ar8Lo9LcimnH3PwWqrc7ISEmMu57WbWGD1t93qNn+iWnygjd+PpJaHItQmVBrDke8LPqnIcBes/grMdeon7+VHko94qUWkhOkTFiw8uUETtsGL7PqUi/58GdUmVgmN5HnXUj5mIdU466uNPQLzmpxrD1JYOHWt9iSKpDYasG5p1yYuVZF3sVeOGRR3PtmVft0u+6tYd+5qg3YOja57eGbPuIQXu/Y8UZJyvR88Zslw9zTjrUnT769es0OLq4m+AISapGSIq90VBPH/06jAxa8zQ2ZHMZBiTXNhrq6fP5Cxq4uqiV8Kp/wkf0S65pEOqop88njAyIejyl/4YS9E6qbhDqqPf7T0v6rXiY1zu2DMF7qvzCu+jyqf9rWN/l93sJ3h67K+EP3qlrMIz0WVaYGRzzCkG7vvnAPe/UNSqs19LbQYIZmPgVv8M9740OI8GRBVmB1jfomvhFw5l73psU1nPJzbFBUQ/RZadNw5n7JocFLcpvJrzsvKUCneRFZuXMfZPDSPeF12MCop+iY8JnsMps5f6fwgIXXA0MiCxA+4RPYOX8z2Gk2/wrLzrElYOV83+FBcy7vK/j2mdg/e+wrnNzxwqVgqUh7Q8B5YCq9660DQAAAABJRU5ErkJggg==';
        this.EndMarkImg = this.options.endImg || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAfCAYAAAAFkva3AAAEIklEQVR42qWUW2ibdRjGI6J4Kd4IXrbNej6f2xybfDmnydpOwc276Z2g0F4IMrfplYgiihO2KwV3o65TZJa2ox7WgeDaiSJrt4rs0PSQpm3SL4cvyeP7/AOBkc2tW+HHm/d9n+f5/79+JCYAFSSHwy8IE8KccFvICqw/cc79vXx3NTvh0FPCu4KeCUdhhEdRCI+hGDrEqnrOuaeO+nuGJULBZ4VZPRRBISgBQQnwj6DgiQhhVvacqz11or8oPHdX2FbQ/6QwowdLQXn/QRQOHYbh8MKwa4r8yEuqz7sC3Csd9eKbF54uh20G/MeTgWHkA/IocoP88feAeBxG9EXkrG5V+We8OY6cTUOOh2glfUp89KuwdZ/veUHPyWmGN4qs3YPC0jKMYyeRe2MCWYsLhXPnUdR1zktcmqdODo6CPvqZY4p5veM7vhAM34ic6IfxwUcoLi4iO+BiAPtS/fwMZ+WDsgNu6pWPfsmZMN3xuC/uaRFkXVGkBzzKmP91vsTUDIo3byF36oyqxpdn1Tzd5yLUKx/9zDHdcrvX0u4oMo4QdApCY4ritWXovUNIv/KqqoWFq+qg7Nsn2RPqlY9+yYmZ/nU5CxnXQaStQez1DCkKEpR+fRy6hGZPnUaBt/r2PDISVIzH2XNOrfLRzxzTP05HUh+KQLcGkOoeQvaLr9QNiptx5KamkXn/Q+wdOQrjl3lkPjstGicrZ9QrH/2Ss2u6brct7NjD0AdDSHa5kPKNKZKdznIlqcMqkIeU59TTR7/kLJqWbNaP12w+6LYIUkdeQ/abSRhXrqpHyV9bQtI7WrqlBCVfPqr63Q6HItntVr4N8UvOJ6a/LYN9NywOpCwR7Pb6kflxGqm3TsjrHsV2u4Ooz5mvJ/n43Jd2HU7qlY9+5qhvwJ8D/XO3BzQk+4ex3elGosUh2CvY1kaQvTAtdYw6paeP/vLX6Y/+vlohk+iT5+8JINHmxFaz/b5wTx319NFfDiMLvT0nVnrkf9ETQqJVQ7zJjnijrQLOuaeOevoqfoJ+7+56RlhZ7dKw3RXAZpMDGw3WCjjnnjrq6asII791dUb/6hxEoj2IeLOG9Xob1uusZdhzzj111N/3l5Zc7mifWZHXvtUWkJs4sFZrKcOec+5FN0v9/4ZdamttEQpbrXxUTUKsiJktrKrnnHvqHhhGfm5tObvUbBOzH7FaB+5UD7KqnnPuqXuosLnmpgahuNHolxu5JcyqKnvOuX/oMDLb2Di53GDHeoMXq2anquw5535fYdMN9e7LDe3yFn2IHdBUZc/5vsOm6uueEG7cNLuxZvaBlT3n+w4jF2prjy2YexGr8YBV+nc4f6SwHw4cqJs1N2K12gNW9o8cRr4311xfqXKClf1jhX1XU/3pYlUvWB877Fx1lVvYEbQHaf8DXsIRTnndJhMAAAAASUVORK5CYII=';
        this.distanceFlagImg = this.options.distanceImg || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACP0lEQVRYR+2XMWiTQRTHf+/SLzE6KLam1Uloa8TaqBAidYqzo4Md1KKLkKVtBh3r5CK2cXASgh0sog6CoKCIpVhq2gpaUJGWVjBgJYOIotL63ZMMhc/Q2qSJiUNu/O7ee7/3v3f37hNqPKTG8fkD4ONQNG4wTy32qKhpNaInQZoVWgC/whsjvHVdFnwNcjPUm5ktN4FVATxO34POoGQR+aboXkHCQBjhpygjxuhIU+/Uk42CrAqgqrcwvlRL3/PMao4Xr0b3G2u6FbqBVtCHgkmH+jN3SwVZcwt29k+Prufsw2BX0I/bg2gCpBMYEyUdSk4Or2e7Ml8WwIqThYvxTZu3fk8gJFBaBaZVmcbwUsWOB+yv7BL+uLUcxNhRb3IVAVgByV6KNTpBTaByXIQOhYZCJfIF/s8AvMEWL0e2NDiBfctKB1Z25+eMYaBqAIWZe494VRSoA9QVqCtQMQW+DHZt/2G0XdRts1bafT5ei8i84zjz2xLPPhd755d8D/gwnaqcQTi0VhBBbri4w8U0rpIAPJ3qPvAY7BzqzIaSE3OfUocjKAcQPaJKj0AQuCdGrod6Mw/Wgi0V4A4w1Nw/OfE3iXNXYnvUcFrhHNCkcNuIXgv1TY1VrAaK2eNcKhp21ZwXOJtfL5BWbNosBWZ2XBj/mv9WkgKFHasYiPya3FDsmCKnFD3hsXkHsgS6C2isSjfMDcaiKhJRNAzSJrAMvFLlRXMy88ibUEUfJMUqVQeoK/D/KrCRKi7XpuZ/x78Bjtu/MFbwyiYAAAAASUVORK5CYII=';
        this.entityList = [];
    }

    /**
     * 添加起点终点面板提示信息
     * @private
     */
    addTip() {
        let selectPanel = document.createElement('div');
        selectPanel.className = 'bosgeo-float-panel bosgeo-route-select-panel';
        selectPanel.innerHTML = `
        <a class="bosgeo-item" id="start">
            <span class="bosgeo-icon bosgeo-start-icon">起</span>
            <span>设为起点</span>
        </a>
        <a class="bosgeo-item"  >
            <span class="bosgeo-icon bosgeo-end-icon">终</span>
            <span>设为终点</span>
        </a>`;

        this._geomap.viewer.container.appendChild(selectPanel);
        this._selectPanel = selectPanel;
        this.bindEvent()

    }
    /**
     * 切换查询模式，'walking','driving'
     * @param {String} value 查询模式
     * @example
        let geomap = new BOSGeo.GeoMap('bosgeoContainer');
        let dd = new BOSGeo.DriveDistance({speed: 10});
        dd.changeMode('walking');
     */
    changeMode(value) {
        this.mode = value;
    }
    /**
     * 提示面板绑定事件
     * @private
     */
    bindEvent() {
        this._selectPanel.oncontextmenu = () => { return false; };
        this._selectPanel.addEventListener('click', (e) => {
            if (!this._tempLocation) return;
            this._selectPanel.style.display = 'none';
            let id = e.target.parentNode.id;
            if (!id) {
                this.startLocation = this._tempLocation;
            }
            else {
                this.endLocation = this._tempLocation;
            }
            this.addPoint(id);
            //成对点即开启查询（多次查询），防止先选终点，再选起点操作
            if (this.startLocation && this.endLocation) {
                // console.log('开始查询')
                this.routeQueryFromEnd();
            }

        }, false);
    };

    /**
     * 添加路线
     * @private
     */
    addRouteLine(coorArr, speed) {
        let viewer = this.viewer;
        viewer.scene.globe.depthTestAgainstTerrain = false;
        var path = [{
            "id": "document",
            "name": "path",
            "version": "1.0",
            "clock": {
                "interval": "2020-01-20T10:00:00Z/2021-10-20T10:30:00Z",
                "currentTime": "2020-01-20T10:00:00Z",
                "multiplier": speed
            }
        }, {
            "id": "pathx",
            "name": "pathx",
            "description": "<p>driving example</p>",
            "availability": "2020-01-20T10:00:00Z/2021-10-20T10:30:00Z",

            "billboard": {
                "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAACm0lEQVRIS+2VS0jUURTGv++qUfaCkhldtBECUYIeOEMRaO2SNgUFFUJtRIjIUegBQUYUQuSIRNbKAtNQCiQrIuiJlv8pCnpBbYKIdELaWJtm7hd3QpkZZ9SEpk138/9zv3PO757DOfcSOVrMEQf/QXOu9L8t3Vh7sDwW0wFSZdlSsOJrSj3+psjQbNKcklECElcvgApCD7IFEVgNcJxQiy/knZoJNgUUDQdaBBwmsdPX4PVNBIiGK++7f18ossl9v4bXlQj55wRth7Tf3xg5Px0sBfSmuWJe0dKFnyW8Km70Nic7poOcptb1C6K01wBtEbC7OOT1ZIOlgEbCgV0EumFV62+KdM0EcvrImQ0+UxC7KqEKRI2/wbuTCZYCGg0HXgJY7g95K9KNM2U0YTMariyVeAXESsnWlDQ+89L9GW0L7IjHUeEEY3DcWpzIdKI8oyq3H7d8mEk3BgKwDUChtegm8T7f6ENRQyTi7BkNBzsF7Z2pa+aqu4OXNHnNdCX53ap/bxmhMicgCBcygDhI2l4Jbw25Ki4cI7BsFvn2UXhEg49WLBN0dMLPDX4aiIM0OC1rTwJcC+AJqSMS3TAmGibz4m1Q/RAOASglMYC47ZAxbuALE6AvZwPNrtsSHSXsySMuAlg0EZDAJxjWy+pmFsp3EvskuGsraemutRxysRMgpziYa1+J7SCuT5kBmBrB3soEEhChOABqylj8hNYUgC8IXkoZ2GhbcKOkx+kB82DKi0JP32Ur3GhroB5ER6rOcX9oeHFSZVLlkdbADRJbJ3fJLn/DcO10zaDO6vnRbz+egyhPsmv2h7zJLDM+fKPhYB2g1TQY9h30Ls+i4zDWHlwSi9s6ybjr615x43B/st+/fWFnk8Gf2uQso19nFQ7n06lJHAAAAABJRU5ErkJggg==",
                "scale": 1.5,
                "eyeOffset": {
                    "cartesian": [0.0, 0.0, -10.0]
                },
                "disableDepthTestDistance": Number.POSITIVE_INFINITY,
                // "heightReference": HeightReference.CLAMP_TO_GROUND
            },

            "path": {
                "material": {
                    "polylineOutline": {
                        "color": {
                            "rgba": [0, 255, 255, 255]
                        },
                        "outlineColor" : {
                            "rgba" : [0, 255, 255, 255]
                        },
                        "outlineWidth" : 5,
                        "disableDepthTestDistance": Number.POSITIVE_INFINITY
                    },
                },
                "width": 6,
                "leadTime": 0.1,
                "trailTime": 10000000000,
                "resolution": 5,

                // "heightReference": HeightReference.CLAMP_TO_GROUND
            },
            "position": {
                "epoch": "2020-01-20T10:00:00Z",
                cartographicDegrees: coorArr,
            }
        }];
        var dataSourcePromise = CzmlDataSource.load(path, {clampToGround: true});
        dataSourcePromise.then( ds => {
            viewer.dataSources.add(dataSourcePromise);
            this.routeLayer = ds;
			this._requestRenderMode = this._geomap.requestRenderMode;
            this._geomap.requestRenderMode = false;
            viewer.dataSources._dataSources[0]._clock._clockRange = ClockRange.UNBOUNDED;
        });

        // viewer.dataSources.add(CzmlDataSource.load(path, {clampToGround: true})).then((ds) => {
        //     this.routeLayer = ds;
        //     // debugger
        //     GeoDepository.geomap.requestRenderMode = false;
        //     // console.log(GeoDepository.geomap.requestRenderMode)
        //     // viewer.trackedEntity = ds.entities.getById('path');
        // });

    }
    /**
     * 解析请求返回的路线
     * @private
     */
    parseDriveRoute(route) {
        let allData = [];

        let paths = route.paths;
        for (let i = 0, pathsLen = 1; i < pathsLen; i++) {
            let path = paths[i];
            let distance = path.distance;
            let duration = path.duration;
            let lightsNum = path.traffic_lights;    // 红绿灯个数
            let strategy = path.strategy; // 参考策略

            let steps = path.steps;
            let driveLonLatArr = [];
            let baseTime = 0
            driveLonLatArr.push(baseTime, this.endLocation[0], this.endLocation[1], this.defaultHeight);
            let roadNames = [];
            for (let j = 0, stepsLen = steps.length; j < stepsLen; j++) {
                let step = steps[j];

                if (step.road) {
                    roadNames.push(step.road);
                }
                if (i === 0) {
                    let drivePositions = step.polyline.split(';');
                    let internal = parseInt(step.duration) / drivePositions.length;

                    for (let d = 0; d < drivePositions.length; d++) {
                        let drivePosition = drivePositions[d].split(',');
                        baseTime += parseInt(internal);
                        drivePosition = CoordTransform.gcj02towgs84(parseFloat(drivePosition[0]), parseFloat(drivePosition[1]));
                        driveLonLatArr.push(baseTime, drivePosition[0], drivePosition[1], this.defaultHeight);
                    }
                }
            }
            driveLonLatArr.push(baseTime + 10, this.startLocation[0], this.startLocation[1], this.defaultHeight);
            return driveLonLatArr

            // let ways = roadNames[0];
            // if (roadNames.length > 1) {
            //   for (let r = 1, roadLen = roadNames.length; r < roadLen; r++) {
            //     ways += ' -> ' + roadNames[r];
            //   }
            // }
            // allData.push({
            //   routes: '方案' + i,
            //   duration: duration,
            //   strategy: strategy,
            //   distance: distance,
            //   lightsNum: lightsNum, // 红绿灯个数
            //   steps: steps, // 途径
            // });
        }

    };
    /**
     * 点击终点后的路径规划查询
     * @private
     */
    routeQueryFromEnd() {
        let url = this.options.baseUrl + this.mode;
        // BosApi.poiQueryByLocation(startLocation).then( geocodeData => {
        let startLocation = CoordTransform.wgs84togcj02(parseFloat(this.startLocation[0]), parseFloat(this.startLocation[1]));
        startLocation = startLocation[0].toFixed(6) + ',' + startLocation[1].toFixed(6);
        let endLocation = CoordTransform.wgs84togcj02(parseFloat(this.endLocation[0]), parseFloat(this.endLocation[1]));
        endLocation = endLocation[0].toFixed(6) + ',' + endLocation[1].toFixed(6);

        let parameters = {
            origin: endLocation,
            destination: startLocation,
            key: "5b89a68941d5a2b421a9da330fdb0682",
            strategy: 10
        };

        Resource.fetchJson({
            url: url,
            queryParameters: parameters
        }).then((data) => {
            // 骑行返回的是data，其他都是route
            let route = data.route || data.data;
            let coorArr = this.parseDriveRoute(route);
            this.routeData = coorArr;
            this.addRouteLine(coorArr, this.speed);
            this.addDistanceFlag(route, this.startLocation);
            this.showInstructions(route);

            this.startLocation = undefined;
            this.endLocation = undefined;
        });


    };
    /**
     * 添加事件监听
     * @private
     */
    addEventListener() {
        const { WINDOW_POSITION } = MapPickType;

        this._geomap.on(MapEventType.RIGHT_CLICK, (movement) => {
            if (this.routeLayer) {
                this.clear()
            };
            if (this._instructionShow) {
                this.intstructionPanel.style.display = 'none';
            }

            let windowCoord = movement.window_position;
            let cartesian = this.viewer.camera.pickEllipsoid(windowCoord);
            if (cartesian) {
                this._tempLocation = GeoUtil.cartesianToArray(cartesian);
                this._selectPanel.style.cssText = `left: ${windowCoord.x}px; top: ${windowCoord.y}px; display: block`;
            }
        }, [WINDOW_POSITION])


        // let handler = new this.BOSGeo.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        // this.handler = handler


        // handler.setInputAction( (movement) => {
        //   console.log('点击')

        //   if(this.routeLayer) {
        //     this.clear()
        //   };

        //   let windowCoord = movement.position;
        //   let cartesian = this.viewer.camera.pickEllipsoid(windowCoord);
        //   if (cartesian) {
        //     this._tempLocation = GeoUtil.cartesianToArray(cartesian);
        //     this._selectPanel.style.cssText = `left: ${windowCoord.x}px; top: ${windowCoord.y}px; display: block`;
        //   }
        // }, this.BOSGeo.MapEventType.RIGHT_DOWN);
        //左键点击空白处隐藏提示框
        // handler.setInputAction( (movement) => {
        //   this._selectPanel.style.cssText = ` display: none`;
        // }, this.BOSGeo.MapEventType.LEFT_DOWN);

    }
    /**
     * 添加起点、终点
     * @private
     */
    addPoint(isStart) {
        // debugger
        let flag = isStart ? 'start' : 'end';
        this.pointLayer.points.forEach(POI => {
            if(POI.properties === flag) {
                this.pointLayer.remove(POI);
            }
        })
        let point = this.pointLayer.add({
            position: this._tempLocation,
            properties: flag,
            billboard: {
                image: isStart ? this.StartMarkImg : this.EndMarkImg,
                scale: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
                // clampToGround: true
            },
            // heightReference: HeightReference.CLAMP_TO_GROUND
        });
        // this.entityList.push(point);
    };
    /**
     * 添加距离信息
     * @private
     */
    addDistanceFlag(route, startLocation) {
        let distance = route.paths[0].distance;

        this.pointLayer.add({
            position: startLocation,
            label: { 
                text: `全程${distance}m`,
                scale: 0.5,
                pixelOffset: new Cartesian2(70, -20),   //偏移量
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },

        });
    }
    /**
     * 显示导航信息
     * @private
     */
    showInstructions(route) {
        let driveSteps = route.paths[0].steps;
        let resInstructions = [];
        driveSteps.forEach( step => {
            resInstructions.push(step.instruction)
        });

        if(!this._instructionShow) {
            this.intstructionPanel = document.createElement('div');
            this.intstructionPanel.className = 'bosgeo-route-instruction-panel';
        }

        let resHtml = '<span class="bosgeo-instructionInfo">导航信息：</span>';

        resInstructions.forEach( info => {
            resHtml += `<li>${info}</li>`;
        });

        this.intstructionPanel.innerHTML = resHtml;
        this.intstructionPanel.style.display = 'block';
        this._geomap.viewer.container.appendChild(this.intstructionPanel);
        this._instructionShow = true;
    }
    /**
     * 添加驾车距离至GeoMap的实例对象
     * @param {GeoMap} geomap GeoMap的实例对象
     * @example
        let geomap = new BOSGeo.GeoMap('bosgeoContainer');
        let dd = new BOSGeo.DriveDistance({speed: 10});
        dd.addTo(geomap)
     */
    addTo(geomap) {
        if (geomap) {
            this._geomap = geomap;
            this.viewer = geomap.viewer;
            this.pointLayer = geomap.layerManager.createPointLayer('_routePoint');
            this.addTip();
            this.addEventListener();
            // window.that = this
        }
    }
    /**
     * 清除监听事件
     * @private
     */
    clearListener() {
        this.handler.destroy();
        this.handler = null;
    }
    /**
     * 清除驾车距离信息
     * @example
        let dd = new BOSGeo.DriveDistance({speed: 10});
        dd.clear();
     */
    clear() {
        this.pointLayer.removeAll()
        this.viewer.dataSources.remove(this.routeLayer);
        this.routeLayer = null;
        // this.entityList.map(v => this.viewer.entities.remove(v));
        this._geomap.render();
        // this.startLocation = null;
        // this.endLocation = null;
    }
    open() {
        this.addTip();
        this.addEventListener()
    }
    // close() {
    //     this.clearListener()
    // }
    /**
     * 显隐
     * @private
     */
    ctrVisibel(value) {
        this.pointLayer.show = value;
        this.routeLayer.show = value;
        this._geomap.render();
    }
    /**
     * 控制显隐
     * @param {Boolean} value ture为显示，false为隐藏
     * @example
        let geomap = new BOSGeo.GeoMap('bosgeoContainer');
        let dd = new BOSGeo.DriveDistance({speed: 10});
        dd.addTo(geomap);
        dd.show(false);
     */
    show(value) {
        this.ctrVisibel(value)
    }
    /**
     * 隐藏驾车距离
     */
    hide() {
        this.ctrVisibel(false)
    }
    setData(data) {
        // let {baseUrl,mode} = data
        // this.baseUrl = "https://restapi.amap.com/v3/direction/"
        // this.mode = "driving"
        // "https://restapi.amap.com/v3/direction/driving"
        this.data = data
    }
    /**
     * 销毁
     */
    destory() {
        this.pointLayer.destroy();
        this.viewer.dataSources.remove(this.routeLayer);
        this.routeLayer = null;
		this._geomap.requestRenderMode = this._requestRenderMode ;
        this._geomap.render();
    }
}

export default DriveDistance;
