FROM node:24-alpine
WORKDIR /app
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev
WORKDIR /app
COPY . .
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "server.js"]
