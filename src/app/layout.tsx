import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { cookies, headers } from "next/headers";
import { RateLimitOverlay } from "@/components/security/RateLimitOverlay";
import { Yeseva_One } from "next/font/google";
import {
  AUTH_LOCALE_COOKIE,
  getAuthMessages,
  resolveAuthLocale,
} from "@/i18n/config";

const yesevaOne = Yeseva_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-title-serif",
});

export const metadata: Metadata = {
  title: "Xynes Auth",
  description: "Authentication for Xynes platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);
  const csrfToken = headersList.get("x-csrf-token") || "";
  const locale = resolveAuthLocale({
    cookieLocale: cookieStore.get(AUTH_LOCALE_COOKIE)?.value,
    acceptLanguage: headersList.get("accept-language"),
  });
  const messages = getAuthMessages(locale);

  return (
    <html lang={locale}>
      <head>
        <meta name="csrf-token" content={csrfToken} />
      </head>
      <body
        className={`min-h-screen bg-background antialiased ${yesevaOne.variable}`}
      >
        <Providers locale={locale} messages={messages}>
          {children}
          <RateLimitOverlay />
        </Providers>
      </body>
    </html>
  );
}
