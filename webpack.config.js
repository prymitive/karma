const webpack = require("webpack");
const path = require("path");
const fs = require("fs");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

var config = {
    cache: true,
    context: path.resolve(__dirname, "assets/static"),
    devtool: "cheap-source-map",
    entry: {
        unsee: "./unsee.js",
        help: "./help.js"
    },
    output: {
        path: path.resolve(__dirname, "assets/static/dist"),
        publicPath: "static/dist/",
        filename: "[name].[chunkhash].js"
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "shared",
                    chunks: "all"
                }
            }
        },
        minimizer: [
            new UglifyJsPlugin({
                sourceMap: true
            })
        ]
    },
    plugins: [
        new webpack.PrefetchPlugin(path.join(__dirname, "assets/static/unsee.js")),
        new webpack.PrefetchPlugin(path.join(__dirname, "assets/static/help.js")),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        }),
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new CleanWebpackPlugin([ "assets/static/dist" ]),
        // this will generate loader_${name}.html files that will have
        // a <script/> line for loading hashed chunk
        // inspited by https://github.com/webpack/webpack/issues/86
        function() {
            this.plugin("done", function(statsData) {
                var stats = statsData.toJson();
                if (!stats.errors.length) {
                    fs.mkdirSync(path.join(__dirname, "assets/static/dist/templates"));
                    for (var chunkName in stats.assetsByChunkName) {
                        var loaderName = "loader_" + chunkName + ".html";
                        var loaderScript = "<script type='text/javascript' src='static/dist/" + stats.assetsByChunkName[chunkName][0] + "'></script>";
                        fs.writeFileSync(path.join(__dirname, "assets/static/dist/templates", loaderName), loaderScript);
                    }
                }
            });
        }
    ],
    externals: {
        "window":"window"
    },
    resolve: {
        alias: {
            "./bootstrap/less/variables.less": path.resolve(__dirname + "/node_modules/bootswatch/flatly/variables.less")
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
                test: /\.ico$/,
                loader: "file-loader?name=[name].[ext]"
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
                include: path.resolve(__dirname, "assets/static"),
                use: [ {
                    loader: "babel-loader",
                    options: {
                        cacheDirectory: true,
                        presets: [
                            [ "env", { modules: false } ]
                        ]
                    }
                } ]
            }
        ]
    },
}

// check what NODE_ENV is set, if it's empty we assume production
const isDev = (process.env.NODE_ENV === "test");

// enable production only plugins
if (!isDev) {
    config.plugins.push(new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false,
        options: {
            context: __dirname
        }
    }));
}

module.exports = config
