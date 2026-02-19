FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json first for better caching
COPY package.json ./

# Copy project files
COPY . .

# Set the port environment variable
ENV PORT=8080

# Expose port for the Node.js server
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Start the server
CMD ["node", "server.js"]
