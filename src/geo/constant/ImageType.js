/**
 * 图片类型，枚举类
 * @alias ImageType
 * @readonly
 * @enum {String}
 * @see FileUtil.exportCurrentSnapShot
 */
let ImageType = {
    /**
     * png图片
     * @type {String}
     * @constant
     */
    PNG: 'image/png',
    /**
     * jpeg图片
     * @type {String}
     * @constant
     */
    JPEG: 'image/jpeg',
    /**
     * bmp图片
     * @type {String}
     * @constant
     */
    BMP: 'image/bmp',

	/**
     * webp图片
     * @type {String}
     * @constant
	 */
	WEBP:'image/webp'

}

export default Object.freeze(ImageType);