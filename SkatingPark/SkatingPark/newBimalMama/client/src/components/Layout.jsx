import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import GoogleTranslateScript from './GoogleTranslateScript';

const Layout = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="main-layout">
      <Sidebar mobileOpen={isMobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      {/* Overlay shown on mobile when sidebar is open; clicking it closes the sidebar */}
      <div
        className={`mobile-overlay ${isMobileSidebarOpen ? 'show' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
        role="button"
        aria-label="Close navigation"
      />
      <div className={`main-content`}>
        {/* Place the Google Translate widget at top right, above navbar */}
        <div style={{ position: 'fixed', top: 10, right: 30, zIndex: 10000, background: 'rgba(255,255,255,0.85)', borderRadius: 8, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div id="google_translate_element"></div>
        </div>
        <GoogleTranslateScript />
        <Navbar 
          onToggleSidebar={() => setMobileSidebarOpen(open => !open)} 
          isSidebarCollapsed={false} 
        />
        <div className="content-area">
          <div className="page-offset">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;