#include <emscripten.h>
#include <emscripten/html5.h>
#include <emscripten/webaudio.h>
#include <iostream>
#include <cmath>
#include <cstring>

// Audio parameters
#define SAMPLE_RATE 44100
#define BUFFER_SIZE 128   // AudioWorklet uses smaller buffer sizes
#define CHANNELS 2        // Stereo
#include "user.h"

// Global audio state
EMSCRIPTEN_WEBAUDIO_T audioContext = 0;
EMSCRIPTEN_AUDIO_WORKLET_NODE_T audioWorkletNode = 0;
bool mainLoopInitialized = false;
bool audioIsRunning = false;  // Track audio state
uint8_t audioThreadStack[4096];

// Forward declarations
void AudioThreadInitialized(EMSCRIPTEN_WEBAUDIO_T audioContext, bool success, void *userData);
void AudioWorkletProcessorCreated(EMSCRIPTEN_WEBAUDIO_T audioContext, bool success, void *userData);

// AudioWorklet processor function - this is where the audio is generated
bool ProcessAudio(int numInputs, const AudioSampleFrame* inputs,
                 int numOutputs, AudioSampleFrame* outputs,
                 int numParams, const AudioParamFrame* params,
                 void* userData) {
  // Only process audio if it's supposed to be running
  if (!audioIsRunning) {
    // Output silence when audio is stopped - using planar format
    if (numOutputs > 0 && outputs[0].numberOfChannels >= CHANNELS) {
      int framesToProcess = outputs[0].samplesPerChannel;
      float* leftChannel = &outputs[0].data[0];
      float* rightChannel = &outputs[0].data[framesToProcess];
      
      for (int i = 0; i < framesToProcess; i++) {
        leftChannel[i] = 0.0f;   // Left channel
        rightChannel[i] = 0.0f;  // Right channel
      }
    }
    return true;
  }
  
  // We expect one output with stereo channels
  if (numOutputs > 0 && outputs[0].numberOfChannels >= CHANNELS) {
    int framesToProcess = outputs[0].samplesPerChannel;
    
    // AudioWorklet uses planar format: separate arrays for each channel
    float* leftChannel = &outputs[0].data[0];  // First channel starts at index 0
    float* rightChannel = &outputs[0].data[framesToProcess];  // Second channel starts after first channel
    
    for (int i = 0; i < framesToProcess; i++) {
      // Call the user-defined function to get the next sample
      float sample = nextSample();
      
      // Write to both channels using planar format
      leftChannel[i] = sample;   // Left channel
      rightChannel[i] = sample;  // Right channel
    }
  }
  
  return true; // Continue processing
}

