import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, AlertCircle, ChevronRight } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e, demoEmail = null, demoPass = null) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const loginEmail = demoEmail || email;
    const loginPass = demoPass || password;

    if (!loginEmail || !loginPass) {
      setError('Please fill in all credentials');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: loginEmail, password: loginPass })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save credentials in local storage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      onLoginSuccess(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Demo accounts displaying generic names and standard emails, mapping internally to seeded database emails
  const demoAccounts = [
    { 
      label: 'Admin', 
      displayEmail: 'admin@rathinam.in', 
      email: 'admin@rathinam.in', 
      pass: 'admin123' 
    },
    { 
      label: 'Placement Manager', 
      displayEmail: 'manager@rathinam.in', 
      email: 'manager@rathinam.in', 
      pass: 'manager123' 
    },
    { 
      label: 'Placement Member', 
      displayEmail: 'member1@rathinam.in', 
      email: 'member1@rathinam.in', 
      pass: 'member123' 
    },
    { 
      label: 'Recruiter', 
      displayEmail: 'recruiter@company.com', 
      email: 'recruiter@tcs.com', 
      pass: 'recruiter123' 
    },
    { 
      label: 'Student', 
      displayEmail: 'student@rathinam.in', 
      email: 'arun.k@rathinam.in', 
      pass: 'student123' 
    }
  ];

  // Scoped responsive style configuration
  const styleSheet = `
    @media (max-width: 900px) {
      .login-grid {
        grid-template-columns: 1fr !important;
        gap: 36px !important;
        padding: 10px !important;
      }
      .left-section {
        padding-right: 0 !important;
        text-align: center !important;
        align-items: center !important;
      }
      .branding-container {
        align-items: center !important;
      }
    }
  `;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: '#F8F5F0', // Cream Background
      fontFamily: 'var(--font-body)'
    }}>
      <style>{styleSheet}</style>
      
      <div className="login-grid" style={{
        width: '100%',
        maxWidth: '960px',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: '40px',
        alignItems: 'center'
      }}>
        
        {/* Left Section: Branding & Demo Access */}
        <div className="left-section fade-in" style={{ paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Logo & Sub-header */}
          <div className="branding-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
            <img 
              src="/assets/logo.jpg" 
              alt="Rathinam Logo" 
              style={{ 
                maxWidth: '100%', 
                height: 'auto', 
                maxHeight: '140px', 
                objectFit: 'contain' 
              }} 
            />
            <span style={{ 
              fontSize: '1.25rem', 
              color: '#6D1F3B', // Primary Burgundy
              fontWeight: '800', 
              textTransform: 'uppercase', 
              letterSpacing: '2.5px',
              fontFamily: 'var(--font-title)'
            }}>
              Placement Portal
            </span>
          </div>

          <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 10px 0' }}>
            A centralized platform to manage students, recruiters, placements, and placement analytics.
          </p>

          {/* Demo Access Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ 
              fontSize: '0.85rem', 
              color: '#6D1F3B', 
              fontWeight: '700', 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              borderBottom: '2px solid rgba(109, 31, 59, 0.1)',
              paddingBottom: '6px',
              marginBottom: '4px'
            }}>
              Demo Access
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.pass);
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#FFFFFF',
                    border: '1px solid rgba(109, 31, 59, 0.1)',
                    borderRadius: '8px',
                    color: '#252525',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(74, 20, 40, 0.02)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#C9A227'; // Gold Highlight Accent
                    e.currentTarget.style.background = '#FDFBF8';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(109, 31, 59, 0.1)';
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#6D1F3B' }}>{account.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'monospace' }}>{account.displayEmail}</span>
                    <ChevronRight size={14} color="#C9A227" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section: Welcome Back Login Card */}
        <div 
          className="fade-in" 
          style={{ 
            padding: '40px 32px', 
            background: '#FFFFFF',
            border: '1px solid rgba(109, 31, 59, 0.08)',
            borderTop: '4px solid #6D1F3B', // Premium Burgundy Top Line
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(74, 20, 40, 0.05)',
            color: '#252525'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'var(--font-title)', color: '#4A1428' }}>
              Welcome Back
            </h2>
            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: '4px' }}>
              Sign in to access the placement portal
            </p>
          </div>

          {error && (
            <div style={{
              background: '#FFF5F5',
              border: '1px solid #FED7D7',
              color: '#C53030',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#252525', fontWeight: '600' }}>Email ID / Username</label>
              <div style={{ position: 'relative', marginTop: '6px' }}>
                <Shield size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@rathinam.in" 
                  style={{ 
                    paddingLeft: '42px',
                    background: '#FFFFFF',
                    border: '1px solid rgba(109, 31, 59, 0.15)',
                    color: '#252525',
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#C9A227'; // Gold Ring Focus
                    e.target.style.boxShadow = '0 0 0 3px rgba(201, 162, 39, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(109, 31, 59, 0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0, color: '#252525', fontWeight: '600' }}>Password</label>
                <a 
                  href="#forgot" 
                  onClick={(e) => { e.preventDefault(); alert("Please contact the Admin (admin@rathinam.in) to reset your password."); }}
                  style={{ color: '#6D1F3B', fontSize: '0.8rem', fontWeight: '700', textDecoration: 'none' }}
                >
                  Forgot Password?
                </a>
              </div>
              <div style={{ position: 'relative', marginTop: '6px' }}>
                <Key size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                <input 
                  type="password" 
                  className="form-input" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  style={{ 
                    paddingLeft: '42px',
                    background: '#FFFFFF',
                    border: '1px solid rgba(109, 31, 59, 0.15)',
                    color: '#252525',
                    borderRadius: '6px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#C9A227';
                    e.target.style.boxShadow = '0 0 0 3px rgba(201, 162, 39, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(109, 31, 59, 0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn"
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '14px', 
                marginTop: '10px',
                background: '#6D1F3B', // Burgundy Primary Button
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(109, 31, 59, 0.15)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#4A1428'; // Dark Burgundy on Hover
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#6D1F3B';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
