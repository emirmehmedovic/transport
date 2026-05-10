import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { fetchOsrmRoutes } from "@/lib/routing/osrm";

// POST /api/routing/osrm
// Body: { coordinates: [{ lat, lng }], alternatives?: boolean }
export async function POST(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const body = await req.json();
    const coordinates = Array.isArray(body?.coordinates) ? body.coordinates : [];
    const alternatives = body?.alternatives !== false;

    if (coordinates.length < 2) {
      return NextResponse.json(
        { error: "Potrebne su najmanje dvije koordinate" },
        { status: 400 }
      );
    }

    const routes = await fetchOsrmRoutes(
      coordinates.map((c: any) => ({
        lat: Number(c.lat),
        lng: Number(c.lng),
      })),
      { alternatives }
    );

    return NextResponse.json({ routes });
  } catch (error: any) {
    console.error("OSRM route error:", error);
    return NextResponse.json(
      { error: "Greška pri računanju rute" },
      { status: 500 }
    );
  }
}
