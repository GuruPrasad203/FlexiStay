import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * next-intl middleware — runs on every request BEFORE the page renders.
 *
 * What it does:
 *  1. Reads the locale from the URL prefix  (/en, /hi, /ta …)
 *  2. If no prefix → detects from Accept-Language header → redirects
 *     e.g.  GET /search  →  302  /en/search
 *  3. Sets locale cookie so returning users keep their language
 */
export default createMiddleware(routing);

export const config = {
  // Run middleware on all paths EXCEPT:
  //   - Next.js internals (_next/static, _next/image)
  //   - Static files (favicon, images, fonts)
  //   - API routes (handled separately by backend services)
  matcher: [
    "/((?!_next|_vercel|api|.*\\..*).*)",
  ],
};
