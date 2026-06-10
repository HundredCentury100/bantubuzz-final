const REFERRAL_CODE_KEY = 'bantubuzz_referral_code';
const REFERRAL_VISITOR_KEY = 'bantubuzz_referral_visitor';

export const getReferralCode = () => localStorage.getItem(REFERRAL_CODE_KEY);

export const setReferralAttribution = (code, visitorToken) => {
  if (code) localStorage.setItem(REFERRAL_CODE_KEY, code);
  if (visitorToken) localStorage.setItem(REFERRAL_VISITOR_KEY, visitorToken);
};

export const getReferralVisitor = () => {
  let token = localStorage.getItem(REFERRAL_VISITOR_KEY);
  if (!token) {
    token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(REFERRAL_VISITOR_KEY, token);
  }
  return token;
};

export const clearReferralAttribution = () => {
  localStorage.removeItem(REFERRAL_CODE_KEY);
  localStorage.removeItem(REFERRAL_VISITOR_KEY);
};
