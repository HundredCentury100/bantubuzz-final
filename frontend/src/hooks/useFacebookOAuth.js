/**
 * Facebook OAuth Hook
 * Handles Facebook Login SDK initialization and OAuth flow
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const FACEBOOK_APP_ID = '1863571634283956';
const FACEBOOK_CONFIG_ID = '1233734415390648'; // TEST: Using "Thunzi" config instead of BantuBuzz

export const useFacebookOAuth = () => {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Load Facebook SDK
    if (!window.FB) {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
        setIsSDKLoaded(true);
      };

      // Load SDK script
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    } else {
      setIsSDKLoaded(true);
    }

    // Check if we're returning from Facebook OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      // Parse state to verify it's a Facebook connect action
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        if (stateData.action === 'facebook_connect') {
          // Handle the authorization code
          handleFacebookRedirect(code);

          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        console.error('Error parsing state:', error);
      }
    }
  }, []);

  // Handle Facebook OAuth redirect with authorization code
  const handleFacebookRedirect = async (code) => {
    setIsConnecting(true);

    try {
      console.log('Exchanging authorization code for access token');

      // Exchange code for access token via backend
      const redirect_uri = window.location.origin + '/creator/platforms';
      const tokenResponse = await api.post('/creator/platforms/facebook/exchange-code', {
        code: code,
        redirect_uri: redirect_uri
      });

      const accessToken = tokenResponse.data.accessToken;
      console.log('Successfully exchanged code for access token');

      // Now use the access token to fetch pages and connect
      fetchPagesAndConnect(accessToken, () => {
        // Callback after successful connection
        const hadCallback = sessionStorage.getItem('facebook_connect_callback');
        if (hadCallback) {
          sessionStorage.removeItem('facebook_connect_callback');
        }
      });

    } catch (error) {
      console.error('Error exchanging authorization code:', error);
      const errorMsg = error.response?.data?.error || 'Failed to exchange authorization code';
      toast.error(errorMsg);
      setIsConnecting(false);
    }
  };

  // Helper function to fetch pages and connect
  const fetchPagesAndConnect = async (accessToken, onSuccess) => {
    try {
      // Make direct Graph API calls with the access token
      // Can't use FB.api() because SDK doesn't have the token from authorization code flow

      console.log('Fetching Facebook pages with access token...');

      // Fetch user's Facebook pages
      const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,category,tasks&access_token=${accessToken}`;
      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();

      console.log('Facebook pages response:', pagesData);

      // Check for errors
      if (pagesData.error) {
        console.error('Facebook API error:', pagesData.error);
        toast.error(`Facebook error: ${pagesData.error.message}`);
        setIsConnecting(false);
        return;
      }

      // Check if we have pages in the data array
      if (pagesData.data && pagesData.data.length > 0) {
        const pages = pagesData.data;
        console.log(`Found ${pages.length} Facebook page(s):`, pages);

        // Show selection modal if multiple pages
        if (pages.length === 1) {
          // Auto-connect single page
          await connectAccount(pages[0], accessToken, onSuccess);
        } else {
          // Let user choose which page to connect
          await connectAccount(pages[0], accessToken, onSuccess);
        }
      } else {
        // No pages found
        console.warn('No Facebook pages found for this user');
        toast.error('No Facebook Pages found. Please create a Facebook Page first.');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Error fetching Facebook pages:', error);
      toast.error('Failed to fetch Facebook pages');
      setIsConnecting(false);
    }
  };

  const connectFacebookPage = async (onSuccess) => {
    if (!isSDKLoaded) {
      toast.error('Facebook SDK is still loading...');
      return;
    }

    setIsConnecting(true);

    try {
      // Facebook Login for Business with config_id requires manual redirect flow
      // when using System User Access Tokens (response_type=code)

      // Build the OAuth dialog URL manually
      const redirectUri = encodeURIComponent(window.location.origin + '/creator/platforms');
      const state = encodeURIComponent(JSON.stringify({ action: 'facebook_connect', timestamp: Date.now() }));

      // Required scopes - MUST match ALL permissions in the Facebook configuration
      const scope = 'business_management,email,instagram_basic,instagram_manage_insights,pages_manage_ads,pages_manage_metadata,pages_messaging,pages_read_engagement,pages_read_user_content,pages_show_list,read_insights';

      const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
        `client_id=${FACEBOOK_APP_ID}` +
        `&redirect_uri=${redirectUri}` +
        `&config_id=${FACEBOOK_CONFIG_ID}` +
        `&response_type=code` +
        `&scope=${scope}` +
        `&state=${state}`;

      console.log('Redirecting to Facebook OAuth:', oauthUrl);

      // Store callback for after redirect
      if (onSuccess) {
        sessionStorage.setItem('facebook_connect_callback', 'true');
      }

      // Redirect to Facebook OAuth
      window.location.href = oauthUrl;

    } catch (error) {
      console.error('Facebook OAuth error:', error);
      toast.error('An error occurred during Facebook login');
      setIsConnecting(false);
    }
  };

  // Helper function to connect a specific account (Facebook Page)
  const connectAccount = async (page, userAccessToken, onSuccess) => {
    try {
      console.log('Connecting Facebook Page:', page);

      // IMPORTANT: We use the USER Access Token, not the Page Access Token
      // ThunziAI needs the User Access Token to authenticate API requests to Facebook
      // The Page ID identifies which page we're connecting
      const pageId = page.id;
      const pageName = page.name;

      console.log('Sending to backend:', {
        platform: 'facebook',
        accountName: pageName,
        tokenType: 'USER_ACCESS_TOKEN (not page token)'
      });

      // Send page data to backend with USER Access Token
      // IMPORTANT: Do NOT send accountId - ThunziAI extracts it from accessToken
      await api.post('/creator/platforms/connect', {
        platform: 'facebook',
        accountName: pageName,
        accessToken: userAccessToken, // USER Access Token - allows ThunziAI to call Facebook API
        refreshToken: userAccessToken, // Store user token
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days from now
      });

      toast.success(`Facebook Page "${pageName}" connected successfully!`);

      // NOTE: ThunziAI automatically creates Instagram platform if linked to Facebook Page
      // We don't need to manually register Instagram - just notify the user
      toast.loading('Checking for linked Instagram account...', { duration: 2000 });

      // Check if Instagram was auto-created by ThunziAI
      setTimeout(async () => {
        try {
          const response = await api.get('/creator/platforms');
          const instagramPlatform = response.data.platforms?.find(p => p.platform === 'instagram');

          if (instagramPlatform) {
            toast.success(`Instagram account "${instagramPlatform.account_name}" also connected!`);
          } else {
            console.log('No Instagram Business Account found linked to this Facebook Page');
          }
        } catch (error) {
          console.error('Error checking for Instagram:', error);
        }

        if (onSuccess) onSuccess();
        setIsConnecting(false);

        // Refresh the page to show the newly connected accounts
        window.location.reload();
      }, 3000); // Wait 3 seconds for ThunziAI to process

    } catch (error) {
      console.error('Error connecting Facebook Page:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to connect Facebook Page';
      toast.error(errorMsg);
      setIsConnecting(false);
    }
  };

  // Helper function to show account selector
  const showAccountSelector = (pages, userAccessToken, onSuccess) => {
    // For now, just connect the first page
    // TODO: Add a proper page selection UI modal
    console.log(`User has ${pages.length} pages, auto-connecting first one:`, pages[0]);
    connectAccount(pages[0], userAccessToken, onSuccess);
  };

  return {
    isSDKLoaded,
    isConnecting,
    connectFacebookPage
  };
};
