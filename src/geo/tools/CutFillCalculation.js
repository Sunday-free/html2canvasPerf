import * as turf from '@turf/turf'

import Cartesian3 from 'cesium/Core/Cartesian3'
import Cartesian2 from 'cesium/Core/Cartesian2'
import Cartographic from 'cesium/Core/Cartographic'
import when from 'cesium/ThirdParty/when'
import sampleTerrain  from 'cesium/Core/sampleTerrain.js';
import Color from 'cesium/Core/Color'
import HeightReference from 'cesium/Scene/HeightReference'
import HorizontalOrigin from 'cesium/Scene/HorizontalOrigin'
import VerticalOrigin from 'cesium/Scene/VerticalOrigin'


class CutFillCalculation {
    /**
     * 填挖方计算
     * @param {GeoMap} geomap GeoMap的实例对象
	 * @param {Object} options 配置选项
	 * @param {Boolean} [options.isBuildingContained = false] 是否将建筑模型包含在内进行计算填挖方，若不需要建议设为false（对前端性能要求很高）。
     * @example
     *  let calculation = new BOSGeo.CutFillCalculation(geomap); 
     */
    constructor(geomap, options = {}) {
		let { isBuildingContained = false } = options;
		this._isBuildingContained = isBuildingContained;
        this.geomap = geomap;
        this.walls = [];
        this.fillPolygons = [];
    }

	/**
	 * 是否将建筑模型包含在内进行计算填挖方，若不需要建议设为false
	 * @property {Boolean}
	 * @default false
	 */
	get isBuildingContained() {
		return this._isBuildingContained;
	}
	set isBuildingContained(val) {
		if (this._isBuildingContained === Boolean(val)) return;

		this._isBuildingContained = val;
	}

