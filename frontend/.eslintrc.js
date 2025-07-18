module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    // Code quality
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': 'off', // Let TypeScript handle this
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // Style
    'prettier/prettier': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // TypeScript specific
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // Import/Export
    'import/prefer-default-export': 'off',
    
    // Performance
    'no-await-in-loop': 'warn',
    'require-await': 'error'
  },
  globals: {
    // Browser globals
    'window': 'readonly',
    'document': 'readonly',
    'navigator': 'readonly',
    'console': 'readonly',
    
    // Third-party libraries
    'PIXI': 'readonly',
    'gsap': 'readonly',
    
    // MoonYetis specific globals
    'WalletManager': 'readonly',
    'EcosystemRouter': 'readonly',
    'AuthModal': 'readonly',
    'SlotMachine': 'readonly'
  },
  overrides: [
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      files: ['vite.config.js', 'postcss.config.js'],
      env: {
        node: true
      }
    }
  ]
};