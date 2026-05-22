# Node 20 with full Debian — has everything needed for native module compilation
FROM node:20-bookworm

WORKDIR /app

# Build tools needed for any native npm packages
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install all deps (dev included — we need vite to build)
RUN npm ci --no-audit --no-fund

# Copy source
COPY . .

# Build the React frontend → dist/
RUN npm run build

# Verify the build worked
RUN ls -la dist/ && echo "✓ Build succeeded"

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/index.js"]
