const path = require('path');
const nodeExternals = require('webpack-node-externals');


module.exports = {
    entry: {
        fsi_server_api_client: 'FSIServerClient.ts'
    },
    target: "web",
    devtool: 'source-map',
    mode: "production",
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
                /temp/
            ]
        }]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        modules: [
            path.resolve('src'),
            path.resolve('node_modules'),
            path.resolve('src/resources'),
            path.resolve('src/utils')
        ],
        fallback: {
            fs: false,
            readline: false,
            http: false,
            https: false
        },
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'assign',
        library: 'FSIServerAPIClient',
        libraryExport: 'default'
    },
    externals: [
        nodeExternals({
            allowlist: [
                '@ungap/url-search-params',
                'bytes', 'make-dir', 'pify', 'semver', 'ow',
                'axios', 'is-buffer', 'follow-redirects'
            ]
        }),
        {
            "crypto": "window.crypto",
            "@ungap/url-search-params": "URLSearchParams"
        }
    ]

};
