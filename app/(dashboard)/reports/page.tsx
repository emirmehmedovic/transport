"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  FileText,
  Calendar,
  Users,
  Truck,
  PieChart,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";

type ReportType = "driver" | "truck" | "revenue" | "expense" | "ar_ap" | "custom" | null;

export default function ReportsPage() {
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);

  const reportTypes = [
    {
      id: "custom" as ReportType,
      name: "Custom Report Builder",
      description: "Sastavi vlastiti izvještaj po vozaču, kamionu ili mjesecu.",
      icon: FileText,
      color: "teal",
      available: true,
      route: "/reports/custom",
    },
    {
      id: "driver" as ReportType,
      name: "Performanse Vozača",
      description: "Pregled performansi vozača za odabrani period",
      icon: TrendingUp,
      color: "blue",
      available: true,
      route: "/drivers",
    },
    {
      id: "truck" as ReportType,
      name: "Performanse Kamiona",
      description: "Analiza performansi kamiona i troškova",
      icon: BarChart3,
      color: "purple",
      available: true,
      route: "/trucks",
    },
    {
      id: "revenue" as ReportType,
      name: "Izvještaj o Prihodima",
      description: "Detaljan izvještaj prihoda po periodu i vozačima",
      icon: DollarSign,
      color: "green",
      available: true,
      route: "/reports/revenue",
    },
    {
      id: "expense" as ReportType,
      name: "Izvještaj o Troškovima",
      description: "Analiza troškova goriva, održavanja i drugih izdataka",
      icon: FileText,
      color: "orange",
      available: true,
      route: "/reports/expenses",
    },
    {
      id: "ar_ap" as ReportType,
      name: "AR/AP izvještaj",
      description: "Pregled statusa faktura i dospjelih obaveza",
      icon: FileText,
      color: "teal",
      available: true,
      route: "/reports/ar-ap",
    },
  ];

  const handleGenerateReport = () => {
    if (!selectedReport) return;

    const report = reportTypes.find((r) => r.id === selectedReport);
    if (report?.route) {
      router.push(report.route);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <PageHeader
        icon={FileText}
        title="Izvještaji"
        subtitle="Generišite detaljne izvještaje o performansama i finansijama"
        actions={
          <Button
            variant="outline"
            className="rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 text-xs md:text-sm px-3 md:px-4"
            onClick={() => router.push("/reports/revenue")}
          >
            <PieChart className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
            Prihodi
          </Button>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {["Vozači", "Kamioni", "Prihodi", "Troškovi"].map((label) => (
            <div key={label} className="bg-dark-50 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/20 text-dark-900">
              <p className="text-[10px] md:text-xs font-semibold text-dark-500 uppercase tracking-wide">
                {label}
              </p>
              <p className="text-sm md:text-lg mt-1">Izvještaji</p>
            </div>
          ))}
        </div>
      </PageHeader>

      {/* Info Card */}
      <div className="bg-dark-50 rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden border border-dark-100">
        <div className="absolute top-0 right-0 -mt-4 -mr-2 w-24 h-24 bg-primary-100 rounded-full blur-3xl opacity-50"></div>
        <div className="relative z-10 flex flex-col gap-3 md:gap-4">
          <div className="flex items-start gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-dark-900 text-sm md:text-base">Izvještaji su spremni</p>
              <p className="text-xs md:text-sm text-dark-600">
                Pristupite metrikama za vozače i kamione ili otvorite detaljne finansijske
                izvještaje za period koji vam treba.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => router.push("/drivers/compare")} className="text-xs md:text-sm">
              Uporedi vozače
            </Button>
            <Button
              onClick={() => router.push("/reports/expenses")}
              className="flex items-center justify-center gap-2 bg-dark-900 text-white hover:bg-primary-600 text-xs md:text-sm"
            >
              <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Troškovi
            </Button>
          </div>
        </div>
      </div>

      {/* Report Type Selection */}
      <div>
        <h2 className="text-xl font-semibold text-dark-900 mb-4">
          Tip izvještaja
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const active = selectedReport === report.id;
            return (
              <button
                key={report.id}
                onClick={() => report.available && setSelectedReport(report.id)}
                disabled={!report.available}
                className={`relative rounded-3xl border px-6 py-5 text-left transition-all ${
                  active
                    ? "border-primary-500 bg-primary-50 shadow-lg"
                    : report.available
                    ? "border-dark-100 bg-dark-50 hover:border-primary-200"
                    : "border-dark-100 bg-dark-50 cursor-not-allowed opacity-70"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-2xl ${
                      active ? "bg-primary-600 text-white" : "bg-dark-50 text-dark-800"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-dark-900 mb-1">{report.name}</h3>
                    <p className="text-sm text-dark-600">{report.description}</p>
                    {!report.available && (
                      <span className="inline-block mt-2 text-xs px-2 py-1 bg-dark-100 text-dark-500 rounded-full">
                        Uskoro dostupno
                      </span>
                    )}
                  </div>
                </div>
                {active && (
                  <div className="absolute top-5 right-6 text-xs font-semibold text-primary-600">
                    Aktivan
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate Button */}
      {selectedReport && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setSelectedReport(null)}
          >
            Poništi
          </Button>
          <Button
            onClick={handleGenerateReport}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Otvori izvještaj
          </Button>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-dark-100 shadow-soft-xl bg-dark-50">
          <CardHeader>
            <CardTitle>Brzi pristup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[{
                href: "/drivers",
                title: "Performanse Vozača",
                text: "Pogledajte performanse svakog vozača pojedinačno",
                Icon: TrendingUp,
              },
              {
                href: "/trucks",
                title: "Performanse Kamiona",
                text: "Analizirajte performanse i troškove po kamionu",
                Icon: BarChart3,
              }].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-2xl border border-dark-100 bg-dark-50 px-4 py-3 hover:border-primary-200 transition"
                >
                  <div>
                    <p className="font-semibold text-dark-900">{link.title}</p>
                    <p className="text-sm text-dark-600">{link.text}</p>
                  </div>
                  <link.Icon className="w-5 h-5 text-dark-400" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-dark-100 shadow-soft-xl bg-dark-50">
          <CardHeader>
            <CardTitle>Alati za poređenje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <a
                href="/drivers/compare"
                className="flex items-center gap-4 rounded-2xl border border-dark-100 bg-dark-50 px-4 py-4 hover:border-primary-200 transition"
              >
                <div className="p-3 rounded-2xl bg-white">
                  <Users className="w-6 h-6 text-dark-800" />
                </div>
                <div>
                  <p className="font-semibold text-dark-900">Poređenje vozača</p>
                  <p className="text-sm text-dark-600">Uporedite performanse više vozača</p>
                </div>
              </a>
              <a
                href="/trucks/compare"
                className="flex items-center gap-4 rounded-2xl border border-dark-100 bg-dark-50 px-4 py-4 hover:border-primary-200 transition"
              >
                <div className="p-3 rounded-2xl bg-white">
                  <Truck className="w-6 h-6 text-dark-800" />
                </div>
                <div>
                  <p className="font-semibold text-dark-900">Poređenje kamiona</p>
                  <p className="text-sm text-dark-600">Uporedite performanse više kamiona</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
