import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { campaignsAPI } from '../services/api';

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;
const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const scenarioStyles = {
  worst: 'border-red-200 bg-red-50 text-red-900',
  base: 'border-blue-200 bg-blue-50 text-blue-900',
  predicted: 'border-primary/40 bg-primary/10 text-dark',
  best: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

const CampaignScenarioPanel = ({ campaignId, cartItems = [] }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cartSignature = useMemo(
    () => cartItems.map((item) => item.id).sort((a, b) => a - b).join(','),
    [cartItems],
  );

  const fetchPrediction = async () => {
    if (!campaignId || cartItems.length === 0) return;
    try {
      setLoading(true);
      setError('');
      const response = await campaignsAPI.getCartScenarios(campaignId);
      setPrediction(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to calculate scenario analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cartSignature) return;
    const timer = setTimeout(fetchPrediction, 800);
    return () => clearTimeout(timer);
  }, [campaignId, cartSignature]);

  if (cartItems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary-dark">
            <Sparkles className="h-4 w-4" />
            AI Scenario Analysis
          </div>
          <h3 className="text-xl font-bold text-gray-900">Predicted campaign outcomes</h3>
          <p className="mt-1 text-sm text-gray-600">
            Estimated from this cart selection, creator platform stats, and similar historical campaign data.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPrediction}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary hover:bg-primary/5"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && !prediction ? (
        <div className="grid gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Scenario analysis unavailable</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : prediction?.status === 'ready' ? (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">Confidence</p>
              <p className="mt-1 text-2xl font-bold text-dark">{prediction.confidence}%</p>
              <p className="text-sm text-gray-600">{prediction.confidence_label}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">Similar campaigns</p>
              <p className="mt-1 text-2xl font-bold text-dark">{prediction.similar_campaigns_count}</p>
              <p className="text-sm text-gray-600">{prediction.cold_start ? 'Using industry benchmarks' : 'Historical data available'}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">Creator mix</p>
              <p className="mt-1 text-2xl font-bold text-dark">{prediction.creator_count}</p>
              <p className="text-sm text-gray-600">{(prediction.inputs_summary?.platforms || []).join(', ') || 'Platform data pending'}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {(prediction.scenarios || []).map((scenario) => (
              <div key={scenario.key} className={`rounded-2xl border p-4 ${scenarioStyles[scenario.key] || 'border-gray-200 bg-gray-50'}`}>
                <div className="mb-3 flex items-center gap-2">
                  {scenario.key === 'predicted' ? <TrendingUp className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
                  <h4 className="font-bold">{scenario.label}</h4>
                </div>
                <p className="mb-4 min-h-[42px] text-xs opacity-80">{scenario.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><span>Reach</span><strong>{formatNumber(scenario.estimated_reach)}</strong></div>
                  <div className="flex justify-between gap-3"><span>Engagement</span><strong>{formatPercent(scenario.engagement_rate)}</strong></div>
                  <div className="flex justify-between gap-3"><span>CPM</span><strong>{formatCurrency(scenario.cpm)}</strong></div>
                  <div className="flex justify-between gap-3"><span>Sentiment</span><strong>{formatPercent(scenario.predicted_sentiment)}</strong></div>
                </div>
                <p className="mt-3 text-xs opacity-70">{scenario.confidence_bound}</p>
              </div>
            ))}
          </div>

          {(prediction.suggestions || []).length > 0 && (
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <h4 className="mb-3 font-bold text-dark">Optimisation suggestions</h4>
              <div className="grid gap-3 lg:grid-cols-3">
                {prediction.suggestions.map((suggestion) => (
                  <div key={`${suggestion.type}-${suggestion.title}`} className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="font-semibold text-gray-900">{suggestion.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{suggestion.description}</p>
                    <p className="mt-3 text-sm font-semibold text-primary-dark">{suggestion.predicted_improvement}</p>
                    <p className="text-xs text-gray-500">Additional cost: {suggestion.additional_cost}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-600">
          {prediction?.message || 'Add creators to the cart to see predicted campaign outcomes.'}
        </div>
      )}
    </div>
  );
};

export default CampaignScenarioPanel;
