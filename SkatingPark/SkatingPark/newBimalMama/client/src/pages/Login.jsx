import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import NotificationContainer from '../components/NotificationContainer';
import Loader from '../components/Loader';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const { login, token, loading, error, clearError } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const validateInputs = () => {
    // Email Regex (simple)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>_\-+=~`\[\]\\\/]/;
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    
    if (!emailRegex.test(email)) {
      setValidationError('Invalid email address');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long');
      return false;
    }
    if (!specialCharRegex.test(password)) {
      setValidationError('Password must contain at least one special character');
      return false;
    }
    if (!uppercaseRegex.test(password)) {
      setValidationError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!lowercaseRegex.test(password)) {
      setValidationError('Password must contain at least one lowercase letter');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    clearError(); // Clear any previous errors

    if (!validateInputs()) {
      setIsLoading(false);
      return;
    }

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/');
    } else {
      // Error is already set in context and will be shown by NotificationContainer
      console.error('Login failed:', result.error);
    }
    
    setIsLoading(false);
  };

  if (loading) {
    return <Loader text="Checking authentication..." />;
  }

  return (
    <div className="container" style={{ maxWidth: '420px', marginTop: '60px', textAlign: 'center' }}>
      <NotificationContainer />
      {validationError && (
        <div className="alert alert-error" style={{ marginBottom: '12px' }}>{validationError}</div>
      )}
      
      <div className="form-container" style={{ textAlign: 'left' }}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #1f2937 0%, #0f172a 100%)',
              color: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.8rem',
              margin: '0 auto 12px auto',
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
            }}
          >
            🏒
          </div>
          <h2 style={{ marginTop: 0, marginBottom: '4px', color: '#14532d' }}>
            Skating Management System
          </h2>
  
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: 8,
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none'
                }}
              >
                {showPassword ? (
                  // Eye-slash SVG icon
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.006 10.006 0 0 1 12 20c-5.52 0-10-7-10-8s4.48-8 10-8c1.87 0 3.63.51 5.14 1.4"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M9.5 9.5A3.001 3.001 0 0 0 12 15a3 3 0 0 0 3-3c0-.69-.23-1.32-.62-1.83"/></svg>
                ) : (
                  // Eye SVG icon
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="text-center mt-3">
          <p>
            Don't have an account?{' '}
            Plz ask to Software Developer??
            {/* <Link to="/signup" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>
              Register here
            </Link> */}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;