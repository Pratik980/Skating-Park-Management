import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from '../translations/en.json';
import npTranslations from '../translations/np.json';
import hiTranslations from '../translations/hi.json';

const LanguageContext = createContext();

const translations = {
  en: enTranslations,
  np: npTranslations,
  hi: hiTranslations
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language');
    if (savedLanguage && translations[savedLanguage]) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  // Update html lang + persist
  useEffect(() => {
    localStorage.setItem('app-language', currentLanguage);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', currentLanguage);
    }
  }, [currentLanguage]);

  const t = (key, section = 'common') => {
    const keys = key.split('.');
    let value = translations[currentLanguage];

    for (const k of keys) {
      value = value?.[k];
    }

    // If translation not found in current language, try English as fallback
    if (!value && currentLanguage !== 'en') {
      value = translations.en;
      for (const k of keys) {
        value = value?.[k];
      }
    }

    return value || key;
  };

  const changeLanguage = (language) => {
    if (translations[language]) {
      setCurrentLanguage(language);
    }
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    availableLanguages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'np', name: 'Nepali', nativeName: 'नेपाली' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
