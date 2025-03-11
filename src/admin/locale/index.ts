import { Locale } from 'adminjs';

import it from './it/index.js';
import en from './en/index.js';

const localeKey = process.env.LOCALE || 'en';

export const locale: Locale = {
  language: localeKey,
  availableLanguages: ['it', 'en'].sort(),
  localeDetection: true,
  withBackend: true,
  translations: {
    it,
    en,
  },
};
