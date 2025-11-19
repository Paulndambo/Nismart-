import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, onToggle }) => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/dashboard/transactions', label: 'Transactions', icon: '💳' },
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${!isOpen && window.innerWidth >= 769 ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h3>Nissmart Finance</h3>
          <div className="sidebar-header-actions">
            <button className="sidebar-toggle-btn" onClick={onToggle} title="Toggle Sidebar">
              {isOpen ? '◀' : '▶'}
            </button>
            <button className="sidebar-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.first_name?.[0] || user?.username?.[0] || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.first_name || user?.username}</div>
            <div className="user-email">{user?.email}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

