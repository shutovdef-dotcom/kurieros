// Single source of truth for the locales the site supports. Imported
// by every translation slice + the index assembler so each Record key
// set stays in lock-step.
//
// Adding a new locale: extend the tuple here, add a new entry in
// every record under ./, and the type system will surface every
// missing key.

export const SUPPORTED_LANGUAGES = ['ru', 'uz', 'tg', 'ky', 'hy', 'kk', 'az', 'uk', 'be', 'hi', 'vi', 'zh'] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
