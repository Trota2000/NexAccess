FROM node:24-alpine AS build
WORKDIR /frontend/web
COPY web/package*.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
ENV EXPO_PUBLIC_API_URL=/api/v1
RUN npx expo export --platform web

FROM nginx:stable-alpine
RUN apk add --no-cache ca-certificates
COPY --from=build /frontend/web/dist /usr/share/nginx/html
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
ENV API_ORIGIN=https://nx.rattenkoenig.net
EXPOSE 80
