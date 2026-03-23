import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const YouTubeCallback = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('[YouTubeCallback] Component mounted');
    console.log('[YouTubeCallback] window.opener exists:', !!window.opener);
    console.log('[YouTubeCallback] window.location.origin:', window.location.origin);

    const code = searchParams.get('code');
    const error = searchParams.get('error');

    console.log('[YouTubeCallback] Received code:', code ? 'YES' : 'NO');
    console.log('[YouTubeCallback] Received error:', error);

    if (error) {
      console.log('[YouTubeCallback] Sending error to parent');
      // Send error back to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'youtube-oauth-error',
          error: error
        }, window.location.origin);
      }
      setTimeout(() => window.close(), 100);
      return;
    }

    if (code) {
      console.log('[YouTubeCallback] Exchanging code for tokens');
      // Exchange code for tokens via backend
      const exchangeCodeForTokens = async () => {
        try {
          const token = localStorage.getItem('token');
          console.log('[YouTubeCallback] Auth token exists:', !!token);

          const apiUrl = `${import.meta.env.VITE_API_URL}/creator/platforms/youtube/exchange-code`;
          console.log('[YouTubeCallback] Calling API:', apiUrl);

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code })
          });

          const data = await response.json();
          console.log('[YouTubeCallback] API response:', data);

          if (response.ok && data.success) {
            console.log('[YouTubeCallback] Success! Sending data to parent');
            // Send success message with tokens back to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'youtube-oauth-success',
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresIn: data.expiresIn,
                channelId: data.channelId,
                channelTitle: data.channelTitle
              }, window.location.origin);
              console.log('[YouTubeCallback] PostMessage sent to parent');
            } else {
              console.error('[YouTubeCallback] No window.opener available!');
            }
            setTimeout(() => window.close(), 100);
          } else {
            throw new Error(data.error || 'Failed to exchange code');
          }
        } catch (error) {
          console.error('[YouTubeCallback] Error:', error);
          if (window.opener) {
            window.opener.postMessage({
              type: 'youtube-oauth-error',
              error: error.message || 'Failed to complete authentication'
            }, window.location.origin);
          }
          setTimeout(() => window.close(), 100);
        }
      };

      exchangeCodeForTokens();
    } else {
      console.log('[YouTubeCallback] No code or error in URL');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Completing YouTube authentication...</p>
      </div>
    </div>
  );
};

export default YouTubeCallback;
