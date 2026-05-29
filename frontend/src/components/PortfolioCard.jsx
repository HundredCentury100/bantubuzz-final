import { useState } from 'react';
import { BASE_URL } from '../services/api';

const PortfolioCard = ({ item, onClick, showActions = false, onEdit, onDelete }) => {
  const [imageError, setImageError] = useState(false);

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const platformColors = {
    instagram: { bg: 'bg-pink-100', text: 'text-pink-600' },
    tiktok: { bg: 'bg-gray-900', text: 'text-white' },
    youtube: { bg: 'bg-red-100', text: 'text-red-600' },
    facebook: { bg: 'bg-blue-100', text: 'text-blue-600' },
    twitter: { bg: 'bg-sky-100', text: 'text-sky-600' },
  };

  const platformColor = platformColors[item.platform?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-600' };
  const keyResult = item.result_description || (
    item.reach ? `${formatNumber(item.reach)} reach` :
    item.views ? `${formatNumber(item.views)} views` :
    item.likes ? `${formatNumber(item.likes)} likes` :
    null
  );

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
      {/* Featured Image */}
      {item.image_url && !imageError ? (
        <div
          className="aspect-video overflow-hidden bg-gray-100 cursor-pointer relative"
          onClick={() => !showActions && onClick && onClick(item)}
        >
          <img
            src={item.image_url.startsWith('http') ? item.image_url : `${BASE_URL}${item.image_url}`}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
          {item.is_featured && (
            <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Featured
            </div>
          )}
        </div>
      ) : (
        <div
          className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center cursor-pointer"
          onClick={() => !showActions && onClick && onClick(item)}
        >
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      <div className="p-5">
        {(item.platform || keyResult) && (
          <div className="mb-3 flex items-center justify-between gap-2">
            {item.platform ? (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${platformColor.bg} ${platformColor.text} capitalize`}>
              {item.platform}
            </span>
            ) : <span />}
            {keyResult && (
              <span className="max-w-[55%] truncate rounded-full bg-primary px-3 py-1 text-xs font-bold text-dark shadow-sm" title={keyResult}>
                {keyResult}
              </span>
            )}
          </div>
        )}

        {/* Title & Brand */}
        <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">{item.title}</h3>
        {item.brand_name && (
          <p className="text-sm text-gray-600 mb-3">for <span className="font-medium">{item.brand_name}</span></p>
        )}

        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-2">{item.description}</p>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4 bg-gray-50 rounded-xl p-3">
          {item.views !== null && item.views !== undefined ? (
            <div className="text-center">
              <div className="text-base font-bold text-gray-900">{formatNumber(item.views)}</div>
              <div className="text-xs text-gray-500">Views</div>
            </div>
          ) : null}

          {item.likes !== null && item.likes !== undefined ? (
            <div className="text-center">
              <div className="text-base font-bold text-gray-900">{formatNumber(item.likes)}</div>
              <div className="text-xs text-gray-500">Likes</div>
            </div>
          ) : null}

          {item.engagement_rate !== null && item.engagement_rate !== undefined ? (
            <div className="text-center">
              <div className="text-base font-bold text-gray-900">{(item.engagement_rate * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-500">ER</div>
            </div>
          ) : null}

          {/* If no metrics, show collaboration type or date */}
          {!item.views && !item.likes && !item.engagement_rate && item.collaboration_type && (
            <div className="col-span-3 text-center">
              <div className="text-sm font-medium text-gray-700">{item.collaboration_type}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEdit(item);
              }}
              className="flex-1 py-2 px-4 bg-primary hover:bg-primary-dark text-dark rounded-full font-medium transition-colors text-sm"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDelete(item);
              }}
              className="py-2 px-4 bg-red-100 hover:bg-red-200 text-red-600 rounded-full font-medium transition-colors text-sm"
            >
              Delete
            </button>
          </div>
        ) : (
          <button
            onClick={() => onClick && onClick(item)}
            className="w-full text-primary hover:text-primary-dark font-medium text-sm flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
          >
            View Details
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Visibility indicator for creator view */}
        {showActions && !item.is_visible && (
          <div className="mt-3 text-center">
            <span className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Hidden from public
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioCard;
