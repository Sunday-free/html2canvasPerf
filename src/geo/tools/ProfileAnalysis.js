import echarts from "echarts";
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler'
import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType'
import Color from 'cesium/Core/Color'
import Cartesian2 from 'cesium/Core/Cartesian2'
import Cartesian3 from 'cesium/Core/Cartesian3'
import Cartographic from 'cesium/Core/Cartographic'
import CesiumMath from 'cesium/Core/Math'
import HeightReference from 'cesium/Scene/HeightReference'
import LabelStyle from 'cesium/Scene/LabelStyle'
import VerticalOrigin from 'cesium/Scene/VerticalOrigin'
import CallbackProperty from 'cesium/DataSources/CallbackProperty'
import GeoUtil from "../utils/GeoUtil";
import Tooltip from '../utils/Tooltip';

/**
 * 剖面分析工具类 (左键选点时保证所选点时的最后两个点都在视图范围内，结果更准确)
 * @param {GeoMap} geomap GeoMap的实例对象
 * @example
 * 	let profile = new BOSGeo.ProfileAnalysis(geomap);
 */
class ProfileAnalysis {
	constructor(geomap){
		this.geomap = geomap;
		this.pickPositions = [];//鼠标点击选取的点
		this.allPositions = [];//包含内插的所有点
		this.pointEntitis = [];
		this.distanceArray = [0];//用于创建echarts
		this.heightArray = [];//用于创建echarts
		this.distanceSum = 0;
		this.handler = new ScreenSpaceEventHandler(geomap.viewer.canvas);
	}

	/**
	 * 开始选点进行剖面分析
	 * @param {Number} [splitNumber = 8] 图表显示剖面的横轴分段数（建议值，程序有可能根据实际数据自动更改分段数，无法固定死） 
	 * @example
 	 * 	let profile = new BOSGeo.ProfileAnalysis(geomap);
	 * 	profile.start();
	 */
	start(splitNumber = 8){
        this._tooltip = new Tooltip(); // 提示框对象
        this._tooltip.message = '鼠标左键添加点， 右键结束绘制';
		this._tooltip.active();

		let scene = this.geomap.scene;
		let viewer = this.geomap.viewer;
		scene.globe.depthTestAgainstTerrain = true;

		this.handler.setInputAction(e => {
			let cartesian = scene.globe.pick(viewer.camera.getPickRay(e.position), scene);
			
			if (cartesian) {//如果点在地球上
				if (this.pickPositions.length >= 1) { //第二个以后的点
					let length = this.pickPositions.length;
					this._interPoints(this.pickPositions[length - 2], cartesian);

					this.pickPositions.push(cartesian);

					let distanceText = this.distanceSum + ' m';
					this._addPoint(viewer, cartesian, distanceText);
				} else {//第一个点
					this._addPoint(viewer, cartesian, '0 m');
					this.pickPositions.push(cartesian);
					let position = GeoUtil.cartesianToArray(cartesian);
					this.heightArray.push(position[2]);

					this._addLineEntity();
					this._addMouseMoveEvent();
				}
			}
		}, ScreenSpaceEventType.LEFT_CLICK)
		this._addEndEvent(splitNumber);
	}


	/**
	 * 创建显示地形剖面的表格
	 * @param {Number} [splitNumber = 8] 横轴的分段数（建议值，程序有可能根据实际数据自动更改分段数，无法固定死） 
	 * @example
	 * 	profile.createChart();
	 */
	createChart (splitNumber = 8) {
		if (this.distanceArray.length <= 2) {
			console.warn(`请先通过'start'方法选点，会自动创建表格！`);
			return;
		}
		let data = [];
		this.distanceArray.forEach((distance, index) => {
			let tempData = [distance, this.heightArray[index]];
			data.push(tempData); 
		});

		let element = document.createElement('div');
		element.id ='profileChart';
		element.style.position = 'absolute';
		element.style.left = '5%';
		element.style.bottom = '50px';
		setTimeout(() => {
			element.style.zIndex = 999;
		}, 100);
		element.style.width = '90%';
		element.style.height = '30%';
		element.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
		document.body.appendChild(element);

		let chart = echarts.init(element);
		var options = {
			title: {
				text: '高程(m)',
				textStyle: {
					color: '#fff',
					fontSize: 14
				}
			},
			tooltip: {
				trigger: 'axis',
				position: function(pt) {
					return [pt[0], '10%'];
				},
				formatter: function(params) {
					let values = params[0].value;
					return '距离(m):\t ' + values[0] + '<br/>' + '高程(m):\t ' + values[1].toFixed(2);
				}
			},
			legend: {
				data: [{
					name: '地形剖面分析',
					icon: 'none',
				}],
				textStyle: {
					color: '#fff',
					fontSize: 14,
					fontWeight: 'bold'
				},
			},
			grid: {
				left: 50,
				right: 65,
				bottom: 30
			},
			xAxis: [
				{
					name: '距离(m)',
					type: 'value',
					max: 'dataMax',
					scale: true,
					splitNumber: splitNumber,//只是一个建议值，程序有可能根据实际的数据分成一个更合理的值，没办法手动写死
				}
			],
			yAxis: [
				{
					type: 'value',
					scale: true,
					splitNumber: parseInt(splitNumber / 2),//只是一个建议值，程序有可能根据实际的数据分成一个更合理的值，没办法手动写死
				}
			],
			series: [
				{
					name: '地形剖面分析',
					type: 'line',
					data: data,
					cursor: 'pointer',
					lineStyle: {
						type: 'solid',
						color: '#9E3F27'
					},
					areaStyle: {
						color: '#9D472A',
					},
					itemStyle: {
						color: '#f00',
						opacity: 0
					}
				},
			],
			textStyle: {
				color: '#fff'
			},
		};

		chart.setOption(options);
		window.onresize = () => {
			chart.resize();
		}
	}

