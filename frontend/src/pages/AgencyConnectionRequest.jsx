import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { workspacesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { BuildingOffice2Icon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const AgencyConnectionRequest = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    workspacesAPI.getConnectionRequest(token)
      .then((response) => setConnection(response.data.request))
      .catch((err) => setError(err.response?.data?.error || 'Connection request not found or unavailable'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, token]);

  const respond = async (approved) => {
    try {
      setResponding(true);
      const response = await workspacesAPI.respondToConnectionRequest(token, approved);
      toast.success(response.data.message);
      navigate('/brand/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to update this request');
    } finally {
      setResponding(false);
    }
  };

  const correctAccount = user?.user_type === 'brand';
  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <main className="px-6 py-12 lg:px-12">
        <section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
          {!isAuthenticated ? (
            <>
              <h1 className="text-3xl font-bold text-dark">Sign in to review this request</h1>
              <p className="mt-3 text-gray-600">Use the owner account for the brand receiving this agency management request.</p>
              <Link to="/login" className="btn btn-primary mt-6">Sign in</Link>
            </>
          ) : loading ? (
            <div className="flex min-h-[200px] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" /></div>
          ) : error ? (
            <div className="text-center"><ExclamationCircleIcon className="mx-auto h-14 w-14 text-red-500" /><h1 className="mt-4 text-2xl font-bold text-dark">Request unavailable</h1><p className="mt-2 text-gray-600">{error}</p></div>
          ) : !correctAccount ? (
            <div className="text-center"><ExclamationCircleIcon className="mx-auto h-14 w-14 text-red-500" /><h1 className="mt-4 text-2xl font-bold text-dark">Brand account required</h1><p className="mt-2 text-gray-600">Sign in as the brand owner to review this agency request.</p></div>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15"><BuildingOffice2Icon className="h-7 w-7 text-dark" /></div>
              <h1 className="mt-5 text-3xl font-bold text-dark">Agency management request</h1>
              <p className="mt-3 text-gray-600"><strong className="text-dark">{connection?.agency_name}</strong> wants to manage <strong className="text-dark">{connection?.client_name}</strong> through an agency client workspace.</p>
              <div className="mt-6 rounded-2xl border border-gray-100 bg-light p-5 text-sm leading-relaxed text-gray-700">Accepting lets the agency collaborate from a dedicated client workspace. Your brand account, login, and public brand identity remain yours.</div>
              {connection?.status === 'pending' ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" disabled={responding} onClick={() => respond(true)} className="btn btn-primary inline-flex items-center gap-2"><CheckCircleIcon className="h-5 w-5" />{responding ? 'Saving...' : 'Approve agency access'}</button>
                  <button type="button" disabled={responding} onClick={() => respond(false)} className="btn btn-secondary">Decline</button>
                </div>
              ) : <p className="mt-6 rounded-xl bg-gray-100 p-4 font-semibold text-gray-700">This request is {connection?.status}.</p>}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default AgencyConnectionRequest;
