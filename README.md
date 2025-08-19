<div align="center">
  <img src="logo.ico" alt="Hear-C Logo" width="128" height="128">
  
  # Hear-C: A Browser-Based Development Environment for C++ Audio

  [![Try Live Demo](https://img.shields.io/badge/🚀_Try_Live_Demo-hear--c.dev-blue?style=for-the-badge&logoColor=white)](https://hear-c.dev)

</div>

---

Hear-C is a browser-based IDE (integrated development environment) for writing digital audio synthesis and effects programs in C++. For those learning to code, browser-based IDEs simplify the development process by removing the requirement to set up developer tools locally, a task that varies by operating system and can be daunting for a beginner. While browser-based IDEs exist for a number of audio-specific languages such as Faust and ChucK, there is no major web app providing this functionality for C++, the lingua-franca of digital audio.

## Features:

- **Real-time audio synthesis** using WebAssembly and WebAudio API
- **LocalStorage persistence** - your code is saved in your browser and persists between sessions
- **Monaco Editor** - the same powerful code editor that powers VS Code, with full C++ support
- **IntelliSense-like features** - syntax highlighting, bracket matching, and intelligent suggestions
- **One-click rebuilding** - edit, compile, and hear your changes instantly

## Getting Started:

### 🌐 Try Online (Recommended)
**[Visit hear-c.dev](https://hear-c.dev)** - No setup required! Just open your browser and start coding.

### 🛠️ Run Locally

1. Clone this repo

2. If you want to build without Docker, make sure you have `emcc` and `node` installed and in path

3. To build natively, do `./run.sh` in a Bash shell or use `SHIFT`+`CMD`+`B` in VSCode. 

    To build with Docker, do `docker build -t hear-c . && docker run --publish 8080:8080 hear-c`

4. If built natively, navigate to http://localhost:3000.

    If built with Docker, navigate to http://localhost:8080.