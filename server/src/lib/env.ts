import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port:        Number(process.env.PORT ?? 4000),
  jwtSecret:   process.env.JWT_SECRET ?? "dev-secret-change-me",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  groqApiKey:  process.env.GROQ_API_KEY ?? "",
  isProd:      process.env.NODE_ENV === "production",
};
