// const WorkboxPlugin = require("workbox-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./src/workbox-sw.js",
  output: {
    filename: "sw.js",
    path: __dirname + "/dist",
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "demo",
          to: ".",
        },
      ],
    }),
    // new WorkboxPlugin.InjectManifest({
    //   swSrc: "./src/sw.js",
    //   swDest: "workbox.js",
    // }),
  ],
};
