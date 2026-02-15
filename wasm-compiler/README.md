# Client-Side WebAssembly Compiler

This directory contains the infrastructure for compiling C++ to WebAssembly entirely in the browser.

## Architecture

```
┌─────────────────┐
│   Browser App   │
│   (index.html)  │
└────────┬────────┘
         │ uses
         ▼
┌─────────────────┐
│  Compiler API   │
│ (compiler-api.js)│
└────────┬────────┘
         │ manages
         ▼
┌─────────────────┐
│ Compiler Worker │
│(compiler-worker.js)│
└────────┬────────┘
         │ loads
         ▼
┌─────────────────┐
│  wasm-clang     │
│   Binaries      │
└─────────────────┘
```

## Components

### 1. Compiler API (`compiler-api.js`)
Main thread API that applications use to compile code. Handles:
- Worker lifecycle management
- Message passing to/from worker
- Promise-based compilation interface

### 2. Compiler Worker (`compiler-worker.js`)
Web Worker that performs compilation off the main thread. Handles:
- Loading wasm-clang binaries (lazy loading)
- Setting up virtual filesystem
- Running compilation
- Fallback to local server for development

### 3. Cloud Function (`cloudflare-worker/`)
Optional serverless compilation endpoint for deployment without bundling large binaries.

## Usage

### Basic Usage

```javascript
// Create compiler instance
const compiler = new CompilerAPI();

// Initialize (loads worker, downloads binaries if needed)
await compiler.init();

// Compile code
const result = await compiler.compile(userCode, {
  optimization: 2,
  sdl: true
});

if (result.success) {
  // Use compiled WASM
  console.log('Compilation successful!');
} else {
  // Handle errors
  console.error('Compilation failed:', result.error);
}
```

### Integration with Hear-C

The Hear-C app uses the compiler API in `index.html`:

```javascript
// Initialize compiler on page load
const compiler = new CompilerAPI();
await compiler.init();

// When user clicks "Build & Run"
const userCode = editor.getValue();
const result = await compiler.compile(userCode);

if (result.success) {
  // Reload page with new WASM
  window.location.reload();
}
```

## Deployment Options

### Option 1: Fully Client-Side (with wasm-clang)

**Pros:**
- Truly offline capable
- No external dependencies
- Fast compilation after initial load

**Cons:**
- Large initial download (~50MB)
- Complex setup

**Setup:**
1. Build wasm-clang binaries (see below)
2. Host binaries on CDN
3. Update `compiler-worker.js` to load from CDN

### Option 2: Serverless Compilation

**Pros:**
- Small app size
- No large downloads
- Easy to deploy

**Cons:**
- Requires internet connection
- Small latency for compilation

**Setup:**
1. Deploy Cloudflare Worker (see `cloudflare-worker/`)
2. Update `compiler-worker.js` to use serverless endpoint

### Option 3: Hybrid (Recommended)

**Pros:**
- Best of both worlds
- Progressive enhancement

**Setup:**
1. Try to load wasm-clang from CDN (with timeout)
2. Fall back to serverless if unavailable
3. Cache compiled modules in IndexedDB

## Building wasm-clang

To build wasm-clang binaries for client-side compilation:

```bash
# Clone the repository
git clone https://github.com/binji/wasm-clang.git
cd wasm-clang

# Build (requires Emscripten SDK)
make

# Output files:
# - out/clang.wasm (~45MB)
# - out/lld.wasm (~5MB)
# - out/sysroot/ (system headers)
```

Once built, host these files on a CDN and update the URLs in `compiler-worker.js`.

## Performance

- **Initial Load**: 2-5 seconds (downloading binaries)
- **Compilation**: 1-3 seconds for typical code
- **Memory**: ~100MB during compilation

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 14+)
- Opera: ✅ Full support

Requires:
- WebAssembly support
- Web Workers support
- ES6+ JavaScript

## Development

### Local Development

For local development, the compiler falls back to using the Node.js server:

```bash
# Start the development server
./run.sh

# The app will use local compilation via server.js
```

### Testing

```bash
# Test the compiler API
node test-compiler.js

# Run in browser console
const compiler = new CompilerAPI();
await compiler.init();
const result = await compiler.compile('float nextSample() { return 0.0f; }');
console.log(result);
```

## Troubleshooting

### "Failed to load compiler binaries"
- Check that CDN URLs are correct in `compiler-worker.js`
- Verify CORS headers allow loading from your domain
- Check browser console for specific error messages

### "Compilation timeout"
- Increase timeout in `compiler-api.js` (default: 60s)
- Check if code has infinite loops or complex templates

### "Out of memory"
- Reduce optimization level
- Split large files into smaller modules
- Increase Web Worker memory limit (if browser supports)

## Future Enhancements

- [ ] Cache compiled modules in IndexedDB
- [ ] Incremental compilation (only recompile changed code)
- [ ] Support for multiple source files
- [ ] Real-time error checking (linting)
- [ ] Assembly output viewer
- [ ] Compilation statistics and profiling

## License

Same as Hear-C project (MIT)
