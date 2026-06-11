import { z } from "zod";

/**
 * Zod — runtime validation.
 *
 * TypeScript checks types at COMPILE time (when you write code).
 * Zod checks types at RUNTIME (when actual data comes in from the network).
 *
 * Example: TypeScript knows `email: string`, but it can't stop someone
 * from sending `{ email: "not-an-email" }` in an API request.
 * Zod's z.string().email() catches that.
 */

// ── Register ──────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100),

  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase(), // normalise before saving

  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, "Must be a valid Indian mobile number (+91XXXXXXXXXX)")
    .optional(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),

  role: z
    .enum(["GUEST", "HOTEL_PARTNER"])
    .default("GUEST"),
});

// "z.infer<>" extracts the TypeScript type from a Zod schema.
// So RegisterInput is automatically typed correctly — no duplicate type declarations.
export type RegisterInput = z.infer<typeof registerSchema>;

// ── Login ─────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Refresh token ─────────────────────────────────────────────
export const refreshSchema = z.object({
  // The refresh token can come from the request body.
  // (Alternatively it could come from an HTTP-only cookie — we support both.)
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshInput = z.infer<typeof refreshSchema>;
