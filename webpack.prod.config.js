const path = require("path");

module.exports = {
    mode: "development",
    context: __dirname,
    entry: {
        html2canvas: "./src/html2canvas/index.ts"
    },
    output: {
      filename: '[name].js',// 生成的fiename需要与package.json中的main一致
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs',
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
    ],
};
