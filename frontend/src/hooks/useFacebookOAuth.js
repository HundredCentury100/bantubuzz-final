/**
 * Facebook OAuth Hook
 * Handles Facebook Login SDK initialization and OAuth flow
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const FACEBOOK_APP_ID = '1863571634283956';
const FACEBOOK_CONFIG_ID = '1565308301261640'; // Facebook Login for Business Configuration ID

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
  }, []);

  const connectFacebookPage = async (onSuccess) => {
    if (!isSDKLoaded) {
      toast.error('Facebook SDK is still loading...');
      return;
    }

    setIsConnecting(true);

    try {
      // Determine login parameters
      const loginParams = FACEBOOK_CONFIG_ID
        ? {
            config_id: FACEBOOK_CONFIG_ID,
            auth_type: 'rerequest',
            return_scopes: true
          }
        : {
            scope: 'pages_show_list,business_management,instagram_basic,instagram_manage_insights,pages_read_engagement,pages_read_user_content',
            auth_type: 'rerequest',
            return_scopes: true
          };

      console.log('Using Facebook Login for Business with params:', loginParams);

      // Request Facebook login with required permissions
      window.FB.login(
        (response) => {
          console.log('FB.login response:', response);

          if (response.authResponse) {
            const userAccessToken = response.authResponse.accessToken;

            console.log('User Access Token:', userAccessToken);

            // First, check what permissions were actually granted
            window.FB.api('/me/permissions', (permissionsResponse) => {
              console.log('Granted permissions:', permissionsResponse);
            });

            // Get user's Facebook pages with specific fields
            window.FB.api(
              '/me/accounts',
              { fields: 'id,name,access_token,category,tasks' },
              async (pagesResponse) => {
                console.log('FB.api /me/accounts response:', pagesResponse);

                // Check for errors
                if (pagesResponse.error) {
                  console.error('Facebook API error:', pagesResponse.error);
                  toast.error(`Facebook error: ${pagesResponse.error.message}`);
                  setIsConnecting(false);
                  return;
                }

                // Check if we have pages in the data array
                if (pagesResponse.data && pagesResponse.data.length > 0) {
                  const pages = pagesResponse.data;
                  console.log(`Found ${pages.length} Facebook page(s):`, pages);

                  // Show selection modal if multiple pages
                  if (pages.length === 1) {
                    // Auto-connect single page (pass userAccessToken)
                    await connectAccount(pages[0], userAccessToken, onSuccess);
                  } else {
                    // Let user choose which page to connect (pass userAccessToken)
                    showAccountSelector(pages, userAccessToken, onSuccess);
                  }
                } else {
                  // No pages found
                  console.warn('No Facebook pages found for this user');
                  toast.error('No Facebook Pages found. Please create a Facebook Page first.');
                  setIsConnecting(false);
                }
              }
            );
          } else {
            console.log('Facebook login cancelled or failed');
            toast.error('Facebook login was cancelled');
            setIsConnecting(false);
          }
        },
        loginParams
      );
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
      toast.info('Checking for linked Instagram account...', { duration: 2000 });

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
      }, 3000); // Wait 3 seconds for ThunziAI to process

    } catch (error) {
      console.error('Error connecting Facebook Page:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to connect Facebook Page';
      toast.error(errorMsg);
      setIsConnecting(false);
    }
  };

  // Helper function to show account selector
  const showAccountSelector = async (pages, userAccessToken, onSuccess) => {
    // For now, just connect the first page
    // TODO: Add a proper page selection UI modal
    console.log(`User has ${pages.length} pages, auto-connecting first one:`, pages[0]);
    await connectAccount(pages[0], userAccessToken, onSuccess);
  };

  return {
    isSDKLoaded,
    isConnecting,
    connectFacebookPage
  };
};
