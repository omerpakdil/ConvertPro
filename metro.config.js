const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfills for Node.js modules
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: 'buffer',
};

config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
