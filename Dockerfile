# Use the official Emscripten SDK image with platform specification
FROM emscripten/emsdk:latest

# Set working directory
WORKDIR /app

# Install Node.js for the server component (use more recent version)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json first for better caching
COPY package.json ./

# Copy your project files into the container
COPY . .

# Make run.sh executable
RUN chmod +x ./run.sh

# Create build directory and build the project
RUN mkdir -p build && ./run.sh build

# Set the port environment variable to match the exposed port
ENV PORT=8080

# Expose port for the Node.js server
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the server (not the rebuild server since we pre-built)
CMD ["node", "server.js"]