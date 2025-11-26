import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { backupAPI } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';
import SectionCard from '../components/SectionCard';
import ModernStat from '../components/ModernStat';
import GradientButton from '../components/GradientButton';

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
  const optionLabels = {
    all: 'All Data',
    tickets: 'Tickets',
    sales: 'Sales',
    expenses: 'Expenses'
  };
  const granularEraseOptions = [
    {
      id: 'tickets',
      label: 'Tickets',
      description: 'Delete all tickets, sessions and extra time logs for this branch.',
      icon: '🎟️'
    },
    {
      id: 'sales',
      label: 'Sales',
      description: 'Remove product records, customer purchases and stock entries.',
      icon: '🛒'
    },
    {
      id: 'expenses',
      label: 'Expenses',
      description: 'Clear every expense entry and staff reimbursement record.',
      icon: '📉'
    }
  ];

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
    if (type === 'all') {
      setEraseTypes((prev) => prev.includes('all') ? [] : ['all']);
    } else {
      setEraseTypes((prev) => {
        const newTypes = prev.includes(type)
          ? prev.filter((t) => t !== type)
          : [...prev.filter(t => t !== 'all'), type];
        return newTypes;
      });
    }
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
      // Force a reload on success
      if (res.data && res.data.success) {
        window.location.reload();
      }
    } catch (err) {
      setEraseResult({ success: false, message: err?.response?.data?.message || err.message });
    } finally {
      setDeleting(false);
    }
  };

  const selectedLabels = eraseTypes.includes('all')
    ? [optionLabels.all]
    : eraseTypes.map(type => optionLabels[type] || type);
  const pendingDeletionLabel = selectedLabels.length ? selectedLabels.join(', ') : 'Nothing selected';
  const canErase = !!currentBranch && eraseTypes.length > 0;

  if (loading && backups.length === 0) {
    return <Loader text="Loading backups..." />;
  }

  return (
    <div className="backup-restore-page-wrapper" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9f4 100%)', padding: '15px 20px', width: '100%', maxWidth: '100%', margin: 0 }}>
      <style>{`
        .backup-restore-wrapper {
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

      {/* Backup Instructions */}
      <SectionCard title="Backup Instructions" icon="📋" accentColor="#27ae60">
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
      </SectionCard>

      {/* Backups List */}
      <SectionCard 
        title="Available Backups" 
        icon="📦"
        accentColor="#27ae60"
        headerActions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <GradientButton 
              onClick={fetchBackups}
              color="#14532d"
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              🔄 Refresh
            </GradientButton>
            <GradientButton 
              onClick={createBackup}
              disabled={creatingBackup || !currentBranch}
              color="#27ae60"
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              {creatingBackup ? 'Creating...' : '💾 Create Backup'}
            </GradientButton>
          </div>
        }
      >

        {backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>No backups found</p>
            <GradientButton 
              onClick={createBackup}
              disabled={!currentBranch}
              color="#27ae60"
            >
              Create First Backup
            </GradientButton>
            {!currentBranch && (
              <p style={{ color: '#f39c12', marginTop: '12px' }}>Please select a branch first</p>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
          </div>
        )}
      </SectionCard>

      {/* Backup Stats */}
      {backups.length > 0 && (
        <SectionCard title="Backup Statistics" icon="📊" accentColor="#27ae60">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <ModernStat 
              value={backups.length} 
              label="Total Backups" 
              color="#27ae60"
              icon="💾"
            />
            <div style={{
              padding: '25px 24px 18px 24px',
              borderRadius: '17px',
              background: 'linear-gradient(98deg,#27ae6011 0%,#fff 88%)',
              boxShadow: '0 4px 22px #9b59b612',
              minWidth: 132,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: '2.22rem', fontWeight: 900, color: '#27ae60', letterSpacing: '-1px', lineHeight: 1.1 }}>
                {formatFileSize(backups.reduce((sum, backup) => sum + backup.size, 0))}
              </div>
              <div style={{ fontSize: '0.96rem', color: '#555', fontWeight: 500, opacity: 0.89, marginTop: 5 }}>Total Size</div>
            </div>
            <ModernStat 
              value={backups.reduce((sum, backup) => sum + backup.dataCount.tickets, 0)} 
              label="Total Tickets" 
              color="#27ae60"
              icon="🎟️"
            />
            <ModernStat 
              value={backups.reduce((sum, backup) => sum + backup.dataCount.sales, 0)} 
              label="Total Sales" 
              color="#27ae60"
              icon="🛒"
            />
          </div>
        </SectionCard>
      )}

      {/* MongoDB Connection Info */}
      <SectionCard title="Database Information" icon="🗄️" accentColor="#14532d">
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
      </SectionCard>

      {user?.role === 'admin' && (
        <SectionCard 
          title="Erase Branch Data" 
          icon="⚠️"
          accentColor="#dc2626"
          style={{ border: '2px solid #dc2626', background: '#fff7f7' }}
        >
          <div className="erase-warning-card">
            <div style={{ fontSize: '1.5rem' }}>🛑</div>
            <div>
              <strong>Danger Zone</strong>
              <p style={{ margin: '6px 0 0', color: '#7f1d1d' }}>
                Deleting data is permanent. Create a backup first and double-check the branch you are erasing.
              </p>
            </div>
          </div>

          <div className="erase-grid">
            <div
              className={`erase-option-card delete-all ${eraseTypes.includes('all') ? 'selected' : ''}`}
              onClick={() => handleEraseChange('all')}
            >
              <span className="erase-icon">🧨</span>
              <div className="erase-label">Delete All Data</div>
              <div className="erase-description">
                Removes tickets, sales, expenses and related stats for this branch in a single action.
              </div>
            </div>

            {granularEraseOptions.map((option) => {
              const isSelected = eraseTypes.includes(option.id);
              const disabled = eraseTypes.includes('all');
              return (
                <div
                  key={option.id}
                  className={`erase-option-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={() => !disabled && handleEraseChange(option.id)}
                >
                  <span className="erase-icon">{option.icon}</span>
                  <div className="erase-label">{option.label}</div>
                  <div className="erase-description">{option.description}</div>
                </div>
              );
            })}
          </div>

          <div className="erase-selected-chips">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((label) => (
                <span key={label} className="erase-chip">
                  {label}
                </span>
              ))
            ) : (
              <span style={{ color: '#6b7280' }}>No data type selected</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <GradientButton
              type="button"
              disabled={!canErase || deleting}
              onClick={startErase}
              color="#dc2626"
              style={{ fontWeight: 'bold', fontSize: '1.05rem', padding: '12px 32px' }}
            >
              🗑️ Delete {eraseTypes.includes('all') ? 'All Data' : 'Selected Data'}
            </GradientButton>
            <small style={{ color: '#7f1d1d' }}>
              Selected scope: <strong>{pendingDeletionLabel}</strong>
            </small>
          </div>

          {showErase && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: 440 }}>
                <h3 style={{ color: '#dc2626', marginBottom: 6 }}>Confirm Permanent Deletion</h3>
                <p style={{ color: '#4b5563', marginBottom: 16 }}>
                  You are about to delete: <strong>{pendingDeletionLabel}</strong>
                </p>
                <p style={{ color: '#374151' }}><strong>Deleted data cannot be restored.</strong></p>
                <div style={{ margin: '14px 0', color: '#111827' }}>
                  Type <b>DELETE</b> to continue:
                </div>
                <input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  type="text"
                  className="form-control"
                  placeholder="DELETE"
                />
                <div className="form-actions" style={{ marginTop: 18 }}>
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
              style={{ color: eraseResult.success ? '#15803d' : '#b91c1c', marginTop: 12, fontWeight: 'bold' }}>
              {eraseResult.message}
            </div>
          )}
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

export default BackupRestore;