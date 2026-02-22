import React from 'react';
import { Check, Clock, Lock, AlertCircle, Calendar } from 'lucide-react';

const MilestoneTimeline = ({ milestones, onMilestoneClick }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <Check className="text-white" size={20} />;
      case 'in_progress':
        return <Clock className="text-white" size={20} />;
      case 'pending':
        return <Lock className="text-white" size={20} />;
      default:
        return <AlertCircle className="text-white" size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'bg-green-600';
      case 'in_progress':
        return 'bg-blue-600';
      case 'pending':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'approved':
        return 'Approved';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Locked';
      default:
        return status;
    }
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateDaysRemaining = (releaseDate) => {
    if (!releaseDate) return null;
    const now = new Date();
    const release = new Date(releaseDate);
    const diffInDays = Math.ceil((release - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffInDays);
  };

  return (
    <div className="space-y-6">
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;
        const daysRemaining = calculateDaysRemaining(milestone.escrow_release_date);

        return (
          <div key={milestone.id} className="relative">
            {/* Timeline Line */}
            {!isLast && (
              <div
                className={`absolute left-6 top-14 w-0.5 h-full ${
                  milestone.status === 'approved' || milestone.status === 'completed'
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                }`}
              />
            )}

            {/* Milestone Card */}
            <div
              className={`bg-white rounded-lg shadow-sm border-2 transition-all cursor-pointer hover:shadow-md ${
                milestone.status === 'in_progress'
                  ? 'border-blue-500'
                  : milestone.status === 'approved' || milestone.status === 'completed'
                  ? 'border-green-500'
                  : 'border-gray-200'
              }`}
              onClick={() => onMilestoneClick && onMilestoneClick(milestone)}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(
                      milestone.status
                    )}`}
                  >
                    {getStatusIcon(milestone.status)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Milestone {milestone.milestone_number}: {milestone.title}
                        </h3>
                        <p className="text-sm text-gray-500">{getStatusText(milestone.status)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          ${parseFloat(milestone.price).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Expected Deliverables */}
                    {milestone.expected_deliverables && milestone.expected_deliverables.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Expected Deliverables:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {milestone.expected_deliverables.map((deliverable, dIndex) => (
                            <li key={dIndex} className="text-sm text-gray-600">
                              {deliverable}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      {milestone.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>Due: {formatDate(milestone.due_date)}</span>
                        </div>
                      )}
                      {milestone.completed_at && (
                        <div className="flex items-center gap-1">
                          <Check size={14} />
                          <span>Completed: {formatDate(milestone.completed_at)}</span>
                        </div>
                      )}
                      {milestone.approved_at && (
                        <div className="flex items-center gap-1">
                          <Check size={14} />
                          <span>Approved: {formatDate(milestone.approved_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Escrow Countdown */}
                    {milestone.escrow_release_date && daysRemaining !== null && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-amber-600" />
                          <p className="text-sm text-amber-800">
                            <strong>Escrow:</strong> Funds release in {daysRemaining} day
                            {daysRemaining !== 1 ? 's' : ''} ({formatDate(milestone.escrow_release_date)})
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Deliverable Count */}
                    {milestone.deliverables && milestone.deliverables.length > 0 && (
                      <div className="mt-3 p-2 bg-primary-light rounded">
                        <p className="text-sm text-primary-dark">
                          <strong>{milestone.deliverables.length}</strong> deliverable
                          {milestone.deliverables.length !== 1 ? 's' : ''} submitted
                        </p>
                      </div>
                    )}

                    {/* Status Messages */}
                    {milestone.status === 'pending' && index > 0 && (
                      <div className="mt-3 p-2 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">
                          This milestone will unlock after the previous milestone is approved
                        </p>
                      </div>
                    )}

                    {milestone.status === 'in_progress' && (
                      <div className="mt-3 p-2 bg-blue-50 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>Action Required:</strong> Submit deliverables for this milestone
                        </p>
                      </div>
                    )}

                    {milestone.status === 'completed' && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Awaiting Approval:</strong> Brand is reviewing your deliverables
                        </p>
                      </div>
                    )}

                    {milestone.status === 'approved' && !milestone.escrow_release_date && (
                      <div className="mt-3 p-2 bg-green-50 rounded">
                        <p className="text-sm text-green-800">
                          <strong>Approved!</strong> Payment will be processed shortly
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Overall Progress */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Overall Progress</h4>
            <span className="text-sm text-gray-600">
              {milestones.filter((m) => m.status === 'approved' || m.status === 'completed').length} /{' '}
              {milestones.length} Milestones
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{
                width: `${
                  (milestones.filter((m) => m.status === 'approved' || m.status === 'completed')
                    .length /
                    milestones.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneTimeline;
