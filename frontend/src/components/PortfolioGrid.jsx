import { useState, useEffect } from 'react';
import PortfolioCard from './PortfolioCard';
import PortfolioDetailModal from './PortfolioDetailModal';
import portfolioAPI from '../services/portfolioAPI';
import toast from 'react-hot-toast';

const PortfolioGrid = ({ creatorId, showActions = false, onEdit, onDelete, onRefresh }) => {
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, [creatorId]);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const response = showActions
        ? await portfolioAPI.getMyPortfolio()
        : await portfolioAPI.getCreatorPortfolio(creatorId);

      setPortfolioItems(response.data.portfolio_items || []);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      if (showActions) {
        toast.error('Failed to load portfolio');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
            <div className="aspect-video bg-gray-200"></div>
            <div className="p-5 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (portfolioItems.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl shadow-md">
        <svg
          className="mx-auto h-16 w-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {showActions ? 'No Success Stories Yet' : 'No success stories yet'}
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          {showActions
            ? 'Start building your profile by adding your best collaborations and success stories.'
            : 'This creator hasn\'t added any success stories yet.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolioItems.map((item) => (
          <PortfolioCard
            key={item.id}
            item={item}
            onClick={handleViewDetails}
            showActions={showActions}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <PortfolioDetailModal
          item={selectedItem}
          onClose={handleCloseDetail}
        />
      )}
    </>
  );
};

export default PortfolioGrid;
