"use client";

import { MessageCircle, Globe, Settings, BookOpen, MessageSquare, Target, Store, Newspaper, Map, Users, Trophy, CalendarDays, ShoppingCart, Rocket, Building2 } from "lucide-react";

interface LeftRailProps {
  onOpenPanel: (id: string) => void;
  activePanel: string | null;
}

const navItems = [
  // Navigation
  { id: "chat", icon: MessageCircle, label: "Chat" },
  { id: "systems", icon: Globe, label: "Systeme" },
  // Actions
  { id: "missions", icon: Target, label: "Missionen" },
  { id: "shop", icon: Store, label: "Shop" },
  { id: "market", icon: ShoppingCart, label: "Markt" },
  { id: "fleet", icon: Rocket, label: "Flotten" },
  { id: "company", icon: Building2, label: "Firmen" },
  { id: "territory", icon: Map, label: "Territorium" },
  { id: "rankings", icon: Trophy, label: "Rangliste" },
  { id: "news", icon: Newspaper, label: "News" },
  { id: "party", icon: Users, label: "Party" },
  { id: "events", icon: CalendarDays, label: "Events" },
  // Bottom
  { id: "options", icon: Settings, label: "Optionen" },
  { id: "rules", icon: BookOpen, label: "Regeln" },
  { id: "discord", icon: MessageSquare, label: "Discord" },
];

export default function LeftRail({ onOpenPanel, activePanel }: LeftRailProps) {
  return (
    <div className="flex flex-col gap-0.5 p-1.5">
      {navItems.map((item, idx) => (
        <div key={item.id}>
          {(idx === 5 || idx === 12) && (
            <div className="h-px bg-slate-700/30 mx-2 my-1" />
          )}
          <button
            onClick={() => onOpenPanel(item.id)}
            className={`nav-rail-btn group relative ${activePanel === item.id ? "nav-rail-btn-active" : ""}`}
            title={item.label}>
            <item.icon className="w-4 h-4" />
            <span className="absolute left-12 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {item.label}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
