const fs = require('fs');
const lessToJS = require('less-vars-to-js');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const { WPCONST } = require('./_const');

const antdModifyVars = lessToJS(fs.readFileSync(`${WPCONST.SRC_DIR}/styles/variables.less`, 'utf8'));

const modules = {
  // strictExportPresence: false,
  strictExportPresence: true,
};

modules.rules = [
  // Disable require.ensure as it's not a standard language feature.
  { parser: { requireEnsure: false } },
  {
    test: WPCONST.REGX_TS,
    include: WPCONST.SRC_DIR,
    exclude: /node_modules/,
    use: [{ loader: 'babel-loader?cacheDirectory' }],
  },
  {
    test: WPCONST.REGX_SCRIPT_MAP,
    use: [{ loader: 'file-loader' }],
  },
  // for STYLE
  {
    test: WPCONST.REGX_STYLE,
    use: [
      { loader: WPCONST.__DEV__ ? 'style-loader' : MiniCssExtractPlugin.loader },
      {
        loader: 'css-loader',
        options: {
          importLoaders: 2,
          sourceMap: false,
          modules: {
            auto: true,
            localIdentName: WPCONST.LOADER_CSS_LOADERR_LOCAL_IDENT_NAME,
          },
        },
      },
      { loader: 'postcss-loader' },
      {
        loader: 'less-loader',
        options: {
          lessOptions: {
            javascriptEnabled: true,
            modifyVars: antdModifyVars,
          },
        },
      },
    ],
  },
  //
  // IMAGE
  {
    test: WPCONST.REGX_IMAGE,
    exclude: [/src[\\/]assets[\\/]fonts/],
    use: [
      {
        loader: 'url-loader',
        options: {
          limit: 8192,
          name: `images/${WPCONST.STATIC_ASSET_NAME}`,
        },
      },
    ],
  },
  //
  // FONT
  {
    test: WPCONST.REGX_FONT,
    // include: /src[\\/]assets[\\/]fonts/,
    use: [
      {
        loader: 'url-loader',
        options: {
          limit: 8192,
          name: 'fonts/[folder]/[name].[ext]?[hash:8]',
        },
      },
    ],
  },
];

module.exports = { modules };
