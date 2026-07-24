"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ZoomIn, ZoomOut, Maximize, Crosshair, Navigation, GitBranch, Eye, MapPin } from "lucide-react";
import { Delaunay } from "d3-delaunay";

export interface StarData {
  id: number; name: string; sector: number; ring: number;
  angleOffset: number; resources: string;
  ownerFactionId: number | null; controllerId: number | null;
  ownerFaction: { id: number; name: string } | null;
}
interface GalaxyMapProps {
  stars: StarData[]; selectedStarId: number | null;
  onSelectStar: (id: number) => void; movingFleetId?: number | null;
}

const CX = 500; const CY = 500; const MAX_RADIUS = 440;
const WORLD_W = 1000; const WORLD_H = 1000;
const DRAG_THRESHOLD = 4;

const FCOLORS: Record<number, string> = { 1:"#3B82F6",2:"#10B981",3:"#8B5CF6",4:"#EF4444",5:"#F59E0B" };
const FSHORT: Record<number, string> = { 1:"Terraner",2:"Vectis",3:"Onyx",4:"Zyrion",5:"Eldar" };

function mulberry32(s: number) { return function () { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gaussianRng(rng: () => number): number {
  const u1 = rng(); const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

interface StarPos { x: number; y: number; armIndex: number; }

function generateSpiralPositions(count: number, seed: number): StarPos[] {
  const rng = mulberry32(seed);
  const positions: StarPos[] = [];
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const rr = MAX_RADIUS * Math.sqrt(rng());
    positions.push({ x: CX + rr * Math.cos(a), y: CY + rr * Math.sin(a), armIndex: -1 });
  }
  const MIN_DIST = 13;
  for (let iter = 0; iter < 5; iter++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x, dy = positions[j].y - positions[i].y;
        const dist = Math.hypot(dx, dy);
        if (dist < MIN_DIST && dist > 0.01) {
          const push = (MIN_DIST - dist) / 2;
          const nx = dx / dist, ny = dy / dist;
          positions[i].x -= nx * push; positions[i].y -= ny * push;
          positions[j].x += nx * push; positions[j].y += ny * push;
        }
      }
    }
  }
  for (const p of positions) {
    const d = Math.hypot(p.x - CX, p.y - CY);
    if (d > MAX_RADIUS) { const s = MAX_RADIUS / d; p.x = CX + (p.x - CX) * s; p.y = CY + (p.y - CY) * s; }
  }
  return positions;
}

function buildStarfield(s: number, n: number) {
  const r = mulberry32(s);
  return Array.from({ length: n }, () => {
    const a = r() * Math.PI * 2, d = r() * MAX_RADIUS * 1.2;
    return { x: CX + Math.cos(a) * d, y: CY + Math.sin(a) * d, r: r() * 1 + 0.2, o: r() * 0.2 + 0.03 };
  });
}

interface Hyperlane { x1: number; y1: number; x2: number; y2: number; }

function buildHyperlanes(positions: StarPos[], maxConnections: number = 3): Hyperlane[] {
  if (positions.length < 3) return [];
  const flatCoords = positions.flatMap(p => [p.x, p.y]);
  const d = new Delaunay(flatCoords);
  const edges = new Set<string>();
  const connCount = new Map<number, number>();
  for (let i = 0; i < positions.length; i++) connCount.set(i, 0);
  const allEdges: { i: number; j: number; dist: number }[] = [];
  const seen = new Set<string>();
  const tri = d.triangles;
  for (let t = 0; t < tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const i = tri[t + e], j = tri[t + (e + 1) % 3];
      const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
      if (!seen.has(key)) { seen.add(key); allEdges.push({ i, j, dist: Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y) }); }
    }
  }
  allEdges.sort((a, b) => a.dist - b.dist);
  for (const { i, j } of allEdges) {
    const ci = connCount.get(i) || 0, cj = connCount.get(j) || 0;
    if (ci < maxConnections && cj < maxConnections) {
      const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
      if (!edges.has(key)) { edges.add(key); connCount.set(i, ci + 1); connCount.set(j, cj + 1); }
    }
  }
  return [...edges].map(k => { const [i, j] = k.split("-").map(Number); return { x1: positions[i].x, y1: positions[i].y, x2: positions[j].x, y2: positions[j].y }; });
}

