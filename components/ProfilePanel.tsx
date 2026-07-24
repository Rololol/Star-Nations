"use client";

import { useState, useEffect } from "react";
import { X, Shield, Sword, Coins, Star, Zap, Users, Package, Building2, TrendingUp, Clock, Calendar, Diamond, Flame, Cpu, Atom, Rocket, Gem } from "lucide-react";
import { RESOURCE_LABELS } from "@/lib/factories";

const FCOLORS: Record<number, string> = { 1:"#3B82F6",2:"#10B981",3:"#8B5CF6",4:"#EF4444",5:"#F59E0B" };

interface ProfileData {
  id: number; displayName: string; title: string; bio: string;
  factionId: number; factionName: string; factionLore: string;
  homeStar: { id: number; name: string } | null;
  joinedAt: string;
  resources: { credits: number; energy: number; titan_erz: number; deuterium: number; seltene_erden: number; titan_legierung: number; deuterium_zellen: number; mikro_prozessoren: number; quanten_kerne: number; schiffshuellen: number; plasma_waffen: number };
  controlledStars: { id: number; name: string; minerals: number; energy: number }[];
  fleetCount: number; totalShips: number;
  fleets: { id: number; name: string; shipCount: number; location: string }[];
  activity: { action: string; detail: string; createdAt: string }[];
  companies: { id: number; name: string; companyType: string; reactorLevel: number; storageLevel: number; currentPP: number; starName: string; employeeCount: number }[];
}

interface ProfilePanelProps {
  userId: number;
  onClose: () => void;
  onOpenCompany?: (companyId: number) => void;
}

type ProfileTab = "equipment" | "account" | "skills" | "transactions" | "companies" | "inventory";

const EQUIPMENT_SLOTS = [
  { slot: "Waffe", icon: Sword, durability: 94, name: "Taktische Klinge Mk.III", rarity: "rare", stat: "+24 ATK" },
  { slot: "Helm", icon: Shield, durability: 82, name: "Neural-Interface Helm", rarity: "uncommon", stat: "+12 DEF" },
  { slot: "Rüstung", icon: Shield, durability: 78, name: "Energie-Schild Matrix", rarity: "rare", stat: "+30 DEF" },
  { slot: "Handschuhe", icon: Sword, durability: 91, name: "Servo-Handschuhe", rarity: "common", stat: "+8 ATK" },
  { slot: "Beinsch.", icon: Shield, durability: 85, name: "Antigrav-Stiefel", rarity: "uncommon", stat: "+15 AGI" },
  { slot: "Stiefel", icon: Shield, durability: 88, name: "Phasen-Stiefel", rarity: "rare", stat: "+10 SPD" },
];

function rarityColor(rarity: string) {
  switch (rarity) {
    case "common": return "text-slate-400";
    case "uncommon": return "text-green-400";
    case "rare": return "text-blue-400";
    case "epic": return "text-purple-400";
    case "legendary": return "text-amber-400";
    default: return "text-slate-400";
  }
}

