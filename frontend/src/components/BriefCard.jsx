import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  DollarSign,
  Target,
  MapPin,
  Users,
  Clock,
  Award
} from 'lucide-react';

const BriefCard = ({ brief }) => {
  const formatBudget = (min, max) => {
    if (min && max) {
      return `$${min} - $${max}`;
    } else if (min) {
      return `From $${min}`;
    } else if (max) {
      return `Up to $${max}`;
    }
    return 'Negotiable';
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const timeAgo = (date) => {
    const now = new Date();
    const posted = new Date(date);
    const diffInHours = Math.floor((now - posted) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  return (
    <Link to={`/briefs/${brief.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-primary">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(brief.status)}`}>
                {brief.status.charAt(0).toUpperCase() + brief.status.slice(1)}
              </span>
              {brief.has_milestones && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-light text-primary-dark flex items-center gap-1">
                  <Award size={12} />
                  Milestones
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-primary transition-colors">
              {brief.title}
            </h3>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Clock size={14} />
            {timeAgo(brief.created_at)}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-4 line-clamp-2">
          {brief.description}
        </p>

        {/* Goal */}
        {brief.goal && (
          <div className="mb-4 p-3 bg-primary-light rounded-lg">
            <div className="flex items-start gap-2">
              <Target size={16} className="text-primary mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-primary-dark mb-1">Goal</p>
                <p className="text-sm text-primary-dark line-clamp-2">{brief.goal}</p>
              </div>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Budget */}
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Budget</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatBudget(brief.budget_min, brief.budget_max)}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Timeline</p>
              <p className="text-sm font-semibold text-gray-900">
                {brief.timeline_days} days
              </p>
            </div>
          </div>
        </div>

        {/* Platform */}
        {brief.platform && (
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {brief.platform}
            </span>
          </div>
        )}

        {/* Categories */}
        {brief.target_categories && brief.target_categories.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Looking for</p>
            <div className="flex flex-wrap gap-2">
              {brief.target_categories.slice(0, 3).map((category, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                >
                  {category}
                </span>
              ))}
              {brief.target_categories.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  +{brief.target_categories.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          {/* Follower Range */}
          {(brief.target_min_followers || brief.target_max_followers) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users size={16} />
              <span>
                {brief.target_min_followers && brief.target_max_followers
                  ? `${brief.target_min_followers.toLocaleString()} - ${brief.target_max_followers.toLocaleString()} followers`
                  : brief.target_min_followers
                  ? `${brief.target_min_followers.toLocaleString()}+ followers`
                  : `Up to ${brief.target_max_followers.toLocaleString()} followers`}
              </span>
            </div>
          )}

          {/* Location */}
          {brief.target_locations && brief.target_locations.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={16} />
              <span>{brief.target_locations[0]}</span>
              {brief.target_locations.length > 1 && (
                <span className="text-xs text-gray-500">
                  +{brief.target_locations.length - 1}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Milestones Count */}
        {brief.milestones && brief.milestones.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-primary">{brief.milestones.length}</span> milestone{brief.milestones.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Proposals Count (for brand view) */}
        {brief.proposals_count !== undefined && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-primary">{brief.proposals_count}</span> proposal{brief.proposals_count !== 1 ? 's' : ''} received
            </p>
          </div>
        )}

        {/* Brand Info (for creator view) */}
        {brief.brand && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
            {brief.brand.logo ? (
              <img
                src={`${import.meta.env.VITE_API_URL}${brief.brand.logo}`}
                alt={brief.brand.company_name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">
                  {brief.brand.company_name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{brief.brand.company_name}</p>
              {brief.brand.industry && (
                <p className="text-xs text-gray-500">{brief.brand.industry}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
};

export default BriefCard;
