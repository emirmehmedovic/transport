import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { generateDriverBorderCrossingPDFBuffer } from "@/lib/pdfGenerator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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

    const body = await req.json();
    const pdfBuffer = await generateDriverBorderCrossingPDFBuffer({
      driverName: body.driverName || "Vozac",
      generatedAt: new Date(),
      windowFrom: body.borderWindowFrom ? new Date(body.borderWindowFrom) : null,
      schengenFrom: new Date(body.from),
      schengenTo: new Date(body.to),
      usedDays: Number(body.usedDays || 0),
      remainingDays: Number(body.remainingDays || 0),
      borderCrossings: Array.isArray(body.borderCrossings)
        ? body.borderCrossings.map((crossing: any) => ({
            type: crossing.type,
            recordedAt: new Date(crossing.recordedAt),
            latitude:
              crossing.latitude === null || crossing.latitude === undefined
                ? null
                : Number(crossing.latitude),
            longitude:
              crossing.longitude === null || crossing.longitude === undefined
                ? null
                : Number(crossing.longitude),
            nearestBorderCrossing: crossing.nearestBorderCrossing
              ? {
                  name: String(crossing.nearestBorderCrossing.name || ""),
                  distanceMeters:
                    crossing.nearestBorderCrossing.distanceMeters === null ||
                    crossing.nearestBorderCrossing.distanceMeters === undefined
                      ? null
                      : Number(crossing.nearestBorderCrossing.distanceMeters),
                }
              : null,
          }))
        : [],
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="border-crossings-${params.id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Border crossing PDF export error:", error);
    return NextResponse.json(
      { error: error.message || "Greška pri generisanju PDF izvještaja" },
      { status: 500 }
    );
  }
}
