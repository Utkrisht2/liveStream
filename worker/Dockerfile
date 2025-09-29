FROM golang:1.22-alpine AS builder
RUN apk add --no-cache pkgconfig build-base ffmpeg
WORKDIR /app
COPY go.mod .
RUN go mod download
COPY . .
RUN go build -o /bin/worker ./main.go

FROM alpine:3.20
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=builder /bin/worker /usr/local/bin/worker
RUN adduser -D app && mkdir -p /app/snapshots && chown -R app:app /app
USER app
EXPOSE 8082
ENTRYPOINT ["/usr/local/bin/worker"]
