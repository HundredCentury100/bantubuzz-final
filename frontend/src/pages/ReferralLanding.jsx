import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BriefcaseBusiness, UserRound } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { getReferralVisitor, setReferralAttribution } from '../utils/referrals';

const ReferralLanding = () => {
  const { code } = useParams();
  const [state, setState] = useState('loading');

  useEffect(() => {
    const resolve = async () => {
      try {
        const response = await api.post(`/referrals/resolve/${encodeURIComponent(code)}`, {
          visitor_token: getReferralVisitor(),
          source: 'shared_link',
        });
        setReferralAttribution(response.data.code, response.data.visitor_token);
        setState('ready');
      } catch {
        setState('invalid');
      }
    };
    resolve();
  }, [code]);

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <main className="container-custom py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          {state === 'loading' && (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary-dark" />
            </div>
          )}

          {state === 'invalid' && (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <h1 className="text-2xl font-bold text-dark">This referral link is unavailable</h1>
              <p className="mt-2 text-gray-600">You can still create a BantuBuzz account.</p>
              <Link to="/register/brand" className="btn btn-primary mt-6 inline-flex">Create account</Link>
            </div>
          )}

          {state === 'ready' && (
            <>
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase text-primary-dark">You have been invited</p>
                <h1 className="mt-2 text-3xl font-bold text-dark sm:text-4xl">Join BantuBuzz</h1>
                <p className="mt-3 text-gray-600">Choose the account that matches how you work.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link
                  to="/register/creator"
                  className="group rounded-lg border border-gray-200 bg-white p-6 transition hover:border-primary-dark hover:shadow-md"
                >
                  <UserRound className="h-7 w-7 text-primary-dark" />
                  <h2 className="mt-5 text-xl font-bold text-dark">Creator</h2>
                  <p className="mt-2 text-sm text-gray-600">Showcase your work and collaborate with brands.</p>
                  <span className="mt-6 inline-block font-semibold text-primary-dark">Continue as creator</span>
                </Link>
                <Link
                  to="/register/brand"
                  className="group rounded-lg border border-gray-200 bg-white p-6 transition hover:border-primary-dark hover:shadow-md"
                >
                  <BriefcaseBusiness className="h-7 w-7 text-primary-dark" />
                  <h2 className="mt-5 text-xl font-bold text-dark">Brand or Agency</h2>
                  <p className="mt-2 text-sm text-gray-600">Find creators and manage collaboration campaigns.</p>
                  <span className="mt-6 inline-block font-semibold text-primary-dark">Continue as brand</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReferralLanding;
