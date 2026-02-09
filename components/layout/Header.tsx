"use client";

import { Bell, Search, Calendar, ChevronDown, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const [alertCount, setAlertCount] = useState(0);
  const today = new Date().toLocaleDateString("bs-BA", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    const fetchAlertCount = async () => {
      if (!user || (user.role !== "ADMIN" && user.role !== "DISPATCHER")) {
        setAlertCount(0);
        return;
      }
      try {
        const res = await fetch("/api/dashboard/alerts", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setAlertCount(data?.total ?? 0);
      } catch {
        // ignore
      }
    };
    fetchAlertCount();
  }, [user]);

  return (
    <header className="h-24 bg-dark-50 flex items-center px-4 md:px-8 gap-4 md:gap-8">
      <button
        onClick={onMenuClick}
        className="p-2 text-dark-600 hover:bg-white rounded-xl lg:hidden transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Title/Breadcrumb Area */}
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold text-dark-900">Dashboard</h2>
        <p className="text-sm text-dark-500 font-medium">Home &gt; Overview</p>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xl ml-auto">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-12 pr-4 py-3.5 text-sm bg-white border-none shadow-soft rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 text-dark-900 placeholder:text-dark-400 transition-all"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-soft text-sm font-medium text-dark-700">
          <span className="text-xl font-bold text-dark-900">{new Date().getDate()}</span>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-dark-400">{today.split(',')[0]}</span>
            <span>{today.split(',')[1]?.trim() || new Date().toLocaleString('default', { month: 'long' })}</span>
          </div>
          <Calendar className="w-5 h-5 text-dark-400 ml-2" />
        </div>

        {/* Notifications */}
        <button
          className="relative p-3.5 bg-white rounded-full shadow-soft hover:shadow-primary transition-all group"
          onClick={() => window.location.assign("/alerts")}
        >
          <Bell className="w-5 h-5 text-dark-600 group-hover:text-primary-600" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </button>

        {/* User Profile Dropdown Trigger */}
        <button className="flex items-center gap-3 pl-2 pr-4 py-2 bg-white rounded-full shadow-soft hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
            {user?.firstName?.[0] || "U"}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-bold text-dark-900 leading-none">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] font-medium text-dark-500 uppercase mt-1">{user?.role}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-dark-400 ml-2" />
        </button>
      </div>
    </header>
  );
}
