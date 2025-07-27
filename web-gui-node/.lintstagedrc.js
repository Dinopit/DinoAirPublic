export default {
  '*.{js,jsx}': [
    'eslint --fix',
    'prettier --write'
  ],
  '*.{json,md,yml,yaml}': [
    'prettier --write'
  ],
  '*.{css,scss,less}': [
    'prettier --write'
  ],
  'package.json': [
    'prettier --write'
  ]
};
