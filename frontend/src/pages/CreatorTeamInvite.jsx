import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { creatorTeamAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

export default function CreatorTeamInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        setLoading(true);
        const response = await creatorTeamAPI.getInvitation(token);
        setInviteData(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Invitation not found or expired');
      } finally {
        setLoading(false);
      }
    };
    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      await creatorTeamAPI.acceptInvitation(token);
      toast.success('Creator team invitation accepted');
      navigate('/creator/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const invitation = inviteData?.invitation;
  const creator = inviteData?.creator;
  const canAccept = isAuthenticated && user?.email?.toLowerCase() === invitation?.email?.toLowerCase();

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <main className="px-6 py-12 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : error ? (
              <div className="text-center">
                <ExclamationCircleIcon className="mx-auto h-14 w-14 text-red-500" />
                <h1 className="mt-4 text-2xl font-bold text-dark">Invitation unavailable</h1>
                <p className="mt-2 text-gray-600">{error}</p>
                <Link to="/" className="btn btn-primary mt-6">Go to BantuBuzz</Link>
              </div>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                  <UserGroupIcon className="h-7 w-7 text-dark" />
                </div>
                <h1 className="mt-5 text-3xl font-bold text-dark">You have been invited</h1>
                <p className="mt-3 text-gray-600">
                  Join <span className="font-semibold text-dark">{creator?.display_name || creator?.username}</span>'s creator team as a{' '}
                  <span className="font-semibold text-dark">{invitation?.role}</span>.
                </p>

                <div className="mt-6 rounded-2xl border border-gray-100 bg-light p-5">
                  <p className="text-sm font-medium text-gray-500">Invitation Email</p>
                  <p className="mt-1 font-semibold text-dark">{invitation?.email}</p>
                  {invitation?.expires_at && (
                    <p className="mt-2 text-sm text-gray-500">
                      Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {!isAuthenticated && (
                  <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <p className="font-semibold text-dark">Sign in to accept this invitation</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Use the email address that received this invitation. New team members can create a creator account first.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link to="/login" className="btn btn-primary">Sign In</Link>
                      <Link to="/register/creator" className="btn btn-secondary">Create Creator Account</Link>
                    </div>
                  </div>
                )}

                {isAuthenticated && !canAccept && (
                  <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <p className="font-semibold text-dark">Wrong signed-in account</p>
                    <p className="mt-1 text-sm text-gray-600">
                      This invite is for {invitation?.email}. Sign in with that email address to accept it.
                    </p>
                  </div>
                )}

                {canAccept && (
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={accepting}
                    className="btn btn-primary mt-6 inline-flex items-center gap-2"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    {accepting ? 'Accepting...' : 'Accept Invitation'}
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
