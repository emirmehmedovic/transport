"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-[280px] transition-all duration-300">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-4 md:p-8 w-full">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
