import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// Languages the app supports. To add Oromo later: add "om" here and create messages/om.json.
export const LOCALES = ["en", "am"] as const;
export type Locale = (typeof LOCALES)[number];

// Runs on the SERVER for every request: reads the visitor's language cookie
// and loads the matching translation file.
export default getRequestConfig(async () => {
  const saved = cookies().get("NEXT_LOCALE")?.value;
  const locale: Locale = LOCALES.includes(saved as Locale) ? (saved as Locale) : "en";
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});