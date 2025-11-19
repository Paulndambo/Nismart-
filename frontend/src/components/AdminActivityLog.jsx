import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAdminTransactions } from '../services/api';
import AdminSidebar from './AdminSidebar';
import './AdminActivityLog.css';

const AdminActivityLog = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 769);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    page: 1,
    page_size: 100,
  });

  useEffect(() => {
    loadActivities();
  }, [filters]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await getAdminTransactions(filters);
      const results = data?.results || [];
      // Sort by most recent first
      const sorted = (Array.isArray(results) ? results : []).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setActivities(sorted);
    } catch (error) {
      console.error('Failed to load activity log:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return '💰';
      case 'WITHDRAWAL':
        return '💸';
      case 'TRANSFER':
        return '↔️';
      default:
        return '📝';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return '#27ae60';
      case 'WITHDRAWAL':
        return '#e74c3c';
      case 'TRANSFER':
        return '#3498db';
      default:
        return '#7f8c8d';
    }
  };

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
          <h1>Activity Log</h1>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Transaction Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="TRANSFER">Transfer</option>
                <option value="WITHDRAWAL">Withdrawal</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="PROCESSING">Processing</option>
              </select>
            </div>
          </div>

          {(filters.type || filters.status) && (
            <div className="filter-actions">
              <button
                className="btn btn-secondary"
                onClick={() =>
                  setFilters({ type: '', status: '', page: 1, page_size: 100 })
                }
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="activity-log-section">
          {loading ? (
            <div className="loading">Loading activity log...</div>
          ) : activities.length === 0 ? (
            <div className="empty-state">
              <p>No activity found.</p>
            </div>
          ) : (
            <div className="activity-timeline">
              {(Array.isArray(activities) ? activities : []).map((activity) => (
                activity && (
                <div key={activity.id} className="activity-item">
                  <div
                    className="activity-icon"
                    style={{ backgroundColor: getActivityColor(activity.transaction_type) + '20' }}
                  >
                    {getActivityIcon(activity.transaction_type)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <span className="activity-type">
                        {activity.transaction_type}
                      </span>
                      <span
                        className={`status-badge status-${activity.status?.toLowerCase()}`}
                      >
                        {activity.status}
                      </span>
                    </div>
                    <div className="activity-details">
                      <span className="activity-amount">
                        NGN{' '}
                        {parseFloat(activity.amount || 0).toLocaleString('en-NG', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      {activity.source_account_email && (
                        <span className="activity-from">
                          from {activity.source_account_email}
                        </span>
                      )}
                      {activity.destination_account_email && (
                        <span className="activity-to">
                          to {activity.destination_account_email}
                        </span>
                      )}
                    </div>
                    <div className="activity-meta">
                      <span className="activity-time">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                      <span className="activity-id">
                        ID: {activity.id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminActivityLog;

