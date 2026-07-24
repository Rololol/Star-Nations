"use client";

import { useState, useEffect, useCallback } from "react";
import GalaxyMap, { type StarData } from "@/components/GalaxyMap";
import StarDetail from "@/components/StarDetail";
import MarketPanel from "@/components/MarketPanel";
import FleetPanel from "@/components/FleetPanel";
import ProfilePanel from "@/components/ProfilePanel";
import CompanyPanel from "@/components/CompanyPanel";
import SettingsPanel from "@/components/SettingsPanel";
import TopHUD from "@/components/TopHUD";
import LeftRail from "@/components/LeftRail";
import BottomBar from "@/components/BottomBar";
import { Loader } from "lucide-react";

interface UserInfo {
  userId: number; displayName: string; factionId: number; factionName: string;
}
interface ResourceData {
  credits: number; titan_erz: number; deuterium: number; seltene_erden: number;
  titan_legierung: number; deuterium_zellen: number; mikro_prozessoren: number;
  quanten_kerne: number; schiffshuellen: number; plasma_waffen: number;
  energy: number; controlledStars: number; arrivedFleets: number;
  earnedThisTick: { minerals: number; energy: number };
  miningPerMinute: number; energyPerMinute: number;
  minerals?: number; alloys?: number;
}

type PanelType = "market" | "fleet" | "profile" | "company" | "settings" | null;

export default function DashboardContent({ user }: { user: UserInfo }) {
  const [stars, setStars] = useState<StarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStarId, setSelectedStarId] = useState<number | null>(null);
  const [resources, setResources] = useState<ResourceData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [movingFleetId, setMovingFleetId] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [navActiveId, setNavActiveId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stars").then((r) => r.json()).then(setStars).finally(() => setLoading(false));
  }, [refreshKey]);

  const fetchResources = useCallback(async () => {
    try { const res = await fetch("/api/resources"); const data = await res.json(); if (res.ok) setResources(data); } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchResources(); const interval = setInterval(fetchResources, 30000); return () => clearInterval(interval); }, [fetchResources, refreshKey]);

  const controlledStarsList = stars.filter(s => s.controllerId === user.userId).map(s => ({ id: s.id, name: s.name }));
  const selectedStar = stars.find((s) => s.id === selectedStarId) ?? null;

  function handleStarChanged() { setRefreshKey((k) => k + 1); setSelectedStarId(null); setMovingFleetId(null); fetchResources(); }
  function handleSelectStar(starId: number) {
    if (movingFleetId !== null) { handleMoveFleet(movingFleetId, starId); setMovingFleetId(null); return; }
    setSelectedStarId(starId); setActivePanel(null); setNavActiveId(null);
  }
  async function handleMoveFleet(fleetId: number, destStarId: number) {
    const res = await fetch(`/api/fleets/${fleetId}/move`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destinationStarId: destStarId }) });
    if (res.ok) { setRefreshKey((k) => k + 1); setSelectedStarId(null); setMovingFleetId(null); fetchResources(); }
  }

  function togglePanel(panel: PanelType) {
    setActivePanel(prev => prev === panel ? null : panel);
    setNavActiveId(null);
    if (panel === "profile") setProfileUserId(user.userId);
    else setProfileUserId(null);
    setSelectedStarId(null);
    setSelectedCompanyId(null);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  // Unified nav handler: maps nav IDs to panels or future features
  function handleNavOpen(id: string) {
    // Panel items: delegate to togglePanel which handles its own state
    if (id === "market" || id === "fleet" || id === "company" || id === "profile" || id === "options") {
      togglePanel(id === "options" ? "settings" : (id as PanelType));
      return;
    }
    // Non-panel items: just toggle nav highlight
    setNavActiveId(prev => prev === id ? null : id);
    setActivePanel(null);
    setSelectedStarId(null);
  }

  const activeNavOrPanel = navActiveId || activePanel;

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-[#0b0f19]">
      <div className="flex flex-col items-center gap-3">
        <Loader className="w-8 h-8 text-cyan-400 animate-spin"/>
        <span className="text-sm text-slate-500">Lade Galaxisdaten...</span>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] overflow-hidden">
      {/* TOP HUD */}
      <TopHUD user={user} onOpenProfile={() => togglePanel("profile")} onLogout={handleLogout} />

      <div className="flex-1 flex min-h-0">
        {/* LEFT RAIL - all navigation */}
        <div className="flex-shrink-0 flex flex-col justify-start border-r border-cyan-500/10 py-1 overflow-y-auto">
          <LeftRail onOpenPanel={handleNavOpen} activePanel={activeNavOrPanel} />
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex min-w-0 p-1">
          <div className="flex-1 min-w-0">
            <GalaxyMap stars={stars} selectedStarId={selectedStarId} onSelectStar={handleSelectStar} movingFleetId={movingFleetId}/>
          </div>

          {/* RIGHT SIDE PANEL */}
          <div className="flex-shrink-0 w-80 min-h-0 overflow-y-auto border-l border-cyan-500/10">
            {selectedStar && activePanel === null && navActiveId === null && (
              <StarDetail star={selectedStar} onClose={() => { setSelectedStarId(null); setMovingFleetId(null); }}
                userId={user.userId} factionId={user.factionId} onStarChanged={handleStarChanged}
                movingFleetId={movingFleetId} onMoveFleet={handleMoveFleet}/>
            )}
            {activePanel === "market" && <MarketPanel onClose={() => setActivePanel(null)}/>}
            {activePanel === "fleet" && <FleetPanel onClose={() => setActivePanel(null)} onSelectFleetForMove={setMovingFleetId} selectedFleetId={movingFleetId}/>}
            {activePanel === "company" && <CompanyPanel myStars={controlledStarsList} initialCompanyId={selectedCompanyId ?? undefined} onClose={() => { setActivePanel(null); setSelectedCompanyId(null); }}/>}
            {activePanel === "profile" && profileUserId && <ProfilePanel userId={profileUserId} onClose={() => setActivePanel(null)} onOpenCompany={(companyId: number) => { setSelectedCompanyId(companyId); togglePanel("company"); }}/>}
            {activePanel === "settings" && <SettingsPanel displayName={user.displayName} onClose={() => setActivePanel(null)}/>}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="flex-shrink-0 border-t border-cyan-500/10 bg-slate-900/50 backdrop-blur-sm">
        <BottomBar onOpenPanel={handleNavOpen} activePanel={activeNavOrPanel} />
      </div>
    </div>
  );
}
