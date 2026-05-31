/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // No extra plugins needed for M0. When react-native-reanimated is added
    // (M1+ for gestures/animations), add 'react-native-reanimated/plugin' here
    // as the LAST entry per Reanimated docs.
    plugins: [],
  };
};
