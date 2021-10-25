// import {Bounds, parseBounds, parseDocumentSize} from './css/layout/bounds';
import { Bounds, parseBounds } from "./css/layout/bounds";
// import {COLORS, isTransparent, parseColor} from './css/types/color';
import { COLORS } from "./css/types/color";
import { CloneConfigurations, CloneOptions, DocumentCloner, WindowOptions } from "./dom/document-cloner";
// import {isBodyElement, isHTMLElement, parseTree} from './dom/node-parser';
import { parseTree } from "./dom/node-parser";
import { CacheStorage } from "./core/cache-storage";
import { CanvasRenderer, RenderConfigurations, RenderOptions } from "./render/canvas/canvas-renderer";
// import {ForeignObjectRenderer} from './render/canvas/foreignobject-renderer';
import { Context, ContextOptions } from "./core/context";
import {ElementContainer} from './dom/element-container';
import {TextContainer} from './dom/text-container';

export type Options = CloneOptions &
    WindowOptions &
    RenderOptions &
    ContextOptions & {
        backgroundColor: string | null;
        foreignObjectRendering: boolean;
        removeContainer?: boolean;
    };

const render = (elementData: ElementData, textNodeClassAndContentArr: Array<TextNodeClassAndContent>, options: Partial<Options> = {}): Promise<HTMLCanvasElement> => {
    return renderElement(elementData, textNodeClassAndContentArr, options);
};


if (typeof window !== "undefined") {
    CacheStorage.setContext(window);
}

interface ElementData {
    elementStr: string;
    width: number;
    height: number;
}

// 传入参数：文本节点的class，内容
interface TextNodeClassAndContent {
    className: string;
    content: string;
}

// 缓存10个html2canvas结果
let cacheArr: {
    context: Context;
    clonedElement: HTMLElement;
    elementData: ElementData;
    renderOptions: RenderConfigurations;
    root: ElementContainer;
    iframe:HTMLIFrameElement
}[] = [];

const destoryCache = ():void=>{
    for (let i = 0; i < cacheArr.length; i++) {
        const cache = cacheArr[i];
        DocumentCloner.destroy(cache.iframe)
    }
    cacheArr = []
}

export default {render,cacheArr,destoryCache};

// 渲染传入的Dom元素 element: HTMLElement,
const renderElement = async (elementData: ElementData, textNodeClassAndContentArr: Array<TextNodeClassAndContent>, opts: Partial<Options>): Promise<HTMLCanvasElement> => {
    // 判断是否已经转换过
    let flag = false;
    let cache = cacheArr[0]; //默认第一个
    for (let i = 0; i < cacheArr.length; i++) {
        cache = cacheArr[i];
        if (elementData.elementStr === cache.elementData.elementStr) {
            flag = true;
            break;
        }
    }
    let canvas;
    // 如果没有缓存
    if (!flag) {
        let element = document.createElement("div");
        element.style.width = elementData.width + "px";
        element.style.height = elementData.height + "px";
        element.innerHTML = elementData.elementStr;
        element.className = 'BOSGeo-html2canvasTestConatiner'

        let html2canvasCollection = document.getElementById("BOSGeo-html2canvasCollection");

        if (!html2canvasCollection || typeof html2canvasCollection !== "object") {
            return Promise.reject("Element conatiner not exist");
        }
        html2canvasCollection.appendChild(element);

        if (!element || typeof element !== "object") {
            return Promise.reject("Invalid element provided as first argument");
        }
        const ownerDocument = element.ownerDocument;

        if (!ownerDocument) {
            throw new Error(`Element is not attached to a Document`);
        }

        const defaultView = ownerDocument.defaultView;

        if (!defaultView) {
            throw new Error(`Document is not attached to a Window`);
        }

        const resourceOptions = {
            allowTaint: opts.allowTaint ?? false,
            imageTimeout: opts.imageTimeout ?? 15000,
            proxy: opts.proxy,
            useCORS: opts.useCORS ?? false
        };

        const contextOptions = {
            logging: opts.logging ?? true,
            cache: opts.cache,
            ...resourceOptions
        };

        const windowOptions = {
            windowWidth: opts.windowWidth ?? defaultView.innerWidth,
            windowHeight: opts.windowHeight ?? defaultView.innerHeight,
            scrollX: opts.scrollX ?? defaultView.pageXOffset,
            scrollY: opts.scrollY ?? defaultView.pageYOffset
        };

        const windowBounds = new Bounds(windowOptions.scrollX, windowOptions.scrollY, windowOptions.windowWidth, windowOptions.windowHeight);

        const context = new Context(contextOptions, windowBounds);

        // 自定义标签开启svg的foreignObject会透明 -- 废弃
        const foreignObjectRendering = false;

        const cloneOptions: CloneConfigurations = {
            allowTaint: opts.allowTaint ?? false,
            onclone: opts.onclone,
            ignoreElements: opts.ignoreElements,
            inlineImages: foreignObjectRendering,
            copyStyles: foreignObjectRendering
        };

        // 用于文档拷贝的类
        const documentCloner = new DocumentCloner(context, element, cloneOptions);
        const clonedElement = documentCloner.clonedReferenceElement;
        if (!clonedElement) {
            return Promise.reject(`Unable to find element in cloned iframe`);
        }
        let iframe = await documentCloner.toIFrame(ownerDocument, windowBounds);

        // Html2Layer使用的是固定元素不是body和html所以不需要判断
        const { width, height, left, top } = parseBounds(context, clonedElement);

        const backgroundColor = 0;//标签背景色为透明色为0

        const renderOptions: RenderConfigurations = {
            canvas: opts.canvas,
            backgroundColor,
            scale: opts.scale ?? defaultView.devicePixelRatio ?? 1,
            x: (opts.x ?? 0) + left,
            y: (opts.y ?? 0) + top,
            width: opts.width ?? Math.ceil(width),
            height: opts.height ?? Math.ceil(height)
        };

        // 修改节点文本
        changeNodeTextContent(clonedElement,textNodeClassAndContentArr)
        // 获取节点树数据，传给CanvasRenderer实例的render方法
        const root = parseTree(context, clonedElement);

        if (backgroundColor === root.styles.backgroundColor) {
            root.styles.backgroundColor = COLORS.TRANSPARENT;
        }

        // 这是一个核心类，后续的renderXXX方法都是该类的方法
        const renderer = new CanvasRenderer(context, renderOptions);
        // 不能在这部修改text ，此前text的位置信息在parseTree已经确定，这里修改text不会居中 -- 所以只能在parseTree之前

        // dom渲染为canvas
        canvas = await renderer.render(root);

        let cache = {context,clonedElement,elementData,renderOptions,root,iframe};
        cacheArr.push(cache);
        if(cacheArr.length>11) {
            cacheArr.shift()
            let firstCache = cacheArr[0]
            if (!DocumentCloner.destroy(firstCache.iframe)) {
                context.logger.error(`Cannot detach cloned iframe as it is not in the DOM anymore`);
            }
        }
        html2canvasCollection.removeChild(element)
    } else {
        let { context, clonedElement, renderOptions,root } = cache;
        // 修改节点文本
        changeTextNodes(context,clonedElement,root,textNodeClassAndContentArr)
        const renderer = new CanvasRenderer(context, renderOptions);
        // dom渲染为canvas
        canvas = await renderer.render(root);
    }

    return canvas;
};

