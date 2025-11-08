FROM node:24-slim
WORKDIR /app

# Optional
COPY mockaton.config.js ./

# Your mocks dirs
COPY mockaton-mocks ./mockaton-mocks
COPY mockaton-static-mocks ./mockaton-static-mocks

RUN npm init --init-type=module -y
RUN npm install mockaton@11

EXPOSE 2020
CMD ["npx", "mockaton",  "--host", "0.0.0.0",  "--port", "2020"]
