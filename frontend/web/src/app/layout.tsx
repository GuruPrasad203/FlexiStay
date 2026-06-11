import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FlexiStay — Book Hotel Rooms by the Hour",
    template: "%s | FlexiStay",
  },
  description:
    "Book hotel rooms for 3–6 hours. Instant confirmation. Zero no-shows.",
};

/**
 * Root layout — required by Next.js 15 to have <html> and <body>.
 * Fonts live here. The lang attribute is set dynamically by LangSetter
 * inside the locale layout.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
