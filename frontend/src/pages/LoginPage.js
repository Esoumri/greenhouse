import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`particle particle-${i % 5}`} style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 8}s`
            }} />
          ))}
        </div>
      </div>

      <div className="login-container">
        <div className="login-logo">
          <div className="logo-icon">🌿</div>
          <h1>GreenWatch</h1>
          <p>IoT Greenhouse Monitoring System</p>
        </div>

        <div className="login-card">
          <div className="login-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign In</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="admin"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="admin@greenhouse.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            {mode === 'login' && (
              <p className="demo-hint">Demo: admin@greenhouse.com / admin123</p>
            )}

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? <span className="spinner" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
