import en, { I18nKey } from "./en";
import hi from "./hi";

export type Lang = "en" | "hi";

const dicts: Record<Lang, Record<I18nKey, string>> = { en, hi };

export function translate(lang: Lang, key: I18nKey | string): string {
  const d = dicts[lang] as Record<string, string>;
  return d[key] ?? (dicts.en as Record<string, string>)[key] ?? key;
}

export { en, hi };
export type { I18nKey };
