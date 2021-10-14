// import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { ENgxCesiumComponent } from '../../../../../../../../src';
// import ViewerOptions = Cesium.ViewerOptions;
// import Viewer = Cesium.Viewer;
// import Scene = Cesium.Scene;
// import Globe = Cesium.Globe;
// import PositionedEvent = Cesium.PositionedEvent;
// import MoveEvent = Cesium.MoveEvent;

import CzmlDataSource from 'cesium/DataSources/CzmlDataSource.js';
import PlaneGraphics from 'cesium/DataSources/PlaneGraphics.js';
import CallbackProperty from 'cesium/DataSources/CallbackProperty.js';
import Cartesian2 from "cesium/Core/Cartesian2";
import Plane from "cesium/Core/Plane";
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler.js';
import Resource from "cesium/Core/Resource";
import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType.js';
import SkyBox from 'cesium/Scene/SkyBox.js';
import defined from 'cesium/Core/defined'
import Color from 'cesium/Core/Color'
import Cartesian3 from 'cesium/Core/Cartesian3'
import { GeoDepository } from '../core/GeoDepository'
import when from 'cesium/ThirdParty/when'
import FeatureType from "../constant/FeatureType";
import  FileUtil from "../utils/FileUtil"


/**
 * 地质体渲染
 *  基于json提取解析成CZML再进行加载渲染。
 *  @param {Object} options
 *  @param {Boolean} [options.czmlExport=false] 是否把渲染的地质体模型导出成czml数据，默认为false，不导出,只对于从json中解析成czml模型的方法有效(calcDataFromJsons和addFromJson)。
 *  @param {Object} [options.layerColor={1: [169, 169, 0, 255],2: [84, 255, 126, 255],3: [255, 255, 0, 255],....}]   地层颜色配置，其中1为地层索引值，[169, 169, 0, 255]为rgba颜色表示。
 *  @example
 *
 *  let geology=new BOSGeo.Geology()
 *  let urls=[
 '../example/assets/data/layer_1.json',
 '../example/assets/data/layer_2.json',
 '../example/assets/data/layer_3.json',
 '../example/assets/data/layer_4.json',
 '../example/assets/data/layer_5.json',
 '../example/assets/data/layer_6.json',
 ]
 geology.calcDataFromJsons(urls)
 *
 */
class Geology {

    constructor(options) {
        // requestRenderMode、maximumRenderTimeChange 的使用参考文章（使用显式渲染提高性能）：https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/
        options = options || {};
        this.viewer = GeoDepository.viewer;
        this.scene = GeoDepository.scene;
        this.globe = GeoDepository.globe;

        this._dataSources = {}

        this.coords = [];
        this.coords2 = [];
        this.layersLevel = [];
        this.layersNum = 0;
        this.layerColor =options.layerColor || {
            1: [169, 169, 0,  255],
            2: [84, 255, 126,  255],
            3: [255, 255, 0,  255],
            4: [0, 255, 126,  255],
            5: [255, 255, 126,  255],
            6: [0, 255, 0,  255],
            7: [0, 0, 255,  255],
            8: [148, 0, 211,  255],
            9: [100, 149, 237,  255],
            10: [0, 191, 255,  255],
            11: [0, 250, 154,  255],
            12: [0, 206, 209,  255],
            13: [47, 79, 79,  255],
            14: [0, 100, 0,  255],
            15: [128, 128, 0,  255],
            16: [255, 165, 0,  255],
            17: [222, 184, 135,  255],
            18: [255, 127, 80,  255],
            19: [169, 169, 169,  255],
            20: [75, 0, 130,  255],
            21: [135, 206, 235,  255],
            22: [238, 130, 238,  255],
        };
        this.distance = 0.0; // 剪切面偏移距离
        this.clipStyle = {
            X: 'x', // X水平切
            Y: 'y', // X水平切
            Z: 'z' // 垂直切
        };
        this.czmlExport=options.czmlExport||false;
        this.currClipStyle; // 当前生成的剪切面类型，对应 clipStyle
        this.timeoutId = null;
        this.initCartesian3 = new Cartesian3();

        this.viewerOptions = {
            // imageryProvider: new SingleTileImageryProvider({
            //     url: './assets/images/worldimage_black.jpg'
            // }),
            skyBox: new SkyBox({
                show: false
            }),
            requestRenderMode: true, // 渲染帧仅在需要时才会发生，具体取决于场景中的更改。启用（true）可以提高应用程序的性能
            maximumRenderTimeChange: Infinity // 请求新渲染帧的模拟时间间隔
        };

        this.addStyle =''
        // this.onViewerReady();
        this.initClipPlaneEvents();
    }

