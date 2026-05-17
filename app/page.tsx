'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  Calendar,
  Car,
  ChevronDown,
  CreditCard,
  FileText,
  GraduationCap,
  Mail,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  // Reveal-on-scroll for any element with `.ls-reveal`
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.ls-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900 antialiased">
      <Navbar />
      <Hero />
      <StatsStrip />
      <WhatSection />
      <FeaturesSection />
      <PersonasSection />
      <HowSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Navbar — transparent at the top, solid after a bit of scroll
   ──────────────────────────────────────────────────────────────────────────── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_0_0_rgba(0,0,0,0.02)]'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-600/25 ring-1 ring-inset ring-white/20">
            <Car className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-slate-900">
            AutoShkolla<span className="text-primary-600"> Platform</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#veçoritë" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Veçoritë
          </a>
          <a href="#për-kë" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Për kë
          </a>
          <a href="#si-funksionon" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Si funksionon
          </a>
          <a href="#kontakt" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Kontakt
          </a>
        </nav>

        <Link
          href="/login"
          className="group inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary-600 hover:shadow-lg hover:shadow-primary-600/20"
        >
          Hyr në Platformë
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Hero — title, CTAs, animated road + car scene
   ──────────────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary-50 via-white to-white" />

      {/* Decorative blob */}
      <div
        aria-hidden
        className="ls-blob absolute -left-32 -top-32 -z-10 h-[460px] w-[460px] bg-gradient-to-br from-primary-200 to-primary-400/60 blur-3xl opacity-50"
      />
      <div
        aria-hidden
        className="ls-blob absolute -right-40 top-40 -z-10 h-[380px] w-[380px] bg-gradient-to-br from-indigo-200 to-primary-300/60 blur-3xl opacity-40"
        style={{ animationDelay: '-6s' }}
      />

      {/* Floating clouds */}
      <Cloud className="absolute left-[8%] top-32 h-8 w-16 text-white drop-shadow-sm ls-cloud-slow opacity-90" />
      <Cloud className="absolute right-[14%] top-44 h-6 w-12 text-white drop-shadow-sm ls-cloud-med opacity-80" style={{ animationDelay: '-3s' }} />
      <Cloud className="absolute left-[55%] top-24 h-7 w-14 text-white/95 drop-shadow-sm ls-cloud-slow" style={{ animationDelay: '-5s' }} />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-primary-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>I dedikuar për autoshkollat e Kosovës</span>
          </div>

          {/* Headline */}
          <h1 className="mt-6 max-w-4xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Menaxhoni autoshkollën tuaj
            <br className="hidden sm:inline" />{' '}
            <span className="relative inline-block">
              <span className="relative bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 bg-clip-text text-transparent">
                nga një vend i vetëm.
              </span>
              <svg
                aria-hidden
                className="absolute -bottom-2 left-0 h-3 w-full text-primary-300/70 sm:-bottom-3"
                viewBox="0 0 300 12"
                preserveAspectRatio="none"
              >
                <path d="M2 8 Q 75 1 150 6 T 298 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
              </svg>
            </span>
          </h1>

          {/* Subline */}
          <p className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            Platforma më e plotë në Kosovë për menaxhim të kandidatëve, instruktorëve, orëve, pagesave dhe dokumenteve.
            Krejt çfarë ju duhet — moderne, e shpejtë, e besueshme.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="group ls-pulse-ring relative inline-flex items-center gap-2 rounded-full bg-primary-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/40"
            >
              <span>Hyr në Platformë</span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <a
              href="#veçoritë"
              className="group inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/70 px-6 py-3.5 text-sm font-semibold text-slate-700 backdrop-blur transition hover:border-slate-400 hover:bg-white"
            >
              Shih veçoritë
              <ChevronDown className="h-4 w-4 transition group-hover:translate-y-0.5" />
            </a>
          </div>

          {/* Trust line */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Multi-tenant i sigurt
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary-600" /> 7 dokumente zyrtare
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-violet-600" /> Tablet & celular
            </span>
          </div>
        </div>

        {/* Animated scene */}
        <CarScene className="mx-auto mt-16 max-w-5xl" />
      </div>

      {/* Bottom transition wave */}
      <svg
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-24 w-full text-white"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
      >
        <path d="M0 60 Q 360 100 720 60 T 1440 60 V 100 H 0 Z" fill="currentColor" />
      </svg>
    </section>
  );
}

