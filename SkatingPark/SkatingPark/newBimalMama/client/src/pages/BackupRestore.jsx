import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { backupAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';

const BackupRestore = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const { user, currentBranch } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [showErase, setShowErase] = useState(false);
  const [eraseTypes, setEraseTypes] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [eraseResult, setEraseResult] = useState(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await backupAPI.getAll({ branch: currentBranch?._id });
      setBackups(response.data.backups);
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    if (!currentBranch) {
      alert('Please select a branch first');
      return;
    }

    if (window.confirm('Are you sure you want to create a backup? This will save all current data.')) {
      try {
        setCreatingBackup(true);
        const response = await backupAPI.create({ branch: currentBranch._id });
        setBackups([response.data.backup, ...backups]);
        alert('Backup created successfully!');
      } catch (error) {
        console.error('Error creating backup:', error);
        alert('Error creating backup');
      } finally {
        setCreatingBackup(false);
      }
    }
  };

  const restoreBackup = async (backupId) => {
    if (window.confirm('WARNING: This will overwrite all current data with the backup data. This action cannot be undone. Are you sure?')) {
      try {
        setLoading(true);
        await backupAPI.restore(backupId);
        alert('Backup restored successfully! The page will now reload.');
        window.location.reload();
      } catch (error) {
        console.error('Error restoring backup:', error);
        alert('Error restoring backup');
        setLoading(false);
      }
    }
  };

  const deleteBackup = async (backupId) => {
    if (window.confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      try {
        await backupAPI.delete(backupId);
        setBackups(backups.filter(b => b._id !== backupId));
        alert('Backup deleted successfully');
      } catch (error) {
        console.error('Error deleting backup:', error);
        alert('Error deleting backup');
      }
    }
  };

  const downloadBackup = async (backupId, filename) => {
    try {
      const response = await backupAPI.download(backupId);
      

      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('Backup downloaded successfully!');
    } catch (error) {
      console.error('Error downloading backup:', error);
      alert('Error downloading backup');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleEraseChange = (type) => {
    setEraseTypes((prev) => prev.includes(type)
      ? prev.filter((t) => t !== type)
      : [...prev, type]
    );
  };
  const startErase = () => setShowErase(true);
  const cancelErase = () => {
    setShowErase(false);
    setDeleteConfirm('');
  };
  const submitErase = async () => {
    if (!currentBranch || eraseTypes.length === 0) return;
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      // Use centralized API helper so base URL & params are correct in production
      const res = await backupAPI.eraseData(currentBranch._id, eraseTypes);
      setEraseResult(res.data);
      setEraseTypes([]);
      setShowErase(false);
      setDeleteConfirm('');
    } catch (err) {
      setEraseResult({ success: false, message: err?.response?.data?.message || err.message });
    } finally {
      setDeleting(false);
    }
  };

  if (loading && backups.length === 0) {
    return <Loader text="Loading backups..." />;
  }

  return (
    <div>
      <NotificationContainer />
      
      <div className="d-flex justify-between align-center mb-3">
        <h1>Backup & Restore</h1>
        <button 
          className="btn btn-primary"
          onClick={createBackup}
          disabled={creatingBackup || !currentBranch}
        >
          {creatingBackup ? 'Creating Backup...' : 'Create Backup'}
        </button>
      </div>

      {/* Backup Instructions */}
      <div className="card mb-3">
        <h3>📋 Backup Instructions</h3>
        <div className="grid grid-2">
          <div>
            <h4>Create Backup</h4>
            <ul>
              <li>Click "Create Backup" to save current data</li>
              <li>Backups include tickets, sales, expenses, and staff data</li>
              <li>Backups are stored on the server and can be downloaded</li>
            </ul>
          </div>
          <div>
            <h4>Restore Backup</h4>
            <ul>
              <li>Restoring will overwrite all current data</li>
              <li>This action cannot be undone</li>
              <li>Always create a backup before restoring</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div className="table-container">
        <div className="table-header">
          <h3 className="table-title">Available Backups</h3>
          <div className="table-actions">
            <button 
              className="btn btn-sm btn-secondary"
              onClick={fetchBackups}
            >
              Refresh
            </button>
          </div>
        </div>

        {backups.length === 0 ? (
          <div className="empty-state">
            <p>No backups found</p>
            <button 
              className="btn btn-primary"
              onClick={createBackup}
              disabled={!currentBranch}
            >
              Create First Backup
            </button>
            {!currentBranch && (
              <p className="text-warning mt-2">Please select a branch first</p>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Backup Name</th>
                <th>Branch</th>
                <th>Data Count</th>
                <th>Size</th>
                <th>Created</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(backup => (
                <tr key={backup._id}>
                  <td>
                    <strong>{backup.filename}</strong>
                  </td>
                  <td>{backup.branch?.branchName}</td>
                  <td>
                    <small>
                      T: {backup.dataCount.tickets} | 
                      S: {backup.dataCount.sales} | 
                      E: {backup.dataCount.expenses} |
                      U: {backup.dataCount.users}
                    </small>
                  </td>
                  <td>{formatFileSize(backup.size)}</td>
                  <td>
                    {new Date(backup.createdAt).toLocaleString()}
                  </td>
                  <td>{backup.createdBy?.name}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => downloadBackup(backup._id, backup.filename)}
                        title="Download Backup"
                      >
                        ⬇️
                      </button>
                      
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => restoreBackup(backup._id)}
                        title="Restore Backup"
                      >
                        🔄
                      </button>
                      
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteBackup(backup._id)}
                        title="Delete Backup"
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

      {/* Backup Stats */}
      {backups.length > 0 && (
        <div className="card">
          <h3>Backup Statistics</h3>
          <div className="grid grid-4">
            <div className="text-center">
              <div className="stat-number">{backups.length}</div>
              <div className="stat-label">Total Backups</div>
            </div>
            <div className="text-center">
              <div className="stat-number">
                {formatFileSize(backups.reduce((sum, backup) => sum + backup.size, 0))}
              </div>
              <div className="stat-label">Total Size</div>
            </div>
            <div className="text-center">
              <div className="stat-number">
                {backups.reduce((sum, backup) => sum + backup.dataCount.tickets, 0)}
              </div>
              <div className="stat-label">Total Tickets</div>
            </div>
            <div className="text-center">
              <div className="stat-number">
                {backups.reduce((sum, backup) => sum + backup.dataCount.sales, 0)}
              </div>
              <div className="stat-label">Total Sales</div>
            </div>
          </div>
        </div>
      )}

      {/* MongoDB Connection Info */}
      <div className="card">
        <h3>Database Information</h3>
        <div className="grid grid-2">
          <div>
            <h4>MongoDB Connection</h4>
            <p><strong>Status:</strong> <span className="text-success">Connected</span></p>
            <p><strong>Database:</strong> skatingPark</p>
            <p><strong>Collections:</strong> users, branches, tickets, sales, expenses, settings</p>
          </div>
          <div>
            <h4>Backup Location</h4>
            <p><strong>Path:</strong> ./backups/</p>
            <p><strong>Format:</strong> JSON files</p>
            <p><strong>Auto Backup:</strong> Manual only</p>
          </div>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div style={{ border: '2px solid #e74c3c', borderRadius: 10, padding: 24, marginTop: 36, background: '#fff5f5' }}>
          <h2 style={{ color: '#e74c3c', marginBottom: 6 }}>Erase Branch Data</h2>
          <div style={{ marginBottom: 12 }}>
            <label>
              <input type="checkbox" checked={eraseTypes.includes('tickets')} onChange={() => handleEraseChange('tickets')} /> Tickets
            </label>
            <label style={{ marginLeft: 14 }}>
              <input type="checkbox" checked={eraseTypes.includes('sales')} onChange={() => handleEraseChange('sales')} /> Sales
            </label>
            <label style={{ marginLeft: 14 }}>
              <input type="checkbox" checked={eraseTypes.includes('expenses')} onChange={() => handleEraseChange('expenses')} /> Expenses
            </label>
          </div>
          <button
            className="btn btn-danger"
            style={{ fontWeight: 'bold', fontSize: '1.2em', padding: '10px 32px' }}
            disabled={deleting || eraseTypes.length === 0}
            onClick={startErase}
          >
            Delete Selected Data
          </button>
          {/* Confirm Modal Inline */}
          {showErase && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: 410 }}>
                <h3 style={{ color: '#e74c3c' }}>Are you absolutely sure?</h3>
                <div style={{ margin: '18px 0' }}>
                  <b>Deleted data cannot be restored.</b>
                  <div style={{ margin: '14px 0', color: '#c0392b' }}>
                    To confirm, type <b>DELETE</b> below:
                  </div>
                  <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} type="text" className="form-control" />
                </div>
                <div className="form-actions">
                  <button onClick={cancelErase} className="btn btn-secondary">Cancel</button>
                  <button
                    onClick={submitErase}
                    className="btn btn-danger"
                    disabled={deleting || deleteConfirm !== 'DELETE'}
                  >
                    {deleting ? 'Erasing...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {eraseResult && eraseResult.message && (
            <div
              style={{ color: eraseResult.success ? 'green' : '#c0392b', marginTop: 12, fontWeight: 'bold' }}>
              {eraseResult.message}
            </div>
          )}
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

export default BackupRestore;