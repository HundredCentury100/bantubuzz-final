export const isNativeAppRuntime = () => {
  if (typeof window === 'undefined' || !window.Capacitor) return false;

  if (typeof window.Capacitor.isNativePlatform === 'function') {
    return window.Capacitor.isNativePlatform();
  }

  return true;
};

export const openLiveAppRoute = (path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  window.location.assign(`https://bantubuzz.com${normalizedPath}`);
};
