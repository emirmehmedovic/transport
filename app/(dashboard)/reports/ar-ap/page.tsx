"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { FileText } from "lucide-react";

type TotalsItem = {
  status: string;
  _count: { _all: number };
  _sum: { totalAmount: number | null };
};

type OverdueItem = {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  totalAmount: number;
  customer: { name: string };
  status: string;
};

export default function ArApReportPage() {
  const [totals, setTotals] = useState<TotalsItem[]>([]);
  const [overdue, setOverdue] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await fetch("/api/reports/ar-ap");
      const data = await res.json();
      if (res.ok) {
        setTotals(data.totals || []);
        setOverdue(data.overdue || []);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0-4 md:space-y-6 lg:space-y-8 font-sans">
      <PageHeader
        icon={FileText}
        title="AR/AP izvještaj"
        subtitle="Status faktura i dospjele obaveze"
      />

      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-dark-900 mb-4">Status faktura</h3>
        {loading ? (
          <p className="text-dark-500">Učitavanje...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {totals.map((t) => (
              <div key={t.status} className="rounded-2xl border border-dark-100 p-4">
                <p className="text-xs text-dark-500">{t.status}</p>
                <p className="text-lg font-semibold text-dark-900">{t._count._all}</p>
                <p className="text-xs text-dark-500">
                  {t._sum.totalAmount?.toFixed(2) || "0.00"} EUR
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-dark-900 mb-4">Dospjele fakture</h3>
        {loading ? (
          <p className="text-dark-500">Učitavanje...</p>
        ) : overdue.length === 0 ? (
          <p className="text-dark-500">Nema dospjelih faktura.</p>
        ) : (
          <div className="space-y-4 md:space-y-6 px-4 md:px-0-2">
            {overdue.map((o) => (
              <div key={o.id} className="rounded-xl border border-dark-200 px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-dark-900">
                    {o.invoiceNumber} • {o.status}
                  </p>
                  <p className="text-xs text-dark-500">
                    {new Date(o.dueDate).toLocaleDateString("bs-BA")}
                  </p>
                </div>
                <p className="text-xs text-dark-600">
                  {o.customer?.name} • {o.totalAmount.toFixed(2)} EUR
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
