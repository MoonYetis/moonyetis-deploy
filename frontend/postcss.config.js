export default {
  plugins: {
    // Import CSS files
    'postcss-import': {},
    
    // Nested CSS syntax support
    'postcss-nested': {},
    
    // Autoprefixer for browser compatibility
    'autoprefixer': {
      overrideBrowserslist: [
        '> 1%',
        'last 2 versions',
        'not dead',
        'not ie 11'
      ]
    },
    
    // CSS optimization for production
    ...(process.env.NODE_ENV === 'production' ? {
      'cssnano': {
        preset: ['default', {
          discardComments: {
            removeAll: true
          },
          normalizeWhitespace: true,
          colormin: true,
          convertValues: true,
          discardDuplicates: true,
          discardEmpty: true,
          mergeRules: true,
          minifyFontValues: true,
          minifySelectors: true,
          reduceIdents: true
        }]
      }
    } : {})
  }
};