    /**
     * 添加地质体的json数据
     * @param {String} url CZML数据的url，json格式为[{"level":10,"points":[[113.939217,22.5141926,-35.93],...]},...]
     *
     */
    addFromJson(url) {
        this.addStyle = 'addFromJson'
        let allPromise //= [];
        allPromise = this.getCZMLFromJson(url);

    }

    /**
     * 将特制的json解析成CZML可识别的数据
     * @param {String} url CZML数据的url ，json格式为[{"level":10,"points":[[113.939217,22.5141926,-35.93],...]},...]。
     * @return {Promise<any>} 异步回调对象，CZML可识别的数据集
     * @private
     */
    getCZMLFromJson(url) {
        let defered = when.defer();
        let iallPromise = [];
        return new Promise((resolve, reject) => {
            Resource.fetchJson({
                url: url, //`http://192.168.1.42:8086/geo/code/e-ngx-cesium/example/assets/data/geology${currIndex}.json`
            }).then(datas => {

                datas.forEach((data) => {

                    let rings = [];
                    let rings2 = [];
                    rings = data.conbination

                    data.conbination && data.conbination.forEach((c) => {
                        let pList = []
                        // c.forEach((i)=>{
                        let p = pList.concat(data.points[c[0]], data.points[c[1]], data.points[c[2]])
                        // })
                        rings2.push(p);

                    })
                    let iPromise = new Promise((resolve, reject) => {
                        resolve([rings, rings2]);
                    }
                    )
                    iallPromise.push(iPromise)

                    data.level && this.layersLevel.push(data.level)
                    !this.layerColor[data.level] && (
                        this.layerColor[data.level] = Color.fromRandom()
                    )

                });

                resolve(iallPromise);
                iallPromise && Promise.all(iallPromise).then((datas) => {
                    datas.forEach((data) => {
                        this.coords.unshift(data[0]); // 点高度都为正
                        this.coords2.push(data[1]); // 点高度大部分为负（有一小部分为正，忽略这一点偏差）
                    });
                });
                this.showLayer(0);
                // return iallPromise;
            }
                , (error) => {
                    reject(error);
                }
            );
        })
    }

    /**
     * 展示地质体
     * @param {Number} layerIndex 展示地质体图层索引值
     * @example
     geology.showLayer()
     */
    showLayer(layerIndex) {
        const allPromise = [];
        if (this.addStyle == 'addFromCZML'){
            this.zoomTo();
        }else {
            this.layersNum = this.coords2.length;
            if (typeof layerIndex === 'number') {
                this.viewer.dataSources.removeAll();
                allPromise.push(this.addCZML(this.coords[this.layersNum - layerIndex], this.layersNum - layerIndex, 1));
                allPromise.push(this.addCZML(this.coords2[layerIndex], layerIndex, 2));
            } else {
                this.viewer.dataSources.removeAll();
                if (this.layersLevel.length == 0) {
                    this.coords.forEach((coord, index) => {
                        allPromise.push(this.addCZML(coord, index, 1));
                    });
                }
                this.coords2.forEach((coord, index) => {
                    allPromise.push(this.addCZML(coord, index, 2));
                });
            }
            const startTime = Date.now();
            Promise.all(allPromise).then(() => {
                const endTime = Date.now();
                console.log(`加载完成，共耗时 ${endTime - startTime} ms`);
            });
        }
    }

