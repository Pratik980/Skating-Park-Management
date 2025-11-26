import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { settingsAPI } from '../api/api';
import { useLanguage } from '../context/LanguageContext';

const Sidebar = ({ mobileOpen, onClose }) => {
  const { user, currentBranch } = useApp();
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);

  const fetchSettings = useCallback(async () => {
    if (!currentBranch) return;
    try {
      const response = await settingsAPI.getByBranch(currentBranch._id);
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, [currentBranch]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Listen for settings updates
  useEffect(() => {
    const handleSettingsUpdate = () => {
      fetchSettings();
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, [fetchSettings]);

  const menuItems = [
    { path: '/', key: 'dashboard', icon: '📊', roles: ['admin'] },
    { path: '/tickets', key: 'tickets', icon: '🎫', roles: ['admin', 'staff'] },
    { path: '/sales', key: 'sales', icon: '💰', roles: ['admin', 'staff'] },
    { path: '/expenses', key: 'expenses', icon: '📋', roles: ['admin', 'staff'] },
    { path: '/ticket-history', key: 'ticketHistory', icon: '📜', roles: ['staff'] },
    { path: '/summary', key: 'summary', icon: '📈', roles: ['admin'] },
    { path: '/customers', key: 'customers', icon: '👤', roles: ['admin'] },
    { path: '/users', key: 'users', icon: '👥', roles: ['admin'] },
    { path: '/branches', key: 'branches', icon: '🏢', roles: ['admin'] },
    { path: '/settings', key: 'settings', icon: '⚙️', roles: ['admin'] },
    { path: '/backup', key: 'backup', icon: '💾', roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  // Debug: Log filtered items for staff
  useEffect(() => {
    if (user?.role === 'staff') {
      console.log('Staff user menu items:', filteredMenuItems);
      console.log('User role:', user?.role);
    }
  }, [user, filteredMenuItems]);

  const displayName = settings?.companyName || 'Skating Park';
  const logoUrl = settings?.logo;

  return (
    <div className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Mobile close button - visible only on small screens */}
      {mobileOpen && (
        <div className="mobile-close-wrap">
          <button className="mobile-close" onClick={onClose} aria-label="Close navigation">✕</button>
        </div>
      )}
      <div className="sidebar-header">
        <div className="sidebar-logo-section">
          <div className="sidebar-logo-container">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                style={{ 
                  width: '100%', 
                  maxWidth: '120px', 
                  height: 'auto', 
                  maxHeight: '80px', 
                  objectFit: 'contain',
                  borderRadius: '4px',
                  marginBottom: '10px'
                }} 
              />
            ) : (
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '10px',
                textAlign: 'center'
              }}>
                🏒
              </div>
            )}
          </div>
          <h2 style={{ margin: '0', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }}>
            {displayName}
          </h2>
          <small style={{ display: 'block', textAlign: 'center', marginTop: '4px', opacity: 0.7 }}>
            Management System
          </small>
        </div>
      </div>
      <ul className="sidebar-menu">
        {filteredMenuItems.map(item => (
          <li key={item.path}>
            <NavLink 
              to={item.path} 
              className={({ isActive }) => isActive ? 'active' : ''}
              title={t(`nav.${item.key}`)}
            >
              <span className="icon">{item.icon}</span>
              <span className="label">{t(`nav.${item.key}`)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;