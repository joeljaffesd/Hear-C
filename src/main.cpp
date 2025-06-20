#include <SDL2/SDL.h>
#include <emscripten.h>
#include <emscripten/html5.h>
#include <iostream>
#include <cmath>

// Audio parameters
#define SAMPLE_RATE 44100
#define BUFFER_SIZE 1024  // Buffer size in samples
#define CHANNELS 2        // Stereo
#include "user.h"

// Global audio state
SDL_AudioDeviceID audioDevice;
bool mainLoopInitialized = false;

// Audio callback function - this is where the audio is generated
void audioCallback(void* userdata, Uint8* stream, int len) {
  // Clear the buffer first (silence)
  SDL_memset(stream, 0, len);
  
  // Cast the buffer to float for easier manipulation
  float* buffer = reinterpret_cast<float*>(stream);
  int samples = len / sizeof(float) / CHANNELS;
  
  // Fill the audio buffer
  for (int i = 0; i < samples; i++) {

    // Call the user-defined function to get the next sample
    float sample = nextSample(); // make sure to define this!

    // Write to both channels for stereo
    buffer[i * CHANNELS] = sample;       // Left channel
    buffer[i * CHANNELS + 1] = sample;   // Right channel
  }
}

// Main loop function required by Emscripten
void mainLoop() {
  // Print a message the first time this is called
  if (!mainLoopInitialized) {
    std::cout << "Main loop started! WebAssembly is running." << std::endl;
    std::cout << "Audio device ID: " << audioDevice << std::endl;
    mainLoopInitialized = true;
    init();
  }
  
  // Optional: Uncomment to continuously monitor if needed
  // static int frameCount = 0;
  // if (frameCount++ % 60 == 0) {  // Print every ~1 second (assuming 60fps)
  //   std::cout << "Frame: " << frameCount << ", Freq: " << frequency << std::endl;
  // }
}

// Handle key presses to change frequency
EM_BOOL keyDownCallback(int eventType, const EmscriptenKeyboardEvent* e, void* userData) {

  //=======================================================================

  // EXAMPLE Event Handling:

  // if (strcmp(e->key, "ArrowUp") == 0) {
  //   frequency *= 1.05f;  // Increase pitch
  //   std::cout << "Frequency: " << frequency << " Hz" << std::endl;
  //   return EM_TRUE; // Prevent default browser behavior for this key
  // } else if (strcmp(e->key, "ArrowDown") == 0) {
  //   frequency /= 1.05f;  // Decrease pitch
  //   std::cout << "Frequency: " << frequency << " Hz" << std::endl;
  //   return EM_TRUE; // Prevent default browser behavior for this key
  // }

  //=======================================================================
  
  // Let all other keys pass through to the browser
  return EM_FALSE;
}

// Export functions to JavaScript
extern "C" {
  // Function to start audio - called from JavaScript
  EMSCRIPTEN_KEEPALIVE
  void startAudio() {
    // Unpause the audio device
    SDL_PauseAudioDevice(audioDevice, 0);
    std::cout << "Audio started from JavaScript" << std::endl;
  }
  
  // Function to stop audio - called from JavaScript
  EMSCRIPTEN_KEEPALIVE
  void stopAudio() {
    // Pause the audio device
    SDL_PauseAudioDevice(audioDevice, 1);
    std::cout << "Audio stopped from JavaScript" << std::endl;
  }
}

int main() {
  // Initialize SDL
  if (SDL_Init(SDL_INIT_AUDIO) < 0) {
    std::cerr << "SDL could not initialize! SDL_Error: " << SDL_GetError() << std::endl;
    return 1;
  }
  
  // Set up audio specification
  SDL_AudioSpec want, have;
  SDL_zero(want);
  want.freq = SAMPLE_RATE;
  want.format = AUDIO_F32;
  want.channels = CHANNELS;
  want.samples = BUFFER_SIZE;
  want.callback = audioCallback;
  
  // Open audio device
  audioDevice = SDL_OpenAudioDevice(NULL, 0, &want, &have, 0);
  if (audioDevice == 0) {
    std::cerr << "Failed to open audio: " << SDL_GetError() << std::endl;
    SDL_Quit();
    return 1;
  }
    
  // Report actual audio format if different from requested
  if (have.freq != want.freq || have.format != want.format || have.channels != want.channels) {
    std::cout << "We didn't get the exact audio format we wanted." << std::endl;
  }
  
  // Set up keyboard event handling
  emscripten_set_keydown_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, nullptr, 0, keyDownCallback);
  
  // Note: We don't start audio here - it will be started by the JavaScript button
  // SDL_PauseAudioDevice(audioDevice, 0);
  
  // Set up the main loop
  emscripten_set_main_loop(mainLoop, 0, 1);
  
  // Cleanup (this code will never be reached in Emscripten)
  SDL_CloseAudioDevice(audioDevice);
  SDL_Quit();
  
  return 0;
}