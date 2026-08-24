const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const LIVEKIT_PACKAGES = new Set([
  '@livekit/react-native',
  '@livekit/react-native-webrtc',
]);

/**
 * LiveKit packages expose a `react-native` field pointing at TypeScript sources
 * (e.g. src/index.tsx). Metro fails to resolve those paths, so use the built
 * CommonJS entry instead.
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (LIVEKIT_PACKAGES.has(moduleName)) {
        const packageDir = path.join(__dirname, 'node_modules', moduleName);
        const { main } = require(path.join(packageDir, 'package.json'));
        return {
          filePath: path.join(packageDir, main),
          type: 'sourceFile',
        };
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
