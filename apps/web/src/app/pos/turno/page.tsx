'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useShift } from '../../../lib/shift-context';
import { useUserSession } from '../../../lib/user-session';

const QUICK_AMOUNTS = [200, 300, 500, 1000, 2000];

export default function AbrirTurnoPage() {
  const router = useRouter();
  const { openShift, activeShift } = useShift();
  const { session } = useUserSession();
  const [openingCash, setOpeningCash] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [isScanningBiometric, setIsScanningBiometric] = useState(false);
  const [isBiometricRegistered, setIsBiometricRegistered] = useState(false);

  // Listado de sucursales dinámicas
  const [selectedBranch, setSelectedBranch] = useState('BR-01');
  const [selectedRegister, setSelectedRegister] = useState('Caja 01 - Principal');

  // Obtener sucursales de localStorage o usar semillas
  const branches = (() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('snapgad_branches_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return [
      { id: 'BR-01', name: 'Matriz Centro', registers: ['Caja 01 - Principal', 'Caja 02 - Rápida'] },
      { id: 'BR-02', name: 'Sucursal Poniente', registers: ['Caja 01 - Única'] },
      { id: 'BR-03', name: 'Bodega Norte Surtido', registers: ['Caja 01 - Carga B2B', 'Caja 02 - Devoluciones'] }
    ];
  })();

  const currentBranchObj = branches.find(b => b.id === selectedBranch) || branches[0];

  const handleBiometricAuth = async () => {
    setIsScanningBiometric(true);
    // Simular escaneo de huella digital vía WebAuthn
    await new Promise((r) => setTimeout(r, 1800));
    setIsScanningBiometric(false);
    setIsBiometricRegistered(true);
    
    // Auto-abrir turno con fondo establecido
    const amount = parseFloat(openingCash) || 0;
    openShift(amount, currentBranchObj.name, selectedRegister);
    router.push('/pos');
  };

  // Si ya hay turno activo, redirigir al POS
  if (activeShift) {
    router.replace('/pos');
    return null;
  }

  const handleOpen = async () => {
    const amount = parseFloat(openingCash) || 0;
    setIsOpening(true);
    await new Promise(r => setTimeout(r, 600));
    openShift(amount, currentBranchObj.name, selectedRegister);
    router.push('/pos');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="w-full max-w-md">

        {/* Logo y contexto */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-blue-700 flex items-center justify-center font-black text-white text-3xl mx-auto mb-4 shadow-xl shadow-blue-900/40">
            S
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Apertura de Turno</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {session.branchName} &middot; {session.cashRegisterName ?? 'Caja 01'}
          </p>
        </div>

        {/* Tarjeta principal */}
        <div
          className="rounded-2xl border p-8 shadow-2xl"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
        >
          {/* Cajero */}
          <div className="flex items-center gap-3 mb-8 pb-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div className="w-10 h-10 rounded-full bg-blue-700/20 text-blue-500 flex items-center justify-center font-black text-sm">
              {session.avatarInitials}
            </div>
            <div>
              <p className="font-bold text-sm">{session.name}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {session.role === 'cashier' ? 'Cajero' : session.role === 'admin' ? 'Administrador' : 'Dueño'}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs font-bold text-emerald-500">SISTEMA LISTO</p>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {/* Selectores de Sucursal y Caja Registradora */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-desc" style={{ color: 'var(--muted)' }}>
                🏢 SUCURSAL
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  const bId = e.target.value;
                  setSelectedBranch(bId);
                  const matched = branches.find(b => b.id === bId);
                  if (matched && matched.registers.length > 0) {
                    setSelectedRegister(matched.registers[0]);
                  }
                }}
                className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white font-semibold cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-desc" style={{ color: 'var(--muted)' }}>
                💰 CAJA ACTIVADA
              </label>
              <select
                value={selectedRegister}
                onChange={(e) => setSelectedRegister(e.target.value)}
                className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white font-semibold cursor-pointer"
              >
                {currentBranchObj.registers.map((r, idx) => (
                  <option key={idx} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fondo de caja */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
              Fondo Inicial de Caja
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold" style={{ color: 'var(--muted)' }}>$</span>
              <input
                type="number"
                placeholder="0.00"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-4 py-4 rounded-xl border text-2xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          </div>

          {/* Montos rápidos */}
          <div className="grid grid-cols-5 gap-2 mb-8">
            {QUICK_AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => setOpeningCash(String(amt))}
                className="py-2 rounded-lg border text-xs font-bold transition-all hover:border-blue-500 hover:text-blue-500"
                style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}
              >
                ${amt.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Módulo de Huella Digital Biométrica */}
          <div className="mb-6 border-t pt-6" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                🔑 Autorización Biométrica
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-600/10 text-emerald-500 font-bold">
                WEBAUTHN HABILITADO
              </span>
            </div>

            {isScanningBiometric ? (
              <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-emerald-950/20 border-emerald-500/30 animate-pulse">
                {/* Circular Scanning Wave Animation */}
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center animate-bounce mb-3 relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 animate-ping"></div>
                  <span className="text-2xl text-emerald-500">☝️</span>
                </div>
                <span className="text-xs font-bold text-emerald-500 tracking-wider">ESCANEANDO DACTILAR...</span>
                <span className="text-[10px] text-zinc-500 mt-1">Coloca tu huella sobre el lector</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleBiometricAuth}
                className="w-full py-3 rounded-xl border-dashed border-2 hover:border-emerald-500 hover:text-emerald-500 flex items-center justify-center gap-2.5 text-xs font-bold transition-all text-zinc-400"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <span className="text-md">☝️</span>
                ABRIR TURNO CON HUELLA BIOMÉTRICA
              </button>
            )}
          </div>

          {/* Botón de apertura */}
          <button
            onClick={handleOpen}
            disabled={isOpening || isScanningBiometric}
            className="w-full py-4 rounded-xl font-extrabold text-sm tracking-wider text-white transition-all disabled:opacity-60"
            style={{ backgroundColor: 'var(--success)' }}
          >
            {isOpening ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ABRIENDO TURNO...
              </span>
            ) : (
              `ABRIR CON CONTRASEÑA ($${parseFloat(openingCash || '0').toFixed(2)})`
            )}
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--muted)' }}>
          Todas las ventas serán registradas bajo este turno
        </p>
      </div>
    </div>
  );
}
