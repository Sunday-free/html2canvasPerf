/**
 * BOS后台配置
 * @private
 */
let BosConfig = {
    // username: 'zengpeng',
    // password: 'zp123123',
    // appKey: 'xeadeb8698434d12a2e03f1a74a134cd',
    datakey: 'msq',

    // // host: 'http://bigbos.bimwinner.com',    // 生产环境（暂不可用）
    // host: 'http://bigbos-alpha.bimwinner.com',  // 研发环境
    develop: 'http://bos3d-alpha.bimwinner.com',
    // host3d: 'http://bos3d.bimwinner.com/api',
    // login: 'http://bigbos-alpha.bimwinner.com/boscenterservice/account/login',
    // serviceApi: 'http://bigbos-alpha.bimwinner.com/bosgeoservice/api/',

    // 禅城配置
    name: "13294130625",
    password: "test123",
    appKey: "n96cbd69d00c4f599ef67eb8f6505332",
    // host: "http://19.134.193.146:8080/",
    host: 'http://bosgw.bimwinner.com/',
    bos3dHost :"http://19.134.193.147:9090/",
    bos3dIndex: 'http://localhost:4000',  // 模型跳转页面

    geocodeUrl: 'https://restapi.amap.com/v3/geocode/regeo',
    poiUrl: 'https://restapi.amap.com/v3/place/text',   // poi点查询
    busUrl: 'https://restapi.amap.com/v3/direction/transit/integrated', // 公交路径规划
    driveUrl: 'https://restapi.amap.com/v3/direction/driving',  // 驾车路径规划
    bicycleUrl: 'https://restapi.amap.com/v4/direction/bicycling',  // 骑行路径规划
    walkUrl: 'https://restapi.amap.com/v3/direction/walking',   // 步行路径规划
    key: '5b89a68941d5a2b421a9da330fdb0682',

    token: '', // 后台模型接口服务默认token
};

export {BosConfig}