
import axios from 'axios'
import GeoUtil from '../utils/GeoUtil'
import { GeoDepository } from "../core/GeoDepository";

/**
 * 查询通过GeoServer发布的WFS服务的属性
 * @example
 * let query =new BOSGeo.Query()
 */
class Query {
    constructor () {
        this.viewer = GeoDepository.viewer
    }

    /**
     * 执行空间面查询 geoserver的wfs
     * @param  {String} spatialUrl wfs图层链接: 'http://192.168.1.249:16080/geoserver/jssthx/wfs?SERVICE=WFS&VERSION=1.1.1&REQUEST=GetFeature&outputformat=json'
     * @param  {String} layerName 查询的图层名称
     * @param  {String} geomType 查询的空间字段 ogc_geom,the_geom,geom,shape具体查询图层的要素属性
     * @param  {String} polygon 空间范围  'x1,y1 x2,y2 x3,y3 ... x1,y1'
     * @param  {Object} callback 异步查询结果回调函数，成功则传入查询的geojson数据
     * @example
     let url ='http://gis-alpha.bimwinner.com/geoserver/futian/ows?service=WFS&version=1.0.0&request=GetFeature&outputformat=json';
     let polygon = '113.1,23.3 113.5,23.9 113.8,23.8 113.1,23.3'
     let  getAttri =(result)=>{
                console.log(result)
            }
     query.geometryPolygonQuery(url,'futian:futianFjsonD','geom',polygon,getAttri)
     */
    geometryPolygonQuery (spatialUrl, layerName, geomType, polygon, callback) {
        let filter = `${spatialUrl}&typename=${layerName}&Filter=<Filter xmlns="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"><Intersects><PropertyName>${geomType}</PropertyName><gml:Polygon><gml:outerBoundaryIs><gml:LinearRing><gml:coordinates>${polygon}</gml:coordinates></gml:LinearRing></gml:outerBoundaryIs></gml:Polygon></Intersects></Filter>`
        // var filter = `${spatialUrl}&typename=${mapUrl}&Filter=%3CFilter%20xmlns:ogc=%22http://www.opengis.net/ogc%22%20xmlns:gml=%22http://www.opengis.net/gml%22%3E%3CIntersects%3E%20%3CPropertyName%3Ethe_geom%3C/PropertyName%3E%20%3Cgml:Envelope%20srsName=%22EPSG:4326%22%3E%09%20%3Cgml:lowerCorner%3E${120.52 - 0.0002709031105}%20${33.67 - 0.0002709031105}%3C/gml:lowerCorner%3E%20%09%20%3Cgml:upperCorner%3E${120.52 + 0.0002709031105}%20${33.67 + 0.0002709031105}%3C/gml:upperCorner%3E%20%3C/gml:Envelope%3E%3C/Intersects%3E%3C/Filter%3E`
        axios.post(filter).then(result => {
            if (result.status === 200) {
                if (callback) {
                    callback(result.data)
                }
            }
        })
    }

    /**
     * 执行点击查询 geoserver的wfs
     * @param {String} spatialUrl wfs图层链接: 'http://192.168.1.249:16080/geoserver/jssthx/wfs?SERVICE=WFS&VERSION=1.1.1&REQUEST=GetFeature&outputformat=json'
     * @param {String}  layerName 查询的图层名称
     * @param {String}  geomType 查询的空间字段,常用 ogc_geom,the_geom,geom,  shape具体查询图层的要素属性，需根据wfs的url确定。
     * @param {Object}  position 经纬度坐标{x:,y:}
     * @param {Object}  callback 查询结果回调函数，成功则传入查询的geojson数据
     *
     *  @example
     let url ='http://gis-alpha.bimwinner.com/geoserver/futian/ows?service=WFS&version=1.0.0&request=GetFeature&outputformat=json';
     let position = {x:114.091066,y:22.565284}
     let  getAttri =(result)=>{
                console.log(result)
            }
     query.identifyQuery(url,'futian:futianFjsonD','geom',position,getAttri)
     */
    identifyQuery (spatialUrl, layerName, geomType,position, callback) {
        if(! position)  return
        let xyz = position //GeoUtil.cartasian2degress (cartesian)
        let filter = `${spatialUrl}&typename=${layerName}&Filter=<Filter xmlns="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"><Intersects><PropertyName>${geomType}</PropertyName><gml:Point><gml:coordinates>${xyz.x},${xyz.y}</gml:coordinates></gml:Point></Intersects></Filter>`
        axios.post(filter).then(result => {
            if (result.status === 200) {
                if (callback) {
                    callback(result.data) ;
                }
            }
        })
    }

