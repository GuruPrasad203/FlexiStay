import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HotelRegisterPage() {
  const t = useTranslations("Common");

  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">
        List Your Hotel on FlexiStay
      </h1>
      <p className="text-muted-foreground mb-8">
        Partner onboarding coming in Phase 2.
      </p>

      <Link
        href="/"
        className="text-primary underline underline-offset-4 hover:text-primary/80"
      >
        ← {t("back")}
      </Link>
    </main>
  );
}
