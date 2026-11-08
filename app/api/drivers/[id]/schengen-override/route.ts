import { toDayKeyInTimeZone } from "@/lib/schengen-dates";
import type { SchengenDayCorrection } from "@/lib/schengen-corrections";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

// POST /api/drivers/[id]/schengen-override
// Body: { remainingDays: number | null, asOf?: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const body = await req.json();
    const date = body?.date;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date || date > toDayKeyInTimeZone(new Date())) {
      return NextResponse.json({ error: "Odaberite važeći datum boravka (ne budući). Brojčani saldi više se ne koriste." }, { status: 400 });
    }
    if (body.inSchengen !== null && typeof body.inSchengen !== "boolean") return NextResponse.json({ error: "Odaberite da li je vozač bio u Schengenu." }, { status: 400 });
    const driver = await prisma.driver.findUnique({ where: { id }, select: { id: true } });
    if (!driver) return NextResponse.json({ error: "Vozač nije pronađen" }, { status: 404 });
    const key = `schengen_day_corrections:${id}`;
    await prisma.$transaction(async tx => {
      // Lock per driver so simultaneous edits cannot overwrite another date.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
      const row = await tx.setting.findUnique({ where: { key } });
      const existing = row ? JSON.parse(row.value) as SchengenDayCorrection[] : [];
      const next = existing.filter(c => c.date !== date);
      if (body.inSchengen !== null) next.push({ date, inSchengen: body.inSchengen, note: typeof body.note === "string" ? body.note.slice(0, 1000) : "Ručna provjera", updatedAt: new Date().toISOString() });
      await tx.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(next) }, update: { value: JSON.stringify(next) } });
      await tx.auditLog.create({ data: { entity: "DRIVER", entityId: id, action: "UPDATE", userId: decoded.userId, changes: { type: "SCHENGEN_DAY_CORRECTION", date, inSchengen: body.inSchengen, previous: existing.find(c => c.date === date) ?? null } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Schengen override error:", error);
    return NextResponse.json(
      { error: error?.message || "Greška pri spremanju" },
      { status: 500 }
    );
  }
}
