# --- build ---------------------------------------------------------------
FROM node:20-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Baked in at build time, because Vite inlines it — there is no runtime env.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- serve ---------------------------------------------------------------
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# HashRouter means no rewrite rule is needed; the default config is enough.
EXPOSE 80
