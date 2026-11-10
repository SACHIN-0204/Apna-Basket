import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useShopProducts, useCategories } from '../hooks/useShopProducts';
import { useT } from '../i18n/LanguageContext';

const SORT_KEYS = ['newest', 'priceLow', 'priceHigh', 'name'];

const SEARCH_DELAY_MS = 300;

const Shop = () => {
  const { t, tm, tc } = useT();
  const [params, setParams] = useSearchParams();

  const urlSearch = params.get('search') || '';
  const category = params.get('category') || '';
  const rawSort = params.get('sort') || 'newest';
  const sort = SORT_KEYS.includes(rawSort) ? rawSort : 'newest';

  // The box updates instantly; the URL (and the server request) follows once typing pauses
  const [searchInput, setSearchInput] = useState(urlSearch);
  // Only overwrite the box when the URL changed from outside; never eat a space the person just typed
  useEffect(() => { setSearchInput((prev) => (prev.trim() === urlSearch ? prev : urlSearch)); }, [urlSearch]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === urlSearch) return undefined;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (trimmed) next.set('search', trimmed);
      else next.delete('search');
      setParams(next, { replace: true });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, params, setParams]);

  const categories = useCategories();
  const { items, total, hasMore, loading, loadingMore, error, loadMore, retry } = useShopProducts({
    search: urlSearch,
    category,
    sort,
  });

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchInput('');
    setParams({}, { replace: true });
  };

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: '#111827' }}>{t('shop.title')}</h1>
        <p style={{ margin: '6px 0 0', color: '#6b7280' }}>
          {t('shop.subtitle')}
        </p>
      </div>

      <div style={toolbarStyle}>
        <input
          type="search"
          placeholder={t('shop.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={searchStyle}
          aria-label={t('shop.searchAria')}
        />
        <select value={sort} onChange={(e) => updateParam('sort', e.target.value === 'newest' ? '' : e.target.value)} style={selectStyle} aria-label={t('shop.sortAria')}>
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>{t(`shop.sort.${key}`)}</option>
          ))}
        </select>
      </div>

      <div style={chipRowStyle}>
        <button onClick={() => updateParam('category', '')} style={chipStyle(!category)}>{t('shop.all')}</button>
        {categories.map((c) => (
          <button key={c} onClick={() => updateParam('category', c)} style={chipStyle(category === c)}>
            {tc(c)}
          </button>
        ))}
      </div>

      {loading && <p style={mutedStyle}>{t('shop.loading')}</p>}

      {error && !loading && items.length === 0 && (
        <div style={messageBoxStyle}>
          <p style={{ margin: '0 0 12px' }}>{t('shop.loadError')}</p>
          <button onClick={retry} style={retryBtnStyle}>{t('common.retry')}</button>
        </div>
      )}

      {!loading && !(error && items.length === 0) && (
        <>
          <p style={{ ...mutedStyle, marginBottom: 14 }} aria-live="polite">
            {t('shop.count', { count: total })}
            {category && t('shop.inCategory', { category: tc(category) })}
            {urlSearch && t('shop.matching', { search: urlSearch })}
          </p>

          {items.length === 0 ? (
            <div style={messageBoxStyle}>
              <p style={{ margin: '0 0 12px' }}>{t('shop.none')}</p>
              <button onClick={clearFilters} style={retryBtnStyle}>{t('shop.clear')}</button>
            </div>
          ) : (
            <>
              <div style={gridStyle}>
                {items.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>

              {error && <p style={{ ...mutedStyle, textAlign: 'center', marginTop: 16, color: '#b91c1c' }}>{tm(error)}</p>}

              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: 28 }}>
                  <button onClick={loadMore} disabled={loadingMore} style={{ ...retryBtnStyle, minHeight: 44, padding: '10px 28px' }}>
                    {loadingMore ? t('common.loading') : t('shop.showMore', { count: total - items.length })}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

const pageStyle = { maxWidth: 1200, margin: '0 auto', padding: '32px 20px' };
const toolbarStyle = { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 };
const searchStyle = {
  flex: '2 1 260px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #d1d5db',
  borderRadius: 12, fontSize: '1rem', outline: 'none',
};
const selectStyle = {
  flex: '1 1 180px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #d1d5db',
  borderRadius: 12, fontSize: '1rem',
};
const chipRowStyle = { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 };
const chipStyle = (active) => ({
  flex: '0 0 auto', padding: '8px 16px', borderRadius: 999, cursor: 'pointer', fontSize: '0.9rem',
  border: `1px solid ${active ? '#111827' : '#d1d5db'}`,
  background: active ? '#111827' : '#fff',
  color: active ? '#fff' : '#374151',
  fontWeight: active ? 600 : 400,
});
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 20 };
const mutedStyle = { color: '#6b7280', margin: 0 };
const messageBoxStyle = { textAlign: 'center', padding: '48px 20px', background: '#f9fafb', borderRadius: 16, color: '#4b5563' };
const retryBtnStyle = {
  padding: '10px 18px', borderRadius: 10, border: 'none', background: '#111827',
  color: '#fff', cursor: 'pointer', fontWeight: 600,
};

export default Shop;