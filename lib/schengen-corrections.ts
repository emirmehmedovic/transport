import { prisma } from "./prisma";
export type SchengenDayCorrection = { date: string; inSchengen: boolean; note: string; updatedAt: string };
export async function getSchengenDayCorrections(driverId: string): Promise<SchengenDayCorrection[]> {
  const row = await prisma.setting.findUnique({ where: { key: `schengen_day_corrections:${driverId}` } });
  if (!row) return [];
  return JSON.parse(row.value) as SchengenDayCorrection[];
}
