import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { buildAppDeepLink, decodeNativePayload, isNativeAppRuntime } from '../utils/nativeApp';

const MobileReturn = () => {
  const [searchParams] = useSearchParams();
  const [attempted, setAttempted] = useState(false);

  const target = searchParams.get('target') || '/';
  const deepLink = useMemo(() => {
    const params = {};
    searchParams.forEach((value, key) => {
      if (key !== 'target') params[key] = value;
    });
    return buildAppDeepLink(target, params);
  }, [searchParams, target]);

  const browserFallback = useMemo(() => {
    const url = new URL(target, window.location.origin);
    searchParams.forEach((value, key) => {
      if (key !== 'target') url.searchParams.set(key, value);
    });
    return `${url.pathname}${url.search}${url.hash}`;
  }, [searchParams, target]);

  useEffect(() => {
    if (isNativeAppRuntime()) {
      if (searchParams.get('native_auth') === '1') {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const user = decodeNativePayload(searchParams.get('user'));
        const profile = decodeNativePayload(searchParams.get('profile'));

        if (accessToken) {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('token', accessToken);
        }
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        if (user) localStorage.setItem('user', JSON.stringify(user));
        if (profile !== undefined && profile !== null) {
          localStorage.setItem('profile', JSON.stringify(profile));
        }
      }

      window.location.replace(browserFallback);
      return;
    }

    setAttempted(true);
    window.location.href = deepLink;
  }, [browserFallback, deepLink, searchParams]);

  return (
    <main className="min-h-screen bg-light flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 text-center">
        <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
          <span className="text-2xl font-bold text-dark">B</span>
        </div>
        <h1 className="text-2xl font-bold text-dark mb-3">Return to BantuBuzz</h1>
        <p className="text-gray-600 mb-6">
          Continue this secure flow in the BantuBuzz mobile app.
        </p>
        <a
          href={deepLink}
          className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-dark hover:bg-primary/90 transition-colors"
        >
          Open BantuBuzz App
        </a>
        <Link
          to={browserFallback}
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-gray-300 px-6 py-3 font-medium text-dark hover:bg-gray-50 transition-colors"
        >
          Continue in browser
        </Link>
        {attempted && (
          <p className="mt-5 text-xs text-gray-500">
            If the app did not open, use the button above or continue in your browser.
          </p>
        )}
      </section>
    </main>
  );
};

export default MobileReturn;
