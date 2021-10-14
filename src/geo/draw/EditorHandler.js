import DeveloperError from 'cesium/Core/DeveloperError';
import defined from 'cesium/Core/defined';
import Check from 'cesium/Core/Check';
import Cartesian3 from 'cesium/Core/Cartesian3';
import Cartesian2 from 'cesium/Core/Cartesian2';
import Color from 'cesium/Core/Color';
import ScreenSpaceEventType from 'cesium/Core/ScreenSpaceEventType';
import ScreenSpaceEventHandler from 'cesium/Core/ScreenSpaceEventHandler';
import destroyObject from 'cesium/Core/destroyObject';
import defaultValue from 'cesium/Core/defaultValue';
import Resource from 'cesium/Core/Resource';
import buildModuleUrl from "cesium/Core/buildModuleUrl";

import PrimitiveCollection from 'cesium/Scene/PrimitiveCollection';
import BillboardCollection from 'cesium/Scene/BillboardCollection';
import Label from 'cesium/Scene/Label';

import BillboardGraphics  from 'cesium/DataSources/BillboardGraphics';
import Entity from 'cesium/DataSources/Entity';

import LinePrimitive from '../layer/basePrimitive/LinePrimitive';
import { GeoDepository } from '../core/GeoDepository';
import DrawType from '../constant/DrawType';
import EditorHelper from './EditorHelper';
import { Globe_DrawLayerId } from '../constant/GlobeStaticValue';
import EditorPointType from '../constant/EditorPointType';
import EditorAxisType from '../constant/EditorAxisType';
import Tooltip from '../utils/Tooltip';

class EditorHandler {
    /**
     * 绘制图元对象编辑类
     * @alias EditorHandler
     * @constructor
     * 
     * @example
     * var editorHandler = new BOSGeo.EditorHandler();
     */
    constructor() {

        const { geomap, viewer } = GeoDepository;
        this.geomap = geomap;
        this.viewer = viewer;
        this.scene = viewer.scene;
        this.container = this.viewer.container;

        if (!defined(geomap)) {
            throw new DeveloperError('GeoDepository.geomap未定义，EditorHandler初始化失败!');
        }

        if (!defined(viewer)) {
            throw new DeveloperError('GeoDepository.viewer未定义，EditorHandler初始化失败!');
        }

        this._enableEditor = false;
        this._tooltip = new Tooltip();

        this._getDrawLayerInfo();

        this._centriodEntites = []; // 质心实体对象集合，[底面, 顶面]
        this._vertexEntites = []; // 底面顶点实体对象集合
        this._middlerVertexEntites = []; // 底面中点实体对象集合
        this._topperVertexEntites = [] // 拉伸面上顶点实体对象集合

        // this._addEventHandler();

        this._pickLimit = 3;
        this.isActive = false; // 是否正在编辑中

        this._outlineImagePath = buildModuleUrl(Default_Outline_Path);
        this._mouseMovingIcon = `url(${buildModuleUrl(Default_Editing_Icon)}),auto`
    }

    /**
     * 获取已添加的绘制图层
     * @private
     * 
     * @returns {Boolean} 是否已经获取完毕
     */
    _getDrawLayerInfo() {
        if (!defined(this.drawLayer) || !defined(this.billboards)) {
            this.drawLayer = this.scene.primitives._primitives.find(primitive => primitive.id === Globe_DrawLayerId);
            this.billboards = defined(this.drawLayer) ? this.drawLayer._primitives.find((primitive) => primitive instanceof BillboardCollection) : undefined;
        }
        return defined(this.drawLayer) || defined(this.billboards);
    }

    /**
     * 显示编辑时的提示
     * @private
     * 
     * @param {Object} id 辅助的实体或图元的id属性对象
     */
    _showTipWhenEditing(id) {
        const { editorType, axisType, drawType, editorIndex } = id;
        switch (editorType) {
            case EditorPointType.Vertex:
                this._tooltip.message = this._tipOfBottomVertex;
                break;
            case EditorPointType.Centriod: default:
                if (editorIndex && editorIndex > 0) {
                    this._tooltip.message = this._tipOfUpperCentriod;
                } else {
                    this._tooltip.message = this._tipOfCentriod;
                }
                break;
        }
    }

