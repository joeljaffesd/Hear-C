/**
 * Emception-based C++ to WebAssembly Compiler Worker
 * 
 * This worker uses Emception (Emscripten compiled to WASM) to compile C++ code
 * entirely in the browser without any server dependencies.
 * 
 * Note: This is an ES6 module worker to support Emception's ES6 module structure.
 */

console.log('[Emception Worker] Starting worker initialization...');

// Import Emception as ES6 module
let Emception;
try {
  console.log('[Emception Worker] Attempting to import Emception module...');
  Emception = await import('./emception/emception.js');
  if (Emception.default) {
    Emception = Emception.default;
  }
  console.log('[Emception Worker] ✅ Emception module imported successfully');
} catch (error) {
  console.error('[Emception Worker] ❌ Failed to import Emception:', error);
  console.error('[Emception Worker] Error details:', error.message);
  console.error('[Emception Worker] Stack trace:', error.stack);
  // Notify main thread of the error
  postMessage({ 
    type: 'error', 
    error: 'Failed to load Emception module: ' + error.message,
    stack: error.stack
  });
  throw error;
}

let emceptionInstance = null;
let isInitialized = false;

/**
 * Initialize Emception compiler
 */
async function initializeEmception() {
  if (isInitialized && emceptionInstance) {
    return { success: true };
  }

  try {
    postMessage({ type: 'status', message: 'Loading Emception compiler (this may take a moment)...' });
    
    // Create new Emception instance
    emceptionInstance = new Emception();
    
    // Set up callbacks for output
    emceptionInstance.onstdout = (...args) => {
      const msg = args.join(' ');
      if (msg.trim()) {
        postMessage({ type: 'stdout', message: msg });
      }
    };
    
    emceptionInstance.onstderr = (...args) => {
      const msg = args.join(' ');
      if (msg.trim()) {
        postMessage({ type: 'stderr', message: msg });
      }
    };
    
    emceptionInstance.onprocessstart = (argv) => {
      postMessage({ type: 'status', message: `Running: ${argv.join(' ')}` });
    };
    
    // Initialize the compiler (downloads and sets up Emscripten)
    postMessage({ type: 'status', message: 'Initializing Emscripten toolchain...' });
    await emceptionInstance.init();
    
    isInitialized = true;
    postMessage({ type: 'status', message: 'Emception compiler ready!' });
    
    return { success: true };
  } catch (error) {
    console.error('[Emception Worker] Initialization failed:', error);
    postMessage({ type: 'error', error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
}

/**
 * Compile C++ code using Emception
 */
async function compileWithEmception(userCode, mainCode) {
  try {
    if (!emceptionInstance) {
      throw new Error('Emception not initialized');
    }
    
    const fs = emceptionInstance.fileSystem;
    
    // Write user code
    postMessage({ type: 'status', message: 'Writing source files...' });
    await fs.writeFile('/working/user.h', userCode);
    
    // Write main.cpp if provided
    if (mainCode) {
      await fs.writeFile('/working/main.cpp', mainCode);
    } else {
      // Use default main.cpp from src directory (will need to be provided)
      throw new Error('main.cpp content is required');
    }
    
    // Compile with emscripten
    postMessage({ type: 'status', message: 'Compiling C++ to WebAssembly...' });
    
    // Run em++ command
    const cmd = `em++ /working/main.cpp -o /working/index.html -s USE_SDL=2 -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS=ccall,cwrap -s EXPORTED_FUNCTIONS=_main,_startAudio,_stopAudio -O2`;
    
    const result = await emceptionInstance.run(cmd.split(' '));
    
    if (result.returncode !== 0) {
      return {
        success: false,
        error: 'Compilation failed',
        stderr: result.stderr || 'Unknown compilation error',
        stdout: result.stdout || ''
      };
    }
    
    // Read compiled files
    postMessage({ type: 'status', message: 'Reading compiled output...' });
    
    const wasmContent = await fs.readFile('/working/index.wasm');
    const jsContent = await fs.readFile('/working/index.js', { encoding: 'utf8' });
    const htmlContent = await fs.readFile('/working/index.html', { encoding: 'utf8' });
    
    return {
      success: true,
      wasm: wasmContent,
      js: jsContent,
      html: htmlContent,
      stdout: result.stdout || '',
      stderr: result.stderr || ''
    };
    
  } catch (error) {
    console.error('[Emception Worker] Compilation error:', error);
    return {
      success: false,
      error: error.message,
      stderr: error.message,
      stack: error.stack
    };
  }
}

/**
 * Handle messages from main thread
 */
self.onmessage = async function(e) {
  const { id, type, userCode, mainCode } = e.data;
  
  try {
    switch (type) {
      case 'init':
        const initResult = await initializeEmception();
        postMessage({ id, type: 'success', ...initResult });
        break;
        
      case 'compile':
        if (!isInitialized) {
          await initializeEmception();
        }
        const compileResult = await compileWithEmception(userCode, mainCode);
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
