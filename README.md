<div align="center">
  <img src="logo.ico" alt="Hear-C Logo" width="128" height="128">
  
  # Hear-C: A Browser-Based Development Environment for C++ Audio

  [![Try Live Demo](https://img.shields.io/badge/🚀_Try_Live_Demo-hear--c.online-blue?style=for-the-badge&logoColor=white)](https://hear-c.online)

</div>

---

Hear-C is a browser-based IDE (integrated development environment) for writing digital audio synthesis and effects programs in C++. For those learning to code, browser-based IDEs simplify the development process by removing the requirement to set up developer tools locally, a task that varies by operating system and can be daunting for a beginner. While browser-based IDEs exist for a number of audio-specific languages such as Faust and ChucK, there is no major web app providing this functionality for C++, the lingua-franca of digital audio.

## Features:

- **Real-time audio synthesis** using WebAssembly and WebAudio API
- **LocalStorage persistence** - your code is saved in your browser and persists between sessions
- **Monaco Editor** - the same powerful code editor that powers VS Code, with full C++ support
- **IntelliSense-like features** - syntax highlighting, bracket matching, and intelligent suggestions
- **One-click rebuilding** - edit, compile, and hear your changes instantly
- **Client-side compilation infrastructure** - supports embedded wasm-clang, serverless, or local compilation
- **Web Worker architecture** - non-blocking compilation keeps the UI responsive

## Getting Started:

### 🌐 Try Online (Recommended)
**[Visit hear-c.online](https://hear-c.online)** - No setup required! Just open your browser and start coding.

### 🛠️ Run Locally

#### Option 1: With Node.js Server (Traditional)
1. Clone this repo
2. Make sure you have `emcc` and `node` installed and in path
3. Run `./run.sh` in a Bash shell
4. Navigate to http://localhost:3000

#### Option 2: With Docker
1. Clone this repo
2. Run `docker build -t hear-c . && docker run --publish 8080:8080 hear-c`
3. Navigate to http://localhost:8080

#### Option 3: Static Site with Client-Side Compilation (New!)
The project now supports running as a static site with client-side compilation infrastructure:

1. Clone this repo
2. Open `index.html` in a modern browser
3. The app will use Web Workers for compilation
4. For C++ to WASM compilation, you have two options:
   - **Development**: Uses local Node.js server (requires setup as in Option 1)
   - **Production**: Configure serverless compilation endpoint (see `wasm-compiler/README.md`)

See the [Client-Side Compilation Guide](wasm-compiler/README.md) for more details on deploying without a server.

## Architecture:

Hear-C uses a modern web-based architecture designed for flexibility and performance:

```
┌─────────────────────────────────────────────┐
│          Browser (Client-Side)              │
│                                             │
│  ┌─────────────┐       ┌──────────────┐    │
│  │ Monaco      │       │  WebAudio    │    │
│  │ Editor      │       │  API         │    │
│  └─────────────┘       └──────────────┘    │
│         │                      ▲            │
│         ▼                      │            │
│  ┌─────────────┐              │            │
│  │ Compiler    │              │            │
│  │ API         │              │            │
│  └──────┬──────┘              │            │
│         │                      │            │
│         ▼                      │            │
│  ┌─────────────┐              │            │
│  │ Web Worker  │              │            │
│  │ (Compiler)  │              │            │
│  └──────┬──────┘              │            │
│         │                      │            │
└─────────┼──────────────────────┼────────────┘
          │                      │
          ▼                      │
   ┌─────────────┐               │
   │ Compilation │               │
   │ Service     │               │
   │ (Optional)  │               │
   └─────────────┘               │
          │                      │
          └──────────────────────┘
               WASM Module
```

### Components:

1. **Monaco Editor**: Full-featured code editor with C++ syntax highlighting and IntelliSense
2. **Compiler API**: Manages compilation requests via Web Workers for non-blocking UI
3. **Web Worker**: Handles C++ to WASM compilation off the main thread
4. **Compilation Service**: Flexible backend - can be:
   - Local Node.js server (development)
   - Embedded wasm-clang (fully client-side)
   - Serverless function (production deployment)
5. **WebAudio API**: Plays the synthesized audio from the compiled WASM module

### Compilation Options:

The project supports multiple compilation strategies:

- **Development Mode**: Uses local Emscripten via Node.js server
- **Client-Side Mode**: (Future) Uses wasm-clang compiled to WebAssembly
- **Serverless Mode**: Uses stateless cloud function (no server to maintain)

See `wasm-compiler/README.md` for detailed information about each option.
## Deployment

Hear-C can be deployed in multiple ways:

### Static Site Deployment (Recommended)
Deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.):
1. Build the initial WASM module: `./run.sh build`
2. Deploy the entire directory as static files
3. Configure compilation service (see below)

### Compilation Service Options

**Option A: Use existing Node.js server (traditional)**
- Deploy `server.js` to a Node.js hosting service
- Requires Emscripten SDK to be installed

**Option B: Set up serverless compilation (recommended)**
- Deploy Cloudflare Worker or AWS Lambda with Emscripten
- No persistent server needed, scales automatically
- See `wasm-compiler/cloudflare-worker/` for template

**Option C: Embed wasm-clang (fully client-side)**
- Build wasm-clang binaries (see `wasm-compiler/BUILD_WASM_CLANG.md`)
- Host on CDN for lazy loading
- Update `config.js` with CDN URLs
- Enables fully offline operation

## Contributing

Contributions are welcome! Areas where help is needed:

- 🔧 Building and testing wasm-clang binaries
- 📝 Improving documentation and examples
- 🐛 Bug fixes and testing
- 🎨 UI/UX improvements
- 🔊 Additional audio synthesis examples

See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical details about the codebase.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Built with [Emscripten](https://emscripten.org/) - the C/C++ to WebAssembly compiler
- Uses [Monaco Editor](https://microsoft.github.io/monaco-editor/) - the editor that powers VS Code
- Inspired by [Faust IDE](https://faustide.grame.fr/) and other browser-based audio programming environments
- wasm-clang infrastructure based on [WebAssembly Studio](https://github.com/wasdk/WebAssemblyStudio) (archived)
