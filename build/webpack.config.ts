import webpack from 'webpack'
import fs from 'fs'
import path from 'path'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import HTMLWebpackPlugin from 'html-webpack-plugin'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'

type WebpackMode = webpack.Configuration['mode']

export function resolveApp(p: string) {
  return path.resolve(fs.realpathSync(process.cwd()), p)
}

function createWebpackConfig(mode: WebpackMode): webpack.Configuration {
  const isEnvProduction = mode === 'production'
  const isEnvDevelopment = mode === 'development'
  return {
    mode: isEnvProduction ? 'production' : 'development',

    target: 'web',

    entry: {
      main: resolveApp('src/index.tsx')
    },

    output: {
      path: resolveApp('dist'),
      pathinfo: true,
      filename: isEnvProduction
        ? '[name].[contenthash:8].js'
        : '[name].[hash:8].js',
      chunkFilename: isEnvProduction
        ? '[name].[contenthash:8].chunk.js'
        : '[name].[hash:8].chunk.js',
      globalObject: 'this'
    },

    devtool: (isEnvProduction
      ? false
      : isEnvDevelopment &&
        `cheap-module-source-map`) as webpack.Options.Devtool,

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },

    module: {
      rules: [
        {
          oneOf: [
            {
              test: /\.(js|jsx|ts|tsx)$/,
              include: resolveApp('src'),
              loader: require.resolve('babel-loader'),
              options: {
                cacheDirectory: true,
                cacheCompression: false,
                compact: false
              }
            }
          ]
        }
      ]
    },

    plugins: [
      isEnvDevelopment && new webpack.HotModuleReplacementPlugin(),
      // FIXME: unexpected behavior: tsconfig.tsbuildinfo file would be deleted
      new CleanWebpackPlugin(),
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          enabled: true,
          configFile: resolveApp('tsconfig.json')
        },
        async: isEnvDevelopment
      }),
      new HTMLWebpackPlugin({
        inject: true,
        meta: {
          viewport: 'width=device-width, initial-scale=1'
        },
        templateContent: (/* { htmlWebpackPlugin } */) => `
          <!DOCTYPE html>
          <html>
            <head>
              <title>How react works</title>
              <style>
              html, body {
                margin: 0;
                padding: 0;
                height: 100%;
              }
              .title {
                margin-top: 0;
              }
              .footer {
                padding: 0.8em;
                font-size: 12px;
                text-align: center;
              }
              </style>
            </head>
            <body>
              <h1 class="title">How react works</h1>
              <div id="root">
                <p>The following elements are rendered by client-side js codes: </p>
              </div>
              <footer class="footer">Copyright &copy; 2020 <a href="https://github.com/lbwa" target="_blank" rel="noopener noreferrer">Liu Bowen</a></footer>
            </body>
          </html>
        `,
        ...(isEnvProduction
          ? {
              minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true
              }
            }
          : undefined)
      })
    ].filter(Boolean) as webpack.Plugin[],

    node: {
      module: 'empty',
      dgram: 'empty',
      dns: 'empty',
      fs: 'empty',
      http2: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty'
    },

    performance: {
      hints: isEnvProduction ? 'warning' : false
    },

    ...(isEnvDevelopment
      ? {
          devServer: {
            compress: true,
            hot: true,
            port: 9000,
            open: true,
            overlay: true,
            stats: 'minimal'
          }
        }
      : {})
  }
}

module.exports = createWebpackConfig(process.env.NODE_ENV as WebpackMode)
