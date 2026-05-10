"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Save, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => import("@/components/maps/LocationPicker"),
  { ssr: false, loading: () => <div className="h-[400px] bg-slate-100 rounded-xl animate-pulse" /> }
);

export default function EditLandmarkPage() {
  const router = useRouter();
  const params = useParams();
  const landmarkId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    type: "TERMINAL" as
      | "FUEL_STATION"
      | "TERMINAL"
      | "PORT"
      | "WAREHOUSE"
      | "CAR_DEALERSHIP"
      | "COMPANY"
      | "OTHER",
    description: "",
    companyName: "",
    latitude: "",
    longitude: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "BA",
    phone: "",
    email: "",
    website: "",
    iconColor: "#3B82F6",
    showLabel: true,
    isActive: true,
    notes: "",
  });

  useEffect(() => {
    fetchLandmark();
  }, [landmarkId]);

  const fetchLandmark = async () => {
    try {
      const res = await fetch(`/api/landmarks/${landmarkId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri učitavanju tačke");
      }

      const landmark = data.landmark;
      setFormData({
        name: landmark.name || "",
        type: landmark.type || "TERMINAL",
        description: landmark.description || "",
        companyName: landmark.companyName || "",
        latitude: String(landmark.latitude || ""),
        longitude: String(landmark.longitude || ""),
        address: landmark.address || "",
        city: landmark.city || "",
        state: landmark.state || "",
        zip: landmark.zip || "",
        country: landmark.country || "BA",
        phone: landmark.phone || "",
        email: landmark.email || "",
        website: landmark.website || "",
        iconColor: landmark.iconColor || "#3B82F6",
        showLabel: landmark.showLabel !== false,
        isActive: landmark.isActive !== false,
        notes: landmark.notes || "",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({
        ...formData,
        [name]: checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleLocationChange = (data: {
    address: string;
    city: string;
    state: string;
    zip: string;
    latitude: number;
    longitude: number;
  }) => {
    setFormData((prev) => ({
      ...prev,
      latitude: data.latitude.toString(),
      longitude: data.longitude.toString(),
      // Only update address fields if they have actual values from geocoding
      address: data.address || prev.address,
      city: data.city || prev.city,
      state: data.state || prev.state,
      zip: data.zip || prev.zip,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validacija
    if (!formData.name || !formData.type) {
      setError("Naziv i tip su obavezni");
      setLoading(false);
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      setError("Morate odabrati lokaciju na mapi");
      setLoading(false);
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError("Neispravna geografska širina (-90 do 90)");
      setLoading(false);
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      setError("Neispravna geografska dužina (-180 do 180)");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/landmarks/${landmarkId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          latitude: lat,
          longitude: lon,
          description: formData.description || undefined,
          companyName: formData.companyName || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip: formData.zip || undefined,
          country: formData.country || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          website: formData.website || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri ažuriranju tačke");
      }

      router.push("/landmarks");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-spin" />
          <p className="text-slate-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button
        onClick={() => router.push("/landmarks")}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Nazad na listu
      </button>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          Uredi značajnu tačku
        </h1>
        <p className="text-slate-600 mt-2">
          Ažurirajte informacije o tački
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lokacija - Now First! */}
        <Card>
          <CardHeader>
            <CardTitle>Lokacija na mapi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Suspense fallback={<div className="h-[400px] bg-slate-100 rounded-xl animate-pulse" />}>
              <LocationPicker
                label="Kliknite na mapu ili pretražite adresu"
                initialLocation={
                  formData.latitude && formData.longitude
                    ? {
                        address: formData.address,
                        city: formData.city,
                        state: formData.state,
                        zip: formData.zip,
                        latitude: parseFloat(formData.latitude),
                        longitude: parseFloat(formData.longitude),
                      }
                    : undefined
                }
                onChange={handleLocationChange}
              />
            </Suspense>
          </CardContent>
        </Card>

        {/* Osnovni podaci */}
        <Card>
          <CardHeader>
            <CardTitle>Osnovni podaci</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Naziv *
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Naziv tačke"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tip *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="FUEL_STATION">⛽ Benzinska pumpa</option>
                  <option value="TERMINAL">🏢 Terminal</option>
                  <option value="PORT">⚓ Luka</option>
                  <option value="WAREHOUSE">📦 Skladište</option>
                  <option value="CAR_DEALERSHIP">🚗 Auto plac</option>
                  <option value="COMPANY">🏭 Firma</option>
                  <option value="OTHER">📍 Ostalo</option>
                </select>
              </div>
            </div>

            {formData.type === "COMPANY" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Naziv firme
                </label>
                <Input
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Unesite naziv firme"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Opis
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Opis tačke"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Adresa Details */}
        <Card>
          <CardHeader>
            <CardTitle>Adresa (automatski popunjeno sa mape)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Adresa
              </label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
                onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                placeholder="Ulica i broj"
                autoComplete="off"
                readOnly
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Grad
                </label>
                <Input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                  placeholder="Grad"
                  autoComplete="off"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Država
                </label>
                <Input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                  placeholder="Entitet/Pokrajina"
                  autoComplete="off"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  ZIP
                </label>
                <Input
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                  placeholder="Poštanski broj"
                  autoComplete="off"
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Zemlja
              </label>
              <Input
                name="country"
                value={formData.country}
                onChange={handleChange}
                onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                placeholder="BA"
                autoComplete="off"
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        {/* Kontakt informacije */}
        <Card>
          <CardHeader>
            <CardTitle>Kontakt informacije (opciono)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Telefon
                </label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+387 XX XXX XXX"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Website
                </label>
                <Input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  autoComplete="url"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Podešavanja prikaza */}
        <Card>
          <CardHeader>
            <CardTitle>Podešavanja prikaza</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Boja ikone
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="iconColor"
                    value={formData.iconColor}
                    onChange={handleChange}
                    className="w-12 h-10 border border-slate-200 rounded-lg cursor-pointer"
                  />
                  <Input
                    name="iconColor"
                    value={formData.iconColor}
                    onChange={handleChange}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Prikaz
                </label>
                <div className="flex items-center gap-3 h-10">
                  <input
                    type="checkbox"
                    name="showLabel"
                    checked={formData.showLabel}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">
                    Prikaži naziv na mapi
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status i napomene */}
        <Card>
          <CardHeader>
            <CardTitle>Status i napomene</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Tačka je aktivna
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1 ml-7">
                Neaktivne tačke se neće prikazivati na mapi
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Napomene
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Dodatne napomene ili informacije"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex items-center gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/landmarks")}
            disabled={loading}
          >
            Odustani
          </Button>
          <Button type="submit" disabled={loading} className="min-w-[120px]">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Spremam...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Spremi izmjene
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
