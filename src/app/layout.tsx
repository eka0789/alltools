import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AllTools — The Developer Dictionary",
    template: "%s | AllTools",
  },
  description:
    "Search thousands of developer tools, resources, services, documentation and AI tools. One search for every developer need.",
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
      "Everything developers need, in one place. Search thousands of tools, resources and AI services.",
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: "AllTools — The Developer Dictionary",
    description: "Everything developers need, in one place.",
  },
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
      </head>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
