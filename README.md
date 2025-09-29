RTSP Face Detection Microservices (Mono-repo)

This mono-repo contains a production-ready, Dockerized microservices application that lets users register RTSP cameras, view live WebRTC feeds with face-detection overlays, and receive realtime alerts via WebSockets.

Services
- frontend/: React + TypeScript (Vite), MUI + Tailwind UI, WebRTC player, WebSocket alerts
- backend/: TypeScript + Hono + Prisma (PostgreSQL), JWT auth, WebSocket server
- worker/: Go + Gin, FFmpeg + gocv face detection, publishes to MediaMTX, posts alerts
- infra/: docker-compose, MediaMTX config, sample/demo scripts

Quick start
1) Copy `.env.example` to `.env` and adjust values if needed
2) Build and run the stack:
   - `docker compose -f infra/docker-compose.yml up --build`
3) Open the frontend at http://localhost:8081

Architecture

```text
Browser (WebRTC WHEP) <-> MediaMTX (WebRTC) <--- RTSP publish --- Worker (Go+gocv)
                                             ^
                                             |  RTSP pull from cameras/sample
                                             |
Backend (Hono) <--- HTTP/WS ---> Frontend (React)
    ^    ^\
    |    | \__ WebSocket broadcast of alerts/status
    |    \____ Alerts POST from worker (internal token)
    \
     \__ PostgreSQL (Prisma)
```

Repos/Directories
- `frontend/` — React app with Dashboard, Login, Camera tiles with WebRTC and alerts
- `backend/` — Hono API: auth, cameras, alerts; WebSocket server; Prisma schema
- `worker/` — Go worker: ingest RTSP, detect faces, overlay, publish to MediaMTX, POST alerts
- `infra/` — Docker Compose, MediaMTX config, optional RabbitMQ

Docs
- See `backend/docs/api.md` for endpoints and sample curl
- Each service has its own README with run instructions and environment variables

CI
- GitHub Actions workflow runs lint, typecheck, and tests for backend and frontend

License
MIT

