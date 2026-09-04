import { en } from './en';
import { ha } from './ha';
import { fr } from './fr';

export type ComplianceLocale = 'en' | 'ha' | 'fr';

export const complianceLocales = {
  en,
  ha,
  fr,
};

export function getComplianceTranslation(locale: ComplianceLocale = 'en') {
  return complianceLocales[locale] || complianceLocales.en;
}
