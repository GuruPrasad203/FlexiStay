import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { notifyRoutes } from "./routes/notify.routes";

/**
 * The notification service has two parts:
 *
 * 1. HTTP server (this file) — accepts POST requests from other services
 *    to enqueue notifications. Protected by an internal API key.
 *
 * 2. Workers (worker.ts) — run in the background, pulling jobs from
 *    Redis queues and calling SendGrid / Twilio / Firebase.
 *
 * Why separate? The HTTP server can be restarted without losing queued jobs
 * (they stay in Redis). Workers can be scaled independently.
 */
async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env["NODE_ENV"] === "production" ? "warn" : "info",
    },
  });

  await app.register(helmet);
  await app.register(cors, {
    // Notification service is internal — only other backend services call it
    origin: false,
  });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  // ── Internal API key check ─────────────────────────────────
  // Every request to /notify/* must include:
  //   x-internal-key: <INTERNAL_API_KEY from .env>
  // This prevents anyone outside the backend cluster from
  // triggering notifications directly.
  app.addHook("preHandler", async (request, reply) => {
    if (request.url === "/health") return; // health check is public

    const key = request.headers["x-internal-key"];
    if (key !== process.env["INTERNAL_API_KEY"]) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  await app.register(notifyRoutes, { prefix: "/notify" });

  app.get("/health", async () => ({ status: "ok", service: "notification" }));

  return app;
}

async function start() {
  const app = await buildApp();
  const port = Number(process.env["PORT"] ?? 4003);

  try {
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`Notification service running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
