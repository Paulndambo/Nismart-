import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAdminTransactions, getUsers } from '../services/api';
import AdminSidebar from './AdminSidebar';
import './AdminTransactions.css';

const AdminTransactions = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 769);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    user_id: '',
    page: 1,
    page_size: 50,
  });
  const [pagination, setPagination] = useState({ count: 0, page: 1, page_size: 50 });

  useEffect(() => {
    loadUsers();
    loadTransactions();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

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

  const filteredTransactions = (Array.isArray(transactions) ? transactions : []).filter(
    (txn) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        txn &&
        (txn.transaction_type?.toLowerCase().includes(searchLower) ||
          txn.id?.toLowerCase().includes(searchLower) ||
          (txn.source_account_email &&
            txn.source_account_email.toLowerCase().includes(searchLower)) ||
          (txn.destination_account_email &&
            txn.destination_account_email.toLowerCase().includes(searchLower)))
      );
    }
  );

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
          <h1>Transactions Management</h1>
        </div>

        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search transactions by type, ID, or email..."
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

            <div className="filter-group">
              <label>User</label>
              <select
                value={filters.user_id}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
              >
                <option value="">All Users</option>
                {(Array.isArray(users) ? users : []).map((u) => (
                  u && (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </option>
                  )
                ))}
              </select>
            </div>
          </div>

          {(filters.type || filters.status || filters.user_id || searchTerm) && (
            <div className="filter-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setFilters({ type: '', status: '', user_id: '', page: 1, page_size: 50 });
                  setSearchTerm('');
                }}
              >
                Clear All Filters
              </button>
              <span className="filter-count">
                Showing {filteredTransactions.length} of {pagination.count} transactions
              </span>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="transactions-section">
          {loading ? (
            <div className="loading">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <p>
                {transactions.length === 0
                  ? 'No transactions found.'
                  : 'No transactions match your filters.'}
              </p>
            </div>
          ) : (
            <>
              <div className="transactions-table-container">
                <table className="transactions-table">
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
                    {filteredTransactions.map((transaction) => (
                      transaction && (
                      <tr key={transaction.id}>
                        <td className="transaction-id">
                          {transaction.id.substring(0, 8)}...
                        </td>
                        <td>
                          {new Date(transaction.created_at).toLocaleString()}
                        </td>
                        <td>
                          <span className="transaction-type">
                            {transaction.transaction_type}
                          </span>
                        </td>
                        <td className="transaction-amount">
                          NGN{' '}
                          {parseFloat(transaction.amount || 0).toLocaleString('en-NG', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td>{transaction.source_account_email || '-'}</td>
                        <td>{transaction.destination_account_email || '-'}</td>
                        <td>
                          <span
                            className={`status-badge status-${transaction.status?.toLowerCase()}`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <button
                  className="btn btn-primary"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of{' '}
                  {Math.ceil(pagination.count / pagination.page_size) || 1}
                </span>
                <button
                  className="btn btn-primary"
                  disabled={
                    pagination.page >=
                    Math.ceil(pagination.count / pagination.page_size)
                  }
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTransactions;

