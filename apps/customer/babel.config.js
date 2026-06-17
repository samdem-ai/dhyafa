/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-worklets/plugin MUST be the LAST plugin in the list.
      // It rewrites worklets for the UI thread; anything added later would run
      // before it and break gestures/animations. In Reanimated v4 the worklets
      // Babel plugin moved to the react-native-worklets package (it was
      // react-native-reanimated/plugin in v3).
      'react-native-worklets/plugin',
    ],
  };
};
