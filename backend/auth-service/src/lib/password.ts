import bcrypt from "bcryptjs";

/**
 * How many rounds of hashing to apply.
 * 12 is the recommended balance of security vs speed (2026).
 * Higher = more secure but slower. Never go below 10.
 *
 * TypeScript note:
 *   "const SALT_ROUNDS: number = 12" — the ": number" is a type annotation.
 *   It tells TypeScript this variable must always be a number.
 */
const SALT_ROUNDS: number = 12;

/**
 * Hash a plain-text password before saving to the database.
 * NEVER store plain passwords — always store the hash.
 *
 * Usage:
 *   const hash = await hashPassword("mypassword123")
 *   // store hash in DB
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare a plain password against a stored hash.
 * Returns true if they match, false otherwise.
 *
 * Usage:
 *   const match = await verifyPassword("mypassword123", storedHash)
 *   if (!match) throw new Error("Invalid credentials")
 */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
