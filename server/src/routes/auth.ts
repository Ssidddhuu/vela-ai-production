import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db";
import { config } from "../lib/env";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

const router = Router();

const credsSchema = z.object({
  username: z.string().trim().min(3, "Username needs at least 3 characters.").max(32),
  password: z.string().min(6, "Password needs at least 6 characters."),
});

function setSession(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// Create a new account, then sign in.
router.post("/register", async (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { username, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ error: "That username is taken. Try another." });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username, passwordHash } });
  setSession(res, user.id);
  return res.status(201).json({ username: user.username });
});

// Sign in with an existing account.
router.post("/login", async (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(401).json({ error: "Incorrect username or password." });
  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: "Incorrect username or password." });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Incorrect username or password." });

  setSession(res, user.id);
  return res.json({ username: user.username });
});

// Clear the session cookie.
router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  return res.json({ ok: true });
});

// Who am I? Used on app load to restore the session.
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: "Not authenticated." });
  return res.json({ username: user.username });
});

// Permanently delete the signed-in account.
router.delete("/account", requireAuth, async (req: AuthedRequest, res) => {
  await prisma.user.delete({ where: { id: req.userId } }).catch(() => undefined);
  res.clearCookie("token");
  return res.json({ ok: true });
});

export default router;
