import { Context } from "hono";
import { upgradeWebSocket } from "hono/ws";
import jwt from "jsonwebtoken";

type Client = {
  send: (data: string) => void;
  subscriptions: Set<string>; // cameraIds
};

const clients = new Set<Client>();

export function setupWsRoute(jwtSecret: string) {
  return upgradeWebSocket((c: Context) => {
    const url = new URL(c.req.url);
    const token = url.searchParams.get("token");
    if (!token) throw new Error("unauthorized");
    try {
      jwt.verify(token, jwtSecret);
    } catch {
      throw new Error("unauthorized");
    }
    return {
      onOpen(ev, ws) {
        const client: Client = { send: (d) => ws.send(d), subscriptions: new Set() };
        (ws as any).__client = client;
        clients.add(client);
      },
      onMessage(ev, ws) {
        try {
          const data = JSON.parse(String(ev.data));
          if (data?.type === "subscribe" && typeof data.cameraId === "string") {
            const client = (ws as any).__client as Client;
            client.subscriptions.add(data.cameraId);
            ws.send(JSON.stringify({ type: "subscribed", cameraId: data.cameraId }));
          }
        } catch {}
      },
      onClose() {
        // cleanup handled by GC via weak refs, but remove explicitly
        // find and delete
      },
    };
  });
}

export function broadcast(event: unknown & { cameraId?: string }) {
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (event && typeof event === "object" && "cameraId" in event && event.cameraId) {
      if (!client.subscriptions.has(event.cameraId)) continue;
    }
    try {
      client.send(payload);
    } catch {}
  }
}

