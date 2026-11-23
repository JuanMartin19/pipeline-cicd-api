FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY api.js database.js telemetry.js ./
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://18.218.203.69:5080/api/default
ENV OTEL_EXPORTER_OTLP_HEADERS="Basic YWRtaW5AdXRlcS5lZHUubXg6T3Blbk9ic2VydmUxMjMq"

EXPOSE 3000

CMD ["node", "api.js"]