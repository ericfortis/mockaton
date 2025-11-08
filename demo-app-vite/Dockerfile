# Stage 1: Build Frontend App
FROM node:24-slim AS builder
WORKDIR /app

COPY src ./src
COPY public ./public
COPY index.html ./
COPY package*.json ./
COPY vite.config.js ./

RUN npm ci
RUN npm run build


# Stage 2: Run Mockaton as standalone demo server
FROM node:24-slim
WORKDIR /app

COPY --from=builder /app/dist ./mockaton-static-mocks

COPY mockaton.config.js ./
COPY mockaton-mocks ./mockaton-mocks

RUN npm init --init-type=module -y
RUN npm install mockaton@11

EXPOSE 4040
CMD ["npx", "mockaton",  "--host", "0.0.0.0",  "--port", "4040"]
