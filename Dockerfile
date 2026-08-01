# Production Dockerfile for Coolify & Docker Compose
FROM oven/bun:1.2-alpine AS base

# Install Chromium & system dependencies required for Puppeteer in Alpine Linux
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Configure Puppeteer environment variables for Docker
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/sqlite.db

WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy application source
COPY . .

# Build SvelteKit application using svelte-adapter-bun
RUN bun run build

# Ensure persistent data directory exists
RUN mkdir -p /app/data

# Expose HTTP Port 3000
EXPOSE 3000

# Persistent Volume for SQLite Database in Coolify
VOLUME ["/app/data"]

# Start SvelteKit Bun production server
CMD ["bun", "run", "build/index.js"]
