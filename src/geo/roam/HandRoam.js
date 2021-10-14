import Cartesian3 from "cesium/Core/Cartesian3";
import CesiumMath from "cesium/Core/Math";
import Ray from "cesium/Core/Ray";
import defined from "cesium/Core/defined";
import getTimestamp from "cesium/Core/getTimestamp";

class HandRoam {
    /**
     * 手动漫游（自由漫游）,
     * 可以通键盘上的按键(QWEASD←→↑↓)操作相机，其中W键和↑键控制相机向前移动，S键和↓键控制相机向后移动，A键和←控制相机向左移动，Ctrl+A组合键控制相机向左旋转，D键和→键控制相机向右移动,Ctrl+D组合键控制相机向右旋转，Q键控制相机向上移动，Ctrl+Q控制相机向上旋转，E键控制相机向下移动，Ctrl+E组合键控制相机向下旋转
     * @alias HandRoam
     * @constructor
     * 
     * @param {Geomap} geomap 三维地图对象
     * @param {Object} options 配置参数如下：
     * @param {Number} [options.speed=1.0] 漫游速度；
     * @param {Number} [options.shiftSpeed=500] 按住shift键时的倍速度；
     * @param {Boolean} [options.enableGravity=false] 是否开启重力；
     * @param {Boolean} [options.enableCollision=false] 是否开启碰撞检测；
     * @param {Number} [options.cameraHeight=1.7] 相机高度。
     * 
     * @example
     * var handRoam = new BOSGeo.HandRoam(geomap, {enableCollision: true});
	 * handRoam.start();
     */
    constructor(geomap, options) {
        let { speed = 1, shiftSpeed = 500, enableGravity = false, enableCollision = false, cameraHeight = 1.7 } = options || {};

        let viewer = geomap.viewer;
        this._cameraHeight = cameraHeight;
        this._viewer = viewer;
        this.clock = viewer.clock;
        this._oldTime = getTimestamp();
        this._camera = this._viewer.scene.camera;
        this._domElement = viewer.scene.canvas;
        this._enabled = true;
        this.available = true;

        this._speed = speed;
        this._defaultSpeed = this._speed;
        this._shiftSpeed = shiftSpeed;
        this._autoForward = false;
        this._heightSpeed = false;
        this._heightCoef = 1.0;
        this._heightMin = 0.0;
        this._heightMax = 1.0;

        this._enableGravity = enableGravity;
        this._gravitationalAcceleration = 10;
        this._enableCollision = enableCollision;

        this._autoSpeedFactor = 0.0;
        this._moveForward = false;
        this._moveBackward = false;
        this._moveLeft = false;
        this._moveRight = false;
        this._rotateLeft = false;
        this._rotateRight = false;
        this._moveUp = false;
        this._moveDown = false;
        this._rotateUp = false;
        this._rotateDown = false;
        this._mouseDragOn = false;
        this._verticalSpeed = 0;


        this._onMouseDown = onMouseDown.bind(this);
        this._onMouseMove = onMouseMove.bind(this);
        this._onMouseUp = onMouseUp.bind(this);
        this._onKeyDown = onKeyDown.bind(this);
        this._onKeyUp = onKeyUp.bind(this);
        addEventHandler(this);
    }

    /**
     * 漫游速度
     * @property {Number}
     * @default 1.0
     */
    get speed() {
        return this._speed;
    }
    set speed(v) {
        this._speed = v;
    }

    /**
     * 按住shift键时的倍速度
     * @property {Number}
     * @default 500
     */
    get shiftSpeed() {
        return this._shiftSpeed;
    }
    set shiftSpeed(v) {
        this._shiftSpeed = v;
    }

    /**
     * 相机高度
     * @property {Number}
     * @default 1.7
     */
    get cameraHeight() {
        return this._cameraHeight;
    }
    set cameraHeight(v) {
        this._cameraHeight = v;
        // this.viewer.camera.position.z += v;
    }

    /**
     * 是否开启重力
     * @property {Boolean}
     * @default false
     */
    get enableGravity() {
        return this._enableGravity;
    }
    set enableGravity(v) {
        this._enableGravity = v;
    }

    /**
     * 是否开启碰撞检测
     * @property {Boolean}
     * @default false
     */
    get enableCollision() {
        return this._enableCollision;
    }
    set enableCollision(v) {
        this._enableCollision = v;
    }


