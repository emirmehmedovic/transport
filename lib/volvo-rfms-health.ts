import { prisma } from "./prisma";
import { sendIntegrationAlertOnce, formatAlertTime } from "./integration-alerts";

export const VOLVO_HEALTH_STATE_KEY = "volvo_rfms_api_health_v2";
const FAILURE_DURATION_MS = 30 * 60_000;
const RECOVERY_DURATION_MS = 10 * 60_000;
const MAX_SAMPLE_GAP_MS = 15 * 60_000;

export type VolvoApiHealthState = {
  lastAttemptStartedAt: string | null;
  lastSuccessAt: string | null;
  failureSince: string | null;
  failures: number;
  recoverySince: string | null;
  successes: number;
  incidentId: string | null;
  incidentStartedAt: string | null;
  lastError: string | null;
};
export const INITIAL_VOLVO_HEALTH: VolvoApiHealthState = {
  lastAttemptStartedAt: null, lastSuccessAt: null, failureSince: null, failures: 0,
  recoverySince: null, successes: 0, incidentId: null, incidentStartedAt: null, lastError: null,
};

/** One observation per scheduled API fetch, not per vehicle/page/retry/database write. */
export function advanceVolvoHealth(previous: VolvoApiHealthState, observation: { startedAt: Date; finishedAt: Date; ok: boolean; error?: string }): VolvoApiHealthState {
  const { startedAt, finishedAt, ok } = observation;
  if (previous.lastAttemptStartedAt && +startedAt <= Date.parse(previous.lastAttemptStartedAt)) return previous;
  const gap = previous.lastAttemptStartedAt ? +startedAt - Date.parse(previous.lastAttemptStartedAt) : Infinity;
  const state = { ...previous, lastAttemptStartedAt: startedAt.toISOString() };
  if (ok) {
    state.lastSuccessAt = finishedAt.toISOString();
    state.failureSince = null;
    state.failures = 0;
    state.lastError = null;
    if (state.incidentId) {
      if (!state.recoverySince || gap > MAX_SAMPLE_GAP_MS) {
        state.recoverySince = finishedAt.toISOString();
        state.successes = 0;
      }
      state.successes += 1;
      if (state.successes >= 3 && +finishedAt - Date.parse(state.recoverySince) >= RECOVERY_DURATION_MS) {
        state.incidentId = null;
        state.incidentStartedAt = null;
        state.recoverySince = null;
        state.successes = 0;
      }
    }
  } else {
    if (!state.failureSince || gap > MAX_SAMPLE_GAP_MS) {
      state.failureSince = startedAt.toISOString();
      state.failures = 0;
    }
    state.failures += 1;
    state.recoverySince = null;
    state.successes = 0;
    state.lastError = observation.error ?? "Neuspješan API zahtjev";
    if (!state.incidentId && state.failures >= 6 && +finishedAt - Date.parse(state.failureSince) >= FAILURE_DURATION_MS) {
      state.incidentId = state.failureSince;
      state.incidentStartedAt = state.failureSince;
    }
  }
  return state;
}

export function describeVolvoFailure(error: unknown): string {
  // Do not include remote response bodies or credentials in alert messages.
  const message = error instanceof Error ? error.message : "";
  const status = /Volvo rFMS (\d{3})\b/.exec(message)?.[1];
  if (status === "401" || status === "403") return `Pristup Volvo API-ju odbijen (HTTP ${status}).`;
  if (status === "429") return "Volvo API ograničava broj zahtjeva (HTTP 429).";
  if (status) return `Volvo API vraća HTTP ${status}.`;
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) return "Volvo API ne odgovara unutar vremenskog ograničenja.";
  if (message.includes("credentials")) return "Volvo API pristupni podaci nisu podešeni.";
  if (error instanceof SyntaxError || message.includes("response format")) return "Volvo API je vratio neispravan odgovor.";
  return "Preuzimanje s Volvo API-ja nije uspjelo (mreža ili servis).";
}

export async function recordVolvoApiOutcome(observation: Parameters<typeof advanceVolvoHealth>[1]) {
  const state = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${VOLVO_HEALTH_STATE_KEY}))`;
    const row = await tx.setting.findUnique({ where: { key: VOLVO_HEALTH_STATE_KEY } });
    const previous = row ? { ...INITIAL_VOLVO_HEALTH, ...JSON.parse(row.value) } as VolvoApiHealthState : INITIAL_VOLVO_HEALTH;
    const next = advanceVolvoHealth(previous, observation);
    await tx.setting.upsert({ where: { key: VOLVO_HEALTH_STATE_KEY }, create: { key: VOLVO_HEALTH_STATE_KEY, value: JSON.stringify(next) }, update: { value: JSON.stringify(next) } });
    return next;
  });
  // An isolated successful call during recovery does not create another incident.
  if (!observation.ok && state.incidentId) {
    await sendIntegrationAlertOnce(`volvo:${state.incidentId}`, "Volvo API: potvrđen problem preuzimanja podataka", [
      `Početak problema: ${formatAlertTime(state.incidentStartedAt)}`,
      `Posljednji uspješan API odgovor: ${formatAlertTime(state.lastSuccessAt)}`,
      `Uzastopni neuspjesi: ${state.failures}`,
      `Razlog: ${state.lastError}`,
      "Problem traje najmanje 30 minuta. Ovo je jedan mail za ovaj incident; neće se ponavljati dok se veza stabilno ne oporavi.",
      "Starost pozicije i dani odmora nisu razlog za ovaj alarm.",
    ].join("\n"));
  }
}

export async function observeVolvoApiFetch<T>(fetchPositions: () => Promise<T>): Promise<T> {
  const startedAt = new Date();
  let result: T;
  try {
    result = await fetchPositions();
  } catch (error) {
    try { await recordVolvoApiOutcome({ startedAt, finishedAt: new Date(), ok: false, error: describeVolvoFailure(error) }); }
    catch (healthError) { console.error("[Volvo health] Could not record/send incident", healthError); }
    throw error;
  }
  try { await recordVolvoApiOutcome({ startedAt, finishedAt: new Date(), ok: true }); }
  catch (error) { console.error("[Volvo health] Could not record recovery", error); }
  return result;
}
