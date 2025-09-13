var webpack = require("webpack"),
  path = require("path"),
  fileSystem = require("fs-extra"),
  env = require("./utils/env"),
  CopyWebpackPlugin = require("copy-webpack-plugin"),
  HtmlWebpackPlugin = require("html-webpack-plugin"),
  TerserPlugin = require("terser-webpack-plugin");
  var { CleanWebpackPlugin } = require("clean-webpack-plugin");
  


const ASSET_PATH = process.env.ASSET_PATH || "/";

var alias = {};

// load the secrets
var secretsPath = path.join(__dirname, "secrets." + env.NODE_ENV + ".js");

// Consolidate all used extensions in one place
var fileExtensions = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "css", // source code extensions
  "jpg",
  "jpeg",
  "png",
  "gif",
  "svg", // image assets
  "woff",
  "woff2",
  "ttf",
  "eot", // font assets
];

if (fileSystem.existsSync(secretsPath)) {
  alias["secrets"] = secretsPath;
}

var options = {
  mode: process.env.NODE_ENV || "development",
  entry: {
    sidepanel: path.join(__dirname, "src", "pages", "Sidepanel", "index.tsx"),
    background: path.join(__dirname, "src", "pages", "Background", "index.ts"),
    contentScript: path.join(__dirname, "src", "pages", "Content", "index.ts"),
  },
  chromeExtensionBoilerplate: {
    notHotReload: ["background", "contentScript"],
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "build"),
    clean: true,
    publicPath: ASSET_PATH,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: new RegExp(
          ".(" +
            fileExtensions
              .filter((ext) => !["ts", "tsx", "js", "jsx", "css"].includes(ext))
              .join("|") +
            ")$"
        ),
        type: "asset/resource",
        exclude: /node_modules/,
      },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use:
          env.NODE_ENV === "development"
            ? ["source-map-loader", "babel-loader"]
            : ["babel-loader"], // Remove source-map-loader in production
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    alias: alias,
    extensions: fileExtensions.map((extension) => "." + extension),
  },
  plugins: [
    new CleanWebpackPlugin({ verbose: false }),
    new webpack.ProgressPlugin(),
    new webpack.EnvironmentPlugin(["NODE_ENV"]),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "src/manifest.json",
          to: path.join(__dirname, "build"),
          force: true,
          transform: function (content, path) {
            return Buffer.from(
              JSON.stringify({
                description: process.env.npm_package_description,
                version: process.env.npm_package_version,
                ...JSON.parse(content.toString()),
              })
            );
          },
        },
        {
          from: "src/pages/Content/content.styles.css",
          to: path.join(__dirname, "build"),
          force: true,
        },
        {
          from: "src/assets/img/icon-128.png",
          to: path.join(__dirname, "build"),
          force: true,
        },
        {
          from: "src/assets/img/icon-34.png",
          to: path.join(__dirname, "build"),
          force: true,
        },
        {
          from: "src/assets/fonts/",
          to: path.join(__dirname, "build", "assets", "fonts"),
          force: true,
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "pages", "Sidepanel", "sidepanel.html"),
      filename: "sidepanel.html",
      chunks: ["sidepanel"],
      cache: false,
    }),
  ],
  infrastructureLogging: {
    level: "info",
  },
  experiments: {
    asyncWebAssembly: true,
  },
};

if (env.NODE_ENV === "development") {
  options.devtool = "cheap-module-source-map";
} else {
  options.optimization = {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          compress: {
            drop_debugger: true,
            // Remove console statements except console.error and preserve branded ones
            pure_funcs: [
              'console.log',
              'console.info', 
              'console.debug',
              'console.warn'
              // Note: console.error is intentionally NOT included so errors remain visible
            ],
          },
        },
      }),
    ],
  };
}

module.exports = options;
