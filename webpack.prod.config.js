const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin")
const {CleanWebpackPlugin} = require("clean-webpack-plugin")

module.exports = {
    mode: "development",
    context: __dirname,
    entry: {
        html2canvas: "./src/html2canvas/index.ts"
    },
    output: {
      filename: '[name].js',// 生成的fiename需要与package.json中的main一致
      path: path.resolve(__dirname, 'dist'),
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
            template:"./public/index.html"
        }),
    ],
};
