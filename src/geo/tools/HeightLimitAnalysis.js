
import { GeoDepository } from '../core/GeoDepository'
import ClassificationPrimitive  from 'cesium/Scene/ClassificationPrimitive.js';
import GeometryInstance from "cesium/Core/GeometryInstance";
import ClassificationType from 'cesium/Scene/ClassificationType'
import PolygonGeometry from "cesium/Core/PolygonGeometry.js";
import Cartesian3 from 'cesium/Core/Cartesian3';
import ColorGeometryInstanceAttribute from 'cesium/Core/ColorGeometryInstanceAttribute'
import Color from "cesium/Core/Color";
import ShowGeometryInstanceAttribute  from 'cesium/Core/ShowGeometryInstanceAttribute.js';
import DeveloperError from 'cesium/Core/DeveloperError';

/**
 * 控高分析
 * @param {Object} options 属性选项
 * @param {Number} [options.height = 0] 指定分析的高度值
 * @param {Array<Number>} [options.positions] 分析区域，经纬度组成的数组
 * @param {String} [options.outlineColor = '#fff'] 控高平面的轮廓线颜色
 * @param {String} [options.planeColor = '#7E6C41'] 控高平面的面颜色
 * @param {Number} [options.planeOpacity = 0.3] 控高平面的面透明度
 * @param {String} [options.highlightColor = '#ff0000'] 超出分析高度的tileset高亮颜色
 * @param {Number} [options.highlightOpacity = 0.4] 超出分析高度的tileset高亮透明度
 * @example
 * var analyHeight = new BOSGeo.HeightLimitAnalysis({
    outlineColor: '#ccff00',
    planeColor:'#ccff00',
    planeOpacity: 0.2,
    highlightColor: '#00fff0',
    highlightOpacity: 0.8
});
 */

class HeightLimitAnalysis {
    constructor(options = {}) {
        const {
            height = 0,
            positions,
            outlineColor = '#fff',
            planeColor = '#7E6C41',
            planeOpacity = 0.3,
            highlightColor = '#ff0000',
            highlightOpacity = 0.4
        } = options;

        this.height = height;
        this.positions = positions;
        this.outlineColor = outlineColor;
        this.planeColor = planeColor;
        this.planeOpacity = planeOpacity;
        this.highlightColor = highlightColor;
        this.highlightOpacity = highlightOpacity;

        this.isChanged = false; //记录高度和位置信息是否变化

    }
    
    /**
     * 设置控高分析的高度
     * @param {Number} val 高度值 
     * @example
     *  var analyHeight = new BOSGeo.HeightLimitAnalysis();
     *  analyHeight.setHeight(val)
     */
    setHeight(val) {
        this.height = val;
        this.isChanged = true;
    };

    /**
     * 设置分析区域
     * @param {Array<Number>} positions 分析区域，经纬度组成的数组
     * @example
     *  var analyHeight = new BOSGeo.HeightLimitAnalysis();
     *  analyHeight.setRegion(positions)
     */
    setRegion(positions) {
        this.positions = positions
        this.isChanged = true;
    };


    /**
     * 开启控高分析
     * @example
     * var analyHeight = new BOSGeo.HeightLimitAnalysis({
     *      height: 10,
     *      positions: [
     *          116.3968, 39.9094,
     *          116.3976, 39.9094,
     *          116.3976, 39.91,
     *          116.3968, 39.91
     *      ]
     * });
     * analyHeight.start();
     */
    start() {
        
        if(!this.height && (this.height !== 0)) throw new DeveloperError('请指定高度！');
        if(!this.positions) throw new DeveloperError('请指定区域！');
        let scene = GeoDepository.scene;
        let viewer = GeoDepository.viewer;
        
        if(!this.analysePlane || this.isChanged) { //避免重复分析
            if(this.isChanged) this.clear();
            this.analysePlane = viewer.entities.add({//面板
                name: "analysePlan",
                polygon: {
                    hierarchy: Cartesian3.fromDegreesArray(this.positions),
                    height: this.height,
                    material: Color.fromAlpha(Color.fromCssColorString(this.planeColor), this.planeOpacity),
                    outline: true,
                    outlineColor: Color.fromCssColorString(this.outlineColor),
                    closeTop: false,
                    closeBottom: true
                }
            });

            this.overHeightBuild = scene.primitives.add(// 建筑超高部分
                new ClassificationPrimitive({
                    geometryInstances: new GeometryInstance({
                        geometry: PolygonGeometry.fromPositions({
                            positions: Cartesian3.fromDegreesArray(this.positions),
                            height: this.height,
                            extrudedHeight: 120
                        }),
                        attributes: {
                            color: ColorGeometryInstanceAttribute.fromColor(
                                Color.fromAlpha(Color.fromCssColorString(this.highlightColor), this.highlightOpacity)
                            ),
                            show: new ShowGeometryInstanceAttribute(true)
                        },
                        id: 'overHeight'
                    }),
                    classificationType: ClassificationType.CESIUM_3D_TILE
                })
            )

            GeoDepository.geomap.render();

        }

    }

    /**
     * 更新控高分析
     * @example
     * var analyHeight = new BOSGeo.HeightLimitAnalysis({
     *      height: 10,
     *      positions: [
     *          116.3968, 39.9094,
     *          116.3976, 39.9094,
     *          116.3976, 39.91,
     *          116.3968, 39.91
     *      ]
     * });
     * analyHeight.setHeight(val);
     * analyHeight.update();
     */
    update() {
        this.clear();
        this.start();
    }

    /**
     * 清除控高分析
     * @example
     * var analyHeight = new BOSGeo.HeightLimitAnalysis({
     *      height: 10,
     *      positions: [
     *          116.3968, 39.9094,
     *          116.3976, 39.9094,
     *          116.3976, 39.91,
     *          116.3968, 39.91
     *      ]
     * });
     * analyHeight.start();
     * analyHeight.clear();
     */
    clear() {
        GeoDepository.viewer.entities.remove(this.analysePlane);
        GeoDepository.scene.primitives.remove(this.overHeightBuild);
        this.analysePlane = undefined;
        this.overHeightBuild = undefined;
    }

}

export default HeightLimitAnalysis;