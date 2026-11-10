import React from 'react';
import { useT } from '../i18n/LanguageContext';

// One tap switches between English and Hindi. The label names the language you will get.
const LanguageToggle = ({ onChange }) => {
  const { lang, setLang, t } = useT();

  return (
    <button
      type="button"
      className="lang-toggle"
      lang={lang === 'en' ? 'hi' : 'en'}
      onClick={() => {
        setLang(lang === 'en' ? 'hi' : 'en');
        if (onChange) onChange();
      }}
      aria-label={t('lang.switchAria')}
      style={toggleStyle}
    >
      {t('lang.switchTo')}
    </button>
  );
};

const toggleStyle = {
  minHeight: 44, minWidth: 44, padding: '0 14px', borderRadius: 999, cursor: 'pointer',
  border: '1px solid currentColor', background: 'transparent', color: 'inherit',
  fontWeight: 700, fontSize: '0.95rem',
};

export default LanguageToggle;
