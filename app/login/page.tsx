"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Rocket, Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Anmeldung fehlgeschlagen.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Rocket className="w-6 h-6 text-cyan-400" />
            <span className="text-lg font-bold gradient-text">
              STAR NATIONS
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Willkommen zurück</h1>
          <p className="text-gray-400 text-sm">
            Melde dich an, um dein Imperium fortzuführen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

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

          <div>
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
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Wird angemeldet …" : "Anmelden"}
            <Rocket className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Noch keinen Account?{" "}
          <Link
            href="/register"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
