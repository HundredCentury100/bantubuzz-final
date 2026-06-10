import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  Copy,
  Facebook,
  Mail,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { referralsAPI } from '../services/api';

const SHARE_COPY = {
  en: 'Join me on BantuBuzz, the platform connecting African creators and brands.',
  sn: 'Huya ubatane neni paBantuBuzz, chikuva chinobatanidza vagadziri vezvemukati nemabhizimisi eAfrica.',
  nd: 'Woza uhlanganyele lami kuBantuBuzz, inkundla ehlanganisa abadali lemabhizimusi eAfrica.',
  zu: 'Joyina nami kuBantuBuzz, inkundla exhumanisa abadali nemikhiqizo yase-Afrika.',
  af: 'Sluit by my aan op BantuBuzz, die platform wat Afrika-skeppers en handelsmerke verbind.',
};

const LANGUAGE_LABELS = {
  en: 'English',
  sn: 'Shona',
  nd: 'Ndebele',
  zu: 'Zulu',
  af: 'Afrikaans',
};

const Referrals = () => {
  const [data, setData] = useState(null);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    referralsAPI.getMine()
      .then((response) => setData(response.data))
      .catch((error) => toast.error(error.response?.data?.error || 'Failed to load referrals'))
      .finally(() => setLoading(false));
  }, []);

  const shareText = SHARE_COPY[language];
  const encodedText = useMemo(() => encodeURIComponent(`${shareText} ${data?.link || ''}`), [shareText, data?.link]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${shareText} ${data.link}`);
    setCopied(true);
    toast.success('Referral link copied');
    setTimeout(() => setCopied(false), 1800);
  };

  const shareLinks = data ? [
    { label: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${encodedText}` },
    { label: 'X / Twitter', icon: FaXTwitter, href: `https://twitter.com/intent/tweet?text=${encodedText}` },
    { label: 'Facebook', icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.link)}` },
    { label: 'Email', icon: Mail, href: `mailto:?subject=${encodeURIComponent('Join BantuBuzz')}&body=${encodedText}` },
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary-dark" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <main className="container-custom space-y-6 py-8 sm:py-12">
        <div>
          <p className="text-sm font-semibold uppercase text-primary-dark">Referrals</p>
          <h1 className="mt-1 text-3xl font-bold text-dark">Grow your network, earn rewards</h1>
          <p className="mt-2 max-w-2xl text-gray-600">Share your link and follow each referral from first click to qualification.</p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Clicks', data.stats.clicks],
            ['Signups', data.stats.signups],
            ['Activations', data.stats.activations],
            ['Qualified', data.stats.qualified],
            ['Account credit', `$${Number(data.credit_balance || 0).toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-dark">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 rounded-lg border border-gray-200 bg-white p-5 sm:p-6 lg:grid-cols-[1fr_220px]">
          <div>
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary-dark" />
              <h2 className="text-xl font-bold text-dark">Share your referral link</h2>
            </div>
            <label className="mt-5 block text-sm font-medium text-dark" htmlFor="share-language">Share language</label>
            <select
              id="share-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="input mt-2 max-w-xs"
            >
              {Object.entries(LANGUAGE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>

            <div className="mt-4 flex items-stretch gap-2">
              <input value={data.link} readOnly className="input min-w-0 flex-1 bg-gray-50" aria-label="Referral link" />
              <button type="button" onClick={copyLink} className="btn btn-primary inline-flex items-center justify-center px-4" title="Copy referral link">
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>

            <p className="mt-4 rounded-lg bg-light p-4 text-sm text-gray-700">{shareText}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {shareLinks.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-dark hover:border-primary-dark hover:bg-light"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-white p-4 ring-1 ring-gray-200">
            <QRCodeSVG value={data.link} size={180} level="M" includeMargin />
            <p className="mt-2 text-center text-xs text-gray-500">Scan to join BantuBuzz</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold text-dark">Referral activity</h2>
            {data.referrals.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500">No signups yet. Your clicks and referrals will appear here.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                    <div>
                      <p className="font-semibold capitalize text-dark">{referral.user_type}</p>
                      <p className="text-xs text-gray-500">{new Date(referral.signed_up_at).toLocaleDateString()}</p>
                    </div>
                    <span className="rounded-full bg-light px-3 py-1 text-xs font-semibold capitalize text-primary-dark">
                      {referral.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold text-dark">Earned rewards</h2>
            {data.rewards.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500">Rewards unlock after qualified referrals remain active for 30 days.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.rewards.map((reward) => (
                  <div key={reward.id} className="border-b border-gray-100 pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold capitalize text-dark">{reward.type.replaceAll('_', ' ')}</p>
                      <span className="text-xs font-semibold capitalize text-primary-dark">{reward.status.replace('_', ' ')}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {reward.amount > 0 ? `$${reward.amount.toFixed(2)} account credit` : reward.value || 'Reward unlocked'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Referrals;
