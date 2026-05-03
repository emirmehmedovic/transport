import Link from "next/link";
import { ArrowRight, CheckCircle2, Route, ShieldCheck, Truck, PackageOpen, Building2 } from "lucide-react";

const services = [
  {
    title: "Auto Transport",
    description: "Siguran prevoz novih i polovnih vozila kroz domaće i EU rute.",
    icon: Truck,
  },
  {
    title: "Cisterna & ADR",
    description: "Planiranje i realizacija specijalnih tura za tečne terete.",
    icon: PackageOpen,
  },
  {
    title: "Standardni Teret",
    description: "Pouzdane FTL/LTL opcije sa jasnim rokovima i praćenjem.",
    icon: Route,
  },
];

const steps = [
  "Klijent kreira zahtjev kroz portal (pickup, delivery, modeli auta)",
  "Zahtjev ulazi u dispatcher/admin dashboard kao pending ruta",
  "Tim odobrava ili odbija, dopunjava cijene i operativne detalje",
  "Nakon odobrenja ruta se dodjeljuje vozaču i prati kroz standardni workflow",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_15%,#dbeafe_0%,#f8fafc_42%,#e2e8f0_100%)] text-slate-900">
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="rounded-[32px] border border-slate-200/70 bg-white/80 backdrop-blur-md p-8 md:p-12 shadow-[0_30px_70px_rgba(15,23,42,0.12)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
            <Building2 className="h-3.5 w-3.5" />
            Transport Platform
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Javna ponuda transporta i klijentski portal za samostalne load zahtjeve.
          </h1>

          <p className="mt-6 max-w-2xl text-base md:text-lg text-slate-600">
            Nudimo kompletan transportni servis, a klijentima omogućavamo da direktno kroz portal
            kreiraju rute i pošalju zahtjev koji odmah ulazi u operativni dashboard.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Prijava u Portal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Otvori Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article key={service.title} className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-soft">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold">{service.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{service.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-3 text-slate-900">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-xl font-bold">Kako radi klijentski portal</h2>
          </div>
          <ul className="mt-5 space-y-3">
            {steps.map((step) => (
              <li key={step} className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
