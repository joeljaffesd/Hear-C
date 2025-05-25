#!/bin/bash

# Set error handling
set -e

# 1. Check if build folder exists, create if it doesn't
if [ ! -d "build" ]; then
    echo "Creating build directory..."
    mkdir build
fi

# 2. Direct compilation with emcc
echo "Compiling project with emcc..."
emcc src/main.cpp -o build/index.html \
    -s USE_SDL=2 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s EXPORTED_RUNTIME_METHODS=ccall,cwrap \
    -s EXPORTED_FUNCTIONS=_main,_startAudio,_stopAudio \
    --shell-file index.html \
    -O2

# 3. Navigate to build directory
cd build

# 4. Show build directory contents
echo "Build directory contents:"
ls -la

# 5. Run a local server to serve the output
echo "Starting local server from build directory..."
echo "Open your browser and navigate to http://localhost:8000/"
python3 -m http.server || python -m SimpleHTTPServer

# Note: If server startup fails, you may need to install Python