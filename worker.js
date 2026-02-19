/*
 * Copyright 2020 WebAssembly Community Group participants
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Based on https://github.com/binji/wasm-clang/blob/master/worker.js
// Modified for Hear-C client-side audio compilation.

self.importScripts('shared.js');

const WASM_CLANG_BASE = 'https://binji.github.io/wasm-clang/';

let api;
let port;

const apiOptions = {
  async readBuffer(filename) {
    const response = await fetch(filename);
    return response.arrayBuffer();
  },

  async compileStreaming(filename) {
    const response = await fetch(filename);
    return WebAssembly.compile(await response.arrayBuffer());
  },

  hostWrite(s) { port.postMessage({id : 'write', data : s}); }
};

const onAnyMessage = async event => {
  switch (event.data.id) {
  case 'constructor':
    port = event.data.data;
    port.onmessage = onAnyMessage;
    api = new API({
      ...apiOptions,
      clang: WASM_CLANG_BASE + 'clang',
      lld: WASM_CLANG_BASE + 'lld',
      memfs: WASM_CLANG_BASE + 'memfs',
      sysroot: WASM_CLANG_BASE + 'sysroot.tar',
    });
    // Notify main thread when the API (sysroot) is ready.
    api.ready.then(() => {
      port.postMessage({id: 'ready'});
    }).catch(err => {
      port.postMessage({id: 'error', data: String(err)});
    });
    break;

  case 'setShowTiming':
    api.showTiming = event.data.data;
    break;

  case 'compileAndGetWasm': {
    const responseId = event.data.responseId;
    let wasmBuffer = null;
    let errorMsg = null;
    try {
      wasmBuffer = await api.compileAndGetWasm(event.data.data);
    } catch (e) {
      errorMsg = e.message || String(e);
    }
    const transferList = wasmBuffer ? [wasmBuffer] : [];
    port.postMessage(
      {id: 'runAsync', responseId, data: {success: !!wasmBuffer, wasm: wasmBuffer, error: errorMsg}},
      transferList
    );
    break;
  }
  }
};

self.onmessage = onAnyMessage;
