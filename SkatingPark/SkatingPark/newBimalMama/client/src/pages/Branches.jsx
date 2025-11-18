import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { branchesAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';

const Branches = () => {
  const { user } = useApp();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    branchName: '',
    location: '',
    contactNumber: '',
    email: '',
    manager: '',
    openingTime: '09:00',
    closingTime: '20:00'
  });

  const userBranchId = user?.branch?._id || user?.branch || null;
  const isAdmin = user?.role === 'admin';
  const isGlobalAdmin = isAdmin && !userBranchId;
  const canManageBranch = (branchId) => {
    if (!isAdmin) return false;
    if (isGlobalAdmin) return true;
    return branchId === userBranchId;
  };
  const showActionsColumn = isAdmin && branches.some(branch => canManageBranch(branch._id));

  useEffect(() => {
    if (user) {
      fetchBranches();
    }
  }, [user]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await branchesAPI.getAll();
      const fetchedBranches = Array.isArray(response.data.branches) ? response.data.branches : [];

      if (isGlobalAdmin) {
        setBranches(fetchedBranches);
      } else if (isAdmin && userBranchId) {
        setBranches(
          fetchedBranches.filter(branch => branch._id === userBranchId)
        );
      } else if (!isAdmin && userBranchId) {
        setBranches(
          fetchedBranches.filter(branch => branch._id === userBranchId)
        );
      } else {
        setBranches(fetchedBranches);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (editingBranch) {
        // Update existing branch
        const response = await branchesAPI.update(editingBranch._id, formData);
        setBranches(branches.map(b => 
          b._id === editingBranch._id ? response.data.branch : b
        ));
        alert('Branch updated successfully!');
      } else {
        // Create new branch
        const response = await branchesAPI.create(formData);
        setBranches([response.data.branch, ...branches]);
        alert('Branch created successfully!');
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving branch:', error);
      alert('Error saving branch');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (branch) => {
    if (!canManageBranch(branch._id)) {
      alert("You don't have permission to edit this branch.");
      return;
    }

    setEditingBranch(branch);
    setFormData({
      branchName: branch.branchName,
      location: branch.location,
      contactNumber: branch.contactNumber,
      email: branch.email || '',
      manager: branch.manager,
      openingTime: branch.openingTime,
      closingTime: branch.closingTime
    });
    setShowForm(true);
  };

  const handleDelete = async (branchId) => {
    if (!canManageBranch(branchId)) {
      alert("You don't have permission to delete this branch.");
      return;
    }

    if (!window.confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      return;
    }

    try {
      await branchesAPI.delete(branchId);
      setBranches(branches.filter(b => b._id !== branchId));
      alert('Branch deleted successfully');
    } catch (error) {
      console.error('Error deleting branch:', error);
      const message = error.response?.data?.message || 'Error deleting branch';
      alert(message);
    }
  };

  const handleStatusChange = async (branchId, isActive) => {
    if (!canManageBranch(branchId)) {
      alert("You don't have permission to change the status of this branch.");
      return;
    }

    try {
      await branchesAPI.update(branchId, { isActive });
      setBranches(branches.map(b => 
        b._id === branchId ? { ...b, isActive } : b
      ));
      alert(`Branch ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating branch status:', error);
      alert('Error updating branch status');
    }
  };

  const resetForm = () => {
    setFormData({
      branchName: '',
      location: '',
      contactNumber: '',
      email: '',
      manager: '',
      openingTime: '09:00',
      closingTime: '20:00'
    });
    setEditingBranch(null);
    setShowForm(false);
  };

  if (loading && branches.length === 0) {
    return <Loader text="Loading branches..." />;
  }

  return (
    <div>
      <NotificationContainer />
      
      <div className="d-flex justify-between align-center mb-3">
        <h1>Branch Management</h1>
        {(isGlobalAdmin) && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Add Branch
          </button>
        )}
      </div>

      {/* Branch Form Modal */}
      {showForm && user?.role === 'admin' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h3>
              <button 
                className="close-button"
                onClick={resetForm}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Branch Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.branchName}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  required
                  placeholder="Enter branch name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  placeholder="Enter branch location"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  required
                  placeholder="Enter contact number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email (Optional)</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Manager Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  required
                  placeholder="Enter manager name"
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Opening Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={formData.openingTime}
                    onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Closing Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={formData.closingTime}
                    onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingBranch ? 'Update Branch' : 'Add Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branches List */}
      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">Branches</h3>
          <div className="table-actions">
            <button 
              className="btn btn-sm btn-secondary"
              onClick={fetchBranches}
            >
              Refresh
            </button>
          </div>
        </div>

        {branches.length === 0 ? (
          <div className="empty-state">
            <p>No branches found</p>
            {isGlobalAdmin && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                Add First Branch
              </button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Manager</th>
                <th>Operating Hours</th>
                <th>Status</th>
                <th>Created By</th>
                {showActionsColumn && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {branches.map(branch => (
                <tr key={branch._id}>
                  <td>
                    <strong>{branch.branchName}</strong>
                  </td>
                  <td>{branch.location}</td>
                  <td>
                    <div>{branch.contactNumber}</div>
                    {branch.email && (
                      <small className="text-muted">{branch.email}</small>
                    )}
                  </td>
                  <td>{branch.manager}</td>
                  <td>
                    {branch.openingTime} - {branch.closingTime}
                  </td>
                  <td>
                    {branch.isActive ? (
                      <span className="text-success">Active</span>
                    ) : (
                      <span className="text-danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    {branch.createdBy?.name}
                    <br />
                    <small>
                      {new Date(branch.createdAt).toLocaleDateString()}
                    </small>
                  </td>
                  {showActionsColumn && (
                    <td>
                      {canManageBranch(branch._id) ? (
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleEdit(branch)}
                            title="Edit Branch"
                          >
                            ✏️
                          </button>
                          
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleStatusChange(branch._id, !branch.isActive)}
                            title={branch.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {branch.isActive ? '⏸️' : '▶️'}
                          </button>
                          
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(branch._id)}
                            title="Delete Branch"
                          >
                            🗑️
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted">No actions</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Stats */}
      {branches.length > 0 && (
        <div className="card">
          <h3>Branch Summary</h3>
          <div className="grid grid-3">
            <div className="text-center">
              <div className="stat-number">{branches.length}</div>
              <div className="stat-label">Total Branches</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-success">
                {branches.filter(b => b.isActive).length}
              </div>
              <div className="stat-label">Active</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-warning">
                {branches.filter(b => !b.isActive).length}
              </div>
              <div className="stat-label">Inactive</div>
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

export default Branches;