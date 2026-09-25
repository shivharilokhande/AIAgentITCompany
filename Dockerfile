# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 DATA_DIR=/data HOSTNAME=0.0.0.0
RUN mkdir -p /data && chown node:node /data
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# schema.sql is read at runtime; standalone output does not include src/
COPY --from=build /app/src/lib/schema.sql ./src/lib/schema.sql
USER node
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.js"]
