import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { CompareTray } from "@/components/compare-tray";
import { ServiceWorkerRegistration } from "@/components/sw-register";
import { AccountSync } from "@/components/account-sync";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AllTools — The Developer Dictionary",
    template: "%s | AllTools",
  },
  description:
    "Search hundreds of curated developer tools, resources, services, documentation and AI tools. One search for every developer need.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  keywords: [
    "developer tools",
    "dev tools directory",
    "API testing tools",
    "JSON formatter",
    "regex tester",
    "AI coding tools",
    "developer resources",
  ],
  openGraph: {
    type: "website",
    siteName: "AllTools",
    title: "AllTools — The Developer Dictionary",
    description:
      "Everything developers need, in one place. Search hundreds of curated tools, resources and AI services.",
    url: siteUrl,
  },
  // No twitter.title/description here: X cards fall back to the per-page
  // og:title/og:description, so tool/category/glossary cards get specific
  // copy instead of this root default everywhere.
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('alltools-theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Native form controls, scrollbars and autofill follow in dark mode */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0c" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <CompareTray />
        <ChatWidget />
        <AccountSync />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
