module.exports = {
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',

  jsxSingleQuote: true,

  trailingComma: 'none',

  bracketSpacing: true,
  bracketSameLine: false,

  arrowParens: 'avoid',

  rangeStart: 0,
  rangeEnd: Infinity,

  requirePragma: false,
  insertPragma: false,
  proseWrap: 'preserve',

  htmlWhitespaceSensitivity: 'css',

  vueIndentScriptAndStyle: false,

  endOfLine: 'lf',

  embeddedLanguageFormatting: 'auto',

  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    }
  ]
};
