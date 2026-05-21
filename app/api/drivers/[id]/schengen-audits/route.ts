import { AuditAction, AuditEntity, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoredSchengenAudit = {
  type: "SCHENGEN_AUDIT";
  provider: "VOLVO" | "RIO";
  sourceFileName: string | null;
  selectedUntilDate: string;
  auditWindow: { from: string; to: string };
  note: string | null;
  baselineApplied: boolean;
  suggestedManualBaseline: { asOf: string; remainingDays: number } | null;
  verdict: {
    status: "OK" | "MINOR_MISMATCH" | "NEEDS_REVIEW";
    label: string;
    description: string;
  };
  oem: Record<string, unknown>;
  internal: Record<string, unknown>;
  comparison: Record<string, unknown>;
  dayComparison: Record<string, unknown>;
  crossingComparison: Record<string, unknown>;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    if (
      decoded.role !== "ADMIN" &&
      decoded.role !== "DISPATCHER" &&
      !(decoded.role === "DRIVER" && decoded.driverId === params.id)
    ) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") || "10"), 1), 50);

    const logs = await prisma.auditLog.findMany({
      where: {
        entity: AuditEntity.DRIVER,
        entityId: params.id,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const audits = logs
      .map((log) => {
        const changes =
          log.changes && typeof log.changes === "object" && !Array.isArray(log.changes)
            ? (log.changes as Prisma.JsonObject)
            : null;
        if (!changes || changes.type !== "SCHENGEN_AUDIT") return null;

        return {
          id: log.id,
          createdAt: log.createdAt.toISOString(),
          createdBy: {
            name: `${log.user.firstName} ${log.user.lastName}`,
            email: log.user.email,
          },
          action: log.action,
          ...changes,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .slice(0, limit);

    return NextResponse.json({ audits });
  } catch (error: any) {
    console.error("Schengen audit history fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Greška pri učitavanju audit history-ja" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const body = await req.json();
    const provider = body?.provider;
    const selectedUntilDate = body?.selectedUntilDate;
    const auditWindow = body?.auditWindow;
    const verdict = body?.verdict;
    const note = typeof body?.note === "string" ? body.note.trim() || null : null;
    const applyBaseline = Boolean(body?.applyBaseline);
    const suggestedManualBaseline = body?.suggestedManualBaseline ?? null;

    if ((provider !== "VOLVO" && provider !== "RIO") || typeof selectedUntilDate !== "string") {
      return NextResponse.json({ error: "Neispravni audit podaci" }, { status: 400 });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!driver) {
      return NextResponse.json({ error: "Vozač nije pronađen" }, { status: 404 });
    }

    const changes: StoredSchengenAudit = {
      type: "SCHENGEN_AUDIT",
      provider,
      sourceFileName: typeof body?.sourceFileName === "string" ? body.sourceFileName : null,
      selectedUntilDate,
      auditWindow:
        auditWindow &&
        typeof auditWindow.from === "string" &&
        typeof auditWindow.to === "string"
          ? { from: auditWindow.from, to: auditWindow.to }
          : { from: selectedUntilDate, to: selectedUntilDate },
      note,
      baselineApplied: applyBaseline,
      suggestedManualBaseline:
        suggestedManualBaseline &&
        typeof suggestedManualBaseline.asOf === "string" &&
        typeof suggestedManualBaseline.remainingDays === "number"
          ? {
              asOf: suggestedManualBaseline.asOf,
              remainingDays: suggestedManualBaseline.remainingDays,
            }
          : null,
      verdict,
      oem: body?.oem ?? {},
      internal: body?.internal ?? {},
      comparison: body?.comparison ?? {},
      dayComparison: body?.dayComparison ?? {},
      crossingComparison: body?.crossingComparison ?? {},
    };

    const actor = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const result = await prisma.$transaction(async (tx) => {
      if (applyBaseline && changes.suggestedManualBaseline) {
        await tx.driver.update({
          where: { id: params.id },
          data: {
            schengenManualRemainingDays: Math.round(changes.suggestedManualBaseline.remainingDays),
            schengenManualAsOf: new Date(changes.suggestedManualBaseline.asOf),
          },
        });
      }

      return tx.auditLog.create({
        data: {
          userId: decoded.userId,
          action: AuditAction.UPDATE,
          entity: AuditEntity.DRIVER,
          entityId: params.id,
          changes: changes as Prisma.InputJsonValue,
          ipAddress:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            null,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      audit: {
        id: result.id,
        createdAt: result.createdAt.toISOString(),
        createdBy: {
          name: actor ? `${actor.firstName} ${actor.lastName}` : decoded.email,
          email: actor?.email || decoded.email,
        },
        ...changes,
      },
    });
  } catch (error: any) {
    console.error("Schengen audit save error:", error);
    return NextResponse.json(
      { error: error?.message || "Greška pri spremanju audita" },
      { status: 500 }
    );
  }
}
