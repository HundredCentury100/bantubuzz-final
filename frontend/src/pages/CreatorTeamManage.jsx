import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { creatorTeamAPI } from '../services/api';
import {
  ArrowLeftIcon,
  ClockIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserGroupIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

const roleOptions = [
  { value: 'manager', label: 'Manager', description: 'Profile, packages, collaborations, messages, and analytics.' },
  { value: 'agent', label: 'Agent', description: 'Collaborations, messages, and analytics without billing/profile control.' },
];

const auditLabels = {
  invitation_sent: 'Invitation sent',
  invitation_cancelled: 'Invitation cancelled',
  invitation_accepted: 'Invitation accepted',
  member_removed: 'Member removed',
  member_role_updated: 'Role updated',
};

export default function CreatorTeamManage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [seatUsage, setSeatUsage] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'manager' });

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await creatorTeamAPI.getTeam();
      setMembers(response.data.members || []);
      setInvitations(response.data.invitations || []);
      setSeatUsage(response.data.seat_usage || null);
      setAuditLogs(response.data.audit_logs || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load creator team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleInvite = async (event) => {
    event.preventDefault();
    if (!memberForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    try {
      setSaving(true);
      const response = await creatorTeamAPI.saveMember(memberForm);
      if (response.data.member) {
        setMembers((current) => {
          const withoutExisting = current.filter((member) => member.id !== response.data.member.id);
          return [...withoutExisting, response.data.member];
        });
      }
      if (response.data.invitation) {
        setInvitations((current) => {
          const withoutExisting = current.filter((invite) => invite.id !== response.data.invitation.id);
          return [response.data.invitation, ...withoutExisting];
        });
      }
      if (response.data.seat_usage) setSeatUsage(response.data.seat_usage);
      await fetchTeam();
      setMemberForm({ email: '', role: 'manager' });
      toast.success(response.data.invitation ? 'Team invitation sent' : 'Team member updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to invite team member');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      await creatorTeamAPI.cancelInvitation(invitationId);
      await fetchTeam();
      toast.success('Invitation cancelled');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel invitation');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this team member from your creator account?')) return;
    try {
      await creatorTeamAPI.removeMember(memberId);
      await fetchTeam();
      toast.success('Team member removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove team member');
    }
  };

  const seatsFull = seatUsage && seatUsage.available === 0;
  const limit = seatUsage?.limit ?? 0;
  const used = seatUsage?.used ?? members.length + invitations.length;
  const planName = seatUsage?.plan_name || 'Free';

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <main className="px-6 py-10 lg:px-12 xl:px-20">
        <div className="mx-auto max-w-6xl space-y-6">
          <Link to="/creator/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-dark">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark">Creator Team Access</h1>
              <p className="mt-2 max-w-2xl text-gray-600">
                Invite a manager or agent to help run your creator business while keeping billing and ownership under your control.
              </p>
            </div>
            <div className="rounded-2xl bg-primary/15 px-5 py-3 text-sm font-semibold text-dark">
              {used} / {limit} seats
              <p className="mt-1 text-xs font-medium text-gray-600">{planName} plan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
                  <UserPlusIcon className="h-5 w-5 text-dark" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark">Invite Team Member</h2>
                  <p className="text-sm text-gray-600">Rising includes 2 seats. Creator Pro includes 5.</p>
                </div>
              </div>

              <form onSubmit={handleInvite} className="space-y-4 rounded-2xl bg-light p-4">
                {limit === 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Creator team access is available on Rising and Creator Pro. Upgrade to invite managers or agents.
                  </div>
                )}
                {seatsFull && limit > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Your team seat limit is full. Remove a team member or pending invitation before adding another.
                  </div>
                )}
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-dark">Email</span>
                  <input
                    value={memberForm.email}
                    onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="manager@example.com"
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-dark">Role</span>
                  <select
                    value={memberForm.role}
                    onChange={(event) => setMemberForm((current) => ({ ...current, role: event.target.value }))}
                    className="input"
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </label>
                <div className="space-y-2">
                  {roleOptions.map((role) => (
                    <div key={role.value} className="rounded-xl border border-gray-100 bg-white p-3">
                      <p className="font-semibold text-dark">{role.label}</p>
                      <p className="text-xs text-gray-600">{role.description}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={saving || limit === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-dark px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                >
                  <UserPlusIcon className="h-4 w-4" />
                  {saving ? 'Sending...' : 'Invite Member'}
                </button>
              </form>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
                  <UserGroupIcon className="h-5 w-5 text-dark" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark">Current Team</h2>
                  <p className="text-sm text-gray-600">People who can help manage your creator account.</p>
                </div>
              </div>

              <div className="space-y-3">
                {members.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                    No team members yet.
                  </p>
                ) : members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-dark">{member.email}</p>
                      <p className="text-xs capitalize text-gray-500">{member.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="rounded-full p-2 text-red-600 hover:bg-red-50"
                      title="Remove member"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {invitations.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Pending Invitations</h3>
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4 text-amber-600" />
                            <p className="truncate font-semibold text-dark">{invitation.email}</p>
                          </div>
                          <p className="mt-1 text-xs capitalize text-gray-600">
                            {invitation.role} invite
                            {invitation.expires_at ? ` - expires ${new Date(invitation.expires_at).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="rounded-full p-2 text-red-600 hover:bg-red-50"
                          title="Cancel invitation"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
                <ShieldCheckIcon className="h-5 w-5 text-dark" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-dark">Team Audit Log</h2>
                <p className="text-sm text-gray-600">Invitation, removal, and role-change history.</p>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                No creator team changes recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-dark">{auditLabels[log.action] || log.action}</p>
                      <p className="text-sm text-gray-600">{log.target_email}{log.role ? ` as ${log.role}` : ''}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {log.actor_email ? `By ${log.actor_email}` : 'System'}
                      {log.created_at ? ` - ${new Date(log.created_at).toLocaleString()}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
