const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const WebpackConfig = {
  // Source map type
  // @see https://webpack.js.org/configuration/devtool/
  devtool: "eval-source-map",

  entry: {
    //  Webpack dev server
    devServer: `webpack-dev-server/client?http://0.0.0.0:8080`,

    // Plugin entry points
    "control/content/content": path.join(
      __dirname,
      "../src/control/content/content.js"
    ),
    "control/design/design": path.join(
      __dirname,
      "../src/control/design/design.js"
    ),
    "control/settings/settings": path.join(
      __dirname,
      "../src/control/settings/settings.js"
    ),
    "control/tests/tests": path.join(
      __dirname,
      "../src/control/tests/tests.js"
    ),
    "widget/widget": path.join(__dirname, "../src/widget/widget.js")
  },

  output: {
    path: path.join(__dirname, "../"),
    filename: "[name].js",
    publicPath: "http://0.0.0.0:8080/"
  },

  externals: {
    buildfire: "buildfire"
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"]
          }
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      filename: "control/content/index.html",
      inject: true,
      minify: { removeComments: true, collapseWhitespace: true },
      template: path.join(__dirname, "../src/control/content/index.html"),
      chunks: ["devServer", "control/content/content"]
    }),
    new HtmlWebpackPlugin({
      filename: "control/design/index.html",
      inject: true,
      minify: { removeComments: true, collapseWhitespace: true },
      template: path.join(__dirname, "../src/control/design/index.html"),
      chunks: ["devServer", "control/design/design"]
    }),
    new HtmlWebpackPlugin({
      filename: "control/settings/index.html",
      inject: true,
      minify: { removeComments: true, collapseWhitespace: true },
      template: path.join(__dirname, "../src/control/settings/index.html"),
      chunks: ["devServer", "control/settings/settings"]
    }),
    new HtmlWebpackPlugin({
      filename: "control/tests/index.html",
      inject: true,
      minify: { removeComments: true, collapseWhitespace: true },
      template: path.join(__dirname, "../src/control/tests/index.html"),
      chunks: ["control/tests/tests"]
    }),
    new HtmlWebpackPlugin({
      filename: 'control/strings/index.html',
      inject: true,
      minify: { removeComments: true, collapseWhitespace: true },
      template: path.join(__dirname, '../src/control/strings/index.html'),
      chunks: ['devServer', 'control/strings/strings']
    }),
    new HtmlWebpackPlugin({
      filename: "widget/index.html",
      inject: true,
      minify: { removeComments: true, collapseWhitespace: true },
      template: path.join(__dirname, "../src/widget/index.html"),
      chunks: ["devServer", "widget/widget"]
    }),
    new CopyWebpackPlugin(
      [
        {
          from: path.join(__dirname, "../src/control"),
          to: path.join(__dirname, "../control")
        },
        {
          from: path.join(__dirname, "../src/widget"),
          to: path.join(__dirname, "../widget")
        },
        {
          from: path.join(__dirname, "../src/resources"),
          to: path.join(__dirname, "../resources")
        }
      ],
      {
        ignore: ["*.js", "*.html", "*.md"]
      }
    ),
    new CopyWebpackPlugin([
      {
        from: path.join(__dirname, "../../../styles"),
        to: path.join(__dirname, "../styles")
      },
      {
        from: path.join(__dirname, "../../../scripts"),
        to: path.join(__dirname, "../scripts")
      },
      {
        from: path.join(__dirname, "../src/dataAccess"),
        to: path.join(__dirname, "../dataAccess")
      },
      {
        from: path.join(__dirname, "../src/data"),
        to: path.join(__dirname, "../data")
      },
      {
        from: path.join(__dirname, "../../../fonticons"),
        to: path.join(__dirname, "../fonticons")
      }
    ]),
    new CopyWebpackPlugin([
      {
        from: path.join(__dirname, '../src/widget/js/shared/stringsConfig.js'),
        to: path.join(__dirname, '../widget/js/shared/stringsConfig.js'),
      },
      {
        from: path.join(__dirname, '../src/widget/js/shared/strings.js'),
        to: path.join(__dirname, '../widget/js/shared/strings.js'),
      },
      {
        from: path.join(__dirname, '../src/control/strings/js/stringsUI.js'),
        to: path.join(__dirname, '../control/strings/js/stringsUI.js'),
      },
    ])
  ],

  devServer: {
    port: 8080,
    host: "0.0.0.0",
    inline: true,
    contentBase: path.join(__dirname, "../dist"),
    publicPath: "/",
    quiet: false,
    noInfo: false,
    disableHostCheck: true
  }
};

module.exports = WebpackConfig;
