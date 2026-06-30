import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "./lib/env";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import uploadRoutes from "./routes/upload";

export function createApp() {
  const app = express();

  const allowedOrigins = [
    config.clientOrigin,
    "http://localhost:5173",
    "https://vela.ai",
    "https://www.vela.ai",
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }));

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ status: "ok", env: config.isProd ? "production" : "development" }));
  app.use("/api/auth",   authRoutes);
  app.use("/api/chat",   chatRoutes);
  app.use("/api/upload", uploadRoutes);

  return app;
}
