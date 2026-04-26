import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, LogOut } from 'lucide-react';

export default function Navbar() {
  const { userData, logout } = useAuth();
  const roleName = userData?.role?.toUpperCase() || '';

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <ShieldCheck size={22} color="#3B82F6" />
        <span className="logo-text">ResQAI</span>
      </div>
      <div className="nav-links">
        {userData && (
          <>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{userData.name}</span>
            <span className="role-badge">{roleName}</span>
            <button onClick={logout} className="btn btn-ghost btn-sm">
              <LogOut size={16} /> Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
