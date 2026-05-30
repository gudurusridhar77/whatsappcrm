# syntax=docker/dockerfile:1
# Stage 1: Build React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
# BuildKit cache mount: keep the npm download cache across builds so `npm ci`
# doesn't re-download everything when the lockfile is unchanged.
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .

# Build args for API URL (empty = relative, proxied by Nginx)
ARG REACT_APP_API_URL=""
ARG REACT_APP_WS_URL="/ws"
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
# Disable source maps: much faster build and far less memory — the main win
# on a small EC2 instance where webpack was thrashing/swapping.
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# Stage 2: Serve with Nginx (also acts as reverse proxy)
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