/* Cloud SVG */
function Cloud({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 32" className={className} style={style} aria-hidden>
      <path
        d="M14 24 a8 8 0 1 1 1.7 -15.8 a10 10 0 0 1 19 3 a7 7 0 0 1 -2.7 13.5 z"
        fill="currentColor"
      />
    </svg>
  );
}

/* The hero animated scene with road, cars, signs */
function CarScene({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ls-reveal ${className}`}>
      <div className="relative h-[260px] overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 shadow-xl shadow-slate-900/5 sm:h-[320px]">
        {/* Distant hills */}
        <svg aria-hidden className="absolute inset-x-0 bottom-[44%] w-full" viewBox="0 0 600 80" preserveAspectRatio="none">
          <path d="M0 60 Q 80 30 160 50 T 320 50 T 480 45 T 600 55 V 80 H 0 Z" fill="#bbf7d0" opacity="0.65" />
          <path d="M0 70 Q 100 40 200 60 T 400 60 T 600 65 V 80 H 0 Z" fill="#86efac" opacity="0.55" />
        </svg>

        {/* Sun */}
        <div className="absolute right-12 top-8 h-12 w-12 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 shadow-lg shadow-amber-300/50" />

        {/* Mini clouds inside scene */}
        <Cloud className="absolute left-[12%] top-[18%] h-6 w-12 text-white ls-cloud-med" />
        <Cloud className="absolute right-[18%] top-[10%] h-5 w-10 text-white ls-cloud-slow" style={{ animationDelay: '-2s' }} />

        {/* Road sign */}
        <div className="absolute right-[8%] bottom-[42%] flex flex-col items-center">
          <div className="grid h-9 w-9 place-items-center rounded-md border-2 border-red-500 bg-white text-[10px] font-bold text-red-600 shadow">
            STOP
          </div>
          <div className="h-6 w-1 bg-slate-400" />
        </div>

        {/* Road surface */}
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-slate-700 to-slate-900">
          {/* Lane dashes (animated) */}
          <div className="ls-road absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 opacity-90" />
          {/* Side curb highlight */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-300/70" />
        </div>

        {/* Car 1 — main, in front */}
        <div className="ls-drive absolute bottom-[8%] left-0">
          <div className="ls-car">
            <CarSvg color="#2563EB" accent="#1E3A8A" plate="KS-1234" />
          </div>
        </div>

        {/* Car 2 — smaller, slower, in the background */}
        <div className="ls-drive-slow absolute bottom-[22%] left-0 scale-75 opacity-90" style={{ animationDelay: '-9s' }}>
          <div className="ls-car">
            <CarSvg color="#ef4444" accent="#7f1d1d" plate="PR-007" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* SVG car — side view. Wheels animate via .ls-wheel CSS class. */
function CarSvg({ color, accent, plate }: { color: string; accent: string; plate: string }) {
  return (
    <svg width="220" height="100" viewBox="0 0 220 100" aria-hidden>
      {/* Shadow under the car */}
      <ellipse cx="110" cy="92" rx="92" ry="4" fill="rgba(0,0,0,0.22)" />

      {/* Body — lower hull */}
      <path
        d="M14 68 Q 14 50 34 50 L 64 50 L 86 28 L 148 28 L 170 50 L 200 50 Q 210 50 210 62 L 210 76 Q 210 82 204 82 L 18 82 Q 12 82 12 76 Z"
        fill={color}
      />
      {/* Lower belt highlight */}
      <rect x="14" y="62" width="194" height="3" fill="rgba(255,255,255,0.18)" />

      {/* Windows */}
      <path d="M 67 50 L 86 32 L 113 32 L 113 50 Z" fill="#cfe1ff" />
      <path d="M 117 32 L 144 32 L 165 50 L 117 50 Z" fill="#cfe1ff" />
      {/* Window frame */}
      <path
        d="M 67 50 L 86 32 L 144 32 L 165 50"
        stroke={accent}
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      {/* Window divider */}
      <line x1="115" y1="32" x2="115" y2="50" stroke={accent} strokeWidth="1.2" />

      {/* Door handle */}
      <rect x="98" y="60" width="14" height="2.5" rx="1.2" fill={accent} />

      {/* Headlight */}
      <circle cx="204" cy="58" r="3.2" fill="#fde047" />
      <circle cx="204" cy="58" r="6" fill="#fde047" opacity="0.35" />

      {/* Tail light */}
      <rect x="14" y="55" width="3.5" height="4" rx="1" fill="#ef4444" />

      {/* License plate */}
      <rect x="92" y="74" width="36" height="7" rx="1" fill="#fafafa" stroke={accent} strokeWidth="0.4" />
      <text x="110" y="80" textAnchor="middle" fontSize="5.5" fontFamily="monospace" fontWeight="700" fill="#0f172a">
        {plate}
      </text>

      {/* Front wheel — rotates around its own bbox center via CSS .ls-wheel */}
      <g className="ls-wheel">
        <circle cx="54" cy="82" r="13" fill="#0f172a" />
        <circle cx="54" cy="82" r="9" fill="#1f2937" />
        <circle cx="54" cy="82" r="3.5" fill="#9ca3af" />
        <line x1="54" y1="73" x2="54" y2="91" stroke="#cbd5e1" strokeWidth="1.6" />
        <line x1="45" y1="82" x2="63" y2="82" stroke="#cbd5e1" strokeWidth="1.6" />
        <line x1="48" y1="76" x2="60" y2="88" stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1="48" y1="88" x2="60" y2="76" stroke="#cbd5e1" strokeWidth="1.2" />
      </g>
      {/* Rear wheel */}
      <g className="ls-wheel">
        <circle cx="170" cy="82" r="13" fill="#0f172a" />
        <circle cx="170" cy="82" r="9" fill="#1f2937" />
        <circle cx="170" cy="82" r="3.5" fill="#9ca3af" />
        <line x1="170" y1="73" x2="170" y2="91" stroke="#cbd5e1" strokeWidth="1.6" />
        <line x1="161" y1="82" x2="179" y2="82" stroke="#cbd5e1" strokeWidth="1.6" />
        <line x1="164" y1="76" x2="176" y2="88" stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1="164" y1="88" x2="176" y2="76" stroke="#cbd5e1" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Stats strip
   ──────────────────────────────────────────────────────────────────────────── */

function StatsStrip() {
  const items = [
    { value: '16', label: 'Module të integruara' },
    { value: '7', label: 'Dokumente zyrtare PDF' },
    { value: '100%', label: 'Në gjuhën shqipe' },
    { value: '24/7', label: 'I qasshëm gjithmonë' },
  ];
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-6 pb-8">
        <div className="ls-reveal grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-4 sm:p-8">
          {items.map((it) => (
            <div key={it.label} className="text-center">
              <div className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{it.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500 sm:text-[13px]">
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   What is it — copy + visual
   ──────────────────────────────────────────────────────────────────────────── */

function WhatSection() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        <div className="ls-reveal">
          <SectionEyebrow>Çfarë është</SectionEyebrow>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Sistem modern, ndërtuar enkas për autoshkollat e Kosovës.
          </h2>
          <p className="mt-5 text-pretty text-base leading-relaxed text-slate-600">
            AutoShkolla Platform e zëvendëson dokumentet në letër, fletëparaqitjet manuale dhe sistemet e vjetra me një
            aplikacion të vetëm që funksionon në çfarëdo pajisjeje. I gjithë sistemi është në gjuhën shqipe, me të
            gjitha dokumentet zyrtare të Kosovës dhe me një rrjedhë pune që e kuptojnë instruktorët, ligjëruesit dhe
            administratorët.
          </p>
          <ul className="mt-7 space-y-3 text-sm text-slate-700">
            {[
              'Multi-tenant — çdo autoshkollë e izoluar dhe e sigurt',
              'Roli i super-administratorit me mundësi impersonimi',
              'Gjenerim automatik i 7 dokumenteve me layout zyrtar',
              'Optimizuar për punë në tablet brenda veturës',
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-100 text-primary-700">
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4L8.5 12l6.8-6.7a1 1 0 0 1 1.4 0z" />
                  </svg>
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right-side mockup card */}
        <div className="ls-reveal" style={{ transitionDelay: '120ms' }}>
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary-200/50 via-indigo-200/40 to-emerald-200/30 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            platform.autoshkolla.com / paneli
          </span>
        </div>
        {/* Body */}
        <div className="grid grid-cols-4 gap-3 p-4">
          {[
            { label: 'Kandidatë aktivë', value: '142', delta: '+12', color: 'text-emerald-600', bar: 'w-3/4' },
            { label: 'Orë sot', value: '38', delta: '+4', color: 'text-emerald-600', bar: 'w-2/3' },
            { label: 'Pagesa muaj', value: '€8 240', delta: '+18%', color: 'text-emerald-600', bar: 'w-4/5' },
            { label: 'Borxhi instruktorë', value: '€1 940', delta: '−5%', color: 'text-rose-600', bar: 'w-1/2' },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{c.label}</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{c.value}</div>
              <div className={`text-[10px] font-semibold ${c.color}`}>{c.delta}</div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                <div className={`h-1.5 rounded-full bg-primary-500 ${c.bar}`} />
              </div>
            </div>
          ))}
        </div>
        {/* Chart-ish */}
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-700">Aktiviteti i javës</div>
                <div className="text-[10px] text-slate-400">Orë teorike & praktike</div>
              </div>
              <div className="flex gap-1.5">
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">Teorike</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Praktike</span>
              </div>
            </div>
            <div className="mt-3 flex h-20 items-end gap-2">
              {[40, 65, 50, 80, 70, 90, 55].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col gap-1">
                  <div className="rounded-t bg-primary-500/90" style={{ height: `${h}%` }} />
                  <div className="rounded-t bg-emerald-400/80" style={{ height: `${Math.max(20, h - 25)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-slate-400">
              <span>Hën</span><span>Mar</span><span>Mër</span><span>Enj</span><span>Pre</span><span>Sht</span><span>Die</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating ribbons */}
      <div className="absolute -right-4 -top-4 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-md">
        ✓ Pagesa e regjistruar
      </div>
      <div className="absolute -bottom-4 -left-4 rounded-xl border border-primary-200 bg-white px-3 py-2 text-xs font-semibold text-primary-700 shadow-md">
        Vërtetimi i ri u krijua
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Features grid
   ──────────────────────────────────────────────────────────────────────────── */

const FEATURES: { icon: React.ElementType; title: string; desc: string; tint: string }[] = [
  {
    icon: Users,
    title: 'Menaxhimi i Kandidatëve',
    desc: 'Regjistrim me hapa, profil i plotë me të dhënat personale, kategori, orë, pagesa dhe dokumente — gjithçka e organizuar.',
    tint: 'from-primary-500 to-indigo-500',
  },
  {
    icon: GraduationCap,
    title: 'Orët Teorike',
    desc: 'Gjurmoni 8 sesionet teorike për kategori B me kapitujt e duhur dhe shënoni pjesëmarrjen e kandidatëve.',
    tint: 'from-violet-500 to-purple-600',
  },
  {
    icon: Car,
    title: 'Orët Praktike',
    desc: 'Planifikoni mësimet praktike në kalendar. Kur shënohen të përfunduara, regjistrohen automatikisht.',
    tint: 'from-emerald-500 to-teal-600',
  },
  {
    icon: CreditCard,
    title: 'Pagesat & Borxhi',
    desc: 'Çdo pagesë regjistrohet, borxhi llogaritet automatikisht. Borxhi i instruktorëve me 65€/kandidat, transparent.',
    tint: 'from-amber-500 to-orange-600',
  },
  {
    icon: FileText,
    title: '7 Dokumente PDF',
    desc: 'Fatura, Fletëparaqitja, Libreza, Kontrata, Testi, Vërtetimi — të gjitha me layout-in zyrtar të Kosovës.',
    tint: 'from-rose-500 to-pink-600',
  },
  {
    icon: Calendar,
    title: 'Kalendari',
    desc: 'Pamje ditore, javore, mujore. Ndërtoni orarin për çdo instruktor dhe shihni gjithë autoshkollën në kohë reale.',
    tint: 'from-sky-500 to-blue-600',
  },
  {
    icon: ShieldCheck,
    title: 'Portali për Instruktorët',
    desc: 'Aplikacion i veçantë me qasje vetëm-lexim. Instruktorët shohin kandidatët, kalendarin dhe borxhin — pa rrezik.',
    tint: 'from-cyan-500 to-blue-600',
  },
  {
    icon: MessageSquare,
    title: 'Mesazhet',
    desc: 'Komunikim i drejtpërdrejtë mes administratës dhe instruktorëve brenda autoshkollës. Pa email-e të humbur.',
    tint: 'from-fuchsia-500 to-purple-600',
  },
  {
    icon: Building2,
    title: 'Multi-tenant',
    desc: 'Çdo autoshkollë ka të dhënat e veta të mbrojtura. Asnjë rrezik për ngatërrime ose qasje të paautorizuar.',
    tint: 'from-slate-700 to-slate-900',
  },
];

function FeaturesSection() {
  return (
    <section id="veçoritë" className="relative bg-slate-50/60 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="ls-reveal mx-auto max-w-2xl text-center">
          <SectionEyebrow>Veçoritë</SectionEyebrow>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Çdo gjë që ju duhet për të drejtuar autoshkollën.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600">
            Nga regjistrimi i kandidatit deri tek vërtetimi përfundimtar — me një rrjedhë pune të mendimtuar mirë dhe
            pa hapa të panevojshëm.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="ls-reveal group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {/* Gradient backdrop on hover */}
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${f.tint} opacity-0 blur-2xl transition duration-500 group-hover:opacity-30`}
              />
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.tint} text-white shadow-md`}>
                <f.icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <h3 className="mt-5 text-base font-semibold tracking-tight text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Personas — three role cards
   ──────────────────────────────────────────────────────────────────────────── */

const PERSONAS = [
  {
    icon: Building2,
    role: 'Administratori',
    desc: 'Menaxhoni gjithçka: kandidatët, stafin, automjetet, pagesat, dokumentet dhe statistikat e autoshkollës.',
    points: ['CRUD i plotë mbi kandidatët', 'Regjistrim pagesash dhe shpenzimesh', 'Lëshim i 7 dokumenteve zyrtare'],
    color: 'from-primary-600 to-indigo-600',
  },
  {
    icon: Car,
    role: 'Instruktori',
    desc: 'Shihni kandidatët e caktuar, planifikoni mësimet në kalendar dhe gjurmoni borxhin tuaj me autoshkollën.',
    points: ['Listë read-only e kandidatëve', 'Kalendar ditor/javor/mujor', 'Borxhi 65€/kandidat me detaje'],
    color: 'from-emerald-600 to-teal-600',
  },
  {
    icon: GraduationCap,
    role: 'Ligjëruesi',
    desc: 'Mbani 8 sesionet teorike për kategori B, regjistroni pjesëmarrjen dhe lëshoni vërtetimet bashkë me admin.',
    points: ['Regjistrim i sesioneve teorike', 'Lidhje me kapitujt e librit', 'Bashkëpunim me administratën'],
    color: 'from-amber-600 to-orange-600',
  },
];

function PersonasSection() {
  return (
    <section id="për-kë" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="ls-reveal mx-auto max-w-2xl text-center">
          <SectionEyebrow>Për kë është</SectionEyebrow>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Ndërtuar për të tre rolet kryesore të autoshkollës.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600">
            Çdo person sheh saktësisht atë që i duhet — pa rrëmujë, pa qasje të panevojshme.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PERSONAS.map((p, i) => (
            <div
              key={p.role}
              className="ls-reveal relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-xl"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${p.color}`} />
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} text-white shadow-lg`}>
                <p.icon className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900">{p.role}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.desc}</p>
              <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   How it works — 4 steps
   ──────────────────────────────────────────────────────────────────────────── */

function HowSection() {
  const steps = [
    { n: '01', title: 'Krijoni llogarinë e autoshkollës', desc: 'Super-administratori krijon tenant-in tuaj dhe llogaritë e para — të gatshme për 1 minutë.' },
    { n: '02', title: 'Shtoni stafin tuaj', desc: 'Instruktorët, ligjëruesit dhe automjetet, me të dhënat e nevojshme dhe roleve të caktuara automatikisht.' },
    { n: '03', title: 'Regjistroni kandidatët', desc: 'Wizard me hapa që mbledh të gjitha të dhënat dhe i lidh me kategorinë, instruktorin dhe automjetin.' },
    { n: '04', title: 'Menaxhoni gjithçka', desc: 'Orët teorike & praktike, pagesat, vërtetimet, kalendarin, raportet — të gjitha në një vend.' },
  ];

  return (
    <section id="si-funksionon" className="relative bg-gradient-to-b from-slate-50 to-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="ls-reveal mx-auto max-w-2xl text-center">
          <SectionEyebrow>Si funksionon</SectionEyebrow>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Katër hapa nga zero deri në funksionim të plotë.
          </h2>
        </div>

        <div className="relative mt-16">
          {/* connecting line */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-9 hidden h-0.5 bg-gradient-to-r from-transparent via-primary-200 to-transparent lg:block"
          />
          <div className="grid gap-8 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="ls-reveal relative text-center"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="relative mx-auto grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-primary-200 bg-white text-primary-700 shadow-md shadow-primary-600/10">
                  <span className="text-lg font-bold tracking-tight">{s.n}</span>
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Final CTA
   ──────────────────────────────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section id="kontakt" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="ls-reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-indigo-700 px-8 py-14 text-center shadow-2xl shadow-primary-700/30 sm:px-16 sm:py-20">
          {/* Decorative road dashes */}
          <div className="ls-road absolute inset-x-0 bottom-10 h-1.5 opacity-40" aria-hidden />
          {/* Decorative blob */}
          <div aria-hidden className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Gati për t&apos;i thënë lamtumirë letrës?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-primary-50/95 sm:text-lg">
            Hyrini në llogarinë tuaj dhe filloni të menaxhoni autoshkollën në mënyrë moderne. Nëse nuk keni ende
            llogari, kontaktoni administratorin për ta krijuar.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-primary-700 shadow-lg transition hover:bg-primary-50"
            >
              Hyr në Platformë
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <a
              href="mailto:kontakt@autoshkolla-platform.com"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <Mail className="h-4 w-4" />
              Kontakto për llogari
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Footer
   ──────────────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-600/25">
              <Car className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
              AutoShkolla<span className="text-primary-600"> Platform</span>
            </span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
            Sistem modern menaxhimi për autoshkollat e Kosovës. Tërësisht në gjuhën shqipe, me dokumente zyrtare të
            integruara dhe optimizuar për punë në tablet & celular.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platforma</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li><a className="transition hover:text-primary-600" href="#veçoritë">Veçoritë</a></li>
            <li><a className="transition hover:text-primary-600" href="#për-kë">Për kë është</a></li>
            <li><a className="transition hover:text-primary-600" href="#si-funksionon">Si funksionon</a></li>
            <li><Link className="transition hover:text-primary-600" href="/login">Hyr</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kontakt</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /> kontakt@autoshkolla-platform.com</li>
            <li className="inline-flex items-center gap-2"><Award className="h-3.5 w-3.5 text-slate-400" /> Prishtinë, Kosovë</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-slate-200 px-6 pt-6 text-xs text-slate-500 sm:flex sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} AutoShkolla Platform. Të gjitha të drejtat e rezervuara.</div>
        <div className="mt-2 flex gap-5 sm:mt-0">
          <span>v1.0</span>
          <span>Ndërtuar me ❤️ në Kosovë</span>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Small shared bits
   ──────────────────────────────────────────────────────────────────────────── */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-700">
      <BarChart3 className="h-3 w-3" />
      {children}
    </div>
  );
}
