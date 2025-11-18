import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { usersAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';

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
    <div>
      <NotificationContainer />
      
      <div className="d-flex justify-between align-center mb-3">
        <h1>Staff Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          + Add Staff
        </button>
      </div>

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
      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">Staff Members</h3>
          <div className="table-actions">
            <button 
              className="btn btn-sm btn-secondary"
              onClick={fetchUsers}
            >
              Refresh
            </button>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">
            <p>No staff members found</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              Add First Staff Member
            </button>
          </div>
        ) : (
          <table className="table">
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
        )}
      </div>

      {/* Summary Stats */}
      {users.length > 0 && (
        <div className="card">
          <h3>Staff Summary</h3>
          <div className="grid grid-2">
            <div className="text-center">
              <div className="stat-number">{users.length}</div>
              <div className="stat-label">Total Staff</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-success">
                {users.filter(u => u.isActive).length}
              </div>
              <div className="stat-label">Active</div>
            </div>
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', margin: '32px 0 12px 0', fontSize: '12px', color: '#708090', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Valyntix Logo" style={{ width: 24, height: 24, verticalAlign: 'middle', borderRadius: 4, objectFit: 'contain' }} />
          &copy; Valyntix AI TECH SYSTEM. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

export default Users;