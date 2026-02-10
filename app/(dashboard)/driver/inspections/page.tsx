"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Clipboard,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck as TruckIcon,
  FileUp,
  Search,
} from "lucide-react";
import { formatDateDMY } from "@/lib/date";

type Option = { id: string; label: string };

type DriverDetail = {
  id: string;
  primaryTruck?: { id: string; truckNumber: string } | null;
};

type Inspection = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
};

type DocumentItem = {
  id: string;
  fileName: string;
  createdAt: string;
};

export default function DriverInspectionsPage() {
  const { user } = useAuth();
  const driverId = user?.driver?.id;

  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [trailers, setTrailers] = useState<Option[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastInspectionId, setLastInspectionId] = useState<string>("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const [form, setForm] = useState({
    type: "PRE_TRIP",
    status: "SAFE",
    truckId: "",
    trailerId: "",
    odometer: "",
    defects: false,
    defectNotes: "",
    notes: "",
  });

  useEffect(() => {
    if (!driverId) return;
    fetchDriver();
    fetchInspections();
    fetchTrailers();
  }, [driverId]);

  const fetchDriver = async () => {
    const res = await fetch(`/api/drivers/${driverId}`);
    const data = await res.json();
    if (res.ok) {
      setDriver(data.driver);
      if (data.driver?.primaryTruck?.id) {
        setForm((p) => ({ ...p, truckId: data.driver.primaryTruck.id }));
      }
    }
  };

  const fetchTrailers = async () => {
    const res = await fetch("/api/trailers");
    const data = await res.json();
    if (res.ok) {
      setTrailers(
        (data.trailers || []).map((t: any) => ({
          id: t.id,
          label: t.trailerNumber,
        }))
      );
    }
  };

  const fetchInspections = async () => {
    setLoading(true);
    const res = await fetch("/api/inspections");
    const data = await res.json();
    setInspections(data.inspections || []);
    setLoading(false);
  };

  const fetchDocuments = async (inspectionId: string) => {
    const res = await fetch(`/api/documents?inspectionId=${inspectionId}`);
    const data = await res.json();
    if (res.ok) setDocuments(data.documents || []);
  };

  const handleCreate = async () => {
    if (!form.truckId) {
      alert("Odaberite kamion.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setLastInspectionId(data.inspection?.id);
      await fetchDocuments(data.inspection?.id);
      await fetchInspections();
      setForm((p) => ({
        ...p,
        odometer: "",
        defects: false,
        defectNotes: "",
        notes: "",
      }));
    } else {
      alert(data.error || "Greška pri spremanju");
    }
    setSaving(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || !lastInspectionId) {
      alert("Odaberite fajl i inspekciju.");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("type", "INSPECTION_PHOTO");
    fd.append("inspectionId", lastInspectionId);
    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Greška pri uploadu");
    } else {
      setSelectedFile(null);
      await fetchDocuments(lastInspectionId);
    }
    setUploading(false);
  };

  const filteredInspections = useMemo(() => {
    return inspections.filter((i) => {
      if (filterType !== "ALL" && i.type !== filterType) return false;
      if (filterStatus !== "ALL" && i.status !== filterStatus) return false;
      if (search.trim()) {
        return i.id.toLowerCase().includes(search.trim().toLowerCase());
      }
      return true;
    });
  }, [inspections, filterStatus, filterType, search]);

  const latestInspection = inspections[0];
  const unsafeCount = inspections.filter((i) => i.status === "UNSAFE").length;
  const statusButtonClasses: Record<string, string> = {
    SAFE: "bg-emerald-600 text-white border-emerald-600",
    UNSAFE: "bg-red-600 text-white border-red-600",
    NEEDS_REPAIR: "bg-amber-600 text-white border-amber-600",
  };

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={Clipboard}
        title="DVIR (Vozač)"
        subtitle="Pre/post inspekcije i upload fotografija"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-2xl border border-dark-200 bg-white p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-dark-500">Ukupno inspekcija</p>
            <p className="text-lg font-semibold text-dark-900">{inspections.length}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-dark-200 bg-white p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-dark-500">Nesigurne inspekcije</p>
            <p className="text-lg font-semibold text-dark-900">{unsafeCount}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-dark-200 bg-white p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-dark-500">Zadnja inspekcija</p>
            <p className="text-lg font-semibold text-dark-900">
              {latestInspection ? formatDateDMY(latestInspection.createdAt) : "Nema"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft space-y-4">
        <h3 className="text-base md:text-lg font-semibold text-dark-900">Nova inspekcija</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="rounded-xl border border-dark-200 p-3 md:p-4 space-y-3">
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wide">Tip inspekcije</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "PRE_TRIP", label: "Prije vožnje" },
                { value: "POST_TRIP", label: "Poslije vožnje" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: item.value }))}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    form.type === item.value
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-dark-700 border-dark-200 hover:bg-dark-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-dark-200 p-3 md:p-4 space-y-3">
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wide">Status</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "SAFE", label: "Sigurno", tone: "emerald" },
                { value: "UNSAFE", label: "Nesigurno", tone: "red" },
                { value: "NEEDS_REPAIR", label: "Potrebna popravka", tone: "amber" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, status: item.value }))}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    form.status === item.value
                      ? statusButtonClasses[item.value]
                      : "bg-white text-dark-700 border-dark-200 hover:bg-dark-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="rounded-xl border border-dark-200 p-3 md:p-4 space-y-2">
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wide">Kamion</p>
            <select
              className="w-full rounded-lg border border-dark-200 px-3 py-2 text-sm"
              value={form.truckId}
              onChange={(e) => setForm((p) => ({ ...p, truckId: e.target.value }))}
            >
              <option value="">Odaberi kamion</option>
              {driver?.primaryTruck?.id && (
                <option value={driver.primaryTruck.id}>
                  {driver.primaryTruck.truckNumber} (primarni)
                </option>
              )}
            </select>
            {driver?.primaryTruck?.truckNumber && (
              <div className="inline-flex items-center gap-2 text-xs text-dark-600">
                <TruckIcon className="w-3.5 h-3.5" />
                Primarni: {driver.primaryTruck.truckNumber}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-dark-200 p-3 md:p-4 space-y-2">
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wide">Prikolica</p>
            <select
              className="w-full rounded-lg border border-dark-200 px-3 py-2 text-sm"
              value={form.trailerId}
              onChange={(e) => setForm((p) => ({ ...p, trailerId: e.target.value }))}
            >
              <option value="">Bez prikolice</option>
              {trailers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-dark-200 p-3 md:p-4 space-y-2">
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wide">Kilometraža</p>
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-lg border border-dark-200 px-3 py-2 text-sm"
                placeholder="Unesi kilometražu"
                value={form.odometer}
                onChange={(e) => setForm((p) => ({ ...p, odometer: e.target.value }))}
              />
              <span className="text-xs text-dark-500">km</span>
            </div>
          </div>
        </div>

        <textarea
          className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Napomene"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.defects}
            onChange={(e) => setForm((p) => ({ ...p, defects: e.target.checked }))}
          />
          <span className="text-sm text-dark-700">Ima nedostataka</span>
        </div>
        {form.defects && (
          <textarea
            className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
            rows={2}
            placeholder="Opis nedostataka"
            value={form.defectNotes}
            onChange={(e) => setForm((p) => ({ ...p, defectNotes: e.target.value }))}
          />
        )}
        <Button onClick={handleCreate} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Spremanje..." : "Snimi"}
        </Button>
      </div>

      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h3 className="text-base md:text-lg font-semibold text-dark-900">Upload fotografija</h3>
          <div className="inline-flex items-center gap-2 text-xs text-dark-600">
            <FileUp className="w-4 h-4" />
            Aktivna inspekcija: {lastInspectionId || "Nema"}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="rounded-xl border border-dark-200 p-3 md:p-4 space-y-2">
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wide">Odaberi inspekciju</p>
            <select
              className="w-full rounded-lg border border-dark-200 px-3 py-2 text-sm"
              value={lastInspectionId}
              onChange={(e) => {
                setLastInspectionId(e.target.value);
                if (e.target.value) fetchDocuments(e.target.value);
              }}
            >
              <option value="">Izaberi inspekciju</option>
              {inspections.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.type} • {formatDateDMY(i.createdAt)}
                </option>
              ))}
            </select>
            <p className="text-xs text-dark-500">Ako nemaš inspekciju, prvo je kreiraj.</p>
          </div>
          <div className="rounded-xl border border-dark-200 p-3 md:p-4 space-y-2">
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wide">Upload fajla</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full sm:w-auto text-sm"
              />
              <Button
                onClick={handleUpload}
                disabled={uploading || !lastInspectionId}
                className="w-full sm:w-auto"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                {uploading ? "Učitavanje..." : "Upload"}
              </Button>
            </div>
            <p className="text-xs text-dark-500">Podržane slike i PDF dokumenti.</p>
          </div>
        </div>
        <div className="space-y-2">
          {documents.map((d) => (
            <div key={d.id} className="rounded-xl border border-dark-200 px-4 py-2 text-sm">
              <p className="font-semibold text-dark-900">{d.fileName}</p>
              <p className="text-xs text-dark-500">
                {formatDateDMY(d.createdAt)}
              </p>
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/api/documents/${d.id}/download`)}
                >
                  Preuzmi
                </Button>
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <p className="text-sm text-dark-500">Nema uploadovanih dokumenata.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3 md:mb-4">
          <h3 className="text-base md:text-lg font-semibold text-dark-900">Moje inspekcije</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="rounded-lg border border-dark-200 pl-9 pr-3 py-2 text-sm"
                placeholder="Pretraga po ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-lg border border-dark-200 px-3 py-2 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">Svi tipovi</option>
              <option value="PRE_TRIP">Prije vožnje</option>
              <option value="POST_TRIP">Poslije vožnje</option>
            </select>
            <select
              className="rounded-lg border border-dark-200 px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Svi statusi</option>
              <option value="SAFE">Sigurno</option>
              <option value="UNSAFE">Nesigurno</option>
              <option value="NEEDS_REPAIR">Potrebna popravka</option>
            </select>
          </div>
        </div>
        {loading ? (
          <p className="text-dark-500">Učitavanje...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredInspections.map((i) => (
              <div
                key={i.id}
                className="rounded-xl border border-dark-200 px-4 py-3 text-sm flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-dark-900">{i.type}</p>
                    <p className="text-xs text-dark-500">{formatDateDMY(i.createdAt)}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      i.status === "SAFE"
                        ? "bg-emerald-100 text-emerald-700"
                        : i.status === "UNSAFE"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {i.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-dark-600">
                  <span className="rounded-full bg-dark-50 px-2 py-0.5">ID: {i.id}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setLastInspectionId(i.id);
                      await fetchDocuments(i.id);
                    }}
                  >
                    Postavi za upload
                  </Button>
                </div>
              </div>
            ))}
            {!filteredInspections.length && (
              <div className="rounded-xl border border-dashed border-dark-200 px-4 py-6 text-sm text-dark-500">
                Nema inspekcija za odabrane filtere.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
