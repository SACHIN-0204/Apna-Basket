import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 24;

const buildUrl = ({ search, category, sort }, page) => {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);
  return `/api/products?${params.toString()}`;
};

// Loads the shop list from the server: search, category, sort and "load more" all happen there,
// so the catalogue can grow far beyond what the browser holds. Kept separate from the global
// Redux product list (used by the navbar, home page and so on) on purpose.
export const useShopProducts = ({ search, category, sort }) => {
  const [state, setState] = useState({ items: [], total: 0, page: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const generation = useRef(0); // lets us ignore answers that arrive after the filters changed

  useEffect(() => {
    const myGeneration = ++generation.current;
    const controller = new AbortController();
    setLoading(true);
    setError("");

    (async () => {
      try {
        const res = await fetch(buildUrl({ search, category, sort }, 1), { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not load products");
        if (myGeneration !== generation.current) return;
        setState({ items: data.products || [], total: data.total || 0, page: data.page || 1, hasMore: Boolean(data.hasMore) });
      } catch (err) {
        if (err.name === "AbortError" || myGeneration !== generation.current) return;
        setError(err.message || "Could not load products");
      } finally {
        if (myGeneration === generation.current) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [search, category, sort, reloadKey]);

  const loadMore = useCallback(async () => {
    const myGeneration = generation.current;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl({ search, category, sort }, state.page + 1));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load more products");
      if (myGeneration !== generation.current) return;
      setState((prev) => {
        const seen = new Set(prev.items.map((p) => p._id));
        const fresh = (data.products || []).filter((p) => !seen.has(p._id));
        return { items: [...prev.items, ...fresh], total: data.total ?? prev.total, page: data.page || prev.page + 1, hasMore: Boolean(data.hasMore) };
      });
    } catch (err) {
      setError(err.message || "Could not load more products");
    } finally {
      setLoadingMore(false);
    }
  }, [search, category, sort, state.page]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  return { ...state, loading, loadingMore, error, loadMore, retry };
};

// Category chips come from the server so they stay correct however many products exist
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/products/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => { if (alive && Array.isArray(list)) setCategories(list); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return categories;
};
