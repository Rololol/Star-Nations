"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, Briefcase, Coins, Diamond, Flame, Shield, LogOut } from "lucide-react";

interface UserInfo {
  userId: number; displayName: string; factionId: number; factionName: string;
}

interface StatRegen {
  energyIntervalSec: number;
  energyNextInSec: number;
  entreIntervalSec: number;
  entreNextInSec: number;
}

interface StatData {
  statEnergy: number; maxStatEnergy: number;
  entrepreneurship: number; maxEntrepreneurship: number;
  production: number; companiesLimit: number;
}

const FACTION_COLORS: Record<number, string> = { 1: "#3B82F6", 2: "#10B981", 3: "#8B5CF6", 4: "#EF4444", 5: "#F59E0B" };
const FACTION_NAMES: Record<number, string> = { 1: "Terraner", 2: "Vectis", 3: "Onyx", 4: "Zyrion", 5: "Eldar" };

export default function TopHUD({ user, onOpenProfile, onLogout }: { user: UserInfo; onOpenProfile: () => void; onLogout: () => void }) {
  const [stats, setStats] = useState<StatData>({ statEnergy: 100, maxStatEnergy: 100, entrepreneurship: 100, maxEntrepreneurship: 100, production: 0, companiesLimit: 0 });
  const [regen, setRegen] = useState<StatRegen>({ energyIntervalSec: 60, energyNextInSec: 60, entreIntervalSec: 180, entreNextInSec: 180 });
  const [resources, setResources] = useState({ credits: 0, titan_erz: 0, deuterium: 0, controlledStars: 0 });
  const [energyTimer, setEnergyTimer] = useState("00:00");
  const [entreTimer, setEntreTimer] = useState("00:00");
  const regenRef = useRef(regen);

  useEffect(() => { regenRef.current = regen; }, [regen]);

  // Fetch resources + stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/resources");
        if (res.ok) {
          const d = await res.json();
          setResources({ credits: d.credits || 0, titan_erz: d.titan_erz || 0, deuterium: d.deuterium || 0, controlledStars: d.controlledStars || 0 });
          if (d.stats) setStats(d.stats);
          if (d.statRegen) {
            setRegen(d.statRegen);
            regenRef.current = d.statRegen;
          }
        }
      } catch { /* silent */ }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Real-time countdown timers
  useEffect(() => {
    const fmt = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    const tick = () => {
      const r = regenRef.current;
      const nextEnergy = r.energyNextInSec - 1;
      const nextEntre = r.entreNextInSec - 1;

      if (nextEnergy <= 0) {
        setRegen(prev => ({ ...prev, energyNextInSec: prev.energyIntervalSec }));
        regenRef.current = { ...r, energyNextInSec: r.energyIntervalSec };
        setStats(prev => ({ ...prev, statEnergy: Math.min(prev.maxStatEnergy, prev.statEnergy + 1) }));
        setEnergyTimer(fmt(r.energyIntervalSec));
      } else {
        setRegen(prev => ({ ...prev, energyNextInSec: nextEnergy }));
        regenRef.current = { ...r, energyNextInSec: nextEnergy };
        setEnergyTimer(fmt(nextEnergy));
      }

      if (nextEntre <= 0) {
        setRegen(prev => ({ ...prev, entreNextInSec: prev.entreIntervalSec }));
        regenRef.current = { ...r, entreNextInSec: r.entreIntervalSec };
        setStats(prev => ({ ...prev, entrepreneurship: Math.min(prev.maxEntrepreneurship, prev.entrepreneurship + 1) }));
        setEntreTimer(fmt(r.entreIntervalSec));
      } else {
        setRegen(prev => ({ ...prev, entreNextInSec: nextEntre }));
        regenRef.current = { ...r, entreNextInSec: nextEntre };
        setEntreTimer(fmt(nextEntre));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const factionColor = FACTION_COLORS[user.factionId] || "#3B82F6";
  const ePct = stats.maxStatEnergy > 0 ? (stats.statEnergy / stats.maxStatEnergy) * 100 : 0;
  const bPct = stats.maxEntrepreneurship > 0 ? (stats.entrepreneurship / stats.maxEntrepreneurship) * 100 : 0;

  return (
    <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur-md border-b border-cyan-500/20 px-4 py-1.5">
      <div className="flex items-center gap-5">

        {/* Player Identity - clickable */}
        <button onClick={onOpenProfile}
          className="flex items-center gap-2 min-w-0 group cursor-pointer hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 group-hover:ring-2 ring-white/20 transition-all"
            style={{ background: factionColor, boxShadow: `0 0 12px ${factionColor}60` }}>
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 text-left">
            <div className="text-sm font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">{user.displayName}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: factionColor }}>
              {FACTION_NAMES[user.factionId] || "Uprising"}
            </div>
          </div>
        </button>

        <div className="h-8 w-px bg-slate-700/50" />

        {/* Energy Pool */}
        <div className="flex items-center gap-3 min-w-[160px]">
          <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-slate-400">Energie</span>
              <span className="text-white font-mono font-medium">
                {Math.floor(stats.statEnergy)}/{stats.maxStatEnergy}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="fill-animate h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                style={{ width: `${ePct}%`, transition: "width 1s linear" }} />
            </div>
            <div className="text-[10px] text-amber-500/70 font-mono mt-0.5">
              {energyTimer}
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-700/50" />

        {/* Entrepreneurship Pool */}
        <div className="flex items-center gap-3 min-w-[160px]">
          <Briefcase className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-slate-400">Entrepr.</span>
              <span className="text-white font-mono font-medium">
                {Math.floor(stats.entrepreneurship)}/{stats.maxEntrepreneurship}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="fill-animate h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400"
                style={{ width: `${bPct}%`, transition: "width 1s linear" }} />
            </div>
            <div className="text-[10px] text-cyan-500/70 font-mono mt-0.5">
              {entreTimer}
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-700/50" />

        {/* Resource Counters */}
        <div className="flex items-center gap-4 ml-auto">
          <ResIcon icon={<Coins className="w-3.5 h-3.5" />} value={resources.credits} label="Cr" color="text-amber-400" />
          <ResIcon icon={<Diamond className="w-3.5 h-3.5" />} value={resources.titan_erz} label="Erz" color="text-slate-300" />
          <ResIcon icon={<Flame className="w-3.5 h-3.5" />} value={resources.deuterium} label="Deut" color="text-cyan-400" />
          <ResIcon icon={<Shield className="w-3.5 h-3.5" />} value={resources.controlledStars} label="Sys" color="text-white" />
          <button onClick={onLogout}
            className="ml-2 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Abmelden">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ResIcon({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={color}>{icon}</span>
      <div>
        <span className="font-mono text-xs font-medium text-white">
          {typeof value === "number" ? Math.round(value) : value}
        </span>
        <span className="text-[10px] text-slate-500 ml-1">{label}</span>
      </div>
    </div>
  );
}
