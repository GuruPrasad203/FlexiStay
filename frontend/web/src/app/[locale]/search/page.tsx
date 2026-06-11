import { useTranslations } from "next-intl";

export default function SearchPage() {
  const t = useTranslations("Search");

  return (
    <main className="min-h-screen px-4 py-12 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">
        {t("title")}
      </h1>
      <p className="text-muted-foreground mb-8">
        Search functionality coming in Phase 2.
      </p>

      {/* Placeholder search bar */}
      <div className="w-full border border-border rounded-lg px-4 py-3 text-muted-foreground bg-muted">
        {t("placeholder")}
      </div>
    </main>
  );
}
