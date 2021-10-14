import HandRoam from '../../roam/HandRoam';
import RouteRoamMulti from '../../roam/RouteRoamMulti';
/**
 * 漫游监听
 * @ignore
 */
class RoamListener {
    constructor(options,geomap){
        let {domId} = options;
        this.geomap = geomap;
        this.domId = domId;
        this.chooseAuto = true;
        this.enableCollision = true;
        this.enableGravity = false;
        this.cameraHeight =1.65;
        this.init();

    }

    /**
     * 销毁自由漫游
     */
    destoryHandRoam(){
        this.autoRoamer._stop();
        this.autoRoamer = null;
    }

    /**
     * 创建自由漫游
     */
    createHandRoam(){
        this.autoRoamer = new HandRoam({
            enableCollision:this.enableCollision,
            enableGravity :this.enableGravity,
            cameraHeight:this.cameraHeight
            },this.geomap);
    }

    /**
     * 创建路径漫游
     */
    createRouteRoam(){
        // this.routeRoam = new RouteRoamMulti({routeVisible:true,},this.geomap);
    }

    /**
     * 销毁路径漫游
     */
    destoryRouteRoam(){
        // this.routeRoam._stop();
        this.routeRoam = null;
        // this.geomap.layerManager.remove('_routeMulti');
    }

    /**
     * 漫游初始化
     */
    init(){
        this.addRoamMode();
        this.addAdvanceSetting();
        this.addCameraHeight();
    }
    /**
     * 用于切换漫游的两种样式
     * e为点击的图标，
     * anthoner为另一个图标元素
     * targetContent 为要显示的内容
     * anotherContent为要隐藏的内容
     * descriptAuto 为要变蓝的字体
     * descriptRoute 为白色字体
     * */
    toggleStyle(e,another,targetContent,anotherContent,descriptAuto,descriptRoute){
        if(e.target.tagName !== 'SPAN'){
            return
        }
        targetContent.style.display = 'block';
        anotherContent.style.display = 'none';
        //首先更改border的颜色
        e.target.style.borderColor = '#338EFF' ;
        //再次更改div的border颜色
        e.target.parentElement.style.borderColor = '#338EFF';
        e.target.parentElement.style.color = '#338EFF';
        descriptAuto.style.color = '#338EFF';

        //首先更改border的颜色
        //再次更改div的border颜色
        another.style.borderColor = '#4A71A3';
        another.style.color = 'white';
        another.firstElementChild.style.borderColor = '#4A71A3' ;
        descriptRoute.style.color = 'white';

    }

    /****
     *  添加漫游模式的监听
     */
    addRoamMode(){
        let handroam = document.querySelector('#'+this.domId+' .handroam'),
            routeroam= document.querySelector('#'+this.domId+' .routeroam'),
            routeRoamContent = document.querySelector('#'+this.domId+' .routeRoamContent'),
            autoRoamContent = document.querySelector('#'+this.domId+' .autoRoamContent'),
            descriptAuto = document.querySelector('#'+this.domId+' .description .left'),
            descriptRoute = document.querySelector('#'+this.domId+' .description .right');
        handroam.addEventListener('click', e => {
            //初始为选中状态，由自动漫游切换时
            if(!this.chooseAuto){
                this.chooseAuto = true;
                this.toggleStyle(e,routeroam,autoRoamContent,routeRoamContent,descriptAuto,descriptRoute);
                this.createHandRoam();
                this.destoryRouteRoam();
            }
        })
        routeroam.addEventListener('click', e => {
            //初始为选中状态，由自动漫游切换时
            if(this.chooseAuto){
                this.toggleStyle(e,handroam,routeRoamContent,autoRoamContent,descriptRoute,descriptAuto);
                this.chooseAuto = false;
                this.destoryHandRoam();
                this.createRouteRoam();
            }
        })

    }

    /***
     * 添加碰撞检测和重点模式的监听
     */
    addAdvanceSetting(){
        let collision = document.querySelector('#'+this.domId+' .collision'),
            gravity = document.querySelector('#'+this.domId+' .gravity');
        let arr = [
            {
            ele:collision,
            indicator:'enableCollision'
            },
            {
                ele:gravity,
                indicator:'enableGravity'
            },
        ]
        arr.map(v => {
            v.ele.addEventListener('click', e => {
                if(e.target.tagName !== 'SPAN'){
                    return
                }
                this[v.indicator] = ! this[v.indicator];

                this.autoRoamer[v.indicator] = this[v.indicator];
                if(this[v.indicator]){
                    e.target.classList.add("icon-switch_open");
                    e.target.classList.remove("icon-switch_close");
                    e.target.style.color = '#338EFF';
                    //设置文字的颜色
                    e.target.nextElementSibling.style.color = '#338EFF';

                }
                else{
                    e.target.classList.remove("icon-switch_open");
                    e.target.classList.add("icon-switch_close");
                    e.target.style.color = '#2C4463';
                    //设置文字的颜色
                    e.target.nextElementSibling.style.color = '#C8D4E2';

                }

            })
        })

        // collision.addEventListener('click', e => {
        //     this.collisionEnable = !this.collisionEnable;
        //     if(this.collisionEnable){
        //         e.target.classList.add("icon-switch_open");
        //         e.target.classList.remove("icon-switch_close");
        //     }
        //     else{
        //         e.target.classList.remove("icon-switch_open");
        //         e.target.classList.add("icon-switch_close");
        //     }
        //
        // })


    }

    /***
     * 转换镜头高度的单位
     */
    tranferUnit(){

    }
    /***
     * 添加镜头高度调整事件
     *
     */
    addCameraHeight(){
        let arrowUp = document.querySelector('#'+this.domId+' .arrowUp'),
            arrowDown = document.querySelector('#'+this.domId+' .arrowDown'),
            cameraHeight = document.querySelector('#'+this.domId+' #cameraHeight');
        cameraHeight.addEventListener('keypress', e => {
             if(e.keyCode ==13){
                 this.cameraHeight = parseInt(e.target.value);
                 this.autoRoamer.cameraHeight = this.cameraHeight;
             }
         })
        //初始赋值
         cameraHeight.value = this.cameraHeight;

        arrowDown.addEventListener('click', e => {
            this.cameraHeight -= 0.01;
            cameraHeight.value = this.cameraHeight;
            this.autoRoamer.cameraHeight = this.cameraHeight;
        })
        arrowUp.addEventListener('click', e => {
            this.cameraHeight += 0.01;
            cameraHeight.value = this.cameraHeight;
            this.autoRoamer.cameraHeight = this.cameraHeight;
        })
    }





}
export default RoamListener