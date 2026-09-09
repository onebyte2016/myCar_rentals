# --- Stage 1: install dependencies & build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching — only reinstalls if package.json changes)
COPY package*.json ./
RUN npm ci

# Copy the rest of the app and build it
COPY . .
RUN npm run build

# --- Stage 2: run the production server ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only copy what's needed to run the app, not the whole build environment
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]