import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const cameraSchema = z.object({
  name: z.string().min(1),
  rtspUrl: z.string().url(),
  location: z.string().optional(),
  enabled: z.boolean().optional(),
  detectionEnabled: z.boolean().optional(),
  fpsTarget: z.number().int().min(1).max(60).optional(),
});

async function callWorker(path: string, body: unknown) {
  const url = `http://worker:8082${path}`;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-key": process.env.INTERNAL_API_KEY || "" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export const cameraRouter = (prisma: PrismaClient) => {
  const r = new Hono();

  r.get("/cameras", async (c) => {
    const userId = (c.get("jwtPayload") as any)?.sub as string | undefined;
    const list = await prisma.camera.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return c.json({ items: list });
  });

  r.get("/cameras/:id", async (c) => {
    const id = c.req.param("id");
    const camera = await prisma.camera.findUnique({ where: { id }, include: { alerts: { take: 10, orderBy: { createdAt: "desc" } } } });
    if (!camera) return c.json({ error: "not found" }, 404);
    return c.json(camera);
  });

  r.post("/cameras", async (c) => {
    const userId = (c.get("jwtPayload") as any)?.sub as string | undefined;
    const body = await c.req.json();
    const parsed = cameraSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "invalid" }, 400);
    const data = parsed.data;
    const cam = await prisma.camera.create({
      data: {
        userId: userId!,
        name: data.name,
        rtspUrl: data.rtspUrl,
        location: data.location ?? "",
        enabled: data.enabled ?? true,
        detectionEnabled: data.detectionEnabled ?? true,
        fpsTarget: data.fpsTarget ?? 8,
        status: "stopped",
      },
    });
    return c.json(cam, 201);
  });

  r.put("/cameras/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = cameraSchema.partial().safeParse(body);
    if (!parsed.success) return c.json({ error: "invalid" }, 400);
    const cam = await prisma.camera.update({ where: { id }, data: parsed.data });
    // Notify worker of runtime changes
    await callWorker(`/api/control/update`, { cameraId: id, changes: parsed.data });
    return c.json(cam);
  });

  r.delete("/cameras/:id", async (c) => {
    const id = c.req.param("id");
    await prisma.alert.deleteMany({ where: { cameraId: id } });
    await prisma.camera.delete({ where: { id } });
    await callWorker(`/api/control/stop`, { cameraId: id });
    return c.json({ ok: true });
  });

  r.post("/cameras/:id/start", async (c) => {
    const id = c.req.param("id");
    const cam = await prisma.camera.update({ where: { id }, data: { status: "running" } });
    await callWorker(`/api/control/start`, { cameraId: id, rtspUrl: cam.rtspUrl, fpsTarget: cam.fpsTarget, detectionEnabled: cam.detectionEnabled });
    return c.json({ ok: true });
  });

  r.post("/cameras/:id/stop", async (c) => {
    const id = c.req.param("id");
    await prisma.camera.update({ where: { id }, data: { status: "stopped" } });
    await callWorker(`/api/control/stop`, { cameraId: id });
    return c.json({ ok: true });
  });

  return r;
};

