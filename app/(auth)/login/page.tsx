"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/authContext";
import { Truck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      // Login function will handle redirect
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 px-4 py-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-soft-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left side - brand / copy */}
        <div className="relative hidden md:flex flex-col justify-between bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white p-10">
          <div>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-3xl bg-electric-500 shadow-primary mb-6">
              <Truck className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">
              TransportApp kontrolna tabla
            </h1>
            <p className="text-sm text-dark-200 max-w-sm">
              Jedno mjesto za praćenje kamiona, vozača, loadova i finansija u realnom vremenu.
            </p>
          </div>

          <div className="space-y-3 text-xs text-dark-200">
            <p className="uppercase tracking-wide text-[10px] font-semibold text-dark-300">
              Šta dobijate:
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Pregled aktivnih ruta i vozila</li>
              <li>Brzu provjeru registracija i osiguranja</li>
              <li>Jednostavno upravljanje vozačima i dokumentima</li>
            </ul>
          </div>
        </div>

        {/* Right side - form */}
        <div className="p-8 md:p-10 flex items-center justify-center bg-white">
          <div className="w-full max-w-sm space-y-8">
            <div className="md:hidden text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-dark-900 text-white shadow-primary mb-4">
                <Truck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-dark-900 mb-1">TransportApp</h1>
              <p className="text-sm text-dark-500">
                Prijavite se za upravljanje voznim parkom
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-dark-900 mb-1">Dobrodošli nazad</h2>
              <p className="text-sm text-dark-500">
                Unesite svoje podatke za pristup kontrolnoj tabli.
              </p>
            </div>

            <Card className="border-none shadow-none p-0">
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="admin@transport.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <Input
                    label="Lozinka"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full rounded-full py-2.5 bg-dark-900 hover:bg-electric-500 text-white font-semibold shadow-soft hover:shadow-primary-lg"
                    disabled={loading}
                  >
                    {loading ? "Prijava u toku..." : "Prijavi se"}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-dark-50 rounded-2xl">
                  <p className="text-xs text-dark-600 font-semibold mb-2">
                    Demo pristupni podaci
                  </p>
                  <div className="space-y-1 text-xs text-dark-500">
                    <p>Admin: admin@transport.com / admin123</p>
                    <p>Dispečer: dispatcher@transport.com / dispatcher123</p>
                    <p>Vozač: driver@transport.com / driver123</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