function ensureAllConnected(positions: StarPos[], hyperlanes: Hyperlane[]): Hyperlane[] {
  const connected = new Set<number>();
  for (const hl of hyperlanes) {
    // Find indices by position
    const a = positions.findIndex(p => p.x === hl.x1 && p.y === hl.y1);
    const b = positions.findIndex(p => p.x === hl.x2 && p.y === hl.y2);
    if (a >= 0) connected.add(a);
    if (b >= 0) connected.add(b);
  }
  const result = [...hyperlanes];
  for (let i = 0; i < positions.length; i++) {
    if (connected.has(i)) continue;
    let bestJ = -1, bestD = Infinity;
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y);
      if (d < bestD) { bestD = d; bestJ = j; }
    }
    if (bestJ >= 0) {
      result.push({ x1: positions[i].x, y1: positions[i].y, x2: positions[bestJ].x, y2: positions[bestJ].y });
      connected.add(i);
    }
  }
  return result;
}

export default function GalaxyMap({ stars, selectedStarId, onSelectStar, movingFleetId }: GalaxyMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 500, y: 500, scale: 1 });
  const vr = useRef(view); vr.current = view;
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ w: 1000, h: 700 });
  const dragging = useRef(false);
  const dsM = useRef({ x: 0, y: 0 }); const dsV = useRef({ x: 0, y: 0 });
  const [showSupply, setShowSupply] = useState(false);
  const [showLiberated, setShowLiberated] = useState(false);
  const [pingPos, setPingPos] = useState<{ x: number; y: number; id: number } | null>(null);
  const [shootingStars, setShootingStars] = useState<{ x: number; y: number; dx: number; dy: number; id: number }[]>([]);
  const [nebulaParticles, setNebulaParticles] = useState<{ x: number; y: number; vx: number; vy: number; o: number; r: number; hue: number }[]>([]);
  const targetView = useRef({ x: 500, y: 500, scale: 1 });

  // Nebula particles init - more particles with color
  useEffect(() => {
    const rng = mulberry32(5555);
    const p = Array.from({ length: 40 }, () => ({
      x: 100 + rng() * 800,
      y: 100 + rng() * 800,
      vx: (rng() - 0.5) * 0.2,
      vy: (rng() - 0.5) * 0.2,
      o: 0.02 + rng() * 0.04,
      r: 2 + rng() * 4,
      hue: [200, 240, 260, 280, 290][Math.floor(rng() * 5)],
    }));
    setNebulaParticles(p);
    const interval = setInterval(() => {
      setNebulaParticles(prev => prev.map(n => {
        let { x, y, vx, vy } = n;
        x += vx; y += vy;
        if (x < 0) x = WORLD_W; if (x > WORLD_W) x = 0;
        if (y < 0) y = WORLD_H; if (y > WORLD_H) y = 0;
        return { ...n, x, y };
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { const e = containerRef.current; if (!e) return; const r = new ResizeObserver(([x]) => setDimensions({ w: x.contentRect.width, h: x.contentRect.height })); r.observe(e); return () => r.disconnect(); }, []);
  const hWheel = useCallback((e: WheelEvent) => { e.preventDefault(); setView(p => { const s = e.deltaY > 0 ? 0.85 : 1.15, ns = Math.min(4, Math.max(0.2, p.scale * s)), r = svgRef.current?.getBoundingClientRect(); if (!r) return p; const mx = e.clientX - r.left, my = e.clientY - r.top; targetView.current = { x: p.x + mx / p.scale - mx / ns, y: p.y + my / p.scale - my / ns, scale: ns }; return targetView.current; }); }, []);
  useEffect(() => { const e = svgRef.current; if (!e) return; e.addEventListener("wheel", hWheel, { passive: false }); return () => e.removeEventListener("wheel", hWheel); }, [hWheel]);
  const onMD = useCallback((e: React.MouseEvent) => { dragging.current = false; dsM.current = { x: e.clientX, y: e.clientY }; dsV.current = { x: vr.current.x, y: vr.current.y }; }, []);
  const onMM = useCallback((e: React.MouseEvent) => { if (dsM.current.x === 0) return; const dx = e.clientX - dsM.current.x, dy = e.clientY - dsM.current.y; if (!dragging.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) dragging.current = true; if (!dragging.current) return; const v = vr.current; const next = { x: dsV.current.x - dx / v.scale, y: dsV.current.y - dy / v.scale, scale: v.scale }; targetView.current = next; setView(next); }, []);
  const onMU = useCallback(() => { dragging.current = false; dsM.current = { x: 0, y: 0 }; }, []);
  const vw = dimensions.w / view.scale, vh = dimensions.h / view.scale, vx = view.x - vw / 2, vy = view.y - vh / 2;
  const [dragClass, setDragClass] = useState("cursor-grab");
  useEffect(() => { const m = () => setDragClass(dragging.current ? "cursor-grabbing" : "cursor-grab"), u = () => { dragging.current = false; dsM.current = { x: 0, y: 0 }; setDragClass("cursor-grab"); }; window.addEventListener("mousemove", m); window.addEventListener("mouseup", u); return () => { window.removeEventListener("mousemove", m); window.removeEventListener("mouseup", u); }; }, []);

  // Shooting stars
  useEffect(() => {
    const spawn = () => {
      const a = Math.random() * Math.PI * 2;
      const startR = 100 + Math.random() * 300;
      setShootingStars(prev => [...prev.slice(-5), {
        x: CX + startR * Math.cos(a), y: CY + startR * Math.sin(a),
        dx: (Math.random() - 0.5) * 200, dy: (Math.random() - 0.5) * 200,
        id: Date.now(),
      }]);
    };
    spawn(); // initial
    const interval = setInterval(spawn, 8000 + Math.random() * 7000);
    return () => clearInterval(interval);
  }, []);

  // Twinkle params for starfield
  const twinkleStars = useMemo(() => {
    const rng = mulberry32(99);
    return Array.from({ length: 500 }, () => ({ dur: 2 + rng() * 3, delay: rng() * 5 }));
  }, []);

  const starPositions = useMemo(() => generateSpiralPositions(stars.length, 42), [stars.length]);
  const starfield = useMemo(() => buildStarfield(42, 500), []);
  const hyperlanes = useMemo(() => ensureAllConnected(starPositions, buildHyperlanes(starPositions, 3)), [starPositions]);

  const posMap = useMemo(() => {
    const map = new Map<number, StarPos>();
    stars.forEach((s, i) => { if (starPositions[i]) map.set(s.id, starPositions[i]); });
    return map;
  }, [stars, starPositions]);

  const zoomLabels = useMemo(() => {
    const labels: { id: number; name: string; x: number; y: number }[] = [];
    const placed: { x: number; y: number }[] = [];
    const sorted = [...stars].sort((a, b) => {
      const pa = posMap.get(a.id), pb = posMap.get(b.id);
      return (a.ownerFactionId ? 0 : 1) - (b.ownerFactionId ? 0 : 1); // faction first
    });
    for (const s of sorted) {
      const p = posMap.get(s.id);
      if (!p) continue;
      if (placed.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 35)) continue;
      placed.push({ x: p.x, y: p.y });
      labels.push({ id: s.id, name: s.name, x: p.x, y: p.y - 11 });
    }
    return labels;
  }, [stars, posMap]);

  return (
    <div ref={containerRef} className="relative w-full h-full rounded-2xl overflow-hidden border border-cyan-500/15 bg-[#070b14]"
      style={{ background: "radial-gradient(ellipse at center, #0f1729 0%, #070b14 60%, #040710 100%)" }}>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button onClick={() => setShowSupply(!showSupply)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
            showSupply ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,242,255,0.1)]"
            : "bg-slate-900/70 text-slate-500 border border-slate-700/30 hover:text-slate-300"
          }`}>
          <GitBranch className="w-3.5 h-3.5"/> Hyperlanes
        </button>
        <button onClick={() => setShowLiberated(!showLiberated)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
            showLiberated ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
            : "bg-slate-900/70 text-slate-500 border border-slate-700/30 hover:text-slate-300"
          }`}>
          <Eye className="w-3.5 h-3.5"/> Neutral
        </button>
      </div>

      <svg ref={svgRef} viewBox={`${vx} ${vy} ${vw} ${vh}`} className={`w-full h-full select-none ${dragClass}`} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="planet-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter>
        </defs>

        <rect width={WORLD_W} height={WORLD_H} fill="#070b14"/>

        {/* Parallax: background layer moves at 0.5× speed */}
        <g transform={`translate(${-(vx - 500) * 0.35}, ${-(vy - 500) * 0.35})`}>
          {starfield.map((s, i) => (
            <circle key={`sf-${i}`} cx={s.x} cy={s.y} r={s.r} fill="white"
              className="star pointer-events-none"
              style={{ "--duration": `${twinkleStars[i]?.dur || 2.5}s`, "--delay": `${twinkleStars[i]?.delay || 0}s` } as React.CSSProperties}/>
          ))}
          {shootingStars.map(ss => (
            <line key={`sh-${ss.id}`} x1={ss.x} y1={ss.y} x2={ss.x + ss.dx} y2={ss.y + ss.dy}
              stroke="white" strokeWidth={1.5} opacity={0.9} className="shooting-star pointer-events-none"/>
          ))}
          {nebulaParticles.map((n, i) => (
            <circle key={`np-${i}`} cx={n.x} cy={n.y} r={n.r}
              fill={`hsla(${n.hue}, 60%, 60%, 0.3)`}
              opacity={n.o} className="pointer-events-none"/>
          ))}
        </g>

        {showSupply && hyperlanes.map((hl, i) => (
          <line key={`hl-${i}`} x1={hl.x1} y1={hl.y1} x2={hl.x2} y2={hl.y2} stroke="rgba(255,255,255,0.2)" strokeWidth={1} className="pointer-events-none"/>
        ))}

        {stars.map(s => {
          const pos = posMap.get(s.id);
          if (!pos) return null;
          const { x, y } = pos;
          const owned = s.ownerFactionId !== null;
          const color = owned ? FCOLORS[s.ownerFactionId!] : "rgba(210,215,225,0.7)";
          const sel = selectedStarId === s.id;
          const hov = hoveredStar === s.id;
          const dimmed = showLiberated && !owned;
          const br = owned ? 8 : 4.5;
          const r = dimmed ? br * 0.35 : br * (sel ? 2.2 : hov ? 1.7 : 1);
          const opacity = dimmed ? 0.12 : 1;

          let starRes: { minerals: number; energy: number } = { minerals: 0, energy: 0 };
          try { starRes = JSON.parse(s.resources || "{}"); } catch {}

          return (
            <g key={`p-${s.id}`} opacity={opacity}
              style={{ transition: "transform 0.15s ease-out, opacity 0.15s ease-out" }}>
              {/* Faction orbit ring */}
              {owned && !dimmed && (
                <circle cx={x} cy={y} r={br + 8} fill="none" stroke={color}
                  strokeWidth={1.5} opacity={0.35}
                  strokeDasharray={sel || hov ? "none" : "4 4"}
                  className="pointer-events-none"
                  style={{ transition: "stroke-dasharray 0.3s" }}/>
              )}
              {/* Outer ring for selected/hovered */}
              {(sel || hov) && !dimmed && (
                <circle cx={x} cy={y} r={br + 14} fill="none" stroke={color}
                  strokeWidth={1} opacity={0.2}
                  className="pointer-events-none"/>
              )}
              {/* Pulsing glow ring for faction planets */}
              {owned && !sel && !dimmed && (
                <circle cx={x} cy={y} r={br + 5} fill="none" stroke={color} strokeWidth={2.5}
                  opacity={0.45} className="pulse-ring pointer-events-none"/>
              )}
              {sel && !dimmed && (
                <circle cx={x} cy={y} r={r + 9} fill="none" stroke={color} strokeWidth={2.5}
                  strokeDasharray="6 4" opacity={0.85} className="pointer-events-none"/>
              )}
              {hov && !sel && !dimmed && (
                <circle cx={x} cy={y} r={r + 7} fill="none" stroke="rgba(255,255,255,0.5)"
                  strokeWidth={2} filter="url(#planet-glow)" className="pointer-events-none"/>
              )}
              {/* Planet body */}
              <circle cx={x} cy={y} r={r} fill={color}
                stroke="rgba(0,0,0,0.55)" strokeWidth={1}
                filter={owned && hov ? "url(#planet-glow)" : undefined}
                style={{ cursor: "pointer", transition: "r 0.15s ease-out" }}
                onClick={e => {
                  e.stopPropagation();
                  setPingPos({ x, y, id: s.id });
                  setTimeout(() => setPingPos(null), 500);
                  onSelectStar(s.id);
                }}
                onMouseEnter={() => setHoveredStar(s.id)}
                onMouseLeave={() => setHoveredStar(null)}/>
              {/* Enhanced Tooltip */}
              {hov && !dimmed && (
                <g className="pointer-events-none">
                  <rect x={x - 72} y={y - r - 46} width={144} height={40} rx={6}
                    fill="rgba(15,23,42,0.92)" stroke={owned ? color : "rgba(255,255,255,0.2)"} strokeWidth={1}/>
                  <text x={x} y={y - r - 32} textAnchor="middle" fill="white"
                    fontSize={11} fontWeight={700} className="select-none">
                    {s.name}
                  </text>
                  <text x={x} y={y - r - 20} textAnchor="middle" fill="rgba(255,255,255,0.55)"
                    fontSize={9} className="select-none">
                    {owned ? FSHORT[s.ownerFactionId!] : "Neutral"}
                    {s.controllerId ? " · Kontr." : ""}
                    {" · "}{starRes.minerals || 0}M/{starRes.energy || 0}E
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Click ping */}
        {pingPos && (
          <circle cx={pingPos.x} cy={pingPos.y} r={2} fill="none" stroke="white"
            strokeWidth={2} className="ping-ring pointer-events-none"/>
        )}

        {/* Zoom-labels: show planet names when zoomed in */}
        {view.scale > 1.5 && zoomLabels.map(zl => (
          <text key={`zl-${zl.id}`} x={zl.x} y={zl.y}
            textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize={8} fontWeight={500}
            className="pointer-events-none select-none"
            style={{ textShadow: "0 0 4px rgba(0,0,0,0.8)" }}>
            {zl.name}
          </text>
        ))}
        <circle cx={CX} cy={CY} r={16} fill="rgba(200,220,255,0.08)" filter="url(#glow)" className="pointer-events-none"/>
        <circle cx={CX} cy={CY} r={8} fill="rgba(220,230,255,0.7)" filter="url(#planet-glow)" className="pointer-events-none"/>
        <circle cx={CX} cy={CY} r={6} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} className="pointer-events-none"/>
        <circle cx={CX} cy={CY} r={2} fill="white" className="pointer-events-none"/>
        <text x={CX} y={CY + 18} textAnchor="middle" fill="rgba(200,220,255,0.2)" fontSize={7} fontWeight={700} className="pointer-events-none select-none">NEXUS</text>
      </svg>

      {movingFleetId && <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/5 backdrop-blur border border-cyan-400/30 rounded-xl text-xs text-cyan-400 flex items-center gap-2 z-10 select-none"><Navigation className="w-3 h-3"/> Sende Flotte — Zielstern anklicken</div>}

      <div className="absolute bottom-4 left-4 flex gap-1.5 z-10">
        <button onClick={() => setView(p => ({ ...p, scale: Math.min(4, p.scale * 1.3) }))}
          className="w-8 h-8 rounded-lg bg-slate-900/70 backdrop-blur-sm border border-slate-700/30 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
          <ZoomIn className="w-3.5 h-3.5"/></button>
        <button onClick={() => setView(p => ({ ...p, scale: Math.max(0.2, p.scale * 0.77) }))}
          className="w-8 h-8 rounded-lg bg-slate-900/70 backdrop-blur-sm border border-slate-700/30 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
          <ZoomOut className="w-3.5 h-3.5"/></button>
        <button onClick={() => setView({ x: 500, y: 500, scale: 1 })}
          className="w-8 h-8 rounded-lg bg-slate-900/70 backdrop-blur-sm border border-slate-700/30 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
          <Maximize className="w-3.5 h-3.5"/></button>
      </div>

      <div className="absolute bottom-4 right-4 bg-slate-900/70 backdrop-blur-sm border border-slate-700/30 rounded-xl px-3 py-2 text-xs space-y-1 z-10">
        <p className="text-slate-500 mb-1 font-semibold text-[10px] uppercase tracking-wider">Legende</p>
        {[1,2,3,4,5].map(f => (
          <div key={f} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: FCOLORS[f], boxShadow: `0 0 6px ${FCOLORS[f]}60` }}/>
            <span className="text-slate-400">{FSHORT[f]}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600 flex-shrink-0"/>
          <span className="text-slate-500">Neutral ({stars.filter(s => !s.ownerFactionId).length})</span>
        </div>
      </div>

      <div className="absolute top-4 left-4 text-[10px] text-slate-600 pointer-events-none select-none z-10">
        <MapPin className="w-3 h-3 inline mr-1"/>Scroll = Zoom · Drag = Pan · Click = System
      </div>
    </div>
  );
}
