export const COSTS = {
  CLAIM_STAR: { credits: 200, minerals: 0, energy: 0 },
  BUILD_SHIP: { credits: 25, minerals: 50, energy: 25 },
};

export const RING_RADII = [0, 50, 140, 240, 360, 500];
export const GALAXY_CX = 500;
export const GALAXY_CY = 500;

export const BASE_SPEED = 60; // units per minute across the map
export const RESOURCE_INTERVAL_MS = 60 * 1000; // how often we accrue (every minute)

function polarToXY(ring: number, angleOffset: number) {
  const r = RING_RADII[ring] || 0;
  return {
    x: GALAXY_CX + r * Math.cos(angleOffset),
    y: GALAXY_CY + r * Math.sin(angleOffset),
  };
}

export function distanceBetween(
  a: { ring?: number; angleOffset?: number; sector?: number },
  b: { ring?: number; angleOffset?: number; sector?: number }
) {
  const pa = polarToXY(a.ring ?? 1, a.angleOffset ?? 0);
  const pb = polarToXY(b.ring ?? 1, b.angleOffset ?? 0);
  return Math.sqrt((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2);
}

export function travelTimeSeconds(
  from: { ring?: number; angleOffset?: number; sector?: number },
  to: { ring?: number; angleOffset?: number; sector?: number },
  factionSpeedBonus = 0
) {
  const dist = distanceBetween(from, to);
  const speed = BASE_SPEED * (1 + factionSpeedBonus);
  return Math.ceil((dist / speed) * 60); // seconds
}

export function resourceIncomePerMinute(
  starResources: { minerals: number; energy: number },
  factionBonus = 0
) {
  const baseMinerals = starResources.minerals / 10; // 10% of deposit per minute
  const baseEnergy = starResources.energy / 10;
  const mult = 1 + factionBonus;
  return {
    minerals: Math.round(baseMinerals * mult * 10) / 10,
    energy: Math.round(baseEnergy * mult * 10) / 10,
  };
}
