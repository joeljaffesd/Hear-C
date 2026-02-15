/**
 * Web Worker for C++ to WebAssembly Compilation
 * 
 * This worker handles the heavy lifting of C++ compilation using wasm-clang.
 * It runs in a separate thread to keep the main UI responsive during compilation.
 */

// Import configuration (passed from main thread)
let config = {};

// Import scripts needed for compilation (when available)
// importScripts('wasm-clang-loader.js');

let clangModule = null;
let isInitialized = false;
let compilationMode = 'local-server'; // 'local-server', 'wasm-clang', or 'serverless'

/**
 * Detect which compilation mode to use
 */
function detectCompilationMode() {
  // If mode is explicitly set, use it
  if (config.compilationMode && config.compilationMode !== 'auto') {
    return config.compilationMode;
  }
  
  // Auto-detect priority order:
  // 1. wasm-clang if available and enabled
  // 2. Serverless endpoint if configured
  // 3. Local server as fallback
  
  if (config.wasmClang && config.wasmClang.enabled) {
    return 'wasm-clang';
  }
  
  if (config.serverless && config.serverless.enabled) {
    return 'serverless';
  }
  
  // Fall back to local server
  return 'local-server';
}

/**
 * Initialize the compiler by loading wasm-clang binaries
 */
async function initializeCompiler() {
  if (isInitialized) {
    return { success: true, mode: compilationMode };
  }

  try {
    // Detect which compilation mode to use
    compilationMode = detectCompilationMode();
    
    postMessage({ 
      type: 'status', 
      message: `Initializing compiler (mode: ${compilationMode})...` 
    });
    
    if (compilationMode === 'wasm-clang') {
      // Load wasm-clang binaries from CDN
      postMessage({ type: 'status', message: 'Loading wasm-clang binaries...' });
      
      try {
        clangModule = await loadWasmClang();
        postMessage({ type: 'status', message: 'wasm-clang loaded successfully!' });
      } catch (error) {
        console.warn('[Worker] Failed to load wasm-clang, falling back to local server:', error);
        compilationMode = 'local-server';
      }
    } else if (compilationMode === 'serverless') {
      postMessage({ 
        type: 'status', 
        message: 'Using serverless compilation endpoint...' 
      });
    } else {
      postMessage({ 
        type: 'status', 
        message: 'Using local compilation server for development...' 
      });
    }
    
    isInitialized = true;
    postMessage({ type: 'status', message: 'Compiler ready!' });
    return { success: true, mode: compilationMode };
    
  } catch (error) {
    console.error('[Worker] Failed to initialize compiler:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load wasm-clang module from CDN
 */
async function loadWasmClang() {
  if (!config.wasmClang || !config.wasmClang.cdnUrl) {
    throw new Error('wasm-clang CDN URL not configured');
  }
  
  const clangUrl = config.wasmClang.cdnUrl + config.wasmClang.files.clang;
  
  // Download the clang WASM binary
  const response = await fetch(clangUrl);
  if (!response.ok) {
    throw new Error(`Failed to load clang.wasm: ${response.statusText}`);
  }
  
  const wasmBinary = await response.arrayBuffer();
  
  // Initialize the Emscripten module
  // Note: This would require the actual Emscripten runtime
  // For now, this is a placeholder
  throw new Error('wasm-clang initialization not yet implemented - binaries need to be built and hosted. See BUILD_WASM_CLANG.md for instructions.');
  
  // TODO: Actual implementation would:
  // 1. Instantiate the WASM module with proper Emscripten runtime
  // 2. Set up virtual filesystem with sysroot headers
  // 3. Configure clang with appropriate default flags
  // 4. Return initialized module
}

/**
 * Compile C++ code to WebAssembly
 */
async function compileCode(code, options) {
  try {
    postMessage({ type: 'status', message: 'Compiling...' });
    
    switch (compilationMode) {
      case 'wasm-clang':
        return await compileWithWasmClang(code, options);
      
      case 'serverless':
        return await compileWithServerless(code, options);
      
      case 'local-server':
      default:
        return await compileWithLocalServer(code, options);
    }
    
  } catch (error) {
    console.error('[Worker] Compilation error:', error);
    throw error;
  }
}

/**
 * Compile using local Node.js server (development mode)
 */
async function compileWithLocalServer(code, options) {
  const response = await fetch('/rebuild', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, options })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Compilation failed');
  }
  
  return await response.json();
}

/**
 * Compile using serverless endpoint (production mode)
 */
async function compileWithServerless(code, options) {
  const endpoint = config.serverless?.endpoint || '/compile';
  const timeout = config.serverless?.timeout || 30000;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, options }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Compilation failed');
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Compilation timeout');
    }
    throw error;
  }
}

/**
 * Compile using embedded wasm-clang (fully client-side mode)
 */
async function compileWithWasmClang(code, options) {
  if (!clangModule) {
    throw new Error('wasm-clang not initialized');
  }
  
  // TODO: Implement wasm-clang compilation
  // This would involve:
  // 1. Setting up virtual filesystem with source files and headers
  // 2. Running clang with appropriate flags:
  //    clang -target wasm32 -O2 -I/sysroot/include user.h main.cpp -o output.o
  // 3. Running lld to link the output:
  //    wasm-ld output.o -o output.wasm --export=main --export=startAudio --export=stopAudio
  // 4. Reading the resulting WASM file from virtual filesystem
  // 5. Returning { success: true, wasm: wasmBytes, js: jsGlue, html: htmlShell }
  
  throw new Error('wasm-clang compilation not yet implemented - see BUILD_WASM_CLANG.md');
}

/**
 * Handle messages from main thread
 */
self.onmessage = async function(e) {
  const { id, type, code, options, config: newConfig } = e.data;
  
  try {
    switch (type) {
      case 'init':
        // Update configuration if provided
        if (newConfig) {
          config = newConfig;
        }
        const initResult = await initializeCompiler();
        postMessage({ id, type: 'success', ...initResult });
        break;
        
      case 'compile':
        const compileResult = await compileCode(code, options);
        postMessage({ id, type: 'success', ...compileResult });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    postMessage({ 
      id, 
      type: 'error', 
      error: error.message,
      stack: error.stack
    });
  }
};

// Notify main thread that worker is ready
postMessage({ type: 'ready' });
