"use client";

export default function DashboardLoading() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-dark-200 border-t-primary-600" />
        <p className="text-sm text-dark-500">Učitavanje dashboarda...</p>
      </div>
    </div>
  );
}
