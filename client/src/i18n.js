import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import your translation files
import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: enTranslation,
      fr: frTranslation,
    },
    lng: 'fr', // default language
    fallbackLng: 'en', // fallback language if current language not found

    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
