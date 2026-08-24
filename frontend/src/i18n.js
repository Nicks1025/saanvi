import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi'],
    load: 'languageOnly',
    backend: {
      loadPath: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/locales/{{lng}}.json`,
    },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
