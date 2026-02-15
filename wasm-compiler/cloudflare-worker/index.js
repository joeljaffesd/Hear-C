/**
 * Cloudflare Worker for serverless C++ to WebAssembly compilation
 * 
 * This worker provides a stateless compilation service for the Hear-C project.
 * It receives C++ code, compiles it using Emscripten (in a Container), and returns the WASM output.
 * 
 * Deployment:
 * 1. Install Wrangler: npm install -g wrangler
 * 2. Login: wrangler login
 * 3. Publish: wrangler publish
 * 
 * Note: This uses Cloudflare Workers with Container bindings to run Emscripten.
 * Alternative: Use AWS Lambda with Docker container support.
 */

// Configuration
const EMSCRIPTEN_DOCKER_IMAGE = 'emscripten/emsdk:latest';
const COMPILE_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Handle incoming compilation requests
 */
async function handleCompileRequest(request) {
  // Parse the request body
  const { code, mainCode, options } = await request.json();
  
  if (!code) {
    return new Response(JSON.stringify({
      success: false,
      error: 'No code provided'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Compile the code
    const result = await compileCode(code, mainCode || '', options || {});
    
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Compilation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stderr: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Compile C++ code to WebAssembly using Emscripten
 * 
 * Note: This is a placeholder - actual implementation would use
 * Cloudflare Containers or AWS Lambda with Docker support.
 */
async function compileCode(userCode, mainCode, options) {
  // In a real implementation, this would:
  // 1. Spin up an Emscripten container
  // 2. Write source files to temporary directory
  // 3. Run emcc with appropriate flags
  // 4. Return the compiled WASM, JS, and HTML files
  
  // For now, return a placeholder response
  throw new Error('Container-based compilation not yet configured. See wasm-compiler/README.md for setup instructions. You can configure Cloudflare Container bindings, use AWS Lambda with Docker support, or build wasm-clang binaries following wasm-compiler/BUILD_WASM_CLANG.md');
  
  // Example of what the actual implementation would look like:
  /*
  const container = await startEmscriptenContainer();
  
  try {
    // Write source files
    await container.writeFile('/src/user.h', userCode);
    await container.writeFile('/src/main.cpp', mainCode || DEFAULT_MAIN_CPP);
    
    // Build compilation command
    const compileCmd = [
      'emcc', '/src/main.cpp',
      '-o', '/build/index.html',
      '-s', 'USE_SDL=2',
      '-s', 'ALLOW_MEMORY_GROWTH=1',
      '-s', 'EXPORTED_RUNTIME_METHODS=ccall,cwrap',
      '-s', 'EXPORTED_FUNCTIONS=_main,_startAudio,_stopAudio',
      '--shell-file', '/src/shell.html',
      `-O${options.optimization || 2}`
    ];
    
    // Run compilation
    const result = await container.exec(compileCmd, { timeout: COMPILE_TIMEOUT_MS });
    
    if (result.exitCode !== 0) {
      return {
        success: false,
        error: 'Compilation failed',
        stderr: result.stderr,
        stdout: result.stdout
      };
    }
    
    // Read output files
    const wasmFile = await container.readFile('/build/index.wasm');
    const jsFile = await container.readFile('/build/index.js');
    const htmlFile = await container.readFile('/build/index.html');
    
    return {
      success: true,
      wasm: base64Encode(wasmFile),
      js: jsFile.toString(),
      html: htmlFile.toString()
    };
  } finally {
    await container.stop();
  }
  */
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    // Handle compilation requests
    if (request.method === 'POST' && url.pathname === '/compile') {
      return await handleCompileRequest(request);
    }
    
    // Handle health check
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return 404 for unknown routes
    return new Response('Not Found', { status: 404 });
  }
};
