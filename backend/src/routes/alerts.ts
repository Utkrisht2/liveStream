import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { broadcast } from "../ws";

const bboxSchema = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
const alertSchema = z.object({
  cameraId: z.string().uuid(),
  timestamp: z.string(),
  bbox: z.array(bboxSchema).default([]),
  confidence: z.number().min(0).max(1).optional(),
  snapshotUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export const alertRouter = (prisma: PrismaClient) => {
  const r = new Hono();

  r.get("/cameras/:id/alerts", async (c) => {
    const id = c.req.param("id");
    const alerts = await prisma.alert.findMany({ where: { cameraId: id }, orderBy: { createdAt: "desc" }, take: 50 });
    return c.json({ items: alerts });
  });

  r.post("/alerts", async (c) => {
    // Worker-auth via internal key
    const key = c.req.header("x-internal-key");
    if (!key || key !== (process.env.INTERNAL_API_KEY || "")) return c.json({ error: "forbidden" }, 403);
    const body = await c.req.json();
    const parsed = alertSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "invalid" }, 400);
    const { cameraId, timestamp, bbox, confidence, snapshotUrl, metadata } = parsed.data;
    const created = await prisma.alert.create({
      data: {
        cameraId,
        timestamp: new Date(timestamp),
        bboxJson: JSON.stringify(bbox),
        snapshotUrl: snapshotUrl ?? "",
        confidence: confidence ?? 0,
        metadataJson: metadata ? JSON.stringify(metadata) : "",
      },
    });
    broadcast({ type: "alert", cameraId, alertId: created.id, timestamp: created.timestamp.toISOString(), snapshotUrl: created.snapshotUrl });
    return c.json(created, 201);
  });

  return r;
};

