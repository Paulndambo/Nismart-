import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTransactionHistory } from '../services/api';
import Sidebar from './Sidebar';
import './Transactions.css';

const Transactions = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 769);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, filters]);

  const loadTransactions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getTransactionHistory(user.id);
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const transactionsArray = Array.isArray(transactions) ? transactions : [];
    let filtered = [...transactionsArray];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (txn) =>
          txn &&
          (txn.transaction_type?.toLowerCase().includes(searchLower) ||
          txn.id?.toLowerCase().includes(searchLower) ||
          (txn.source_account_email &&
            txn.source_account_email.toLowerCase().includes(searchLower)) ||
          (txn.destination_account_email &&
            txn.destination_account_email.toLowerCase().includes(searchLower)) ||
          parseFloat(txn.amount || 0).toString().includes(searchTerm))
      );
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter((txn) => txn && txn.transaction_type === filters.type);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter((txn) => txn && txn.status === filters.status);
    }

    // Date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter((txn) => txn && txn.created_at && new Date(txn.created_at) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Include entire day
      filtered = filtered.filter((txn) => txn && txn.created_at && new Date(txn.created_at) <= toDate);
    }

    setFilteredTransactions(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const exportTransactions = () => {
    const csvContent =
      'Date,Type,Amount,From,To,Status\n' +
      filteredTransactions
        .map((txn) => {
          const date = new Date(txn.created_at).toLocaleString();
          return `${date},${txn.transaction_type},${txn.amount},${
            txn.source_account_email || '-'
          },${txn.destination_account_email || '-'},${txn.status}`;
        })
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-container">
      <Sidebar 
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
          <h1>Transactions</h1>
          <div className="header-actions">
            {filteredTransactions.length > 0 && (
              <button className="btn btn-secondary" onClick={exportTransactions}>
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search transactions by type, ID, email, or amount..."
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
              <label>From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>

          {(filters.type ||
            filters.status ||
            filters.dateFrom ||
            filters.dateTo ||
            searchTerm) && (
            <div className="filter-actions">
              <button className="btn btn-secondary" onClick={clearFilters}>
                Clear All Filters
              </button>
              <span className="filter-count">
                Showing {filteredTransactions.length} of {transactions.length}{' '}
                transactions
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
              {transactions.length > 0 && (
                <button className="btn btn-primary" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="transactions-table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Transaction ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(filteredTransactions) ? filteredTransactions : []).map((transaction) => (
                    transaction && (
                    <tr key={transaction.id}>
                      <td>
                        {new Date(transaction.created_at).toLocaleString()}
                      </td>
                      <td className="transaction-id">
                        {transaction.id.substring(0, 8)}...
                      </td>
                      <td>
                        <span className="transaction-type">
                          {transaction.transaction_type}
                        </span>
                      </td>
                      <td className="transaction-amount">
                        {parseFloat(transaction.amount).toLocaleString('en-NG', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td>{transaction.source_account_email || '-'}</td>
                      <td>{transaction.destination_account_email || '-'}</td>
                      <td>
                        <span
                          className={`status-badge status-${transaction.status.toLowerCase()}`}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;

