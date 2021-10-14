// import Cesium from "Cesium";
import DataSourceDisplay from '../../../../cesium/Source/DataSources/DataSourceDisplay.js'

import {RectangularSensorPrimitive} from "./RectangularSensor/RectangularSensorPrimitive.js";
import {RectangularSensorGraphics} from "./RectangularSensor/RectangularSensorGraphics.js";
import {RectangularSensorVisualizer} from './RectangularSensor/RectangularSensorVisualizer.js';

//conicSensor
// import {ConicArcSensorGeometry} from './ConicArcSensor/ConicArcSensorGeometry.js';
// import  {ConicArcSensorOutlineGeometry} from './ConicArcSensor/ConicArcSensorOutlineGeometry.js';
// import {ConicArcSensorGraphics} from './ConicArcSensor/ConicArcSensorGraphics.js';
// import {ConicArcSensorCollection} from './ConicArcSensor/ConicArcSensorCollection.js';


//rectangularSensor
// BOSGeo.RectangularSensorPrimitive = RectangularSensorPrimitive;
// BOSGeo.RectangularSensorGraphics = RectangularSensorGraphics;
// BOSGeo.RectangularSensorVisualizer = RectangularSensorVisualizer;

//conicSensor
// Cesium.ConicArcSensorGeometry = ConicArcSensorGeometry;
// Cesium.ConicArcSensorOutlineGeometry = ConicArcSensorOutlineGeometry;
// Cesium.ConicArcSensorGraphics = ConicArcSensorGraphics;
// Cesium.ConicArcSensorCollection = ConicArcSensorCollection;

// BOSGeo-Modified: 雷达传感器效果entity图形  entity添加RectangularSensor相应的属性
// var DataSourceDisplay = Cesium.DataSourceDisplay;
var originalDefaultVisualizersCallback = DataSourceDisplay.defaultVisualizersCallback;
DataSourceDisplay.defaultVisualizersCallback = function (scene, entityCluster, dataSource) {
    var entities = dataSource.entities;
    var array = originalDefaultVisualizersCallback(scene, entityCluster, dataSource);
    return array.concat([
        new RectangularSensorVisualizer(scene, entities)
    ]);
};
