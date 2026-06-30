import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { streamChat } from "../lib/ai";

const router = Router();

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) }))
    .min(1),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request body." });

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  try {
    await streamChat(parsed.data.messages, (token) => {
      if (!res.writableEnded) res.write(token);
    });
    if (!res.writableEnded) res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "stream failed";
    if (!res.headersSent) {
      res.status(502).json({ error: "AI request failed." });
    } else if (!res.writableEnded) {
      res.write("\n⚠ " + message);
      res.end();
    }
  }
});

export default router;