# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY src/backend/ ./src/backend/
COPY version.txt ./

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/backend ./src/backend
COPY --from=builder /app/version.txt ./version.txt

RUN chown -R appuser:appgroup /app/src/backend/data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "src/backend/server.js"]
