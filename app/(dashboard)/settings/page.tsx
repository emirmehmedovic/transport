"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { User, Lock, Save, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const isAdmin = user?.role === "ADMIN";

  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [schengenReportLoading, setSchengenReportLoading] = useState(false);
  const [schengenReportForm, setSchengenReportForm] = useState({
    enabled: false,
    recipients: "",
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchSchengenReportConfig = async () => {
      try {
        const res = await fetch("/api/settings/schengen-weekly-report", {
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json();
        setSchengenReportForm({
          enabled: data.enabled === true,
          recipients: Array.isArray(data.recipients) ? data.recipients.join("\n") : "",
        });
      } catch (error) {
        console.error("Error loading Schengen weekly report config:", error);
      }
    };

    fetchSchengenReportConfig();
  }, [isAdmin]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri ažuriranju profila");
      }

      setMessage({ type: "success", text: "Profil uspješno ažuriran!" });
      await refreshUser();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "Lozinke se ne podudaraju" });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(passwordForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri promjeni lozinke");
      }

      setMessage({ type: "success", text: "Lozinka uspješno promijenjena!" });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSchengenReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchengenReportLoading(true);
    setMessage(null);

    try {
      const recipients = schengenReportForm.recipients
        .split(/[\n,;]+/)
        .map((value) => value.trim())
        .filter(Boolean);

      const res = await fetch("/api/settings/schengen-weekly-report", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled: schengenReportForm.enabled,
          recipients,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri čuvanju Schengen mail postavki");
      }

      setSchengenReportForm({
        enabled: data.enabled === true,
        recipients: Array.isArray(data.recipients) ? data.recipients.join("\n") : "",
      });
      setMessage({
        type: "success",
        text: "Postavke sedmičnog Schengen mail izvještaja su sačuvane.",
      });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSchengenReportLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-dark-900 mb-2">Podešavanja</h1>
        <p className="text-dark-600">Upravljajte svojim profilom i sigurnošću naloga</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Information Card */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-100 rounded-xl">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark-900">Informacije o profilu</h2>
              <p className="text-sm text-dark-600">Ažurirajte svoje lične podatke</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">
                  Ime
                </label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, firstName: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">
                  Prezime
                </label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, lastName: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Telefon
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, phone: e.target.value })
                }
                className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-3 bg-dark-100 border border-dark-200 rounded-xl text-dark-600 cursor-not-allowed"
              />
              <p className="text-xs text-dark-500 mt-1">Email adresa se ne može mijenjati</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? "Čuvanje..." : "Sačuvaj promjene"}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Lock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark-900">Promjena lozinke</h2>
              <p className="text-sm text-dark-600">Osigurajte svoj nalog sa jakom lozinkom</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Trenutna lozinka
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                >
                  {showPasswords.current ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Nova lozinka
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 pr-12"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-dark-500 mt-1">Minimalno 6 karaktera</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Potvrdi novu lozinku
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {loading ? "Ažuriranje..." : "Promijeni lozinku"}
            </button>
          </form>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Save className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-dark-900">Schengen sedmični mail izvještaj</h2>
                <p className="text-sm text-dark-600">
                  Svakog petka šalje se izvještaj sa vozačima poredanim od najmanjeg broja preostalih Schengen dana.
                </p>
              </div>
            </div>

            <form onSubmit={handleSchengenReportSubmit} className="space-y-4">
              <label className="flex items-center gap-3 p-4 bg-dark-50 border border-dark-200 rounded-xl">
                <input
                  type="checkbox"
                  checked={schengenReportForm.enabled}
                  onChange={(e) =>
                    setSchengenReportForm((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-semibold text-dark-900">Aktiviraj sedmični Schengen mail</div>
                  <div className="text-sm text-dark-600">
                    Cron ga šalje petkom u 08:00 po vremenskoj zoni Europe/Sarajevo.
                  </div>
                </div>
              </label>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">
                  Primaoci izvještaja
                </label>
                <textarea
                  value={schengenReportForm.recipients}
                  onChange={(e) =>
                    setSchengenReportForm((prev) => ({
                      ...prev,
                      recipients: e.target.value,
                    }))
                  }
                  rows={6}
                  placeholder={"dispecer@firma.ba\nmenadzment@firma.ba"}
                  className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900"
                />
                <p className="text-xs text-dark-500 mt-1">
                  Unesi jednu ili više email adresa. Može po liniji ili odvojeno zarezom.
                </p>
              </div>

              <button
                type="submit"
                disabled={schengenReportLoading}
                className="w-full md:w-auto px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {schengenReportLoading ? "Čuvanje..." : "Sačuvaj Schengen mail postavke"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
