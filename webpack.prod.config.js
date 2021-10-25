const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
    mode: "development",
    context: __dirname,
    entry: {
        html2canvas: "./src/html2canvas/index.ts"
    },
    output: {
        filename: chunkData => {
            let chunkName = chunkData.chunk.name;
            return chunkName === "index" ? "[name].js" : "[name]/[name].js";
        },
        // filename: 'geo-[name]-1.0.0.js',
        library: "[name]",
        libraryTarget: "commonjs2",
        path: path.resolve(__dirname, "build"),
        //需要编译Cesium中的多行字符串
        sourcePrefix: ""
    },
    resolve: {
        extensions: [".ts", ".js"]
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
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
