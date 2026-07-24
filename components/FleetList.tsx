"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Rocket,
  Clock,
  Loader,
  Navigation,
  Anchor,
  Send,
} from "lucide-react";

interface FleetData {
  id: number;
  name: string;
  shipCount: number;
  status: "idle" | "moving";
  arrivesAt: string | null;
  currentStar: { id: number; name: string };
  destinationStar: { id: number; name: string } | null;
}

interface FleetListProps {
  onSelectFleetForMove?: (fleetId: number | null) => void;
  selectedFleetId?: number | null;
  compact?: boolean;
}

export default function FleetList({ onSelectFleetForMove, selectedFleetId, compact = false }: FleetListProps) {
  const [fleets, setFleets] = useState<FleetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFleets = useCallback(async () => {
    try {
      const res = await fetch("/api/fleets");
      const data = await res.json();
      if (res.ok) {
        setFleets(data);
      } else {
        setError(data.error);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleets();
    const interval = setInterval(fetchFleets, 15000);
    return () => clearInterval(interval);
  }, [fetchFleets]);

  // ── Countdown timer for moving fleets ──────────────
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function formatRemaining(arrivesAt: string): string {
    const ms = new Date(arrivesAt).getTime() - now;
    if (ms <= 0) return "Angekommen";
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const remainS = s % 60;
    return `${m}m ${remainS}s`;
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Loader className="w-4 h-4 animate-spin mx-auto" />
      </div>
    );
  }

  if (fleets.length === 0 && !compact) {
    return (
      <div className="p-4 text-center text-gray-500 text-xs">
        <Rocket className="w-5 h-5 mx-auto mb-2 opacity-30" />
        Keine Flotten. Baue eine an einem kontrollierten System.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {fleets.map((fleet) => {
        const isSelected = selectedFleetId === fleet.id;
        return (
        <div
          key={fleet.id}
          className={`glass p-3 text-sm ${
            compact ? "px-2 py-1.5" : ""
          } ${isSelected ? "border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : ""}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Rocket
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  fleet.status === "moving"
                    ? "text-amber-400"
                    : "text-cyan-400"
                }`}
              />
              <span className="text-white font-medium truncate text-xs">
                {fleet.name}
              </span>
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {fleet.shipCount} Schiff{fleet.shipCount > 1 ? "e" : ""}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-400">
            {fleet.status === "idle" ? (
              <>
                <Anchor className="w-3 h-3" />
                <span className="truncate">{fleet.currentStar.name}</span>
                {onSelectFleetForMove && (
                  <button
                    onClick={() =>
                      isSelected
                        ? onSelectFleetForMove(null)
                        : onSelectFleetForMove(fleet.id)
                    }
                    className={`ml-auto flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10"
                    }`}
                  >
                    <Send className="w-3 h-3" />
                    {isSelected ? "Ziel wählen" : "Senden"}
                  </button>
                )}
              </>
            ) : (
              <>
                <Navigation className="w-3 h-3 text-amber-400" />
                <span className="truncate">
                  {fleet.currentStar.name} → {fleet.destinationStar?.name}
                </span>
                {fleet.arrivesAt && (
                  <span className="text-amber-400 ml-auto flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRemaining(fleet.arrivesAt)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      );
      })}
    </div>
  );
}
