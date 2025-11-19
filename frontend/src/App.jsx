import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import Login from './components/Login';
import Register from './components/Register';
import UserDashboard from './components/UserDashboard';
import Transactions from './components/Transactions';
import AdminDashboard from './components/AdminDashboard';
import AdminUsers from './components/AdminUsers';
import AdminTransactions from './components/AdminTransactions';
import AdminActivityLog from './components/AdminActivityLog';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';
import './App.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">Nissmart Finance</Link>
        <div className="nav-links">
          {isAuthenticated ? (
            <>
              {user?.is_staff && (
                <Link to="/admin">Admin Dashboard</Link>
              )}
              <Link to="/dashboard">Dashboard</Link>
              <span className="nav-user">Welcome, {user?.first_name || user?.username}</span>
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

function AppContent() {
  const toast = useToast();

  return (
    <>
      <Navbar />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/transactions"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminTransactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/activity"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminActivityLog />
                </ProtectedRoute>
              }
            />
          </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="App">
            <AppContent />
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

