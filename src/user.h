#ifndef USER_H
#define USER_H

/*
NOTE: SAMPLE_RATE, BUFFER_SIZE, and CHANNELS macros come pre-defined
*/

// object definition
class SinOsc {
private:
  float mPhase = 0.f; 
  float mSampleRate = 0.f;
  float mFrequency = 440.f;

public:
  SinOsc() = delete;
  SinOsc(float sampleRate) {
    this->mSampleRate = sampleRate;
  }

  float freq() { return mFrequency; }
  void freq(float newFreq) { this->mFrequency = newFreq; }

  float processSample() {
    mPhase += 2.0f * M_PI * mFrequency / mSampleRate;
    if (mPhase > 2.0f * M_PI) {
      mPhase -= 2.0f * M_PI;  // Keep phase in the [0, 2π] range
    }
    return std::sin(mPhase);
  }

  float operator()() {
    return this->processSample();
  }
};

// global instance of object
SinOsc mOsc{SAMPLE_RATE};

// init function, called once when app starts
void init() { 
  std::cout << "Init called!" << std::endl;
  mOsc.freq(220.f);
}

#endif