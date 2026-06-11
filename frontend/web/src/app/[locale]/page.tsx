import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Home page — /en  or  /hi  etc.
 *
 * This is a React Server Component (RSC) by default in Next.js 15.
 * No "use client" needed — translations are read on the server.
 */
export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-6">

        {/* Brand */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-foreground">
            FlexiStay
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("tagline")}
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/search"
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            {t("searchCta")}
          </Link>
          <Link
            href="/hotels/register"
            className="px-8 py-3 border border-border text-foreground rounded-lg font-semibold hover:bg-muted transition-colors"
          >
            {t("partnerCta")}
          </Link>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border">
          <div>
            <p className="text-2xl font-bold text-primary">3%</p>
            <p className="text-sm text-muted-foreground">{t("stat.commission")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground">{t("stat.noShows")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">₹969</p>
            <p className="text-sm text-muted-foreground">{t("stat.perBooking")}</p>
          </div>
        </div>

      </div>
    </main>
  );
}
