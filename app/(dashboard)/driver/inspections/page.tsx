"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Clipboard, UploadCloud } from "lucide-react";

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

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={Clipboard}
        title="DVIR (Driver)"
        subtitle="Pre/post trip inspekcije i upload fotografija"
      />

      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft space-y-4">
        <h3 className="text-base md:text-lg font-semibold text-dark-900">Nova inspekcija</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
          >
            <option value="PRE_TRIP">Pre-trip</option>
            <option value="POST_TRIP">Post-trip</option>
          </select>
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="SAFE">Safe</option>
            <option value="UNSAFE">Unsafe</option>
            <option value="NEEDS_REPAIR">Needs repair</option>
          </select>
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.truckId}
            onChange={(e) => setForm((p) => ({ ...p, truckId: e.target.value }))}
          >
            <option value="">Kamion</option>
            {driver?.primaryTruck?.id && (
              <option value={driver.primaryTruck.id}>
                {driver.primaryTruck.truckNumber} (primarni)
              </option>
            )}
          </select>
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={form.trailerId}
            onChange={(e) => setForm((p) => ({ ...p, trailerId: e.target.value }))}
          >
            <option value="">Prikolica (opcionalno)</option>
            {trailers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Odometer"
            value={form.odometer}
            onChange={(e) => setForm((p) => ({ ...p, odometer: e.target.value }))}
          />
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
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? "Spremanje..." : "Snimi"}
        </Button>
      </div>

      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-soft space-y-4">
        <h3 className="text-base md:text-lg font-semibold text-dark-900">Upload fotografija</h3>
        <p className="text-xs text-dark-500">
          Zadnja kreirana inspekcija: {lastInspectionId || "Nema"}
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="w-full sm:w-auto text-sm"
          />
          <Button onClick={handleUpload} disabled={uploading || !lastInspectionId} className="w-full sm:w-auto">
            <UploadCloud className="w-4 h-4 mr-2" />
            {uploading ? "Upload..." : "Upload"}
          </Button>
        </div>
        <div className="space-y-2">
          {documents.map((d) => (
            <div key={d.id} className="rounded-xl border border-dark-200 px-4 py-2 text-sm">
              <p className="font-semibold text-dark-900">{d.fileName}</p>
              <p className="text-xs text-dark-500">
                {new Date(d.createdAt).toLocaleDateString("bs-BA")}
              </p>
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/api/documents/${d.id}/download`)}
                >
                  Download
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
        <h3 className="text-base md:text-lg font-semibold text-dark-900 mb-3 md:mb-4">Moje inspekcije</h3>
        {loading ? (
          <p className="text-dark-500">Učitavanje...</p>
        ) : (
          <div className="space-y-2">
            {inspections.map((i) => (
              <div
                key={i.id}
                className="rounded-xl border border-dark-200 px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-dark-900">{i.type} • {i.status}</p>
                  <p className="text-xs text-dark-500">
                    {new Date(i.createdAt).toLocaleDateString("bs-BA")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
