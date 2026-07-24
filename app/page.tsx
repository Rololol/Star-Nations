"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Rocket,
  Shield,
  Users,
  Globe,
  Zap,
  TrendingUp,
  ChevronRight,
  Star,
} from "lucide-react";

export default function LandingPage() {
  const [stars, setStars] = useState<
    { x: number; y: number; size: number; delay: number }[]
  >([]);

  useEffect(() => {
    const s = Array.from({ length: 120 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
    }));
    setStars(s);
  }, []);

  return (
    <div className="relative min-h-screen bg-gray-950 text-gray-200 overflow-hidden">
      {/* Animated star field background */}
      <div className="fixed inset-0 pointer-events-none">
        {stars.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: 0,
              ["--duration" as string]: `${2 + Math.random() * 3}s`,
              ["--delay" as string]: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Rocket className="w-7 h-7 text-cyan-400" />
          <span className="text-xl font-bold gradient-text">STAR NATIONS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="btn-glass text-sm px-5 py-2"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="btn-primary text-sm px-5 py-2"
          >
            Jetzt starten
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-20 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-cyan-500/20 text-sm text-cyan-300 mb-8">
          <Star className="w-4 h-4" />
          Neues Sci-Fi MMO — jetzt live
        </div>

        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          <span className="gradient-text text-glow">
            Die Galaxie gehört
          </span>
          <br />
          <span className="text-white">dem Eroberer.</span>
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mb-10 leading-relaxed">
          Wähle deine Fraktion, beherrsche 50 einzigartige Sternensysteme, baue
          mächtige Flotten und forme Allianzen. Ein persistentes
          Browser-Strategiespiel, inspiriert von den Klassikern — neu gedacht
          im Weltraum.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/register" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
            Spiel beitreten <ChevronRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="btn-glass text-lg px-8 py-4"
          >
            Einloggen
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 pb-24 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Globe className="w-6 h-6" />}
            title="50 Sternensysteme"
            desc="Erobere und kontrolliere Sternensysteme mit einzigartigen Ressourcen-Vorkommen. Jedes System zählt."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="5 Fraktionen"
            desc="Terraner, Vectis-Kollektiv, Onyx-Syndikat, Zyrion-Imperium oder Eldar-Konzil — jede mit eigenen Boni."
          />
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Wirtschaft & Mining"
            desc="Baue Credits, Mineralien und Energie ab. Optimiere deine Produktionskette in Echtzeit."
          />
          <FeatureCard
            icon={<Rocket className="w-6 h-6" />}
            title="Flottenkampf"
            desc="Baue Schiffe, bewege Flotten zwischen Systemen und kämpfe um die Vorherrschaft."
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Allianzen & Politik"
            desc="Schließe dich mit anderen Spielern zusammen. Diplomatie entscheidet über Sieg oder Niederlage."
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Persistentes Universum"
            desc="Dein Imperium existiert weiter, auch wenn du offline bist. Strategie rund um die Uhr."
          />
        </div>
      </section>

      {/* Faction preview */}
      <section className="relative z-10 pb-24 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Wähle deine{" "}
          <span className="gradient-text">Fraktion</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {FACTION_PREVIEWS.map((f) => (
            <div
              key={f.name}
              className="glass glass-hover p-5 text-center flex flex-col items-center gap-3"
              style={{
                borderColor: f.glow,
                boxShadow: `0 0 15px ${f.glow}`,
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ backgroundColor: f.glow, color: f.color }}
              >
                {f.icon}
              </div>
              <h3 className="font-semibold text-white text-sm">{f.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {f.trait}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-gray-600">
        <p>Star Nations · Ein Browser-MMO · &copy; 2026</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass glass-hover p-6 group">
      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4 group-hover:bg-cyan-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

const FACTION_PREVIEWS = [
  {
    name: "Terranische Föderation",
    icon: "T",
    color: "#3B82F6",
    glow: "rgba(59,130,246,0.2)",
    trait: "Ausgewogen & Logistik",
  },
  {
    name: "Vectis-Kollektiv",
    icon: "V",
    color: "#10B981",
    glow: "rgba(16,185,129,0.2)",
    trait: "KI & Ressourcen-Mining",
  },
  {
    name: "Onyx-Syndikat",
    icon: "O",
    color: "#8B5CF6",
    glow: "rgba(139,92,246,0.2)",
    trait: "Piraten & Handelsgewinn",
  },
  {
    name: "Zyrion-Imperium",
    icon: "Z",
    color: "#EF4444",
    glow: "rgba(239,68,68,0.2)",
    trait: "Krieger & Flottenschaden",
  },
  {
    name: "Eldar-Nebula-Konzil",
    icon: "E",
    color: "#F59E0B",
    glow: "rgba(245,158,11,0.2)",
    trait: "Energiewesen & Schilde",
  },
];
