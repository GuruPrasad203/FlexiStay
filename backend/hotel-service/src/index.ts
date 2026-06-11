import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { hotelRoutes } from "./routes/hotel.routes";
import { searchRoutes } from "./routes/search.routes";
import { partnerRoutes } from "./routes/partner.routes";

async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env["NODE_ENV"] === "production" ? "warn" : "info",
    },
  });

  // ── Security ──────────────────────────────────────────────
  await app.register(helmet);

  await app.register(cors, {
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
    credentials: true,
  });

  // Stricter rate limit for search (prevents scraping)
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // ── JWT ───────────────────────────────────────────────────
  // Uses the SAME secret as auth-service so tokens issued there
  // are valid here too. Both services must share JWT_ACCESS_SECRET.
  await app.register(jwt, {
    secret: process.env["JWT_ACCESS_SECRET"] ?? "dev_secret_change_in_production",
  });

  // ── File uploads (hotel images) ───────────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: (Number(process.env["MAX_FILE_SIZE_MB"] ?? 5)) * 1024 * 1024,
      files: 10, // max 10 images per upload request
    },
  });

  // ── Routes ────────────────────────────────────────────────
  // Public routes (no auth required)
  await app.register(searchRoutes, { prefix: "/api/v1/hotels" });
  await app.register(hotelRoutes, { prefix: "/api/v1/hotels" });

  // Partner-only routes (requires HOTEL_PARTNER role)
  await app.register(partnerRoutes, { prefix: "/api/v1/partner" });

  app.get("/health", async () => ({ status: "ok", service: "hotel" }));

  return app;
}

async function start() {
  const app = await buildApp();
  const port = Number(process.env["PORT"] ?? 4002);

  try {
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`Hotel service running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
