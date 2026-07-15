# syntax=docker/dockerfile:1

# Build the SPA with Vite, then serve the static bundle with nginx. VITE_API_URL
# is baked at build time — for the single-origin setup it points at the web's own
# origin and nginx reverse-proxies /api and /ws to the API service.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
