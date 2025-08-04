'use client';

import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex flex-row">
      {/* Sidebar: static on desktop, overlay on mobile */}
      <div className="hidden md:block">
        <div className="fixed left-0 top-0 w-72 h-screen z-40">
          <Sidebar open={true} onClose={() => {}} />
        </div>
      </div>
      <div className="md:hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-72">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}

export { DashboardLayout };