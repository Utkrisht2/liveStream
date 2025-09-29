import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const authRouter = (prisma: PrismaClient) => {
  const r = new Hono();
  r.post("/login", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "invalid" }, 400);
    const { username, password } = parsed.data;

    let user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({ data: { username, passwordHash } });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return c.json({ error: "invalid credentials" }, 401);

    const token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET || "dev_secret", {
      expiresIn: "1h",
    });
    return c.json({ token, user: { id: user.id, username: user.username } });
  });
  return r;
};

