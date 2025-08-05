import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../services/api';
import './LoginScreen.css';

const LoginScreen = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  const { login } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setAttemptsLeft(null);
    setIsLocked(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAttemptsLeft(null);
    setIsLocked(false);

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      if (data.success) {
        login(data.user);
      } else {
        setError(data.message || 'Login failed');
        
        // Handle account locking and attempts tracking
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        
        if (data.message && data.message.includes('locked')) {
          setIsLocked(true);
        }
      }
    } catch (err) {
      // Handle different error status codes
      if (err.status === 423) {
        // Account locked
        setIsLocked(true);
        setError(err.message || 'Account is temporarily locked');
      } else {
        setError(err.message || 'Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <img src="/logo192.png" alt="MyERP" className="login-logo" />
            <h1 className="login-title">MyERP</h1>
          </div>
          <p className="login-subtitle">Enterprise Resource Planning</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="error-message">
              {error}
              {attemptsLeft !== null && attemptsLeft > 0 && !isLocked && (
                <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'normal' }}>
                  ⚠️ {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before account lock
                </div>
              )}
              {isLocked && (
                <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'normal' }}>
                  🔒 Please wait 30 minutes before trying again
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="login-button primary"
            disabled={loading || isLocked}
          >
            {loading ? 'Signing In...' : isLocked ? 'Account Locked' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>&copy; 2025 MyERP. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