    /**
     * 是否开启键盘控制
     * @property {Boolean}
     * @default true
     */
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        this._enabled = value;
        this.clock.onTick.addEventListener(this.render.bind(this));
    }

    /**
     * 重力加速度
     * @property {Number}
     * @default 10
     */
    get gravitationalAcceleration() {
        return this._gravitationalAcceleration;
    }
    set gravitationalAcceleration(value) {
        this._gravitationalAcceleration = value;
    }

    /**
     * 是否自动向前漫游
     * @property {Boolean}
     * @default false
     */
    get autoForward() {
        return this._autoForward;
    }
    set autoForward(value) {
        this._autoForward = value;
    }

    /**
     * 漫游更新回调方法
     * 
     * @param {Number} delta 更新间隔
     */
    update(delta) {
        if (this.enabled === false) return;
        if (this._heightSpeed) {
            let y = CesiumMath.clamp(this._camera.position.y, this._heightMin, this._heightMax);
            let heightDelta = y - this._heightMin;
            this._autoSpeedFactor = delta * (heightDelta * this._heightCoef);
        } else {
            this._autoSpeedFactor = 0.0;
        }

        let actualMovedDistance = delta * this.speed;

        let currentEllipsoid = this._viewer.scene.globe.ellipsoid;
        let surfaceNormal = currentEllipsoid.geodeticSurfaceNormalCartographic(this._camera.positionCartographic, new Cartesian3());
        let cameraHorizontalDirection = Cartesian3.cross(surfaceNormal, this._camera.right, new Cartesian3());

        let realMoveDistance = 0;
        if (this._moveForward || (this._autoForward && !this._moveBackward)) {
            realMoveDistance = getMoveDistanceByDir(this, cameraHorizontalDirection, actualMovedDistance + this._autoSpeedFactor);
            this._camera.move(cameraHorizontalDirection, realMoveDistance);
        }
        if (this._moveBackward) {
            realMoveDistance = getMoveDistanceByDir(this, Cartesian3.negate(cameraHorizontalDirection, new Cartesian3()), actualMovedDistance);
            this._camera.move(cameraHorizontalDirection, -realMoveDistance);
        }
        //屏蔽键盘左右事件
        if (this.available) {
            if (this._moveLeft) {
                realMoveDistance = getMoveDistanceByDir(this, Cartesian3.negate(this._camera.right, new Cartesian3()), actualMovedDistance);
                this._camera.move(this._camera.right, -realMoveDistance);
            }
            if(this._rotateLeft){
                this._camera.setView({
                    orientation: {
                        heading:this._camera.heading - CesiumMath.toRadians(5) ,
                        pitch : this._camera.pitch,}});
                this._rotateLeft = false ;
            }
            if(this._rotateRight){
                this._camera.setView({
                    orientation: {
                        heading:this._camera.heading + CesiumMath.toRadians(5) ,
                        pitch : this._camera.pitch,}});
                this._rotateRight = false ;
            }
            if (this._moveRight) {
                realMoveDistance = getMoveDistanceByDir(this, this._camera.right, actualMovedDistance);
                this._camera.move(this._camera.right, realMoveDistance);
            }
        }
        //开启重力模式，但未检测到物体时，应设置高度为相机的高度
        if (this._enableGravity) {
            let ray = new Ray(this._camera.positionWC, Cartesian3.negate(surfaceNormal, new Cartesian3()));
            let intersectionObj = this._viewer.scene.pickFromRay(ray);
            if (defined(intersectionObj) && defined(intersectionObj.object) && defined(intersectionObj.position)) {
                let intersectionPoint = intersectionObj.position;
                // console.log("intersectionPoint" + intersectionPoint.toString());
                let intersectionDir = Cartesian3.subtract(intersectionPoint, this._camera.positionWC, new Cartesian3());
                let dirDistance = Cartesian3.magnitude(intersectionDir);
                let needMoveDistance = 0;
                let factor = 1;
                //身高170
                //当cameara到物体的举例大于1.8米时，移动距离为 dirDistance - 1.8
                if (dirDistance > this.cameraHeight + 0.1) {
                    needMoveDistance = dirDistance - this.cameraHeight + 0.1;
                    factor = -1;
                }
                //   //当cameara到物体的距离小于1.8米时，移动距离为1.8 - dirDistance
                else if (dirDistance < this.cameraHeight - 0.1) {
                    //台阶
                    needMoveDistance = this.cameraHeight + 0.1 - dirDistance;
                }
                if (needMoveDistance > 0) {
                    let v0 = this._verticalSpeed;
                    let alreadyMoveDistance = v0 * delta + 0.5 * this._gravitationalAcceleration * delta * delta;
                    if (alreadyMoveDistance >= needMoveDistance) {
                        alreadyMoveDistance = needMoveDistance;
                        this._verticalSpeed = 0;
                    }
                    else {
                        this._verticalSpeed = v0 + this._gravitationalAcceleration * delta;
                    }
                    this._camera.move(surfaceNormal, factor * alreadyMoveDistance);
                }
                else {
                    this._verticalSpeed = 0;
                }
            }
            else {

                let camera = this._camera;
                let surfaceNormal = this._viewer.scene.globe.ellipsoid.geodeticSurfaceNormalCartographic(camera.positionCartographic, new Cartesian3());
                camera.move(surfaceNormal, -camera._positionCartographic.height + parseFloat(this.cameraHeight));
            }

        }
        else {
            if (this._moveUp) {
                this._camera.move(surfaceNormal, actualMovedDistance);
            }
            if (this._moveDown) {
                this._camera.move(surfaceNormal, -actualMovedDistance);
            }
            if(this._rotateUp){
                this._camera.setView({
                    orientation: {
                        heading:this._camera.heading  ,
                        pitch : this._camera.pitch+ CesiumMath.toRadians(5),}});
                this._rotateUp = false ;
            }
            if(this._rotateDown){
                this._camera.setView({
                    orientation: {
                        heading:this._camera.heading  ,
                        pitch : this._camera.pitch - CesiumMath.toRadians(5),}});
                this._rotateDown = false ;
            }
        }
    }

    /**
     * 根据时间刷新页面
     * @private
     */
    render() {
        let currentTime = getTimestamp();
        this.update(0.001 * (currentTime - this._oldTime));
        this._oldTime = currentTime;
    }

    /**
     * 取消手动漫游
     */
    destroy() {
        this._domElement.removeEventListener('pointerdown', this._onMouseDown);
        this._domElement.removeEventListener('pointermove', this._onMouseMove);
        this._domElement.removeEventListener('pointerup', this._onMouseUp);

        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }

    /**
     * 开启手动漫游
     * 
     * @example
     * handRoam.start();
     */
    start() {
        this.enabled = true;
    }

    /**
     * 停止手动漫游
     * 
     * @example
     * handRoam.stop();
     */
    stop() {
        this.enabled = false;
    }
}

