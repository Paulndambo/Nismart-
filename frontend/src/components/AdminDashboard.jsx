import React, { useState, useEffect } from 'react';
import { getAdminStats, getAdminTransactions, getUsers } from '../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AdminSidebar from './AdminSidebar';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 769);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    user_id: '',
    page: 1,
    page_size: 50,
  });
  const [pagination, setPagination] = useState({ count: 0, page: 1, page_size: 50 });

  useEffect(() => {
    loadData();
    loadUsers();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, transactionsData] = await Promise.all([
        getAdminStats(),
        getAdminTransactions(filters),
      ]);
      setStats(statsData);
      const results = transactionsData?.results || [];
      setTransactions(Array.isArray(results) ? results : []);
      setPagination({
        count: transactionsData?.count || 0,
        page: transactionsData?.page || 1,
        page_size: transactionsData?.page_size || 50,
      });
    } catch (error) {
      console.error('Failed to load admin data:', error);
      setTransactions([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getAdminTransactions(filters);
      const results = data?.results || [];
      setTransactions(Array.isArray(results) ? results : []);
      setPagination({
        count: data?.count || 0,
        page: data?.page || 1,
        page_size: data?.page_size || 50,
      });
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  // Prepare chart data
  const transactionsArray = Array.isArray(transactions) ? transactions : [];
  const transactionTypeData = transactionsArray.reduce((acc, txn) => {
    if (txn && txn.transaction_type) {
      acc[txn.transaction_type] = (acc[txn.transaction_type] || 0) + 1;
    }
    return acc;
  }, {});

  const chartData = Object.entries(transactionTypeData).map(([type, count]) => ({
    type,
    count,
  }));

  // Recent activity (last 10 transactions)
  const recentActivity = (Array.isArray(transactions) ? transactions : []).slice(0, 10);

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
          <h1>Admin Dashboard</h1>
        </div>

        {loading && !stats && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        )}

        {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-card-users">
              <div className="stat-card-header">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-label">Total Users</div>
                  <div className="stat-value">{stats.total_users}</div>
                </div>
              </div>
            </div>
            <div className="stat-card stat-card-wallet">
              <div className="stat-card-header">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <div className="stat-label">Total Wallet Value</div>
                  <div className="stat-value">
                    KES {parseFloat(stats.total_wallets_value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
            <div className="stat-card stat-card-transfers">
              <div className="stat-card-header">
                <div className="stat-icon">↔️</div>
                <div className="stat-content">
                  <div className="stat-label">Total Transfers</div>
                  <div className="stat-value">{stats.total_transfers}</div>
                </div>
              </div>
            </div>
            <div className="stat-card stat-card-withdrawals">
              <div className="stat-card-header">
                <div className="stat-icon">📤</div>
                <div className="stat-content">
                  <div className="stat-label">Total Withdrawals</div>
                  <div className="stat-value">{stats.total_withdrawals}</div>
                </div>
              </div>
            </div>
            <div className="stat-card stat-card-deposits">
              <div className="stat-card-header">
                <div className="stat-icon">📥</div>
                <div className="stat-content">
                  <div className="stat-label">Total Deposits</div>
                  <div className="stat-value">{stats.total_deposits}</div>
                </div>
              </div>
            </div>
            <div className="stat-card stat-card-transactions">
              <div className="stat-card-header">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-label">Total Transactions</div>
                  <div className="stat-value">{stats.total_transactions}</div>
                </div>
              </div>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="card">
              <h2>Transaction Types Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3498db" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card">
            <h2>Transactions</h2>
            <div className="filters">
              <div className="filter-group">
                <label>Type:</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="">All</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="WITHDRAWAL">Withdrawal</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Status:</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
              <div className="filter-group">
                <label>User:</label>
                <select
                  value={filters.user_id}
                  onChange={(e) => handleFilterChange('user_id', e.target.value)}
                >
                  <option value="">All Users</option>
                  {(Array.isArray(users) ? users : []).map(user => (
                    user && (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                    )
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setFilters({ type: '', status: '', user_id: '', page: 1, page_size: 50 })}
              >
                Clear Filters
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <p>No transactions found.</p>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(transactions) ? transactions : []).map(transaction => (
                      transaction && (
                      <tr key={transaction.id}>
                        <td className="transaction-id">{transaction.id.substring(0, 8)}...</td>
                        <td>{new Date(transaction.created_at).toLocaleString()}</td>
                        <td>{transaction.transaction_type}</td>
                        <td>KES {parseFloat(transaction.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                        <td>{transaction.source_account_email || '-'}</td>
                        <td>{transaction.destination_account_email || '-'}</td>
                        <td>
                          <span className={`status-badge status-${transaction.status.toLowerCase()}`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                      )
                    ))}
                  </tbody>
                </table>

                <div className="pagination">
                  <button
                    className="btn btn-primary"
                    disabled={pagination.page === 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {pagination.page} of {Math.ceil(pagination.count / pagination.page_size)}
                  </span>
                  <button
                    className="btn btn-primary"
                    disabled={pagination.page >= Math.ceil(pagination.count / pagination.page_size)}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h2>Recent Activity Feed</h2>
            {recentActivity.length === 0 ? (
              <p>No recent activity.</p>
            ) : (
              <div className="activity-feed">
                {(Array.isArray(recentActivity) ? recentActivity : []).map(transaction => (
                  transaction && (
                  <div key={transaction.id} className="activity-item">
                    <div className="activity-time">
                      {new Date(transaction.created_at).toLocaleString()}
                    </div>
                    <div className="activity-content">
                      <strong>{transaction.transaction_type}</strong> - 
                      KES {parseFloat(transaction.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      {transaction.source_account_email && (
                        <span> from {transaction.source_account_email}</span>
                      )}
                      {transaction.destination_account_email && (
                        <span> to {transaction.destination_account_email}</span>
                      )}
                      <span className={`status-badge status-${transaction.status.toLowerCase()}`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                  )
                ))}
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default AdminDashboard;

