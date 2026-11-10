import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en';
import hi, { serverMessages, serverPatterns, reorderReasons } from './hi';

const DICTIONARIES = { en, hi };
export const LANG_KEY = 'ab_lang';
export const SUPPORTED = ['en', 'hi'];

const fill = (text, vars) =>
  text.replace(/\{(\w+)\}/g, (whole, name) => (vars && vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : whole));

// Looks a key up in the chosen language, then English, then falls back to the key itself.
// If vars.count is 1 and "<key>_one" exists, that singular form is used.
export const translate = (lang, key, vars) => {
  const dict = DICTIONARIES[lang] || en;
  const wantsSingular = vars && vars.count === 1;
  const candidates = wantsSingular ? [`${key}_one`, key] : [key];
  for (const k of candidates) {
    const found = dict[k] ?? en[k];
    if (found !== undefined) return fill(found, vars);
  }
  return key;
};

// Server and network messages arrive in English. Known ones are translated for Hindi readers;
// anything unknown is shown as it is, never blanked.
export const translateMessage = (lang, message) => {
  if (lang !== 'hi' || typeof message !== 'string' || !message) return message;
  if (serverMessages[message]) return serverMessages[message];
  for (const [pattern, build] of serverPatterns) {
    const match = message.match(pattern);
    if (match) return build(match);
  }
  return message;
};

export const translateReason = (lang, reason) => {
  if (lang !== 'hi' || typeof reason !== 'string') return reason;
  for (const [pattern, build] of reorderReasons) {
    const match = reason.match(pattern);
    if (match) return build(match);
  }
  return reason;
};

// "Today, 6 pm - 9 pm" / "Tomorrow" come from the server in English
export const translateSlotLabel = (lang, label) => {
  if (lang !== 'hi' || typeof label !== 'string') return label;
  return label.replace(/\bToday\b/g, 'आज').replace(/\bTomorrow\b/g, 'कल');
};

export const translateCategory = (lang, name) => {
  if (!name) return name;
  const dict = DICTIONARIES[lang] || en;
  return dict[`cat.${name}`] ?? name;
};

const readStored = () => {
  try { return window.localStorage.getItem(LANG_KEY); } catch { return null; }
};

export const detectInitialLanguage = () => {
  const stored = readStored();
  if (SUPPORTED.includes(stored)) return stored;
  const browser = (typeof navigator !== 'undefined' && (navigator.language || '')) || '';
  return browser.toLowerCase().startsWith('hi') ? 'hi' : 'en';
};

const build = (lang, setLang) => ({
  lang,
  locale: lang === 'hi' ? 'hi-IN' : 'en-IN',
  setLang,
  t: (key, vars) => translate(lang, key, vars),
  // translate if the key exists, otherwise show the fallback text unchanged (for values the dictionary may not know)
  tOr: (key, fallback) => (key in en ? translate(lang, key) : fallback),
  tm: (message) => translateMessage(lang, message),
  tc: (name) => translateCategory(lang, name),
  ts: (label) => translateSlotLabel(lang, label),
  tr: (reason) => translateReason(lang, reason),
});

// Without a provider (isolated tests, storybook) everything simply stays English
const LanguageContext = createContext(build('en', () => {}));

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(detectInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang; // screen readers and browsers pick the right voice and font
    try { window.localStorage.setItem(LANG_KEY, lang); } catch { /* private mode: fine */ }
  }, [lang]);

  const setLang = useCallback((next) => {
    if (SUPPORTED.includes(next)) setLangState(next);
  }, []);

  const value = useMemo(() => build(lang, setLang), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useT = () => useContext(LanguageContext);
