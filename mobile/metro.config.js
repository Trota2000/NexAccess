const { getDefaultConfig } = require("expo/metro-config");
const { withApiProxy } = require("./metro-proxy.cjs");

module.exports = withApiProxy(getDefaultConfig(__dirname));
