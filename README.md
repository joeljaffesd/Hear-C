<div align="center">
  <img src="logo.ico" alt="Hear-C Logo" width="128" height="128">
  
  # Hear-C: A Browser-Based Development Environment for C++ Audio

  [![Try Live Demo](https://img.shields.io/badge/🚀_Try_Live_Demo-hear--c.online-blue?style=for-the-badge&logoColor=white)](https://hear-c.online)

</div>

---

Hear-C is a browser-based IDE (integrated development environment) for writing digital audio synthesis and effects programs in C++. For those learning to code, browser-based IDEs simplify the development process by removing the requirement to set up developer tools locally, a task that varies by operating system and can be daunting for a beginner. While browser-based IDEs exist for a number of audio-specific languages such as Faust and ChucK, there is no major web app providing this functionality for C++, the lingua-franca of digital audio.

## Features:

- **Real-time audio synthesis** using WebAssembly and WebAudio API
- **Client-side C++ compilation** powered by [wasm-clang](https://github.com/binji/wasm-clang) — no server-side build step required
- **LocalStorage persistence** - your code is saved in your browser and persists between sessions
- **Monaco Editor** - the same powerful code editor that powers VS Code, with full C++ support
- **IntelliSense-like features** - syntax highlighting, bracket matching, and intelligent suggestions
- **One-click rebuilding** - edit, compile, and hear your changes instantly

## Getting Started:

### 🌐 Try Online (Recommended)
**[Visit hear-c.online](https://hear-c.online)** - No setup required! Just open your browser and start coding.

### 🛠️ Run Locally

1. Clone this repo

2. Make sure you have `node` installed (no Emscripten required)

3. Start the server: `./run.sh` or `npm start`

    To run with Docker: `docker build -t hear-c . && docker run --publish 8080:8080 hear-c`

4. Navigate to http://localhost:3000 (or http://localhost:8080 for Docker)

> **Note:** C++ compilation happens entirely in the browser using wasm-clang. The first build may take a moment to download the compiler toolchain (~50 MB).