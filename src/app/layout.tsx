import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { headers } from "next/headers";
import { RateLimitOverlay } from "@/components/security/RateLimitOverlay";
import { Yeseva_One } from "next/font/google";

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
  const headersList = await headers();
  const csrfToken = headersList.get("x-csrf-token") || "";

  return (
    <html lang="en">
      <head>
        <meta name="csrf-token" content={csrfToken} />
      </head>
      <body
        className={`min-h-screen bg-background antialiased ${yesevaOne.variable}`}
      >
        <Providers>
          {children}
          <RateLimitOverlay />
        </Providers>
      </body>
    </html>
  );
}
