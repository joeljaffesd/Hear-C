const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configure the port for the API server
const PORT = 3000;

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

  // Handle rebuild request
  if (req.method === 'POST' && req.url === '/rebuild') {
    console.log('Rebuild request received');
    
    // Execute the build script
    exec('./run.sh build', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error during build: ${error.message}`);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: error.message }));
        return;
      }
      
      if (stderr) {
        console.error(`Build stderr: ${stderr}`);
      }
      
      console.log(`Build stdout: ${stdout}`);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, output: stdout }));
    });
    return;
  }
  
  // Handle GET request for main.cpp content
  if (req.method === 'GET' && req.url === '/source') {
    try {
      const content = fs.readFileSync(path.join(__dirname, 'src', 'main.cpp'), 'utf8');
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
        const { content } = JSON.parse(body);
        
        fs.writeFileSync(path.join(__dirname, 'src', 'main.cpp'), content);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        
        console.log('Source file updated. Ready to rebuild.');
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: error.message }));
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
    
    console.log(`Attempting to serve: ${filePath}`);
    
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
server.listen(PORT, () => {
  console.log(`\n==== Hear-C Server ====`);
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`- Access the app at http://localhost:${PORT}/`);
  console.log(`- Edit code in the browser with the code editor`);
  console.log(`- Use the "Rebuild" button to recompile after changes`);
  console.log(`============================\n`);
});
