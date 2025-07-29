module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@services': './src/services',
          '@utils': './src/utils',
          '@store': './src/store',
          '@types': './src/types',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};