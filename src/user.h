/*
__      __   _                    _         _  _                   ___ _
\ \    / /__| |__ ___ _ __  ___  | |_ ___  | || |___ __ _ _ _ ___ / __| |
 \ \/\/ / -_) / _/ _ \ '  \/ -_) |  _/ _ \ | __ / -_) _` | '_|___| (__|_|
  \_/\_/\___|_\__\___/_|_|_\___|  \__\___/ |_||_\___\__,_|_|      \___(_)
*/

// init function, called once when app starts
// this must be defined, or compilation will fail
void init() {
  std::cout << "Init Called!" << std::endl;
}

// per-sample callback, no input (yet)
// this must be defined, or compilation will fail
float processSample() {
  static float phase = 0.f;
  phase += 220.f / SAMPLE_RATE; // SAMPLE_RATE macro comes pre-defined
  phase = phase > 1.f ? 0.f : phase;
  return std::sinf(phase * 2.f * M_PI);
}