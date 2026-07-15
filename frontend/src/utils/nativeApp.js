export const isNativeAppRuntime = () => {
  if (typeof window === 'undefined') return false;

  const origin = window.location?.origin;
  const protocol = window.location?.protocol;
  const hostname = window.location?.hostname;

  if (
    origin === 'https://localhost' ||
    origin === 'http://localhost' ||
    protocol === 'capacitor:' ||
    protocol === 'ionic:' ||
    (hostname === 'localhost' && /wv|capacitor/i.test(window.navigator?.userAgent || ''))
  ) {
    return true;
  }

  if (!window.Capacitor) return false;

  if (typeof window.Capacitor.isNativePlatform === 'function') {
    return window.Capacitor.isNativePlatform();
  }

  return true;
};

export const openLiveAppRoute = (path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  window.location.assign(`https://bantubuzz.com${normalizedPath}`);
};
