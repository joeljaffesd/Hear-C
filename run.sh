#!/bin/bash

# Start the Hear-C server
# Compilation is handled entirely client-side using wasm-clang
echo "Starting Hear-C server..."
echo "Open your browser and navigate to http://localhost:3000/"
echo "Compilation happens in the browser - no server-side build step needed."
node server.js
