/**
 * Emception Compiler API
 * 
 * This module provides a simple API for compiling C++ code to WebAssembly
 * using Emception (Emscripten running entirely in the browser).
 * 
 * Usage:
 *   const compiler = new EmceptionCompiler();
 *   await compiler.init();
 *   const result = await compiler.compile(userCode, mainCode);
 */

class EmceptionCompiler {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.messageId = 0;
    this.pendingMessages = new Map();
    this.statusCallbacks = [];
  }

  /**
   * Initialize the compiler
   * @returns {Promise<boolean>} True if initialization succeeded
   */
  async init() {
    if (this.isReady) {
      console.log('[EmceptionCompiler] Already initialized');
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('[EmceptionCompiler] Creating module worker...');
        // Create the Emception worker as a module worker
        this.worker = new Worker('wasm-compiler/emception-worker.js', { type: 'module' });
        console.log('[EmceptionCompiler] Worker created successfully');
        
        // Set up message handling
        this.worker.onmessage = (e) => this.handleMessage(e);
        this.worker.onerror = (error) => {
          console.error('[EmceptionCompiler] Worker error:', error);
          console.error('[EmceptionCompiler] Error message:', error.message);
          console.error('[EmceptionCompiler] Error filename:', error.filename);
          console.error('[EmceptionCompiler] Error line:', error.lineno);
          reject(error);
        };

        console.log('[EmceptionCompiler] Waiting for worker ready message...');
        // Wait for worker ready message
        const readyHandler = (e) => {
          console.log('[EmceptionCompiler] Received message from worker:', e.data.type);
          if (e.data.type === 'ready') {
            this.worker.removeEventListener('message', readyHandler);
            
            console.log('[EmceptionCompiler] Worker is ready, sending init message...');
            // Initialize the worker
            this.sendMessage({ type: 'init' })
              .then(() => {
                this.isReady = true;
                console.log('[EmceptionCompiler] ✅ Emception compiler ready');
                resolve(true);
              })
              .catch((err) => {
                console.error('[EmceptionCompiler] Failed to initialize worker:', err);
                reject(err);
              });
          }
        };
        
        this.worker.addEventListener('message', readyHandler);
        
      } catch (error) {
        console.error('[EmceptionCompiler] Failed to create worker:', error);
        console.error('[EmceptionCompiler] Error details:', error.message);
        console.error('[EmceptionCompiler] Stack trace:', error.stack);
        reject(error);
      }
    });
  }

  /**
   * Register a callback for status messages
   */
  onStatus(callback) {
    this.statusCallbacks.push(callback);
  }

  /**
   * Send a message to the worker and wait for response
   * @private
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingMessages.set(id, { resolve, reject });
      this.worker.postMessage({ ...message, id });
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error('Compilation timeout (exceeded 5 minutes)'));
        }
      }, 300000); // 5 minute timeout for compilation
    });
  }

  /**
   * Handle messages from worker
   * @private
   */
  handleMessage(e) {
    const { id, type, ...data } = e.data;
    
    // Handle status messages
    if (type === 'status') {
      console.log('[EmceptionCompiler]', data.message);
      this.statusCallbacks.forEach(cb => cb(data.message));
      return;
    }
    
    // Handle stdout/stderr
    if (type === 'stdout' || type === 'stderr') {
      console.log(`[Emception ${type}]`, data.message);
      return;
    }
    
    // Handle responses to sent messages
    const pending = this.pendingMessages.get(id);
    if (!pending) {
      return;
    }
    
    this.pendingMessages.delete(id);
    
    if (type === 'success') {
      pending.resolve(data);
    } else if (type === 'error') {
      pending.reject(new Error(data.error));
    }
  }

  /**
   * Compile C++ code to WebAssembly
   * @param {string} userCode - The user's C++ code (user.h content)
   * @param {string} mainCode - The main.cpp content
   * @returns {Promise<CompileResult>}
   */
  async compile(userCode, mainCode) {
    if (!this.isReady) {
      await this.init();
    }

    try {
      const result = await this.sendMessage({
        type: 'compile',
        userCode,
        mainCode
      });
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stderr: error.message
      };
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.pendingMessages.clear();
    this.statusCallbacks = [];
  }
}

// Export for browser usage
window.EmceptionCompiler = EmceptionCompiler;