    /**
     * 生成并添加CZML数据
     * @param {Array} coords 图形位置数组集合
     * @param {Number} layerIndex 图层索引值
     * @param {Number} partIndex  部位索引值
     * @return {Promise<any>} 异步加载回调对象，加载czml数据
     * @private
     */
    addCZML(coords, layerIndex, partIndex) {
        this.layersNum = this.coords2.length;
        return new Promise((resolve, reject) => {
            const polygonCZML = [{
                'id': 'document',
                'name': 'Haidian groundwater',
                'version': '1.0'
            }];

            coords && coords.forEach((coord, index) => {
                if (coord.length > 0) {
                    const preLayerIndex = layerIndex - 1;
                    let extrudedHeight = 0;
                    let preCoord;
                    let cacleExtrudedHeight;
                    if (partIndex === 1) {
                        preCoord = this.coords[preLayerIndex];
                        cacleExtrudedHeight = Math.min;
                    } else {
                        preCoord = this.coords2[preLayerIndex];
                        cacleExtrudedHeight = Math.max;
                    }
                    if (layerIndex > 0) {
                        if (preCoord.length > 0) {
                            const c = preCoord[index];
                            if (c && c.length > 0) {
                                extrudedHeight = cacleExtrudedHeight(c[2], c[5], c[8]);
                            }
                        }
                    }

                    const py = {
                        'id': `${partIndex}_${partIndex === 1 ? this.layersNum - layerIndex : layerIndex + 1}_${index}`,
                        'name': `${partIndex}_${partIndex === 1 ? this.layersNum - layerIndex : layerIndex + 1}_${index}`,
                        'polygon': {
                            'positions': {
                                'cartographicDegrees': coord
                            },
                            'material': {
                                'solidColor': {
                                    'color': {
                                        'rgba': this.layerColor[partIndex === 1 ? Math.abs(layerIndex + 1) : Math.abs(layerIndex + 1)]  //this.layerColor[partIndex === 1 ? this.layersNum - layerIndex : Math.abs(layerIndex + 1)]
                                    }
                                }
                            },
                            'extrudedHeight': extrudedHeight,
                            'perPositionHeight': true,
                            'outline': false,
                            'outlineColor': {
                                'rgba': [255, 255, 255, 0.5]
                            }
                        }
                    };
                    polygonCZML.push(py);
                }
            });

            this.czmlExport && FileUtil.saveJSON(polygonCZML, layerIndex.toString()+'.czml')  //是否导出czml

            if (polygonCZML.length > 1) {
                this.dataSourcePromise = CzmlDataSource.load(polygonCZML);

                this._dataSources[layerIndex] = this.dataSourcePromise

                this.viewer.dataSources.add(this.dataSourcePromise);

                // dataSourcePromise.then(data => {
                //     let entities = data.entities.values;
                //     for (let i = 0; i < entities.length; i++) {
                //         let entity = entities[i];
                //         entity.featureType = FeatureType.ENTITY;
                //     }
                // })
                this.viewer.zoomTo(this.dataSourcePromise).then(() => {
                    resolve();
                }, (error) => {
                    reject();
                    throw error;
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * 缩放至图层
     * @example
     geology.zoomTo()
     */
    zoomTo(){
        this.dataSourcePromise && this.viewer.zoomTo(this.dataSourcePromise)
    }
    /**
     * 直接加载CZML文件进行地质体渲染
     * @param {String} url CZML数据的url,为由czmlExport=true时导出的地质体模型czml数据。
     * @example
     geology.addFromCZML('./data/geology/czml/0.czml');
     */
    addFromCZML(url) {
         this.addStyle='addFromCZML';
         new Promise((resolve, reject) => {
            this.dataSourcePromise = CzmlDataSource.load(url);
            this._dataSources[url] = this.dataSourcePromise;
            this.viewer.dataSources.add(this.dataSourcePromise);

            // dataSourcePromise.then(data => {
            //     let entities = data.entities.values;
            //     for (let i = 0; i < entities.length; i++) {
            //         let entity = entities[i];
            //         entity.featureType = FeatureType.ENTITY;
            //     }
            // })
            this.viewer.zoomTo(this.dataSourcePromise).then(() => {
                resolve();
            }, (error) => {
                reject();
                throw error;
            });
        })
    }
    /**
     * 计算解析特制的json数据进行地质体渲染
     * @param {Array} urls  CZML的json数据url数组集合，json格式如[[[116.388051,40.032698,33.369582],[116.386112,40.032755,33.300133]...],...]。
     *@example
     let urls=[
     './resource/data/geology/layer_1.json',
     './resource/data/geology/layer_2.json',
     './resource/data/geology/layer_3.json',
     ]
     geology.calcData(urls)
     */
    calcDataFromJsons(urls) {
        this.addStyle = 'calcDataFromJsons'
        let allPromise = [];
        for (let i = 0; i < urls.length; i++) {
            allPromise.push(this.getCZMLData(urls[i]));
        }

        Promise.all(allPromise).then((datas) => {
            datas.forEach((data) => {

                this.coords.unshift(data[0]); // 点高度都为正
                this.coords2.push(data[1]); // 点高度大部分为负（有一小部分为正，忽略这一点偏差）
            });

            this.coords && this.showLayer(0);
        });
    }

    /**
     * 根据url获取CZML数据
     * @param {String} url CZML数据的url，json格式如[[[116.388051,40.032698,33.369582],[116.386112,40.032755,33.300133]...],...]。
     * @return {Promise<any>} 异步加载回调，通过则返回解析的数据集
     * @private
     */
    getCZMLData(url) {
        return new Promise((resolve, reject) => {
            Resource.fetchJson({
                url: url, //`http://192.168.1.42:8086/geo/code/e-ngx-cesium/example/assets/data/layer_${currIndex}.json`
            }).then(datas => {
                const rings = [];
                const rings2 = [];

                datas.forEach((data) => {
                    const isUp = data.every((d) => {
                        return d[2] >= 0;
                    });
                    const coe = 2; // 放大系数
                    if (isUp) {
                        rings2.push([]);
                        rings.push(data.reduce((cur, pre) => {
                            pre[2] *= coe;
                            return cur.concat(pre);
                        }, []));
                    } else {
                        rings.push([]);
                        rings2.push(data.reduce((cur, pre) => {
                            pre[2] *= coe;
                            return cur.concat(pre);
                        }, []));
                    }
                });
                resolve([rings, rings2]);
            }, (error) => {
                reject(error);
            });
        });
    }

    /**
     * 移动裁切平面时隐藏部分块体entity
     * @param {Number} delta 移动距离
     * @private
     */
    hidePolygon(delta) {
        for (let i = 0; i < this.viewer.dataSources.length; i++) {
            this.viewer.dataSources.get(i).entities.values.forEach((entity) => {
                // entity.show = entity.polygon.hierarchy.getValue().every((value, index) => {
                entity.show = entity.polygon.hierarchy.getValue().positions.every((value, index) => {
                    if (this.currClipStyle === this.clipStyle.X) {
                        return value.x <= delta;
                    } else if (this.currClipStyle === this.clipStyle.Z) {
                        return value.z <= delta;
                    }else if (this.currClipStyle === this.clipStyle.Y) {
                        return value.y <= delta;
                    }
                });
            });
        }
        this.scene.requestRender(); // 手动触发重新渲染
    }

    /**
     * * 创建剪切面
     * @param {string} style 裁切方向,可选'x','y','z'。
     * @param {Array} positon 经纬度高程坐标点
     * @param {Array} planeSize 裁切平面尺寸大小，默认[400,,400]。
     * @example
     let postion=[116.227542, 40.025827, 0]
     geology.createClipPlane(geology.clipStyle.X,postion,[35000,35000]); //X水平剖切
     */
    createClipPlane(style, positon, planeSize) {
        !planeSize && (planeSize = [400, 400])
        this.viewer.entities.removeById(this.currClipStyle + '-clip-plane');
        this.currClipStyle = style;
        this.distance = 0.0;
        let normal;

        if (style === this.clipStyle.X) {
            this.initCartesian3 = Cartesian3.fromDegrees(positon[0], positon[1], positon[2]); //113.93979516569634,22.514529198176515,30
            // this.initCartesian3 = Cartesian3(116.029315, 40.087886, 745.43);
            normal = new Cartesian3(1.0, 0, 0.0); // X水平切
        } else if (style === this.clipStyle.Z) {

            this.initCartesian3 = Cartesian3.fromDegrees(positon[0], positon[1], positon[2]);  //
            // this.initCartesian3 = Cartesian3.fromDegrees(116.227542, 40.025827, 0);
            // this.distance = 20;
            normal = new Cartesian3(0.0, 0.0, -1.0); // 垂直切
        } else if (style === this.clipStyle.Y) {

            this.initCartesian3 = Cartesian3.fromDegrees(positon[0], positon[1], positon[2]);  //
            // this.initCartesian3 = Cartesian3.fromDegrees(116.227542, 40.025827, 0);
            normal = new Cartesian3(0.0, 1.0, 0.0); // Y水平切
        }
        const plan = new Plane(normal, 0.0);

        let clippingPlaneEntity = this.viewer.entities.add({
            id: style + '-clip-plane',
            name: 'clip plane',
            position: this.initCartesian3,
            plane: new PlaneGraphics({
                plane: new CallbackProperty(this.updateClipPlane(plan), false),
                dimensions: new Cartesian2(planeSize[0], planeSize[1]),
                material: Color.WHITE.withAlpha(0.2),
                outline: true,
                outlineColor: Color.WHITE
            })
        });
        let clippingPlane =clippingPlaneEntity.plane

        this.scene.requestRender(); // 手动触发重新渲染
    }

    /**
     * 初始化剪切面事件
     * @private
     */
    initClipPlaneEvents() {
        let selectedClipPlane;

        // 鼠标左键按下时选择剪切面
        const downHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        downHandler.setInputAction((movement) => {
            const pickedObject = this.scene.pick(movement.position);
            if (defined(pickedObject) && defined(pickedObject.id) && defined(pickedObject.id.plane)) {
                selectedClipPlane = pickedObject.id.plane;
                selectedClipPlane.material = Color.WHITE.withAlpha(0.1);
                selectedClipPlane.outlineColor = Color.WHITE;
                this.scene.screenSpaceCameraController.enableInputs = false;
            }
        }, ScreenSpaceEventType.LEFT_DOWN);

        // 鼠标左键松开时选择剪切面
        const upHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        upHandler.setInputAction(() => {
            if (defined(selectedClipPlane)) {
                selectedClipPlane.material = Color.WHITE.withAlpha(0.2);
                selectedClipPlane.outlineColor = Color.WHITE;
                selectedClipPlane = undefined;
            }
            this.scene.screenSpaceCameraController.enableInputs = true;
        }, ScreenSpaceEventType.LEFT_UP);

        // 鼠标左键按下并移动时移动剪切面
        const moveHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
        moveHandler.setInputAction((movement) => {
            if (defined(selectedClipPlane)) {
                // const endPosition = this.viewer.camera.pickEllipsoid(movement.endPosition, this.viewer.scene.globe.ellipsoid);
                const endPosition = this.viewer.scene.pickPosition(movement.endPosition)
                // const endPosition = this.eNgxCesium.window2cartesian(movement.endPosition, this.viewer);
                let delta;
                selectedClipPlane
                if (this.currClipStyle === this.clipStyle.X) {
                    delta = endPosition.x;
                    this.distance = endPosition.x - this.initCartesian3.x;
                } else if(this.currClipStyle === this.clipStyle.Y) {
                    delta = endPosition.y;
                    this.distance = endPosition.y - this.initCartesian3.y;
                }else  {
                    delta = endPosition.z;
                    // this.distance += (movement.startPosition.y - movement.endPosition.y) * 50;
                    this.distance += (movement.startPosition.y - movement.endPosition.y)*2;
                }

                this.hidePolygon(delta);
                // // 减少更新的频率
                // if (!this.timeoutId) {
                //     this.timeoutId = setTimeout(() => {
                //         clearTimeout(this.timeoutId);
                //         this.timeoutId = null;
                //         this.hidePolygon(delta);
                //     }, 200);
                // }
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);
    }

    /**
     * 设置 PlaneGraphics 中的 plane 时每次执行的函数
     * @param {plane} Plane 裁切平面
     * @returns {Function} 返回更新后的Plane 裁切平面
     * @private
     */
    updateClipPlane(plane) {
        return () => {
            plane.distance = this.distance;
            return plane;
        };
    }
}

export default Geology;
