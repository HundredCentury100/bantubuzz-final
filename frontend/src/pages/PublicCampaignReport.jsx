import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Eye, Heart, MessageCircle, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { campaignsAPI, BASE_URL } from '../services/api';

const metric = (value) => Number(value || 0).toLocaleString();

export default function PublicCampaignReport() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    campaignsAPI.getPublicReport(token)
      .then((response) => setData(response.data))
      .catch((requestError) => setError(
        requestError.response?.data?.error || 'This report is unavailable.'
      ));
  }, [token]);

  const topCreators = useMemo(() => data?.report?.by_creator?.slice(0, 10) || [], [data]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md border border-gray-200 bg-white p-8 text-center rounded-lg">
          <h1 className="text-xl font-semibold text-gray-900">Report unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600">Loading report...</div>;
  }

  const { report, branding } = data;
  const overview = report.overview || {};
  const cards = [
    ['Reach', overview.total_reach, Users],
    ['Impressions', overview.total_impressions, Eye],
    ['Engagement', overview.total_engagements, Heart],
    ['Comments', overview.total_comments, MessageCircle],
    ['Campaign spend', `$${Number(overview.total_spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, BarChart3],
    ['Estimated ROI', `${Number(overview.estimated_roi || 0).toFixed(1)}%`, BarChart3],
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white" style={{ borderTop: `6px solid ${branding.primary_color}` }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <div className="flex min-w-0 items-center gap-4">
            {branding.logo ? <img src={`${BASE_URL}${branding.logo}`} alt="" className="h-12 w-24 object-contain" /> : <BarChart3 className="h-9 w-9" />}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500">{branding.name}</p>
              <h1 className="truncate text-2xl font-semibold">{report.campaign.title}</h1>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>{report.date_range.start_date} to {report.date_range.end_date}</p>
            <p>View-only stakeholder report</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-7 px-5 py-8">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {cards.map(([label, value, Icon]) => (
            <div key={label} className="border border-gray-200 bg-white p-4 rounded-lg">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-medium uppercase">{label}</span>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{typeof value === 'string' ? value : metric(value)}</p>
            </div>
          ))}
        </section>

        <section className="border border-gray-200 bg-white rounded-lg">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold">Creator performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr><th className="px-5 py-3">Creator</th><th className="px-5 py-3">Posts</th><th className="px-5 py-3">Reach</th><th className="px-5 py-3">Engagement</th><th className="px-5 py-3">Rate</th></tr>
              </thead>
              <tbody>
                {topCreators.map((creator) => (
                  <tr key={creator.creator_name} className="border-t border-gray-100">
                    <td className="px-5 py-3 font-medium">{creator.creator_name}</td>
                    <td className="px-5 py-3">{metric(creator.posts_count)}</td>
                    <td className="px-5 py-3">{metric(creator.reach)}</td>
                    <td className="px-5 py-3">{metric(creator.engagements)}</td>
                    <td className="px-5 py-3">{Number(creator.engagement_rate || 0).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border border-gray-200 bg-white rounded-lg">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold">Platform performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr><th className="px-5 py-3">Platform</th><th className="px-5 py-3">Posts</th><th className="px-5 py-3">Reach</th><th className="px-5 py-3">Engagement</th><th className="px-5 py-3">Rate</th></tr>
              </thead>
              <tbody>
                {(report.by_platform || []).map((platform) => (
                  <tr key={platform.platform} className="border-t border-gray-100">
                    <td className="px-5 py-3 font-medium capitalize">{platform.platform}</td>
                    <td className="px-5 py-3">{metric(platform.posts_count)}</td>
                    <td className="px-5 py-3">{metric(platform.reach)}</td>
                    <td className="px-5 py-3">{metric(platform.engagements)}</td>
                    <td className="px-5 py-3">{Number(platform.engagement_rate || 0).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <footer className="py-8 text-center text-xs text-gray-500">Powered by BantuBuzz</footer>
    </div>
  );
}
