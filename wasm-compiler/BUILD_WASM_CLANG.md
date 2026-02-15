# Building wasm-clang for Hear-C

This guide explains how to build wasm-clang (LLVM/Clang compiled to WebAssembly) for use in Hear-C's client-side compilation system.

## Why Build wasm-clang?

wasm-clang enables true client-side C++ to WebAssembly compilation in the browser without any server dependencies. Once built and deployed, the Hear-C app can run completely offline.

## Prerequisites

- **Linux or macOS** (Windows requires WSL)
- **Emscripten SDK** (version 3.1.45 or later)
- **CMake** (version 3.20 or later)
- **Python 3** (version 3.7 or later)
- **Git**
- **~20GB free disk space**
- **8GB+ RAM** (16GB recommended)
- **2-4 hours build time** (depending on hardware)

## Step 1: Install Emscripten SDK

```bash
# Clone emsdk
cd ~
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Install and activate latest version
./emsdk install latest
./emsdk activate latest

# Set up environment variables
source ./emsdk_env.sh

# Verify installation
emcc --version
```

## Step 2: Clone LLVM Project

```bash
# Create build directory
mkdir -p ~/wasm-clang-build
cd ~/wasm-clang-build

# Clone LLVM (this is large, ~2GB)
git clone --depth 1 --branch release/17.x https://github.com/llvm/llvm-project.git
cd llvm-project
```

## Step 3: Configure Build

```bash
# Create build directory
mkdir build-wasm
cd build-wasm

# Configure CMake for WebAssembly target
emcmake cmake -G "Unix Makefiles" \
  -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_TARGETS_TO_BUILD="WebAssembly" \
  -DLLVM_ENABLE_PROJECTS="clang;lld" \
  -DLLVM_INCLUDE_EXAMPLES=OFF \
  -DLLVM_INCLUDE_TESTS=OFF \
  -DLLVM_INCLUDE_BENCHMARKS=OFF \
  -DLLVM_ENABLE_BACKTRACES=OFF \
  -DLLVM_ENABLE_WARNINGS=OFF \
  -DLLVM_ENABLE_TERMINFO=OFF \
  -DLLVM_ENABLE_LIBEDIT=OFF \
  -DLLVM_ENABLE_Z3_SOLVER=OFF \
  -DCLANG_ENABLE_ARCMT=OFF \
  -DCLANG_ENABLE_STATIC_ANALYZER=OFF \
  -DCLANG_BUILD_TOOLS=ON \
  ../llvm
```

## Step 4: Build clang

```bash
# Build (this takes 2-4 hours)
emmake make -j$(nproc) clang

# The output will be in:
# - bin/clang (main compiler - will be renamed to clang.wasm)
```

## Step 5: Build lld (linker)

```bash
# Build the linker
emmake make -j$(nproc) lld

# The output will be in:
# - bin/lld (linker - will be renamed to lld.wasm)
```

## Step 6: Collect System Headers

```bash
# Create output directory
mkdir -p ~/wasm-clang-dist/sysroot

# Copy C/C++ standard library headers
cp -r $(dirname $(which emcc))/../system/include/* ~/wasm-clang-dist/sysroot/

# Copy compiler runtime
cp $(dirname $(which emcc))/../lib/clang/*/lib/wasm32-unknown-emscripten/libclang_rt.builtins-wasm32.a \
   ~/wasm-clang-dist/
```

## Step 7: Package for Distribution

```bash
# Copy binaries
cp bin/clang ~/wasm-clang-dist/clang.wasm
cp bin/lld ~/wasm-clang-dist/lld.wasm

# Create manifest
cat > ~/wasm-clang-dist/manifest.json << EOF
{
  "version": "17.0.0",
  "files": {
    "clang": {
      "path": "clang.wasm",
      "size": $(stat -f%z ~/wasm-clang-dist/clang.wasm 2>/dev/null || stat -c%s ~/wasm-clang-dist/clang.wasm),
      "description": "Clang C++ compiler"
    },
    "lld": {
      "path": "lld.wasm",
      "size": $(stat -f%z ~/wasm-clang-dist/lld.wasm 2>/dev/null || stat -c%s ~/wasm-clang-dist/lld.wasm),
      "description": "LLD linker"
    }
  },
  "sysroot": "sysroot/"
}
EOF

# Check sizes
echo "Build complete! Package contents:"
ls -lh ~/wasm-clang-dist/
```

## Step 8: Deploy to CDN

Once built, upload the files to a CDN for use in Hear-C:

```bash
# Example: Upload to AWS S3
aws s3 sync ~/wasm-clang-dist/ s3://your-bucket/wasm-clang/ --acl public-read

# Or use any CDN service (Cloudflare R2, Google Cloud Storage, etc.)
```

## Step 9: Configure Hear-C

Update `wasm-compiler/compiler-worker.js` with your CDN URLs:

```javascript
const WASM_CLANG_CDN = 'https://your-cdn.com/wasm-clang/';

const CLANG_WASM_URL = WASM_CLANG_CDN + 'clang.wasm';
const LLD_WASM_URL = WASM_CLANG_CDN + 'lld.wasm';
const SYSROOT_URL = WASM_CLANG_CDN + 'sysroot/';
```

## Alternative: Pre-built Binaries

Unfortunately, no maintained pre-built wasm-clang binaries are publicly available as of 2024. The WebAssembly Studio project (which provided them) has been archived.

If you find or create pre-built binaries, please consider sharing them with the community!

## Troubleshooting

### "emcc: command not found"
Make sure you've run `source ~/emsdk/emsdk_env.sh` in your current shell.

### "Out of memory" during build
- Reduce parallel jobs: use `make -j2` instead of `make -j$(nproc)`
- Increase system swap space
- Use a machine with more RAM

### Build fails with errors
- Ensure Emscripten is up to date: `cd ~/emsdk && ./emsdk update && ./emsdk install latest`
- Try a different LLVM version: use `release/16.x` instead of `release/17.x`
- Check the Emscripten forums for known issues

## Estimated Sizes

- clang.wasm: ~45MB
- lld.wasm: ~5MB  
- sysroot: ~2MB
- **Total: ~52MB**

Note: These binaries will be lazily loaded only when compilation is first triggered, so they don't impact initial page load time.

## Maintenance

The wasm-clang binaries should be rebuilt when:
- LLVM/Clang releases a new version
- Emscripten adds new features you want to use
- Security vulnerabilities are discovered in the toolchain

## License

LLVM/Clang is licensed under the Apache License 2.0 with LLVM Exceptions.
See https://llvm.org/docs/DeveloperPolicy.html#license for details.
