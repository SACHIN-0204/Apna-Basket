import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from '../redux/cartSlice';
import InstallPrompt from '../components/InstallPrompt';
import {
  DISMISS_KEY, DISMISS_DAYS, VISITS_KEY, INSTALLED_KEY, __resetInstallPromptForTests,
} from '../hooks/useInstallPrompt';

const makeStore = (withCartItem = false) => {
  const store = configureStore({ reducer: { cart: cartReducer } });
  if (withCartItem) store.dispatch({ type: 'cart/addItem', payload: { _id: 'p1', name: 'Atta', price: 100, stock: 5, quantity: 1 } });
  return store;
};

const renderPrompt = ({ route = '/', cart = false } = {}) =>
  render(
    <Provider store={makeStore(cart)}>
      <MemoryRouter initialEntries={[route]}>
        <InstallPrompt />
      </MemoryRouter>
    </Provider>
  );

// What Chrome fires when the site is installable
const fireInstallable = (outcome = 'accepted') => {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = jest.fn();
  event.userChoice = Promise.resolve({ outcome });
  act(() => { window.dispatchEvent(event); });
  return event;
};

const setUserAgent = (ua, extra = {}) => {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(window.navigator, 'platform', { value: extra.platform || 'Linux armv81', configurable: true });
  Object.defineProperty(window.navigator, 'maxTouchPoints', { value: extra.touch ?? 5, configurable: true });
  Object.defineProperty(window.navigator, 'standalone', { value: extra.standalone, configurable: true });
};

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148 Safari/604.1';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  __resetInstallPromptForTests();
  setUserAgent(ANDROID);
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

describe('InstallPrompt on Chrome / Android', () => {
  test('shows nothing until the browser says the app is installable', () => {
    localStorage.setItem(VISITS_KEY, '5');
    renderPrompt();
    expect(screen.queryByText(/order faster with the app/i)).toBeNull();
  });

  test('does not ask on the very first visit with an empty cart', () => {
    renderPrompt();
    fireInstallable();
    expect(screen.queryByText(/order faster with the app/i)).toBeNull();
  });

  test('asks on a returning visit', () => {
    localStorage.setItem(VISITS_KEY, '1'); // this visit becomes the 2nd
    renderPrompt();
    fireInstallable();
    expect(screen.getByText(/order faster with the app/i)).toBeInTheDocument();
  });

  test('asks once something is in the cart, even on the first visit', () => {
    renderPrompt({ cart: true });
    fireInstallable();
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
  });

  test('event fired before the component mounted is not lost', () => {
    localStorage.setItem(VISITS_KEY, '3');
    fireInstallable(); // browser is early
    renderPrompt();
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
  });

  test('Install opens the browser prompt and hides the banner when accepted', async () => {
    localStorage.setItem(VISITS_KEY, '2');
    renderPrompt();
    const event = fireInstallable('accepted');
    fireEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(event.prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText(/order faster with the app/i)).toBeNull());
    expect(localStorage.getItem(INSTALLED_KEY)).toBe('1');
  });

  test('declining the browser prompt counts as "not now"', async () => {
    localStorage.setItem(VISITS_KEY, '2');
    renderPrompt();
    fireInstallable('dismissed');
    fireEvent.click(screen.getByRole('button', { name: 'Install' }));
    await waitFor(() => expect(screen.queryByText(/order faster with the app/i)).toBeNull());
    expect(localStorage.getItem(DISMISS_KEY)).toBeTruthy();
    expect(localStorage.getItem(INSTALLED_KEY)).toBeNull();
  });

  test('the close button hides it and it stays away for 30 days, then comes back', () => {
    localStorage.setItem(VISITS_KEY, '2');
    const { unmount } = renderPrompt();
    fireInstallable();
    fireEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(screen.queryByText(/order faster with the app/i)).toBeNull();
    unmount();

    // still dismissed on the next page load
    renderPrompt();
    fireInstallable();
    expect(screen.queryByText(/order faster with the app/i)).toBeNull();

    // 31 days later it may ask again
    localStorage.setItem(DISMISS_KEY, String(Date.now() - (DISMISS_DAYS + 1) * 24 * 60 * 60 * 1000));
    __resetInstallPromptForTests();
    renderPrompt();
    fireInstallable();
    expect(screen.getAllByText(/order faster with the app/i).length).toBeGreaterThan(0);
  });

  test('never shows during checkout or login', () => {
    localStorage.setItem(VISITS_KEY, '5');
    const first = renderPrompt({ route: '/checkout', cart: true });
    fireInstallable();
    expect(screen.queryByText(/order faster with the app/i)).toBeNull();
    first.unmount();
    renderPrompt({ route: '/login', cart: true });
    expect(screen.queryByText(/order faster with the app/i)).toBeNull();
  });

  test('does not show when already running as an installed app', () => {
    localStorage.setItem(VISITS_KEY, '5');
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }); // display-mode: standalone
    renderPrompt();
    fireInstallable();
    expect(screen.queryByText(/order faster with the app/i)).toBeNull();
  });

  test('visits are counted once per browser session, not once per page', () => {
    renderPrompt().unmount();
    renderPrompt().unmount();
    renderPrompt().unmount();
    expect(localStorage.getItem(VISITS_KEY)).toBe('1');
  });
});

describe('InstallPrompt on iPhone', () => {
  test('Safari gets Add to Home Screen steps instead of an Install button', () => {
    setUserAgent(IPHONE_SAFARI);
    localStorage.setItem(VISITS_KEY, '2');
    renderPrompt();
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /how to install/i }));
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /hide steps/i }));
    expect(screen.queryByText(/add to home screen/i)).toBeNull();
  });

  test('is hidden once launched from the home screen', () => {
    setUserAgent(IPHONE_SAFARI, { standalone: true });
    localStorage.setItem(VISITS_KEY, '2');
    renderPrompt();
    expect(screen.queryByText(/order faster with the app/i)).toBeNull();
  });

  test('other iPhone browsers are not shown Safari-only steps', () => {
    setUserAgent(IPHONE_CHROME);
    localStorage.setItem(VISITS_KEY, '2');
    renderPrompt();
    expect(screen.queryByText(/order faster with the app/i)).toBeNull();
  });
});
