import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { branchesAPI, authAPI } from '../api/api';
import NotificationContainer from '../components/NotificationContainer';
import Loader from '../components/Loader';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    branch: '',
    createNewBranch: true,
    newBranchName: '',
    newBranchLocation: '',
    newBranchContact: '',
    newBranchManager: ''
  });
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [systemSetup, setSystemSetup] = useState(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const { register, token } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate('/');
    }
    checkSystemSetup();
  }, [token, navigate]);

  const checkSystemSetup = async () => {
    try {
      const response = await authAPI.checkSetup();
      setSystemSetup(response.data.data);
      
      if (response.data.data.hasUsers) {
        fetchBranches();
      } else {
        setLoadingBranches(false);
      }
    } catch (error) {
      console.error('Error checking system setup:', error);
      setLoadingBranches(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await branchesAPI.getAll();
      setBranches(response.data.branches || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
      setFormData(prev => ({ ...prev, createNewBranch: true }));
    } finally {
      setLoadingBranches(false);
    }
  };

  const validateInputs = () => {
    // Email Regex (simple)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>_\-+=~`\[\]\\\/]/;
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    
    if (!formData.name.trim()) {
      setValidationError('Full name is required');
      return false;
    }
    if (!emailRegex.test(formData.email)) {
      setValidationError('Invalid email address');
      return false;
    }
    if (!/^\d{7,15}$/.test(formData.phone.trim())) {
      setValidationError('Phone number must be 7-15 digits');
      return false;
    }
    if (formData.password.length < 6) {
      setValidationError('Password must be at least 6 characters long');
      return false;
    }
    if (!specialCharRegex.test(formData.password)) {
      setValidationError('Password must contain at least one special character');
      return false;
    }
    if (!uppercaseRegex.test(formData.password)) {
      setValidationError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!lowercaseRegex.test(formData.password)) {
      setValidationError('Password must contain at least one lowercase letter');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match!');
      return false;
    }
    // Branch fields validation if creating new branch
    if (formData.createNewBranch) {
      if (!formData.newBranchName.trim()) {
        setValidationError('Please enter branch name');
        return false;
      }
      if (!formData.newBranchLocation.trim()) {
        setValidationError('Please enter branch location');
        return false;
      }
      if (!formData.newBranchContact.trim()) {
        setValidationError('Please enter branch contact number');
        return false;
      }
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateInputs()) {
      return;
    }
    
    setIsLoading(true);

    const userData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      role: 'admin'
    };

    if (formData.createNewBranch) {
      userData.branchData = {
        branchName: formData.newBranchName,
        location: formData.newBranchLocation,
        contactNumber: formData.newBranchContact,
        manager: formData.newBranchManager || formData.name,
        openingTime: '09:00',
        closingTime: '20:00'
      };
    } else if (formData.branch) {
      // Use existing branch
      userData.branch = formData.branch;
    }

    try {
      const result = await register(userData);
      
      if (result.success) {
        if (systemSetup && !systemSetup.hasUsers) {
          alert('🎉 First admin account created successfully! You can now login.');
        } else {
          alert('Admin account created successfully! Please login.');
        }
        navigate('/login');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Show different UI based on whether this is the first user
  const isFirstUser = systemSetup && !systemSetup.hasUsers;

  return (
    <div className="container" style={{ maxWidth: '600px', marginTop: '30px' }}>
      <NotificationContainer />
      {(error || validationError) && (
        <div className="alert alert-error">
          {error || validationError}
        </div>
      )}
      
      <div className="form-container">
        <div className="text-center mb-4">
          <p className="text-muted">
            {isFirstUser ? 'Initial Admin Registration' : 'Admin Registration'}
          </p>
          {isFirstUser && (
            <div className="alert alert-info">
              <strong>Welcome!</strong> You're setting up the system for the first time. Create your first branch below.
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">👤 Personal Information</h5>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
          </div>

          {/* Branch Information */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">🏢 Branch Information</h5>
            </div>
            <div className="card-body">
              {!isFirstUser && (
                <>
                  <div className="form-group">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        name="createNewBranch"
                        className="form-check-input"
                        checked={formData.createNewBranch}
                        onChange={handleChange}
                        id="createNewBranch"
                      />
                      <label className="form-check-label" htmlFor="createNewBranch">
                        Create New Branch (instead of selecting existing)
                      </label>
                    </div>
                  </div>

                  {!formData.createNewBranch ? (
                    <div className="form-group">
                      <label className="form-label">Select Existing Branch *</label>
                      {loadingBranches ? (
                        <div className="form-control">
                          <small>Loading branches...</small>
                        </div>
                      ) : (
                        <select
                          name="branch"
                          className="form-control"
                          value={formData.branch}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select a Branch</option>
                          {branches.map(branch => (
                            <option key={branch._id} value={branch._id}>
                              {branch.branchName} - {branch.location}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div className="alert alert-warning">
                      <small>You are creating a new branch for this admin.</small>
                    </div>
                  )}
                </>
              )}

              {/* New Branch Form - Show for first user or when creating new branch */}
              {(isFirstUser || formData.createNewBranch) && (
                <div className="new-branch-form">
                  <h6 className="mb-3">
                    {isFirstUser ? 'Create Your First Branch' : 'New Branch Details'}
                  </h6>
                  
                  <div className="form-group">
                    <label className="form-label">Branch Name *</label>
                    <input
                      type="text"
                      name="newBranchName"
                      className="form-control"
                      value={formData.newBranchName}
                      onChange={handleChange}
                      required
                      placeholder="Enter branch name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Branch Location *</label>
                    <input
                      type="text"
                      name="newBranchLocation"
                      className="form-control"
                      value={formData.newBranchLocation}
                      onChange={handleChange}
                      required
                      placeholder="Enter branch location"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Number *</label>
                    <input
                      type="tel"
                      name="newBranchContact"
                      className="form-control"
                      value={formData.newBranchContact}
                      onChange={handleChange}
                      required
                      placeholder="Enter branch contact number"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Manager Name</label>
                    <input
                      type="text"
                      name="newBranchManager"
                      className="form-control"
                      value={formData.newBranchManager}
                      onChange={handleChange}
                      placeholder="Enter manager name (defaults to your name)"
                    />
                    <small className="text-muted">If left blank, your name will be used as manager</small>
                  </div>
                </div>
              )}

              {!isFirstUser && !loadingBranches && branches.length === 0 && !formData.createNewBranch && (
                <div className="alert alert-warning">
                  <strong>No branches found.</strong> Please create a new branch.
                </div>
              )}
            </div>
          </div>

          {/* Account Security */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">🔒 Account Security</h5>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="form-control"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength="6"
                    placeholder="Enter password (min 6 characters)"
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
                      // Eye-slash SVG
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.006 10.006 0 0 1 12 20c-5.52 0-10-7-10-8s4.48-8 10-8c1.87 0 3.63.51 5.14 1.4"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M9.5 9.5A3.001 3.001 0 0 0 12 15a3 3 0 0 0 3-3c0-.69-.23-1.32-.62-1.83"/></svg>
                    ) : (
                      // Eye SVG
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    className="form-control"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength="6"
                    placeholder="Confirm your password"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirmPassword((p) => !p)}
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
                    {showConfirmPassword ? (
                      // Eye-slash SVG
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.006 10.006 0 0 1 12 20c-5.52 0-10-7-10-8s4.48-8 10-8c1.87 0 3.63.51 5.14 1.4"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M9.5 9.5A3.001 3.001 0 0 0 12 15a3 3 0 0 0 3-3c0-.69-.23-1.32-.62-1.83"/></svg>
                    ) : (
                      // Eye SVG
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={isLoading || (!isFirstUser && !formData.createNewBranch && (branches.length === 0))}
          >
            {isLoading ? 'Creating Account...' : 
             isFirstUser ? 'Setup System & Create Admin' : 'Create Admin Account'}
          </button>
        </form>
        
        <div className="text-center mt-3">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="text-primary">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;