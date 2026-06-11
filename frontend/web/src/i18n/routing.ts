import { defineRouting } from "next-intl/routing";

/**
 * Defines all supported locales and the default locale.
 * next-intl uses this to:
 *  - Generate locale-prefixed URLs  e.g. /en/search  /hi/search
 *  - Redirect users to their preferred language automatically
 *  - Validate locale params in layouts and pages
 */
export const routing = defineRouting({
  // All supported locales — add more here as FlexiStay expands
  locales: ["en", "hi", "ta", "te", "kn", "ml"],

  // Shown when no locale matches (e.g. direct visit to /search → /en/search)
  defaultLocale: "en",

  // Keep locale prefix in URL always: /en/... /hi/... etc.
  localePrefix: "always",
});

// Convenience types used throughout the app
export type Locale = (typeof routing.locales)[number];
