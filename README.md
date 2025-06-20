# Hear-C: A Browser-Based Development Environment for C++ Audio
Hear-C is a browser-based IDE (integrated development environment) for writing digital audio synthesis and effects programs in C++. For those learning to code, browser-based IDEs simplify the development process by removing the requirement to set up developer tools locally, a task that varies by operating system and can be daunting for a beginner. While browser-based IDEs exist for a number of audio-specific languages such as Faust and ChucK, there is no major web app providing this functionality for C++, the lingua-franca of digital audio.

## Using:

1. Clone this repo

2. If you want to build without Docker, make sure you have `emcc` and `node` installed and in path

3. To build locally, do `./run.sh` in a Bash shell or use `SHIFT`+`CMD`+`B` in VSCode. 

    To build with Docker do: `docker build -t Hear-C . && docker run --publish 3000:3000 Hear-C`

4. Navigate to http://localhost:3000/ with your favorite browser