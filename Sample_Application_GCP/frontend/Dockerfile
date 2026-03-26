# ---- Stage 1: Build ----
FROM node:22-alpine AS build
WORKDIR /app

# Cache dependencies separately
COPY package.json package-lock.json* ./
RUN npm ci

# Build with optional API URL override
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Stage 2: Runtime ----
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

ENV PORT=8080
ENV API_UPSTREAM=http://backend:8080

# Keep the default nginx entrypoint user behavior so the runtime template
# can be rendered into /etc/nginx/conf.d before the worker drops privileges.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
