import { en } from './en';
import { ha } from './ha';
import { fr } from './fr';

export type SupportLocale = 'en' | 'ha' | 'fr';

export const supportLocales = {
  en,
  ha,
  fr,
};

export function getSupportTranslation(locale: SupportLocale = 'en') {
  return supportLocales[locale] || supportLocales.en;
}
