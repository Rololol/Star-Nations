"use client";

import { useState } from "react";
import {
  X,
  Star,
  MapPin,
  Database,
  Shield,
  Flag,
  Rocket,
  Loader,
  AlertCircle,
  Navigation,
  Circle,
} from "lucide-react";
import type { StarData } from "./GalaxyMap";
import { COSTS } from "@/lib/game";

interface StarDetailProps {
  star: StarData;
  onClose: () => void;
  userId: number;
  factionId: number;
  onStarChanged: () => void;
  movingFleetId?: number | null;
  onMoveFleet?: (fleetId: number, destStarId: number) => Promise<void>;
}

const FACTION_COLORS: Record<number, string> = {
  1: "#3B82F6",
  2: "#10B981",
  3: "#8B5CF6",
  4: "#EF4444",
  5: "#F59E0B",
};

export default function StarDetail({
  star,
  onClose,
  userId,
  factionId,
  onStarChanged,
  movingFleetId,
  onMoveFleet,
}: StarDetailProps) {
  const resources = JSON.parse(star.resources);
  const factionColor = star.ownerFactionId
    ? FACTION_COLORS[star.ownerFactionId] ?? "#6B7280"
    : "#6B7280";

  const isOwned = star.ownerFactionId !== null;
  const isMyFaction = star.ownerFactionId === factionId;
  const isMyStar = star.controllerId === userId;

  // ── Claim state ────────────────────────────────────
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  // ── Build fleet state ──────────────────────────────
  const [buildMode, setBuildMode] = useState(false);
  const [shipCount, setShipCount] = useState(1);
  const [fleetName, setFleetName] = useState("");
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState("");

  async function handleClaim() {
    setClaiming(true);
    setClaimError("");
    try {
      const res = await fetch(`/api/stars/${star.id}/claim`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimError(data.error);
        return;
      }
      onStarChanged();
    } catch {
      setClaimError("Verbindungsfehler.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleBuildFleet(e: React.FormEvent) {
    e.preventDefault();
    setBuilding(true);
    setBuildError("");
    try {
      const res = await fetch("/api/fleets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starId: star.id,
          shipCount,
          name: fleetName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBuildError(data.error);
        return;
      }
      setBuildMode(false);
      setShipCount(1);
      setFleetName("");
      onStarChanged();
    } catch {
      setBuildError("Verbindungsfehler.");
    } finally {
      setBuilding(false);
    }
  }

  const buildCost = {
    credits: COSTS.BUILD_SHIP.credits * shipCount,
    minerals: COSTS.BUILD_SHIP.minerals * shipCount,
    energy: COSTS.BUILD_SHIP.energy * shipCount,
  };

  return (
    <div className="glass w-80 p-0 overflow-hidden border-white/10 flex flex-col max-h-full panel-slide">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: `2px solid ${factionColor}30` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: `${factionColor}20`,
              boxShadow: `0 0 12px ${factionColor}30`,
            }}
          >
            <Star className="w-4 h-4" style={{ color: factionColor }} />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">{star.name}</h2>
            <span className="text-xs text-gray-500">System #{star.id}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4 overflow-y-auto">
        {/* Owner */}
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-gray-500" />
          <div>
            <span className="text-xs text-gray-500 block">Kontrolle</span>
            <span className="text-sm font-medium" style={{ color: factionColor }}>
              {star.ownerFaction ? star.ownerFaction.name : "Neutral"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-gray-500" />
          <div>
            <span className="text-xs text-gray-500 block">Koordinaten</span>
                    <span className="text-sm text-white">
                      Sektor {star.sector} · Ring {star.ring}
                    </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Database className="w-4 h-4 text-gray-500 mt-0.5" />
          <div className="flex-1">
            <span className="text-xs text-gray-500 block mb-2">Ressourcen</span>
            <div className="space-y-2">
              <ResourceBar label="Mineralien" value={resources.minerals} max={250} color="#3B82F6" />
              <ResourceBar label="Energie" value={resources.energy} max={250} color="#F59E0B" />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Gesamtvorkommen</span>
            <span className="text-white font-medium">
              {resources.minerals + resources.energy}
              <span className="text-gray-600 text-xs"> / 500</span>
            </span>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────── */}
        <div className="pt-2 space-y-2">
          {/* Error */}
          {(claimError || buildError) && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {claimError || buildError}
            </div>
          )}

          {/* Claim button (neutral star, no fleet selected) */}
          {!isOwned && !movingFleetId && (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
                         bg-cyan-600 text-white hover:bg-cyan-500
                         hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {claiming ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Flag className="w-4 h-4" />
              )}
              Beanspruchen ({COSTS.CLAIM_STAR.credits} Credits)
            </button>
          )}

          {/* Build fleet (my star) */}
          {isMyStar && !buildMode && (
            <button
              onClick={() => setBuildMode(true)}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
                         bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30
                         border border-cyan-500/20 flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Flotte bauen
            </button>
          )}

          {/* Build fleet form */}
          {isMyStar && buildMode && (
            <form onSubmit={handleBuildFleet} className="space-y-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Flottenname</label>
                <input
                  type="text"
                  value={fleetName}
                  onChange={(e) => setFleetName(e.target.value)}
                  className="input-field text-sm py-2"
                  placeholder="z.B. 1. Eingreifflotte"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Schiffe (1–10)
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={shipCount}
                  onChange={(e) => setShipCount(parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{shipCount} Schiff{shipCount > 1 ? "e" : ""}</span>
                  <span>
                    Kosten: {buildCost.minerals} Min. · {buildCost.energy} En. · {buildCost.credits} Cr.
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setBuildMode(false); setBuildError(""); }}
                  className="flex-1 py-2 rounded-lg text-sm text-gray-400 btn-glass"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={building}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-cyan-600 text-white
                             hover:bg-cyan-500 disabled:opacity-50 transition-colors
                             flex items-center justify-center gap-1"
                >
                  {building ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                  Bauen
                </button>
              </div>
            </form>
          )}

          {/* Fleet movement — send selected fleet here */}
          {movingFleetId && !isMyStar && onMoveFleet && (
            <button
              onClick={() => onMoveFleet(movingFleetId, star.id)}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
                         bg-amber-600 text-white hover:bg-amber-500
                         hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]
                         flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              Flotte hierher senden
            </button>
          )}

          {/* Enemy star — hint to select fleet */}
          {isOwned && !isMyFaction && !movingFleetId && (
            <div className="w-full py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-white/5 flex items-center justify-center gap-2">
              <Rocket className="w-4 h-4" />
              Feindliches System — wähle eine Flotte zum Senden
            </div>
          )}

          {/* Same faction, not mine */}
          {isOwned && isMyFaction && !isMyStar && (
            <p className="text-xs text-gray-500 text-center py-2">
              Von deiner Fraktion kontrolliert.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
