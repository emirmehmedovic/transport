"use client";

import { Bell, Search, Calendar, ChevronDown, Menu, Settings, LogOut } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/authContext";
import { formatDateDMY } from "@/lib/date";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [alertCount, setAlertCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const today = formatDateDMY(new Date());

  useEffect(() => {
    const fetchAlertCount = async () => {
      if (!user) {
        setAlertCount(0);
        return;
      }
      try {
        const endpoint =
          user.role === "CLIENT" ? "/api/client/notifications" : "/api/dashboard/alerts";
        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (user.role === "CLIENT") {
          setAlertCount(data?.unreadCount ?? 0);
        } else if (user.role === "ADMIN" || user.role === "DISPATCHER") {
          setAlertCount(data?.total ?? 0);
        } else {
          setAlertCount(0);
        }
      } catch {
        // ignore
      }
    };
    fetchAlertCount();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="h-16 md:h-24 bg-dark-50 flex items-center px-4 md:px-8 gap-3 md:gap-8">
      <button
        onClick={onMenuClick}
        className="p-2 text-dark-600 hover:bg-white rounded-xl lg:hidden transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title/Breadcrumb Area */}
      <div className="flex flex-col">
        <h2 className="text-lg md:text-2xl font-bold text-dark-900">Kontrolna tabla</h2>
        <p className="hidden sm:block text-sm text-dark-500 font-medium">Početna &gt; Pregled</p>
      </div>

      {/* Search */}
      <div className="hidden md:block flex-1 max-w-xl ml-auto">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            placeholder="Pretraži sistem..."
            className="w-full pl-12 pr-4 py-3.5 text-sm bg-white border-none shadow-soft rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 text-dark-900 placeholder:text-dark-400 transition-all"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="ml-auto md:ml-0 flex items-center gap-3 md:gap-4">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-soft text-sm font-medium text-dark-700">
          <span className="text-lg font-bold text-dark-900">{today}</span>
          <Calendar className="w-5 h-5 text-dark-400 ml-2" />
        </div>

        {/* Notifications */}
        <button
          className="relative p-2.5 md:p-3.5 bg-white rounded-full shadow-soft hover:shadow-primary transition-all group"
          onClick={() =>
            window.location.assign(user?.role === "CLIENT" ? "/client/notifications" : "/alerts")
          }
        >
          <Bell className="w-4 h-4 md:w-5 md:h-5 text-dark-600 group-hover:text-primary-600" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 md:gap-3 pl-2 pr-3 md:pr-4 py-1.5 md:py-2 bg-white rounded-full shadow-soft hover:shadow-md transition-all"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
              {user?.firstName?.[0] || "U"}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-bold text-dark-900 leading-none">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] font-medium text-dark-500 uppercase mt-1">{user?.role}</p>
            </div>
            <ChevronDown
              className={`hidden md:block w-4 h-4 text-dark-400 ml-1 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-dark-100 overflow-hidden z-50">
              <div className="p-3 border-b border-dark-100">
                <p className="text-sm font-bold text-dark-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-dark-500">{user?.email}</p>
              </div>

              <div className="py-2">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    router.push("/settings");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-dark-700 hover:bg-dark-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-dark-500" />
                  Podešavanja
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Odjavi se
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
