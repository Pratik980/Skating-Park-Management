import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { branchesAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';
import SectionCard from '../components/SectionCard';
import ModernStat from '../components/ModernStat';
import GradientButton from '../components/GradientButton';

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
    <div className="branches-page-wrapper" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9f4 100%)', padding: '15px 20px', width: '100%', maxWidth: '100%', margin: 0 }}>
      <style>{`
        .branches-wrapper {
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

        /* Mobile override */
        @media (max-width: 900px) {
          .main-content { margin-left: 0 !important; width: 100% !important; }
          .main-content .content-area { max-width: 720px !important; margin: 12px auto !important; padding: 18px !important; background-color: white !important; border-radius: 10px !important; box-shadow: 0 2px 10px rgba(0,0,0,0.08) !important; }
        }
      `}</style>
      <NotificationContainer />

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
      <SectionCard 
        title="Branches" 
        icon="📋"
        accentColor="#27ae60"
        headerActions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <GradientButton 
              onClick={fetchBranches}
              color="#95a5a6"
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              🔄 Refresh
            </GradientButton>
            {(isGlobalAdmin) && (
              <GradientButton 
                onClick={() => setShowForm(true)}
                color="#2ecc71"
                style={{ fontSize: '0.9rem', padding: '8px 16px' }}
              >
                + Add Branch
              </GradientButton>
            )}
          </div>
        }
      >

        {branches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>No branches found</p>
            {isGlobalAdmin && (
              <GradientButton 
                onClick={() => setShowForm(true)}
                color="#2ecc71"
              >
                Add First Branch
              </GradientButton>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
          </div>
        )}
      </SectionCard>

      {/* Summary Stats */}
      {branches.length > 0 && (
        <SectionCard title="Branch Summary" icon="📊" accentColor="#27ae60">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <ModernStat 
              value={branches.length} 
              label="Total Branches" 
              color="#3498db"
              icon="🏢"
            />
            <ModernStat 
              value={branches.filter(b => b.isActive).length} 
              label="Active" 
              color="#2ecc71"
              icon="✅"
            />
            <ModernStat 
              value={branches.filter(b => !b.isActive).length} 
              label="Inactive" 
              color="#f39c12"
              icon="⏸️"
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

export default Branches;