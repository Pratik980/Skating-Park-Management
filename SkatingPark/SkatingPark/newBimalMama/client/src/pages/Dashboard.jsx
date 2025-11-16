import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { summaryAPI, settingsAPI, usersAPI, pdfAPI, downloadFile } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const { currentBranch, user } = useApp();

  useEffect(() => {
    fetchDashboardData();
    fetchSettings();
    fetchAllUsers();
  }, [currentBranch]);

  const fetchDashboardData = async () => {
    if (!currentBranch) return;
    
    try {
      setLoading(true);
      const response = await summaryAPI.getDashboard(currentBranch._id);
      setStats(response.data.dashboard);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    if (!currentBranch) return;
    try {
      const response = await settingsAPI.getByBranch(currentBranch._id);
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data.users || []);
    } catch (error) {
      setUsers([]);
    }
  };

  if (loading) {
    return <Loader text="Loading dashboard..." />;
  }

  if (!stats) {
    return (
      <div>
        <NotificationContainer />
        <div className="error-state">
          <h3>No data available</h3>
          <p>Please check if you have selected a branch.</p>
        </div>
      </div>
    );
  }

  const quickActionItems = [
    {
      key: 'sell',
      label: 'Sell Ticket',
      description: 'Issue walk-in tickets instantly',
      href: '/tickets',
      icon: '🎟️',
      accent: '#4c8cf5',
      roles: ['admin', 'staff']
    },
    {
      key: 'sales',
      label: 'Record Sale',
      description: 'Log shop or café sales',
      href: '/sales',
      icon: '💰',
      accent: '#2ecc71',
      roles: ['admin', 'staff']
    },
    {
      key: 'expense',
      label: 'Add Expense',
      description: 'Track branch spending',
      href: '/expenses',
      icon: '🧾',
      accent: '#f39c12',
      roles: ['admin', 'staff']
    },
    {
      key: 'reports',
      label: 'View Reports',
      description: 'Daily & range summaries',
      href: '/summary',
      icon: '📊',
      accent: '#17a2b8'
    }
  ];

  const visibleQuickActions = quickActionItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  const exportDashboardToPDF = async () => {
    try {
      if (!currentBranch?._id) {
        alert('No branch selected to export');
        return;
      }

      console.log('Starting PDF export for branch:', currentBranch._id);
      const response = await pdfAPI.getDashboard(currentBranch._id);
      
      console.log('PDF response received:', {
        status: response.status,
        contentType: response.headers['content-type'],
        dataType: typeof response.data,
        isBlob: response.data instanceof Blob
      });
      
      // Check if response status indicates an error
      if (response.status !== 200) {
        console.error('PDF generation failed with status:', response.status);
        // Try to parse error message from blob
        if (response.data instanceof Blob) {
          try {
            const text = await response.data.text();
            const json = JSON.parse(text);
            throw new Error(json.message || `Server error: ${response.status}`);
          } catch (parseError) {
            throw new Error(`Failed to generate PDF. Server returned status ${response.status}`);
          }
        } else {
          throw new Error(`Failed to generate PDF. Server returned status ${response.status}`);
        }
      }
      
      // Check if response.data is a Blob
      if (!(response.data instanceof Blob)) {
        console.error('Response is not a blob:', response.data);
        throw new Error('Invalid PDF response from server');
      }
      
      // Verify it's actually a PDF by checking the blob type or content-type header
      const contentType = response.headers['content-type'] || response.data.type || '';
      if (!contentType.includes('application/pdf') && !contentType.includes('pdf')) {
        console.error('Response is not a PDF:', contentType);
        // Try to read as text to see if it's an error message
        const text = await response.data.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || 'Server returned an error instead of PDF');
        } catch (e) {
          throw new Error('Server returned an error. Please try again.');
        }
      }
      
      // Use the downloadFile utility for better compatibility
      const filename = `Dashboard_${(currentBranch.branchName || 'Report').replace(/\s+/g, '_')}.pdf`;
      downloadFile(response.data, filename);
      console.log('PDF download initiated');
    } catch (error) {
      console.error('Error exporting dashboard PDF:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Try to extract error message
      let errorMessage = 'Failed to export dashboard PDF';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const json = JSON.parse(text);
            errorMessage = json.message || errorMessage;
          } catch (e) {
            errorMessage = 'Server error. Please check your connection and try again.';
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div>
      <NotificationContainer />
      
      <div className="d-flex justify-between align-center mb-3">
        <h1>Dashboard</h1>
        <div className="d-flex gap-2 align-center">
          <button 
            type="button"
            className="btn btn-info"
            onClick={(e) => {
              e.preventDefault();
              exportDashboardToPDF();
            }}
            style={{ cursor: 'pointer' }}
          >
            📄 Export PDF
          </button>
          <div className="text-muted">
            Welcome back, {user?.name}!
          </div>
        </div>
      </div>

      {/* Today's Overview */}
      <div className="stats-grid">
        <div className="stat-card tickets">
          <div className="stat-label">Today's Tickets</div>
          <div className="stat-number">{stats.today.tickets}</div>
          <small>Total tickets sold today</small>
        </div>
        
        <div className="stat-card sales">
          <div className="stat-label">Today's Sales</div>
          <div className="stat-number">{stats.today.sales}</div>
          <small>Total sales transactions today</small>
        </div>
        
        <div className="stat-card expenses">
          <div className="stat-label">Today's Expenses</div>
          <div className="stat-number">{stats.today.expenses}</div>
          <small>Total expenses recorded today</small>
        </div>
        
        <div className="stat-card profit">
          <div className="stat-label">Net Profit</div>
          <div className="stat-number" style={{ color: stats.totals.netProfit >= 0 ? '#27ae60' : '#e74c3c' }}>
            रु {stats.totals.netProfit?.toLocaleString()}
          </div>
          <small>Overall profit/loss</small>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-2">
        <div className="card">
          <h3>Revenue Overview</h3>
          <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="text-center">
              <div className="stat-number text-info">रु {stats.totals.revenue?.toLocaleString()}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-danger">रु {stats.totals.expensesAmount?.toLocaleString()}</div>
              <div className="stat-label">Total Expenses</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Records Summary</h3>
          <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="text-center">
              <div className="stat-number" style={{ color: '#e74c3c' }}>{stats.totals.tickets}</div>
              <div className="stat-label">Total Tickets</div>
            </div>
            <div className="text-center">
              <div className="stat-number" style={{ color: '#27ae60' }}>{stats.totals.sales}</div>
              <div className="stat-label">Total Sales</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="d-flex justify-between align-center flex-wrap gap-2">
          <div>
            <h3 className="mb-1">Quick Actions</h3>
            <small className="text-muted">Jump into the most common workflows</small>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            marginTop: '1rem'
          }}
        >
          {visibleQuickActions.map((action) => (
            <a
              key={action.key}
              href={action.href}
              style={{
                textDecoration: 'none',
                border: '1px solid #e6eaf5',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                boxShadow: '0 6px 20px rgba(17, 38, 146, 0.08)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                background: '#fff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(17,38,146,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(17, 38, 146, 0.08)';
              }}
            >
              <span
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `${action.accent}22`,
                  color: action.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem'
                }}
              >
                {action.icon}
              </span>
              <div>
                <div style={{ fontWeight: 600, color: '#233043' }}>{action.label}</div>
                <small style={{ color: '#6c7a99' }}>{action.description}</small>
              </div>
              <span style={{ fontSize: '0.85rem', color: action.accent, fontWeight: 600 }}>
                Go &rarr;
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Branch Info */}
      {currentBranch && (
        <div className="card">
          <h3>Current Branch</h3>
          <p><strong>Name:</strong> {currentBranch.branchName}</p>
          <p><strong>Location:</strong> {currentBranch.location}</p>
          <p><strong>Contact:</strong> {currentBranch.contactNumber}</p>
          <p><strong>Hours:</strong> {currentBranch.openingTime} - {currentBranch.closingTime}</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;