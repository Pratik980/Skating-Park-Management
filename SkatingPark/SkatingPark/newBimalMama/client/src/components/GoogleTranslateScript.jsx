import { useEffect } from 'react';

function setGoogleTranslateLanguage(lang) {
  try {
    // Google Translate injects a hidden iframe with a select menu we can manipulate
    const select = document.querySelector('select.goog-te-combo');
    if (select && lang) {
      if (select.value === lang) return; // Already set
      select.value = lang;
      // Trigger change event
      select.dispatchEvent(new Event('change'));
    }
  } catch (e) { /* ignore */ }
}

const GoogleTranslateScript = () => {
  useEffect(() => {
    if (window.googleTranslateElementInit) return;
    window.setGoogleTranslateLanguage = setGoogleTranslateLanguage;
    window.googleTranslateElementInit = function () {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          { pageLanguage: 'en' },
          'google_translate_element'
        );
        // If a default language is specified (window.PREFERRED_GT_LANG), switch
        setTimeout(() => {
          if (window.PREFERRED_GT_LANG) {
            setGoogleTranslateLanguage(window.PREFERRED_GT_LANG);
          }
        }, 600);
      }
    };
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, []);
  return null;
};

export default GoogleTranslateScript;
