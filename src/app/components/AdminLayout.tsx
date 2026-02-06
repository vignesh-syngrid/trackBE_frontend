'use client';

import { useState } from 'react';
import Footer from './Footer';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Top bar */}
        <Header setSidebarOpen={setSidebarOpen} />
        {/* Main content area */}
        <main className="flex-1 p-6 bg-[#f5f6fa]">{children}</main>
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
