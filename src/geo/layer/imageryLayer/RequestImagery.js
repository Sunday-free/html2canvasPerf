import ImageryLayer from 'cesium/Scene/ImageryLayer.js'
import when from 'cesium/ThirdParty/when';
import Request from "cesium/Core/Request.js";
import defined from "cesium/Core/defined.js";
import TileProviderError from "cesium/Core/TileProviderError.js";
import RequestState from "cesium/Core/RequestState.js";
import RequestType from "cesium/Core/RequestType.js";
import ImageryState from 'cesium/Scene/ImageryState.js';


// 多个viewer多线程、单线程加载

// 将之前原型链上的ImageryLayer._requestImagery方法重命名
// 将源码这个方法拷贝出来
// 将 throttleByServer 变量抽离出来进行控制
// 当我们需要在页面加载多 viewer 的时候，我们可以用 _requestImagery 方法，当我们不需要加载的时候，就换回 _requestImagery2 。

let throttleByServer = false;
/**
 * @private
 */
ImageryLayer.prototype._requestImagery2 = ImageryLayer.prototype._requestImagery;
ImageryLayer.prototype._requestImagery = function (imagery) {
    var imageryProvider = this._imageryProvider;

    var that = this;

    function success(image) {
        if (!defined(image)) {
            return failure();
        }

        imagery.image = image;
        imagery.state = ImageryState.RECEIVED;
        imagery.request = undefined;

        TileProviderError.handleSuccess(that._requestImageError);
    }

    function failure(e) {
        if (imagery.request.state === RequestState.CANCELLED) {
            // Cancelled due to low priority - try again later.
            imagery.state = ImageryState.UNLOADED;
            imagery.request = undefined;
            return;
        }

        // Initially assume failure.  handleError may retry, in which case the state will
        // change to TRANSITIONING.
        imagery.state = ImageryState.FAILED;
        imagery.request = undefined;

        var message =
            "Failed to obtain image tile X: " +
            imagery.x +
            " Y: " +
            imagery.y +
            " Level: " +
            imagery.level +
            ".";
        that._requestImageError = TileProviderError.handleError(
            that._requestImageError,
            imageryProvider,
            imageryProvider.errorEvent,
            message,
            imagery.x,
            imagery.y,
            imagery.level,
            doRequest,
            e
        );
    }

    function doRequest() {
        var request = new Request({
            throttle: false,
            throttleByServer,
            type: RequestType.IMAGERY,
        });
        imagery.request = request;
        imagery.state = ImageryState.TRANSITIONING;
        var imagePromise = imageryProvider.requestImage(
            imagery.x,
            imagery.y,
            imagery.level,
            request
        );

        if (!defined(imagePromise)) {
            // Too many parallel requests, so postpone loading tile.
            imagery.state = ImageryState.UNLOADED;
            imagery.request = undefined;
            return;
        }

        if (defined(imageryProvider.getTileCredits)) {
            imagery.credits = imageryProvider.getTileCredits(
                imagery.x,
                imagery.y,
                imagery.level
            );
        }

        when(imagePromise, success, failure);
    }

    doRequest();
};
