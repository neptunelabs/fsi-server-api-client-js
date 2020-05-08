const path = require('path');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');

module.exports = {
    entry: {
        fsi_server_api_client: './src/FSIServerClient.ts'
    },
    target: "web",
    devtool: 'source-map',
    mode: "production", // or "development",
    node: {
        fs: 'empty',
        readline: 'empty'
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: [{
                loader: 'ts-loader',
                options: {
                    transpileOnly: true
                },
            }],
            exclude: [
                /node_modules/,
                /src\/languages/,
                /samples/,
                /test/,
                /temp/,
            ]
        }]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        modules: [
            path.resolve('./src'),
            path.resolve('./node_modules'),
            path.resolve('./src/resources'),
            path.resolve('./src/utils')
        ]
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'assign',
        library: 'FSIServerAPIClient',
        libraryExport: 'default'
    },
    /*
    optimization: {
        splitChunks: {
        chunks: 'all',
        }
    },
     */
    externals: [
        nodeExternals({
            whitelist: [
                '@ungap/url-search-params',
                'bytes', 'make-dir', 'pify', 'semver', 'ow',
                'axios', 'is-buffer', 'follow-redirects'
            ]
        }),
        {
            "crypto": "window.crypto",
            "url-search-params": "URLSearchParams"
        }
    ],
    plugins: [
        new webpack.DefinePlugin({
            'process.env.FSISERVERCLIENTVERSION': JSON.stringify(require("./package.json").version)
        })
    ]

};
