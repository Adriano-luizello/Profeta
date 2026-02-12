"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProfetaLogo } from "@/components/profeta/ProfetaLogo";

const TAGLINE_PT = "Gestão inteligente de estoque com IA";
const TAGLINE_EN = "AI-powered inventory management";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — 60% on desktop */}
      <div className="md:w-[60%] bg-profeta-green flex flex-col justify-center px-8 py-12 md:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />
        <div className="relative">
          <Link href="/" className="inline-block mb-8">
            <ProfetaLogo size={48} variant="white" />
          </Link>
          <h1 className="font-display text-3xl md:text-4xl text-white font-normal mb-3">
            Profeta
          </h1>
          <p className="text-white/90 text-lg max-w-sm">
            {TAGLINE_PT}
          </p>
          <p className="text-white/70 text-sm mt-6 hidden md:block">
            {TAGLINE_EN}
          </p>
        </div>
      </div>

      {/* Right panel — 40% on desktop, full on mobile */}
      <div className="md:w-[40%] flex items-center justify-center bg-white p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <ProfetaLogo size={36} variant="default" />
              <span className="font-display text-xl text-profeta-primary">Profeta</span>
            </Link>
          </div>

          <h2 className="text-2xl font-semibold text-profeta-primary mb-2">
            Bem-vindo de volta
          </h2>
          <p className="text-profeta-secondary text-sm mb-6">
            Entre com seu email e senha.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-profeta-primary mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-profeta-border bg-white text-profeta-primary placeholder-profeta-muted focus:outline-none focus:ring-2 focus:ring-profeta-green/20 focus:border-profeta-green"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-profeta-primary mb-1.5">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-profeta-border bg-white text-profeta-primary placeholder-profeta-muted focus:outline-none focus:ring-2 focus:ring-profeta-green/20 focus:border-profeta-green"
              />
              <div className="mt-2 flex justify-end">
                <Link
                  href="#"
                  className="text-sm text-profeta-green hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-profeta-green py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar →"}
            </button>
          </form>

          <div className="mt-6">
            <p className="text-center text-sm text-profeta-muted">—— ou ——</p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-profeta-border py-3 text-profeta-primary font-medium hover:bg-profeta-surface transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Entrar com Google
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-profeta-secondary">
            Não tem conta?{" "}
            <Link href="/signup" className="text-profeta-green font-medium hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
