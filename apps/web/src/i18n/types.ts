export type LocaleCode = "en" | "ru" | "tr";

export const LANGUAGE_STORAGE_KEY = "kanban_language";

export type TranslateVars = Record<string, string | number>;

export type TranslateFn = (
  key: string,
  vars?: TranslateVars,
) => string;
