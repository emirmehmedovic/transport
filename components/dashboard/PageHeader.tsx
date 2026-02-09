"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, actions, children }: PageHeaderProps) {
  return (
    <div className="rounded-[2rem] bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white px-4 md:px-6 py-4 md:py-5 shadow-soft-xl space-y-4">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-3xl bg-electric-500 flex items-center justify-center shadow-primary">
              <Icon className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs md:text-sm text-dark-200 mt-1">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
