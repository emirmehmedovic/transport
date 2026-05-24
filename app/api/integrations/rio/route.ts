import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { getRioNightlyStatus, saveRioNightlyStatus } from "@/lib/rio-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function requireDispatcherOrAdmin(request: NextRequest) {
  const user = await getVerifiedAuthUserFromRequest(request);
  if (!user) {
    return { error: noStoreJson({ error: "Neautorizovan pristup" }, { status: 401 }) };
  }

  if (user.role !== "ADMIN" && user.role !== "DISPATCHER") {
    return { error: noStoreJson({ error: "Nemate dozvolu za pristup" }, { status: 403 }) };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDispatcherOrAdmin(request);
    if ("error" in auth) return auth.error;

    const status = await getRioNightlyStatus();

    return noStoreJson({
      isAdmin: auth.user.role === "ADMIN",
      status,
    });
  } catch (error: any) {
    console.error("Error loading RIO integration status:", error);
    return noStoreJson(
      { error: error.message || "Greška pri učitavanju RIO statusa" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDispatcherOrAdmin(request);
    if ("error" in auth) return auth.error;

    if (auth.user.role !== "ADMIN") {
      return noStoreJson({ error: "Samo admin može mijenjati RIO postavke" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "save-config") {
      const nextStatus = await saveRioNightlyStatus({
        enabled: body.enabled === true,
      });

      return noStoreJson({
        success: true,
        status: nextStatus,
      });
    }

    return noStoreJson({ error: "Nepoznata akcija" }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating RIO integration status:", error);
    return noStoreJson(
      { error: error.message || "Greška pri spremanju RIO statusa" },
      { status: 500 }
    );
  }
}