    /**
     * 计算填挖方量,请注意若包含建筑物进行计算，计算时绘制区域不要超过屏幕范围
     * @param {Object} options 配置选项
     * @param {Number} options.height 填挖方分析的高度
     * @param {Array<Array<Number>>} options.positions 经纬度组成的二维数组，注意经纬度闭合（最后一个经纬度与第一个相同）
     * @param {Number} [options.precisionLevel = 0.01] 计算填挖方量的精度，值越小，精度越高，时间越长，建议范围[0.001-0.01]，太小有可能导致崩溃
     * @param {String} [options.wallColor = '#fff'] 范围示意墙的颜色
     * @param {Number} [options.wallOpacity = 0.5] 范围示意墙的透明度，取值范围[0,1]
     * @param {String} [options.fillColor = '#ADD8E6'] 示意填充面的颜色
     * @param {Number} [options.fillOpacity = 0.5] 示意填充面的透明度，取值范围[0,1]
     * @param {Number} [options.terrainLevel = 14] 当只对地形进行测量时，地形的精度层级
     * @returns {Promise}  包含填挖方量等计算结果的promise对象
     * @example
     *  let calculation = new BOSGeo.CutFillCalculation(geomap); 
     *  var positions = [[115.2, 40], [115.22, 40], [115.21, 40.02], [115.2, 40]];
     *  var options = {
     *      height: 1600,
     *      positions,
     *  }
     *  var res = calculation.open(options);
     *  res.then( data => { console.log(data) });
     */
    open(options = {}) {
        let promise = new Promise((resolve, reject) => {

            let {
                height,
                positions,
                precisionLevel = 0.01,
                wallColor = '#fff',
                wallOpacity = 0.5,
                fillColor = '#ADD8E6',
                fillOpacity = 0.7,
				terrainLevel = 14
            } = options;

            if (!height || !positions) {
                console.error('必须指定坐标范围和高度！');
                reject('必须指定坐标范围和高度！'); 
            }

            if (isNaN(precisionLevel) || precisionLevel > 0.01 || precisionLevel < 0.001) {
                console.warn('precisionLevel的范围建议为[0.001-0.01], 太大不精确， 太小有可能导致前端页面崩溃！')
            }

            let viewer = this.geomap.viewer;
            let scene = this.geomap.scene;
            let terrainProvider = scene.terrainProvider;

            //Cartersian3格式的范围point
            let _positions = positions.flat();
            const cesiumExtentPoints = Cartesian3.fromDegreesArray(_positions);
            // turf格式的polygon
            const turfPolygon = turf.polygon([positions]);
            // 获取四至
            const turfExtent = turf.bbox(turfPolygon);
            
            // 在turfPolygon中按网格取样点，网格间距3米,可以设置到0.005
            // 在面积为5平方公里的测试中性能如下，计算时间，0.001需要65秒，0.002需要16秒，0.003需要7-8秒，0.005需要3秒--0.0075需要1.5秒--0.01需要0.8-1秒
            // 建议将精度的范围设置为[0.001-0.01]
            const turfSamplePoints = turf.pointGrid(turfExtent, precisionLevel, {
                units: 'kilometers',
                mask: turfPolygon,
            });

            // 将turf取样点转为Cesium的取样点
            let cesiumSamplePoints = [];
            for (let i = 0; i < turfSamplePoints.features.length; i++) {
                const coord = turfSamplePoints.features[i].geometry.coordinates;
                cesiumSamplePoints.push(Cartographic.fromDegrees(coord[0], coord[1]));
            }

			if (!this.isBuildingContained) {
				// 获取取样点的高程，级别越高越精确，经测试最高可以设置为14，设置为15会报错
				when(sampleTerrain(terrainProvider, terrainLevel, cesiumSamplePoints), (updatedPoints) => {
					
					let calcuData = this._calculate({
						height,
						sampleData: updatedPoints,
						cesiumExtentPoints,
						wallColor,
						wallOpacity,
						fillColor,
						fillOpacity,
						turfPolygon,
						viewer
					});
					resolve(calcuData);
				});
			} else {//ToDo 性能待优化
				let pick1= new Cartesian2(document.body.clientWidth / 2, 40);    
				let cartesian = scene.globe.pick(viewer.camera.getPickRay(pick1),viewer.scene);

				let tips = viewer.entities.add({
					position: cartesian,
					label: {
						text: "计算中,请等待...",
						font: "14pt sans-serif",
						heightReference: HeightReference.CLAMP_TO_GROUND,
						horizontalOrigin: HorizontalOrigin.CENTER,
						verticalOrigin: VerticalOrigin.BASELINE,
						fillColor: Color.BLACK,
						showBackground: true,
						backgroundColor: new Color(1, 1, 1, 0.7),
						backgroundPadding: new Cartesian2(8, 4),
						disableDepthTestDistance: Number.POSITIVE_INFINITY, // draws the label in front of terrain
					},
				});
				this.geomap.render();//刷新添加的提示信息
				
				let element = document.createElement('div');
				this._addTips(element);
				
				setTimeout(() => {//设置500ms延迟是为了显示tips，提示用户
					let sampleHeightArray = [];
					cesiumSamplePoints.forEach(cartographic => {
						let height = this.geomap.scene.sampleHeight(cartographic);
						sampleHeightArray.push(height);

						if (height == undefined) {
							console.error('若包含建筑物进行计算，计算时绘制区域不要超过屏幕范围');
							viewer.entities.remove(tips);
							return
						}
					})

					let calcuData = this._calculate({
						isBuildingContained: true,
						height,
						sampleData: sampleHeightArray,
						cesiumExtentPoints,
						wallColor,
						wallOpacity,
						fillColor,
						fillOpacity,
						turfPolygon,
						viewer
					})
					resolve(calcuData);
					viewer.entities.remove(tips);
					document.body.removeChild(element);
					element = null;
				}, 500);
			}
        }) 

        return promise;
    }

	/**
	 * 添加等待提示
	 * @param {HtmlElement} element 创建的提示信息（div标签）  
	 * @private
	 */
	_addTips(element) {
		let img = document.createElement('img');
		img.src = 'data:image/gif;base64,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'
		img.style.position = 'absolute';
		img.style.width = '128px';
		img.style.height = '128px';
		img.style.top = 0;
		img.style.bottom = 0;
		img.style.left = 0;
		img.style.right = 0;
		img.style.margin = 'auto';
		setTimeout(() => {
			element.id = 'bosgeo-loading';
			element.style.position = 'absolute';
			element.style.top = 0;
			element.style.left = 0;
			element.style.zIndex = 9999;
			element.style.width = '100%';
			element.style.height = '100%';
			element.style.backgroundColor = 'rgba(200, 200, 200, 0.3)';
			element.appendChild(img);
			document.body.appendChild(element);
		}, 100);
	}

