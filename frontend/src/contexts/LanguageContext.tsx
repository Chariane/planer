/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  detectBrowserLanguage,
  getLanguageOption,
  hasLocalUiTranslation,
  resolveUiSourceText,
  translateUiText,
  type SupportedLanguage,
} from '../i18n/languages';
import { translationService } from '../services/translation.service';

interface LanguageContextValue {
  language: SupportedLanguage;
  locale: string;
  languages: typeof SUPPORTED_LANGUAGES;
  setLanguage: (language: SupportedLanguage) => void;
  t: (text: string) => string;
  translateDynamicText: (text: string, sourceLanguage?: SupportedLanguage) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const originalTextByNode = new WeakMap<Text, string>();
const dynamicTextCache = new Map<string, string>();
const pendingDynamicTexts = new Set<string>();
const translatedAttributes = ['placeholder', 'title', 'aria-label'] as const;

const shouldSkipElement = (element: Element | null): boolean => {
  if (!element) return true;
  return Boolean(
    element.closest(
      'script, style, noscript, code, pre, textarea, [data-i18n-skip], [translate="no"], .notranslate'
    )
  );
};

const getDynamicCacheKey = (text: string, language: SupportedLanguage) => `${language}:${text}`;

const isCachedDynamicTranslation = (
  currentValue: string,
  originalValue: string,
  language: SupportedLanguage
): boolean => {
  const normalizedOriginal = resolveUiSourceText(originalValue).trim();
  const cached = dynamicTextCache.get(getDynamicCacheKey(normalizedOriginal, language));
  return Boolean(cached && currentValue.trim() === cached.trim());
};

const isProbablyNonTranslatable = (text: string): boolean => {
  const normalized = text.trim();
  if (!normalized || normalized.length < 3) return true;
  if (/^[\d\s.,:/\\|()[\]{}%+-]+$/.test(normalized)) return true;
  if (/^[a-f0-9]{10,}$/i.test(normalized)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return true;
  if (/^https?:\/\//i.test(normalized)) return true;
  if (/^[A-Z]{2,5}$/.test(normalized)) return true;
  return false;
};

const applyDynamicTextTranslation = (
  originalValue: string,
  language: SupportedLanguage,
  applyValue: (translatedValue: string) => void
) => {
  const sourceValue = resolveUiSourceText(originalValue);
  const normalized = sourceValue.trim();
  if (
    language === DEFAULT_LANGUAGE ||
    hasLocalUiTranslation(sourceValue, language) ||
    isProbablyNonTranslatable(sourceValue)
  ) {
    return;
  }

  const cacheKey = getDynamicCacheKey(normalized, language);
  const cached = dynamicTextCache.get(cacheKey);
  if (cached) {
    applyValue(sourceValue.replace(normalized, cached));
    return;
  }
  if (pendingDynamicTexts.has(cacheKey)) return;

  pendingDynamicTexts.add(cacheKey);
  translationService
    .translateDynamicText(normalized, language)
    .then(translated => {
      if (translated && translated !== normalized) {
        dynamicTextCache.set(cacheKey, translated);
        applyValue(sourceValue.replace(normalized, translated));
      }
    })
    .finally(() => {
      pendingDynamicTexts.delete(cacheKey);
    });
};

const translateAttributes = (root: ParentNode, language: SupportedLanguage) => {
  const elements = root.querySelectorAll<HTMLElement>('[placeholder], [title], [aria-label]');

  elements.forEach(element => {
    if (shouldSkipElement(element)) return;

    translatedAttributes.forEach(attribute => {
      const currentValue = element.getAttribute(attribute);
      if (!currentValue) return;

      const dataKey = `i18nOriginal${attribute.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;
      const storedOriginal = element.dataset[dataKey];
      const storedTranslation = storedOriginal ? translateUiText(storedOriginal, language) : null;
      const originalValue =
        storedOriginal &&
        (currentValue === storedOriginal ||
          currentValue === storedTranslation ||
          isCachedDynamicTranslation(currentValue, storedOriginal, language))
          ? storedOriginal
          : currentValue;
      element.dataset[dataKey] = originalValue;
      const nextValue = translateUiText(originalValue, language);
      if (currentValue !== nextValue) element.setAttribute(attribute, nextValue);
      applyDynamicTextTranslation(originalValue, language, translatedValue => {
        if (element.isConnected && element.getAttribute(attribute) !== translatedValue) {
          element.setAttribute(attribute, translatedValue);
        }
      });
    });
  });
};

const translateTextNodes = (root: ParentNode, language: SupportedLanguage) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue || '';
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      if (shouldSkipElement(node.parentElement)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  nodes.forEach(node => {
    const currentValue = node.nodeValue || '';
    const storedOriginal = originalTextByNode.get(node);
    const storedTranslation = storedOriginal ? translateUiText(storedOriginal, language) : null;
    const originalValue =
      storedOriginal &&
      (currentValue === storedOriginal ||
        currentValue === storedTranslation ||
        isCachedDynamicTranslation(currentValue, storedOriginal, language))
        ? storedOriginal
        : currentValue;
    originalTextByNode.set(node, originalValue);
    const nextValue = translateUiText(originalValue, language);
    if (currentValue !== nextValue) node.nodeValue = nextValue;
    applyDynamicTextTranslation(originalValue, language, translatedValue => {
      if (node.isConnected && originalTextByNode.get(node) === originalValue && node.nodeValue !== translatedValue) {
        node.nodeValue = translatedValue;
      }
    });
  });
};

const translateDocument = (language: SupportedLanguage) => {
  if (typeof document === 'undefined' || !document.body) return;
  translateTextNodes(document.body, language);
  translateAttributes(document.body, language);
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => detectBrowserLanguage());

  const setLanguage = useCallback((nextLanguage: SupportedLanguage) => {
    setLanguageState(nextLanguage);
  }, []);

  const t = useCallback((text: string) => translateUiText(text, language), [language]);
  const translateDynamicText = useCallback(
    (text: string, sourceLanguage: SupportedLanguage = DEFAULT_LANGUAGE) =>
      translationService.translateDynamicText(text, language, sourceLanguage),
    [language]
  );
  const locale = getLanguageOption(language).locale;

  useLayoutEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    translateDocument(language);
  }, [language]);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return undefined;

    let frameId: number | null = null;
    const scheduleTranslation = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        translateDocument(language);
        frameId = null;
      });
    };

    const observer = new MutationObserver(scheduleTranslation);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });

    scheduleTranslation();

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      locale,
      languages: SUPPORTED_LANGUAGES,
      setLanguage,
      t,
      translateDynamicText,
    }),
    [language, locale, setLanguage, t, translateDynamicText]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: DEFAULT_LANGUAGE,
      locale: getLanguageOption(DEFAULT_LANGUAGE).locale,
      languages: SUPPORTED_LANGUAGES,
      setLanguage: () => undefined,
      t: (text: string) => text,
      translateDynamicText: async (text: string) => text,
    };
  }
  return context;
};
