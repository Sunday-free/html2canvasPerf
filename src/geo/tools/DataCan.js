/**
 * 数据缓存
 * @ignore
 */
function DataCan () {
    this.properties = []
}

/**
 * 添加
  */
DataCan.prototype.add = function (val) {
    this.properties.push(val)
}

/**
 * 获取数据
 * @returns {Array}
 */
DataCan.prototype.get = function () {
    return this.properties
}

/**
 * 清空
 */
DataCan.prototype.clear = function () {
    this.properties = []
}

let dataCan = new DataCan()

export default dataCan