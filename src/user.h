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

// Parameters with intuitive constructor: (name, min, max, default)
giml::Param<float> frequency{"frequency", 0.f, 3000.f, 220.f};   // min=0, max=3000, def=220
giml::Param<float> volume{"volume", 0.f, 1.f, 0.5f};             // min=0, max=1, def=0.5
giml::BoolParam<float> mute{"mute", true};
giml::ChoiceParam<float> multiplier{"multiplier", 0, 4, 0};
std::vector<giml::ParamMeta<float>*> params{&frequency, &volume, &mute, &multiplier};


// init function, called once when app starts
void init() { 
  std::cout << "Init called!" << std::endl;
  mDelay.toggle(true);
  mDelay.setParams();
  mEffectsLine.pushBack(&mDelay);
  // Set labels for multiplier choices
  multiplier.setLabels({"x0", "x1", "x2", "x3", "x4"});
}

// Per-sample audio callback
// This function must be defined, or compilation will fail!
float nextSample() {
  mOsc.setFrequency(frequency());
  return mEffectsLine.processSample(mOsc.processSample() * volume() * !mute() * 0.25 * multiplier());
}

#endif