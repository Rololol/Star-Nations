export interface BuildingTypeData {
  id: string; name: string; description: string; category: string;
  baseBuildCost: Record<string, number>; baseBuildTime: number;
  baseMaintenance: Record<string, number>;
  baseInput: Record<string, number>;
  baseOutput: Record<string, number>;
  icon: string;
}

export function calcLevelCost(base: Record<string, number>, level: number): Record<string, number> {
  const scale = Math.pow(1.8, level - 1);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(base)) out[k] = Math.round(v * scale);
  return out;
}

export function calcLevelRate(base: Record<string, number>, level: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(base)) out[k] = v * level;
  return out;
}

export function calcBuildTime(baseTime: number, level: number): number {
  return Math.round(baseTime * Math.pow(1.8, level - 1));
}

export const RESOURCE_LABELS: Record<string, string> = {
  credits: "Credits", energy: "Energie",
  titan_erz: "Titan-Erz", deuterium: "Deuterium", seltene_erden: "Seltene Erden",
  titan_legierung: "Titan-Legierung", deuterium_zellen: "Deuterium-Zellen", mikro_prozessoren: "Mikro-Prozessoren",
  quanten_kerne: "Quanten-Kerne", schiffshuellen: "Schiffshüllen", plasma_waffen: "Plasma-Waffen",
};
