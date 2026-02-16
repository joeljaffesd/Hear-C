# Emception Integration for Hear-C

This directory contains the Emception (Emscripten compiled to WebAssembly) integration for Hear-C, enabling true client-side C++ to WebAssembly compilation.

## What is Emception?

Emception is Emscripten (the C++ to WebAssembly compiler) compiled to run entirely in WebAssembly. This means the entire compilation toolchain runs in your browser with no server required.

- **Source**: https://github.com/jprendes/emception (original), https://github.com/InfiniBrains/emception (maintained fork)
- **NPM Package**: `emception` (v1.0.15)
- **Size**: ~15-20MB (lazy-loaded, cached after first use)
- **Browser Support**: Modern browsers with WebAssembly support

## Architecture

```
Browser
  ├── index.html (Hear-C UI)
  ├── emception-compiler-api.js (Simple API)
  └── emception-worker.js (Web Worker)
        └── emception/ (Emscripten WASM binaries)
            ├── llvm/ (Clang compiler)
            ├── binaryen/ (WebAssembly optimizer)
            ├── cpython/ (Python interpreter for Emscripten)
            └── packages/ (Emscripten tools and libraries)
```

## Files

- **emception-compiler-api.js**: Simple Promise-based API for the main thread
- **emception-worker.js**: Web Worker that runs Emception
- **emception/**: Emception distribution (WASM binaries and tools)
  - `emception.js`: Main Emception module
  - `*.mjs`: Emception process modules
  - `llvm/`, `binaryen/`, `cpython/`: Compiler toolchain binaries
  - `packages/`: Emscripten packages and libraries

## Usage

### Basic Usage

```javascript
// Load the compiler API
<script src="wasm-compiler/emception-compiler-api.js"></script>

// Create compiler instance
const compiler = new EmceptionCompiler();

// Initialize (downloads and sets up Emscripten - only needed once)
await compiler.init();

// Compile code
const userCode = `
  float nextSample() {
    return 0.5f * std::sin(2.0f * M_PI * 440.0f * time);
  }
`;

const mainCode = `
  #include <SDL2/SDL.h>
  #include <emscripten.h>
  #include <iostream>
  #include <cmath>
  #include "user.h"
  
  int main() {
    // ... your main code ...
  }
`;

const result = await compiler.compile(userCode, mainCode);

if (result.success) {
  console.log('Compilation successful!');
  // result.wasm: Compiled WebAssembly binary
  // result.js: JavaScript glue code
  // result.html: HTML shell (optional)
} else {
  console.error('Compilation failed:', result.error);
  console.error(result.stderr);
}
```

### With Status Callbacks

```javascript
const compiler = new EmceptionCompiler();

// Listen for status updates
compiler.onStatus((message) => {
  console.log('Status:', message);
  // Update UI with compilation progress
});

await compiler.init();
const result = await compiler.compile(userCode, mainCode);
```

## How It Works

1. **Initialization**:
   - Emception worker is created
   - Downloads Emscripten toolchain packages (~15-20MB, lazy-loaded)
   - Sets up virtual filesystem with libraries and headers
   - Caches everything in browser for offline use

2. **Compilation**:
   - User code is written to virtual filesystem
   - Emscripten (`em++`) is run with appropriate flags
   - Compiled WASM, JS, and HTML are generated
   - Files are read back and returned to main thread

3. **Caching**:
   - All downloaded packages are cached in IndexedDB
   - Subsequent compilations are much faster
   - Works offline after first load

## Performance

- **First Load**: 5-15 seconds (downloading Emscripten packages)
- **Subsequent Loads**: Instant (cached)
- **Compilation**: 2-5 seconds (depending on code complexity)
- **Memory Usage**: ~100-150MB during compilation

## Browser Compatibility

- ✅ Chrome/Edge 89+
- ✅ Firefox 87+
- ✅ Safari 15+
- ✅ Opera 75+

Requirements:
- WebAssembly support
- Web Workers support
- IndexedDB (for caching)
- ES6+ JavaScript

## Advantages over Server-Side Compilation

1. **No Server Required**: Runs entirely in the browser
2. **Offline Capable**: Works without internet after first load
3. **Privacy**: Code never leaves the user's browser
4. **Scalability**: No server infrastructure to maintain
5. **Cost**: Free (no hosting costs)
6. **Speed**: No network latency (after initialization)

## Limitations

1. **Initial Load Time**: 5-15 seconds on first use
2. **Browser Memory**: Requires ~150MB of memory
3. **Mobile**: May be slower on mobile devices
4. **Old Browsers**: Requires modern browser with WASM support

## Troubleshooting

### "Emception module not loaded"
- Ensure `emception.js` is in the correct path
- Check browser console for loading errors
- Verify files are served with correct MIME types

### "Compilation timeout"
- Increase timeout in `emception-compiler-api.js`
- Check for infinite loops or very complex templates
- Monitor browser memory usage

### "Out of memory"
- Close other browser tabs
- Reduce compilation complexity
- Try a browser with more available memory

## Development

### Testing Locally

```bash
# Serve the project
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

### Debugging

Enable debug output in browser console:
```javascript
compiler.onStatus((msg) => console.log('[Compiler]', msg));
```

## License

Emception is licensed under the MIT License.
- Emception: https://github.com/InfiniBrains/emception
- LLVM/Clang: Apache License 2.0 with LLVM Exceptions
- Emscripten: MIT License

## Credits

- Original Emception: [Juan Pedro Bolívar Puente](https://github.com/jprendes)
- Maintained Fork: [InfiniBrains](https://github.com/InfiniBrains)
- Integration: Hear-C project
