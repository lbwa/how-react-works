import webpack from 'webpack'
import path from 'path'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import HTMLWebpackPlugin from 'html-webpack-plugin'

function resolveApp(p: string) {
  return path.resolve(__dirname, '..', p)
}

const config: webpack.Configuration = {
  mode: 'production',

  target: 'web',

  entry: {
    main: resolveApp('src/index.ts')
  },

  output: {
    path: resolveApp('dist'),
    pathinfo: true,
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    globalObject: 'this'
  },

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
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        enabled: true,
        configFile: resolveApp('tsconfig.json')
      },
      async: true
    }),
    new HTMLWebpackPlugin({
      collapseWhitespace: true,
      removeComments: true,
      meta: {
        viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'
      },
      templateContent: ({ htmlWebpackPlugin }) => `
        <html>
          <head>
            ${htmlWebpackPlugin.tags.headTags}
            <title>How react works</title>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `
    })
  ],

  node: {
    module: `empty`,
    dgram: `empty`,
    dns: `empty`,
    fs: `empty`,
    http2: `empty`,
    net: `empty`,
    tls: `empty`,
    child_process: `empty`
  }
}

module.exports = config
