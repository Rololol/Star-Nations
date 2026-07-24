import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const factions = [
  { name: "Terranische Föderation", lore: "Nachfahren der Erde, Logistik & Diplomatie.", bonuses: JSON.stringify({ trait: "Ausgewogen & Logistik" }) },
  { name: "Vectis-Kollektiv", lore: "Kybernetik und KI-Präzision.", bonuses: JSON.stringify({ trait: "KI & Mining" }) },
  { name: "Onyx-Syndikat", lore: "Piraten und Schmuggler.", bonuses: JSON.stringify({ trait: "Piraten & Handel" }) },
  { name: "Zyrion-Imperium", lore: "Biomechanische Krieger.", bonuses: JSON.stringify({ trait: "Krieger & Flottenschaden" }) },
  { name: "Eldar-Nebula-Konzil", lore: "Energetische Wesenheiten.", bonuses: JSON.stringify({ trait: "Energiewesen & Schilde" }) },
];

const PREFIXES = ["Xan","Vel","Kor","Thren","Syth","Zar","Ny","Or","Quel","Bal","Drae","Zy","Pha","Xy","Ul","Gra","Myr","Sol","Ven","Tor","Jha","Kry","Vor","Zen","Ae","Cyn","Dae","Ery","Fex","Gol"];
const MIDDLES  = ["dra","mor","rig","val","hex","lun","ast","vor","ith","ann","el","oz","eq","yrn","oth","ar","en","il","on","ur","ae","ix","ol","um","ys"];
const SUFFIXES = ["ath","oor","an","ale","era","os","ux","ion","yr","eth","eal","en","ai","une","is","ar","on","us","ae","ix"];
const MODIFIERS = ["Prime","Major","Minor","IX","VII","Alpha","Nexus","Beta","Gamma"];

function generateName(used: Set<string>): string {
  for (let a = 0; a < 5000; a++) {
    const p = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const m = MIDDLES[Math.floor(Math.random() * MIDDLES.length)];
    const s = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    let n: string; const v = Math.random();
    if (v < .25) n = p + m; else if (v < .55) n = p + m + s; else if (v < .75) n = m.charAt(0).toUpperCase() + m.slice(1) + s; else n = p + s;
    if (Math.random() < .15) n += " " + MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    if (!used.has(n) && n.length >= 4) { used.add(n); return n; }
  }
  return "Unknown-" + Date.now().toString(36);
}

function randomResources() { return JSON.stringify({ minerals: Math.floor(Math.random() * 200) + 50, energy: Math.floor(Math.random() * 200) + 50 }); }

// ══════════════════════════════════════════════════
// 250 planets, distributed across 5 sectors with polar coords
// ══════════════════════════════════════════════════
const SECTOR_ANGLE = (2 * Math.PI) / 5;
const RING_RADII_SEED = [0, 60, 160, 280, 420, 520]; // 5 ring distances
const PLANETS_PER_RING = [8, 14, 14, 10, 4]; // planets per sector per ring

