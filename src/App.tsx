import React from 'react';
import { useTolkflow } from './context/TolkflowContext';
import { UserWorkspace } from './components/user/UserWorkspace';
import { OwnerControlCenter } from './components/admin/OwnerControlCenter';
import { OwnerAuthGate } from './components/admin/OwnerAuthGate';

export const App: React.FC = () => {
  const {
    workspace,
    isOwnerAuthorized,
    ownerAuthModalOpen,
  } = useTolkflow();

  // If user is accessing owner workspace without auth, show full-page security gate
  if (workspace === 'owner' && !isOwnerAuthorized) {
    return <OwnerAuthGate />;
  }

  // Project Owner Control Center (Classified & Separated)
  if (workspace === 'owner' && isOwnerAuthorized) {
    return <OwnerControlCenter />;
  }

  // Normal User Workspace (Social & Communication)
  return <UserWorkspace />;
};
