"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus2, FolderOpen, Building2 } from "lucide-react";

export default function ClientPortalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-dark-900">Klijentski portal</h1>
        <p className="text-dark-500 mt-2">
          Kreirajte kalkulaciju rute, pošaljite zahtjev i pratite status odobrenja.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/client/loads/new" className="block">
          <Card className="hover:shadow-soft-lg transition-shadow h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-dark-900">
                <FilePlus2 className="w-5 h-5" /> Nova kalkulacija
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-dark-600">
              Unesite pickup i delivery lokaciju, modele auta i pošaljite zahtjev dispečeru.
            </CardContent>
          </Card>
        </Link>

        <Link href="/client/loads" className="block">
          <Card className="hover:shadow-soft-lg transition-shadow h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-dark-900">
                <FolderOpen className="w-5 h-5" /> Moji zahtjevi
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-dark-600">
              Pregled svih poslanih zahtjeva, status odobrenja i dodijeljenih vozača.
            </CardContent>
          </Card>
        </Link>

        <Link href="/client/profile" className="block">
          <Card className="hover:shadow-soft-lg transition-shadow h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-dark-900">
                <Building2 className="w-5 h-5" /> Profil kompanije
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-dark-600">
              Ažurirajte kontakt osobe i podatke firme za bržu obradu zahtjeva.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
