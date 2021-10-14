const path = require("path");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ScriptExtHtmlWebpackPlugin = require("script-ext-html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// 负责将html文档虚拟到根目录下
let htmlWebpackPlugin = new HTMLWebpackPlugin({
    filename: "index.html",
    template: path.resolve(__dirname, "./public/index.html"),
    publicPath: "/", //研发环境输出绝对路径
  });
  
  let copyWebpackPlugin = new CopyWebpackPlugin([
    { from: "./public/build", to: "build" },
  ]);

module.exports = {
    entry: {
      // BOSGeo: "./src/geo/index.js",
      html2canvas: "./src/html2canvas/index.ts", //不要更换
      index: "./src/index.js", //不要更换
    },
    output: {
      filename: (chunkData) => {
        let chunkName = chunkData.chunk.name;
        return chunkName === "index" ? "[name].js" : "[name]/[name].js";
      },
      library: "[name]",
      libraryTarget: "umd",
      path: path.resolve(__dirname, "build"),
      sourcePrefix: "",
    },
    resolve: {
        extensions: [".js", ".ts", ".tsx"],
        alias: {
          // Cesium模块名称
          // cesium: path.resolve(__dirname, cesiumSource),
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    devServer: {
      contentBase: path.join(__dirname, "build"),
      // host: "192.168.1.188",
      port: 8015,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST",
      },
      open: true,
      hot: true,
      overlay: {
        warnins: false,
        errors: true,
      },
      watchContentBase: true,
      watchOptions: {
        ignored: ["node_modules"], // 忽略不用监听变更的目录
        aggregateTimeout: 500, // 防止重复保存频繁重新编译，500毫秒内重复保存不打包
        poll: 1000, // 指定轮询时间
      },
    },
    plugins: [
        htmlWebpackPlugin,
        new CopyWebpackPlugin([
          // { from: path.join(cesiumSource, "Assets"), to: "Assets" },
          // { from: path.join(cesiumSource, cesiumWorkers), to: "Workers" },
          // { from: path.join(cesiumSource, "ThirdParty"), to: "ThirdParty" },
          // {from: path.join(cesiumSource, 'ThirdParty/draco_decoder.wasm', to: targetDir + 'ThirdParty/draco_decoder.wasm'},
          // {from: path.join(cesiumSource, 'ThirdParty/Workers', to: targetDir + 'ThirdParty/Workers'},
          // { from: path.join(cesiumSource, "Widgets"), to: "Widgets" },
          { from: "resource", to: "resource" },
          // {from: 'src/geo/layer/workers', to: targetDir + 'Workers'},
          // {from: 'app/assets', to: 'assets'},
        ]),
        new MiniCssExtractPlugin({
          filename: "index.[hash].css",
        }),
        new ScriptExtHtmlWebpackPlugin({}),
        // new HtmlWebpackPlugin({
        //   title: '开发环境'}),
        // new CleanWebpackPlugin(['dist'])
      ],
};
