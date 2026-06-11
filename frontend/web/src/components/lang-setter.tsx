"use client";

import { useEffect } from "react";

/**
 * Sets document.documentElement.lang on the client.
 * Needed because the root layout can't access the [locale] param,
 * so we update it here from the locale layout.
 */
export function LangSetter({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