/**
 * 添加事件句柄
 * 
 * @private
 * @param {Object} self  
 */
function addEventHandler(self) {
    self._domElement.addEventListener('pointerdown', self._onMouseDown);
    self._domElement.addEventListener('pointermove', self._onMouseMove);
    self._domElement.addEventListener('pointerup', self._onMouseUp);

    document.addEventListener('keydown', self._onKeyDown);
    document.addEventListener('keyup', self._onKeyUp);
}

/**
 * 鼠标按下事件回调方法
 * 
 * @private
 * @param {Event} event 
 */
function onMouseDown(event) {
    if (this._domElement !== document) {
        this._domElement.focus();
    }
    this._mouseDragOn = true;
}

/**
 * 鼠标弹上事件回调方法
 * 
 * @private
 * @param {Event} event 
 */
function onMouseUp(event) {
    this._mouseDragOn = false;
}

/**
 * 鼠标移动事件回调方法
 * 
 * @private
 * @param {Event} event 
 */
function onMouseMove(event) {
    let movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    let movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    if (this._mouseDragOn) {
        let currentEllipsoid = this._viewer.scene.globe.ellipsoid;
        let surfaceNormal = currentEllipsoid.geodeticSurfaceNormalCartographic(this._camera.positionCartographic, new Cartesian3());
        if (movementX !== 0) {
            this._camera.look(surfaceNormal, -movementX * 0.0001);
        }
        if (movementY !== 0) {
            this._camera.lookUp(movementY * 0.0001);
        }
    }
}

/**
 * 键盘按下事件回调方法
 * 
 * @private
 * @param {Event} event 
 */
