// Registers the offline-page / asset-cache worker in public/service-worker.js.
// Production builds only: in development a worker would serve stale files and confuse debugging.
export const registerServiceWorker = () => {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      // The site works fine without it, so a failure is only worth a console note
      console.warn('Service worker registration failed:', err);
    });
  });
};
