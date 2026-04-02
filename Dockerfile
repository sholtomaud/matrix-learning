# Use Node.js 25 slim image
FROM node:25-slim

# Install system dependencies
RUN apt-get update && apt-get install -y wget gnupg && rm -rf /var/lib/apt/lists/*

WORKDIR /
COPY package.json package-lock.json* ./

# Check for package-lock to use npm ci for deterministic builds instead of npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# For an Office Add-in, we need the dev certs locally to serve HTTPS.
RUN npx office-addin-dev-certs install --machine

WORKDIR /app
COPY . .

# We use Vite instead of Webpack for blazing-fast development
CMD ["npm", "run", "dev"]