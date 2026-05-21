# Use official Node 20 image (has Python for better-sqlite3 native build)
FROM node:20-bookworm-slim

# Install build tools needed for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install all dependencies (including dev — we need vite to build)
RUN npm ci

# Copy the rest of the source
COPY . .

# Build the React frontend → dist/
RUN npm run build

# Production environment
ENV NODE_ENV=production

# Railway sets PORT automatically; expose for clarity
EXPOSE 3001

# Start the Express server (it serves /api and /dist together)
CMD ["node", "server/index.js"]
