import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeNativePayload, isNativeAppRuntime } from '../utils/nativeApp';

const NativeDeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeAppRuntime()) return;

    let listener;

    const routeFromUrl = async (incomingUrl) => {
      try {
        const url = new URL(incomingUrl);
        const target = url.searchParams.get('target') || '/';
        const next = new URL(target, 'https://bantubuzz.local');
        const hasAuthPayload = url.searchParams.get('native_auth') === '1';

        if (hasAuthPayload) {
          const accessToken = url.searchParams.get('access_token');
          const refreshToken = url.searchParams.get('refresh_token');
          const user = decodeNativePayload(url.searchParams.get('user'));
          const profile = decodeNativePayload(url.searchParams.get('profile'));
          const googleName = url.searchParams.get('google_name');
          const googleEmail = url.searchParams.get('google_email');

          if (accessToken) {
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('token', accessToken);
          }
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
          }
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          if (profile !== undefined && profile !== null) {
            localStorage.setItem('profile', JSON.stringify(profile));
          }
          if (googleName) {
            localStorage.setItem('google_signup_name', googleName);
          }
          if (googleEmail) {
            localStorage.setItem('google_signup_email', googleEmail);
          }
          if (target.includes('/register/creator/complete-profile')) {
            localStorage.setItem('google_signup_pending', 'true');
          } else {
            localStorage.removeItem('google_signup_pending');
          }
        }

        url.searchParams.forEach((value, key) => {
          if (![
            'target',
            'native_auth',
            'access_token',
            'refresh_token',
            'user',
            'profile',
          ].includes(key)) {
            next.searchParams.set(key, value);
          }
        });

        if (url.searchParams.get('native_refresh') === '1') {
          next.searchParams.set('native_refresh', String(Date.now()));
        }

        const path = `${next.pathname}${next.search}${next.hash}`;

        try {
          const Browser = window.Capacitor?.Plugins?.Browser;
          await Browser?.close?.();
        } catch {
          // Browser may not be open; no action needed.
        }

        if (hasAuthPayload) {
          window.location.assign(path);
          return;
        }

        navigate(path, { replace: false });
      } catch (error) {
        console.error('[NativeDeepLink] Unable to route incoming URL:', error);
      }
    };

    const setup = async () => {
      try {
        const { App } = await import('@capacitor/app');
        listener = await App.addListener('appUrlOpen', (event) => {
          if (event?.url) routeFromUrl(event.url);
        });
      } catch (error) {
        console.warn('[NativeDeepLink] Listener setup skipped:', error);
      }
    };

    setup();

    return () => {
      try {
        listener?.remove?.();
      } catch (error) {
        console.warn('[NativeDeepLink] Listener cleanup failed:', error);
      }
    };
  }, [navigate]);

  return null;
};

export default NativeDeepLinkHandler;