    /**
     * 外框图标地址
     * 
     * @property {String} outlineImagePath
     * @default Default_Outline_Path
     */
    get outlineImagePath() {
        return this._outlineImagePath;
    }
    set outlineImagePath(value) {
        Check.typeOf.string('value', value);
        if (value !== this._outlineImagePath) {
            Resource.fetchImage({
                url: value,
            }).then((image) => {
                // 地址有效才设置
                this._outlineImagePath = value;
            });
        }
    }

    /**
     * 筛选可移动的点
     * @private
     * 
     * @param {Array.<*>} pickList 
     * @returns {*}
     */
    _getTargetPoint(pickList) {
        let target;
        // if (!defined(pickList)) return;
        let curPickObj;
        for (let i = 0, len = pickList.length; i < len; i++) {
            curPickObj = pickList[i];
            if (curPickObj && curPickObj.id && !(curPickObj.primitive instanceof Label)) { // 避免图标标注被拾取
                const { editorType, axisType, drawType } = curPickObj.id;
                if (editorType || BillboardAssistType.includes(drawType)) {
                    target = curPickObj.id;
                    this._showTipWhenEditing(curPickObj.id);
                    break;
                } else if (axisType && PanAxisTypeList.includes(axisType)) {
                    target = curPickObj;
                    this._tooltip.message = this._tipOfAxis;
                }
            }
        }
        return target;
    }

    /**
     * 更新编辑的图元
     * @private
     * 
     * @param {Cartesian2} startPoint 
     * @param {Cartesian2} endPoint 
     */
    _updatePrimitive(startPoint, endPoint) {
        const { editorPrimitive, editorPoint, scene } = this;
        const { editorType, editorIndex } = editorPoint;
        let updatedPoints, len;
        if (editorType === EditorPointType.Centriod && editorIndex === 1) {
            updatedPoints = EditorHelper.updateDrawPrimitive(
                editorPrimitive,
                editorPoint,
                Cartesian2.subtract(endPoint, startPoint, new Cartesian2())
            );
            defined(this._updateCallback) && this._updateCallback(editorPrimitive);
            // 更新顶面拉伸高度编辑点位置
            const topperCenter = updatedPoints[0][1];
            this._centriodEntites[1].position = topperCenter;
            len = updatedPoints.length;

            // 更新轴半径：拉伸高度
            this._radius = Cartesian3.distance(this._center, topperCenter);
            this._updateEditorAxis(this._center, this._radius);
        } else if (defined(this.highlightAxisType)) {
            // 更新局部坐标系的原点位置
            // TODO updateDrawPrimitive 第二个参数可以摇摆
            updatedPoints = EditorHelper.updateDrawPrimitive(
                editorPrimitive,
                this.highlightAxisType,
                Cartesian2.subtract(endPoint, startPoint, new Cartesian2())
            );
            defined(this._updateCallback) && this._updateCallback(editorPrimitive);
            len = updatedPoints.length;
            // 更新质心实体点
            this._centriodEntites = updatedPoints[0].map((position, index) => this._updateVertexEntity(position, this._centriodEntites, index));

            // 更新底面顶点实体对象
            if (len > 1) {
                this._vertexEntites = updatedPoints[1].map((position, index) => this._updateVertexEntity(position, this._vertexEntites, index));
            }

            // 更新底面中点实体对象
            if (len > 2) {
                this._middlerVertexEntites = updatedPoints[2].map((position, index) => this._updateVertexEntity(position, this._middlerVertexEntites, index));
            }

            // 更新轴中心点
            this._center = updatedPoints[0][0];
            this._updateEditorAxis(this._center, this._radius);
        } else {
            const changedPoint = scene.pickPosition(endPoint);
            if (!defined(changedPoint)) return;

            updatedPoints = EditorHelper.updateDrawPrimitive(editorPrimitive, editorPoint, changedPoint);
            defined(this._updateCallback) && this._updateCallback(editorPrimitive);
            len = updatedPoints.length;
            const isVolumn = editorPrimitive.id && VolumeDrawType.includes(editorPrimitive.id.drawType);

            // 更新质心实体对象
            if (len > 0) {
                this._centriodEntites = updatedPoints[0].map((position, index) => this._updateVertexEntity(position, this._centriodEntites, index));

                if (updatedPoints[0].length > 1 || isVolumn) { // 抛物线或者其他柱体
                    // 更新轴原点：底部质心
                    this._center = updatedPoints[0][0];
                    this._updateEditorAxis(this._center, this._radius);
                }
            }
            // 更新底面顶点实体对象
            if (len > 1) {
                this._vertexEntites = updatedPoints[1].map((position, index) => this._updateVertexEntity(position, this._vertexEntites, index));
                // 球体、椭球体
                if (isVolumn) {
                    // 用z防止拖拽点不在轴上，不便于拖拉
                    this._radius = defined(editorPrimitive.axisRadius) ? editorPrimitive.axisRadius : Cartesian3.distance(this._center, updatedPoints[1][0]);
                    this._updateEditorAxis(this._center, this._radius);
                }
            }

            // 更新底面中点实体对象
            if (len > 2) {
                this._middlerVertexEntites = updatedPoints[2].map((position, index) => this._updateVertexEntity(position, this._middlerVertexEntites, index));
            }
        }
        // 更新拉伸面上顶点实体对象
        if (len > 3) {
            this._topperVertexEntites = updatedPoints[3].map((position, index) => this._updateVertexEntity(position, this._topperVertexEntites, index));
        }
        return;
    }

