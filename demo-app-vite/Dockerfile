# Stage 1: Deps
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci


# Stage 2: Build SPA
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY public ./public
COPY index.html ./
COPY package*.json ./
COPY vite.config.js ./
RUN npm run build


# Stage 3: Run Mockaton as standalone demo server
FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./mockaton-static-mocks
COPY mockaton.config.js ./ 
COPY mockaton-mocks ./mockaton-mocks
ADD https://registry.npmjs.org/mockaton/latest /tmp/cache-buster
RUN npm install --no-save mockaton@12
EXPOSE 4040
CMD ["npx", "mockaton", "--host", "0.0.0.0", "--port", "4040"]
