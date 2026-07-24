"use client";

import { X, Rocket } from "lucide-react";
import FleetList from "./FleetList";

interface FleetPanelProps {
  onClose: () => void;
  onSelectFleetForMove: (fleetId: number | null) => void;
  selectedFleetId: number | null;
}

export default function FleetPanel({ onClose, onSelectFleetForMove, selectedFleetId }: FleetPanelProps) {
  return (
    <div className="glass w-80 p-0 overflow-hidden border-white/10 flex flex-col max-h-full">
      <div className="px-5 py-3 flex items-center justify-between border-b border-white/5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Rocket className="w-4 h-4 text-cyan-400"/> Flotten
        </h2>
        <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10">
          <X className="w-3.5 h-3.5"/>
        </button>
      </div>
      <div className="p-2 overflow-y-auto flex-1">
        <FleetList onSelectFleetForMove={onSelectFleetForMove} selectedFleetId={selectedFleetId} />
      </div>
    </div>
  );
}
