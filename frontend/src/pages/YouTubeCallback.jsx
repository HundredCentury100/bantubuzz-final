import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const YouTubeCallback = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      // Send error back to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'youtube-oauth-error',
          error: error
        }, window.location.origin);
      }
      window.close();
      return;
    }

    if (code) {
      // Exchange code for tokens via backend
      const exchangeCodeForTokens = async () => {
        try {
          const token = localStorage.getItem('token');

          const response = await fetch(`${import.meta.env.VITE_API_URL}/creator/platforms/youtube/exchange-code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code })
          });

          const data = await response.json();

          if (response.ok && data.success) {
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
            }
            window.close();
          } else {
            throw new Error(data.error || 'Failed to exchange code');
          }
        } catch (error) {
          console.error('YouTube OAuth callback error:', error);
          if (window.opener) {
            window.opener.postMessage({
              type: 'youtube-oauth-error',
              error: error.message || 'Failed to complete authentication'
            }, window.location.origin);
          }
          window.close();
        }
      };

      exchangeCodeForTokens();
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
