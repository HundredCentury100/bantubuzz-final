import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ArrowRight, Bookmark, Users } from 'lucide-react';

const CampaignCreated = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Navbar />

      <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-4xl items-center px-4 py-10">
        <section className="w-full rounded-3xl bg-white p-6 shadow-xl sm:p-10">
          <div className="mb-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-dark">
              <Users className="h-7 w-7" />
            </div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-dark">
              Campaign created
            </p>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Your campaign brief is set. Now add creators to your campaign.
            </h1>
            <p className="mt-4 max-w-2xl text-gray-600">
              You can start sourcing creators now, or save the campaign as a draft and come back when you are ready.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate(`/brand/campaigns/${id}/source-creators`)}
              className="flex min-h-36 items-start justify-between rounded-2xl border-2 border-primary bg-primary/10 p-5 text-left transition hover:bg-primary/20"
            >
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-dark">
                  <Users className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Add Creators</h2>
                <p className="mt-2 text-sm text-gray-700">
                  Invite creators, add packages to cart, or publish for applications.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 flex-shrink-0 text-dark" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/brand/campaigns')}
              className="flex min-h-36 items-start justify-between rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-gray-300 hover:bg-gray-50"
            >
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <Bookmark className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Save as Draft</h2>
                <p className="mt-2 text-sm text-gray-700">
                  Keep the campaign private and return to it from your campaigns page.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 flex-shrink-0 text-gray-500" />
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={`/brand/campaigns/${id}`}
              className="rounded-xl border border-gray-200 px-5 py-3 text-center font-medium text-gray-700 transition hover:bg-gray-50"
            >
              View Campaign
            </Link>
            <Link
              to={`/brand/campaigns/${id}/edit`}
              className="rounded-xl border border-gray-200 px-5 py-3 text-center font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Edit Brief
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CampaignCreated;
