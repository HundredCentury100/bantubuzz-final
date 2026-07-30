import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { workspacesAPI } from '../services/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  ClockIcon,
  ClipboardDocumentListIcon,
  TrashIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'viewer', label: 'Viewer' },
];

const auditLabels = {
  invitation_sent: 'Invitation sent',
  invitation_cancelled: 'Invitation cancelled',
  invitation_accepted: 'Invitation accepted',
  member_added: 'Member added',
  member_removed: 'Member removed',
  member_role_updated: 'Role updated',
};

const WorkspaceManage = () => {
  const { id } = useParams();
  const { workspaceMeta, refreshWorkspaces } = useWorkspace() || {};
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [seatUsage, setSeatUsage] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'manager' });
  const [form, setForm] = useState({
    name: '',
    industry: '',
    billing_email: '',
    website: '',
    description: '',
  });

  const language = workspaceMeta?.language || {
    workspace_singular: 'client',
    dashboard_title: 'Agency Dashboard',
  };
  const label = language.workspace_singular[0].toUpperCase() + language.workspace_singular.slice(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [workspaceRes, membersRes] = await Promise.all([
        workspacesAPI.getWorkspace(id),
        workspacesAPI.getMembers(id),
      ]);
      const nextWorkspace = workspaceRes.data.workspace;
      setWorkspace(nextWorkspace);
      setMembers(membersRes.data.members || []);
      setInvitations(membersRes.data.invitations || []);
      setSeatUsage(membersRes.data.seat_usage || null);
      setAuditLogs(membersRes.data.audit_logs || []);
      setForm({
        name: nextWorkspace.name || '',
        industry: nextWorkspace.industry || '',
        billing_email: nextWorkspace.billing_email || '',
        website: nextWorkspace.website || '',
        description: nextWorkspace.description || '',
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await workspacesAPI.updateWorkspace(id, form);
      setWorkspace(response.data.workspace);
      await refreshWorkspaces?.();
      toast.success(`${label} workspace updated`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    if (!memberForm.email.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      setInviting(true);
      const response = await workspacesAPI.saveMember(id, memberForm);
      if (response.data.member) {
        setMembers((current) => {
          const withoutExisting = current.filter((member) => member.id !== response.data.member.id);
          return [...withoutExisting, response.data.member];
        });
      }
      if (response.data.invitation) {
        setInvitations((current) => {
          const withoutExisting = current.filter((invitation) => invitation.id !== response.data.invitation.id);
          return [response.data.invitation, ...withoutExisting];
        });
      }
      if (response.data.seat_usage) {
        setSeatUsage(response.data.seat_usage);
      }
      await fetchData();
      setMemberForm({ email: '', role: 'manager' });
      if (response.data.invitation && response.data.email_sent === false) {
        if (response.data.invitation_url && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(response.data.invitation_url);
          toast.error('Invitation created, but email delivery could not be confirmed. Invite link copied to clipboard.');
        } else {
          toast.error('Invitation created, but email delivery could not be confirmed. Open the pending invitation and resend after SMTP is checked.');
        }
      } else {
        toast.success(response.data.invitation ? 'Team invitation sent' : 'Team member assigned');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign team member');
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      await workspacesAPI.cancelInvitation(invitationId);
      setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
      await fetchData();
      toast.success('Invitation cancelled');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel invitation');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await workspacesAPI.removeMember(id, memberId);
      setMembers((current) => current.filter((member) => member.id !== memberId));
      await fetchData();
      toast.success('Team member removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove team member');
    }
  };

  const seatsFull = seatUsage && seatUsage.available === 0;
  const inviteDisabled = inviting;
  const seatLimitLabel = seatUsage?.limit ?? 1;
  const seatUsedLabel = seatUsage?.used ?? members.length + invitations.length;

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
          <Link to="/brand/agency" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-dark">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to {language.dashboard_title}
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark">{workspace?.name}</h1>
              <p className="mt-2 text-gray-600">Manage {label.toLowerCase()} details, team access, and permissions.</p>
            </div>
            <div className="rounded-full bg-primary/15 px-4 py-2 text-sm font-semibold text-dark">
              {workspace?.active_collaborations_count || 0} active collaborations
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
                  <BuildingOffice2Icon className="h-5 w-5 text-dark" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark">{label} Profile</h2>
                  <p className="text-sm text-gray-600">Used for workspace reporting and billing breakdowns.</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-dark">{label} Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-dark">Industry</span>
                  <input
                    value={form.industry}
                    onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-dark">Billing Email</span>
                  <input
                    value={form.billing_email}
                    onChange={(event) => setForm((current) => ({ ...current, billing_email: event.target.value }))}
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-dark">Website</span>
                  <input
                    value={form.website}
                    onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                    className="input"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-dark">Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    rows={4}
                    className="input"
                  />
                </label>
                <div className="md:col-span-2">
                  <button type="submit" disabled={saving} className="btn btn-primary">
                    {saving ? 'Saving...' : 'Save Workspace'}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-dark">Team Access</h2>
                    <p className="mt-1 text-sm text-gray-600">Invite team members and assign them to this {label.toLowerCase()} workspace.</p>
                  </div>
                  <div className="rounded-2xl bg-primary/15 px-4 py-3 text-sm font-semibold text-dark">
                    {seatUsedLabel} / {seatLimitLabel} seats
                    <p className="mt-1 text-xs font-medium text-gray-600">{seatUsage?.plan_name || 'Free'} plan</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddMember} className="mb-5 space-y-3 rounded-2xl bg-light p-4">
                {seatsFull && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    This workspace appears to have reached its team seat limit. You can still submit an invite and BantuBuzz will re-check the latest seat availability.
                  </div>
                )}
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-dark">Email</span>
                  <input
                    value={memberForm.email}
                    onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="team@company.com"
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
                <button
                  type="submit"
                  disabled={inviteDisabled}
                  className="inline-flex items-center gap-2 rounded-full bg-dark px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                >
                  <UserPlusIcon className="h-4 w-4" />
                  {inviting ? 'Sending...' : 'Invite Member'}
                </button>
              </form>

              <div className="space-y-3">
                {members.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                    No team members assigned yet.
                  </p>
                ) : members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-dark">{member.email}</p>
                      <p className="text-xs capitalize text-gray-500">{member.role}</p>
                    </div>
                    {member.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="rounded-full p-2 text-red-600 hover:bg-red-50"
                        title="Remove member"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
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
                <ClipboardDocumentListIcon className="h-5 w-5 text-dark" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-dark">Team Audit Log</h2>
                <p className="text-sm text-gray-600">Member additions, removals, and invitation changes for this workspace.</p>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                No team access changes recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-dark">{auditLabels[log.action] || log.action}</p>
                      <p className="text-sm text-gray-600">
                        {log.target_email}
                        {log.role ? ` as ${log.role}` : ''}
                      </p>
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
};

export default WorkspaceManage;
