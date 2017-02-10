/* eslint-disable filenames/match-regex */
'use strict';

const path = require('path');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const AssetsPlugin = require('assets-webpack-plugin');
// const OptimizeJsPlugin = require('optimize-js-plugin');
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const WebpackChunkHash = require('webpack-chunk-hash');
const isDebug = !!process.env.DEBUG;
const isVerbose = process.argv.indexOf('--verbose') !== -1;

// Common configuration chunk to be used for both
// client-side and server-side bundles
// -----------------------------------------------------------------------------
const baseConfig = {
  context: path.resolve(__dirname, './src'),
  // Disable size warnings by default
  performance: {
    hints: isVerbose ? 'warning' : false
  },
  output: {
    path: path.resolve(__dirname, './build'),
    publicPath: '/build/',
    sourcePrefix: '  ',
    pathinfo: isVerbose
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        include: [
          path.resolve(__dirname, './src'),
        ],
        query: {
          // https://github.com/babel/babel-loader#options
          cacheDirectory: isDebug,
          babelrc: false,
          presets: ['es2015', 'stage-0', 'react'].concat(isDebug ? [] : ['react-optimize']),
          plugins: [
            'lodash',
            // Externalise references to helpers.
            // Leave the regenerator and polyfill out (will need to add these back in
            // if we need core-js or generators & async/await)
            // https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-runtime
            [
              'transform-runtime',
              {
                helpers: true, // defaults to true
                polyfill: false, // defaults to true
                regenerator: false // defaults to true
              }
            ]
          ].concat(
            !isDebug
              ? []
              : [
                  // Adds component stack to warning messages
                  // https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-react-jsx-source
                  'transform-react-jsx-source',
                  // Adds __self attribute to JSX which React will use for some warnings
                  // https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-react-jsx-self
                  'transform-react-jsx-self'
                ]
          )
        }
      }
    ]
  },
  plugins: [
    // Define free variables
    // https://webpack.github.io/docs/list-of-plugins.html#defineplugin
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': isDebug ? '"development"' : '"production"',
      'process.env.BROWSER': true,
      __DEV__: isDebug
    }),
    new LodashModuleReplacementPlugin({
      paths: true
    })
  ],
  // Choose a developer tool to enhance debugging
  // http://webpack.github.io/docs/configuration.html#devtool
  devtool: (
    isDebug ? 'cheap-module-source-map' : 'source-map'
  ),
  // Don't attempt to continue if there are any errors.
  bail: !isDebug,
  cache: isDebug,
  stats: {
    colors: true,
    reasons: isDebug,
    hash: isVerbose,
    version: isVerbose,
    timings: true,
    chunks: isVerbose,
    chunkModules: isVerbose,
    cached: isVerbose,
    cachedAssets: isVerbose
  }
};

// Configuration for the client-side bundle
// -----------------------------------------------------------------------------
const clientConfig = webpackMerge(baseConfig, {
  entry: {
    index: './index.js'
  },
  output: {
    filename: isDebug ? '[name].js' : '[name]-[chunkhash].js',
    chunkFilename: isDebug ? '[name].chunk.js' : '[name]-[chunkhash].chunk.js'
  },
  target: 'web',
  module: {
  },
  plugins: [
    // Move modules that occur in multiple entry chunks to a new entry chunk (the commons chunk).
    // http://webpack.github.io/docs/list-of-plugins.html#commonschunkplugin
    new webpack.optimize.CommonsChunkPlugin({
      name: ['vendor'],
      minChunks: module => /node_modules/.test(module.resource)
    }),
    // Trying to follow advice for long-term caching described here:
    // https://jeremygayed.com/dynamic-vendor-bundling-in-webpack-528993e48aab#.hjgai17ap
    new webpack.optimize.CommonsChunkPlugin('manifest'),
    new webpack.HashedModuleIdsPlugin(),
    new WebpackChunkHash()
  ].concat(
    isDebug
      ? []
      : [
          new webpack.optimize.OccurrenceOrderPlugin(true),
        /* new webpack.optimize.UglifyJsPlugin({
            sourceMap: true,
            compress: {
              screw_ie8: true, // React doesn't support IE8
              warnings: isVerbose
            },
            mangle: {
              screw_ie8: true
            },
            output: {
              comments: false,
              screw_ie8: true
            }
          })
          */
        ]
  ),
  // Some libraries import Node modules but don't use them in the browser.
  // Tell Webpack to provide empty mocks for them so importing them works.
  // https://webpack.github.io/docs/configuration.html#node
  // https://github.com/webpack/node-libs-browser/tree/master/mock
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  }
});

module.exports = [clientConfig];
