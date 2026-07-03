const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '6LfxaEItAAAAAPQZBzfWSIUV0yyFGz88OFZJE3KE';

const waitForRecaptcha = () => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  const timeoutMs = 10000;

  const check = () => {
    if (window.grecaptcha?.enterprise) {
      resolve(window.grecaptcha.enterprise);
      return;
    }
    if (Date.now() - startedAt > timeoutMs) {
      reject(new Error('Security verification failed to load. Please refresh and try again.'));
      return;
    }
    window.setTimeout(check, 100);
  };

  check();
});

export const getRecaptchaEnterpriseToken = async (action) => {
  const grecaptchaEnterprise = await waitForRecaptcha();

  return new Promise((resolve, reject) => {
    grecaptchaEnterprise.ready(async () => {
      try {
        const token = await grecaptchaEnterprise.execute(RECAPTCHA_SITE_KEY, { action });
        resolve(token);
      } catch (error) {
        reject(new Error('Security verification failed. Please try again.'));
      }
    });
  });
};
