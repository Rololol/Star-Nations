"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Rocket,
  Mail,
  Lock,
  User,
  AlertCircle,
  Check,
} from "lucide-react";

interface Faction {
  id: number;
  name: string;
  lore: string;
  bonuses: string;
}

const FACTION_STYLES: Record<number, { color: string; glow: string }> = {
  1: { color: "#3B82F6", glow: "rgba(59,130,246,0.3)" },
  2: { color: "#10B981", glow: "rgba(16,185,129,0.3)" },
  3: { color: "#8B5CF6", glow: "rgba(139,92,246,0.3)" },
  4: { color: "#EF4444", glow: "rgba(239,68,68,0.3)" },
  5: { color: "#F59E0B", glow: "rgba(245,158,11,0.3)" },
};

export default function RegisterPage() {
  const router = useRouter();

  const [factions, setFactions] = useState<Faction[]>([]);
  const [selectedFaction, setSelectedFaction] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/factions")
      .then((r) => r.json())
      .then(setFactions)
      .catch(() => setError("Fehler beim Laden der Fraktionen."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedFaction) {
      setError("Bitte wähle eine Fraktion.");
      return;
    }
    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          displayName,
          password,
          factionId: selectedFaction,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registrierung fehlgeschlagen.");
        return;
      }

      // Auto-login after registration
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/login");
      }
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Rocket className="w-6 h-6 text-cyan-400" />
            <span className="text-lg font-bold gradient-text">
              STAR NATIONS
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Imperium gründen</h1>
          <p className="text-gray-400 text-sm">
            Wähle deine Fraktion und erstelle deinen Account.
          </p>
        </div>

        {/* Faction Selection */}
        <div className="mb-8">
          <label className="block text-sm text-gray-400 mb-3 text-center">
            Wähle deine Fraktion
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {factions.map((f) => {
              const style = FACTION_STYLES[f.id] || {
                color: "#6B7280",
                glow: "rgba(107,114,128,0.3)",
              };
              const selected = selectedFaction === f.id;
              const bonuses = JSON.parse(f.bonuses);

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFaction(f.id)}
                  className={`faction-card p-4 text-left relative ${
                    selected ? "faction-card-selected" : ""
                  }`}
                  style={
                    selected
                      ? {
                          borderColor: style.color,
                          boxShadow: `0 0 25px ${style.glow}`,
                        }
                      : undefined
                  }
                >
                  {selected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4 text-cyan-400" />
                    </div>
                  )}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-3"
                    style={{
                      backgroundColor: style.glow,
                      color: style.color,
                    }}
                  >
                    {f.name.charAt(0)}
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1">
                    {f.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2 leading-relaxed line-clamp-2">
                    {f.lore}
                  </p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full inline-block"
                    style={{
                      color: style.color,
                      backgroundColor: style.glow,
                    }}
                  >
                    {bonuses.trait}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="glass p-8">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Spielename
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-field pl-10"
                  placeholder="CommanderName"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                E-Mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="deine@email.de"
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-1.5">
              Passwort
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="Mindestens 6 Zeichen"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || factions.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Gründe Imperium …" : "Imperium gründen"}
            <Rocket className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Bereits registriert?{" "}
          <Link
            href="/login"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Jetzt einloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
