import { addMessages, init, getLocaleFromNavigator, locale, _, isLoading, waitLocale } from "svelte-i18n";

import en from "./locales/en.json";
import uk from "./locales/uk.json";
import ru from "./locales/ru.json";

export const SUPPORTED_LOCALES = ["en", "ru", "uk"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
	en: "English",
	ru: "Русский",
	uk: "Українська",
};

const STORAGE_KEY = "locale";
const DEFAULT_LOCALE: SupportedLocale = "en";

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
	return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function detectInitialLocale(): SupportedLocale {
	if (typeof localStorage !== "undefined") {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (isSupportedLocale(stored)) return stored;
	}

	const navigatorLocale = getLocaleFromNavigator();
	const short = navigatorLocale?.split("-")[0];
	if (isSupportedLocale(short)) return short;

	return DEFAULT_LOCALE;
}

addMessages("en", en);
addMessages("uk", uk);
addMessages("ru", ru);

init({
	fallbackLocale: DEFAULT_LOCALE,
	initialLocale: detectInitialLocale(),
});

export function setLocale(next: SupportedLocale) {
	locale.set(next);
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(STORAGE_KEY, next);
	}
	if (typeof document !== "undefined") {
		document.documentElement.lang = next;
	}
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions, currentLocale: string | null | undefined): string {
	return date.toLocaleString(currentLocale ?? DEFAULT_LOCALE, options);
}

export { locale, _, isLoading, waitLocale };
