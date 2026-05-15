FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json turbo.json ./

COPY . .

RUN npm install

RUN npm run build --workspace=@challenge/types

ARG VITE_API_URL
ARG VITE_WEBSOCKET_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WEBSOCKET_URL=${VITE_WEBSOCKET_URL}

RUN npm run build --workspace=@challenge/web

EXPOSE 3000

CMD ["sh", "-c", "npx -y serve -s apps/web/dist -l tcp://0.0.0.0:${PORT:-3000}"]