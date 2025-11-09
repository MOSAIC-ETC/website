import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { normalizeRequestedLocale, routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment (can be alias like "en")
  const requested = normalizeRequestedLocale(await requestLocale);
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../locales/${locale}.json`)).default,
  };
});
