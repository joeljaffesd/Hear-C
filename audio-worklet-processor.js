/*
 * Hear-C AudioWorklet processor
 *
 * Runs in the browser's audio rendering thread. Receives a compiled
 * WebAssembly.Module (produced by wasm-clang) from the main thread via
 * port.postMessage, instantiates it with minimal WASI stubs, and calls
 * hear_c_next_sample() for every sample in each audio buffer.
 *
 * Messages received from main thread:
 *   { type: 'init', module: WebAssembly.Module }
 *
 * Messages sent to main thread:
 *   { type: 'ready' }
 *   { type: 'error', message: string }
 *   { type: 'stdout', text: string }
 *   { type: 'perf', avgMs, maxMs, bufferSize, sampleRate }
 */

class HearCProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.nextSample = null;
    this.ready = false;
    this._callCount = 0;
    this._totalMs = 0;
    this._maxMs = 0;
    this._reportInterval = 500; // report perf every 500 callbacks (~1.5 s)

    this.port.onmessage = (event) => {
      if (event.data.type === 'init') {
        this._initWasm(event.data.module);
      }
    };
  }

  _initWasm(module) {
    let wasmMemory = null;
    const getMem = () => wasmMemory;

    const wasiImports = {
      wasi_unstable: {
        proc_exit: () => {},

        fd_write: (fd, iovs, iovs_len, nwritten_out) => {
          const mem = getMem();
          if (!mem) return 1;
          const view = new DataView(mem.buffer);
          let total = 0;
          let text = '';
          for (let i = 0; i < iovs_len; i++) {
            const ptr = view.getUint32(iovs + i * 8, true);
            const len = view.getUint32(iovs + i * 8 + 4, true);
            text += new TextDecoder().decode(new Uint8Array(mem.buffer, ptr, len));
            total += len;
          }
          view.setUint32(nwritten_out, total, true);
          if (text && (fd === 1 || fd === 2)) {
            this.port.postMessage({ type: 'stdout', text });
          }
          return 0;
        },

        args_sizes_get: (argc_out, argv_buf_size_out) => {
          const mem = getMem();
          if (mem) {
            const v = new DataView(mem.buffer);
            v.setUint32(argc_out, 0, true);
            v.setUint32(argv_buf_size_out, 0, true);
          }
          return 0;
        },

        args_get: () => 0,

        environ_sizes_get: (count_out, buf_size_out) => {
          const mem = getMem();
          if (mem) {
            const v = new DataView(mem.buffer);
            v.setUint32(count_out, 0, true);
            v.setUint32(buf_size_out, 0, true);
          }
          return 0;
        },

        environ_get: () => 0,

        random_get: (buf, buf_len) => {
          const mem = getMem();
          if (mem) {
            // crypto is available in AudioWorkletGlobalScope (Web Crypto API)
            const b = new Uint8Array(mem.buffer, buf, buf_len);
            crypto.getRandomValues(b);
          }
          return 0;
        },

        clock_time_get: (clock_id, precision, time_out) => {
          const mem = getMem();
          if (mem) {
            const now = BigInt(Date.now()) * 1000000n;
            new DataView(mem.buffer).setBigUint64(time_out, now, true);
          }
          return 0;
        },

        poll_oneoff: () => 0,
        fd_seek: () => 0,
        fd_close: () => 0,
        fd_read: (fd, iovs, iovs_len, nread_out) => {
          const mem = getMem();
          if (mem) new DataView(mem.buffer).setUint32(nread_out, 0, true);
          return 0;
        },
        fd_fdstat_get: () => 0,
        fd_prestat_get: () => 8,       // WASI_EBADF
        fd_prestat_dir_name: () => 28, // WASI_ENOENT
        path_open: () => 28,
      }
    };

    WebAssembly.instantiate(module, wasiImports).then((instance) => {
      wasmMemory = instance.exports.memory;
      // Run _start() (calls main() which prints the build success message).
      // A normal WASI exit(0) is expected and caught; unexpected errors are logged.
      try { instance.exports._start(); } catch (err) {
        if (err && err.message && !err.message.includes('exit 0')) {
          this.port.postMessage({ type: 'stdout', text: 'Warning: _start() threw: ' + err.message + '\n' });
        }
      }
      // Call hear_c_init() to invoke the user's init() function
      if (typeof instance.exports.hear_c_init === 'function') {
        instance.exports.hear_c_init();
      }
      this.nextSample = instance.exports.hear_c_next_sample;
      this.ready = true;
      this.port.postMessage({ type: 'ready' });
    }).catch((err) => {
      this.port.postMessage({ type: 'error', message: String(err) });
    });
  }

  process(inputs, outputs) {
    if (!this.ready || !this.nextSample) return true;

    const t0 = performance.now();
    const output = outputs[0];
    const left = output[0];
    const right = output.length > 1 ? output[1] : null;
    const len = left.length;

    for (let i = 0; i < len; i++) {
      const s = this.nextSample();
      left[i] = s;
      if (right) right[i] = s;
    }

    const elapsed = performance.now() - t0;
    this._totalMs += elapsed;
    this._callCount++;
    if (elapsed > this._maxMs) this._maxMs = elapsed;

    // Report performance stats periodically
    if (this._callCount % this._reportInterval === 0) {
      this.port.postMessage({
        type: 'perf',
        avgMs: this._totalMs / this._callCount,
        maxMs: this._maxMs,
        bufferSize: len,
        sampleRate: sampleRate,
      });
    }

    return true;
  }
}

registerProcessor('hear-c-processor', HearCProcessor);
