import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, RotateCcw, Trophy } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ResponsiveImage from '../components/ResponsiveImage';
import CreatorCardActions from '../components/CreatorCardActions';
import SEO from '../components/SEO';
import { creatorsAPI } from '../services/api';
import { PLATFORM_CONFIGS } from '../constants/platformConfig';

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter/X' },
];

const formatFollowers = (value) => new Intl.NumberFormat('en', {
  notation: Number(value) >= 10000 ? 'compact' : 'standard',
  maximumFractionDigits: 1,
}).format(Number(value) || 0);

const platformConfigFor = (platform) => {
  const key = PLATFORM_OPTIONS.find((option) => option.value === platform)?.label.replace('/X', '');
  return PLATFORM_CONFIGS[key] || PLATFORM_CONFIGS.Instagram;
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [creators, setCreators] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const limit = searchParams.get('limit') === '100' ? 100 : 50;
  const category = searchParams.get('category') || '';
  const platform = searchParams.get('platform') || '';
  const storageKey = useMemo(
    () => `leaderboard-scroll:${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );

  useEffect(() => {
    creatorsAPI.getCategories()
      .then((response) => setCategories(response.data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    creatorsAPI.getLeaderboard({
      limit,
      ...(category ? { category } : {}),
      ...(platform ? { platform } : {}),
    }).then((response) => {
      if (!active) return;
      setCreators(response.data.creators || []);
      setTotal(response.data.total || 0);
      requestAnimationFrame(() => {
        const savedPosition = Number(sessionStorage.getItem(storageKey) || 0);
        if (savedPosition > 0) window.scrollTo({ top: savedPosition, behavior: 'instant' });
      });
    }).catch((requestError) => {
      if (!active) return;
      setError(requestError.response?.data?.error || 'Unable to load the leaderboard');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [limit, category, platform, storageKey]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    sessionStorage.removeItem(storageKey);
    setSearchParams(next);
  };

  const openCreator = (creator) => {
    sessionStorage.setItem(storageKey, String(window.scrollY));
    navigate(creator.profile_path, {
      state: {
        fromLeaderboard: `${location.pathname}${location.search}`,
      },
    });
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams({ limit: String(limit) }));
  };

  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="Creator Leaderboard"
        description="Discover the highest ranked creators on BantuBuzz by overall performance, category, and platform."
      />
      <Navbar />
      <main className="container-custom py-8 sm:py-12">
        <header className="mb-7 border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary">
              <Trophy className="h-6 w-6 text-dark" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Creator Leaderboard</h1>
              <p className="mt-1 text-sm text-gray-600">Ranked creator performance. Scores remain private.</p>
            </div>
          </div>
        </header>

        <section className="mb-6 border border-gray-200 bg-white p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-[auto_1fr_1fr_auto] md:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">View</p>
              <div className="inline-flex border border-gray-300 bg-white p-1">
                {[50, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter('limit', String(value))}
                    className={`px-4 py-2 text-sm font-semibold ${limit === value ? 'bg-dark text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Top {value}
                  </button>
                ))}
              </div>
            </div>
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase text-gray-500">Category</span>
              <select value={category} onChange={(event) => setFilter('category', event.target.value)} className="input py-2.5">
                <option value="">All categories</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase text-gray-500">Primary platform</span>
              <select value={platform} onChange={(event) => setFilter('platform', event.target.value)} className="input py-2.5">
                <option value="">All platforms</option>
                {PLATFORM_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!category && !platform}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
        </section>

        <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
          <p>{loading ? 'Loading rankings...' : `${Math.min(total, limit)} creator${Math.min(total, limit) === 1 ? '' : 's'} shown`}</p>
          {(category || platform) && <p className="hidden sm:block">Filters apply to rank positions</p>}
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        )}

        {!error && loading && (
          <div className="space-y-2">
            {[...Array(8)].map((_, index) => <div key={index} className="h-24 animate-pulse bg-white border border-gray-200" />)}
          </div>
        )}

        {!error && !loading && creators.length === 0 && (
          <div className="border border-gray-200 bg-white px-6 py-16 text-center">
            <Trophy className="mx-auto h-9 w-9 text-gray-300" />
            <h2 className="mt-4 text-lg font-bold">No ranked creators found</h2>
            <p className="mt-2 text-sm text-gray-500">Try clearing one of the filters.</p>
          </div>
        )}

        {!error && !loading && creators.length > 0 && (
          <section className="border border-gray-200 bg-white">
            <div className="hidden grid-cols-[80px_1fr_180px_180px_150px_110px] border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase text-gray-500 lg:grid">
              <span>Rank</span>
              <span>Creator</span>
              <span>Category</span>
              <span>Platform</span>
              <span>Followers</span>
              <span className="text-right">Card</span>
            </div>
            {creators.map((creator) => {
              const config = platformConfigFor(creator.platform);
              return (
                <article
                  key={creator.creator_id}
                  role="link"
                  tabIndex={0}
                  onClick={() => openCreator(creator)}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget
                      && (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      openCreator(creator);
                    }
                  }}
                  className="group relative cursor-pointer border-b border-gray-100 px-4 py-4 last:border-b-0 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary lg:grid lg:grid-cols-[80px_1fr_180px_180px_150px_110px] lg:items-center lg:px-5"
                >
                  <div className="mb-3 flex items-center justify-between lg:mb-0">
                    <span className={`flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-lg font-bold ${creator.rank <= 3 ? 'bg-primary text-dark' : 'bg-gray-100 text-gray-700'}`}>
                      #{creator.rank}
                    </span>
                    <div className="lg:hidden"><CreatorCardActions creator={creator} compact /></div>
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <ResponsiveImage
                      sizes={creator.profile_picture_sizes || creator.profile_picture}
                      alt={creator.display_name}
                      className="h-14 w-14 flex-shrink-0 rounded-full"
                      objectFit="cover"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-dark group-hover:text-primary-dark">{creator.display_name}</h2>
                      <p className="truncate text-sm text-gray-500">@{creator.username}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-700 lg:mt-0">{creator.category || 'Creator'}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium capitalize text-gray-700 lg:mt-0">
                    <svg className={`h-5 w-5 ${config.color}`} viewBox="0 0 24 24" fill="currentColor">{config.icon}</svg>
                    {creator.platform === 'twitter' ? 'Twitter/X' : creator.platform}
                  </div>
                  <div className="mt-2 flex items-center justify-between lg:mt-0 lg:block">
                    <span className="text-xs text-gray-500 lg:hidden">Platform followers</span>
                    <span className="font-bold text-dark">{formatFollowers(creator.platform_followers)}</span>
                  </div>
                  <div className="hidden justify-end lg:flex">
                    <CreatorCardActions creator={creator} compact />
                  </div>
                  <ChevronRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300 lg:hidden" />
                </article>
              );
            })}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Leaderboard;
