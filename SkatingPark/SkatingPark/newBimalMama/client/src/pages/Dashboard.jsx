import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { summaryAPI, settingsAPI, usersAPI, pdfAPI, downloadFile } from '../api/api';
import Loader from '../components/Loader';
import NotificationContainer from '../components/NotificationContainer';
import logo from '/valyntix-logo.png.jpg';
import ChartsDashboard from '../components/ChartsDashboard';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const { currentBranch, user, darkMode } = useApp();

  // Memoize quick actions to prevent recalculation (must be before conditional returns)
  const quickActionItems = useMemo(() => [
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
  ], []);

  const visibleQuickActions = useMemo(() => 
    quickActionItems.filter(
      (item) => !item.roles || item.roles.includes(user?.role)
    ),
    [quickActionItems, user?.role]
  );

  // Fetch all data in parallel for faster loading
  const fetchAllData = useCallback(async () => {
    if (!currentBranch) return;
    
    try {
      setLoading(true);
      // Fetch all data in parallel
      const [dashboardRes, settingsRes, usersRes] = await Promise.allSettled([
        summaryAPI.getDashboard(currentBranch._id),
        settingsAPI.getByBranch(currentBranch._id),
        usersAPI.getAll()
      ]);

      if (dashboardRes.status === 'fulfilled') {
        setStats(dashboardRes.value.data.dashboard);
      }
      if (settingsRes.status === 'fulfilled') {
        setSettings(settingsRes.value.data.settings);
      }
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data.users || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentBranch]);

  const exportDashboardToPDF = useCallback(async () => {
    try {
      if (!currentBranch?._id) {
        alert('No branch selected to export');
        return;
      }

      console.log('Starting PDF export for branch:', currentBranch._id);
      const response = await pdfAPI.getDashboard(currentBranch._id);
      
      // If we get here, the response is valid and contains a PDF blob
      const filename = `Dashboard_${(currentBranch.branchName || 'Report').replace(/\s+/g, '_')}.pdf`;
      downloadFile(response.data, filename);
      console.log('PDF download initiated successfully');
    } catch (error) {
      console.error('Error exporting dashboard PDF:', error);
      
      // The API layer already handles error parsing, so we can use the error message directly
      const errorMessage = error.message || 'Failed to export dashboard PDF. Please try again.';
      alert(errorMessage);
    }
  }, [currentBranch]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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

  // Theme colors based on dark mode
  const theme = {
    bg: darkMode ? '#0f172a' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    cardBg: darkMode ? '#1e293b' : '#ffffff',
    text: darkMode ? '#f1f5f9' : '#1e293b',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    shadow: darkMode ? '0 10px 40px rgba(0, 0, 0, 0.5)' : '0 10px 40px rgba(0, 0, 0, 0.1)',
    headerGradient: darkMode 
      ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    cardShadow: darkMode ? '0 8px 25px rgba(0, 0, 0, 0.4)' : '0 8px 25px rgba(0, 0, 0, 0.08)'
  };

  return (
    <div
      className="dashboard-page-wrapper"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: theme.bg,
        transition: 'background 0.3s ease',
        width: '100%',
        maxWidth: '100%',
        margin: 0
      }}
    >
      <style>{`
        .dashboard-page-wrapper {
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

        /* Mobile override: undo desktop offsets so content fills viewport */
        @media (max-width: 900px) {
          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
          }
          .main-content .content-area {
            max-width: 720px !important;
            width: auto !important;
            margin: 12px auto !important;
            padding: 18px !important;
            background-color: white !important;
            border-radius: 10px !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08) !important;
          }

          /* Shrink hero header on mobile */
          .dashboard-hero { padding: 16px !important; border-radius: 14px !important; }
          .dashboard-hero h1 { font-size: 1.4rem !important; margin-bottom: 6px !important; }
          .dashboard-hero p { font-size: 0.95rem !important; }
        }
      `}</style>
      <NotificationContainer />
      <div style={{ flex: 1, padding: '20px' }}>
        {/* Modern Header with Dark Mode Toggle */}
        <div className="dashboard-hero" style={{
          background: theme.headerGradient,
          borderRadius: '24px',
          padding: '35px',
          marginBottom: '30px',
          boxShadow: theme.shadow,
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="d-flex justify-between align-center flex-wrap gap-2">
              <div>
                <h1 style={{ margin: 0, fontSize: '2.8rem', fontWeight: 800, color: 'white', textShadow: '0 2px 20px rgba(0,0,0,0.3)', letterSpacing: '-0.5px' }}>
                  Dashboard
                </h1>
                <p style={{ margin: 0, fontSize: '1.15rem', opacity: 0.95, fontWeight: 400 }}>
                  Welcome back, <strong style={{ fontWeight: 600 }}>{user?.name}</strong>! 👋
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  type="button"
                  className="btn"
                  onClick={(e) => {
                    e.preventDefault();
                    exportDashboardToPDF();
                  }}
                  style={{
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '14px',
                    fontWeight: 600,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    fontSize: '0.95rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  📄 Export PDF
                </button>
              </div>
            </div>
          </div>
          {/* Animated background elements */}
          <div style={{
            position: 'absolute',
            top: '-30%',
            right: '-5%',
            width: '400px',
            height: '400px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            animation: 'float 6s ease-in-out infinite'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '-20%',
            left: '-5%',
            width: '300px',
            height: '300px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%',
            filter: 'blur(50px)',
            animation: 'float 8s ease-in-out infinite reverse'
          }}></div>
        </div>
        {/* Today's Overview - Modern Cards */}
        <div className="stats-grid dashboard-cards small-stats" style={{ marginBottom: '30px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
            borderRadius: '20px',
            padding: '30px',
            color: 'white',
            boxShadow: '0 10px 30px rgba(255, 107, 107, 0.3)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 15px 40px rgba(255, 107, 107, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 107, 107, 0.3)';
          }}
          >
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px', fontWeight: 500 }}>Today's Tickets</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 700, marginBottom: '8px', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              {stats.today.tickets}
            </div>
            <small style={{ opacity: 0.85, fontSize: '0.85rem' }}>Total tickets sold today</small>
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              right: '-20px',
              fontSize: '6rem',
              opacity: 0.1,
              fontWeight: 700
            }}>🎟️</div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
            borderRadius: '20px',
            padding: '30px',
            color: 'white',
            boxShadow: '0 10px 30px rgba(78, 205, 196, 0.3)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 15px 40px rgba(78, 205, 196, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(78, 205, 196, 0.3)';
          }}
          >
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px', fontWeight: 500 }}>Today's Sales</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 700, marginBottom: '8px', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              {stats.today.sales}
            </div>
            <small style={{ opacity: 0.85, fontSize: '0.85rem' }}>Total sales transactions today</small>
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              right: '-20px',
              fontSize: '6rem',
              opacity: 0.1,
              fontWeight: 700
            }}>💰</div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderRadius: '20px',
            padding: '30px',
            color: 'white',
            boxShadow: '0 10px 30px rgba(245, 87, 108, 0.3)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 15px 40px rgba(245, 87, 108, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(245, 87, 108, 0.3)';
          }}
          >
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px', fontWeight: 500 }}>Today's Expenses</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 700, marginBottom: '8px', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              {stats.today.expenses}
            </div>
            <small style={{ opacity: 0.85, fontSize: '0.85rem' }}>Total expenses recorded today</small>
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              right: '-20px',
              fontSize: '6rem',
              opacity: 0.1,
              fontWeight: 700
            }}>🧾</div>
          </div>
          
          <div style={{
            background: stats.totals.netProfit >= 0 
              ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
              : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
            borderRadius: '20px',
            padding: '30px',
            color: 'white',
            boxShadow: stats.totals.netProfit >= 0
              ? '0 10px 30px rgba(56, 239, 125, 0.3)'
              : '0 10px 30px rgba(235, 51, 73, 0.3)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = stats.totals.netProfit >= 0
              ? '0 15px 40px rgba(56, 239, 125, 0.4)'
              : '0 15px 40px rgba(235, 51, 73, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = stats.totals.netProfit >= 0
              ? '0 10px 30px rgba(56, 239, 125, 0.3)'
              : '0 10px 30px rgba(235, 51, 73, 0.3)';
          }}
          >
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px', fontWeight: 500 }}>Net Profit</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              रु {stats.totals.netProfit?.toLocaleString()}
            </div>
            <small style={{ opacity: 0.85, fontSize: '0.85rem' }}>Overall profit/loss</small>
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              right: '-20px',
              fontSize: '6rem',
              opacity: 0.1,
              fontWeight: 700
            }}>{stats.totals.netProfit >= 0 ? '📈' : '📉'}</div>
          </div>
        </div>

        {/* Overall Statistics - Modern Cards */}
        <div className="grid grid-2" style={{ gap: '20px', marginBottom: '30px' }}>
          <div style={{
            background: theme.cardBg,
            borderRadius: '24px',
            padding: '30px',
            boxShadow: theme.cardShadow,
            border: `1px solid ${theme.border}`,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = darkMode 
              ? '0 15px 45px rgba(0, 0, 0, 0.6)' 
              : '0 15px 40px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = theme.cardShadow;
          }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '25px', fontSize: '1.5rem', fontWeight: 700, color: theme.text }}>
              💵 Revenue Overview
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ 
                textAlign: 'center', 
                padding: '25px', 
                background: darkMode 
                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)'
                  : 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)', 
                borderRadius: '18px',
                border: `1px solid ${darkMode ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.1)'}`
              }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#667eea', marginBottom: '10px' }}>
                  रु {stats.totals.revenue?.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.9rem', color: theme.textSecondary, fontWeight: 500 }}>Total Revenue</div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: '25px', 
                background: darkMode 
                  ? 'linear-gradient(135deg, rgba(245, 87, 108, 0.2) 0%, rgba(240, 147, 251, 0.2) 100%)'
                  : 'linear-gradient(135deg, #f093fb15 0%, #f5576c15 100%)', 
                borderRadius: '18px',
                border: `1px solid ${darkMode ? 'rgba(245, 87, 108, 0.3)' : 'rgba(245, 87, 108, 0.1)'}`
              }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#f5576c', marginBottom: '10px' }}>
                  रु {stats.totals.expensesAmount?.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.9rem', color: theme.textSecondary, fontWeight: 500 }}>Total Expenses</div>
              </div>
            </div>
          </div>

          <div style={{
            background: theme.cardBg,
            borderRadius: '24px',
            padding: '30px',
            boxShadow: theme.cardShadow,
            border: `1px solid ${theme.border}`,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = darkMode 
              ? '0 15px 45px rgba(0, 0, 0, 0.6)' 
              : '0 15px 40px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = theme.cardShadow;
          }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '25px', fontSize: '1.5rem', fontWeight: 700, color: theme.text }}>
              📋 Records Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ 
                textAlign: 'center', 
                padding: '25px', 
                background: darkMode 
                  ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(238, 90, 111, 0.2) 100%)'
                  : 'linear-gradient(135deg, #ff6b6b15 0%, #ee5a6f15 100%)', 
                borderRadius: '18px',
                border: `1px solid ${darkMode ? 'rgba(255, 107, 107, 0.3)' : 'rgba(255, 107, 107, 0.1)'}`
              }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#ff6b6b', marginBottom: '10px' }}>
                  {stats.totals.tickets}
                </div>
                <div style={{ fontSize: '0.9rem', color: theme.textSecondary, fontWeight: 500 }}>Total Tickets</div>
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: '25px', 
                background: darkMode 
                  ? 'linear-gradient(135deg, rgba(78, 205, 196, 0.2) 0%, rgba(68, 160, 141, 0.2) 100%)'
                  : 'linear-gradient(135deg, #4ecdc415 0%, #44a08d15 100%)', 
                borderRadius: '18px',
                border: `1px solid ${darkMode ? 'rgba(78, 205, 196, 0.3)' : 'rgba(78, 205, 196, 0.1)'}`
              }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#4ecdc4', marginBottom: '10px' }}>
                  {stats.totals.sales}
                </div>
                <div style={{ fontSize: '0.9rem', color: theme.textSecondary, fontWeight: 500 }}>Total Sales</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Visual Dashboard Charts Section below summary cards --- */}
        <ChartsDashboard />
        {/* Quick Actions - Enhanced */}
        <div style={{
          background: theme.cardBg,
          borderRadius: '24px',
          padding: '35px',
          boxShadow: theme.cardShadow,
          border: `1px solid ${theme.border}`,
          marginBottom: '30px',
          transition: 'all 0.3s ease'
        }}>
          <div className="d-flex justify-between align-center flex-wrap gap-2" style={{ marginBottom: '30px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: theme.text, marginBottom: '8px' }}>
                ⚡ Quick Actions
              </h3>
              <small style={{ color: theme.textSecondary, fontSize: '0.95rem' }}>Jump into the most common workflows</small>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gap: '20px',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
            }}
          >
            {visibleQuickActions.map((action) => (
              <a
                key={action.key}
                href={action.href}
                style={{
                  textDecoration: 'none',
                  borderRadius: '20px',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  background: darkMode 
                    ? `linear-gradient(135deg, ${action.accent}20 0%, ${action.accent}10 100%)`
                    : `linear-gradient(135deg, ${action.accent}15 0%, ${action.accent}08 100%)`,
                  border: `2px solid ${darkMode ? `${action.accent}40` : `${action.accent}30`}`,
                  boxShadow: darkMode 
                    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
                    : '0 4px 15px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                  e.currentTarget.style.boxShadow = `0 15px 35px ${action.accent}50`;
                  e.currentTarget.style.borderColor = action.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = darkMode 
                    ? '0 4px 20px rgba(0, 0, 0, 0.3)'
                    : '0 4px 15px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = darkMode ? `${action.accent}40` : `${action.accent}30`;
                }}
              >
                <div style={{
                  width: '65px',
                  height: '65px',
                  borderRadius: '18px',
                  background: `linear-gradient(135deg, ${action.accent} 0%, ${action.accent}dd 100%)`,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  boxShadow: `0 6px 20px ${action.accent}60`,
                  transition: 'transform 0.3s ease'
                }}>
                  {action.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: theme.text, fontSize: '1.15rem', marginBottom: '6px' }}>
                    {action.label}
                  </div>
                  <small style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>{action.description}</small>
                </div>
                <span style={{
                  fontSize: '0.95rem',
                  color: action.accent,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  Get Started <span style={{ fontSize: '1.3rem', transition: 'transform 0.3s ease' }}>→</span>
                </span>
                <div style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '120px',
                  height: '120px',
                  background: `radial-gradient(circle, ${action.accent}${darkMode ? '25' : '20'} 0%, transparent 70%)`,
                  borderRadius: '50%'
                }}></div>
              </a>
            ))}
          </div>
        </div>

        {/* Branch Info - Compact Green */}
        {currentBranch && (
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 6px 18px rgba(5,150,105,0.12)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.05rem', fontWeight: 700 }}>
              🏢 Current Branch
            </h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', minWidth: '160px' }}>
                <div style={{ fontSize: '0.78rem', opacity: 0.95, marginBottom: '4px', fontWeight: 600 }}>Branch</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{currentBranch.branchName}</div>
              </div>
              <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', minWidth: '120px' }}>
                <div style={{ fontSize: '0.78rem', opacity: 0.95, marginBottom: '4px', fontWeight: 600 }}>Location</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{currentBranch.location}</div>
              </div>
              <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', minWidth: '120px' }}>
                <div style={{ fontSize: '0.78rem', opacity: 0.95, marginBottom: '4px', fontWeight: 600 }}>Contact</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{currentBranch.contactNumber}</div>
              </div>
              <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', minWidth: '150px' }}>
                <div style={{ fontSize: '0.78rem', opacity: 0.95, marginBottom: '4px', fontWeight: 600 }}>Hours</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{currentBranch.openingTime} - {currentBranch.closingTime}</div>
              </div>
            </div>
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              right: '-30px',
              width: '140px',
              height: '140px',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '50%',
              filter: 'blur(30px)'
            }}></div>
          </div>
        )}
      </div>
      <footer style={{ textAlign: 'center', margin: '32px 0 12px 0', fontSize: '12px', color: theme.textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={logo} alt="Valyntix Logo" style={{ width: 24, height: 24, verticalAlign: 'middle', borderRadius: 4, objectFit: 'contain' }} />
          &copy; Copyright 2025 Valyntix AI TECH SYSTEM. All rights reserved.
        </span>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;