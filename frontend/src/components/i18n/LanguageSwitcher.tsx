import { Languages } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SupportedLanguage } from '../../i18n/languages';

export default function LanguageSwitcher() {
  const { language, languages, setLanguage, t } = useLanguage();

  return (
    <label
      className="relative flex h-9 items-center gap-1 rounded-full border border-theme-subtle bg-theme-surface pl-2 pr-1 text-theme-muted shadow-theme-sm transition hover:border-secondary/30 hover:bg-secondary/10 hover:text-secondary sm:h-10 sm:gap-2 sm:pl-3"
      title={t('Langue')}
      aria-label={t('Langue')}
    >
      <Languages className="h-4 w-4 sm:h-5 sm:w-5" />
      <select
        value={language}
        onChange={event => setLanguage(event.target.value as SupportedLanguage)}
        className="h-full min-w-[44px] cursor-pointer appearance-none bg-transparent pr-2 text-xs font-semibold uppercase outline-none sm:min-w-[92px] sm:text-sm sm:normal-case"
      >
        {languages.map(option => (
          <option key={option.code} value={option.code}>
            {option.shortLabel}
            {' - '}
            {option.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
