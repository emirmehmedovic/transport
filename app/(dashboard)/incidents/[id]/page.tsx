"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, UploadCloud } from "lucide-react";

type IncidentDetail = {
  id: string;
  severity: string;
  status: string;
  occurredAt: string;
  location: string;
  description: string;
  driver?: { user?: { firstName: string; lastName: string } };
  truck?: { truckNumber: string };
  load?: { loadNumber: string } | null;
};

type Claim = {
  id: string;
  claimNumber?: string | null;
  amount?: number | null;
  status: string;
  notes?: string | null;
};

type DocumentItem = {
  id: string;
  fileName: string;
  filePath: string;
  createdAt: string;
};

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id as string;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [claimForm, setClaimForm] = useState({
    claimNumber: "",
    amount: "",
    status: "OPEN",
    notes: "",
  });

  useEffect(() => {
    fetchIncident();
    fetchClaims();
    fetchDocuments();
  }, [incidentId]);

  const fetchIncident = async () => {
    setLoading(true);
    const res = await fetch(`/api/incidents/${incidentId}`);
    const data = await res.json();
    if (res.ok) setIncident(data.incident);
    setLoading(false);
  };

  const fetchClaims = async () => {
    const res = await fetch(`/api/claims?incidentId=${incidentId}`);
    const data = await res.json();
    if (res.ok) setClaims(data.claims || []);
  };

  const fetchDocuments = async () => {
    const res = await fetch(`/api/documents?incidentId=${incidentId}`);
    const data = await res.json();
    if (res.ok) setDocuments(data.documents || []);
  };

  const handleClaimCreate = async () => {
    setSaving(true);
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incidentId,
        ...claimForm,
      }),
    });
    if (res.ok) {
      setClaimForm({ claimNumber: "", amount: "", status: "OPEN", notes: "" });
      await fetchClaims();
    }
    setSaving(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("type", "INCIDENT_PHOTO");
    fd.append("incidentId", incidentId);
    const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
    if (res.ok) {
      setSelectedFile(null);
      await fetchDocuments();
    }
    setUploading(false);
  };

  if (loading || !incident) {
    return <div className="p-8 text-dark-500">Učitavanje...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 font-sans px-4 md:px-0">
      <PageHeader
        icon={AlertTriangle}
        title="Incident detalji"
        subtitle={`${incident.severity} • ${incident.status}`}
        actions={
          <Button variant="outline" onClick={() => router.push("/incidents")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nazad
          </Button>
        }
      />

      <div className="bg-white rounded-3xl p-6 shadow-soft space-y-2">
        <p className="text-sm text-dark-600">
          {incident.driver?.user?.firstName} {incident.driver?.user?.lastName} •{" "}
          {incident.truck?.truckNumber} • {incident.location}
        </p>
        <p className="text-sm text-dark-900">{incident.description}</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft space-y-4">
        <h3 className="text-lg font-semibold text-dark-900">Claimovi</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Claim broj"
            value={claimForm.claimNumber}
            onChange={(e) => setClaimForm((p) => ({ ...p, claimNumber: e.target.value }))}
          />
          <input
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            placeholder="Iznos"
            value={claimForm.amount}
            onChange={(e) => setClaimForm((p) => ({ ...p, amount: e.target.value }))}
          />
          <select
            className="rounded-xl border border-dark-200 px-3 py-2 text-sm"
            value={claimForm.status}
            onChange={(e) => setClaimForm((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="OPEN">Open</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PAID">Paid</option>
          </select>
          <Button onClick={handleClaimCreate} disabled={saving}>
            {saving ? "Spremanje..." : "Dodaj claim"}
          </Button>
        </div>
        <textarea
          className="w-full rounded-xl border border-dark-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Napomene"
          value={claimForm.notes}
          onChange={(e) => setClaimForm((p) => ({ ...p, notes: e.target.value }))}
        />
        <div className="space-y-2">
          {claims.map((c) => (
            <div key={c.id} className="rounded-xl border border-dark-200 px-4 py-3 text-sm">
              <p className="font-semibold text-dark-900">
                {c.claimNumber || "Claim"} • {c.status}
              </p>
              {c.amount !== null && <p className="text-xs text-dark-600">Iznos: {c.amount}</p>}
              {c.notes && <p className="text-xs text-dark-500">{c.notes}</p>}
            </div>
          ))}
          {claims.length === 0 && <p className="text-sm text-dark-500">Nema claimova.</p>}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft space-y-4">
        <h3 className="text-lg font-semibold text-dark-900">Dokumenti / Fotografije</h3>
        <div className="flex items-center gap-3">
          <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
          <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
            <UploadCloud className="w-4 h-4 mr-2" />
            {uploading ? "Upload..." : "Upload"}
          </Button>
        </div>
        <div className="space-y-2">
          {documents.map((d) => (
            <div key={d.id} className="rounded-xl border border-dark-200 px-4 py-3 text-sm">
              <p className="font-semibold text-dark-900">{d.fileName}</p>
              <p className="text-xs text-dark-500">
                {new Date(d.createdAt).toLocaleDateString("bs-BA")}
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(`/api/documents/${d.id}/download`)}>
                  Download
                </Button>
              </div>
            </div>
          ))}
          {documents.length === 0 && <p className="text-sm text-dark-500">Nema dokumenata.</p>}
        </div>
      </div>
    </div>
  );
}
