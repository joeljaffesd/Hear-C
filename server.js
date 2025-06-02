const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configure the port for the API server
const PORT = 3000;

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
  
  // Handle unknown routes
  res.writeHead(404);
  res.end('Not Found');
});

// Start the server
server.listen(PORT, () => {
  console.log(`Rebuild server running at http://localhost:${PORT}`);
  console.log('Use the "Rebuild" button in the browser to trigger a rebuild');
});
