FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json turbo.json ./

COPY . .

RUN npm install

RUN npm run build --workspace=@challenge/types

EXPOSE 3000

CMD ["npm", "run", "dev", "--workspace=web", "--", "--host"]