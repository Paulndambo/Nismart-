import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUsers,
  getBalance,
  deposit,
  transfer,
  withdraw,
  getTransactionHistory,
} from '../services/api';
import Sidebar from './Sidebar';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 769);
  const [users, setUsers] = useState([]);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [transferData, setTransferData] = useState({ destination_user_id: '', amount: '' });
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    if (user) {
      loadUserData();
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      const usersList = Array.isArray(data) ? data : [];
      setUsers(usersList.filter((u) => u && u.id !== user?.id));
    } catch (error) {
      console.error('Failed to load users for transfer:', error);
      setUsers([]);
    }
  };

  const loadUserData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [balanceData, transactionData] = await Promise.all([
        getBalance(user.id),
        getTransactionHistory(user.id),
      ]);
      setBalance(balanceData);
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
    } catch (error) {
      showMessage(
        error.response?.data?.error || 'Failed to load account data',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount) return;
    setLoading(true);
    try {
      const accountId = balance?.account_id;
      if (!accountId) {
        showMessage('Account not found', 'error');
        return;
      }
      await deposit(accountId, depositAmount);
      setDepositAmount('');
      setShowDepositModal(false);
      await loadUserData();
      showMessage('Deposit successful!');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Deposit failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferData.destination_user_id || !transferData.amount) return;
    setLoading(true);
    try {
      const destinationUser = users.find(
        (u) => u.id === parseInt(transferData.destination_user_id)
      );
      if (!destinationUser) {
        showMessage('Destination user not found', 'error');
        return;
      }

      const destBalance = await getBalance(destinationUser.id);
      const sourceAccountId = balance?.account_id;
      const destAccountId = destBalance?.account_id;

      if (!sourceAccountId || !destAccountId) {
        showMessage('Account not found. Please ensure both accounts exist.', 'error');
        return;
      }

      await transfer(sourceAccountId, destAccountId, transferData.amount);
      setTransferData({ destination_user_id: '', amount: '' });
      setShowTransferModal(false);
      await loadUserData();
      showMessage('Transfer successful!');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Transfer failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount) return;
    setLoading(true);
    try {
      const accountId = balance?.account_id;
      if (!accountId) {
        showMessage('Account not found', 'error');
        return;
      }
      await withdraw(accountId, withdrawAmount);
      setWithdrawAmount('');
      setShowWithdrawModal(false);
      await loadUserData();
      showMessage('Withdrawal request submitted!');
    } catch (error) {
      showMessage(error.response?.data?.error || 'Withdrawal failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const transactionTypeData = (Array.isArray(transactions) ? transactions : []).reduce((acc, txn) => {
    if (txn && txn.transaction_type) {
      acc[txn.transaction_type] = (acc[txn.transaction_type] || 0) + 1;
    }
    return acc;
  }, {});

  const pieChartData = Object.entries(transactionTypeData).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

  // Prepare line chart data (transactions over time)
  const lineChartData = (Array.isArray(transactions) ? transactions : [])
    .slice(-10)
    .reverse()
    .map((txn) => ({
      date: new Date(txn.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      amount: parseFloat(txn.amount || 0),
      type: txn.transaction_type,
    }));

  // Calculate metrics
  const transactionsArray = Array.isArray(transactions) ? transactions : [];
  const totalDeposits = transactionsArray
    .filter((t) => t && t.transaction_type === 'DEPOSIT' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const totalWithdrawals = transactionsArray
    .filter((t) => t && t.transaction_type === 'WITHDRAWAL' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const totalTransfers = transactionsArray.filter(
    (t) => t && t.transaction_type === 'TRANSFER'
  ).length;

  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading user data...</div>
      </div>
    );
  }

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
          <h1>Dashboard</h1>
          <div className="header-actions">
            <span className="welcome-text">
              Welcome back, {user.first_name || user.username}!
            </span>
          </div>
        </div>

        {message && (
          <div className={`alert alert-${messageType}`}>{message}</div>
        )}

        {/* Metrics Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <div className="metric-label">Balance</div>
              <div className="metric-value">
                {balance
                  ? `${balance.currency} ${parseFloat(balance.balance).toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : 'Loading...'}
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📈</div>
            <div className="metric-content">
              <div className="metric-label">Total Deposits</div>
              <div className="metric-value">
                {balance?.currency || 'KES'}{' '}
                {totalDeposits.toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📉</div>
            <div className="metric-content">
              <div className="metric-label">Total Withdrawals</div>
              <div className="metric-value">
                {balance?.currency || 'KES'}{' '}
                {totalWithdrawals.toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">↔️</div>
            <div className="metric-content">
              <div className="metric-label">Total Transfers</div>
              <div className="metric-value">{totalTransfers}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button
              className="action-btn action-deposit"
              onClick={() => setShowDepositModal(true)}
            >
              <span className="action-icon">💵</span>
              <span className="action-label">Deposit</span>
            </button>
            <button
              className="action-btn action-transfer"
              onClick={() => setShowTransferModal(true)}
            >
              <span className="action-icon">↔️</span>
              <span className="action-label">Transfer</span>
            </button>
            <button
              className="action-btn action-withdraw"
              onClick={() => setShowWithdrawModal(true)}
            >
              <span className="action-icon">💸</span>
              <span className="action-label">Withdraw</span>
            </button>
          </div>
        </div>

        {/* Charts */}
        {transactions.length > 0 && (
          <div className="charts-section">
            <div className="chart-card">
              <h3>Transaction Types</h3>
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No transaction data available</p>
              )}
            </div>

            {lineChartData.length > 0 && (
              <div className="chart-card">
                <h3>Recent Transactions</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#667eea"
                      strokeWidth={2}
                      name="Amount"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Transaction History */}
        <div className="transactions-section">
          <h2>Recent Transactions</h2>
          {loading ? (
            <div className="loading">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions yet.</p>
              <p>Start by making a deposit!</p>
            </div>
          ) : (
            <div className="transactions-table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(transactions) ? transactions : []).slice(0, 10).map((transaction) => (
                    transaction && (
                    <tr key={transaction.id}>
                      <td>
                        {new Date(transaction.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className="transaction-type">
                          {transaction.transaction_type}
                        </span>
                      </td>
                      <td className="transaction-amount">
                        {parseFloat(transaction.amount).toLocaleString('en-NG', {
                          minimumFractionDigits: 2,
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

      {/* Modals */}
      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Deposit Funds</h3>
              <button
                className="modal-close"
                onClick={() => setShowDepositModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleDeposit}>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDepositModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : 'Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transfer Funds</h3>
              <button
                className="modal-close"
                onClick={() => setShowTransferModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label>To User</label>
                <select
                  value={transferData.destination_user_id}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      destination_user_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select user...</option>
                  {(Array.isArray(users) ? users : []).map((user) => (
                    user && (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </option>
                    )
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferData.amount}
                  onChange={(e) =>
                    setTransferData({ ...transferData, amount: e.target.value })
                  }
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTransferModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : 'Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Withdraw Funds</h3>
              <button
                className="modal-close"
                onClick={() => setShowWithdrawModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleWithdraw}>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowWithdrawModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={loading}>
                  {loading ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
