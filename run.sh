#!/bin/bash

# Set error handling
set -e

# Function to build the project
build_project() {
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

  # 3. Copy static assets
  echo "Copying static assets to build directory..."
  cp styles.css build/
  cp logo.ico build/

  # 4. Show build directory contents
  echo "Build directory contents:"
  ls -la build
}

# Function to start the rebuild server
start_rebuild_server() {
  echo "Starting rebuild server..."
  echo "This will allow rebuilding the project from the browser."
  echo "Open your browser and navigate to http://localhost:3000/ to view your application."
  echo "The rebuild server will handle both rebuilding and serving the files."
  
  # Build the project first to ensure we have initial files
  build_project
  
  # Start the Node.js server
  node server.js
}

# Check command line arguments
if [ "$1" == "build" ]; then
  build_project
else
  # Default: build && serve
  start_rebuild_server
fi