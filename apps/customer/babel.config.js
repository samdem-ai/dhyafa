/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated/plugin MUST be the LAST plugin in the list.
      // It rewrites worklets for the UI thread; anything added later would run
      // before it and break gestures/animations. (Reanimated v4 + New Arch.)
      'react-native-reanimated/plugin',
    ],
  };
};