    /**
     * 执行BBOX查询 geoserver的wfs
     * @param {String} spatialUrl wfs图层链接: 'http://192.168.1.249:16080/geoserver/jssthx/wfs?SERVICE=WFS&VERSION=1.1.1&REQUEST=GetFeature&outputformat=json'
     * @param {String}  layerName 查询的图层名称
     * @param {String}  geomType 查询的空间字段,常用 ogc_geom,the_geom,geom,  shape具体查询图层的要素属性，需根据wfs的url确定。
     * @param  {Array} range 空间四角坐标  { minx, miny, maxx, maxy }
     * @param {Object}  callback 查询结果回调函数，成功则传入查询的geojson数据
     *
     * @example
     let url ='http://gis-alpha.bimwinner.com/geoserver/futian/ows?service=WFS&version=1.0.0&request=GetFeature&outputformat=json';
     let position = {x:114.091066,y:22.565284}
     let range = [Number(position.x)-0.0000095,Number(position.y)-0.0000095,Number(position.x) + 0.0000095,Number(position.y) + 0.0000095]
     let  getAttri =(result)=>{
                console.log(result)
            }
     query.bBOXQuery(url,'futian:futianFjsonD','geom',position,getAttri)
     */
    bBOXQuery (spatialUrl, layerName, geomType,range, callback) {
        if(! range)  return
        let filter = `${spatialUrl}&typename=${layerName}&Filter=<Filter xmlns="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"><BBOX><PropertyName>${geomType}</PropertyName><gml:Box><gml:coordinates>${range[0]},${range[1]} ${range[2]},${range[3]}</gml:coordinates></gml:Box></BBOX></Filter>`
        axios.post(filter).then(result => {
            if (result.status === 200) {
                if (callback) {
                    callback(result.data) ;
                }
            }
        })
    }

    /**
     * 查询geoserver的wfs数据
     * @param {String} spatialUrl wfs图层链接: 'http://192.168.1.249:16080/geoserver/jssthx/wfs?SERVICE=WFS&VERSION=1.1.1&REQUEST=GetFeature&outputformat=json'
     * @param {String}  layerName 查询的图层名称
     * @param {Object}  callback 查询结果回调函数，成功则传入查询的geojson数据
     *
     * @example
     let url ='http://gis-alpha.bimwinner.com/geoserver/futian/ows?service=WFS&version=1.0.0&request=GetFeature&outputformat=json';
     let  getAttri =(result)=>{
                console.log(result)
            }
     query.wfsQuery(url,'futian:futianFjsonD',getAttri)
     */
     wfsQuery (spatialUrl, layerName, callback) {
        if(! spatialUrl )  return
        let filter = `${spatialUrl}&typename=${layerName}`
        axios.post(filter).then(result => {
            if (result.status === 200) {
                if (callback) {
                    callback(result.data) ;
                }
            }
        })
    }

    /**
     * 基于条件查询geoserver的wfs数据
     * @param {String} spatialUrl wfs图层链接: 'http://192.168.1.249:16080/geoserver/jssthx/wfs?SERVICE=WFS&VERSION=1.1.1&REQUEST=GetFeature&outputformat=json'
     * @param {String}  layerName 查询的图层名称
     * @param {String} filter   filter为服务中所要查询的条件
     * @param {Object}  callback 查询结果回调函数，成功则传入查询的geojson数据
     *
     * @example
     let url ='http://gis-alpha.bimwinner.com/geoserver/futian/ows?service=WFS&version=1.0.0&request=GetFeature&outputformat=json';
     let position = {x:113.9,y:23.1}
     let filter = `Filter=<Filter xmlns="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"><FeatureId fid='futianFjsonD.266'></FeatureId></Filter>`
     let  getAttri =(result)=>{
                console.log(result)
            }
     query.bBOXQuery(url,'futian:futianFjsonD',filter,getAttri)
     */
    filterWfsQuery (spatialUrl, layerName,filter, callback) {
        if(! spatialUrl )  return
        let filters = `${spatialUrl}&typename=${layerName}`+`&${filter}`
        axios.post(filters).then(result => {
            if (result.status === 200) {
                if (callback) {
                    callback(result.data) ;
                }
            }
        })
    }
}
export default Query;