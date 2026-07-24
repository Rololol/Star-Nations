"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, Loader, Building2, ArrowUp, ArrowDown, Briefcase, Minus, Users,
  Factory, BatteryFull, HardDrive, Hammer, ChevronRight, Edit3, Trash2,
  Search, MapPin, MoveRight, Wrench, Diamond, Flame, Gem, Zap, Shield, Rocket,
} from "lucide-react";
import { RESOURCE_LABELS } from "@/lib/factories";

interface StarInfo { id: number; name: string; resources?: string; }
interface Employee {
  id: number; workerId: number; wagePerPP: number; totalProduced: number;
  worker: { id: number; displayName: string };
  createdAt: string;
}
interface Company {
  id: number; name: string; ownerId: number;
  reactorLevel: number; storageLevel: number; currentPP: number;
  companyType: string; wagePerPP: number; createdAt: string;
  star: StarInfo;
  employees: Employee[];
}
interface BrowseCompany {
  id: number; name: string; ownerName: string; starName: string;
  reactorLevel: number; storageLevel: number; employeeCount: number;
  companyType?: string; wagePerPP?: number;
  isEmployed: boolean;
}

const COMPANY_TYPES: { key: string; icon: React.ElementType; label: string; color: string; bgColor: string }[] = [
  { key: "titan_erz", icon: Diamond, label: "Titan-Erz", color: "text-slate-300", bgColor: "bg-slate-500/20" },
  { key: "deuterium", icon: Flame, label: "Deuterium", color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  { key: "seltene_erden", icon: Gem, label: "Seltene Erden", color: "text-pink-400", bgColor: "bg-pink-500/20" },
  { key: "energy", icon: Zap, label: "Energie", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  { key: "titan_legierung", icon: Shield, label: "Titan-Legierung", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  { key: "schiffshuellen", icon: Rocket, label: "Schiffshüllen", color: "text-orange-400", bgColor: "bg-orange-500/20" },
];

const STORAGE_CAPACITY: Record<number, number> = { 1:200,2:400,3:600,4:800,5:1000,6:1200,7:1400 };
const REACTOR_PP: Record<number, number> = { 1:1,2:2,3:3,4:4,5:5,6:6,7:7 };
const REACTOR_COSTS: Record<number, number> = { 2:20,3:40,4:80,5:160,6:320,7:640 };
const STORAGE_COSTS: Record<number, number> = { 2:10,3:20,4:40,5:80,6:160,7:320 };
const RECIPES: Record<string,{label:string;ppCost:number;input:Record<string,number>;outputKey:string;outputAmount:number}> = {
  titan_erz:{label:"Mineralien",ppCost:1,input:{},outputKey:"titan_erz",outputAmount:1},
  energy:{label:"Energie",ppCost:1,input:{},outputKey:"energy",outputAmount:1},
  titan_legierung:{label:"Legierung",ppCost:10,input:{titan_erz:10},outputKey:"titan_legierung",outputAmount:1},
  schiffshuellen:{label:"Schiffsteil",ppCost:20,input:{titan_legierung:1},outputKey:"schiffshuellen",outputAmount:1},
};

function getTypeInfo(key: string) { return COMPANY_TYPES.find(t => t.key === key) || COMPANY_TYPES[0]; }

type TabMode = "my" | "browse";

export default function CompanyPanel({ myStars, onClose, initialCompanyId }: { myStars: { id: number; name: string }[]; onClose: () => void; initialCompanyId?: number }) {
  const [tab, setTab] = useState<TabMode>("my");
  const [data, setData] = useState<{ companies: Company[]; maxCompanies: number; stats: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyStarId, setNewCompanyStarId] = useState<number>(myStars[0]?.id ?? 0);
  const [newCompanyType, setNewCompanyType] = useState<string>("titan_erz");
  const [editName, setEditName] = useState<string | null>(null);
  const [produceRecipe, setProduceRecipe] = useState<string>("titan_erz");
  const [produceAmount, setProduceAmount] = useState<number>(1);
  const [wageInput, setWageInput] = useState<string>("1");
  const [moveStarId, setMoveStarId] = useState<number>(myStars[0]?.id ?? 0);
  const [editType, setEditType] = useState(false);
  const initialSelectDone = useRef(false);

  const [browseCompanies, setBrowseCompanies] = useState<BrowseCompany[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (initialCompanyId && !initialSelectDone.current) {
          const target = d.companies.find((c: Company) => c.id === initialCompanyId);
          if (target) { setSelectedCompany(target); initialSelectDone.current = true; }
        }
        if (selectedCompany) {
          const updated = d.companies.find((c: Company) => c.id === selectedCompany.id);
          if (updated) setSelectedCompany(updated);
        }
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!selectedCompany || !data) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/companies/${selectedCompany.id}`);
        if (res.ok) {
          const c = await res.json();
          setSelectedCompany(c);
          setData(prev => prev ? { ...prev, companies: prev.companies.map(x => x.id === c.id ? c : x) } : prev);
        }
      } catch { /* silent */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedCompany?.id]);

  const fetchBrowse = async () => {
    setBrowseLoading(true);
    try {
      const res = await fetch("/api/companies/browse");
      if (res.ok) { const d = await res.json(); setBrowseCompanies(d.companies || []); }
    } catch { /* silent */ }
    setBrowseLoading(false);
  };
  useEffect(() => { if (tab === "browse") fetchBrowse(); }, [tab]);

  async function handleCreate() {
    setError(null);
    const res = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCompanyName || "Meine Firma", starId: newCompanyStarId, companyType: newCompanyType }) });
    const d = await res.json();
    if (res.ok) { setShowNewForm(false); setNewCompanyName(""); setNewCompanyType("titan_erz"); fetchData(); } else setError(d.error);
  }

  async function handleUpgradeReactor(id: number) { setError(null); setSuccessMsg(null); const res = await fetch(`/api/companies/${id}/upgrade/reactor`, { method: "POST" }); const d = await res.json(); if (res.ok) { setSuccessMsg(`Reaktor auf Lv.${d.reactorLevel}`); fetchData(); } else setError(d.error); }
  async function handleDowngradeReactor(id: number) { setError(null); setSuccessMsg(null); const res = await fetch(`/api/companies/${id}/downgrade/reactor`, { method: "POST" }); const d = await res.json(); if (res.ok) { setSuccessMsg(`Reaktor auf Lv.${d.reactorLevel} (${d.refund} Legierung zurück)`); fetchData(); } else setError(d.error); }
  async function handleUpgradeStorage(id: number) { setError(null); setSuccessMsg(null); const res = await fetch(`/api/companies/${id}/upgrade/storage`, { method: "POST" }); const d = await res.json(); if (res.ok) { setSuccessMsg(`Speicher auf Lv.${d.storageLevel}`); fetchData(); } else setError(d.error); }
  async function handleDowngradeStorage(id: number) { setError(null); setSuccessMsg(null); const res = await fetch(`/api/companies/${id}/downgrade/storage`, { method: "POST" }); const d = await res.json(); if (res.ok) { setSuccessMsg(`Speicher auf Lv.${d.storageLevel} (${d.refund} Legierung zurück)`); fetchData(); } else setError(d.error); }
  async function handleWork(id: number) { setError(null); setSuccessMsg(null); const res = await fetch(`/api/companies/${id}/work`, { method: "POST" }); const d = await res.json(); if (res.ok) { setSuccessMsg(`${d.ppProduced} PP produziert!`); fetchData(); if (d.stats && data) setData({ ...data, stats: d.stats }); } else setError(d.error); }
  async function handleJoin(id: number) { setError(null); setSuccessMsg(null); const res = await fetch(`/api/companies/${id}/join`, { method: "POST" }); const d = await res.json(); if (res.ok) { setSuccessMsg(`${d.ppProduced} PP! +${d.wageEarned} Cr`); fetchData(); fetchBrowse(); if (d.stats && data) setData({ ...data, stats: d.stats }); } else setError(d.error); }
  async function handleProduce(id: number) { setError(null); setSuccessMsg(null); const res = await fetch(`/api/companies/${id}/produce`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipe: produceRecipe, amount: produceAmount }) }); const d = await res.json(); if (res.ok) { setSuccessMsg(`${d.outputAmount} ${RESOURCE_LABELS[d.recipe] || d.recipe}! (+${d.bonusPercent}%)`); fetchData(); } else setError(d.error); }
  async function handleFireEmployee(cid: number, eid: number) { const res = await fetch(`/api/companies/${cid}/employees/${eid}`, { method: "DELETE" }); if (res.ok) fetchData(); }
  async function handleRename(id: number) { if (!editName) return; const res = await fetch(`/api/companies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName }) }); if (res.ok) { setEditName(null); fetchData(); } }
  async function handleDelete(id: number) { if (!confirm("Firma wirklich löschen?")) return; const res = await fetch(`/api/companies/${id}`, { method: "DELETE" }); if (res.ok) { setSelectedCompany(null); fetchData(); } }
  async function handleSetWage(id: number) { setError(null); setSuccessMsg(null); const res = await fetch(`/api/companies/${id}/wage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wagePerPP: parseFloat(wageInput) }) }); const d = await res.json(); if (res.ok) { setSuccessMsg(`Lohn auf ${d.wagePerPP} Cr/PP`); fetchData(); } else setError(d.error); }
  async function handleMove(id: number) { setError(null); setSuccessMsg(null); if (moveStarId === selectedCompany?.star?.id) { setError("Firma ist bereits auf diesem Planeten."); return; } const res = await fetch(`/api/companies/${id}/move`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetStarId: moveStarId }) }); const d = await res.json(); if (res.ok) { setSuccessMsg(`Firma nach ${d.company.star.name} verschoben`); fetchData(); } else setError(d.error); }
  async function handleChangeType(id: number, newType: string) { setError(null); const res = await fetch(`/api/companies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyType: newType }) }); if (res.ok) { setEditType(false); fetchData(); } else setError(res.statusText); }

  const maxPP = selectedCompany ? (STORAGE_CAPACITY[selectedCompany.storageLevel] || 200) : 200;
  const ppPercent = selectedCompany ? Math.min((selectedCompany.currentPP / maxPP) * 100, 100) : 0;

  if (selectedCompany) {
    const ti = getTypeInfo(selectedCompany.companyType);
    return (
      <div className="glass w-80 p-0 overflow-hidden border-slate-700/30 flex flex-col max-h-full panel-slide">
        <div className="p-2.5 border-b border-slate-700/30 bg-slate-800/40 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setSelectedCompany(null)} className="flex items-center gap-1 text-slate-400 hover:text-white text-xs"><ChevronRight className="w-3.5 h-3.5 rotate-180" /> Zurück</button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-lg ${ti.bgColor} flex items-center justify-center`}>
                <ti.icon className={`w-4 h-4 ${ti.color}`} />
              </div>
              {editName !== null ? (
                <form onSubmit={(e) => { e.preventDefault(); handleRename(selectedCompany.id); }} className="flex items-center gap-1">
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="bg-black/30 border border-slate-700/50 rounded px-2 py-0.5 text-xs text-white w-28" />
                  <button type="submit" className="text-cyan-400 text-xs">OK</button>
                </form>
              ) : (
                <button onClick={() => setEditName(selectedCompany.name)} className="text-white font-medium text-sm hover:text-cyan-400 flex items-center gap-1">
                  {selectedCompany.name}<Edit3 className="w-3 h-3 text-slate-500" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => handleDelete(selectedCompany.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 text-xs">
          {error && <MsgBox type="error" msg={error} onClose={() => setError(null)} />}
          {successMsg && <MsgBox type="success" msg={successMsg} onClose={() => setSuccessMsg(null)} />}

          {/* Resource Type */}
          <Card>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded ${ti.bgColor} flex items-center justify-center`}>
                  <ti.icon className={`w-3.5 h-3.5 ${ti.color}`} />
                </div>
                <span className="text-slate-300">{ti.label}</span>
              </div>
              <span className="text-[10px] text-slate-500"><MapPin className="w-3 h-3 inline mr-0.5" />{selectedCompany.star?.name}</span>
            </div>
            {editType && (
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {COMPANY_TYPES.map(ct => (
                  <button key={ct.key} onClick={() => handleChangeType(selectedCompany.id, ct.key)}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[10px] transition-all ${
                      selectedCompany.companyType === ct.key ? "ring-1 ring-cyan-400/50 bg-cyan-500/10" : "bg-slate-800/40 hover:bg-slate-800/60"
                    }`}>
                    <ct.icon className={`w-4 h-4 ${ct.color}`} />
                    <span className="text-slate-400 leading-tight text-center">{ct.label}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setEditType(!editType)} className="mt-1.5 text-[9px] text-cyan-400 hover:text-cyan-300">Typ ändern</button>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5"><Factory className="w-3.5 h-3.5 text-orange-400" /><span className="text-slate-300">Reaktor Lv.{selectedCompany.reactorLevel}/7</span></div>
              <span className="text-cyan-400 font-mono">{REACTOR_PP[selectedCompany.reactorLevel]} PP/h</span>
            </div>
            <div className="flex gap-1">
              {selectedCompany.reactorLevel < 7 && <button onClick={() => handleUpgradeReactor(selectedCompany.id)} className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20"><ArrowUp className="w-3 h-3" />Upgrade ({REACTOR_COSTS[selectedCompany.reactorLevel+1]} Leg)</button>}
              {selectedCompany.reactorLevel > 1 && <button onClick={() => handleDowngradeReactor(selectedCompany.id)} className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 border border-slate-700/30"><ArrowDown className="w-3 h-3" />Downgrade</button>}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-purple-400" /><span className="text-slate-300">Speicher Lv.{selectedCompany.storageLevel}/7</span></div>
              <span className="text-slate-400 font-mono">{selectedCompany.currentPP.toFixed(1)}/{maxPP} PP</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1.5">
              <div className="h-full bg-gradient-to-r from-cyan-600 to-purple-500 rounded-full transition-all" style={{ width: `${ppPercent}%` }} />
            </div>
            <div className="flex gap-1">
              {selectedCompany.storageLevel < 7 && <button onClick={() => handleUpgradeStorage(selectedCompany.id)} className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20"><ArrowUp className="w-3 h-3" />Upgrade ({STORAGE_COSTS[selectedCompany.storageLevel+1]} Leg)</button>}
              {selectedCompany.storageLevel > 1 && <button onClick={() => handleDowngradeStorage(selectedCompany.id)} className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 border border-slate-700/30"><ArrowDown className="w-3 h-3" />Downgrade</button>}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-1.5 mb-1.5"><Hammer className="w-3.5 h-3.5 text-amber-400" /><span className="text-slate-300">Eigenarbeit</span></div>
            <div className="text-[10px] text-slate-500 mb-1.5">10 Entrepreneurship → {12 + (data?.stats?.production || 0)} PP</div>
            <button onClick={() => handleWork(selectedCompany.id)} disabled={ppPercent >= 100} className="w-full py-1.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 disabled:opacity-30">ARBEITEN</button>
          </Card>

          <Card>
            <div className="flex items-center gap-1.5 mb-1.5"><Wrench className="w-3.5 h-3.5 text-blue-400" /><span className="text-slate-300">Lohn ({selectedCompany.wagePerPP || 1} Cr/PP)</span></div>
            <div className="flex gap-1.5">
              <input type="number" min={0} step={0.5} value={wageInput} onChange={e => setWageInput(e.target.value)} className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1 text-xs text-white" />
              <button onClick={() => handleSetWage(selectedCompany.id)} className="px-3 py-1 rounded text-[10px] bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20">Setzen</button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-1.5 mb-1.5"><MoveRight className="w-3.5 h-3.5 text-green-400" /><span className="text-slate-300">Verschieben (5 Legierung)</span></div>
            <div className="flex gap-1.5">
              <select value={moveStarId} onChange={e => setMoveStarId(parseInt(e.target.value))} className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1 text-xs text-white">{myStars.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <button onClick={() => handleMove(selectedCompany.id)} className="px-3 py-1 rounded text-[10px] bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20">Move</button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-1.5 mb-1.5"><Users className="w-3.5 h-3.5 text-blue-400" /><span className="text-slate-300">Angestellte ({selectedCompany.employees.length})</span></div>
            {selectedCompany.employees.length === 0 ? <div className="text-[10px] text-slate-600 italic">Keine Angestellten.</div> : (
              <div className="space-y-1">
                {selectedCompany.employees.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between bg-slate-800/40 rounded p-1.5">
                    <div><div className="text-[11px] text-white">{emp.worker.displayName}</div><div className="text-[9px] text-slate-500">{emp.wagePerPP} Cr/PP · {emp.totalProduced} PP</div></div>
                    <button onClick={() => handleFireEmployee(selectedCompany.id, emp.id)} className="p-1 text-slate-600 hover:text-red-400"><Minus className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-1.5 mb-1.5"><BatteryFull className="w-3.5 h-3.5 text-green-400" /><span className="text-slate-300">Produzieren</span></div>
            <div className="flex gap-1.5 mb-1.5">
              <select value={produceRecipe} onChange={e => setProduceRecipe(e.target.value)} className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1 text-xs text-white">{Object.entries(RECIPES).map(([key, r]) => (<option key={key} value={key}>{r.label} ({r.ppCost} PP)</option>))}</select>
              <input type="number" min={1} max={100} value={produceAmount} onChange={e => setProduceAmount(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1 text-xs text-white text-center" />
            </div>
            <button onClick={() => handleProduce(selectedCompany.id)} disabled={selectedCompany.currentPP < RECIPES[produceRecipe].ppCost * produceAmount} className="w-full py-1.5 rounded text-xs font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30 disabled:opacity-30">PRODUZIEREN ({RECIPES[produceRecipe].ppCost * produceAmount} PP)</button>
          </Card>
        </div>
      </div>
    );
  }

  if (tab === "browse") {
    return (
      <div className="glass w-80 p-0 overflow-hidden border-slate-700/30 flex flex-col max-h-full panel-slide">
        <div className="p-2.5 border-b border-slate-700/30 bg-slate-800/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2"><Search className="w-4 h-4 text-cyan-400" /><span className="text-sm font-medium text-white">Jobs finden</span></div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setTab("my")} className="text-[10px] text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-500/10">Meine Firmen</button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 text-xs">
          {error && <MsgBox type="error" msg={error} onClose={() => setError(null)} />}
          {successMsg && <MsgBox type="success" msg={successMsg} onClose={() => setSuccessMsg(null)} />}
          {browseLoading ? <div className="flex justify-center py-8"><Loader className="w-5 h-5 text-cyan-400 animate-spin" /></div> :
           browseCompanies.length === 0 ? <div className="text-center py-8 text-slate-500 text-xs">Keine Firmen verfügbar.</div> :
           browseCompanies.map(c => {
             const bti = getTypeInfo(c.companyType || "titan_erz");
             return (
               <div key={c.id} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2.5">
                 <div className="flex items-start gap-2 mb-1">
                   <div className={`w-8 h-8 rounded-lg ${bti.bgColor} flex items-center justify-center flex-shrink-0`}><bti.icon className={`w-4 h-4 ${bti.color}`} /></div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between">
                       <div>
                         <span className="text-white text-[11px] font-medium">{c.name}</span>
                         <span className="text-slate-500 text-[10px] ml-1">von {c.ownerName}</span>
                       </div>
                       <span className="text-[9px] text-slate-600">{c.starName}</span>
                     </div>
                     <div className="flex items-center justify-between mt-0.5">
                       <div className="text-[9px] text-slate-500">{bti.label} · R Lv.{c.reactorLevel} · {c.wagePerPP || 1} Cr/PP · {c.employeeCount} Ang.</div>
                       <button onClick={() => handleJoin(c.id)} disabled={c.isEmployed}
                         className="px-3 py-1 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed ml-2 flex-shrink-0">
                         {c.isEmployed ? "Angestellt" : "Arbeiten"}
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  }

  const companyCount = data?.companies.length ?? 0;
  const maxCompanies = data?.maxCompanies ?? 1;

  return (
    <div className="glass w-80 p-0 overflow-hidden border-slate-700/30 flex flex-col max-h-full panel-slide">
      <div className="p-2.5 border-b border-slate-700/30 bg-slate-800/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-cyan-400" /><span className="text-sm font-medium text-white">Meine Firmen</span><span className="text-[10px] text-slate-500">({companyCount}/{maxCompanies})</span></div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setTab("browse"); fetchBrowse(); }} className="text-[10px] text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-500/10">Jobs</button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 text-xs">
        {error && <MsgBox type="error" msg={error} onClose={() => setError(null)} />}
        {successMsg && <MsgBox type="success" msg={successMsg} onClose={() => setSuccessMsg(null)} />}
        {data?.stats && (
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2 space-y-0.5">
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">Entrepreneurship</span><span className="text-white font-mono">{data.stats.entrepreneurship}/{data.stats.maxEntrepreneurship}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">Energie</span><span className="text-white font-mono">{data.stats.statEnergy}/{data.stats.maxStatEnergy}</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-slate-500">Production</span><span className="text-white font-mono">Lv.{data.stats.production}</span></div>
          </div>
        )}
        {loading ? <div className="flex justify-center py-8"><Loader className="w-5 h-5 text-cyan-400 animate-spin" /></div> : (
          <>
            {data?.companies.map((c) => {
              const cm = STORAGE_CAPACITY[c.storageLevel] || 200;
              const cp = Math.min((c.currentPP / cm) * 100, 100);
              const cti = getTypeInfo(c.companyType);
              return (
                <button key={c.id} onClick={() => setSelectedCompany(c)}
                  className="w-full bg-slate-800/40 border border-slate-700/30 hover:border-cyan-500/30 rounded-lg p-2.5 text-left transition-all">
                  <div className="flex items-start gap-2">
                    <div className={`w-9 h-9 rounded-lg ${cti.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <cti.icon className={`w-5 h-5 ${cti.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-white text-[11px] font-medium truncate">{c.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 ml-1" />
                      </div>
                      <div className="text-[9px] text-slate-500 mb-1">{cti.label} · {c.star.name} · R Lv.{c.reactorLevel} · S Lv.{c.storageLevel}</div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-1">
                        <div className="h-full bg-gradient-to-r from-cyan-600 to-purple-500 rounded-full" style={{ width: `${cp}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-500 font-mono">{c.currentPP.toFixed(1)}/{cm} PP</span>
                        <span className="text-slate-600">{c.employees.length} Ang. · {c.wagePerPP || 1} Cr/PP</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {data && data.companies.length === 0 && <div className="text-center py-4 text-slate-500 text-xs">Keine Firmen.</div>}
          </>
        )}
        {showNewForm ? (
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2.5 space-y-2">
            <div className="text-xs text-slate-400">Neue Firma (100 Legierung)</div>
            <input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="Firmenname" className="w-full bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1 text-xs text-white" />
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Ressource</div>
              <div className="grid grid-cols-3 gap-1.5">
                {COMPANY_TYPES.map(ct => (
                  <button key={ct.key} onClick={() => setNewCompanyType(ct.key)}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[10px] transition-all ${
                      newCompanyType === ct.key ? "ring-1 ring-cyan-400/50 bg-cyan-500/10" : "bg-slate-800/60 hover:bg-slate-800/80"
                    }`}>
                    <ct.icon className={`w-4 h-4 ${ct.color}`} />
                    <span className="text-slate-400 leading-tight text-center">{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <select value={newCompanyStarId} onChange={e => setNewCompanyStarId(parseInt(e.target.value))} className="w-full bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1 text-xs text-white">{myStars.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 py-1 rounded text-xs bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/30">Gründen</button>
              <button onClick={() => setShowNewForm(false)} className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white border border-slate-700/30">Abbrechen</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewForm(true)} disabled={companyCount >= maxCompanies}
            className="w-full py-2 rounded-lg text-xs bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-dashed border-cyan-500/30 disabled:opacity-40">
            <Briefcase className="w-3.5 h-3.5 inline mr-1" />Neue Firma {companyCount > 0 && "(100 Legierung)"}
          </button>
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) { return <div className="bg-slate-800/30 border border-slate-700/20 rounded-lg p-2.5">{children}</div>; }
function MsgBox({ type, msg, onClose }: { type: string; msg: string; onClose: () => void }) {
  return <div className={`rounded p-2 text-[11px] ${type === "error" ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-green-500/10 border border-green-500/20 text-green-400"}`}>{msg}<button onClick={onClose} className="float-right opacity-70 hover:opacity-100">✕</button></div>;
}
