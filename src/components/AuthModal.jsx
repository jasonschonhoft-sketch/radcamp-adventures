import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthModal({ open, onClose }) {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // success / info (e.g. confirm email)
  const [submitting, setSubmitting] = useState(false);

  // Reset transient state whenever the modal opens or the tab changes.
  useEffect(() => {
    if (open) { setError(''); setMessage(''); }
  }, [open, tab]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function switchTab(next) {
    if (next === tab) return;
    setTab(next);
    setError('');
    setMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (tab === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (tab === 'signin') {
        const { error } = await signIn(email, password);
        if (error) { setError(error.message); return; }
        onClose(); // signed in → back to the map
      } else {
        const { data, error } = await signUp(email, password);
        if (error) { setError(error.message); return; }
        // When email confirmation is on, there's no active session yet.
        if (data?.session) {
          onClose();
        } else {
          setMessage('Check your email to confirm your account, then sign in.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="auth-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>

        <div className="auth-header">
          <img src="/logo.svg" alt="RadCamp" className="auth-logo" />
          <h2 className="auth-title">{tab === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            className={`auth-tab${tab === 'signin' ? ' active' : ''}`}
            role="tab" aria-selected={tab === 'signin'}
            onClick={() => switchTab('signin')}
          >Sign In</button>
          <button
            className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
            role="tab" aria-selected={tab === 'signup'}
            onClick={() => switchTab('signup')}
          >Sign Up</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              className="auth-input"
              type="password"
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-switch">
          {tab === 'signin' ? (
            <>New here? <button className="auth-switch-link" onClick={() => switchTab('signup')}>Create an account</button></>
          ) : (
            <>Already have an account? <button className="auth-switch-link" onClick={() => switchTab('signin')}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
