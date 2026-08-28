import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { workspacesAPI } from '../services/api';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    localStorage.getItem('selected_workspace_id') || 'all'
  );
  const [isAgency, setIsAgency] = useState(false);
  const [workspaceMeta, setWorkspaceMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshWorkspaces = useCallback(async () => {
    const isManagedBrandSession = Boolean(sessionStorage.getItem('managed_access_token'));

    // A client tab is deliberately a normal brand experience. Do not load the
    // parent agency's workspace selector or let agency navigation leak in.
    if (isManagedBrandSession) {
      setWorkspaces([]);
      setIsAgency(false);
      setWorkspaceMeta(null);
      setSelectedWorkspaceId('all');
      return;
    }

    if (!isAuthenticated || user?.user_type !== 'brand') {
      setWorkspaces([]);
      setIsAgency(false);
      return;
    }

    try {
      setLoading(true);
      const response = await workspacesAPI.getWorkspaces();
      const nextWorkspaces = response.data.workspaces || [];
      setWorkspaces(nextWorkspaces);
      setIsAgency(Boolean(response.data.is_agency || nextWorkspaces.length));
      setWorkspaceMeta(response.data);

      const stored = localStorage.getItem('selected_workspace_id') || 'all';
      if (stored !== 'all' && !nextWorkspaces.some((workspace) => String(workspace.id) === String(stored))) {
        localStorage.setItem('selected_workspace_id', 'all');
        setSelectedWorkspaceId('all');
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setWorkspaces([]);
      setIsAgency(false);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const selectWorkspace = useCallback((workspaceId) => {
    if (sessionStorage.getItem('managed_access_token')) return;
    const nextValue = workspaceId ? String(workspaceId) : 'all';
    localStorage.setItem('selected_workspace_id', nextValue);
    setSelectedWorkspaceId(nextValue);
  }, []);

  const selectedWorkspace = useMemo(() => {
    if (selectedWorkspaceId === 'all') return null;
    return workspaces.find((workspace) => String(workspace.id) === String(selectedWorkspaceId)) || null;
  }, [selectedWorkspaceId, workspaces]);

  const value = useMemo(() => ({
    workspaces,
    selectedWorkspace,
    selectedWorkspaceId,
    isAgency,
    loading,
    workspaceMeta,
    selectWorkspace,
    refreshWorkspaces,
  }), [
    workspaces,
    selectedWorkspace,
    selectedWorkspaceId,
    isAgency,
    loading,
    workspaceMeta,
    selectWorkspace,
    refreshWorkspaces,
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
