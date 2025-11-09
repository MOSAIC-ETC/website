import { defineRouting } from "next-intl/routing";

// Mapping of internal locales to short public prefixes
export const localePrefixes: Record<string, string> = {
  "pt-BR": "/pt",
  "en-US": "/en",
  "fr-FR": "/fr",
};

export const routing = defineRouting({
  locales: Object.keys(localePrefixes),
  defaultLocale: "pt-BR",
  localePrefix: {
    mode: "as-needed",
    prefixes: localePrefixes,
  },
  localeCookie: {
    name: "USER_LOCALE",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
});

// Helper to normalize something that could be a public prefix (without slash) or full code
export function normalizeRequestedLocale(requested: string | undefined): string | undefined {
  if (!requested) return undefined;
  if (routing.locales.includes(requested)) return requested; // already full

  // Strip possible leading slash (should not be present in param but defensive)
  const trimmed = requested.replace(/^\//, "");

  // Find matching locale by prefix value (without leading slash)
  const entry = Object.entries(localePrefixes).find(([, prefix]) => prefix.slice(1) === trimmed);
  return entry ? entry[0] : undefined;
}
