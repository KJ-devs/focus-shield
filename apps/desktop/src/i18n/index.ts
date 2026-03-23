import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import ja from "./locales/ja.json";

const savedLang = localStorage.getItem("focus-shield-lang") ?? "en";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
    de: { translation: de },
    ja: { translation: ja },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export const LANGUAGES = [
  { code: "en", label: "English", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { code: "fr", label: "Fran\u00e7ais", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  { code: "es", label: "Espa\u00f1ol", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
  { code: "de", label: "Deutsch", flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { code: "ja", label: "\u65E5\u672C\u8A9E", flag: "\uD83C\uDDEF\uD83C\uDDF5" },
] as const;

export function changeLanguage(code: string): void {
  void i18n.changeLanguage(code);
  localStorage.setItem("focus-shield-lang", code);
}

export default i18n;
