import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { usersAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';
import SectionCard from '../components/SectionCard';
import ModernStat from '../components/ModernStat';
import GradientButton from '../components/GradientButton';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { user: currentUser, currentBranch } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'staff',
    branch: '',
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (currentBranch) {
      setFormData(prev => ({
        ...prev,
        branch: currentBranch._id || ''
      }));
    }
  }, [currentBranch]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const payload = { ...formData, branch: currentBranch?._id };
      const response = await usersAPI.create(payload);
      
      setUsers([response.data.user, ...users]);
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'staff',
        branch: '',
        isActive: true
      });
      setShowForm(false);
      alert('Staff member added successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error adding staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      try {
        await usersAPI.delete(userId);
        setUsers(users.filter(u => u._id !== userId));
        alert('Staff member deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting staff member');
      }
    }
  };

  const handleStatusChange = async (userId, isActive) => {
    try {
      await usersAPI.update(userId, { isActive });
      setUsers(users.map(u => 
        u._id === userId ? { ...u, isActive } : u
      ));
      alert(`Staff member ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating staff status');
    }
  };


  if (loading && users.length === 0) {
    return <Loader text="Loading staff..." />;
  }

  return (
    <div className="users-page-wrapper" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9f4 100%)', padding: '15px 20px', width: '100%', maxWidth: '100%', margin: 0 }}>
      <style>{`
        .users-page-wrapper {
          width: 100% !important;
          max-width: 100% !important;
        }
        .main-content {
          margin-left: 250px !important;
          width: calc(100% - 250px) !important;
        }
        .main-content .content-area {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        /* Mobile override: center content and remove desktop offsets */
        @media (max-width: 900px) {
          .main-content { margin-left: 0 !important; width: 100% !important; }
          .main-content .content-area { max-width: 720px !important; margin: 12px auto !important; padding: 18px !important; background-color: white !important; border-radius: 10px !important; box-shadow: 0 2px 10px rgba(0,0,0,0.08) !important; }
        }
      `}</style>
      <NotificationContainer />

      {/* Staff Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add New Staff Member</h3>
              <button 
                className="close-button"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter staff name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="Enter email address"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength="6"
                  placeholder="Enter password"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder="Enter phone number"
                />
              </div>


              <div className="form-group">
                <label className="form-label">Branch</label>
                <input
                  type="text"
                  className="form-control"
                  value={currentBranch?.branchName || ''}
                  disabled
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <SectionCard 
        title="Staff Members" 
        icon="📋"
        accentColor="#27ae60"
        headerActions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <GradientButton 
              onClick={fetchUsers}
              color="#95a5a6"
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              🔄 Refresh
            </GradientButton>
            <GradientButton 
              onClick={() => setShowForm(true)}
              color="#2ecc71"
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              + Add Staff
            </GradientButton>
          </div>
        }
      >

        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>No staff members found</p>
            <GradientButton 
              onClick={() => setShowForm(true)}
              color="#2ecc71"
            >
              Add First Staff Member
            </GradientButton>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>
                    <strong>{user.name}</strong>
                    {user._id === currentUser?._id && (
                      <span className="text-info"> (You)</span>
                    )}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>
                    <span className={`badge ${
                      user.role === 'admin' ? 'bg-danger' : 'bg-success'
                    }`}>
                      {user.role === 'admin' ? 'Administrator' : 'Staff'}
                    </span>
                  </td>
                  <td>{user.branch?.branchName || currentBranch?.branchName}</td>
                  <td>
                    {user.isActive ? (
                      <span className="text-success">Active</span>
                    ) : (
                      <span className="text-danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    {user.lastLogin ? 
                      new Date(user.lastLogin).toLocaleString() : 
                      'Never'
                    }
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleStatusChange(user._id, !user.isActive)}
                        disabled={user._id === currentUser?._id}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? '⏸️' : '▶️'}
                      </button>
                      
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(user._id)}
                        disabled={user._id === currentUser?._id}
                        title="Delete Staff"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </SectionCard>

      {/* Summary Stats */}
      {users.length > 0 && (
        <SectionCard title="Staff Summary" icon="📊" accentColor="#27ae60">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <ModernStat 
              value={users.length} 
              label="Total Staff" 
              color="#3498db"
              icon="👥"
            />
            <ModernStat 
              value={users.filter(u => u.isActive).length} 
              label="Active" 
              color="#2ecc71"
              icon="✅"
            />
          </div>
        </SectionCard>
      )}

      <footer style={{ textAlign: 'center', margin: '32px 0 12px 0', fontSize: '12px', color: '#708090', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Valyntix Logo" style={{ width: 24, height: 24, verticalAlign: 'middle', borderRadius: 4, objectFit: 'contain' }} />
          &copy; Copyright 2025 Valyntix AI TECH SYSTEM. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default Users;