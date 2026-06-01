import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import {
  buildVolvoRfmsOverview,
  getVolvoRfmsConfig,
  saveVolvoRfmsConfig,
  syncVolvoRfmsPositions,
  VOLVO_BACKFILL_CHUNKS,
} from "@/lib/volvo-rfms-sync";

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

    const [config, overview] = await Promise.all([
      getVolvoRfmsConfig(),
      buildVolvoRfmsOverview(),
    ]);

    return noStoreJson({
      isAdmin: auth.user.role === "ADMIN",
      config,
      overview,
    });
  } catch (error: any) {
    console.error("Error loading Volvo integration overview:", error);
    return noStoreJson(
      { error: error.message || "Greška pri učitavanju Volvo integracije" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDispatcherOrAdmin(request);
    if ("error" in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "save-config") {
      const nextConfig = await saveVolvoRfmsConfig({
        enabled: body.enabled === true,
        primaryTracking: body.primaryTracking === true,
        initialLookbackHours:
          typeof body.initialLookbackHours === "number"
            ? body.initialLookbackHours
            : undefined,
        driverSources:
          body.driverSources && typeof body.driverSources === "object"
            ? body.driverSources
            : undefined,
      });

      return noStoreJson({
        success: true,
        config: nextConfig,
      });
    }

    if (action === "sync-now") {
      const config = await getVolvoRfmsConfig();
      const persistPositions = body.persistPositions === true || config.primaryTracking === true;

      const result = await syncVolvoRfmsPositions({
        persistPositions,
        forceLookbackHours:
          typeof body.forceLookbackHours === "number" ? body.forceLookbackHours : null,
      });

      return noStoreJson({
        success: true,
        result,
      });
    }

    if (action === "backfill-chunk") {
      if (auth.user.role !== "ADMIN") {
        return noStoreJson({ error: "Samo admin može pokrenuti Volvo backfill" }, { status: 403 });
      }

      const config = await getVolvoRfmsConfig();
      const chunkKey = String(body.chunkKey || "");
      const chunk = VOLVO_BACKFILL_CHUNKS.find((item) => item.key === chunkKey);
      if (!chunk) {
        return noStoreJson({ error: "Nepoznat Volvo backfill chunk" }, { status: 400 });
      }

      const explicitStarttime = new Date(
        Date.now() - chunk.startDaysAgo * 24 * 60 * 60 * 1000
      ).toISOString();
      const explicitStoptime = new Date(
        Date.now() - chunk.stopDaysAgo * 24 * 60 * 60 * 1000
      ).toISOString();

      const result = await syncVolvoRfmsPositions({
        persistPositions: true,
        explicitStarttime,
        explicitStoptime,
        updateCursor: false,
        allowAllMatchedDrivers: true,
      });

      const nextCompleted = [...new Set([...config.backfillChunksCompleted, chunk.key])];
      const nextConfig = await saveVolvoRfmsConfig({
        backfillChunksCompleted: nextCompleted,
        backfill14dCompletedAt:
          nextCompleted.length === VOLVO_BACKFILL_CHUNKS.length
            ? new Date().toISOString()
            : config.backfill14dCompletedAt,
      });

      return noStoreJson({
        success: true,
        chunkKey: chunk.key,
        config: nextConfig,
        result,
      });
    }

    if (action === "fill-gaps-24h") {
      const now = new Date();
      const explicitStoptime = now.toISOString();
      const explicitStarttime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const result = await syncVolvoRfmsPositions({
        persistPositions: true,
        explicitStarttime,
        explicitStoptime,
        updateCursor: false,
        allowAllMatchedDrivers: true,
      });

      return noStoreJson({
        success: true,
        result,
      });
    }

    return noStoreJson({ error: "Nepoznata akcija" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in Volvo integration action:", error);
    return noStoreJson(
      { error: error.message || "Greška pri obradi Volvo integracije" },
      { status: 500 }
    );
  }
}
