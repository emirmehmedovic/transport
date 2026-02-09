"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  AlertTriangle,
  ScrollText,
  Map,
  Sparkles,
  X,
  Clipboard,
  Shield,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[];
}

const navigation: { category?: string; items: NavItem[] }[] = [
  {
    category: "HOME",
    items: [
      { name: "Kontrolna tabla", href: "/", icon: LayoutDashboard },
      { name: "Live Mapa", href: "/live-map", icon: Map, roles: ["ADMIN", "DISPATCHER"] },
    ],
  },
  {
    category: "MANAGEMENT",
    items: [
      { name: "Vozači", href: "/drivers", icon: Users, roles: ["ADMIN", "DISPATCHER"] },
      { name: "Schengen 90/180", href: "/schengen", icon: Shield, roles: ["ADMIN", "DISPATCHER"] },
      { name: "Kamioni", href: "/trucks", icon: Truck, roles: ["ADMIN", "DISPATCHER"] },
      { name: "Prikolice", href: "/trailers", icon: Truck, roles: ["ADMIN", "DISPATCHER"] },
      { name: "DVIR", href: "/driver/inspections", icon: Clipboard, roles: ["DRIVER"] },
      { name: "Loadovi", href: "/loads", icon: Package },
      { name: "Dokumenti", href: "/documents", icon: FileText },
      { name: "Korisnici", href: "/users", icon: Users, roles: ["ADMIN"] },
    ],
  },
  {
    category: "FINANCE & REPORTS",
    items: [
      { name: "Plaćanja", href: "/wages", icon: DollarSign, roles: ["ADMIN"] },
      { name: "Klijenti", href: "/customers", icon: Users, roles: ["ADMIN", "DISPATCHER"] },
      { name: "Fakture", href: "/invoices", icon: FileText, roles: ["ADMIN", "DISPATCHER"] },
      { name: "Inspekcije", href: "/inspections", icon: Clipboard, roles: ["ADMIN", "DISPATCHER"] },
      { name: "Incidenti", href: "/incidents", icon: AlertTriangle, roles: ["ADMIN", "DISPATCHER"] },
      { name: "Izvještaji", href: "/reports", icon: BarChart3, roles: ["ADMIN", "DISPATCHER"] },
      { name: "Alarmi", href: "/alerts", icon: AlertTriangle, roles: ["ADMIN"] },
      { name: "Audit Logs", href: "/audit-logs", icon: ScrollText, roles: ["ADMIN"] },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-dark-900/50 z-40 transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "w-[280px] h-screen bg-white text-dark-600 fixed left-0 top-0 flex flex-col shadow-soft z-50 transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo & Header */}
        <div className="px-6 pt-8 pb-4 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-dark-400 hover:text-dark-900 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-3 group mb-6">
            <div className="h-10 w-10 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-primary group-hover:shadow-primary-lg transition-all">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-dark-900 font-bold text-xl tracking-tight">TransportApp</h1>
              <p className="text-[10px] font-semibold text-dark-400 uppercase tracking-wider">Dashboard</p>
            </div>
          </Link>

          <div className="mb-2">
            <h2 className="text-lg font-semibold text-dark-900">Hej, {user?.firstName || "Korisnik"}!</h2>
            <p className="text-xs text-dark-400 mt-1">Trebate pomoć? Javite se podršci.</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            {navigation.map((section, idx) => {
              // Filter items based on role
              const visibleItems = section.items.filter((item) => {
                if (!item.roles) return true;
                return user && item.roles.includes(user.role);
              });

              if (visibleItems.length === 0) return null;

              return (
                <div key={idx}>
                  {section.category && (
                    <p className="px-4 mb-2 text-[10px] font-bold text-dark-400 uppercase tracking-widest">
                      {section.category}
                    </p>
                  )}
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => onClose?.()}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all duration-200 group relative",
                            isActive
                              ? "bg-dark-900 text-white shadow-soft-lg"
                              : "text-dark-500 hover:bg-dark-50 hover:text-dark-900"
                          )}
                        >
                          <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-dark-400 group-hover:text-dark-900")} />
                          <span className="font-medium">{item.name}</span>
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Bottom Actions & Promo */}
        <div className="p-4 space-y-4">
          {/* Promo Card Style */}
          <div className="bg-dark-50 rounded-3xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-primary-100 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
            
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm mb-3">
                <Sparkles className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-bold text-dark-900 text-sm mb-1">Mobile App</h3>
              <p className="text-xs text-dark-500 mb-3">Uskoro dostupna za vozače</p>
              <button className="w-full py-2 bg-dark-900 text-white text-xs font-medium rounded-xl hover:bg-primary-600 transition-colors shadow-soft">
                Saznaj više
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 pt-2 border-t border-dark-100">
            <Link
              href="/settings"
              className="p-2 text-dark-400 hover:text-dark-900 hover:bg-dark-50 rounded-xl transition-all"
              title="Podešavanja"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Odjava</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
