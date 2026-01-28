import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

import { headers } from "next/headers";

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
  const csrfToken = headersList.get('x-csrf-token') || '';

  return (
    <html lang="en">
      <head>
        <meta name="csrf-token" content={csrfToken} />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
