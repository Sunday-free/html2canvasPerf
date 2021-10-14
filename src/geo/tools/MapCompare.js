import Cartesian3 from 'cesium/Core/Cartesian3'

/**
 * 分屏对比工具类,目前可直接支持分成4屏
 * @constructor
 */
 function MapCompare() {
    
}

/**
 * 同步相机位置和视角
 * @private
 * @param {Viewer} mainView 相机发生变化的viewer
 * @param {Viewer} view 相机跟随变化的viewer
 */
 function updateCamearaPosition (mainView, view) {
    let destination = new Cartesian3();
    mainView.camera.position.clone(destination);
    
    let heading = mainView.camera.heading;
    let pitch = mainView.camera.pitch;
    let roll = mainView.camera.roll;
    
    view.camera.setView({
        destination,
        orientation:{
            heading,
            pitch,
            roll
        }
    });
}

/**
 * 将mainMap的视图变化同步到其他的map
 * @private
 * @param {GeoMap} mainMap 发生变化的GeoMap地图
 * @param {GeoMap} map 同步跟随变化的GeoMap地图
 */
function mainMapToMap (mainMap, map) {
    let mainView = mainMap.viewer;
    let view = map.viewer;

    function updateView () {
        updateCamearaPosition(mainView, view);
    }
    updateView.mainView = mainView;
    updateView.view = view;
    mainView.scene.preRender.addEventListener(updateView);
    
    function updateMainView () {
        updateCamearaPosition(view, mainView);
    }
    updateMainView.mainView = mainView;
    updateMainView.view = view;
    view.scene.preRender.addEventListener(updateMainView)
}

/**
 * 将GeoMap实例对象的相机视角同步
 * @param {GeoMap} geomap1 GeoMap实例对象
 * @param {GeoMap} geomap2 GeoMap实例对象
 * @param {GeoMap} [geomap3] GeoMap实例对象,非必填
 * @param {GeoMap} [geomap4] GeoMap实例对象，非必填
 * @example
 *   var geomap1 = new BOSGeo.GeoMap('bosgeoContainer1');
 *   var geomap2 = new BOSGeo.GeoMap('bosgeoContainer2');
 *   var geomap3 = new BOSGeo.GeoMap('bosgeoContainer3');
 *   var geomap4 = new BOSGeo.GeoMap('bosgeoContainer4');
 *   BOSGeo.MapCompare.bindMap(geomap1, geomap2, geomap3, geomap4);
 */
 MapCompare.bindMap = function (geomap1, geomap2, geomap3, geomap4) {
    mainMapToMap(geomap1, geomap2); 
    if(geomap3 !== undefined) {
        mainMapToMap(geomap1, geomap3); 
        mainMapToMap(geomap2, geomap3); 
    }
    if(geomap4 !== undefined) {
        mainMapToMap(geomap1, geomap4); 
        mainMapToMap(geomap2, geomap4); 
        mainMapToMap(geomap3, geomap4); 
    }
}

/**
 * geomap对象解绑
 * @param {GeoMap} geomap 需要解绑的GeoMap实例对象
 * @param {Array<GeoMap>} bindMaps 与之相关联的GeoMap实例对象的数组
 * @example
 *   var geomap1 = new BOSGeo.GeoMap('bosgeoContainer1');
 *   var geomap2 = new BOSGeo.GeoMap('bosgeoContainer2');
 *   var geomap3 = new BOSGeo.GeoMap('bosgeoContainer3');
 *   var geomap4 = new BOSGeo.GeoMap('bosgeoContainer4');
 *   BOSGeo.MapCompare.bindMap(geomap1, geomap2, geomap3, geomap4);
 *   BOSGeo.MapCompare.unbindMap(geomap1, [geomap2, geomap3, geomap4]);
 */
MapCompare.unbindMap = function (geomap, bindMaps) {
    let viewer = geomap.viewer;
    let preRender = viewer.scene.preRender;
    let len = preRender._listeners.length;
    for( let i = 0; i < len; i++) {
        preRender.removeEventListener(preRender._listeners[0]);
    }
    
    for(let m = 0; m < bindMaps.length; m++) {
        let _preRender = bindMaps[m].scene.preRender;
        let listeners = _preRender._listeners;
        for(let n = 0; n < listeners.length; n++) {
            if (listeners[n].mainView === viewer || listeners[n].view === viewer) {
                _preRender.removeEventListener(listeners[n]);
                n--;
            }
        }
    }

}

export default MapCompare;