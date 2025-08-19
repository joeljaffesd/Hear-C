#ifndef USER_H
#define USER_H

#include "gimmel.hpp"

/*
NOTE: SAMPLE_RATE, BUFFER_SIZE, and CHANNELS macros come pre-defined
*/

// global instances of objects
giml::Phasor<float> mOsc{SAMPLE_RATE};
giml::Delay<float> mDelay{SAMPLE_RATE};
giml::EffectsLine<float> mEffectsLine;


// init function, called once when app starts
void init() { 
  std::cout << "Init called!" << std::endl;
  mDelay.toggle(true);  
  mDelay.setParams();  
  mEffectsLine.pushBack(&mDelay);  
  mOsc.setFrequency(1.f);
}

// Per-sample audio callback
// This function must be defined, or compilation will fail!
float nextSample() {
  return mEffectsLine.processSample(mOsc.processSample());
}

#endif