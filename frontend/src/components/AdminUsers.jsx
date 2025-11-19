import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUsers } from '../services/api';
import AdminSidebar from './AdminSidebar';
import './AdminUsers.css';

const AdminUsers = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 769);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = (Array.isArray(users) ? users : []).filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !filterRole || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="dashboard-container">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="dashboard-main">
        <div className="dashboard-header">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1>Users Management</h1>
        </div>

        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search users by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label>Filter by Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="Customer">Customer</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          {(searchTerm || filterRole) && (
            <div className="filter-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setFilterRole('');
                }}
              >
                Clear Filters
              </button>
              <span className="filter-count">
                Showing {filteredUsers.length} of {users.length} users
              </span>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="users-section">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p className="empty-state-message">
                {users.length === 0
                  ? 'No users found'
                  : 'No users match your filters'}
              </p>
              <p className="empty-state-description">
                {users.length === 0
                  ? 'There are no users in the system yet.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    u && (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        {u.first_name} {u.last_name}
                      </td>
                      <td>{u.phone_number || '-'}</td>
                      <td>
                        <span className={`role-badge ${u.role?.toLowerCase()}`}>
                          {u.role || 'Customer'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {u.date_joined
                          ? new Date(u.date_joined).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;

