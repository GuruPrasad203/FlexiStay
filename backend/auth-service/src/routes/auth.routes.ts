import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { signTokens, verifyRefreshToken } from "../lib/jwt";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  type RegisterInput,
  type LoginInput,
  type RefreshInput,
} from "../schemas/auth.schemas";

/**
 * Fastify plugin pattern — all routes are registered on the "app" instance.
 * The { prefix: "/api/v1/auth" } option in index.ts prepends that path automatically.
 *
 * So POST /register here becomes POST /api/v1/auth/register externally.
 */
export async function authRoutes(app: FastifyInstance) {
  // ── POST /register ─────────────────────────────────────────
  app.post<{ Body: RegisterInput }>(
    "/register",
    async (request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) => {
      // 1. Validate incoming JSON body with Zod
      const result = registerSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          // .flatten() converts Zod's nested errors into a flat { field: [messages] } shape
          details: result.error.flatten().fieldErrors,
        });
      }
      const { name, email, phone, password, role } = result.data;

      // 2. Check if email already exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(409).send({ error: "Email already registered" });
      }

      // 3. Hash password — NEVER store plain text
      const passwordHash = await hashPassword(password);

      // 4. Create user in DB
      const user = await prisma.user.create({
        data: { name, email, phone, passwordHash, role },
        // "select" limits what Prisma returns — never return passwordHash to the client
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });

      // 5. Issue tokens
      const { accessToken, refreshToken } = signTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // 6. Save refresh token to DB so we can invalidate it on logout
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      return reply.status(201).send({ user, accessToken, refreshToken });
    }
  );

  // ── POST /login ────────────────────────────────────────────
  app.post<{ Body: LoginInput }>(
    "/login",
    async (request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
      const result = loginSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }
      const { email, password } = result.data;

      // 1. Find user — we need passwordHash so fetch it (no select filter here)
      const user = await prisma.user.findUnique({ where: { email } });

      // 2. "invalid credentials" — same message whether email or password is wrong.
      //    This prevents attackers from knowing which one failed ("account enumeration").
      if (!user) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      const passwordOk = await verifyPassword(password, user.passwordHash);
      if (!passwordOk) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      // 3. Issue new token pair
      const { accessToken, refreshToken } = signTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return reply.send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
    }
  );

  // ── POST /refresh ──────────────────────────────────────────
  // Exchange a valid refresh token for a new access token.
  app.post<{ Body: RefreshInput }>(
    "/refresh",
    async (request: FastifyRequest<{ Body: RefreshInput }>, reply: FastifyReply) => {
      const result = refreshSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: "Refresh token required" });
      }
      const { refreshToken: incomingToken } = result.data;

      // 1. Verify signature and expiry
      let payload: { userId: string };
      try {
        payload = verifyRefreshToken(incomingToken);
      } catch {
        return reply.status(401).send({ error: "Invalid or expired refresh token" });
      }

      // 2. Check it exists in DB (not already invalidated by logout)
      const stored = await prisma.refreshToken.findUnique({
        where: { token: incomingToken },
        include: { user: true },
      });
      if (!stored || stored.userId !== payload.userId) {
        return reply.status(401).send({ error: "Refresh token not found" });
      }

      // 3. Rotate — delete old token, issue new pair
      // Token rotation: each refresh issues a NEW refresh token.
      // If someone steals the old one and uses it after rotation, it'll fail.
      await prisma.refreshToken.delete({ where: { token: incomingToken } });

      const { accessToken, refreshToken: newRefreshToken } = signTokens({
        userId: stored.user.id,
        email: stored.user.email,
        role: stored.user.role,
      });

      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: stored.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return reply.send({ accessToken, refreshToken: newRefreshToken });
    }
  );

  // ── POST /logout ───────────────────────────────────────────
  // Invalidate the refresh token so it can't be used again.
  app.post<{ Body: RefreshInput }>(
    "/logout",
    async (request: FastifyRequest<{ Body: RefreshInput }>, reply: FastifyReply) => {
      const result = refreshSchema.safeParse(request.body);
      if (!result.success) {
        // Logout is idempotent — even a bad token body should return 200
        return reply.send({ message: "Logged out" });
      }

      // Delete silently — if it doesn't exist, the user is already logged out
      await prisma.refreshToken
        .delete({ where: { token: result.data.refreshToken } })
        .catch(() => null); // ignore "record not found" error

      return reply.send({ message: "Logged out" });
    }
  );

  // ── GET /me ────────────────────────────────────────────────
  // Return the current user's profile. Requires a valid access token
  // in the Authorization header: "Bearer <accessToken>"
  app.get(
    "/me",
    {
      // Fastify hook — runs before the handler
      preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          // @fastify/jwt adds request.jwtVerify()
          await request.jwtVerify();
        } catch {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // After jwtVerify(), the decoded payload is on request.user
      const { userId } = request.user as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.send({ user });
    }
  );
}