export default function ProfilePanel({ userId, onClose, onOpenCompany }: ProfilePanelProps) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProfileTab>("equipment");

  useEffect(() => {
    fetch(`/api/profile/${userId}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [userId]);

  if (loading) {
    return (
      <div className="glass w-80 p-6 border-slate-700/30 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (!data) return null;

  const factionColor = FCOLORS[data.factionId] || "#6B7280";

  return (
    <div className="glass w-80 p-0 overflow-hidden border-slate-700/30 flex flex-col max-h-full">
      {/* === HEADER === */}
      <div className="px-4 py-3 border-b border-slate-700/30">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: factionColor, boxShadow: `0 0 15px ${factionColor}40` }}>
                {data.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-black text-[9px] font-bold px-1 rounded-full border-2 border-slate-900">
                Lv.1
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{data.displayName}</h2>
              <p className="text-[11px]" style={{ color: factionColor }}>{data.factionName}</p>
              <p className="text-[9px] text-slate-500">Citizen · Mitglied seit {new Date(data.joinedAt).toLocaleDateString("de-DE")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Quick-nav tabs */}
        <div className="grid grid-cols-6 gap-0.5">
          {([
            { id: "equipment" as ProfileTab, label: "Ausrüst." },
            { id: "account" as ProfileTab, label: "Konto" },
            { id: "skills" as ProfileTab, label: "Fähigk." },
            { id: "transactions" as ProfileTab, label: "Transakt." },
            { id: "companies" as ProfileTab, label: "Firmen" },
            { id: "inventory" as ProfileTab, label: "Inventar" },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`text-[9px] py-1 rounded text-center transition-all ${
                tab === t.id
                  ? "bg-cyan-500/15 text-cyan-400 font-medium"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* === TAB CONTENT === */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {tab === "equipment" && (
          <>
            {/* Equipment Slots */}
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_SLOTS.map((eq, i) => (
                <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <eq.icon className={`w-3 h-3 ${rarityColor(eq.rarity)}`} />
                    <span className="text-[10px] text-slate-400">{eq.slot}</span>
                  </div>
                  <div className="text-[11px] text-white font-medium truncate">{eq.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[9px] ${rarityColor(eq.rarity)}`}>{eq.stat}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-10 bg-slate-700 rounded-full h-1 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full"
                          style={{ width: `${eq.durability}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-500">{eq.durability}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Cards */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ranglisten &amp; Stats</h3>
              <div className="grid grid-cols-2 gap-2">
                <StatCard icon={Sword} label="Wöch. Schaden" value="12,450" color="text-red-400" rank="#42" />
                <StatCard icon={Sword} label="Gesamtschaden" value="89,230" color="text-orange-400" rank="#87" />
                <StatCard icon={Coins} label="Reichtum" value={String(Math.floor(data.resources.credits))} color="text-amber-400" rank="-#-" />
                <StatCard icon={Star} label="XP / Level" value="1,200 XP" color="text-purple-400" rank="Lv.1" />
                <StatCard icon={Users} label="Empfehlungen" value="0" color="text-cyan-400" rank="-#-" />
                <StatCard icon={Zap} label="Abonnenten" value="1" color="text-blue-400" rank="-#-" />
              </div>
            </div>

            {/* Finances */}
            <div>
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Reichtum</h3>
              <div className="grid grid-cols-2 gap-2">
                <FinCard icon={TrendingUp} label="Gesamt" value={String(Math.floor(data.resources.credits + 2000))} color="text-green-400" />
                <FinCard icon={Coins} label="Geld" value={String(Math.floor(data.resources.credits))} color="text-amber-400" />
                <FinCard icon={Building2} label="Firmen" value="1" color="text-cyan-400" />
                <FinCard icon={Package} label="Ausrüstung" value="2,000" color="text-purple-400" />
              </div>
            </div>
          </>
        )}

        {tab === "account" && (
          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-700/20"><span className="text-slate-500">Display-Name</span><span className="text-white">{data.displayName}</span></div>
            <div className="flex justify-between py-1 border-b border-slate-700/20"><span className="text-slate-500">Fraktion</span><span style={{ color: factionColor }}>{data.factionName}</span></div>
            <div className="flex justify-between py-1 border-b border-slate-700/20"><span className="text-slate-500">Titel</span><span className="text-slate-300">{data.title || "Keiner"}</span></div>
            <div className="flex justify-between py-1 border-b border-slate-700/20"><span className="text-slate-500">Bio</span><span className="text-slate-400 italic">{data.bio || "Keine"}</span></div>
            <div className="flex justify-between py-1 border-b border-slate-700/20"><span className="text-slate-500">HQ</span><span className="text-cyan-400">{data.homeStar?.name || "Kein"}</span></div>
            <div className="flex justify-between py-1 border-b border-slate-700/20"><span className="text-slate-500">Registriert</span><span className="text-slate-400">{new Date(data.joinedAt).toLocaleDateString("de-DE")}</span></div>
          </div>
        )}

        {tab === "skills" && (
          <div className="space-y-2">
            {[
              { name: "Produktion", level: 0, max: 10, color: "bg-cyan-500" },
              { name: "Kampf", level: 0, max: 10, color: "bg-red-500" },
              { name: "Handel", level: 0, max: 10, color: "bg-amber-500" },
              { name: "Logistik", level: 0, max: 10, color: "bg-green-500" },
              { name: "Diplomatie", level: 0, max: 10, color: "bg-purple-500" },
            ].map(s => (
              <div key={s.name} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">{s.name}</span>
                  <span className="text-slate-500">{s.level}/{s.max}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${s.color}`}
                    style={{ width: `${(s.level / s.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "transactions" && (
          <div className="space-y-1.5">
            {data.activity.slice(0, 15).map((a, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-700/10">
                <Clock className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: factionColor }} />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-300 leading-relaxed truncate">{a.detail}</p>
                  <p className="text-[9px] text-slate-600">{new Date(a.createdAt).toLocaleString("de-DE")}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "companies" && (
          <>
            {data.companies && data.companies.length > 0 ? (
              <div className="space-y-2">
                {data.companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onOpenCompany?.(c.id)}
                    className="w-full text-left bg-slate-800/40 border border-slate-700/30 hover:border-cyan-500/30 hover:bg-slate-800/60 rounded-lg p-2.5 transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-white text-[11px] font-medium">{c.name}</span>
                      </div>
                      <span className="text-[9px] text-slate-500">{c.starName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Reaktor</span>
                        <span className="text-cyan-400 font-mono">Lv.{c.reactorLevel}/7</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Speicher</span>
                        <span className="text-purple-400 font-mono">Lv.{c.storageLevel}/7</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">PP</span>
                        <span className="text-white font-mono">{c.currentPP.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Angest.</span>
                        <span className="text-white font-mono">{c.employeeCount}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-[11px]">Keine Firmen vorhanden.</p>
                <p className="text-slate-600 text-[10px] mt-1">Gründe eine Firma über das Firmen-Panel.</p>
              </div>
            )}
          </>
        )}

        {tab === "inventory" && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ressourcen</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "credits", icon: Coins, color: "text-amber-400" },
                { key: "energy", icon: Zap, color: "text-yellow-400" },
                { key: "titan_erz", icon: Diamond, color: "text-slate-300" },
                { key: "deuterium", icon: Flame, color: "text-cyan-400" },
                { key: "seltene_erden", icon: Gem, color: "text-pink-400" },
                { key: "titan_legierung", icon: Shield, color: "text-blue-400" },
                { key: "deuterium_zellen", icon: Zap, color: "text-teal-400" },
                { key: "mikro_prozessoren", icon: Cpu, color: "text-green-400" },
                { key: "quanten_kerne", icon: Atom, color: "text-purple-400" },
                { key: "schiffshuellen", icon: Rocket, color: "text-orange-400" },
                { key: "plasma_waffen", icon: Sword, color: "text-red-400" },
              ].map(({ key, icon: Icon, color }) => (
                <div key={key} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2 flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 truncate">{RESOURCE_LABELS[key] || key}</p>
                    <p className="text-xs text-white font-mono font-medium">{(data.resources as any)[key] ?? 0}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, rank }: { icon: React.ElementType; label: string; value: string; color: string; rank: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 ${color}`} />
        <span className="text-[9px] text-slate-500">{label}</span>
      </div>
      <p className="text-[11px] text-white font-mono font-medium">{value}</p>
      <p className="text-[9px] text-slate-600">Rang {rank}</p>
    </div>
  );
}

function FinCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 ${color}`} />
        <span className="text-[9px] text-slate-500">{label}</span>
      </div>
      <p className="text-[11px] text-white font-mono font-medium">{value} Cr</p>
    </div>
  );
}
