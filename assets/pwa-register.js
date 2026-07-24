(function registerPwa() {
  if (!('serviceWorker' in navigator)) return;
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('[PWA] SW register failed:', err);
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
})();
