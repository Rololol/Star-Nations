"use client";

import { useState } from "react";
import { X, User, Settings, Monitor, Bell, Eye, Palette, Globe, Moon, Sun, Sliders, Shield } from "lucide-react";

type SettingsTab = "account" | "interface" | "display";

interface SettingsPanelProps {
  displayName: string;
  onClose: () => void;
}

export default function SettingsPanel({ displayName, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<SettingsTab>("account");
  const [darkMode, setDarkMode] = useState(true);
  const [effects, setEffects] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [lang, setLang] = useState("de");
  const [nebulaDensity, setNebulaDensity] = useState(50);
  const [hyperlanes, setHyperlanes] = useState(true);
  const [tooltips, setTooltips] = useState(true);

  return (
    <div className="glass w-80 p-0 overflow-hidden border-slate-700/30 flex flex-col max-h-full">
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Einstellungen</h2>
        </div>
        <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-slate-700/30 text-xs">
        {([
          { id: "account" as SettingsTab, icon: User, label: "Konto" },
          { id: "interface" as SettingsTab, icon: Sliders, label: "UI" },
          { id: "display" as SettingsTab, icon: Monitor, label: "Karte" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 transition-colors ${
              tab === t.id ? "text-cyan-400 border-b border-cyan-400 bg-cyan-500/5" : "text-slate-500 hover:text-slate-300"
            }`}>
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {tab === "account" && (
          <>
            <SettingsCard title="Konto">
              <SettingRow label="Benutzername" value={displayName} />
              <SettingRow label="Passwort" value="••••••••">
                <button className="text-cyan-400 hover:text-cyan-300 text-[10px]">Ändern</button>
              </SettingRow>
              <SettingRow label="E-Mail" value="admin@star-nations.local" />
            </SettingsCard>

            <SettingsCard title="Benachrichtigungen">
              <ToggleRow icon={Bell} label="Push-Nachrichten" checked={notifications} onChange={setNotifications} />
              <ToggleRow icon={Bell} label="Kampf-Berichte" checked={true} onChange={() => {}} />
              <ToggleRow icon={Bell} label="Handel-Updates" checked={true} onChange={() => {}} />
            </SettingsCard>

            <SettingsCard title="Sprache">
              <select value={lang} onChange={e => setLang(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1.5 text-xs text-white">
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </SettingsCard>
          </>
        )}

        {tab === "interface" && (
          <>
            <SettingsCard title="Theme">
              <div className="flex gap-2">
                <ThemeBtn icon={Moon} label="Dark" active={darkMode} onClick={() => setDarkMode(true)} />
                <ThemeBtn icon={Sun} label="Light" active={!darkMode} onClick={() => setDarkMode(false)} />
              </div>
            </SettingsCard>

            <SettingsCard title="Effekte">
              <ToggleRow icon={Palette} label="UI-Glow-Effekte" checked={effects} onChange={setEffects} />
              <ToggleRow icon={Eye} label="Animationen" checked={animations} onChange={setAnimations} />
              <ToggleRow icon={Palette} label="Partikel-Effekte" checked={true} onChange={() => {}} />
            </SettingsCard>

            <SettingsCard title="Panels">
              <ToggleRow icon={Monitor} label="Side-Panel Animation" checked={true} onChange={() => {}} />
              <ToggleRow icon={Monitor} label="Hover-Tooltips" checked={true} onChange={() => {}} />
            </SettingsCard>
          </>
        )}

        {tab === "display" && (
          <>
            <SettingsCard title="Sternenkarte">
              <div className="space-y-2">
                <div>
                  <label className="text-slate-500 text-[10px]">Nebel-Dichte ({nebulaDensity}%)</label>
                  <input type="range" min={0} max={100} value={nebulaDensity}
                    onChange={e => setNebulaDensity(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                               [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                               [&::-webkit-slider-thumb]:bg-cyan-500"/>
                </div>
                <ToggleRow icon={Eye} label="Hyperlanes anzeigen" checked={hyperlanes} onChange={setHyperlanes} />
                <ToggleRow icon={Eye} label="Planeten-Tooltips" checked={tooltips} onChange={setTooltips} />
                <ToggleRow icon={Globe} label="Fraktions-Ringe" checked={true} onChange={() => {}} />
              </div>
            </SettingsCard>

            <SettingsCard title="Zoom & Pan">
              <SettingRow label="Min. Zoom" value="0.2x" />
              <SettingRow label="Max. Zoom" value="4.0x" />
              <SettingRow label="Scroll-Sensitivität" value="Normal" />
            </SettingsCard>
          </>
        )}
      </div>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2.5">
      <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function SettingRow({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-500 text-[10px]">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-slate-300 text-[10px] font-mono">{value}</span>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, checked, onChange }: { icon: React.ElementType; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-slate-500" />
        <span className="text-slate-400 text-[10px]">{label}</span>
      </div>
      <button onClick={() => onChange(!checked)}
        className={`w-7 h-4 rounded-full transition-colors relative ${
          checked ? "bg-cyan-500" : "bg-slate-700"
        }`}>
        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${
          checked ? "left-3.5" : "left-0.5"
        }`} />
      </button>
    </div>
  );
}

function ThemeBtn({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] transition-all ${
        active ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" : "bg-slate-800/40 text-slate-500 border border-slate-700/30 hover:text-slate-300"
      }`}>
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}