function onKeyDown(event) {
    //event.preventDefault();
    // console.log('键盘事件')
    switch (event.keyCode) {
        case 38: /*up*/
        case 87: /*W*/
            this._moveForward = true;
            break;

        case 37: /*left*/
        case 65: /*A*/
            if(event.ctrlKey ===true ){
                this._rotateLeft = true;
                window.event.preventDefault();//避免与浏览器快捷键冲突
                window.event.cancelBubble = true;//IE
            }else {
                this._moveLeft = true;
            }
            break;

        case 40: /*down*/
        case 83: /*S*/
            this._moveBackward = true;
            break;

        case 39: /*right*/
        case 68: /*D*/
            if(event.ctrlKey ===true ){
                this._rotateRight = true;
                window.event.preventDefault();//避免与浏览器快捷键冲突
                window.event.cancelBubble = true;//IE
            }else {
                this._moveRight = true;
            }
            break;

        case 81: /*Q*/
            if(event.ctrlKey ===true ){
                this._rotateUp = true;
            }else {
                this._moveUp = true;
            }
            break;
        case 69: /*E*/
            if(event.ctrlKey ===true ){
                this._rotateDown = true;
                window.event.preventDefault();//避免与浏览器快捷键冲突
                window.event.cancelBubble = true;//IE
            }else {
                this._moveDown = true;
            }
            break;
        case 16:
            this.speed = this.shiftSpeed
            break
        case 107:
            ++this.speed;
            break
        case 109:
            --this.speed
            break
        case 87: /*屏蔽Ctrl+w */
            if(event.ctrlKey ===true ){
                window.event.preventDefault();//避免与浏览器快捷键冲突
                window.event.cancelBubble = true;//IE
            }
            break;
    }
}

/**
 * 键盘弹上事件回调方法
 * 
 * @private
 * @param {Event} event 
 */
function onKeyUp(event) {
    switch (event.keyCode) {
        case 38: /*up*/
        case 87: /*W*/
            this._moveForward = false;
            break;

        case 37: /*left*/
        case 65: /*A*/
            if(event.ctrlKey ===true ){
                this._rotateLeft = false;
                window.event.preventDefault();//避免与浏览器快捷键冲突
                window.event.cancelBubble = true;//IE
            }else {
                this._moveLeft = false;
            }
            break;

        case 40: /*down*/
        case 83: /*S*/
            this._moveBackward = false;
            break;

        case 39: /*right*/
        case 68: /*D*/
            if(event.ctrlKey ===true ){
                this._rotateRight = false;
                window.event.preventDefault();//
                window.event.cancelBubble = true;//IE
            }else {
                this._moveRight = false;
            }
            break;

        case 81: /*Q*/
            if(event.ctrlKey ===true ){
                this._rotateUp = false;
            }else {
                this._moveUp = false;
            }
            break;
        case 69: /*E*/
            if(event.ctrlKey ===true ){
                this._rotateDown = false;
                window.event.preventDefault();//
                window.event.cancelBubble = true;//IE
            }else {
                this._moveDown = false;
            }
            break;
        case 16:
            this.speed = this._defaultSpeed;
            break;
        case 87: /*屏蔽Ctrl+w */
            if(event.ctrlKey ===true ){
                window.event.preventDefault();//避免与浏览器快捷键冲突
                window.event.cancelBubble = true;//IE
            }
            break;
    }
}

/**
 * 根据移动的方向和鼠标滑动的距离获取真实移动距离
 * 
 * @private
 * @param {Object} self this指针
 * @param {Cartesian3} dir 方向向量
 * @param {Number} actualMovedDistance 移动距离
 * @returns {Number}
 */
function getMoveDistanceByDir(self, dir, actualMovedDistance) {
    if (self._enableCollision) {
        let objectsToExclude = []
        let ray = new Ray(self._camera.positionWC, dir);
        let intersectionObj = self._viewer.scene.drillPickFromRay(ray, 1, objectsToExclude);
        if (intersectionObj) {
            intersectionObj = intersectionObj[0]
        }
        if (defined(intersectionObj) && defined(intersectionObj.object) && defined(intersectionObj.position)) {
            //TODO 可以屏蔽掉一些门窗或者玻璃
            let intersectionPoint = intersectionObj.position;
            let intersectionDir = Cartesian3.subtract(intersectionPoint, self._camera.positionWC, new Cartesian3());
            let dirDistance = Cartesian3.magnitude(intersectionDir);
            // console.log(dirDistance)
            if (dirDistance > 0.2) {
                let canMoveDistance = dirDistance - 0.2;
                if (actualMovedDistance <= canMoveDistance) {
                    return actualMovedDistance;
                }
                else {
                    return canMoveDistance;
                }
            }
            else {
                return 0;
            }
        }
        else {
            return actualMovedDistance;
        }
    }
    else {
        return actualMovedDistance;
    }
}

export default HandRoam;