async function main() {
  console.log("🌌 Seeding Star Nations …\n");
  for (const f of factions) await prisma.faction.upsert({ where: { name: f.name }, update: {}, create: f });
  console.log("   ✅ 5 factions\n");

  // Seed building types
  const buildingTypes = [
    { id: "titan_mine", name: "Titan-Mine", description: "Baut Titan-Erz ab", category: "EXTRACTION", baseBuildCost: JSON.stringify({ credits: 500, titan_erz: 50 }), baseBuildTime: 30, baseMaintenance: JSON.stringify({ credits: 20, energy: 30 }), baseInput: JSON.stringify({ energy: 30 }), baseOutput: JSON.stringify({ titan_erz: 50 }), icon: "Pickaxe" },
    { id: "deuterium_rig", name: "Deuterium-Bohrinsel", description: "Fördert Deuterium aus Gasriesen", category: "EXTRACTION", baseBuildCost: JSON.stringify({ credits: 500, deuterium: 50 }), baseBuildTime: 30, baseMaintenance: JSON.stringify({ credits: 20, energy: 30 }), baseInput: JSON.stringify({ energy: 30 }), baseOutput: JSON.stringify({ deuterium: 50 }), icon: "Drill" },
    { id: "rare_earth_mine", name: "Seltenerd-Mine", description: "Gewinnt Seltene Erden", category: "EXTRACTION", baseBuildCost: JSON.stringify({ credits: 600, seltene_erden: 30 }), baseBuildTime: 40, baseMaintenance: JSON.stringify({ credits: 25, energy: 25 }), baseInput: JSON.stringify({ energy: 25 }), baseOutput: JSON.stringify({ seltene_erden: 40 }), icon: "Gem" },
    { id: "titan_smelter", name: "Titan-Schmelze", description: "Verhüttet Erz zu Legierungen", category: "REFINING", baseBuildCost: JSON.stringify({ credits: 800, titan_erz: 100 }), baseBuildTime: 45, baseMaintenance: JSON.stringify({ credits: 40, energy: 60 }), baseInput: JSON.stringify({ titan_erz: 80, energy: 40 }), baseOutput: JSON.stringify({ titan_legierung: 30 }), icon: "Hammer" },
    { id: "deuterium_refinery", name: "Deuterium-Raffinerie", description: "Raffiniert Deuterium zu Zellen", category: "REFINING", baseBuildCost: JSON.stringify({ credits: 800, deuterium: 100 }), baseBuildTime: 45, baseMaintenance: JSON.stringify({ credits: 40, energy: 60 }), baseInput: JSON.stringify({ deuterium: 60, energy: 40 }), baseOutput: JSON.stringify({ deuterium_zellen: 25 }), icon: "Zap" },
    { id: "chip_fab", name: "Mikroprozessor-Fabrik", description: "Fertigt Chips aus Seltenen Erden", category: "REFINING", baseBuildCost: JSON.stringify({ credits: 900, seltene_erden: 80 }), baseBuildTime: 50, baseMaintenance: JSON.stringify({ credits: 45, energy: 50 }), baseInput: JSON.stringify({ seltene_erden: 50, energy: 30 }), baseOutput: JSON.stringify({ mikro_prozessoren: 20 }), icon: "Cpu" },
    { id: "quantum_lab", name: "Quanten-Labor", description: "Forscht an Quanten-Kernen", category: "HIGH_TECH", baseBuildCost: JSON.stringify({ credits: 2000, titan_legierung: 50, mikro_prozessoren: 40 }), baseBuildTime: 120, baseMaintenance: JSON.stringify({ credits: 100, energy: 120 }), baseInput: JSON.stringify({ titan_legierung: 25, mikro_prozessoren: 20, energy: 80 }), baseOutput: JSON.stringify({ quanten_kerne: 10 }), icon: "Atom" },
    { id: "orbital_shipyard", name: "Orbital-Werft", description: "Baut Schiffshüllen-Segmente", category: "HIGH_TECH", baseBuildCost: JSON.stringify({ credits: 2500, titan_legierung: 80, quanten_kerne: 10 }), baseBuildTime: 150, baseMaintenance: JSON.stringify({ credits: 120, energy: 150 }), baseInput: JSON.stringify({ titan_legierung: 50, quanten_kerne: 5, energy: 100 }), baseOutput: JSON.stringify({ schiffshuellen: 12 }), icon: "Rocket" },
    { id: "plasma_forge", name: "Plasma-Schmiede", description: "Produziert Plasma-Waffen", category: "HIGH_TECH", baseBuildCost: JSON.stringify({ credits: 3000, titan_legierung: 100, quanten_kerne: 15 }), baseBuildTime: 180, baseMaintenance: JSON.stringify({ credits: 150, energy: 200 }), baseInput: JSON.stringify({ titan_legierung: 40, quanten_kerne: 8, energy: 150 }), baseOutput: JSON.stringify({ plasma_waffen: 6 }), icon: "Flame" },
    { id: "fusion_plant", name: "Fusionskraftwerk", description: "Erzeugt Energie aus Deuterium", category: "ENERGY", baseBuildCost: JSON.stringify({ credits: 600, deuterium: 80 }), baseBuildTime: 40, baseMaintenance: JSON.stringify({ credits: 15 }), baseInput: JSON.stringify({ deuterium: 30 }), baseOutput: JSON.stringify({ energy: 200 }), icon: "BatteryFull" },
  ];
  for (const bt of buildingTypes) await prisma.buildingType.upsert({ where: { id: bt.id }, update: {}, create: bt });
  console.log("   ✅ 10 building types\n");

  const TOTAL = 250;
  console.log(`📛 Generating ${TOTAL} unique planet names …`);
  const used = new Set<string>();
  const names: string[] = [];
  for (let i = 0; i < TOTAL; i++) names.push(generateName(used));
  console.log(`   ✅ ${names.length} names\n`);

  console.log(`⭐ Creating ${TOTAL} star systems …`);

  let nameIdx = 0, starId = 1;
  const planetData: { id: number; name: string; sector: number; ring: number; angleOffset: number; ownerFactionId: number | null }[] = [];

  for (let sector = 0; sector < 5; sector++) {
    const fid = sector + 1;
    const sectorStart = sector * SECTOR_ANGLE;
    const sectorMid = sectorStart + SECTOR_ANGLE / 2;

    for (let ring = 0; ring < 5; ring++) {
      const ringNum = ring + 1;
      const count = PLANETS_PER_RING[ring];
      const vSpread = SECTOR_ANGLE * 0.75; // planets spread across 75% of sector width

      for (let p = 0; p < count; p++) {
        const baseAngle = sectorMid + (p / count - 0.5) * vSpread;
        const jitter = (Math.random() - 0.5) * (vSpread / count) * 0.5;
        const angle = baseAngle + jitter;
        // All planets start neutral — faction assignment happens after distribution
        planetData.push({
          id: starId, name: names[nameIdx],
          sector: fid, ring: ringNum,
          angleOffset: Math.round(angle * 1000) / 1000,
          ownerFactionId: null,
        });
        starId++; nameIdx++;
      }
    }
  }

  // Fill to exactly 250
  while (planetData.length < TOTAL) {
    const last = planetData[planetData.length - 1];
    const r = { id: starId, name: generateName(used), sector: last.sector, ring: last.ring, angleOffset: last.angleOffset + (Math.random() - .5) * 0.08, ownerFactionId: null };
    planetData.push(r); starId++; nameIdx++;
  }
  planetData.splice(TOTAL);

  // Pick 5 faction home worlds: one per cardinal direction
  const factionHomes: number[] = [];
  // Target angles: North, Northeast, East, South, West (in degrees)
  const targetAngles = [270, 0, 90, 180, 45]; // N, E, S, W, NE
  const ANGLE_TOLERANCE = 30; // ±30° around target
  const MIN_HOME_DIST = 100;

  function ringPos(p: { ring: number; angleOffset: number }) {
    const r = RING_RADII_SEED[p.ring] || 300;
    return { x: r * Math.cos(p.angleOffset), y: r * Math.sin(p.angleOffset) };
  }

  for (let f = 0; f < 5; f++) {
    const targetAngleRad = targetAngles[f] * Math.PI / 180;
    // Filter planets within angular tolerance of target
    const candidates = planetData
      .map((p, i) => ({ i, p }))
      .filter(({ p }) => {
        if (p.ring <= 1) return false;
        let diff = Math.abs(p.angleOffset - targetAngleRad);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        return diff < ANGLE_TOLERANCE * Math.PI / 180;
      });
    // Try to find one not too close to already placed homes
    let placed = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const { i } = candidates[idx] || candidates[0];
      if (i == null) break;
      const cp = ringPos(planetData[i]);
      let tooClose = false;
      for (const hid of factionHomes) {
        const hp = ringPos(planetData[hid]);
        if (Math.hypot(cp.x - hp.x, cp.y - hp.y) < MIN_HOME_DIST) { tooClose = true; break; }
      }
      if (!tooClose) { factionHomes.push(i); placed = true; break; }
    }
    if (!placed && candidates.length > 0) {
      factionHomes.push(candidates[0].i);
    }
  }
  for (let f = 0; f < factionHomes.length; f++) {
    planetData[factionHomes[f]].ownerFactionId = f + 1;
  }
  console.log(`   🏠 Home worlds: ${factionHomes.map(i => { const p = planetData[i]; return `F${p.ownerFactionId}@${Math.round(p.angleOffset*180/Math.PI)}°r${p.ring}`; }).join(", ")}`);

  for (const p of planetData) {
    await prisma.star.upsert({
      where: { id: p.id },
      update: { name: p.name, sector: p.sector, ring: p.ring, angleOffset: p.angleOffset, ownerFactionId: p.ownerFactionId, resources: randomResources() },
      create: { id: p.id, name: p.name, sector: p.sector, ring: p.ring, angleOffset: p.angleOffset, ownerFactionId: p.ownerFactionId, resources: randomResources() },
    });
  }
  console.log(`   ✅ ${planetData.length} stars\n`);

  const [fc, sc, oc] = await Promise.all([prisma.faction.count(), prisma.star.count(), prisma.star.count({ where: { ownerFactionId: { not: null } } })]);
  console.log(`🌠 Factions:${fc} Stars:${sc} Owned:${oc} Neutral:${sc - oc}\n`);
}

main().catch(e => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
