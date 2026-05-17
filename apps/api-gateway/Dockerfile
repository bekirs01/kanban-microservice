# syntax=docker/dockerfile:1
FROM node:20-alpine AS development

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json turbo.json ./
COPY --exclude=node_modules --exclude=apps/*/node_modules --exclude=packages/*/node_modules . .

RUN npm install

RUN npm run build --workspace=@challenge/exceptions && npm run build --workspace=@challenge/types

RUN npm run build --workspace=@challenge/api-gateway

EXPOSE 3001

CMD ["npm", "run", "dev", "--workspace=@challenge/api-gateway"]