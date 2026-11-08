import type { getSchengenFreshness, entryToday } from "@/lib/schengen-freshness";
export type SchengenDataInfo = {
  freshness?: Awaited<ReturnType<typeof getSchengenFreshness>>;
  entryToday?: ReturnType<typeof entryToday>;
};
export function SchengenDataStatus({ freshness, entryToday }: SchengenDataInfo) {
  if (!freshness) return null;
  return <div className="mt-2 space-y-1 text-xs text-slate-600">
    <p>{freshness.source === "nightly" ? "Noćni izvještaj" : "Pozicije / live"} · {freshness.lastPositionAt ? new Date(freshness.lastPositionAt).toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo" }) : "Nema pozicija"}</p>
    <p className={freshness.stale ? "font-semibold text-amber-800" : ""}>{freshness.note}</p>
    {freshness.uncertainTransition && <p className="text-amber-800">Prelazak između pozicija obuhvata ponoć; provjerite datum.</p>}
    {freshness.assumedStillInside && <p>Nastavak boravka danas nije potvrđen.</p>}
    {entryToday && <p>Ako danas boravi (po dostupnim podacima): {entryToday.usedDaysIncludingToday}/90; poslije danas ostaje {entryToday.remainingAfterToday}. {!entryToday.withinLimit && "Prekoračenje limita."}</p>}
  </div>;
}
