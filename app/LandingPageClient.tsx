"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProfetaLogo } from "@/components/profeta/ProfetaLogo";
import { Reveal } from "@/components/landing/Reveal";
import { useLocale } from "@/lib/locale-context";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { HeroFlow } from "@/components/landing/illustrations/HeroFlow";
import { GridPattern } from "@/components/landing/illustrations/GridPattern";
import { BrowserFrame } from "@/components/landing/illustrations/BrowserFrame";
import { ScreenshotImage } from "@/components/landing/ScreenshotImage";
import {
  SalesChartIcon,
  ForecastIcon,
  AlertIcon,
  DeadStockIcon,
  ParetoIcon,
  AIChatIcon,
} from "@/components/landing/illustrations/FeatureIcons";
import {
  TrendingUp,
  Package,
  BrainCircuit,
  Cpu,
  Shield,
  Globe,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

const SECTION_ID_HOW = "how-it-works";

function Navbar({ scrolled }: { scrolled: boolean }) {
  const { locale, setLocale, t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-profeta-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <ProfetaLogo size={36} variant="default" />
            <span className="font-display text-xl text-profeta-primary font-medium hidden sm:inline">
              Profeta
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex bg-profeta-surface rounded-lg p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setLocale("pt")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  locale === "pt"
                    ? "bg-white text-profeta-primary shadow-sm"
                    : "text-profeta-muted"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  locale === "en"
                    ? "bg-white text-profeta-primary shadow-sm"
                    : "text-profeta-muted"
                }`}
              >
                EN
              </button>
            </div>
            <Link
              href="/login"
              className="text-sm font-medium text-profeta-primary hover:text-profeta-green transition-colors"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/#waitlist"
              className="inline-flex items-center justify-center rounded-xl bg-profeta-green px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              {t.nav.waitlist} →
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-profeta-primary"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-profeta-border flex flex-col gap-3">
            <div className="flex bg-profeta-surface rounded-lg p-0.5 text-sm w-fit">
              <button
                type="button"
                onClick={() => setLocale("pt")}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  locale === "pt" ? "bg-white shadow-sm" : "text-profeta-muted"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`px-2.5 py-1 rounded-md font-medium ${
                  locale === "en" ? "bg-white shadow-sm" : "text-profeta-muted"
                }`}
              >
                EN
              </button>
            </div>
            <Link
              href="/login"
              className="text-sm font-medium text-profeta-primary"
              onClick={() => setMobileOpen(false)}
            >
              {t.nav.login}
            </Link>
            <Link
              href="/#waitlist"
              className="inline-flex rounded-xl bg-profeta-green px-4 py-2.5 text-sm font-semibold text-white w-fit"
              onClick={() => setMobileOpen(false)}
            >
              {t.nav.waitlist} →
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

function WaitlistForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const locale = useLocale().locale;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("waitlist").insert({
        email: email.trim().toLowerCase(),
        created_at: new Date().toISOString(),
        locale: locale,
      });
      if (error) throw error;
      toast.success(
        locale === "pt"
          ? "Você entrou na waitlist. Em breve entraremos em contato."
          : "You're on the waitlist. We'll be in touch soon."
      );
      setEmail("");
    } catch {
      toast.success(
        locale === "pt"
          ? "Recebemos seu interesse. Em breve entraremos em contato."
          : "We received your interest. We'll be in touch soon."
      );
      setEmail("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.cta.email_placeholder}
        required
        className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
      />
      <button
        type="submit"
        disabled={loading}
        className="cta-glow shrink-0 px-6 py-3 rounded-xl bg-white text-profeta-green font-semibold hover:opacity-90 hover:scale-105 transition-all duration-300 disabled:opacity-70 disabled:hover:scale-100"
      >
        {t.cta.button} →
      </button>
    </form>
  );
}

export default function LandingPageClient() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 768) return;
    const hero = document.getElementById("hero");
    if (!hero) return;
    const handleMove = (e: MouseEvent) => {
      hero.style.setProperty("--mouse-x", `${e.clientX}px`);
      hero.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    hero.addEventListener("mousemove", handleMove);
    return () => hero.removeEventListener("mousemove", handleMove);
  }, []);

  const { t } = useLocale();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar scrolled={scrolled} />

      <main>
        {/* Section 1 — Hero */}
        <section
          id="hero"
          className="relative min-h-screen flex items-center pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 bg-white"
        >
          <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
            <div>
              <Reveal delay={0}>
                <p className="text-sm font-medium text-profeta-green uppercase tracking-wide mb-4">
                  {t.hero.eyebrow}
                </p>
              </Reveal>
              <Reveal delay={150}>
                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-normal text-profeta-primary leading-tight whitespace-pre-line">
                  {t.hero.headline}
                </h1>
              </Reveal>
              <Reveal delay={300}>
                <p className="mt-6 text-lg text-profeta-secondary max-w-xl">
                  {t.hero.subheadline}
                </p>
              </Reveal>
              <Reveal delay={450}>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href="/#waitlist"
                    className="inline-flex items-center justify-center rounded-xl bg-profeta-green px-6 py-3 text-base font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    {t.hero.cta_primary} →
                  </a>
                  <a
                    href={`#${SECTION_ID_HOW}`}
                    className="inline-flex items-center text-profeta-green font-medium hover:underline"
                  >
                    {t.hero.cta_secondary} ↓
                  </a>
                </div>
              </Reveal>
            </div>
            <Reveal delay={200} direction="right" distance={40}>
              <div className="flex flex-col gap-8">
                <div className="w-full max-w-md mx-auto lg:mx-0">
                  <HeroFlow />
                </div>
                <ScreenshotImage
                  src="/landing/hero.png"
                  alt="Dashboard Profeta"
                  className="w-full max-w-2xl mx-auto lg:mx-0 animate-float"
                  placeholder={
                    <div
                      className="aspect-video w-full rounded-2xl border border-profeta-border bg-profeta-surface shadow-2xl flex items-center justify-center text-profeta-muted animate-float"
                      aria-hidden
                    >
                      {t.hero.screenshot_placeholder}
                    </div>
                  }
                />
              </div>
            </Reveal>
          </div>
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-soft-bounce"
            aria-hidden
          >
            <ChevronDown className="w-6 h-6 text-profeta-muted" />
          </div>
        </section>

        {/* Section 2 — Público */}
        <section className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-profeta-surface bg-noise">
          <GridPattern className="absolute top-0 right-0 w-64 h-48 opacity-50 pointer-events-none" />
          <div className="max-w-7xl mx-auto relative">
            <Reveal className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-display text-3xl md:text-4xl text-profeta-primary">
                {t.audience.title}
              </h2>
              <p className="mt-4 text-lg text-profeta-secondary">
                {t.audience.subtitle}
              </p>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: t.audience.card1_title, desc: t.audience.card1_desc, Icon: TrendingUp },
                { title: t.audience.card2_title, desc: t.audience.card2_desc, Icon: Package },
                { title: t.audience.card3_title, desc: t.audience.card3_desc, Icon: BrainCircuit },
              ].map((card, i) => (
                <Reveal key={card.title} delay={i * 120}>
                  <div className="h-full bg-white rounded-2xl border border-profeta-border p-8 hover:shadow-card-hover transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-profeta-green/[0.08] flex items-center justify-center mb-6">
                      <card.Icon className="w-6 h-6 text-profeta-green" />
                    </div>
                    <h3 className="text-xl font-semibold text-profeta-primary mb-3">
                      {card.title}
                    </h3>
                    <p className="text-profeta-secondary">{card.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3 — Perguntas provocativas */}
        <section
          id={SECTION_ID_HOW}
          className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-white"
        >
          <div className="max-w-4xl mx-auto px-2">
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-profeta-primary text-center">
                {t.cost.title}
              </h2>
              <p className="text-profeta-secondary text-center mt-3 max-w-2xl mx-auto">
                {t.cost.subtitle}
              </p>
            </Reveal>

            <div className="mt-16 space-y-6">
              {[
                { question: t.cost.q1_question, context: t.cost.q1_context, action: t.cost.q1_action },
                { question: t.cost.q2_question, context: t.cost.q2_context, action: t.cost.q2_action },
                { question: t.cost.q3_question, context: t.cost.q3_context, action: t.cost.q3_action },
              ].map((q, i) => (
                <Reveal key={i} delay={i * 150}>
                  <div className="bg-profeta-surface/50 rounded-2xl border border-profeta-border p-8 md:p-10 hover:border-profeta-green/20 hover:shadow-lg hover:shadow-profeta-green/5 transition-all duration-300">
                    <div className="flex gap-6 md:gap-8 items-start">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl border-2 border-profeta-green/15 bg-profeta-green/5 flex items-center justify-center">
                        <span className="text-xl font-display font-bold text-profeta-green">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl md:text-2xl font-display font-semibold text-profeta-primary leading-tight">
                          {q.question}
                        </h3>
                        <p className="text-profeta-secondary mt-3 leading-relaxed">
                          {q.context}
                        </p>
                        <p className="text-profeta-green font-medium mt-4 flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 shrink-0" />
                          {q.action}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — Credenciais (layout editorial assimétrico) */}
        <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-profeta-surface bg-noise relative overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-5 gap-12 md:gap-16 items-center">
              <div className="md:col-span-3">
                <Reveal>
                  <p className="text-sm font-medium text-profeta-green uppercase tracking-wider mb-4">
                    {t.trust.eyebrow}
                  </p>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-profeta-primary leading-tight">
                    {t.trust.title}
                  </h2>
                </Reveal>
                <Reveal delay={150}>
                  <p className="text-lg text-profeta-secondary mt-6 leading-relaxed">
                    {t.trust.body}
                  </p>
                </Reveal>
                <Reveal delay={300}>
                  <div className="flex flex-wrap gap-4 mt-10">
                    {[
                      { title: t.trust.card1_title, desc: t.trust.card1_desc, Icon: Cpu },
                      { title: t.trust.card2_title, desc: t.trust.card2_desc, Icon: Shield },
                      { title: t.trust.card3_title, desc: t.trust.card3_desc, Icon: Globe },
                    ].map((card, i) => (
                      <div
                        key={card.title}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-profeta-border"
                      >
                        <div className="w-8 h-8 rounded-lg bg-profeta-green/10 flex items-center justify-center shrink-0">
                          <card.Icon className="w-4 h-4 text-profeta-green" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-profeta-primary">{card.title}</p>
                          <p className="text-xs text-profeta-muted line-clamp-2">{card.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
              <div className="md:col-span-2">
                <Reveal delay={200} direction="left">
                  <div className="space-y-4">
                    <div className="bg-profeta-green rounded-2xl p-6 text-white">
                      <p className="text-4xl font-display font-bold">3</p>
                      <p className="text-white/80 text-sm mt-1">{t.trust.stats_models_label}</p>
                      <p className="text-white/60 text-xs mt-2">
                        {t.trust.stats_models_detail}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl border border-profeta-border p-5">
                        <p className="text-2xl font-display font-bold text-profeta-primary">90d</p>
                        <p className="text-xs text-profeta-muted mt-1">{t.trust.stats_horizon_label}</p>
                      </div>
                      <div className="bg-white rounded-2xl border border-profeta-border p-5">
                        <p className="text-2xl font-display font-bold text-profeta-primary">3</p>
                        <p className="text-xs text-profeta-muted mt-1">{t.trust.stats_alerts_label}</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-profeta-border p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-profeta-green/20 border-2 border-white flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-profeta-green">P</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-profeta-green/30 border-2 border-white flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-profeta-green">R</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-profeta-green/40 border-2 border-white flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-profeta-green">O</span>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-profeta-primary">{t.trust.stats_early_title}</p>
                          <p className="text-xs text-profeta-muted">{t.trust.stats_early_sub}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 — Features */}
        <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <Reveal className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-4xl text-profeta-primary">
                {t.features.title}
              </h2>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: t.features.f1_title, desc: t.features.f1_desc, Icon: SalesChartIcon },
                { title: t.features.f2_title, desc: t.features.f2_desc, Icon: ForecastIcon },
                { title: t.features.f3_title, desc: t.features.f3_desc, Icon: AlertIcon },
                { title: t.features.f4_title, desc: t.features.f4_desc, Icon: DeadStockIcon },
                { title: t.features.f5_title, desc: t.features.f5_desc, Icon: ParetoIcon },
                { title: t.features.f6_title, desc: t.features.f6_desc, Icon: AIChatIcon },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 100}>
                  <div
                    className={`feature-card-landing h-full rounded-2xl p-6 cursor-default ${
                      i % 2 === 0 ? "bg-white" : "bg-profeta-surface"
                    } border border-profeta-border hover:border-profeta-green/20`}
                  >
                    <div className="feature-icon-landing w-12 h-12 mb-4 flex items-center justify-center">
                      <item.Icon className="w-12 h-12" />
                    </div>
                    <h3 className="font-semibold text-profeta-primary mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-profeta-secondary">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <p className="text-sm text-profeta-secondary text-center mt-8">
                🔗 {t.features.shopify_note}
              </p>
            </Reveal>
          </div>
        </section>

        {/* Section 6 — Demo */}
        <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-profeta-surface bg-noise">
          <div className="max-w-7xl mx-auto text-center">
            <Reveal className="mb-8">
              <h2 className="font-display text-3xl md:text-4xl text-profeta-primary">
                {t.demo.title}
              </h2>
              <p className="mt-4 text-lg text-profeta-secondary max-w-2xl mx-auto">
                {t.demo.subtitle}
              </p>
            </Reveal>
            <Reveal delay={100}>
              <div className="max-w-5xl mx-auto">
                <BrowserFrame>
                  <ScreenshotImage
                    src="/landing/demo.png"
                    alt="Dashboard Profeta em ação"
                    className="w-full h-full min-h-[280px]"
                    placeholder={
                      <span className="text-profeta-muted text-sm">{t.hero.screenshot_placeholder}</span>
                    }
                  />
                </BrowserFrame>
              </div>
            </Reveal>
            <Reveal delay={200} className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-profeta-secondary">
              <span className="flex items-center gap-2">
                <span className="text-profeta-green">✓</span> {t.demo.callout1}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-profeta-green">✓</span> {t.demo.callout2}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-profeta-green">✓</span> {t.demo.callout3}
              </span>
            </Reveal>
          </div>
        </section>

        {/* Section 7 — CTA */}
        <section
          id="waitlist"
          className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-profeta-green overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none opacity-[0.06]" aria-hidden>
            <svg className="w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
              <circle cx="200" cy="200" r="300" stroke="white" strokeWidth="1" fill="none" />
              <circle cx="600" cy="100" r="200" stroke="white" strokeWidth="1" fill="none" />
              <circle cx="400" cy="350" r="250" stroke="white" strokeWidth="1" fill="none" />
            </svg>
          </div>
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <Reveal>
              <h2 className="font-display text-3xl md:text-4xl text-white">
                {t.cta.headline}
              </h2>
              <p className="mt-4 text-lg text-white/90">{t.cta.subtitle}</p>
            </Reveal>
            <Reveal delay={100} className="mt-10">
              <WaitlistForm />
            </Reveal>
            <p className="mt-6 text-sm text-white/70">{t.cta.disclaimer}</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-profeta-primary text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Link href="/" className="inline-block mb-6">
            <ProfetaLogo size={40} variant="light" />
          </Link>
          <p className="text-white/90 mb-8">{t.footer.tagline}</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/login" className="text-white/60 hover:text-white transition-colors">
              {t.footer.enter}
            </Link>
            <Link href="/#waitlist" className="text-white/60 hover:text-white transition-colors">
              {t.footer.waitlist}
            </Link>
            <Link href="#" className="text-white/60 hover:text-white transition-colors">
              {t.footer.terms}
            </Link>
            <Link href="#" className="text-white/60 hover:text-white transition-colors">
              {t.footer.privacy}
            </Link>
          </div>
          <p className="mt-8 text-sm text-white/50">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
