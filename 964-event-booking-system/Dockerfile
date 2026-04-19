# Use multi-stage build for smaller image
FROM node:24.15.0-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies using npm ci for reproducible builds
RUN npm ci --only=production

# Final stage
FROM node:24.15.0-alpine

WORKDIR /app

# Copy installed node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Expose ports
EXPOSE 3001

# Start both server and worker using a wrapper script
CMD ["sh", "-c", "node src/server.js & node src/worker.js & wait"]