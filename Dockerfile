FROM node:24-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server ./
COPY index.html /app/index.html
COPY images /app/images
EXPOSE 3000
CMD ["node", "server.js"]
