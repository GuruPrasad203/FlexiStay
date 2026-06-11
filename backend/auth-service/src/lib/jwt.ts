import jwt from "jsonwebtoken";

/**
 * TypeScript note — "interface" defines the shape of an object.
 * JwtPayload says: every JWT we create MUST have these fields.
 * If you try to sign a token without userId, TypeScript will error.
 */
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_SECRET =
  process.env["JWT_ACCESS_SECRET"] ?? "dev_access_secret";
const REFRESH_SECRET =
  process.env["JWT_REFRESH_SECRET"] ?? "dev_refresh_secret";
const ACCESS_EXPIRES = process.env["JWT_ACCESS_EXPIRES_IN"] ?? "15m";
const REFRESH_EXPIRES = process.env["JWT_REFRESH_EXPIRES_IN"] ?? "7d";

/**
 * Generate an access token + refresh token pair.
 *
 * Access token  → short-lived (15 min). Sent with every API request.
 * Refresh token → long-lived (7 days). Used only to get a new access token.
 *
 * This separation means if an access token is stolen, it expires quickly.
 */
export function signTokens(payload: JwtPayload): TokenPair {
  const accessToken = jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(
    { userId: payload.userId }, // refresh token only needs userId
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
}

/**
 * Verify and decode an access token.
 * Throws if the token is invalid or expired.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

/**
 * Verify and decode a refresh token.
 * Returns the userId so we can look up the user and issue new tokens.
 */
export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string };
}