	/**
	 * 销毁显示地形剖面的表格
	 * @example
	 * profile.destroyChart();
	 */
	destroyChart () {
		let element = document.getElementById('profileChart');
		if(!element) {return}
		document.body.removeChild(element);
		element = null;
	}

	/**
	 * 清除
	 * @example
	 * profile.clear();
	 */
	clear () {
		if(!this.lineEntity) {return}
		let viewer = this.geomap.viewer;
		this._tooltip && this._tooltip.destroy();
		viewer.entities.remove(this.lineEntity);
		this.pointEntitis.forEach(e => {
			viewer.entities.remove(e);
		})
		this.lineEntity = null;
		this.pickPositions = [];//鼠标点击选取的点
		this.allPositions = [];//包含内插的所有点
		this.pointEntitis = [];
		this.distanceArray = [0];//用于创建echarts
		this.heightArray = [];//用于创建echarts
		this.distanceSum = 0;
		this.destroyChart();
		//绘制中清除，取消相应监听
		this.handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
		this.handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
		this.handler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);
	}

	/**
	 * 选取的两点之间内插点
	 * @private
	 * @param {Cartesian3} cartesian1 第一个点
	 * @param {Cartesian3} cartesian2 第二个点
	 */
	 _interPoints(cartesian1, cartesian2){
		let scene = this.geomap.scene;
		let ellipsoid = scene.globe.ellipsoid;
		let cartographic1 = ellipsoid.cartesianToCartographic(cartesian1);
		let cartographic2 = ellipsoid.cartesianToCartographic(cartesian2);

		let dLon = Math.abs(cartographic1.longitude - cartographic2.longitude) * 10000000;
		let dLat = Math.abs(cartographic1.latitude - cartographic2.latitude) * 10000000;
		let dMax = dLon > dLat ? dLon : dLat;
		let length = parseInt(dMax / 2);
		if (length > 2000) {
			length = 2000;
		} else if (length < 2) {
			length = 2;
		}

		let lastPoint = null;
		for (let i = 0; i < length; i++) {
			let cartographic = new Cartographic(
				CesiumMath.lerp(cartographic1.longitude, cartographic2.longitude, i / (length - 1)),
				CesiumMath.lerp(cartographic1.latitude, cartographic2.latitude, i / (length - 1))
			)
			let height = scene.globe.getHeight(cartographic);
			
			let point = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height);
			
			this.allPositions.push(point);
			if (i !== 0) {
				let distance = Number(Cartesian3.distance(lastPoint, point));
				this.distanceSum += distance;
				this.distanceSum = parseInt(this.distanceSum);

				this.distanceArray.push(this.distanceSum);
				this.heightArray.push(height);
			}
			lastPoint = point;
		}
	}

	/**
	 * 添加鼠标移动时，改变动态线坐标的事件
	 * @private
	 */
	_addMouseMoveEvent () {
		let viewer = this.geomap.viewer;
		let scene = viewer.scene;
		// 鼠标移动时动态添加贴地线
		this.handler.setInputAction(e => {
			if (e.endPosition) {
				let cartesian = scene.globe.pick(viewer.camera.getPickRay(e.endPosition), scene);

				if (cartesian) {
					if (this.pickPositions.length >= 2) {
						this.pickPositions.pop();
					}
					this.pickPositions.push(cartesian);
					this.geomap.render();
				}
			}
		}, ScreenSpaceEventType.MOUSE_MOVE)
	}

	/**
	 * 添加右键点击结束事件
	 * @private
	 * @param {Number} splitNumber 分段值
	 * 
	 */
	_addEndEvent (splitNumber) {
		//右键结束
		this.handler.setInputAction(e => {
			this.pickPositions.pop();
			this.geomap.render();
			this._tooltip && this._tooltip.destroy();
			this.handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
			this.handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
			this.handler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);
			this.createChart(splitNumber);
		}, ScreenSpaceEventType.RIGHT_CLICK)
	}


	/**
	 * 添加动态线
	 * @private
	 */
	_addLineEntity () {
		let viewer = this.geomap.viewer;
		let lineOptions = {
			polyline: {
				show: true,
				positions: [],
				material: Color.CHOCOLATE,
				width: 4,
				clampToGround: true
			}
		};
		viewer.scene.postProcessStages.fxaa.enabled = true;

		var _update = () => {
			return this.pickPositions;
		}
		lineOptions.polyline.positions = new CallbackProperty(_update, false);
		this.lineOptions = lineOptions;
		this.lineEntity = viewer.entities.add(lineOptions);
	}

	/**
	 * 添加点的坐标和距离注记
	 * @private
	 * @param {Viewer} viewer GeoMap的viewer属性对象
	 * @param {Cartesian3} cartesian 世界坐标
	 * @param {String} distanceText 距离值
	 */
	_addPoint (viewer, cartesian, distanceText) {

		let entity = viewer.entities.add({
			position: cartesian,
			point: {
				pixelSize: 6,
				color: Color.RED,
				outlineColor: Color.WHITE,
				outlineWidth: 1,
				// heightReference: HeightReference.NONE,
				heightReference: HeightReference.CLAMP_TO_GROUND,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			},
			label: {
				text: distanceText,
				font: '18px sans-serif',
				fillColor: Color.WHITE,
				style: LabelStyle.FILL_AND_OUTLINE,
				outlineWidth: 2,
				verticalOrigin: VerticalOrigin.BOTTOM,
				pixelOffset: new Cartesian2(20, -20),
				heightReference: HeightReference.NONE,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			}
		});
		this.geomap.render();
		this.pointEntitis.push(entity);
	}

}

export default ProfileAnalysis;