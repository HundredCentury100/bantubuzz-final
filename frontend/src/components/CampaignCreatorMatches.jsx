import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Brain, PackagePlus, Sparkles, ThumbsDown, ThumbsUp, UserRound } from 'lucide-react';
import { campaignsAPI } from '../services/api';

const formatNumber = (value) => {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return number.toLocaleString();
};

const CampaignCreatorMatches = ({ campaignId }) => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [accessError, setAccessError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(null);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setAccessError(null);
      const response = await campaignsAPI.getCreatorMatches(campaignId, { limit: 25 });
      setMatches(response.data.matches || []);
    } catch (error) {
      if (error.response?.status === 403) {
        setAccessError(error.response.data);
      } else {
        toast.error(error.response?.data?.error || 'Failed to load AI matches');
      }
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [campaignId]);

  const submitFeedback = async (creatorId, feedback) => {
    try {
      setFeedbackLoading(`${creatorId}-${feedback}`);
      await campaignsAPI.submitCreatorMatchFeedback(campaignId, creatorId, { feedback });
      setMatches((current) => current.map((match) => (
        match.creator.id === creatorId ? { ...match, existing_feedback: feedback } : match
      )));
      toast.success(feedback === 'up' ? 'Marked as a good match' : 'Thanks, we will tune future matches');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save feedback');
    } finally {
      setFeedbackLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-lg">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Finding the strongest creator matches...
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary-dark">
              <Brain className="h-4 w-4" />
              Pro Feature
            </div>
            <h2 className="text-2xl font-bold text-gray-900">AI Creator Matching</h2>
            <p className="mt-2 max-w-2xl text-gray-600">
              {accessError.error || 'AI creator matching is available on Pro and higher brand plans.'}
            </p>
          </div>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary-dark">
              <Sparkles className="h-4 w-4" />
              AI Suggested Creators
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Best matches for this brief</h2>
            <p className="mt-1 text-sm text-gray-600">
              Ranked from campaign brief, brand profile, target audience, niche alignment, audience fit, and engagement quality.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchMatches}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-primary hover:bg-primary/5"
          >
            Refresh matches
          </button>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-lg">
          <Brain className="mx-auto mb-4 h-10 w-10 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">No matches yet</h3>
          <p className="mt-2 text-gray-600">
            Add more campaign targeting or creator packages, then refresh the suggestions.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {matches.map((match, index) => {
            const creator = match.creator || {};
            const creatorName = creator.display_name || creator.username || 'Creator';
            const profileUrl = creator.username ? `/${creator.username}` : `/creator/${creator.user_id}`;
            return (
              <div key={creator.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary/70 hover:shadow-md">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary-dark">
                      #{index + 1}
                    </div>
                    {creator.profile_picture ? (
                      <img
                        src={creator.profile_picture}
                        alt={creatorName}
                        className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <UserRound className="h-7 w-7 text-gray-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{creatorName}</h3>
                        <span className="rounded-full bg-dark px-3 py-1 text-sm font-semibold text-white">
                          {match.match_score}% match
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{creator.bio || 'Creator profile available for review.'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(creator.categories || []).slice(0, 3).map((category) => (
                          <span key={category} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-dark">
                            {category}
                          </span>
                        ))}
                        {match.top_platform && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            Top platform: {match.top_platform.platform} · {formatNumber(match.top_platform.followers)}
                          </span>
                        )}
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          From ${match.starting_price}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-80">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-500">Niche</p>
                        <p className="font-bold text-gray-900">{match.breakdown?.niche_alignment}%</p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-500">Audience</p>
                        <p className="font-bold text-gray-900">{match.breakdown?.audience_overlap}%</p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-500">Engage.</p>
                        <p className="font-bold text-gray-900">{match.breakdown?.engagement_quality}%</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Link
                        to={profileUrl}
                        className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary hover:bg-primary/5"
                      >
                        View Profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => navigate(`/brand/campaigns/${campaignId}/browse-packages?creator=${creator.id}`)}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
                      >
                        <PackagePlus className="h-4 w-4" />
                        Packages
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {(match.reasons || []).map((reason) => (
                      <span key={reason} className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        {reason}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Improve matches</span>
                    <button
                      type="button"
                      title="Good match"
                      onClick={() => submitFeedback(creator.id, 'up')}
                      disabled={feedbackLoading === `${creator.id}-up`}
                      className={`rounded-full border p-2 transition ${
                        match.existing_feedback === 'up'
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 text-gray-600 hover:border-primary hover:text-primary'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Not a fit"
                      onClick={() => submitFeedback(creator.id, 'down')}
                      disabled={feedbackLoading === `${creator.id}-down`}
                      className={`rounded-full border p-2 transition ${
                        match.existing_feedback === 'down'
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-gray-300 text-gray-600 hover:border-red-500 hover:text-red-500'
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignCreatorMatches;
