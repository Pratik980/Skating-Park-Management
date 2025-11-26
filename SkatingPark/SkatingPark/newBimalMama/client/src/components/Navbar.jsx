import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

const Navbar = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  // Map routes to page titles
  const getPageTitle = () => {
    const path = location.pathname;
    const titleMap = {
      '/': t('nav.dashboard'),
      '/users': t('nav.users'),
      '/branches': t('nav.branches'),
      '/tickets': t('nav.tickets'),
      '/sales': t('nav.sales'),
      '/expenses': t('nav.expenses'),
      '/summary': t('nav.summary'),
      '/customers': t('nav.customers'),
      '/ticket-history': t('nav.ticketHistory'),
      '/settings': t('nav.settings'),
      '/backup': t('nav.backup')
    };
    return titleMap[path] || t('nav.tickets');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mobile-only toggle (visible via CSS on small screens) */}
          <button className="mobile-toggle" onClick={onToggleSidebar} aria-label="Open navigation">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M3 12h18M3 18h18" stroke="#14532d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span className="navbar-title" style={{ fontWeight: 900, fontSize: '1.35rem', color: '#14532d', letterSpacing: '1px' }}>{getPageTitle()}</span>
        </div>

        <div className="user-info">
          {/* Dark mode toggle removed */}
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">  
              {user?.role === 'admin' ? 'Administrator' : 'Staff'}
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-sm btn-danger">
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;