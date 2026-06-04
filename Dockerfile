FROM node:22-alpine AS web
WORKDIR /src/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY main.go ./
RUN go build -trimpath -ldflags="-s -w" -o /out/vortexo-manifest-server .

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/vortexo-manifest-server /app/vortexo-manifest-server
COPY --from=web /src/web/dist /app/web/dist
ENV VORTEXO_LISTEN_ADDR=:8080
ENV VORTEXO_DATA_DIR=/data
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/v1/health >/dev/null || exit 1
CMD ["/app/vortexo-manifest-server"]