// 根据类名修改节点文本
const changeNodeTextContent = (clonedElement: HTMLElement , textNodeClassAndContentArr: Array<TextNodeClassAndContent>) => {
    for (let i = 0; i < textNodeClassAndContentArr.length; i++) {
        const {className,content} = textNodeClassAndContentArr[i];
        let textElemet = getElementsByClassName(clonedElement,className);
        if(textElemet){
            textElemet.innerHTML = content;
        }else{
            throw new Error(`类名为${className}的元素不存在`);
        }
    }
}

// 根据类名修改节点对应节点的elementContainer的textNodes
const changeTextNodes = (context:Context,clonedElement:HTMLElement,root: ElementContainer , textNodeClassAndContentArr: Array<TextNodeClassAndContent>) => {
    for (let i = 0; i < textNodeClassAndContentArr.length; i++) {
        const {className,content} = textNodeClassAndContentArr[i];
        let elementContainer = getElementContainerByClassName(root,className)
        if(elementContainer){
            // 修改文字
            elementContainer.textNodes = []
            // 创建属于iframe的textNode 并且父元素要属于elementContainer.element
            let textNode = clonedElement.ownerDocument.createTextNode(content)
            elementContainer.element.textContent = ''
            elementContainer.element.appendChild(textNode)

            elementContainer.textNodes.push(new TextContainer(context, textNode, elementContainer.styles));
        }else{
            throw new Error(`类名为${className}的元素不存在`);
        }
    }
}

// 根据类名获取ElementContainer的节点
const getElementContainerByClassName = (root: ElementContainer ,className:string):ElementContainer | undefined =>{
    let result;
    if(root.className === className) return root
    for (let j = 0; j < root.elements.length; j++) {
        const element = root.elements[j];
        if(element.className === className){
            result = element
        }else if(element.elements.length>0){
            result = getElementContainerByClassName(element,className)
        }
    }
    return result
}

// 根据className获取元素
const getElementsByClassName = (clonedElement:HTMLElement, className:string) => {
    var result;
    var aEle = clonedElement.getElementsByTagName('*');
    for(var i=0; i<aEle.length; i++){
        if(aEle[i].className===className){
            result = aEle[i];
            break;
        }
    }
    return result
}