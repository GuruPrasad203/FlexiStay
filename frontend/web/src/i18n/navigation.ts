import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation helpers.
 * Use these instead of Next.js built-ins so links always include the locale.
 *
 * Usage:
 *   import { Link, redirect, useRouter, usePathname } from "@/i18n/navigation"
 *
 *   <Link href="/search" />   →  renders as  /en/search  or  /hi/search
 *   redirect("/booking")      →  redirects to  /en/booking
 */
export const { Link, redirect, useRouter, usePathname, getPathname } =
  createNavigation(routing);
