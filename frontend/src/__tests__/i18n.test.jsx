import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

import cartReducer from '../redux/cartSlice';
import { AuthContext } from '../context/AuthContext';
import { ToastProvider } from '../components/Toast';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import PhoneLogin from '../components/PhoneLogin';
import en from '../i18n/en';
import hi from '../i18n/hi';
import {
  LanguageProvider, LANG_KEY, translate, translateMessage, translateSlotLabel,
  translateCategory, translateReason, detectInitialLanguage,
} from '../i18n/LanguageContext';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// The dictionaries
// ---------------------------------------------------------------------------
describe('dictionaries', () => {
  const enKeys = Object.keys(en);
  const hiKeys = Object.keys(hi);
  const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');

  test('Hindi has exactly the same keys as English', () => {
    expect(enKeys.filter((k) => !(k in hi))).toEqual([]);   // untranslated
    expect(hiKeys.filter((k) => !(k in en))).toEqual([]);   // stray
  });

  test('no empty strings', () => {
    expect(enKeys.filter((k) => !String(en[k]).trim())).toEqual([]);
    expect(hiKeys.filter((k) => !String(hi[k]).trim())).toEqual([]);
  });

  test('every {placeholder} survives translation (a missing one would show blank or raw text)', () => {
    const broken = enKeys.filter((k) => placeholders(en[k]) !== placeholders(hi[k]));
    expect(broken).toEqual([]);
  });

  test('Hindi text really is Hindi (Devanagari) for customer-facing sentences', () => {
    const notHindi = hiKeys.filter((k) => !k.startsWith('cat.') && !/[\u0900-\u097F]/.test(hi[k]));
    // Allowed: values that are legitimately language-neutral
    expect(notHindi.filter((k) => !['lang.switchTo'].includes(k))).toEqual([]);
  });

  test('every key used in the source code exists in both languages', () => {
    const files = [];
    const walk = (dir) => {
      fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['__tests__', 'i18n'].includes(entry.name)) walk(full);
        } else if (/\.(jsx?|js)$/.test(entry.name)) files.push(full);
      });
    };
    walk(path.join(__dirname, '..'));

    const used = new Set();
    files.forEach((file) => {
      const text = fs.readFileSync(file, 'utf8');
      // t('a.b')  t("a.b")  t(`a.b`)  — plain literal keys only
      for (const m of text.matchAll(/\bt\(\s*(['"`])([A-Za-z0-9_.]+)\1/g)) used.add(m[2]);
    });

    expect(used.size).toBeGreaterThan(150); // the scan is really finding things
    const missingEn = [...used].filter((k) => !(k in en));
    const missingHi = [...used].filter((k) => !(k in hi));
    expect(missingEn).toEqual([]);
    expect(missingHi).toEqual([]);
  });

  test('keys that are built at run time all exist', () => {
    const built = [];
    ['s1', 's2', 's3', 's4'].forEach((id) => ['title', 'subtitle', 'cta'].forEach((f) => built.push(`hero.${id}.${f}`)));
    ['newest', 'priceLow', 'priceHigh', 'name'].forEach((s) => built.push(`shop.sort.${s}`));
    ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'].forEach((s) => built.push(`orderStatus.${s}`));
    ['cod_pending', 'payment_pending', 'paid', 'failed', 'refund_pending', 'refunded'].forEach((s) => built.push(`payStatus.${s}`));
    expect(built.filter((k) => !(k in en) || !(k in hi))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The helpers
// ---------------------------------------------------------------------------
describe('translation helpers', () => {
  test('fills {values}, uses the singular form for count 1, falls back to English then the key', () => {
    expect(translate('en', 'card.onlyLeft', { count: 3 })).toBe('Only 3 left');
    expect(translate('hi', 'card.onlyLeft', { count: 3 })).toBe('सिर्फ़ 3 बचे हैं');
    expect(translate('en', 'shop.count', { count: 1 })).toBe('1 product');
    expect(translate('en', 'shop.count', { count: 5 })).toBe('5 products');
    expect(translate('en', 'no.such.key')).toBe('no.such.key');
    expect(translate('fr', 'nav.shop')).toBe('Shop'); // unknown language falls back to English
    expect(translate('en', 'card.added', {})).toBe('{name} added to cart'); // missing value is left visible, not blanked
  });

  test('server messages: known ones are translated, unknown ones are left untouched', () => {
    expect(translateMessage('hi', 'That code is not correct.')).toBe('यह कोड सही नहीं है।');
    expect(translateMessage('hi', 'Please wait 12 seconds before asking for another code.')).toContain('12');
    expect(translateMessage('hi', 'Sorry, we do not deliver to PIN code 110001 yet. Please call the store.')).toContain('110001');
    expect(translateMessage('hi', 'Some brand new server error')).toBe('Some brand new server error');
    expect(translateMessage('en', 'That code is not correct.')).toBe('That code is not correct.');
    expect(translateMessage('hi', undefined)).toBeUndefined();
  });

  test('stock message from the server keeps product names and numbers', () => {
    const out = translateMessage('hi', 'Some items are not available in the quantity you chose: Atta (only 2 left), Dal (unavailable)');
    expect(out).toContain('Atta');
    expect(out).toContain('सिर्फ़ 2 बचे हैं');
    expect(out).toContain('उपलब्ध नहीं');
  });

  test('slot labels, categories and reorder reasons', () => {
    expect(translateSlotLabel('hi', 'Today, 6 pm - 9 pm')).toBe('आज, 6 pm - 9 pm');
    expect(translateSlotLabel('hi', 'Tomorrow')).toBe('कल');
    expect(translateSlotLabel('en', 'Today, 6 pm - 9 pm')).toBe('Today, 6 pm - 9 pm');
    expect(translateCategory('hi', 'Namkeen')).toBe('नमकीन');
    expect(translateCategory('hi', 'Brand New Category')).toBe('Brand New Category'); // store-defined names pass through
    expect(translateReason('hi', 'only 4 left')).toBe('सिर्फ़ 4 बचे हैं');
    expect(translateReason('hi', 'no longer available')).toBe('अब उपलब्ध नहीं');
  });
});

// ---------------------------------------------------------------------------
// Choosing and remembering the language
// ---------------------------------------------------------------------------
describe('language choice', () => {
  const setBrowserLanguage = (value) => Object.defineProperty(window.navigator, 'language', { value, configurable: true });

  beforeEach(() => {
    localStorage.clear();
    setBrowserLanguage('en-US');
    document.documentElement.lang = 'en';
  });

  test('a Hindi phone starts in Hindi, anything else in English', () => {
    setBrowserLanguage('hi-IN');
    expect(detectInitialLanguage()).toBe('hi');
    setBrowserLanguage('en-IN');
    expect(detectInitialLanguage()).toBe('en');
    setBrowserLanguage('ta-IN');
    expect(detectInitialLanguage()).toBe('en');
  });

  test('a saved choice beats the phone language, and garbage is ignored', () => {
    setBrowserLanguage('hi-IN');
    localStorage.setItem(LANG_KEY, 'en');
    expect(detectInitialLanguage()).toBe('en');
    localStorage.setItem(LANG_KEY, 'klingon');
    expect(detectInitialLanguage()).toBe('hi');
  });
});

// ---------------------------------------------------------------------------
// The toggle in the real components
// ---------------------------------------------------------------------------
const makeStore = () => configureStore({ reducer: { cart: cartReducer } });
const authValue = (user = null) => ({ user, login: jest.fn(), logout: jest.fn() });

const renderApp = (ui, { user = null, route = '/shop', store = makeStore() } = {}) =>
  render(
    <Provider store={store}>
      <LanguageProvider>
        <AuthContext.Provider value={authValue(user)}>
          <MemoryRouter initialEntries={[route]}>
            <ToastProvider>{ui}</ToastProvider>
          </MemoryRouter>
        </AuthContext.Provider>
      </LanguageProvider>
    </Provider>
  );

const jsonResponse = (body, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });

describe('language toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true });
    document.documentElement.lang = 'en';
    global.fetch = jest.fn(() => jsonResponse({ products: [], total: 0 }));
  });

  test('one tap switches the navbar to Hindi, sets the page language, and is remembered', () => {
    const first = renderApp(<Navbar />);
    expect(screen.getByRole('link', { name: 'Shop' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /switch to hindi/i }));

    expect(screen.getByRole('link', { name: 'दुकान' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /कार्ट \(0\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'भाषा बदलकर अंग्रेज़ी करें' })).toHaveTextContent('English');
    expect(document.documentElement.lang).toBe('hi');
    expect(localStorage.getItem(LANG_KEY)).toBe('hi');

    // next visit: still Hindi
    first.unmount();
    renderApp(<Navbar />);
    expect(screen.getByRole('link', { name: 'दुकान' })).toBeInTheDocument();
  });

  test('and back to English', () => {
    localStorage.setItem(LANG_KEY, 'hi');
    renderApp(<Navbar />);
    fireEvent.click(screen.getByRole('button', { name: 'भाषा बदलकर अंग्रेज़ी करें' }));
    expect(screen.getByRole('link', { name: 'Shop' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  test('the logged-in greeting is translated but the customer\'s name is left alone', () => {
    localStorage.setItem(LANG_KEY, 'hi');
    renderApp(<Navbar />, { user: { name: 'Riya', role: 'user' } });
    expect(screen.getByRole('link', { name: 'नमस्ते, Riya' })).toBeInTheDocument();
  });

  test('product cards switch language but product names stay as the store typed them', () => {
    localStorage.setItem(LANG_KEY, 'hi');
    const product = { _id: 'p1', name: 'Aashirvaad Atta', price: 250, stock: 3, imageUrl: 'x.jpg' };
    renderApp(<ProductCard product={product} />);
    expect(screen.getByText('Aashirvaad Atta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'कार्ट में डालें' })).toBeInTheDocument();
    expect(screen.getByText('सिर्फ़ 3 बचे हैं')).toBeInTheDocument();
  });

  test('sign-in: server errors reach a Hindi reader in Hindi', async () => {
    localStorage.setItem(LANG_KEY, 'hi');
    global.fetch = jest.fn((url) => {
      if (String(url).includes('/otp/request')) return jsonResponse({ resendAfterSeconds: 30 });
      return jsonResponse({ message: 'That code is not correct.' }, false);
    });
    renderApp(<PhoneLogin />);

    fireEvent.change(screen.getByLabelText('मोबाइल नंबर'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'कोड भेजें' }));
    expect(await screen.findByText('हमने 9876543210 पर 6 अंकों का कोड भेजा है।')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/6 अंकों का कोड/), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'जाँचें और आगे बढ़ें' }));
    await waitFor(() => expect(screen.getByText('यह कोड सही नहीं है।')).toBeInTheDocument());
  });

  test('an error the dictionary does not know is still shown, never hidden', async () => {
    localStorage.setItem(LANG_KEY, 'hi');
    global.fetch = jest.fn(() => jsonResponse({ message: 'Brand new server complaint' }, false));
    renderApp(<PhoneLogin />);
    fireEvent.change(screen.getByLabelText('मोबाइल नंबर'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'कोड भेजें' }));
    expect(await screen.findByText('Brand new server complaint')).toBeInTheDocument();
  });
});
