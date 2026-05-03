"use client";

import Link from "next/link";
import { Download, ExternalLink, Info, Shield, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";

const APK_DOWNLOAD_PATH = "/downloads/hps-transport-android.apk";

export default function AndroidAppPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Android aplikacija"
        subtitle="Preuzimanje APK fajla i kratko uputstvo za instalaciju interne aplikacije."
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-dark-100 bg-white p-6 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <Smartphone className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-dark-900">Preuzmi Android APK</h2>
              <p className="max-w-2xl text-sm text-dark-500">
                Dugme ispod preuzima posljednji interni Android build. APK se može instalirati
                direktno na telefon bez Play Store-a.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={APK_DOWNLOAD_PATH}
              download
              className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-primary transition-colors hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              Preuzmi APK
            </a>

            <a
              href={APK_DOWNLOAD_PATH}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-dark-200 px-5 py-3 text-sm font-semibold text-dark-700 transition-colors hover:bg-dark-50"
            >
              <ExternalLink className="h-4 w-4" />
              Otvori direktan link
            </a>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Napomena za instalaciju</p>
                <p>
                  Ako Android blokira instalaciju, potrebno je dozvoliti instalaciju iz
                  nepouzdanih izvora odnosno opciju <span className="font-semibold">Install unknown apps</span>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-dark-100 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold text-dark-900">Postupak instalacije</h2>
          <ol className="mt-4 space-y-3 text-sm text-dark-600">
            <li>1. Otvorite ovu stranicu na telefonu ili pošaljite link vozaču.</li>
            <li>2. Dodirnite <span className="font-semibold">Preuzmi APK</span>.</li>
            <li>3. Sačekajte da se fajl preuzme.</li>
            <li>4. Otvorite preuzeti fajl i potvrdite instalaciju.</li>
            <li>5. Nakon instalacije prijavite se svojim korisničkim podacima.</li>
          </ol>

          <div className="mt-6 rounded-2xl border border-dark-100 bg-dark-50 p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-dark-700" />
              <div className="space-y-1 text-sm text-dark-600">
                <p className="font-semibold text-dark-900">Sigurnosna preporuka</p>
                <p>
                  APK objavljujte samo iz internog build procesa i zamjenjujte fajl na istom URL-u
                  da korisnici uvijek imaju jedno mjesto za preuzimanje.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-dark-500">
            Očekivana lokacija APK fajla na serveru:
            <div className="mt-2 rounded-xl bg-dark-900 px-3 py-2 font-mono text-xs text-white">
              public/downloads/hps-transport-android.apk
            </div>
          </div>

          <div className="mt-6 text-sm text-dark-500">
            Ako želiš dodatno interno uputstvo za Traccar konfiguraciju, pogledaj:
            <div className="mt-2">
              <Link
                href="/documents"
                className="font-semibold text-primary-700 hover:text-primary-800"
              >
                Dokumentacija i interni materijali
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
