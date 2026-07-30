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

export const MOBILE_DEEP_LINK_SCHEME = 'bantubuzz://return';
export const LIVE_WEB_ORIGIN = 'https://bantubuzz.com';

export const nativeReturnUrl = (target = '/', params = {}) => {
  const normalizedTarget = target.startsWith('/') ? target : `/${target}`;
  const url = new URL(`${LIVE_WEB_ORIGIN}/mobile/return`);
  url.searchParams.set('target', normalizedTarget);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

export const mobileReturnState = (state = {}) => ({
  ...state,
  runtime: isNativeAppRuntime() ? 'native' : 'web',
  returnTarget: state.returnTarget || '/creator/platforms',
});

export const openExternalUrl = async (url) => {
  if (!isNativeAppRuntime()) {
    window.location.href = url;
    return;
  }

  try {
    const Browser = window.Capacitor?.Plugins?.Browser;
    if (!Browser?.open) throw new Error('Capacitor Browser plugin is not available');
    await Browser.open({
      url,
      presentationStyle: 'fullscreen',
      windowName: '_blank',
    });
  } catch (error) {
    console.warn('[NativeApp] Falling back to window redirect:', error);
    window.location.href = url;
  }
};

export const openExternalAppRoute = async (path = '/', params = {}) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${LIVE_WEB_ORIGIN}${normalizedPath}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  await openExternalUrl(url.toString());
};

export const encodeNativePayload = (value) => {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value ?? null))));
  } catch (error) {
    console.warn('[NativeApp] Unable to encode payload:', error);
    return '';
  }
};

export const decodeNativePayload = (value) => {
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(escape(atob(value))));
  } catch (error) {
    console.warn('[NativeApp] Unable to decode payload:', error);
    return null;
  }
};

export const buildAppDeepLink = (target = '/', params = {}) => {
  const normalizedTarget = target.startsWith('/') ? target : `/${target}`;
  const url = new URL(MOBILE_DEEP_LINK_SCHEME);
  url.searchParams.set('target', normalizedTarget);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};
