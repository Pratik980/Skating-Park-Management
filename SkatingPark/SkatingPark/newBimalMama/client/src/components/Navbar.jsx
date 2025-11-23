import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Navbar = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const { user, logout, darkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <button 
            type="button" 
            className="sidebar-toggle-btn" 
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
            {isSidebarCollapsed ? '☰' : '⮜'}
          </button>
        </div> 1
        
        <div className="user-info">
          {/* Dark mode toggle removed */}
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">  
              {user?.role === 'admin' ? 'Administrator' : 'Staff'}
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-sm btn-danger">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;