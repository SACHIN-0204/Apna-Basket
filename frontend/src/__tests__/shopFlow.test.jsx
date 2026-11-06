import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from '../redux/cartSlice';
import { ToastProvider } from '../components/Toast';
import ProductCard from '../components/ProductCard';
import StickyCartBar from '../components/StickyCartBar';
import Shop from '../pages/Shop';

const makeStore = () => configureStore({ reducer: { cart: cartReducer } });

const product = (over = {}) => ({
  _id: 'p1', name: 'Aashirvaad Atta', unit: '5 kg', price: 250, mrp: 280, stock: 3, imageUrl: 'x.jpg', category: 'Grocery', ...over,
});

const renderWith = (ui, { store = makeStore(), route = '/' } = {}) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>{ui}</ToastProvider>
      </MemoryRouter>
    </Provider>
  );

const jsonResponse = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn((url) => {
    if (String(url).startsWith('/api/store/config')) {
      return jsonResponse({ deliveryFee: 40, freeDeliveryAbove: 500, studentDiscountPercent: 10 });
    }
    if (String(url).startsWith('/api/products/categories')) return jsonResponse(['Grocery', 'Oil']);
    return jsonResponse({ products: [], total: 0, page: 1, hasMore: false });
  });
});

describe('ProductCard stepper', () => {
  test('Add to Cart turns into a - qty + stepper that respects stock', () => {
    const store = makeStore();
    renderWith(<ProductCard product={product({ stock: 3 })} />, { store });

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    expect(store.getState().cart.cartItems[0].quantity).toBe(1);
    expect(screen.queryByRole('button', { name: /add to cart/i })).toBeNull();

    const plus = screen.getByRole('button', { name: /add one more/i });
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(store.getState().cart.cartItems[0].quantity).toBe(3);
    expect(plus).toBeDisabled(); // at stock

    fireEvent.click(plus); // ignored
    expect(store.getState().cart.cartItems[0].quantity).toBe(3);
  });

  test('minus at quantity 1 removes the item and brings back Add to Cart', () => {
    const store = makeStore();
    renderWith(<ProductCard product={product()} />, { store });
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    fireEvent.click(screen.getByRole('button', { name: /remove one/i }));
    expect(store.getState().cart.cartItems).toHaveLength(0);
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
  });

  test('sold-out products cannot be added', () => {
    renderWith(<ProductCard product={product({ stock: 0 })} />);
    expect(screen.getByRole('button', { name: /unavailable/i })).toBeDisabled();
  });
});

describe('StickyCartBar', () => {
  const withItems = () => {
    const store = makeStore();
    store.dispatch({ type: 'cart/addItem', payload: { ...product(), quantity: 2 } }); // 2 x Rs 250 = Rs 500, exactly the free-delivery threshold
    return store;
  };

  test('is hidden when the cart is empty', () => {
    renderWith(<StickyCartBar />);
    expect(screen.queryByText(/view cart/i)).toBeNull();
  });

  test('shows count, total and the free-delivery hint from the server rule', async () => {
    const store = makeStore();
    store.dispatch({ type: 'cart/addItem', payload: { ...product({ stock: 10 }), quantity: 1 } }); // Rs 250
    renderWith(<StickyCartBar />, { store });
    expect(screen.getByRole('link', { name: /view cart, 1 item, ₹250/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/add ₹250 more for free delivery/i)).toBeInTheDocument());
  });

  test('says delivery is free once the threshold is reached', async () => {
    const store = withItems(); // Rs 500
    renderWith(<StickyCartBar />, { store });
    await waitFor(() => expect(screen.getByText(/free delivery on this order/i)).toBeInTheDocument());
  });

  test('is hidden on the cart and checkout pages', () => {
    const store = withItems();
    const { unmount } = renderWith(<StickyCartBar />, { store, route: '/cart' });
    expect(screen.queryByText(/view cart/i)).toBeNull();
    unmount();
    renderWith(<StickyCartBar />, { store, route: '/checkout' });
    expect(screen.queryByText(/view cart/i)).toBeNull();
  });
});

describe('Shop (server-side)', () => {
  const listCalls = () => global.fetch.mock.calls.map((c) => String(c[0])).filter((u) => u.startsWith('/api/products?'));

  test('typing searches on the server once, after a pause', async () => {
    renderWith(<Shop />, { route: '/shop' });
    await waitFor(() => expect(listCalls().length).toBe(1)); // first load

    const box = screen.getByLabelText(/search products/i);
    fireEvent.change(box, { target: { value: 'r' } });
    fireEvent.change(box, { target: { value: 'ri' } });
    fireEvent.change(box, { target: { value: 'rice' } });

    await waitFor(() => expect(listCalls().some((u) => u.includes('search=rice'))).toBe(true));
    expect(listCalls().filter((u) => u.includes('search='))).toHaveLength(1); // not one request per keystroke
    expect(listCalls().some((u) => u.includes('search=ri&') || u.endsWith('search=ri'))).toBe(false);
  });

  test('category chips come from the server and filter on the server', async () => {
    renderWith(<Shop />, { route: '/shop' });
    const chip = await screen.findByRole('button', { name: 'Oil' });
    fireEvent.click(chip);
    await waitFor(() => expect(listCalls().some((u) => u.includes('category=Oil'))).toBe(true));
  });

  test('Show more loads the next page and keeps the first page', async () => {
    global.fetch = jest.fn((url) => {
      const u = String(url);
      if (u.startsWith('/api/store/config')) return jsonResponse({ deliveryFee: 40, freeDeliveryAbove: 0 });
      if (u.startsWith('/api/products/categories')) return jsonResponse([]);
      if (u.includes('page=2')) return jsonResponse({ products: [product({ _id: 'b', name: 'Second Page Item' })], total: 2, page: 2, hasMore: false });
      return jsonResponse({ products: [product({ _id: 'a', name: 'First Page Item' })], total: 2, page: 1, hasMore: true });
    });
    renderWith(<Shop />, { route: '/shop' });

    expect(await screen.findByText('First Page Item')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show more \(1 left\)/i }));
    expect(await screen.findByText('Second Page Item')).toBeInTheDocument();
    expect(screen.getByText('First Page Item')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show more/i })).toBeNull();
  });

  test('a failed load shows a retry button that works', async () => {
    let fail = true;
    global.fetch = jest.fn((url) => {
      const u = String(url);
      if (u.startsWith('/api/products?') && fail) return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: 'boom' }) });
      if (u.startsWith('/api/products?')) return jsonResponse({ products: [product({ name: 'Recovered' })], total: 1, page: 1, hasMore: false });
      return jsonResponse([]);
    });
    renderWith(<Shop />, { route: '/shop' });
    const retry = await screen.findByRole('button', { name: /retry/i });
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByText('Recovered')).toBeInTheDocument();
  });
});
