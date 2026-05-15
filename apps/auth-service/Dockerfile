FROM node:20-alpine AS development

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json turbo.json ./
COPY . .

RUN npm install

RUN npm run build --workspace=@challenge/exceptions && npm run build --workspace=@challenge/types

RUN npm run build --workspace=@challenge/auth-service

EXPOSE 3002 3012

CMD ["sh", "-c", "npm run migration:run --workspace=@challenge/auth-service && npm run start:prod --workspace=@challenge/auth-service"]