	/**
	 * 根据采样到的高度，计算填挖方量
	 * @private
	 */
	_calculate(options) {
		let {
			isBuildingContained,
			height,
			sampleData,
			cesiumExtentPoints,
			wallColor,
			wallOpacity,
			fillColor,
			fillOpacity,
			turfPolygon,
			viewer
		} = options;

		// 在更新后的取样点中，获得最高海拔和最低海拔
		let highest = 0;
		let lowest = 8888;
		// 设定平整高程
		const level = height;
		// 计算面积和单个取样点面积
		const area = turf.area(turfPolygon).toFixed(8);
		const diffArea = area / sampleData.length;
		// 根据每个取样点与平整高程的差，累加挖方量和填方量
		let cut = 0;
		let fill = 0;
		if (!isBuildingContained) {//计算区域内不包含建筑物
			sampleData.forEach(point => {
				//计算最高最低高度
				if (point.height > highest) {
					highest = point.height.toFixed(3);
				} else if (point.height < lowest) {
					lowest = point.height.toFixed(3);
				}
				//计算填挖方量
				if (point.height > level) {
					cut += (point.height - level) * diffArea;
				} else if (point.height < level) {
					fill += (level - point.height) * diffArea;
				}
			});
		} else {//计算区域内包含建筑物
			sampleData.forEach(hei => {
				//计算最高最低高度
				if (hei > highest) {
					highest = hei.toFixed(3);
				} else if (hei < lowest) {
					lowest = hei.toFixed(3);
				}
				//计算填挖方量
				if (hei > level) {
					cut += (hei - level) * diffArea;
				} else if (hei < level) {
					fill += (level - hei) * diffArea;
				}
			});
		}

		// 根据范围点圈定墙体
		this.wall = viewer.entities.add({
			name: 'wall',
			wall: {
				positions: cesiumExtentPoints,
				maximumHeights: new Array(cesiumExtentPoints.length).fill(highest),
				material: Color.fromCssColorString(wallColor).withAlpha(wallOpacity),
				outline: true,
			},
		});
		// 添加填充示意
		this.fillPolygon = viewer.entities.add({
			polygon: {
				hierarchy: cesiumExtentPoints,
				material: Color.fromCssColorString(fillColor).withAlpha(fillOpacity),
				extrudedHeight: level,
			}
		});
		this.walls.push(this.wall);
		this.fillPolygons.push(this.fillPolygon);
		this.geomap.render();

		cut = cut.toFixed(3);
		fill = fill.toFixed(3);
		let calcuData = {
			cutVolume: cut, //单位：立方米
			fillVolume: fill, //单位：立方米
			highest, //单位：米
			lowest, //单位：米
			area //单位平方米
		}
		return calcuData
	}

    /**
     * 清除上次绘制效果
     *  @example
     *  let calculation = new BOSGeo.CutFillCalculation(geomap); 
     *  calculation.removeLast();
     */
    removeLast() {
        let viewer = this.geomap.viewer;
        viewer.entities.remove(this.wall);
        viewer.entities.remove(this.fillPolygon);
        this.geomap.render();
        this.walls.pop();
        this.fillPolygons.pop();
    }

    /**
     * 清除所有绘制效果
     * @example
     *  let calculation = new BOSGeo.CutFillCalculation(geomap); 
     *  calculation.removeAll();
     */
    removeAll() {
        let viewer = this.geomap.viewer;
        this.walls.forEach(wall => {
            viewer.entities.remove(wall);
        })

        this.fillPolygons.forEach(fillPolygon => {
            viewer.entities.remove(fillPolygon);
        })
        this.geomap.render();
        this.walls = [];
        this.fillPolygons = [];

    }

}

export default CutFillCalculation;