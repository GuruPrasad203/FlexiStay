import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth.routes";

/**
 * Builds and returns the Fastify app instance.
 * Kept separate from listen() so we can import it in tests.
 *
 * TypeScript note:
 *   "async function" means this function returns a Promise.
 *   We await each plugin registration before starting the server.
 */
async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env["NODE_ENV"] === "production" ? "warn" : "info",
    },
  });

  // ── Security ──────────────────────────────────────────────
  // helmet sets secure HTTP headers (XSS protection, no sniff, etc.)
  await app.register(helmet);

  // CORS — only allow requests from our frontend
  await app.register(cors, {
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
    credentials: true, // allow cookies / auth headers
  });

  // Rate limiting — max 60 requests per minute per IP
  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
  });

  // ── JWT ───────────────────────────────────────────────────
  // @fastify/jwt adds app.jwt.sign() and request.jwtVerify()
  await app.register(jwt, {
    secret: process.env["JWT_ACCESS_SECRET"] ?? "dev_secret_change_in_production",
  });

  // ── Routes ────────────────────────────────────────────────
  // All auth routes live under /api/v1/auth
  await app.register(authRoutes, { prefix: "/api/v1/auth" });

  // Health check — used by Kubernetes liveness probe
  app.get("/health", async () => ({ status: "ok", service: "auth" }));

  return app;
}

// ── Start server ─────────────────────────────────────────────
async function start() {
  const app = await buildApp();
  const port = Number(process.env["PORT"] ?? 4001);

  try {
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`Auth service running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
