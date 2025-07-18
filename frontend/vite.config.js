import { defineConfig } from 'vite';
import { resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  publicDir: 'images',
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-pixi': ['pixi.js'],
          'vendor-gsap': ['gsap'],
          'wallet-system': [
            './js/wallets.ts',
            './js/wallet-hub-modal.js',
            './js/wallet-hub-backend.js'
          ],
          'game-engine': [
            './js/slot-machine.js',
            './js/graphics-engine.js',
            './js/animation-system.js'
          ]
        }
      }
    }
  },

  // Development server
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // CSS configuration
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true
  },

  // Asset optimization
  assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf'],

  // Plugins
  plugins: [
    // Legacy browser support
    legacy({
      targets: ['defaults', 'not IE 11']
    }),

    // PWA configuration
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst', 
            options: {
              cacheName: 'cdnjs-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'MoonYetis Ecosystem',
        short_name: 'MoonYetis',
        description: 'Revolutionary crypto gaming platform on Fractal Bitcoin',
        theme_color: '#FF6B35',
        background_color: '#0A0E1A',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/images/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/images/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],

  // Optimization
  optimizeDeps: {
    include: ['pixi.js', 'gsap'],
    exclude: []
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@css': resolve(__dirname, './css'),
      '@js': resolve(__dirname, './js'),
      '@images': resolve(__dirname, './images')
    }
  }
});