    /**
     * 添加事件监听
     * 
     * @private
     */
    _addEventHandler() {
        const self = this;
        const scene = self.scene;

        if (this.handler === undefined) {
            this.handler = new ScreenSpaceEventHandler(scene.canvas);
        } else {
            return;
        }

        // 鼠标移动
        this.handler.setInputAction((movement) => {
            if (!self._enableEditor || !movement.endPosition) return;
            if (self.isActive) {
                const { startPosition, endPosition } = movement;
                // 更新图元
                startPosition && endPosition && self._updatePrimitive(startPosition, endPosition);
            } else {
                // 悬浮更新鼠标状态
                const pickList = scene.drillPick(movement.endPosition, self._pickLimit);
                const object = pickList && self._getTargetPoint(pickList);
                if (defined(object)) {
                    self.container.style.cursor = 'pointer';
                    self._highlighAxis(object.id.axisType);
                } else {
                    self.container.style.cursor = 'default';
                    self._highlighAxis(undefined);
                    self._tooltip.message = self._tipBeforeEditing;
                }
                // self.container.style.cursor = object ? 'pointer' : 'default';
                self.geomap.render();
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        // 鼠标左键按下
        this.handler.setInputAction((movement) => {
            if (!self._enableEditor || !movement.position || self.isActive) return;
            const pickList = scene.drillPick(movement.position, self._pickLimit);
            const object = pickList && self._getTargetPoint(pickList);
            if (object) {
                // 更新鼠标拖动中的状态
                self.container.style.cursor = this._mouseMovingIcon; // 'crosshair';
                const primitiveId = object.primitiveId || object.id.primitiveId || object.id;
                self.editorPrimitive = this.drawLayer._primitives.find((primitive) => primitive.id && (primitive.id.id === primitiveId || primitive.id.id === primitiveId))
                    || this.billboards._billboards.find((billboard) => billboard.id && (billboard.id.id === primitiveId));
                self.editorPoint = object;
                // 修改透明度---为了解决不透明物体拖动质心点拾取到本身导致不断拉近的问题
                const { editorType, editorIndex } = object;
                if (editorType === EditorPointType.Centriod && editorIndex === 0) {
                    let originColor = EditorHelper.getDrawPrimitiveColor(self.editorPrimitive);
                    if (originColor instanceof Color && originColor.alpha === 1) {
                        originColor = originColor.withAlpha(0.9);
                        EditorHelper.setDrawPrimitiveColor(self.editorPrimitive, originColor); 
                        self._needToChangeAlpha = true;
                        self._originColor = Color.clone(originColor);
                    }
                }

                self.isActive = true;
                self.geomap.enableControl = false;
                self.geomap.render();
            }
        }, ScreenSpaceEventType.LEFT_DOWN);

        // 鼠标左键弹上
        this.handler.setInputAction((event) => {
            if (!this._enableEditor || !self.isActive) return;
            self.container.style.cursor = 'default';
            self.geomap.enableControl = true;
            self.isActive = false;
            // 还原透明度--看鼠标左键按下回调方法中的操作
            if (self._needToChangeAlpha && self._originColor instanceof Color && self.editorPrimitive) {
                EditorHelper.setDrawPrimitiveColor(self.editorPrimitive, self._originColor.withAlpha(1));
                self._needToChangeAlpha = false;
                self._originColor = undefined;
            }
        }, ScreenSpaceEventType.LEFT_UP); // LEFT_DOWN
    }

    /**
     * 移除事件监听
     * @private
     */
    _removeEventHandler() {
        if (this.handler !== undefined) {
            this.handler.destroy();
            this.handler = undefined;
        }
    }

    /**
     * 设置编辑的绘制图元
     * 
     * @param {Primitive} primitive 自定义绘制图元
     * @param {Object} options 编辑配置
     * @param {Object} [options.updateCallback] 图元更新回调方法
     * @param {String} [options.tipBeforeEditing='拖动圆点或者轴进行编辑'] 编辑前的提示
     * @param {String} [options.tipOfCentriod='拖动该点可整体平移'] 编辑底面质心点的提示
     * @param {String} [options.tipOfUpperCentriod='拖动该点可修改高度'] 编辑拉伸质心点的提示
     * @param {String} [options.tipOfBottomVertex = '拖动该点可修改'] 编辑底面顶点的提示
     * @param {String} [options.tipOfAxis='拖动该轴可移动位置'] 编辑轴时的提示
     * @param {Number} [options.heightScalar=1] 拉伸高度点平移量的倍数
     * @param {Number} [options.axisMovingScalar=1] 坐标轴平移量的倍数
     * 
     * @example 
     * editorHandler.setEditorObject(drawPrimitive);
     */
    setEditorObject(primitive, options = {}) {
        this.clear();
        this._addEventHandler();
        if (this._tooltip && !this._tooltip.isActivated) {
            this._tooltip.active();
        }

        // 清除临时编辑辅助对象
        this._clearEditorAssists();

        this._enableEditor = this._getDrawLayerInfo(); // 获取绘制图层信息，并开启编辑

        if (!this._enableEditor) {
            console.warn(`EditorHandler.setEditorObject, 编辑对象——${primitive}还未添加到绘制图元集合中!`);
            return;
        }

        this._primitiveId = primitive.id && primitive.id.id;

        if (!defined(primitive) || !defined(this._primitiveId)) {
            console.warn(`EditorHandler.setEditorObject, 编辑对象——${primitive}不符合要求!`);
            return;
        }

        // 获取编辑点位坐标
        this._editorPoints = EditorHelper.getAnchorPoints(primitive);
        this.editorPrimitive = primitive;

        const len = this._editorPoints.length;
        const drawType = defined(primitive.id) ? primitive.id.drawType : undefined;

        const {
            updateCallback,
            tipBeforeEditing = '拖动圆点或者轴进行编辑',
            tipOfCentriod = '拖动该点可整体平移',
            tipOfUpperCentriod = '拖动该点可修改高度',
            tipOfBottomVertex = '拖动该点可修改' + (RadiusDrawType.includes(drawType) ? '半径' : '位置'),
            tipOfAxis = '拖动该轴可移动位置',
            heightScalar = 1,
            axisMovingScalar = 1
        } = options;
        EditorHelper.heightScalar = heightScalar;
        EditorHelper.axisMovingScalar = axisMovingScalar;
        this._updateCallback = typeof updateCallback === 'function' ? updateCallback : undefined;

        this._tipBeforeEditing = tipBeforeEditing;
        this._tipOfCentriod = tipOfCentriod;
        this._tipOfUpperCentriod = tipOfUpperCentriod;
        this._tipOfBottomVertex = tipOfBottomVertex;
        this._tipOfAxis = tipOfAxis;
        this._tooltip.show = true;
        this._tooltip.message = tipBeforeEditing;

        if (BillboardAssistType.includes(drawType)) {
            this._centriodEntites = this._editorPoints[0].map((position, index) => this._addBillboardAssist(position, index, primitive));
            return;
        }

        const isVolumn = primitive.id && VolumeDrawType.includes(drawType);

        // 添加编辑点位——质心实体对象
        if (len > 0) {
            // 拉伸体 / 几何体
            if (this._editorPoints[0].length > 1 || isVolumn) {
                // 添加编辑轴，用于编辑几何体中心点位置
                const [center, topperCenter] = this._editorPoints[0];
                this._center = center;
                this._radius = defined(topperCenter) ? Cartesian3.distance(center, topperCenter) : defaultValue(primitive.axisRadius, 2000);
                this._updateEditorAxis(center, this._radius);
            }
            this._centriodEntites = this._editorPoints[0].map((position, index) => this._addVertexEntity(position, EditorPointType.Centriod, index));
        }

        // 添加编辑点位——底面顶点实体对象
        if (len > 1) {
            this._vertexEntites = this._editorPoints[1].map((position, index) => this._addVertexEntity(position, EditorPointType.Vertex, index));
        }

        // 添加编辑点位——底面中点实体对象
        if (len > 2) {
            this._middlerVertexEntites = this._editorPoints[2].map((position, index) => this._addVertexEntity(position, EditorPointType.MiddlerVertex, index));
        }

        // 添加编辑点位——拉伸面上顶点实体对象
        if (len > 3) {
            this._topperVertexEntites = this._editorPoints[3].map((position, index) => this._addVertexEntity(position, EditorPointType.TopperVertex, index));
        }
    }

    /**
     * 更新编辑辅助对象
     * 
     */
    updateAssistants() {
        const { editorPrimitive } = this;
        if (defined(editorPrimitive)) {
            const { id, extrudedHeight, label, center } = editorPrimitive;
            const drawType = defined(id) ? id.drawType : undefined;

            // 目前仅支持点及拉伸体对象的辅助对象更新
            const isTargetType = (drawType === DrawType.BILLBOARD) ||
                VolumeDrawType.includes(drawType) ||
                defined(extrudedHeight);

            if (isTargetType) {
                let anchorPoints;
                switch (drawType) {
                    case DrawType.BILLBOARD:
                        const { styles } = label;
                        this._centriodEntites[0].billboard = new BillboardGraphics({
                            image: this._outlineImagePath,
                            ...styles
                        }).clone();
                        break;
                    case DrawType.ELLIPSOID: case DrawType.SPHERE:
                        this._radius = defined(editorPrimitive.axisRadius) ? editorPrimitive.axisRadius : editorPrimitive.radii.z;
                        // 需要更新边界顶点(第二)
                        anchorPoints = EditorHelper.getAnchorPoints(editorPrimitive);
                        if (anchorPoints.length > 1) {
                            this._vertexEntites = anchorPoints[1].map((position, index) => this._updateVertexEntity(position, this._vertexEntites, index));
                        }
                        break;
                    case DrawType.CIRCLE: case DrawType.ELLIPSE:
                        anchorPoints = EditorHelper.getAnchorPoints(editorPrimitive);
                        defined(extrudedHeight) && (this._radius = extrudedHeight);
                        defined(anchorPoints[0]) && (this._centriodEntites = anchorPoints[0].map((position, index) => this._updateVertexEntity(position, this._centriodEntites, index)));
                        defined(anchorPoints[1]) && (this._vertexEntites = anchorPoints[1].map((position, index) => this._updateVertexEntity(position, this._vertexEntites, index)));
                        break;
                    default:
                        // 顶点没有更新 需要更新顶部质心点
                        if (defined(extrudedHeight)) {
                            this._radius = extrudedHeight;
                            anchorPoints = EditorHelper.getAnchorPoints(editorPrimitive);
                            defined(anchorPoints[0]) && (this._centriodEntites = anchorPoints[0].map((position, index) => this._updateVertexEntity(position, this._centriodEntites, index)));
                        }
                        break;
                }
                defined(center) && (this._center = center);
                defined(this._center) && defined(this._radius) && this._updateEditorAxis(this._center, this._radius);
            }
        }
    }

    /**
     * 清除图元编辑状态
     * 
     * @example
     * editorHandler.clear();
     */
    clear() {
        this._tooltip.show = false;
        // 清除临时编辑辅助对象
        this._clearEditorAssists();
        this._enableEditor = false;

        this._primitiveId = undefined;
        this._updateCallback = undefined;

        // 移除事件监听
        this._removeEventHandler();
    }

    /**
     * 添加广告牌辅助框
     * @private
     * 
     * @param {Cartesian3} position 锚点位置
     * @param {Number} index 锚点序号
     * @param {Object} idAttribute 锚点类id
     * 
     * @return {Entity}
     */
    _addBillboardAssist(position, index, drawPrimitive) {
        const { styles } = drawPrimitive.label;
        const { id, drawType } = drawPrimitive.id;
        const vertexEntity = this.viewer.entities.add({
            position,
            billboard: {
                image: this._outlineImagePath,
                ...styles
            }
        });
        vertexEntity.addProperty('editorType');
        vertexEntity.editorType = EditorPointType.Centriod;
        vertexEntity.addProperty('primitiveId');
        vertexEntity.primitiveId = id || this._primitiveId;
        vertexEntity.addProperty('editorIndex');
        vertexEntity.editorIndex = index;
        vertexEntity.addProperty('drawType');
        vertexEntity.editorType = drawType;

        return vertexEntity;
    }

    /**
     * 添加其它类型的顶点
     * @private
     * 
     * @param {Cartesian3} position 锚点位置
     * @param {EditorPointType} type 锚点类型
     * @param {Number} index 锚点序号
     * 
     * @return {Entity}
     */
    _addVertexEntity(position, type, index) {
        let style;

        switch (type) {
            case EditorPointType.Centriod:
                style = CentriodStyle;
                break;
            case EditorPointType.Vertex:
                style = CentriodStyle; // VertexStyle; // 产品要求。目前质心顶点样式与外部顶点样式一致
                break;
            case EditorPointType.MiddlerVertex:
                style = MiddlerVertexStyle;
                break;
            case EditorPointType.TopperVertex: default:
                style = TopperVertexStyle;
                break;
        }
        const vertexEntity = this.viewer.entities.add({
            position,
            point: {
                ...style
            }
        });
        vertexEntity.addProperty('editorType');
        vertexEntity.editorType = type;
        vertexEntity.addProperty('primitiveId');
        vertexEntity.primitiveId = this._primitiveId;
        vertexEntity.addProperty('editorIndex');
        vertexEntity.editorIndex = index;

        return vertexEntity;
    }

    /**
     * 添加/更新位置编辑轴（用于编辑拉伸体底面质心的空间位置）
     * 
     * @private
     * 
     * @param {Cartesian3} center 
     * @param {Number} radius 
     */
    _updateEditorAxis(center, radius) {
        if (!defined(this._axisPrimitive)) {
            this._axisPrimitive = this.scene.primitives.add(new PrimitiveCollection());
            const id = {
                primitiveId: this._primitiveId
            };
            AxisCustomStyleList.forEach((axisStyle) => {
                this._axisPrimitive.add(
                    new LinePrimitive({
                        id,
                        center,
                        radius,
                        depthTestEnabled: false,
                        ...axisStyle,
                        ...AxisNormalStyleList
                    })
                );
            });

        } else {
            this._axisPrimitive._primitives.forEach((primitive) => {
                primitive.center = center;
                primitive.radius = radius;
            });
        }
    }

    /**
     * 高亮单个编辑轴的颜色
     * @private
     * 
     * @param {EditorAxisType} axisType 
     */
    _highlighAxis(axisType) {
        if (axisType === this.highlightAxisType) return;

        const lastAxisPrimitive = this._axisPrimitive._primitives.find(primitive => primitive.axisType === this.highlightAxisType);
        AxisCustomStyleList.forEach((style) => {
            (lastAxisPrimitive && style.axisType === this.highlightAxisType) && (lastAxisPrimitive.color = style.color);
        });
        const curAxisPrimitive = this._axisPrimitive._primitives.find(primitive => primitive.axisType === axisType);
        (curAxisPrimitive) && (curAxisPrimitive.color = HIGHLIGHT_COLOR);

        this.highlightAxisType = axisType;

        this.geomap.render();
    }

    /**
     * 更新其它类型的顶点
     * @private
     * 
     * @param {Cartesian3} position 锚点位置
     * @param {Array.<Entity>} entities 实体对象集合
     * @param {Number} index 锚点序号
     * 
     * @return {Entity}
     */
    _updateVertexEntity(position, entities, index) {
        const len = entities.length;
        let vertexEntity;
        if (index < len) {
            vertexEntity = entities[index];
            vertexEntity.position = position;
            vertexEntity.editorIndex = index;
        } else {
            vertexEntity = this._addVertexEntity(position, entities[0].editorType, index);
        }
        return vertexEntity;
    }

    /**
     * 清除临时编辑辅助对象
     * 
     * @private
     */
    _clearEditorAssists() {

        if (defined(this._axisPrimitive)) {
            this.scene.primitives.remove(this._axisPrimitive);
            this._axisPrimitive = undefined;
        }

        this._center = undefined;
        this._radius = undefined;

        (this._centriodEntites.length > 0) && this._centriodEntites.forEach((entity) => {
            this.viewer.entities.remove(entity);
        });
        this._centriodEntites = [];

        (this._vertexEntites.length > 0) && this._vertexEntites.forEach((entity) => {
            this.viewer.entities.remove(entity);
        });
        this._vertexEntites = [];

        (this._middlerVertexEntites.length > 0) && this._middlerVertexEntites.forEach((entity) => {
            this.viewer.entities.remove(entity);
        });
        this._middlerVertexEntites = [];

        (this._topperVertexEntites.length > 0) && this._topperVertexEntites.forEach((entity) => {
            this.viewer.entities.remove(entity);
        });
        this._topperVertexEntites = [];
        this.editorPrimitive = undefined;
        this.geomap.render();
    }

    /**
     * 销毁
     */
    destroy() {
        this._tooltip.destroy();

        // 清除临时编辑辅助对象
        this._clearEditorAssists();

        // 移除事件监听
        this._removeEventHandler();
        return destroyObject(this);
    }

}

/**
 * 平移轴标配样式
 * @private
 */
const AxisNormalStyleList = {
    width: 20,
    scalar: 1.3,
    hasArrow: true,
};

/**
 * 平移轴个性化样式
 * @private
 */
const AxisCustomStyleList = [
    {
        color: '#FF0000',
        axisType: EditorAxisType.XPAN,
    },
    {
        color: '#0000FF',
        axisType: EditorAxisType.YPAN,
    },
    {
        color: '#00FF00',
        axisType: EditorAxisType.ZPAN,
    }
];
// 移动轴类型
const PanAxisTypeList = [EditorAxisType.XPAN, EditorAxisType.YPAN, EditorAxisType.ZPAN];
// 默认不可选颜色
const HIGHLIGHT_COLOR = '#A9A9A9'; // Color.DARKGREY

// 非拉伸体以外的几何体类型
const VolumeDrawType = [DrawType.SPHERE, DrawType.ELLIPSOID, DrawType.PARABOLA];

// 包含半径的几何类型
const RadiusDrawType = [DrawType.SPHERE, DrawType.ELLIPSOID, DrawType.CIRCLE, DrawType.ELLIPSE];

// 需要额外添加图标外框辅助的类型
const BillboardAssistType = [DrawType.BILLBOARD];

// 额外图标默认地址
const Default_Outline_Path = 'resource/images/outline.png';

// 编辑中鼠标样式
const Default_Editing_Icon = 'resource/images/cursor_move.png';

// "url('resource/images/cursor_move.png'),auto";

/**
 * 质心点样式
 * @private
 */
const CentriodStyle = {
    pixelSize: 10,
    color: Color.fromCssColorString('#FFFFFF'),
    //  Color.BLUEVIOLET.withAlpha(1.0),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    outlineWidth: 2,
    outlineColor: Color.fromCssColorString('#398EF7'),
    // Color.WHITE.withAlpha(0.3),
};

/**
 * 底面顶点样式
 * @private
 */
const VertexStyle = {
    pixelSize: 10,
    color: Color.fromCssColorString('#FFFFFF'),
    // color: Color.CHARTREUSE.withAlpha(0.7),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    outlineWidth: 2,
    outlineColor: Color.fromCssColorString('#398EF7'),
    // Color.WHITE.withAlpha(0.3),
};

/**
 * 底面顶点间的中心点样式
 * @private
 */
const MiddlerVertexStyle = {
    pixelSize: 5,
    color: Color.DARKKHAKI.withAlpha(0.7),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    outlineWidth: 1,
    outlineColor: Color.WHITE.withAlpha(0.3),
};

/**
 * 顶面的顶点样式
 * @private
 */
const TopperVertexStyle = {
    pixelSize: 5,
    color: Color.DARKORANGE.withAlpha(0.7),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    outlineWidth: 1,
    outlineColor: Color.WHITE.withAlpha(0.3),
};

export default EditorHandler;