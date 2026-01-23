# Stage 1: Build the application
FROM node:24-slim AS builder

WORKDIR /app

# Install native dependencies for canvas image processing library.
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libexpat1 \
    build-essential
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install only production dependencies to keep the final image small
COPY package*.json ./
RUN npm ci --omit=dev

# Copy all JavaScript files from the root directory.
# This ensures that the db.json file is not baked into the image.
COPY src/ ./

# Stage 2: Create the final, minimal image
FROM node:24-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libexpat1 && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN addgroup --gid 1001 nodejs && adduser --uid 1001 --gid 1001 --disabled-password --gecos "" nodejs

# Only copy the essential production files from the builder stage.
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/resources ./resources
COPY --from=builder --chown=nodejs:nodejs /app/routers ./routers
COPY --from=builder --chown=nodejs:nodejs /app/utils ./utils
COPY --from=builder --chown=nodejs:nodejs /app/index.js ./

EXPOSE 3080

USER nodejs

CMD ["node", "index.js"]
