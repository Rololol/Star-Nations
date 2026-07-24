"use client";

import { Swords, Package } from "lucide-react";

interface BottomBarProps {
  onOpenPanel: (id: string) => void;
  activePanel: string | null;
}

const items = [
  { id: "inventory", icon: Package, label: "Inventar" },
  { id: "combat", icon: Swords, label: "Kämpfe" },
];

export default function BottomBar({ onOpenPanel, activePanel }: BottomBarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onOpenPanel(item.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
            activePanel === item.id
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,242,255,0.1)]"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
          }`}>
          <item.icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
