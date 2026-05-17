# syntax=docker/dockerfile:1
FROM node:20-alpine AS development

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json turbo.json ./
COPY --exclude=node_modules --exclude=apps/*/node_modules --exclude=packages/*/node_modules . .

RUN npm install

RUN npm run build --workspace=@challenge/exceptions && npm run build --workspace=@challenge/types

RUN npm run build --workspace=@challenge/tasks-service

EXPOSE 3003 3013

CMD ["sh", "-c", "NODE_ENV=production TYPEORM_USE_TS=0 npm run migration:run --workspace=@challenge/tasks-service && NODE_ENV=production npm run start:prod --workspace=@challenge/tasks-service"]