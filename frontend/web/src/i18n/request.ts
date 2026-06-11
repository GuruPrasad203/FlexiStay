import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Called on every server request.
 * Loads the correct message file for the requested locale.
 *
 * e.g. /hi/search  →  loads messages/hi.json
 *      /en/booking →  loads messages/en.json
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // Validate the incoming locale against our supported list
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    // Dynamically import only the needed language file — keeps bundles small
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
