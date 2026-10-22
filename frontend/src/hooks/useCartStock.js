import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../redux/productsSlice';

export const useCartStock = (cartItems) => {
  const dispatch = useDispatch();
  const productsState = useSelector((s) => s.products);
  const products = Array.isArray(productsState)
    ? productsState
    : productsState?.items ?? productsState?.products ?? [];

  // Refresh live stock and prices whenever the cart page opens
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const liveById = useMemo(() => new Map(products.map((p) => [p._id, p])), [products]);

  const issues = useMemo(() => {
    if (products.length === 0) return []; // not loaded yet, so no false warnings
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
  }, [cartItems, products, liveById]);

  const stockOf = (id) => {
    const live = liveById.get(id);
    if (!live) return Infinity; // unknown yet, don't block
    return live.isActive === false ? 0 : live.stock;
  };

  return { products, issues, hasIssues: issues.length > 0, stockOf };
};