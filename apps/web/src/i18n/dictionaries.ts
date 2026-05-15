import { flattenDict } from "./flatten";
import { enNested } from "./locales/en";
import { ruNested } from "./locales/ru";
import { trNested } from "./locales/tr";
import type { LocaleCode } from "./types";

const en = flattenDict(enNested);
const ru = flattenDict(ruNested);
const tr = flattenDict(trNested);

export const dictionaries: Record<LocaleCode, Record<string, string>> = {
  en,
  ru,
  tr,
};
