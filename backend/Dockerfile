# Backend image for HuggingFace Spaces (Docker Space, free CPU tier, 16GB RAM)
# Reuses the parent repo's TypeScript lib/ code via tsx (no build step).
#
# Build context = repo root (so we can COPY lib/ and scripts/)

FROM node:20-slim

# System deps for Puppeteer/Playwright Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    wget \
    ca-certificates \
    python3 \
    python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium instead of downloading
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin

WORKDIR /app

# Copy entire repo (lib/ + scripts/ + backend/ + package.json)
COPY . /app

# Install npm deps (postinstall patch runs automatically)
RUN npm install --no-audit --no-fund --loglevel=error

# Install Playwright Chromium binary (for safe-scraper)
RUN npx playwright install chromium --with-deps || true

# HF Spaces sets PORT=7860 automatically
ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860

# Start the health server + worker
CMD ["node", "backend/server.js"]
