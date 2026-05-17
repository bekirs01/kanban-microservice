# syntax=docker/dockerfile:1
FROM node:20-alpine AS development

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json turbo.json ./
COPY --exclude=node_modules --exclude=apps/*/node_modules --exclude=packages/*/node_modules . .

RUN npm install

RUN npm run build --workspace=@challenge/exceptions && npm run build --workspace=@challenge/types

RUN npm run build --workspace=@challenge/auth-service

EXPOSE 3002 3012

CMD ["sh", "-c", "NODE_ENV=production TYPEORM_USE_TS=0 npm run migration:run --workspace=@challenge/auth-service && NODE_ENV=production npm run start:prod --workspace=@challenge/auth-service"]