import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { countVisit, useInstallPrompt } from '../hooks/useInstallPrompt';
import { useT } from '../i18n/LanguageContext';

// Never interrupt someone who is paying, signing in, or managing the store
const HIDDEN_ON = /^\/(checkout|login|register|admin)(\/|$)/;

const InstallPrompt = () => {
  const { pathname } = useLocation();
  const { t } = useT();
  const cartCount = useSelector((state) => state.cart?.cartItems?.length ?? 0);
  const { canInstall, iosSteps, dismissedRecently, install, dismiss } = useInstallPrompt();
  const [visits] = useState(countVisit);
  const [showSteps, setShowSteps] = useState(false);

  // Ask only after the customer has shown interest: a returning visit, something in the cart,
  // or a finished order. Never on the very first page view.
  const engaged = visits >= 2 || cartCount > 0 || pathname === '/order-success';

  if (!canInstall || dismissedRecently || !engaged || HIDDEN_ON.test(pathname)) return null;

  return (
    <section style={boxStyle} role="region" aria-label={t('install.region')}>
      <img src="/logo192.png" alt="" width="44" height="44" style={{ borderRadius: 10, flex: '0 0 auto' }} />

      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <strong style={{ display: 'block', color: '#14532d' }}>{t('install.title')}</strong>
        <span style={{ fontSize: '0.88rem', color: '#374151' }}>
          {t('install.text')}
        </span>

        {iosSteps && showSteps && (
          <ol style={stepsStyle}>
            <li>{t('install.step1')}</li>
            <li>{t('install.step2')}</li>
            <li>{t('install.step3')}</li>
          </ol>
        )}
      </div>

      {iosSteps ? (
        <button type="button" style={primaryBtn} onClick={() => setShowSteps((v) => !v)} aria-expanded={showSteps}>
          {showSteps ? t('install.hide') : t('install.how')}
        </button>
      ) : (
        <button type="button" style={primaryBtn} onClick={install}>{t('install.install')}</button>
      )}

      <button type="button" style={closeBtn} onClick={dismiss} aria-label={t('install.later')}>✕</button>
    </section>
  );
};

const boxStyle = {
  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
  maxWidth: 1200, margin: '12px auto 0', padding: '12px 14px',
  background: '#ecfdf3', border: '1px solid #86efac', borderRadius: 14, boxSizing: 'border-box',
};
const primaryBtn = {
  minHeight: 44, padding: '0 18px', border: 'none', borderRadius: 10, cursor: 'pointer',
  background: '#1f8a43', color: '#fff', fontWeight: 700, fontSize: '0.95rem',
};
const closeBtn = {
  width: 44, height: 44, border: 'none', background: 'transparent', cursor: 'pointer',
  fontSize: '1.1rem', color: '#4b5563',
};
const stepsStyle = { margin: '8px 0 0', paddingLeft: 18, fontSize: '0.88rem', color: '#374151', lineHeight: 1.5 };

export default InstallPrompt;
