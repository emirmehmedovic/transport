"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Filter, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { formatDateTimeDMY } from "@/lib/date";

type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "DOCUMENT_UPLOAD"
  | "ASSIGNMENT"
  | "PAYMENT";

type AuditEntity =
  | "USER"
  | "DRIVER"
  | "TRUCK"
  | "LOAD"
  | "DOCUMENT"
  | "PAY_STUB"
  | "MAINTENANCE"
  | "EXPENSE";

interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  changes: any;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [entityFilter, setEntityFilter] = useState<AuditEntity | "all">("all");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [entityIdFilter, setEntityIdFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // Selected log for detail view
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, actionFilter, entityIdFilter, startDate, endDate]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (entityFilter !== "all") {
        params.append("entity", entityFilter);
      }

      if (actionFilter !== "all") {
        params.append("action", actionFilter);
      }

      if (entityIdFilter.trim()) {
        params.append("entityId", entityIdFilter.trim());
      }

      if (startDate) {
        params.append("startDate", startDate);
      }

      if (endDate) {
        params.append("endDate", endDate);
      }

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setError(err instanceof Error ? err.message : "Došlo je do greške");
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: AuditAction): string => {
    switch (action) {
      case "CREATE":
        return "Kreiran";
      case "UPDATE":
        return "Ažuriran";
      case "DELETE":
        return "Obrisan";
      case "STATUS_CHANGE":
        return "Promjena statusa";
      case "DOCUMENT_UPLOAD":
        return "Upload dokumenta";
      case "ASSIGNMENT":
        return "Dodjela";
      case "PAYMENT":
        return "Plaćanje";
    }
  };

  const getActionColor = (action: AuditAction): string => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-700";
      case "UPDATE":
        return "bg-blue-100 text-blue-700";
      case "DELETE":
        return "bg-red-100 text-red-700";
      case "STATUS_CHANGE":
        return "bg-purple-100 text-purple-700";
      case "DOCUMENT_UPLOAD":
        return "bg-yellow-100 text-yellow-700";
      case "ASSIGNMENT":
        return "bg-orange-100 text-orange-700";
      case "PAYMENT":
        return "bg-teal-100 text-teal-700";
    }
  };

  const getEntityLabel = (entity: AuditEntity): string => {
    switch (entity) {
      case "USER":
        return "Korisnik";
      case "DRIVER":
        return "Vozač";
      case "TRUCK":
        return "Kamion";
      case "LOAD":
        return "Load";
      case "DOCUMENT":
        return "Dokument";
      case "PAY_STUB":
        return "Pay Stub";
      case "MAINTENANCE":
        return "Maintenance";
      case "EXPENSE":
        return "Expense";
    }
  };

  const getEntityLink = (entity: AuditEntity, entityId: string): string => {
    switch (entity) {
      case "DRIVER":
        return `/drivers/${entityId}`;
      case "TRUCK":
        return `/trucks/${entityId}`;
      case "LOAD":
        return `/loads/${entityId}`;
      case "DOCUMENT":
        return `/documents`;
      case "PAY_STUB":
        return `/wages`;
      default:
        return "#";
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateTimeDMY(dateString);
  };

  const totalLogs = data?.pagination.total ?? 0;
  const currentPage = data?.pagination.page ?? page;
  const totalPages = data?.pagination.totalPages ?? 1;
  const logsOnPage = data?.logs.length ?? 0;
  const currentFilters = [
    entityFilter === "all" ? "Svi entiteti" : getEntityLabel(entityFilter as AuditEntity),
    actionFilter === "all" ? "Sve akcije" : getActionLabel(actionFilter as AuditAction),
  ];

  const changedFields = useMemo(() => {
    if (!selectedLog?.changes) return [];
    const before = selectedLog.changes.before || {};
    const after = selectedLog.changes.after || {};
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    return keys
      .map((key) => ({
        key,
        before: before[key],
        after: after[key],
      }))
      .filter((entry) => JSON.stringify(entry.before) !== JSON.stringify(entry.after));
  }, [selectedLog]);

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={Eye}
        title="Audit Logs"
        subtitle="Kompletan zapis svih akcija i izmjena u sistemu."
        actions={
          <button
            onClick={fetchLogs}
            className="rounded-full border border-white/15 bg-white/5 px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-dark-50 hover:bg-white/10 hover:border-white/25 transition-colors whitespace-nowrap"
          >
            Osvježi
          </button>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10 text-white">
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-white/70">Ukupno logova</p>
            <p className="text-xl md:text-2xl font-bold mt-1">{totalLogs}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10 text-white">
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-white/70">Stranica</p>
            <p className="text-xl md:text-2xl font-bold mt-1">{currentPage}/{totalPages}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10 text-white">
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-white/70">Na stranici</p>
            <p className="text-xl md:text-2xl font-bold mt-1">{logsOnPage}</p>
          </div>
          <div className="bg-white/5 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 border border-white/10 text-white">
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-white/70">Filteri</p>
            <p className="text-xs md:text-sm font-medium mt-1 text-white/80 truncate">
              {currentFilters.join(" · ")}
            </p>
          </div>
        </div>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-dark-600" />
            <CardTitle>Filteri</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Entity Filter */}
            <div>
              <label className="text-sm font-medium text-dark-700 mb-2 block">
                Entity Type
              </label>
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value as AuditEntity | "all");
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Svi entiteti</option>
                <option value="USER">Korisnik</option>
                <option value="DRIVER">Vozač</option>
                <option value="TRUCK">Kamion</option>
                <option value="LOAD">Load</option>
                <option value="DOCUMENT">Dokument</option>
                <option value="PAY_STUB">Pay Stub</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="text-sm font-medium text-dark-700 mb-2 block">
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value as AuditAction | "all");
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Sve akcije</option>
                <option value="CREATE">Kreiran</option>
                <option value="UPDATE">Ažuriran</option>
                <option value="DELETE">Obrisan</option>
                <option value="STATUS_CHANGE">Promjena statusa</option>
                <option value="DOCUMENT_UPLOAD">Upload dokumenta</option>
                <option value="ASSIGNMENT">Dodjela</option>
                <option value="PAYMENT">Plaćanje</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-dark-700 mb-2 block">
                Entity ID
              </label>
              <input
                type="text"
                value={entityIdFilter}
                onChange={(e) => {
                  setEntityIdFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="npr. cml44dtg..."
                className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-dark-700 mb-2 block">
                  Od
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-dark-700 mb-2 block">
                  Do
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchLogs}
                className="text-sm text-primary-600 hover:underline"
              >
                Pokušaj ponovo
              </button>
            </div>
          ) : data && data.logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-dark-700 font-semibold">Nema audit logova</p>
              <p className="text-sm text-dark-500 mt-1">
                Pokušajte promijeniti filtere
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-dark-500 border-b border-dark-100">
                      <th className="pb-3 font-medium">Vrijeme</th>
                      <th className="pb-3 font-medium">Korisnik</th>
                      <th className="pb-3 font-medium">Akcija</th>
                      <th className="pb-3 font-medium">Entity</th>
                      <th className="pb-3 font-medium">Entity ID</th>
                      <th className="pb-3 font-medium">IP Adresa</th>
                      <th className="pb-3 font-medium">Detalji</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-100">
                    {data?.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-dark-50">
                        <td className="py-3 text-dark-600">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="py-3">
                          <div>
                            <p className="font-medium text-dark-900">
                              {log.user.firstName} {log.user.lastName}
                            </p>
                            <p className="text-xs text-dark-500">{log.user.email}</p>
                          </div>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(
                              log.action
                            )}`}
                          >
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="py-3 text-dark-700">
                          {getEntityLabel(log.entity)}
                        </td>
                        <td className="py-3 text-dark-600 font-mono text-xs">
                          {log.entityId.substring(0, 8)}...
                        </td>
                        <td className="py-3 text-dark-600 text-xs">
                          {log.ipAddress || "N/A"}
                        </td>
                        <td className="py-3">
                          {log.changes && (
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-primary-600 hover:underline text-sm flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Prikaži
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-dark-100">
                  <p className="text-sm text-dark-600">
                    Stranica {data.pagination.page} od {data.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-dark-200 rounded-xl hover:bg-dark-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prethodna
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!data.pagination.hasMore}
                      className="px-4 py-2 border border-dark-200 rounded-xl hover:bg-dark-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      Sljedeća
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-dark-900 mb-4">
              Detalji izmjene
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-dark-500">Akcija</p>
                <p className="font-semibold text-dark-900">
                  {getActionLabel(selectedLog.action)} - {getEntityLabel(selectedLog.entity)}
                </p>
              </div>

              <div>
                <p className="text-sm text-dark-500">Korisnik</p>
                <p className="font-semibold text-dark-900">
                  {selectedLog.user.firstName} {selectedLog.user.lastName} ({selectedLog.user.email})
                </p>
              </div>

              <div>
                <p className="text-sm text-dark-500">Vrijeme</p>
                <p className="font-semibold text-dark-900">
                  {formatDate(selectedLog.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-sm text-dark-500 mb-2">Entitet</p>
                <button
                  onClick={() => {
                    const link = getEntityLink(selectedLog.entity, selectedLog.entityId);
                    if (link !== "#") {
                      router.push(link);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-dark-200 px-4 py-2 text-sm font-semibold text-dark-700 hover:bg-dark-50"
                >
                  Otvori {getEntityLabel(selectedLog.entity)}
                </button>
              </div>

              {selectedLog.changes && changedFields.length > 0 && (
                <div>
                  <p className="text-sm text-dark-500 mb-2">Promijenjena polja</p>
                  <div className="space-y-2">
                    {changedFields.map((field) => (
                      <div
                        key={field.key}
                        className="rounded-xl border border-dark-100 bg-dark-50/50 px-4 py-3"
                      >
                        <p className="text-xs font-semibold text-dark-500 uppercase tracking-wide">
                          {field.key}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-xs">
                          <div>
                            <p className="text-[11px] text-dark-400 uppercase mb-1">Prije</p>
                            <div className="rounded-lg border border-dark-100 bg-white px-3 py-2 text-dark-700">
                              {field.before === undefined
                                ? "-"
                                : JSON.stringify(field.before)}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] text-dark-400 uppercase mb-1">Poslije</p>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                              {field.after === undefined
                                ? "-"
                                : JSON.stringify(field.after)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.changes && changedFields.length === 0 && (
                <div>
                  <p className="text-sm text-dark-500 mb-2">Izmjene</p>
                  <pre className="bg-dark-50 rounded-xl p-4 text-xs overflow-auto max-h-96">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="mt-6 w-full px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
            >
              Zatvori
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
