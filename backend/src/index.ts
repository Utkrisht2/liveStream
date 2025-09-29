import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwt } from "hono/jwt";
import { PrismaClient } from "@prisma/client";
import { authRouter } from "./routes/auth";
import { cameraRouter } from "./routes/cameras";
import { alertRouter } from "./routes/alerts";
import { setupWsRoute } from "./ws";
import { serveStatic } from "@hono/node-server/serve-static";

const app = new Hono();
const prisma = new PrismaClient();

// CORS for dev
app.use("/*", cors());

// Health
app.get("/api/internal/health", (c) => c.json({ status: "ok" }));

// Static snapshots
app.get("/snapshots/*", serveStatic({ root: "./static" }));

// Auth
app.route("/api/auth", authRouter(prisma));

// Protected routes
const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret";
app.use("/api/*", jwt({ secret: JWT_SECRET }).onError((e, c) => c.json({ error: "unauthorized" }, 401)));

app.route("/api", cameraRouter(prisma));
app.route("/api", alertRouter(prisma));

// WebSocket
app.get("/ws", setupWsRoute(JWT_SECRET));

const port = Number(process.env.BACKEND_PORT || 8080);
serve({ fetch: app.fetch, port });
console.log(`Backend API listening on :${port}`);

