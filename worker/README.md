# Worker (Go + Gin)

Responsibilities

- Accept start/stop/update control calls
- Restream RTSP to MediaMTX (demo)
- Post alerts to backend (demo helper provided)

Run

```bash
go mod tidy
go run main.go
```

Env

- WORKER_PORT (default 8082)
- INTERNAL_API_KEY
- MEDIAMTX_RTSP_URL (e.g. rtsp://mediamtx:8554)
- BACKEND_URL (http://backend:8080)
- SNAPSHOT_BASE_URL (http://backend:8080/snapshots)

