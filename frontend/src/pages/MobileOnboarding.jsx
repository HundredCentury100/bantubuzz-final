import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const onboardingSeenKey = 'bantubuzz_mobile_onboarding_seen';

const slides = [
  {
    kind: 'splash',
    image: '/mobile/onboarding/logo-b.png',
    alt: 'BantuBuzz',
  },
  {
    image: '/mobile/onboarding/discover.png',
    alt: 'Creators taking social content',
    title: 'Discover Top Talent',
    subtitle: 'Find the perfect creators for your brand',
    button: 'Continue',
  },
  {
    image: '/mobile/onboarding/monetize.png',
    alt: 'Creator creating mobile content',
    title: 'Monetize Your Influence',
    subtitle: 'Secure payments and detailed ROI analytics at your fingertips',
    button: 'Next',
  },
  {
    image: '/mobile/onboarding/connect.png',
    alt: 'Creators collaborating through mobile content',
    title: 'Connect Seamlessly',
    subtitle: 'Communicate, negotiate, and collaborate all in one place',
    button: 'Next',
  },
];

export default function MobileOnboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [index, setIndex] = useState(0);

  const destination = useMemo(() => {
    if (!isAuthenticated) return '/login';
    if (user?.user_type === 'creator') return '/creator/dashboard';
    if (user?.user_type === 'brand') return '/brand/dashboard';
    return '/';
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (index !== 0) return undefined;
    const timer = window.setTimeout(() => setIndex(1), 1400);
    return () => window.clearTimeout(timer);
  }, [index]);

  const complete = () => {
    localStorage.setItem(onboardingSeenKey, 'true');
    navigate(destination, { replace: true });
  };

  const next = () => {
    if (index >= slides.length - 1) {
      complete();
      return;
    }
    setIndex((current) => current + 1);
  };

  const slide = slides[index];

  if (slide.kind === 'splash') {
    return (
      <main className="min-h-screen bg-[#f7f9f6] flex items-center justify-center px-6">
        <img
          src={slide.image}
          alt={slide.alt}
          className="h-28 w-28 object-contain drop-shadow-md"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f9f6] px-7 py-10 text-dark">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col">
        <button
          type="button"
          onClick={complete}
          className="self-end px-2 py-1 text-lg font-medium text-[#7f8b2a]"
        >
          Skip
        </button>

        <section className="flex flex-1 flex-col items-center justify-end pb-12">
          <div className="flex w-full flex-1 items-end justify-center">
            <img
              src={slide.image}
              alt={slide.alt}
              className="max-h-[46vh] w-[115%] max-w-none object-contain"
            />
          </div>

          <div className="mt-14 w-full text-center">
            <h1 className="text-[42px] font-extrabold leading-[0.98] tracking-tight text-dark sm:text-5xl">
              {slide.title}
            </h1>
            <p className="mx-auto mt-8 max-w-xs text-xl leading-snug text-gray-700">
              {slide.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={next}
            className="mt-12 h-20 w-full rounded-[28px] bg-primary px-8 text-xl font-bold text-dark shadow-sm transition hover:bg-primary-dark/90"
          >
            {slide.button}
          </button>
        </section>
      </div>
    </main>
  );
}
