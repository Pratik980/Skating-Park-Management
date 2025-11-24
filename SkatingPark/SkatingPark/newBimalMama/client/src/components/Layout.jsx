import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="main-layout">
      <Sidebar mobileOpen={isMobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className={`main-content`}>
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