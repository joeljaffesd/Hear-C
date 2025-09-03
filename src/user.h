#ifndef USER_H
#define USER_H

#include "gimmel.hpp"

/*
NOTE: SAMPLE_RATE, BUFFER_SIZE, and CHANNELS macros come pre-defined
*/

// global instances of objects
giml::Phasor<float> mOsc{SAMPLE_RATE};
giml::Chorus<float> mChorus{SAMPLE_RATE};
giml::Delay<float> mDelay{SAMPLE_RATE};
giml::EffectsLine<float> mEffectsLine;

// Gather parameter pointers from each effect using the public getParams().
// Keep a parallel vector of the owning effect so callers can build
// display labels like "Effect: Param" without mutating protected fields.
static inline std::vector<giml::ParamMeta<float>*> initParams(giml::EffectsLine<float>& effectsLine) {
  std::vector<giml::ParamMeta<float>*> out;
  for (auto* eff : effectsLine) {
    const auto& pvec = eff->getParams();
    for (auto* p : pvec) {
      out.push_back(p);
    }
  }
  return out;
}

// Populate globals at runtime inside init() to avoid static-init order issues
inline std::vector<giml::ParamMeta<float>*> params;

// init function, called once when app starts
void init() { 
  std::cout << "Init called!" << std::endl;
  mEffectsLine.pushBack(&mChorus);
  mEffectsLine.pushBack(&mDelay);
  // Populate parameters now that effects have been constructed and registered their params
  params = initParams(mEffectsLine);
}

// Per-sample audio callback
// This function must be defined, or compilation will fail!
float nextSample() {
  mOsc.setFrequency(1.f);
  return mEffectsLine.processSample(mOsc.processSample());
}

#endif