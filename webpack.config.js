const PathModule = require('path');
require('dotenv').config()

module.exports = {
    mode: 'development',
    devtool: false,
    target: 'node',
    entry: './src/index.js',
    output: {
        filename: 'webxr_viewer.js',
        path: PathModule.resolve(__dirname, 'plugins')
    },
    devServer: {
        static: { directory: PathModule.resolve(__dirname, 'dist') },
        server: {
            type: 'https',
            options: {
                key: process.env.SSL_KEY,
                cert: process.env.SSL_CERT,
            },
        },
        port: 6061,
        open: false,
        hot: true,
        compress: true,
        historyApiFallback: true,
    },
    externals: {
        three: 'THREE',
    },
}