import { en } from './en';
import { ha } from './ha';
import { fr } from './fr';

export type DeveloperLocale = 'en' | 'ha' | 'fr';

export const developerLocales = {
  en,
  ha,
  fr,
};

export function getDeveloperTranslation(locale: DeveloperLocale = 'en') {
  return developerLocales[locale] || developerLocales.en;
}
