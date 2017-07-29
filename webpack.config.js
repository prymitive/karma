const webpack = require("webpack");
const path = require("path");

const config = {
    context: path.resolve(__dirname, "assets/static"), // eslint-disable-line
    entry: "./unsee.js",
    output: {
        path: path.resolve(__dirname, "assets/static/dist"), // eslint-disable-line
        publicPath: "../static/dist/",
        filename: "bundle.js"
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        })
    ],
    externals: {
        "window":"window"
    },
    resolve: {
        alias: {
            "./bootstrap/less/variables.less": path.resolve(__dirname + "/node_modules/bootswatch/flatly/variables.less") // eslint-disable-line
        }
    },
    module: {
        rules: [
            {
                test: require.resolve("jquery"),
                use: "expose-loader?$!expose-loader?jQuery"
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: "url-loader?limit=10000&mimetype=application/font-woff"
            },
            {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: "file-loader"
            },
            {
                test: /\.css$/,
                use: [
                    { loader: "style-loader" },
                    { loader: "css-loader" }
                ]
            },
            {
                test: /\.scss$/,
                use: "style-loader"
            },
            {
                test: /\.less$/,
                use: [
                    { loader: "style-loader" },
                    { loader: "css-loader" },
                    { loader: "less-loader" }
                ]
            },
            {
                test: /\.js$/,
                include: path.resolve(__dirname, "assets/static"), // eslint-disable-line
                use: [ {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            [ "es2015", { modules: false } ]
                        ]
                    }
                } ]
            }
        ]
    },
}

module.exports = config
