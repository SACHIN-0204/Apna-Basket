import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { removeToCart, syncCartStock } from '../redux/cartSlice';

// Checks the items in the cart against live stock and prices.
// It asks the server for exactly these products (by id), so it stays correct
// however large the catalogue grows, unlike a fixed "first 60 products" list.
export const useCartStock = (cartItems) => {
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Re-check when the set of products changes (not on every quantity change)
  const idsKey = useMemo(() => [...new Set(cartItems.map((i) => i._id))].sort().join(','), [cartItems]);

  useEffect(() => {
    if (!idsKey) {
      setProducts([]);
      setLoaded(true);
      return undefined;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/products?ids=${idsKey}`, { signal: controller.signal });
        if (!res.ok) return; // keep the cart usable; checkout re-checks everything anyway
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
        setLoaded(true);
      } catch {
        /* offline or aborted: no false warnings */
      }
    })();
    return () => controller.abort();
  }, [idsKey]);

  const liveById = useMemo(() => new Map(products.map((p) => [p._id, p])), [products]);

  const issues = useMemo(() => {
    if (!loaded) return []; // not checked yet, so no false warnings
    return cartItems
      .map((item) => {
        const quantity = item.quantity || 1;
        const live = liveById.get(item._id);
        const base = { id: item._id, name: item.name };

        if (!live || live.isActive === false) return { ...base, type: 'removed' };
        if (live.stock <= 0) return { ...base, type: 'soldout' };
        if (quantity > live.stock) return { ...base, type: 'reduced', available: live.stock };
        if (live.price !== item.price) return { ...base, type: 'price', newPrice: live.price };
        return null;
      })
      .filter(Boolean);
  }, [cartItems, loaded, liveById]);

  const stockOf = (id) => {
    if (!loaded) return Infinity; // unknown yet, don't block
    const live = liveById.get(id);
    if (!live) return 0;
    return live.isActive === false ? 0 : live.stock;
  };

  // Applies the fixes the warning banner describes
  const fixCart = useCallback(() => {
    issues
      .filter((i) => i.type === 'removed' || i.type === 'soldout')
      .forEach((i) => dispatch(removeToCart(i.id)));
    if (products.length > 0) dispatch(syncCartStock(products)); // clamps quantities, refreshes prices
  }, [issues, products, dispatch]);

  return { products, issues, hasIssues: issues.length > 0, stockOf, fixCart };
};
