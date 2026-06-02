import { DEFAULT_LANGUAGE, type SupportedLanguage } from '../i18n/languages';

const TRANSLATION_API_URL = import.meta.env.VITE_TRANSLATION_API_URL as string | undefined;
const TRANSLATION_API_KEY = import.meta.env.VITE_TRANSLATION_API_KEY as string | undefined;
const TRANSLATION_PROVIDER = (import.meta.env.VITE_TRANSLATION_PROVIDER as string | undefined) || 'generic';
const cache = new Map<string, string>();

interface TranslationApiResponse {
  translatedText?: string;
  translation?: string;
  text?: string;
  data?: {
    translations?: Array<{ translatedText?: string; text?: string }>;
  };
  choices?: Array<{ message?: { content?: string }; text?: string }>;
}

const getCacheKey = (text: string, targetLanguage: SupportedLanguage, sourceLanguage: SupportedLanguage) =>
  `${sourceLanguage}:${targetLanguage}:${text}`;

export const translationService = {
  async translateDynamicText(
    text: string,
    targetLanguage: SupportedLanguage,
    sourceLanguage: SupportedLanguage = DEFAULT_LANGUAGE
  ): Promise<string> {
    const normalized = text.trim();
    if (!normalized || targetLanguage === sourceLanguage || !TRANSLATION_API_URL) return text;

    const cacheKey = getCacheKey(normalized, targetLanguage, sourceLanguage);
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const body =
        TRANSLATION_PROVIDER === 'deepl'
          ? {
              text: [normalized],
              source_lang: sourceLanguage.toUpperCase(),
              target_lang: targetLanguage.toUpperCase(),
            }
          : TRANSLATION_PROVIDER === 'openai'
            ? {
                text: normalized,
                source_language: sourceLanguage,
                target_language: targetLanguage,
              }
            : {
                q: normalized,
                text: normalized,
                source: sourceLanguage,
                target: targetLanguage,
                format: 'text',
                api_key: TRANSLATION_API_KEY,
              };

      const response = await fetch(TRANSLATION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(TRANSLATION_API_KEY ? { Authorization: `Bearer ${TRANSLATION_API_KEY}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) return text;

      const data = (await response.json()) as TranslationApiResponse;
      const translated =
        data.translatedText ||
        data.translation ||
        data.text ||
        data.data?.translations?.[0]?.translatedText ||
        data.data?.translations?.[0]?.text ||
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.text ||
        text;
      cache.set(cacheKey, translated);
      return translated;
    } catch {
      return text;
    }
  },
};
