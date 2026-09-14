import en, { I18nKey } from "./en";
import hi from "./hi";

export type Lang = "en" | "hi";

const dicts: Record<Lang, Record<I18nKey, string>> = { en, hi };

/** Strict lookup — missing keys render as a loud marker, never a silent fallback. */
export function translate(lang: Lang, key: I18nKey | string): string {
  const d = dicts[lang] as Record<string, string>;
  const v = d[key];
  if (v === undefined) return `[MISSING I18N: ${key}]`;
  return v;
}

export { en, hi };
export type { I18nKey };
