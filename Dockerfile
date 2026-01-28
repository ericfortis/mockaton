FROM node:24-alpine
WORKDIR /app

RUN npm install --no-save mockaton@12

EXPOSE 2020
CMD ["npx", "mockaton",  "--host", "0.0.0.0",  "--port", "2020"]
