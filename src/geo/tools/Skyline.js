import defaultValue from 'cesium/Core/defaultValue'
import createGuid from "cesium/Core/createGuid";
import defined from 'cesium/Core/defined'
import Color from 'cesium/Core/Color'
import Cartesian3 from 'cesium/Core/Cartesian3'
import PostProcessStage from "cesium/Scene/PostProcessStage";
import PostProcessStageComposite from "cesium/Scene/PostProcessStageComposite";
import PostProcessStageLibrary from 'cesium/Scene/PostProcessStageLibrary';
import {GeoDepository} from "../core/GeoDepository";

/**
 * 天际线分析
 *  @param {Object} options 包含以下参数的Object对象：
 *  @param {Array<Number>} [options.position] 要观察的位置，[longitude，latitude, height],不设置时则直接定位到红线位置处。
 *  @param {HeadingPitchRoll} [options.hpr = {heading: 0 ,pitch: 0.3,roll: 0}] 要观察的位置相机方位角,单位为弧度，默认为{heading: 0 ,pitch: 0.3,roll: 0}；
 *  @param {String} [options.color = '#ff0000'] 天际线颜色，默认为'#ff0000'。
 *
 *  @example
 *  let  skyline = new BOSGeo.Skyline({
        position: [113.00787890205515, 22.99050957365, 10.1], //要观察的位置，[longitude，latitude, height],不设置时则直接定位到红线位置处。
        color: '#ff0000', //天际线颜色，默认为'#ff0000'。
    });
 */
class Skyline{
    constructor(options){
        this.position = options.position ;
        this.hpr = defaultValue(options.hpr ,  {heading: 0,pitch: 0.3,roll: 0})
        // this.distance = defaultValue(options.distance,3);
        this._color =  Color.fromCssColorString(options.color || '#ff0000') ;

        this._show = false;
        this._viewer = GeoDepository.viewer ;
        this._collection = this._viewer.scene.postProcessStages;
        this._postProccessStage3 = undefined ;
        this._viewer.scene.useDepthPicking = true;
        this._viewer.scene.pickTranslucentDepth = true;

        this.position && GeoDepository.geomap.flyTo(
            new Cartesian3.fromDegrees(this.position[0] , this.position[1] , this.position[2]),
            this.hpr,
        );

        this.drawSkylineGraphics();
    }
    /**
     * 天际线分析
     * @private
     */
    drawSkylineGraphics () {
        if (this._viewer ) {
            let _collection = this._collection;
            if(_collection.contains(this._postProccessStage3)) {
                _collection.remove(this._postProccessStage3);
                this._postProccessStage3 = undefined ;
            }
            this._viewer.scene.requestRenderMode = false;
            const color = `vec4${this._color.toString()}`

            let edgeDetection = PostProcessStageLibrary.createEdgeDetectionStage();
            edgeDetection.uniforms.length = 0.01 ;
            this._viewer.scene.context.depthTexture
            let fs1 = `
            uniform sampler2D colorTexture;
            uniform sampler2D depthTexture;
            varying vec2 v_textureCoordinates;
            void main(void) {
              float depth = czm_readDepth(depthTexture, v_textureCoordinates);
              vec4 color = texture2D(colorTexture, v_textureCoordinates);
              if(depth < 1.0 - 0.000001) {
                gl_FragColor = color;
              } else {
                gl_FragColor = vec4(1.0,0.0,0.0,1.0);//边缘标记红色
              }
            }
          `;
            let postProccessStage = new PostProcessStage({
                name: 'czm_skylinetemp_'+createGuid(),
                fragmentShader: fs1
            });
            let fs2 = `
            uniform sampler2D colorTexture;
            uniform sampler2D redTexture;
            uniform sampler2D silhouetteTexture;
            varying vec2 v_textureCoordinates;
            void main(void) {
              vec4 redcolor=texture2D(redTexture, v_textureCoordinates);
              vec4 silhouetteColor = texture2D(silhouetteTexture, v_textureCoordinates);
              vec4 color = texture2D(colorTexture, v_textureCoordinates);
              if(redcolor.r == 1.0) {//边缘标记红色
                gl_FragColor = mix(color, ${color}, silhouetteColor.a);
              } else {
                gl_FragColor = color;
              }
            }
          `;
            let postProccessStage2 = new PostProcessStage({
                name: 'czm_skylinetemp2_'+createGuid(),
                fragmentShader: fs2,
                uniforms: {
                    redTexture: postProccessStage.name,
                    silhouetteTexture: edgeDetection.name
                }
            });
            let postProccessStage3 = new PostProcessStageComposite({
                name: 'czm_skyline_'+createGuid(),
                stages: [edgeDetection, postProccessStage, postProccessStage2],
                inputPreviousStageTexture: false,
                uniforms: edgeDetection.uniforms
            });
            this._postProccessStage3 =  postProccessStage3;
            _collection.add(postProccessStage3);
            this._show = true;
            GeoDepository.geomap.render()
        }
    }

    /**
     * 展示
     * @example
     * skyline.show();
     */
    show () {
        this._show = true;
        this.drawSkylineGraphics() ;
    }

    /**
     * 移除
     * @example
     * skyline.clear();
     */
    clear () {
        if(this._collection.contains(this._postProccessStage3)) {
            this._collection.remove(this._postProccessStage3);
            this._viewer.scene.requestRenderMode = true;
            GeoDepository.geomap.render()
        }
        this._show = false ;
    }
}

export default Skyline;
