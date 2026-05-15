FROM node:20-alpine AS development

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json turbo.json ./
COPY . .

RUN npm install

RUN npm run build --workspace=@challenge/exceptions && npm run build --workspace=@challenge/types

RUN npm run build --workspace=@challenge/tasks-service

EXPOSE 3003 3013

CMD ["sh", "-c", "npm run migration:run --workspace=@challenge/tasks-service && npm run start:prod --workspace=@challenge/tasks-service"]