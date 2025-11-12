import { defineRouting } from "next-intl/routing";

// Mapping of internal locales to short public prefixes
export const locales: Record<string, { name: string; flag: string; pathPrefix: string }> = {
  "pt-BR": { name: "Português", flag: "/assets/images/flags/pt-BR.svg", pathPrefix: "/pt" },
  "en-US": { name: "English", flag: "/assets/images/flags/en-US.svg", pathPrefix: "/en" },
  "fr-FR": { name: "Français", flag: "/assets/images/flags/fr-FR.svg", pathPrefix: "/fr" },
};

export const routing = defineRouting({
  locales: Object.keys(locales),
  defaultLocale: "pt-BR",
  localePrefix: {
    mode: "as-needed",
    prefixes: Object.entries(locales).reduce((acc, [locale, meta]) => {
      acc[locale] = meta.pathPrefix;
      return acc;
    }, {} as Record<string, string>),
  },
  localeCookie: {
    name: "USER_LOCALE",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
  pathnames: {
    "/": "/",
    "/etc": "/etc",
    "/docs": "/docs",

    "/login": {
      "pt-BR": "/entrar",
      "en-US": "/login",
      "fr-FR": "/connexion",
    },
    "/register": {
      "pt-BR": "/registrar",
      "en-US": "/register",
      "fr-FR": "/inscription",
    },
    "/logout": {
      "pt-BR": "/sair",
      "en-US": "/logout",
      "fr-FR": "/deconnexion",
    },

    "/admin": "/admin",
    "/admin/users": {
      "pt-BR": "/admin/usuarios",
      "en-US": "/admin/users",
      "fr-FR": "/admin/utilisateurs",
    },
    "/admin/settings": {
      "pt-BR": "/admin/configuracoes",
      "en-US": "/admin/settings",
      "fr-FR": "/admin/parametres",
    },

    "/about": {
      "pt-BR": "/sobre",
      "en-US": "/about",
      "fr-FR": "/a-propos",
    },
    "/contact": {
      "pt-BR": "/contato",
      "en-US": "/contact",
      "fr-FR": "/contact",
    },
    "/privacy-policy": {
      "pt-BR": "/politica-de-privacidade",
      "en-US": "/privacy-policy",
      "fr-FR": "/politique-de-confidentialite",
    },
    "/terms-of-service": {
      "pt-BR": "/termos-de-servico",
      "en-US": "/terms-of-service",
      "fr-FR": "/conditions-dutilisation",
    },
  },
});

// Helper to normalize something that could be a public prefix (without slash) or full code
export function normalizeRequestedLocale(requested: string | undefined): string | undefined {
  if (!requested) return undefined;
  if (routing.locales.includes(requested)) return requested; // already full

  // Strip possible leading slash (should not be present in param but defensive)
  const trimmed = requested.replace(/^\//, "");

  // Find matching locale by prefix value (without leading slash)
  const entry = Object.entries(locales).find(([, meta]) => meta.pathPrefix.slice(1) === trimmed);
  return entry ? entry[0] : undefined;
}
