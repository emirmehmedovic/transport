"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/authContext";
import { Eye, EyeOff, ArrowRight, Info } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Prijava nije uspjela");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-6 font-sans relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-electric-500/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-6xl bg-white/95 backdrop-blur-sm rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 relative z-10">
        {/* Left side - Animated SVG Truck */}
        <div className="relative hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }} />
          </div>

          {/* Animated SVG with road */}
          <div className="relative z-10 w-full max-w-lg">
            {/* Road lines animation */}
            <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden opacity-20">
              <div className="road-lines" />
            </div>

            <div className="relative animate-truck-drive">
              {/* Glow effect behind SVG */}
              <div className="absolute inset-0 bg-electric-500/20 blur-3xl rounded-full animate-pulse-glow" />

              {/* Subtle exhaust smoke */}
              <div className="absolute left-[15%] bottom-[30%] pointer-events-none">
                <div className="smoke-particle" style={{ animationDelay: '0s' }} />
                <div className="smoke-particle" style={{ animationDelay: '0.8s' }} />
                <div className="smoke-particle" style={{ animationDelay: '1.6s' }} />
              </div>

              {/* SVG Image with bounce */}
              <Image
                src="/truck-animated.svg"
                alt="Transport Truck"
                width={600}
                height={400}
                className="w-full h-auto drop-shadow-2xl relative z-10 animate-truck-bounce"
                priority
              />
            </div>
          </div>

          {/* Text content */}
          <div className="mt-12 text-center space-y-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              FleetOps
            </h1>
            <p className="text-slate-300 text-lg max-w-md">
              Moderno rješenje za upravljanje flotom i logistikom
            </p>
            <div className="flex gap-6 justify-center pt-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-electric-500 rounded-full animate-ping" />
                <span>Real-time tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                <span>Smart analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="p-8 md:p-12 lg:p-16 flex items-center justify-center bg-white relative">
          <div className="w-full max-w-md space-y-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {/* Mobile header */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 mb-4 shadow-lg">
                <Image
                  src="/truck-animated.svg"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10"
                />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">FleetOps</h1>
              <p className="text-sm text-slate-600 mt-1">
                Upravljanje voznim parkom
              </p>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">
                Dobrodošli nazad
              </h2>
              <p className="text-slate-600">
                Prijavite se za pristup kontrolnoj tabli
              </p>
            </div>

            {/* Form */}
            <Card className="border-none shadow-none p-0">
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Input
                      label="Email adresa"
                      type="email"
                      placeholder="ime.prezime@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-xl border-slate-200 focus:border-electric-500 focus:ring-electric-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        label="Lozinka"
                        type={showPassword ? "text" : "password"}
                        placeholder="Unesite lozinku"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-12 rounded-xl border-slate-200 focus:border-electric-500 focus:ring-electric-500/20 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-10 text-slate-400 hover:text-slate-700 transition-colors"
                        aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-shake">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 hover:from-electric-500 hover:to-electric-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Prijava u toku...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Prijavi se
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                </form>

                {/* Footer note */}
                <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-electric-500/10 rounded-lg flex items-center justify-center">
                      <Info className="w-4 h-4 text-electric-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-1">
                        Trebate pomoć?
                      </p>
                      <p className="text-xs text-slate-600">
                        Kontaktirajte administratora za pristupne podatke ili resetovanje lozinke.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes truck-drive {
          0% {
            transform: translateX(-30px);
          }
          50% {
            transform: translateX(30px);
          }
          100% {
            transform: translateX(-30px);
          }
        }

        @keyframes truck-bounce {
          0%, 100% {
            transform: translateY(0px);
          }
          25% {
            transform: translateY(-2px);
          }
          75% {
            transform: translateY(-2px);
          }
        }

        @keyframes smoke-rise {
          0% {
            transform: translate(0, 0) scale(0.3);
            opacity: 0.4;
          }
          50% {
            opacity: 0.2;
          }
          100% {
            transform: translate(-15px, -50px) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes road-lines {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100px);
          }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-truck-drive {
          animation: truck-drive 8s ease-in-out infinite;
        }

        .animate-truck-bounce {
          animation: truck-bounce 0.6s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
          animation-fill-mode: both;
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        .road-lines {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          background-image: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 20px,
            rgba(255, 255, 255, 0.6) 20px,
            rgba(255, 255, 255, 0.6) 40px
          );
          animation: road-lines 1s linear infinite;
        }

        .smoke-particle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: radial-gradient(circle, rgba(140, 140, 140, 0.4), transparent);
          border-radius: 50%;
          animation: smoke-rise 2.5s ease-out infinite;
          filter: blur(2px);
        }
      `}</style>
    </div>
  );
}
