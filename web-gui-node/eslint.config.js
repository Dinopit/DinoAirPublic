import js from '@eslint/js';
import globals from 'globals';

export default [
  // Base configuration for all files
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.commonjs,
        ...globals.es2021,
        ...globals.jest
      }
    },
    rules: {
      ...js.configs.recommended.rules,

      // Security and best practices
      'no-console': 'off', // Allow console for server logging
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-proto': 'error',
      'no-iterator': 'error',
      'no-with': 'error',

      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-shadow': 'warn',

      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'dot-notation': 'error',
      'no-else-return': 'error',
      'no-empty-function': 'warn',
      'no-eq-null': 'error',
      'no-floating-decimal': 'error',
      'no-implicit-coercion': 'error',
      'no-implicit-globals': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'error',
      'no-magic-numbers': [
        'warn',
        {
          ignore: [-1, 0, 1, 2, 3, 4, 5, 10, 100, 1000],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true
        }
      ],
      'no-multi-spaces': 'error',
      'no-new': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-param-reassign': 'warn',
      'no-return-assign': 'error',
      'no-return-await': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'prefer-promise-reject-errors': 'error',
      radix: 'error',
      'require-await': 'error',
      yoda: 'error',

      // Style rules
      'array-bracket-spacing': ['error', 'never'],
      'block-spacing': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      camelcase: ['error', { properties: 'never' }],
      'comma-dangle': ['error', 'never'],
      'comma-spacing': ['error', { before: false, after: true }],
      'comma-style': ['error', 'last'],
      'computed-property-spacing': ['error', 'never'],
      'consistent-this': ['error', 'self'],
      'eol-last': ['error', 'always'],
      'func-call-spacing': ['error', 'never'],
      indent: [
        'error',
        2,
        {
          SwitchCase: 1,
          VariableDeclarator: 1,
          outerIIFEBody: 1,
          MemberExpression: 1,
          FunctionDeclaration: { parameters: 1, body: 1 },
          FunctionExpression: { parameters: 1, body: 1 },
          CallExpression: { arguments: 1 },
          ArrayExpression: 1,
          ObjectExpression: 1,
          ImportDeclaration: 1,
          flatTernaryExpressions: false,
          ignoreComments: false
        }
      ],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'linebreak-style': ['error', 'unix'],
      'max-len': [
        'warn',
        {
          code: 120,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true
        }
      ],
      'new-cap': ['error', { newIsCap: true, capIsNew: false }],
      'new-parens': 'error',
      'no-array-constructor': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'no-new-object': 'error',
      'no-tabs': 'error',
      'no-trailing-spaces': 'error',
      'no-underscore-dangle': 'off', // Allow for private methods
      'no-unneeded-ternary': 'error',
      'no-whitespace-before-property': 'error',
      'object-curly-spacing': ['error', 'always'],
      'one-var': ['error', 'never'],
      'operator-assignment': ['error', 'always'],
      'operator-linebreak': ['error', 'before'],
      'padded-blocks': ['error', 'never'],
      'quote-props': ['error', 'as-needed'],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'semi-spacing': ['error', { before: false, after: true }],
      'space-before-blocks': 'error',
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always'
        }
      ],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': ['error', { words: true, nonwords: false }],
      'spaced-comment': ['error', 'always'],

      // ES6+ rules
      'arrow-parens': ['error', 'as-needed'],
      'arrow-spacing': ['error', { before: true, after: true }],
      'constructor-super': 'error',
      'generator-star-spacing': ['error', { before: false, after: true }],
      'no-class-assign': 'error',
      'no-confusing-arrow': ['error', { allowParens: true }],
      'no-const-assign': 'error',
      'no-dupe-class-members': 'error',
      'no-duplicate-imports': 'error',
      'no-new-symbol': 'error',
      'no-this-before-super': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-destructuring': [
        'error',
        {
          array: true,
          object: true
        },
        {
          enforceForRenamedProperties: false
        }
      ],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'rest-spread-spacing': ['error', 'never'],
      'symbol-description': 'error',
      'template-curly-spacing': 'error',
      'yield-star-spacing': ['error', 'after']
    }
  },

  // Test files configuration
  {
    files: ['**/*.test.js', '**/*.spec.js', '**/test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    },
    rules: {
      'no-magic-numbers': 'off',
      'max-len': 'off'
    }
  },

  // Scripts configuration
  {
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off',
      'no-process-exit': 'off'
    }
  },

  // Server files configuration
  {
    files: ['server.js', 'routes/**/*.js', 'middleware/**/*.js'],
    rules: {
      'no-console': 'off' // Allow console logging in server files
    }
  }
];
