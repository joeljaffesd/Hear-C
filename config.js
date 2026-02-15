/**
 * Configuration for Hear-C Compilation System
 * 
 * Update these settings to configure how C++ code is compiled to WebAssembly.
 */

window.HEAR_C_CONFIG = {
  /**
   * Compilation mode:
   * - 'auto': Automatically detect best available method
   * - 'wasm-clang': Use embedded wasm-clang (requires binaries)
   * - 'serverless': Use serverless compilation endpoint
   * - 'local-server': Use local Node.js server (development only)
   */
  compilationMode: 'auto',
  
  /**
   * wasm-clang configuration
   * Only used if compilationMode is 'wasm-clang' or 'auto'
   */
  wasmClang: {
    enabled: false, // Set to true after building and hosting binaries
    cdnUrl: 'https://your-cdn.com/wasm-clang/', // Update with your CDN URL
    
    // File paths relative to cdnUrl
    files: {
      clang: 'clang.wasm',
      lld: 'lld.wasm',
      sysroot: 'sysroot/',
    },
    
    // Lazy loading - don't download binaries until first compilation
    lazyLoad: true,
    
    // Cache binaries in IndexedDB for offline use
    cacheInIndexedDB: true,
  },
  
  /**
   * Serverless compilation endpoint
   * Only used if compilationMode is 'serverless' or 'auto' (and wasm-clang unavailable)
   */
  serverless: {
    enabled: false, // Set to true after deploying serverless function
    endpoint: 'https://your-worker.workers.dev/compile', // Cloudflare Worker URL
    // OR
    // endpoint: 'https://your-function.lambda-url.region.on.aws/', // AWS Lambda URL
    
    // Timeout for compilation (ms)
    timeout: 30000,
  },
  
  /**
   * Local server configuration (development only)
   * Used as fallback when other methods are unavailable
   */
  localServer: {
    endpoint: '/rebuild',
    // Set to true to always prefer local server in development
    preferInDevelopment: true,
  },
  
  /**
   * Compilation options
   */
  compilation: {
    // Optimization level (0-3)
    optimizationLevel: 2,
    
    // Enable SDL2
    enableSDL: true,
    
    // Exported functions
    exportedFunctions: ['_main', '_startAudio', '_stopAudio'],
    
    // Additional emcc flags
    additionalFlags: [
      '-s', 'ALLOW_MEMORY_GROWTH=1',
      '-s', 'EXPORTED_RUNTIME_METHODS=ccall,cwrap',
    ],
  },
  
  /**
   * UI configuration
   */
  ui: {
    // Show compilation status messages
    showCompilationStatus: true,
    
    // Show detailed error messages
    showDetailedErrors: true,
    
    // Auto-save before compilation
    autoSaveBeforeCompile: true,
  },
  
  /**
   * Development settings
   */
  development: {
    // Enable debug logging
    debug: false,
    
    // Log compilation times
    logCompilationTimes: true,
    
    // Show which compilation mode is being used
    showCompilationMode: true,
  },
};

// Detect environment
if (typeof window !== 'undefined') {
  window.HEAR_C_CONFIG.isDevelopment = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
}
