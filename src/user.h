/*
__      __   _                    _         _  _                   ___ _
\ \    / /__| |__ ___ _ __  ___  | |_ ___  | || |___ __ _ _ _ ___ / __| |
 \ \/\/ / -_) / _/ _ \ '  \/ -_) |  _/ _ \ | __ / -_) _` | '_|___| (__|_|
  \_/\_/\___|_\__\___/_|_|_\___|  \__\___/ |_||_\___\__,_|_|      \___(_)
*/

// init() is called once on startup
void init() {}

// processSample(float input) is called once per sample at SAMPLE_RATE Hz
// input:  current audio input sample [-1, 1]
// return: output sample [-1, 1]
float processSample(float input) {
  static float phase = 0.f;
  phase += 220.f / SAMPLE_RATE; // SAMPLE_RATE macro comes pre-defined
  if (phase > 1.f) phase -= 1.f;
  return std::sinf(phase * 2.f * M_PI);
}
