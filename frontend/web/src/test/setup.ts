import "@testing-library/jest-dom";

// Silence next-intl warnings in tests
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));
