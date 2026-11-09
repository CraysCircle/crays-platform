import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const clubsDocumentLanguages = new Set(["en", "de", "es", "ca", "fr", "pt", "it"]);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRAYS Platform",
  description: "Unified operating platform for CRAYS.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg?v=crays-favicon-4", sizes: "any", type: "image/svg+xml" },
      { url: "/favicon.png?v=crays-favicon-4", sizes: "512x512", type: "image/png" },
      { url: "/icon.png?v=crays-favicon-4", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.svg?v=crays-favicon-4", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png?v=crays-favicon-4", sizes: "180x180", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const requestedLanguage = requestHeaders.get("x-crays-document-language") ?? "en";
  const documentLanguage = clubsDocumentLanguages.has(requestedLanguage)
    ? requestedLanguage
    : "en";

  return (
    <html lang={documentLanguage} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
