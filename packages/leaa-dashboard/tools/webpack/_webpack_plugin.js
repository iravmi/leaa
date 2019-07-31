const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Dotenv = require('dotenv-webpack');
const WriteFilePlugin = require('write-file-webpack-plugin');

const webpackConst = require('./_webpack_const');
const webpackShimming = require('./_webpack_shimming');

class WebpackCallbackPlugin {
  apply(compiler) {
    compiler.hooks.done.tap('WebpackCallbackPlugin', () => {
      if (webpackConst.IS_SERVER) {
        // emoji for CLI
        const serverBaseByText = `${process.env.PROTOCOL}://${process.env.BASE_HOST}:${process.env.PORT}`;
        const serverBaseByEmoji = `✨✨ \x1b[00;45;9m${serverBaseByText}\x1b[0m ✨✨`;
        const serverEnv = `${process.env.NODE_ENV !== 'production' ? '🚀' : '🔰'} ${(
          process.env.NODE_ENV || 'NOT-ENV'
        ).toUpperCase()}`;

        console.log(`\n\n> ${serverEnv} / URL ${serverBaseByEmoji}\n`);
      }
    });
  }
}

// PLUGIN
const pluginList = [];

pluginList.push(
  new WriteFilePlugin({
    test: /(favicon\.ico$|index\.html$|env\.js$|\/assets\/)/,
    useHashIndex: true,
  }),
  // new SizePlugin(),
  new webpack.ProvidePlugin(webpackShimming.provide),
  new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /zh-cn|zh-hk|en/),
);

if (webpackConst.__DEV__) {
  //
  // DEV PLUGIN
  //
  pluginList.push(
    new webpack.NamedChunksPlugin(),
    new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development') }),
    new Dotenv({ path: `${webpackConst.ROOT_DIR}/.env` }),
    new WebpackCallbackPlugin(),
  );
} else {
  //
  // PROD PLUGIN
  //
  pluginList.push(
    new webpack.HashedModuleIdsPlugin(),
    new MiniCssExtractPlugin({
      filename: webpackConst.OUTPUT_STYLE_FILENAME,
      chunkFilename: webpackConst.OUTPUT_STYLE_CHUNK_FILENAME,
    }),
    new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('production') }),
    new Dotenv({ path: `${webpackConst.ROOT_DIR}/.env.production` }),
  );
}

module.exports = pluginList;
