'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  // Inicialización inteligente persistente para evitar destellos (hydration matching)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // 1. Cargar tema desde LocalStorage de forma segura en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = window.localStorage.getItem('snapgad_theme') as 'light' | 'dark';
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      setMounted(true);
    }
  }, []);

  // 2. Persistir cambio de tema
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    }
  };

  // Evitar desajustes visuales iniciales durante hidratación
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-xl">S</div>
          <span className="text-zinc-500 text-xs tracking-widest font-bold">CARGANDO SNAPGAD...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col justify-between overflow-hidden relative font-sans"
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
    >
      {/* Halo de luz ambiental radial premium */}
      <div className="gradient-aura" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex justify-between items-center border-b z-10 relative" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center font-extrabold text-white text-md shadow-lg shadow-blue-500/10">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight">SNAPGAD</span>
              <span className="text-[9px] font-bold tracking-widest uppercase bg-blue-600/10 border border-blue-500/20 text-blue-500 px-2 py-0.5 rounded">
                v2.4.0 PRO
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold hidden sm:block">Enterprise Retail Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Indicador de Estado Multi-Tenant */}
          <div className="hidden md:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-[10px] font-bold text-emerald-500 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            BAJO DEMANDA: MULTI-TENANT RLS ACTIVO
          </div>

          {/* Selector de Tema */}
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-2 rounded-lg border text-[10px] font-bold hover:opacity-80 transition-all cursor-pointer flex items-center gap-1.5 bg-zinc-900/40 text-white"
            style={{ borderColor: 'var(--card-border)' }}
          >
            {theme === 'light' ? '🌙 TEMA OSCURO' : '☀️ TEMA CLARO'}
          </button>
        </div>
      </header>

      {/* Hero Portal */}
      <main className="w-full max-w-6xl mx-auto px-6 py-14 flex-grow flex flex-col items-center justify-center text-center z-10 relative space-y-12">
        
        {/* Core Badges */}
        <div className="flex flex-wrap justify-center gap-2.5">
          <span className="text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 px-3 py-1.5 rounded-full tracking-wide">
            ⚡ Latencia Remota &lt; 5ms
          </span>
          <span className="text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 px-3 py-1.5 rounded-full tracking-wide">
            🔒 Aislamiento Criptográfico RLS
          </span>
          <span className="text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 px-3 py-1.5 rounded-full tracking-wide">
            🧾 CFDI 4.0 SAT Autorizado
          </span>
        </div>

        {/* Hero Headlines */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Gobernanza Comercial de <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Alta Precisión
            </span>
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
            Plataforma comercial de nivel SaaS para control administrativo multi-sucursal, caja registradora de alto desempeño y auditoría inmutable en el territorio mexicano.
          </p>
        </div>

        {/* Action Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
          <Link href="/pos" className="no-underline group">
            <div className="p-6 glass-card h-full flex flex-col justify-between space-y-4">
              <div className="space-y-2 text-left">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-lg shadow-sm">
                  ⚡
                </div>
                <h3 className="font-extrabold text-sm text-foreground group-hover:text-blue-500 transition-colors">Terminal del Cajero</h3>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Cobro táctil acelerado, básculas de pesaje decimal, cálculo IVA + IEPS y fiado ágil.
                </p>
              </div>
              <div className="text-[10px] font-bold text-blue-500 flex items-center gap-1 mt-2 tracking-wider uppercase">
                Iniciar Caja &rarr;
              </div>
            </div>
          </Link>

          <Link href="/inventario" className="no-underline group">
            <div className="p-6 glass-card h-full flex flex-col justify-between space-y-4">
              <div className="space-y-2 text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg shadow-sm">
                  📦
                </div>
                <h3 className="font-extrabold text-sm text-foreground group-hover:text-amber-500 transition-colors">Catálogo de Inventario</h3>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Supervisión de stock crítico, semáforo FEFO de lotes caducos y desensamble de cajas.
                </p>
              </div>
              <div className="text-[10px] font-bold text-amber-500 flex items-center gap-1 mt-2 tracking-wider uppercase">
                Abrir Catálogo &rarr;
              </div>
            </div>
          </Link>

          <Link href="/clientes" className="no-underline group">
            <div className="p-6 glass-card h-full flex flex-col justify-between space-y-4">
              <div className="space-y-2 text-left">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg shadow-sm">
                  👥
                </div>
                <h3 className="font-extrabold text-sm text-foreground group-hover:text-indigo-500 transition-colors">Cartera de Clientes</h3>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Administración de cuentas corrientes, límites de crédito dinámicos y alertas de adeudo.
                </p>
              </div>
              <div className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 mt-2 tracking-wider uppercase">
                Ver Cartera &rarr;
              </div>
            </div>
          </Link>

          <Link href="/admin" className="no-underline group">
            <div className="p-6 glass-card h-full flex flex-col justify-between space-y-4">
              <div className="space-y-2 text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg shadow-sm">
                  📊
                </div>
                <h3 className="font-extrabold text-sm text-foreground group-hover:text-emerald-500 transition-colors">Panel Administrativo</h3>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Monitoreo de KPIs de venta, giros comerciales, auditoría y Copiloto de Inteligencia Artificial.
                </p>
              </div>
              <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-2 tracking-wider uppercase">
                Abrir Panel &rarr;
              </div>
            </div>
          </Link>
        </div>

        {/* Live Monospace System Log / Mock Console Widget */}
        <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-left font-mono text-[10px] space-y-2 shadow-2xl relative">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2 text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="ml-1 text-[9px] tracking-widest font-bold">SNAPGAD CORE SYSTEM CONSOLE</span>
            </span>
            <span className="text-[9px]">ONLINE &middot; PORT 3000</span>
          </div>
          <div className="space-y-1.5 text-zinc-400">
            <p className="text-blue-400 flex items-center gap-2"><span>[SYSTEM]</span> Initializing client routing clusters...</p>
            <p className="text-emerald-400 flex items-center gap-2"><span>[DATABASE]</span> Supabase PostgreSQL cluster securely online (ntxskrigjzzlkqvyefhy)</p>
            <p className="text-purple-400 flex items-center gap-2"><span>[SECURITY]</span> Multi-tenant database RLS policies verified successfully (100% data isolation)</p>
            <p className="text-yellow-500 flex items-center gap-2"><span>[HARDWARE]</span> Local Device Bridge connected via websocket (COM3 / ws://localhost:9099)</p>
            <p className="text-zinc-500 flex items-center gap-2"><span>[SUCCESS]</span> All systems operational. Awaiting retail clerk interaction.</p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t py-6 text-center z-10 relative" style={{ borderColor: 'var(--card-border)' }}>
        <p className="text-[10px] text-zinc-500 tracking-wider">
          SNAPGAD TECHNOLOGY &copy; {new Date().getFullYear()} &middot; GOBERNANZA OPERATIVA PROACTIVA &middot; MÉXICO
        </p>
      </footer>
    </div>
  );
}
