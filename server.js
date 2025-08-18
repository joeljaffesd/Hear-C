const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const os = require('os');

// Configure the port for the API server
const PORT = process.env.PORT || 3000;

// MIME types for serving static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
};

// Function to clean up temporary directories
function cleanupTempDir(tempDir) {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      // Only log cleanup in debug mode or if there's an issue
    }
  } catch (error) {
    console.error(`Error cleaning up temp directory ${tempDir}:`, error);
  }
}

// Function to serve static files
function serveStaticFile(req, res, filePath) {
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'text/plain';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if(err.code === 'ENOENT') {
        console.error(`File not found: ${filePath}`);
        res.writeHead(404);
        res.end('File not found');
      } else {
        console.error(`Server error: ${err.code}`);
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint for Railway/hosting platforms
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Handle rebuild request
  if (req.method === 'POST' && req.url === '/rebuild') {
    const startTime = Date.now();
    console.log('🔨 Compiling C++ code...');
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const parsedBody = JSON.parse(body);
        const { code } = parsedBody;
        
        if (!code) {
          res.writeHead(400);
          res.end(JSON.stringify({ 
            success: false, 
            error: "No code provided for compilation" 
          }));
          return;
        }
        
        // Generate unique session ID for temporary build
        const sessionId = crypto.randomBytes(16).toString('hex');
        const tempDir = path.join(os.tmpdir(), `hear-c-${sessionId}`);
        const tempSrcDir = path.join(tempDir, 'src');
        const tempBuildDir = path.join(tempDir, 'build');
        
        try {
          // Create temporary directories
          fs.mkdirSync(tempDir, { recursive: true });
          fs.mkdirSync(tempSrcDir, { recursive: true });
          fs.mkdirSync(tempBuildDir, { recursive: true });
          
          // Write user code to temporary file
          fs.writeFileSync(path.join(tempSrcDir, 'user.h'), code);
          
          // Copy main.cpp to temp directory
          fs.copyFileSync(path.join(__dirname, 'src', 'main.cpp'), path.join(tempSrcDir, 'main.cpp'));
          
          // Copy template files needed for build
          fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(tempDir, 'index.html'));
          fs.copyFileSync(path.join(__dirname, 'styles.css'), path.join(tempDir, 'styles.css'));
          fs.copyFileSync(path.join(__dirname, 'logo.ico'), path.join(tempDir, 'logo.ico'));
          
          // Build command for temporary directory
          const buildCmd = `cd ${tempDir} && emcc src/main.cpp -o build/index.html -s USE_SDL=2 -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS=ccall,cwrap -s EXPORTED_FUNCTIONS=_main,_startAudio,_stopAudio --shell-file index.html -O2 && cp styles.css build/ && cp logo.ico build/`;
          
          // Execute the build
          exec(buildCmd, (error, stdout, stderr) => {
            // Check for compilation errors
            const hasCompilationError = stderr && stderr.includes("error:");
            const errorMessages = [];
            
            if (error) {
              console.error(`Error during build: ${error.message}`);
              errorMessages.push(error.message);
            }
            
            if (stderr) {
              console.error(`Build stderr: ${stderr}`);
              
              // Parse Emscripten error messages
              const errorLines = stderr.split('\n').filter(line => 
                line.includes("error:") || 
                line.includes("warning:") || 
                line.includes("undefined reference")
              );
              
              errorMessages.push(...errorLines);
            }
            
            // Only log stdout if there are errors or in debug mode
            if (hasCompilationError || error) {
              console.log(`Build stdout: ${stdout}`);
            }
            
            if (hasCompilationError || error) {
              // Clean up temp directory
              cleanupTempDir(tempDir);
              
              const duration = ((Date.now() - startTime) / 1000).toFixed(1);
              console.log(`❌ Compilation failed after ${duration}s`);
              
              res.writeHead(400);
              res.end(JSON.stringify({ 
                success: false, 
                error: "Compilation failed", 
                errorDetails: errorMessages,
                stdout: stdout,
                stderr: stderr
              }));
            } else {
              // Copy successful build to main build directory
              try {
                fs.copyFileSync(path.join(tempBuildDir, 'index.html'), path.join(__dirname, 'build', 'index.html'));
                fs.copyFileSync(path.join(tempBuildDir, 'index.js'), path.join(__dirname, 'build', 'index.js'));
                fs.copyFileSync(path.join(tempBuildDir, 'index.wasm'), path.join(__dirname, 'build', 'index.wasm'));
                
                // Clean up temp directory
                cleanupTempDir(tempDir);
                
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`✅ Compilation successful in ${duration}s`);
                
                res.writeHead(200);
                res.end(JSON.stringify({ 
                  success: true, 
                  output: stdout,
                  warnings: stderr ? stderr : null,
                  sessionId: sessionId
                }));
              } catch (copyError) {
                console.error('Error copying build files:', copyError);
                cleanupTempDir(tempDir);
                
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`❌ Compilation succeeded but copy failed after ${duration}s`);
                
                res.writeHead(500);
                res.end(JSON.stringify({
                  success: false,
                  error: "Build succeeded but failed to copy files"
                }));
              }
            }
          });
          
        } catch (fsError) {
          console.error('Filesystem error during build:', fsError);
          cleanupTempDir(tempDir);
          
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`❌ Filesystem error after ${duration}s`);
          
          res.writeHead(500);
          res.end(JSON.stringify({
            success: false,
            error: `Filesystem error: ${fsError.message}`
          }));
        }
        
      } catch (parseError) {
        console.error('Error parsing rebuild request:', parseError);
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid request format'
        }));
      }
    });
    return;
  }
  
  // Handle GET request for main.cpp content
  if (req.method === 'GET' && req.url === '/source') {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'src', 'user.h'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(content);
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }
  
  // Handle updating the source code
  if (req.method === 'POST' && req.url === '/update-source') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const parsedBody = JSON.parse(body);
        const { content } = parsedBody;
        
        if (content === undefined) {
          console.error('No content provided in update request');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'No content provided' }));
          return;
        }
        
        const filePath = path.join(__dirname, 'src', 'user.h');
        
        // Check if the file exists
        if (!fs.existsSync(path.dirname(filePath))) {
          console.error(`Directory not found: ${path.dirname(filePath)}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Source directory not found' }));
          return;
        }
        
        try {
          fs.writeFileSync(filePath, content);
          console.log('Source file updated. Ready to rebuild.');
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (fileError) {
          console.error(`Error writing to file: ${fileError.message}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: `Error writing to file: ${fileError.message}` }));
        }
      } catch (parseError) {
        console.error(`Error parsing request body: ${parseError.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `Invalid request format: ${parseError.message}` }));
      }
    });
    return;
  }
  
  // Serve static files
  if (req.method === 'GET') {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;
    
    // Default to index.html if root path is requested
    let filePath;
    
    if (pathname === '/') {
      // Serve build/index.html at the root path
      filePath = path.join(__dirname, 'build', 'index.html');
    } else if (pathname.startsWith('/build/')) {
      // Handle paths that explicitly include /build/
      filePath = path.join(__dirname, pathname);
    } else {
      // Try to find the file in the build directory first
      filePath = path.join(__dirname, 'build', pathname);
      
      // If not in build, try the project root
      if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, pathname.substring(1));
      }
    }
    
    // Check if the file exists and serve it
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveStaticFile(req, res, filePath);
    } else {
      console.error(`File not found: ${filePath}`);
      res.writeHead(404);
      res.end('File not found');
    }
    return;
  }
  
  // Handle unknown routes
  console.error(`Unknown route: ${req.method} ${req.url}`);
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not Found' }));
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==== Hear-C Server ====`);
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  console.log(`- Access the app at http://localhost:${PORT}/`);
  console.log(`- Edit code in the browser with the code editor`);
  console.log(`- Use the "Rebuild" button to recompile after changes`);
  console.log(`============================\n`);
});
