import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { userData, logout } = useAuth();
  const roleName = userData?.role?.toUpperCase() || '';
  const roleClass = userData?.role || '';

  return (
    <header className="app-header">
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        {userData && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                {userData.name}
              </span>
              <span className={`role-badge ${roleClass}`}>{roleName}</span>
            </div>
            <div style={{ height: '32px', width: '1px', background: 'var(--border)' }}></div>
            <button onClick={logout} className="btn btn-ghost btn-sm">
              <LogOut size={16} /> Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}