FROM node:20-slim

WORKDIR /app

# npm ci needs the lockfile; copying it separately keeps the layer cached.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY data ./data

USER node
EXPOSE 5000
CMD ["node", "src/server.js"]
