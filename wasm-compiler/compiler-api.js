/**
 * Client-Side Compiler API
 * 
 * This module provides a simple API for compiling C++ code to WebAssembly.
 * It uses a Web Worker to handle compilation without blocking the main thread.
 * 
 * Usage:
 *   const compiler = new CompilerAPI();
 *   await compiler.init();
 *   const result = await compiler.compile(userCode);
 */

class CompilerAPI {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.messageId = 0;
    this.pendingMessages = new Map();
  }

  /**
   * Initialize the compiler
   * @returns {Promise<boolean>} True if initialization succeeded
   */
  async init() {
    if (this.isReady) {
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        // Create the compilation worker
        this.worker = new Worker('wasm-compiler/compiler-worker.js');
        
        // Set up message handling
        this.worker.onmessage = (e) => this.handleMessage(e);
        this.worker.onerror = (error) => {
          console.error('[CompilerAPI] Worker error:', error);
          reject(error);
        };

        // Wait for worker ready message
        const readyHandler = (e) => {
          if (e.data.type === 'ready') {
            this.worker.removeEventListener('message', readyHandler);
            
            // Initialize the worker
            this.sendMessage({ type: 'init' })
              .then(() => {
                this.isReady = true;
                resolve(true);
              })
              .catch(reject);
          }
        };
        
        this.worker.addEventListener('message', readyHandler);
        
      } catch (error) {
        console.error('[CompilerAPI] Failed to initialize:', error);
        reject(error);
      }
    });
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
          reject(new Error('Compilation timeout'));
        }
      }, 60000); // 60 second timeout
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
      console.log('[CompilerAPI]', data.message);
      // Could emit events here for UI updates
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
   * @param {string} code - The C++ source code (user.h content)
   * @param {Object} options - Compilation options
   * @returns {Promise<CompileResult>}
   */
  async compile(code, options = {}) {
    if (!this.isReady) {
      await this.init();
    }

    try {
      const result = await this.sendMessage({
        type: 'compile',
        code,
        options: {
          optimization: 2,
          sdl: true,
          exportFunctions: ['_main', '_startAudio', '_stopAudio'],
          ...options
        }
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
  }
}

// Export for browser usage
window.CompilerAPI = CompilerAPI;