// Main loop function required by Emscripten
void mainLoop() {
  // Print a message the first time this is called
  if (!mainLoopInitialized) {
    std::cout << "Main loop started! WebAssembly is running." << std::endl;
    mainLoopInitialized = true;
    init();
  }
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
  // Get number of choices for a parameter
  EMSCRIPTEN_KEEPALIVE
  int getParamNumChoices(int index) {
    if (index >= 0 && index < params.size()) {
      auto* param = params[index];
      if (strcmp(param->getParamType(), "choice") == 0) {
        auto* choice = dynamic_cast<giml::ChoiceParam<float>*>(param);
        if (choice) return choice->getNumChoices();
      }
    }
    return 0;
  }

  // Get label for a choice
  EMSCRIPTEN_KEEPALIVE
  const char* getParamChoiceLabel(int index, int choiceIdx) {
    if (index >= 0 && index < params.size()) {
      auto* param = params[index];
      if (strcmp(param->getParamType(), "choice") == 0) {
        auto* choice = dynamic_cast<giml::ChoiceParam<float>*>(param);
        if (choice) {
          static char labelBuffer[128];
          std::string label = choice->getLabel(choiceIdx);
          strncpy(labelBuffer, label.c_str(), sizeof(labelBuffer) - 1);
          labelBuffer[sizeof(labelBuffer) - 1] = '\0';
          return labelBuffer;
        }
      }
    }
    return "";
  }
  // Function to start audio - called from JavaScript
  EMSCRIPTEN_KEEPALIVE
  void startAudio() {
    if (audioContext) {
      // Resume the audio context (required for browser autoplay policies)
      emscripten_resume_audio_context_sync(audioContext);
      
      // Enable audio processing
      audioIsRunning = true;
      
      std::cout << "Audio started" << std::endl;
    }
  }
  
  // Function to stop audio - called from JavaScript
  EMSCRIPTEN_KEEPALIVE
  void stopAudio() {
    // Stop audio processing (AudioWorklet will continue running but output silence)
    audioIsRunning = false;
    
    std::cout << "Audio stopped" << std::endl;
  }
  
  // Function to check if audio is running - called from JavaScript
  EMSCRIPTEN_KEEPALIVE
  bool isAudioRunning() {
    return audioIsRunning;
  }
  
  // Parameter control functions
  EMSCRIPTEN_KEEPALIVE
  int getParamCount() {
    return params.size();
  }
  
  EMSCRIPTEN_KEEPALIVE
  const char* getParamName(int index) {
    if (index >= 0 && index < params.size()) {
      // Use a simpler approach - JavaScript will copy the string
      static char nameBuffer[256];
      std::string name = params[index]->getName();
      strncpy(nameBuffer, name.c_str(), sizeof(nameBuffer) - 1);
      nameBuffer[sizeof(nameBuffer) - 1] = '\0';
      return nameBuffer;
    }
    return "";
  }
  
  EMSCRIPTEN_KEEPALIVE
  float getParamMin(int index) {
    if (index >= 0 && index < params.size()) {
      return params[index]->getMin();
    }
    return 0.0f;
  }
  
  EMSCRIPTEN_KEEPALIVE
  float getParamMax(int index) {
    if (index >= 0 && index < params.size()) {
      return params[index]->getMax();
    }
    return 1.0f;
  }
  
  EMSCRIPTEN_KEEPALIVE
  float getParamValue(int index) {
    if (index >= 0 && index < params.size()) {
      return params[index]->getCurrent();
    }
    return 0.0f;
  }
  
  EMSCRIPTEN_KEEPALIVE
  void setParamValue(int index, float value) {
    if (index >= 0 && index < params.size()) {
      params[index]->setValue(value);
    }
  }
  
  EMSCRIPTEN_KEEPALIVE
  const char* getParamType(int index) {
    if (index >= 0 && index < params.size()) {
      // Use a simpler approach - JavaScript will copy the string
      static char typeBuffer[64];
      std::string type = params[index]->getParamType();
      strncpy(typeBuffer, type.c_str(), sizeof(typeBuffer) - 1);
      typeBuffer[sizeof(typeBuffer) - 1] = '\0';
      return typeBuffer;
    }
    return "unknown";
  }
}

// Callback when the AudioWorklet processor has been created
void AudioWorkletProcessorCreated(EMSCRIPTEN_WEBAUDIO_T audioContext, bool success, void *userData) {
  if (!success) {
    std::cerr << "Failed to create AudioWorklet processor!" << std::endl;
    return;
  }

  int outputChannelCounts[1] = { CHANNELS };
  EmscriptenAudioWorkletNodeCreateOptions options = {
    .numberOfInputs = 0,
    .numberOfOutputs = 1,
    .outputChannelCounts = outputChannelCounts
  };

  // Create the AudioWorklet node
  audioWorkletNode = emscripten_create_wasm_audio_worklet_node(
    audioContext, 
    "hear-c-processor", 
    &options, 
    ProcessAudio, 
    0
  );
  
  // Connect to audio output
  emscripten_audio_node_connect(audioWorkletNode, audioContext, 0, 0);
  
  std::cout << "AudioWorklet initialized successfully" << std::endl;
}

// Callback when the AudioWorklet thread is initialized
void AudioThreadInitialized(EMSCRIPTEN_WEBAUDIO_T audioContext, bool success, void *userData) {
  if (!success) {
    std::cerr << "Failed to initialize AudioWorklet thread!" << std::endl;
    return;
  }

  WebAudioWorkletProcessorCreateOptions opts = {
    .name = "hear-c-processor"
  };
  
  emscripten_create_wasm_audio_worklet_processor_async(
    audioContext, 
    &opts, 
    AudioWorkletProcessorCreated, 
    0
  );
}

int main() {
  // Create an audio context
  audioContext = emscripten_create_audio_context(0);
  
  if (!audioContext) {
    std::cerr << "Failed to create audio context!" << std::endl;
    return 1;
  }
  
  std::cout << "Audio context created successfully" << std::endl;
  
  // Initialize AudioWorklet thread
  emscripten_start_wasm_audio_worklet_thread_async(
    audioContext,
    audioThreadStack,
    sizeof(audioThreadStack),
    AudioThreadInitialized,
    0
  );
  
  // Set up keyboard event handling
  emscripten_set_keydown_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, nullptr, 0, keyDownCallback);
  
  // Set up the main loop
  emscripten_set_main_loop(mainLoop, 0, 1);
  
  return 0;
}