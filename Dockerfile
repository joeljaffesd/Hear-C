# Use the official Emscripten SDK image with platform specification
FROM emscripten/emsdk:latest

# Set working directory
WORKDIR /app

# Install Node.js for the server component
RUN apt-get update && apt-get install -y nodejs

# Copy your project files into the container
COPY . .

# Make run.sh executable
RUN chmod +x ./run.sh

# Create build directory
RUN mkdir -p build

# Expose port for the Node.js server
EXPOSE 3000

# Start the rebuild server
CMD ["bash", "./run.sh"]