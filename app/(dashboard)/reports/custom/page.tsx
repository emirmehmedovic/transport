"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { FileSpreadsheet, Filter, Settings, Download } from "lucide-react";

type MetricKey =
  | "totalLoads"
  | "totalKm"
  | "totalRevenue"
  | "avgRevenuePerKm"
  | "avgKmPerLoad"
  | "deadheadKm"
  | "onTimeRate";

type GroupBy = "driver" | "truck" | "month" | "none";

const METRIC_LABELS: Record<MetricKey, string> = {
  totalLoads: "Ukupno loadova",
  totalKm: "Ukupno km",
  totalRevenue: "Ukupan prihod",
  avgRevenuePerKm: "Prosjek prihoda/km",
  avgKmPerLoad: "Prosjek km/load",
  deadheadKm: "Deadhead km",
  onTimeRate: "On-time %",
};

export default function CustomReportPage() {
  const router = useRouter();
  const [groupBy, setGroupBy] = useState<GroupBy>("driver");
  const [metrics, setMetrics] = useState<MetricKey[]>([
    "totalLoads",
    "totalKm",
    "totalRevenue",
  ]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedTrucks, setSelectedTrucks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      const [driversRes, trucksRes] = await Promise.all([
        fetch("/api/drivers"),
        fetch("/api/trucks"),
      ]);

      if (driversRes.ok) {
        const json = await driversRes.json();
        setDrivers(json.drivers || []);
      }
      if (trucksRes.ok) {
        const json = await trucksRes.json();
        setTrucks(json.trucks || []);
      }
    };

    fetchOptions();
  }, []);

  const toggleMetric = (metric: MetricKey) => {
    setMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/reports/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          groupBy,
          metrics,
          driverIds: selectedDrivers,
          truckIds: selectedTrucks,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Greška pri generisanju izvještaja");
      }

      setReportData(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri izvještaju");
    } finally {
      setLoading(false);
    }
  };

  const visibleMetrics = (metrics.length > 0 ? metrics : ["totalLoads"]) as MetricKey[];

  const exportCsv = () => {
    if (!reportData.length) return;
    const header = ["Grupa", ...visibleMetrics.map((m) => METRIC_LABELS[m])];
    const rows = reportData.map((row) => [
      row.groupLabel,
      ...visibleMetrics.map((m) => row[m]),
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell ?? "")}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "custom-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    if (!reportData.length) return;
    const header = ["Grupa", ...visibleMetrics.map((m) => METRIC_LABELS[m])];
    const rows = reportData.map((row) => [
      row.groupLabel,
      ...visibleMetrics.map((m) => row[m]),
    ]);

    const htmlTable = `
      <table>
        <thead>
          <tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;

    const blob = new Blob([htmlTable], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "custom-report.xls";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0-6">
      <PageHeader
        icon={FileSpreadsheet}
        title="Custom Report Builder"
        subtitle="Sastavi vlastiti izvještaj po vozaču, kamionu ili mjesecu."
        actions={
          <Button
            onClick={() => router.push("/reports")}
            variant="outline"
            className="rounded-full"
          >
            Nazad
          </Button>
        }
      />

      <Card className="border border-dark-100 shadow-soft">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Parametri izvještaja</CardTitle>
            <p className="text-sm text-dark-500">
              Odaberi grupisanje, period i metrike.
            </p>
          </div>
          <Button
            onClick={fetchReport}
            className="rounded-full"
            disabled={loading}
          >
            {loading ? "Generišem..." : "Generiši"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-500 uppercase mb-2">
                Grupisanje
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
              >
                <option value="driver">Po vozaču</option>
                <option value="truck">Po kamionu</option>
                <option value="month">Po mjesecu</option>
                <option value="none">Bez grupisanja</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-500 uppercase mb-2">
                Period od
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-500 uppercase mb-2">
                Period do
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-dark-100 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-dark-700 mb-3">
                <Filter className="w-4 h-4 text-primary-600" />
                Vozači
              </div>
              <div className="max-h-40 overflow-auto space-y-2 text-sm">
                {drivers.map((driver) => (
                  <label key={driver.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedDrivers.includes(driver.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedDrivers((prev) =>
                          checked
                            ? [...prev, driver.id]
                            : prev.filter((id) => id !== driver.id)
                        );
                      }}
                    />
                    {driver.user.firstName} {driver.user.lastName}
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-dark-100 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-dark-700 mb-3">
                <Settings className="w-4 h-4 text-primary-600" />
                Kamioni
              </div>
              <div className="max-h-40 overflow-auto space-y-2 text-sm">
                {trucks.map((truck) => (
                  <label key={truck.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTrucks.includes(truck.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedTrucks((prev) =>
                          checked
                            ? [...prev, truck.id]
                            : prev.filter((id) => id !== truck.id)
                        );
                      }}
                    />
                    {truck.truckNumber}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dark-100 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-dark-700 mb-3">
              <Settings className="w-4 h-4 text-primary-600" />
              Metrike
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {Object.keys(METRIC_LABELS).map((metric) => (
                <label key={metric} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={metrics.includes(metric as MetricKey)}
                    onChange={() => toggleMetric(metric as MetricKey)}
                  />
                  {METRIC_LABELS[metric as MetricKey]}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-dark-100 shadow-soft">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Pregled izvještaja</CardTitle>
            <p className="text-sm text-dark-500">
              {reportData.length
                ? `Ukupno zapisa: ${reportData.length}`
                : "Nema podataka"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={exportCsv}
              variant="outline"
              className="rounded-full"
              disabled={!reportData.length}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={exportExcel}
              variant="outline"
              className="rounded-full"
              disabled={!reportData.length}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}
          {reportData.length === 0 ? (
            <div className="py-10 text-center text-sm text-dark-500">
              Generiši izvještaj da vidiš rezultate.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-dark-500 border-b border-dark-100">
                  <tr>
                    <th className="py-3 pr-4">Grupa</th>
                    {visibleMetrics.map((metric) => (
                      <th key={metric} className="py-3 pr-4">
                        {METRIC_LABELS[metric]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {reportData.map((row) => (
                    <tr key={row.groupKey} className="hover:bg-dark-50">
                      <td className="py-3 pr-4 font-medium text-dark-900">
                        {row.groupLabel}
                      </td>
                      {visibleMetrics.map((metric) => (
                        <td key={metric} className="py-3 pr-4 text-dark-600">
                          {row[metric]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
