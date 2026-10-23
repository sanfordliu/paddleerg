# Multi-stage: Expo web export + Express (serves static + Strava OAuth).
FROM node:22-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci

COPY client ./client
COPY server ./server

# Same-origin API paths in the web bundle (empty base URL).
ENV EXPO_PUBLIC_API_URL=
WORKDIR /app/client
RUN npx expo export --platform web

WORKDIR /app/server
RUN npx tsc

RUN mkdir -p /out/public /out/dist \
  && cp -R /app/client/dist/. /out/public/ \
  && cp -R /app/server/dist/. /out/dist/

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci -w @paddleerg/server --omit=dev \
  && npm cache clean --force

COPY --from=build /out/dist ./server/dist
COPY --from=build /out/public ./server/public

ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_DIR=/app/server/public

WORKDIR /app/server
EXPOSE 8080
CMD ["node", "dist/index.js"]
