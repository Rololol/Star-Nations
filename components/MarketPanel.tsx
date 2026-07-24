"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader, Plus, X, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { RESOURCE_LABELS } from "@/lib/factories";

interface TradeOffer {
  id: number; sellerId: number; buyerId: number | null;
  seller: { id: number; displayName: string; factionId: number };
  buyer: { id: number; displayName: string; factionId: number } | null;
  resourceType: string; amount: number; pricePerUnit: number;
  remaining: number; isBuyOrder: boolean; status: string;
}
interface HistoryEntry {
  id: number; resourceType: string; amount: number; pricePerUnit: number; totalPrice: number;
  sellerId: number; buyerId: number; taxPaid: number; createdAt: string;
}

const typeColors: Record<string, string> = {
  titan_erz: "text-slate-300", titan_legierung: "text-slate-200",
  deuterium: "text-cyan-400", deuterium_zellen: "text-cyan-300",
  seltene_erden: "text-amber-300", mikro_prozessoren: "text-amber-200",
  quanten_kerne: "text-purple-400", schiffshuellen: "text-blue-300", plasma_waffen: "text-red-400",
  credits: "text-yellow-400", energy: "text-green-400",
};

export default function MarketPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"market" | "mine" | "history" | "jobs">("market");
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [myOffers, setMyOffers] = useState<TradeOffer[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [jobOffers, setJobOffers] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [sellType, setSellType] = useState("titan_erz");
  const [sellAmount, setSellAmount] = useState(10);
  const [sellPrice, setSellPrice] = useState(5);
  const [isBuyOrder, setIsBuyOrder] = useState(false);
  const [buyQty, setBuyQty] = useState<Record<number, number>>({});
  const [filterCat, setFilterCat] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [offersRes, myRes, histRes, jobsRes] = await Promise.all([
      fetch("/api/market?filter=all"), fetch("/api/market?filter=my"), fetch("/api/market/history"), fetch("/api/jobs"),
    ]);
    setOffers(await offersRes.json()); setMyOffers(await myRes.json()); setHistory(await histRes.json());
    const jData = await jobsRes.json(); setJobOffers(jData.offers || []); setMyJobs(jData.myJobs || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCancel(offerId: number) {
    await fetch("/api/market", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId }) });
    fetchData();
  }

  async function handleCreate() {
    setError(null);
    const res = await fetch("/api/market", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType: sellType, amount: sellAmount, pricePerUnit: sellPrice, isBuyOrder }),
    });
    const data = await res.json();
    if (res.ok) { setShowCreate(false); fetchData(); } else setError(data.error);
  }

  async function handleAccept(offerId: number) {
    const qty = buyQty[offerId] || 1;
    const res = await fetch("/api/market/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId, quantity: qty }) });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    fetchData();
  }

  const filteredOffers = filterCat === "all" ? offers : offers.filter(o => {
    if (filterCat === "t1") return ["titan_erz","deuterium","seltene_erden"].includes(o.resourceType);
    if (filterCat === "t2") return ["titan_legierung","deuterium_zellen","mikro_prozessoren"].includes(o.resourceType);
    if (filterCat === "t3") return ["quanten_kerne","schiffshuellen","plasma_waffen"].includes(o.resourceType);
    return true;
  });

  const avgPrices: Record<string, { prices: number[] }> = {};
  for (const h of history) {
    if (!avgPrices[h.resourceType]) avgPrices[h.resourceType] = { prices: [] };
    avgPrices[h.resourceType].prices.push(h.pricePerUnit);
  }

  return (
    <div className="glass w-80 p-0 overflow-hidden border-white/10 flex flex-col max-h-full">
      <div className="px-5 py-3 flex items-center justify-between border-b border-white/5">
        <h2 className="text-sm font-semibold text-white">Handelsmarkt</h2>
        <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10"><X className="w-3.5 h-3.5"/></button>
      </div>

      <div className="flex border-b border-white/5 text-xs">
        {(["market","mine","history","jobs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-center ${tab===t?"text-white border-b border-cyan-400":"text-gray-600"}`}>
            {t==="market"?"Marktplatz":t==="mine"?"Meine":"Historie"}
          </button>
        ))}
      </div>

      {error && <div className="px-3 pt-2"><p className="text-red-400 text-xs">{error}</p></div>}

      {tab === "market" && (
        <div className="p-2 space-y-2 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input-field text-[10px] py-1 w-24">
              <option value="all">Alle</option><option value="t1">Tier 1</option><option value="t2">Tier 2</option><option value="t3">Tier 3</option>
            </select>
            <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-cyan-400 hover:bg-cyan-500/10"><Plus className="w-3 h-3"/>Neu</button>
          </div>

          {showCreate && (
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex gap-1"><button onClick={() => setIsBuyOrder(false)} className={`flex-1 py-1 rounded text-[10px] ${!isBuyOrder?"bg-green-600 text-white":"bg-white/5 text-gray-500"}`}>Verkaufen</button><button onClick={() => setIsBuyOrder(true)} className={`flex-1 py-1 rounded text-[10px] ${isBuyOrder?"bg-blue-600 text-white":"bg-white/5 text-gray-500"}`}>Kaufen</button></div>
              <select value={sellType} onChange={e => setSellType(e.target.value)} className="input-field text-[10px] py-1 w-full">
                {Object.keys(RESOURCE_LABELS).filter(k => k !== "credits").map(k => <option key={k} value={k}>{RESOURCE_LABELS[k]}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="number" min={1} value={sellAmount} onChange={e => setSellAmount(Number(e.target.value))} placeholder="Menge" className="input-field text-[10px] py-1 flex-1"/>
                <input type="number" min={1} value={sellPrice} onChange={e => setSellPrice(Number(e.target.value))} placeholder="Cr/Stk" className="input-field text-[10px] py-1 flex-1"/>
              </div>
              <p className="text-[10px] text-gray-600">Gesamt: {sellAmount*sellPrice} Cr. · Steuer (5%): {Math.ceil(sellAmount*sellPrice*0.05)} Cr.</p>
              <button onClick={handleCreate} className="w-full py-1.5 rounded bg-cyan-600 text-white text-[10px]">Erstellen</button>
            </div>
          )}

          {loading ? <Loader className="w-4 h-4 animate-spin mx-auto mt-4"/> :
           filteredOffers.length === 0 ? <p className="text-gray-600 text-xs text-center py-4">Keine Angebote.</p> :
           filteredOffers.map(o => (
            <div key={o.id} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs">
              <div className="flex justify-between">
                <span className={o.isBuyOrder?"text-blue-400":"text-green-400"}>{o.isBuyOrder?"KAUFT":"VERKAUFT"}</span>
                <span className={typeColors[o.resourceType] || "text-gray-400"}>{o.remaining}/{o.amount} {RESOURCE_LABELS[o.resourceType]}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>{o.pricePerUnit} Cr/Stk</span><span>{o.seller.displayName}</span>
              </div>
              <div className="flex gap-1 mt-1">
                <input type="number" min={1} max={o.remaining} defaultValue={1} onChange={e => setBuyQty({...buyQty,[o.id]:Number(e.target.value)})} className="input-field text-[10px] py-1 w-16"/>
                <button onClick={() => handleAccept(o.id)} className="flex-1 py-1 rounded bg-cyan-600 text-white text-[10px]">Handeln</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "mine" && (
        <div className="p-2 space-y-2 overflow-y-auto flex-1">
          {myOffers.length === 0 ? <p className="text-gray-600 text-xs py-4">Keine eigenen Angebote.</p> :
           myOffers.map(o => (
            <div key={o.id} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs">
              <div className="flex justify-between">
                <span className={o.isBuyOrder?"text-blue-400":"text-green-400"}>{o.isBuyOrder?"KAUFE":"VERKAUFE"}</span>
                <span className="text-gray-400">{o.remaining}/{o.amount} {RESOURCE_LABELS[o.resourceType]} @ {o.pricePerUnit} Cr</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className={`text-[10px] ${o.status==="active"?"text-green-500":"text-red-500"}`}>{o.status==="active"?"Aktiv":o.status}</span>
                {o.status==="active" && <button onClick={() => handleCancel(o.id)} className="p-1 rounded text-red-400 hover:bg-red-500/10"><Trash2 className="w-3 h-3"/></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
          {history.length === 0 ? <p className="text-gray-600 text-xs py-4">Keine Historie.</p> :
           history.map(h => (
            <div key={h.id} className="p-1.5 rounded bg-white/[0.02] text-[10px] flex justify-between">
              <span>{h.amount} {RESOURCE_LABELS[h.resourceType]} @ {h.pricePerUnit} Cr</span>
              <span className="text-gray-600">{h.totalPrice} Cr · Steuer: {h.taxPaid}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "jobs" && (
        <div className="p-2 space-y-2 overflow-y-auto flex-1">
          <p className="text-[10px] text-gray-500 font-medium">Meine Anstellung</p>
          {myJobs.length === 0 ? <p className="text-gray-600 text-xs">Keine Anstellung.</p> :
           myJobs.map((j: any) => (
            <div key={j.id} className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs">
              <span className="text-white">{j.buildingName} @ {j.systemName}</span>
              <p className="text-[10px] text-gray-400">{j.hourlyWage} Cr/h</p>
            </div>
          ))}
          <p className="text-[10px] text-gray-500 font-medium mt-2">Stellenangebote</p>
          {jobOffers.length === 0 ? <p className="text-gray-600 text-xs">Keine Angebote.</p> :
           jobOffers.map((j: any) => (
            <div key={j.buildingId} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs">
              <div className="flex justify-between">
                <span className="text-white">{j.buildingName} Lvl {j.level}</span>
                <span className="text-cyan-400">{j.wage} Cr/h</span>
              </div>
              <p className="text-[10px] text-gray-500">{j.systemName} ({j.ownerName}) · {j.vacancies} Plätze frei</p>
              <button onClick={async () => {
                const res = await fetch("/api/jobs", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({buildingId:j.buildingId}) });
                if (res.ok) fetchData();
              }} className="mt-1 w-full py-1 rounded bg-cyan-600 text-white text-[10px]">Bewerben</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
