import Script from "next/script";

// Privacy-friendly visitor analytics, fully opt-in via env vars. Nothing is
// loaded (and no third-party request is made) until the corresponding
// NEXT_PUBLIC_* variables are set, so local dev and preview deploys stay
// clean by default.
//
//   Plausible: NEXT_PUBLIC_PLAUSIBLE_DOMAIN="alldevtools.vercel.app"
//   Umami:     NEXT_PUBLIC_UMAMI_SCRIPT_URL="https://…/script.js"
//              NEXT_PUBLIC_UMAMI_WEBSITE_ID="…"
//
// Both are cookie-free and don't require a consent banner; events are
// pageview + automatic outbound-link tracking.

export function Analytics() {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim();
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim();

  return (
    <>
      {plausibleDomain ? (
        <Script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      ) : null}
      {umamiSrc && umamiWebsiteId ? (
        <Script
          defer
          src={umamiSrc}
          data-website-id={umamiWebsiteId}
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}
