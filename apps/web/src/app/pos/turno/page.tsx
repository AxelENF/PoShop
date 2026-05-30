'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShift } from '../../../lib/shift-context';
import { useUserSession } from '../../../lib/user-session';
import { useAppTheme } from '../../../components/theme-context';
import { SoundFx } from '../../../lib/pos-utils';

const BRANCHES_DATA = [
  { id: 'BR-01', name: 'Matriz Centro', registers: ['Caja 01 - Principal', 'Caja 02 - Rápida'] },
  { id: 'BR-02', name: 'Sucursal Poniente', registers: ['Caja 01 - Única'] },
  { id: 'BR-03', name: 'Bodega Norte Surtido', registers: ['Caja 01 - Carga B2B', 'Caja 02 - Devoluciones'] }
];

export default function TurnoLanzamientoPage() {
  const router = useRouter();
  const { openShift, activeShift } = useShift();
  const { session, setActiveCashier } = useUserSession();
  const { activeBranch, setActiveBranch, setActiveBranchId, setActiveRegister } = useAppTheme();
  
  const [selectedBranch, setSelectedBranch] = useState(activeBranch || 'Matriz Centro');
  const [selectedRegister, setSelectedRegister] = useState('Caja 01 - Principal');
  const [openingCash, setOpeningCash] = useState('1000');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  // Update selected register when selected branch changes
  useEffect(() => {
    const branchInfo = BRANCHES_DATA.find(b => b.name === selectedBranch);
    if (branchInfo && branchInfo.registers.length > 0) {
      setSelectedRegister(branchInfo.registers[0]);
    }
  }, [selectedBranch]);

  // Si ya hay un turno activo, redirigir directo al POS
  useEffect(() => {
    if (activeShift) {
      router.push('/pos');
    }
  }, [activeShift, router]);

  const handleOpenTurno = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (pin !== '0000') {
      SoundFx.playWarning();
      setErrorMsg('PIN de seguridad incorrecto. Intente nuevamente.');
      return;
    }

    setIsOpening(true);
    SoundFx.playBeep();

    const selectedBranchInfo = BRANCHES_DATA.find(b => b.name === selectedBranch) || BRANCHES_DATA[0];

    setTimeout(() => {
      // Registrar sucursal en el contexto global
      setActiveBranch(selectedBranch);
      setActiveBranchId(selectedBranchInfo.id);
      setActiveRegister(selectedRegister);
      
      // Activar cajero en el session context
      setActiveCashier({
        id: session.id,
        name: session.name,
        role: session.role,
        branchId: selectedBranchInfo.id,
      });
      
      // Abrir el turno contable
      openShift(Number(openingCash), selectedBranch, selectedRegister);
      setIsOpening(false);
      router.push('/pos');
    }, 600);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cashier': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cobranza': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Administrador';
      case 'cashier': return 'Cajero';
      case 'cobranza': return 'Cobranza';
      case 'guest': return 'Invitado';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        
        {/* Header de bienvenida */}
        <div className="flex flex-col items-center mb-6 text-center border-b border-slate-100 pb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-white text-xl mb-3 shadow-md">
            P
          </div>
          <h1 className="text-xl font-extrabold text-slate-800">Lanzamiento de Turno</h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Seleccione los parámetros operativos para abrir la caja.
          </p>
        </div>

        {/* Info de Usuario Logueado */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60 mb-6">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 uppercase">
            {session.avatarInitials || session.name.substring(0,2)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-extrabold text-slate-800 uppercase">{session.name}</span>
            <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase mt-0.5 w-max ${getRoleBadgeColor(session.role)}`}>
              {getRoleDisplayName(session.role)}
            </span>
          </div>
          <button
            onClick={() => {
              SoundFx.playBeep();
              router.push('/login');
            }}
            className="ml-auto text-[9px] font-bold text-red-500 hover:text-red-700 transition-colors uppercase cursor-pointer"
          >
            Cambiar
          </button>
        </div>

        <form onSubmit={handleOpenTurno} className="flex flex-col gap-4">
          
          {/* Sucursal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Seleccionar Sucursal
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                SoundFx.playBeep();
              }}
              className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              {BRANCHES_DATA.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Caja Registradora */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Caja Registradora
            </label>
            <select
              value={selectedRegister}
              onChange={(e) => {
                setSelectedRegister(e.target.value);
                SoundFx.playBeep();
              }}
              className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              {(BRANCHES_DATA.find(b => b.name === selectedBranch)?.registers || ['Caja 01 - Principal']).map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          {/* Monto Inicial */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Dinero Inicial en Caja (Fondo)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-extrabold text-slate-400">$</span>
              <input
                type="number"
                required
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="1000.00"
                className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* PIN de Seguridad */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              PIN de Acceso Operativo
            </label>
            <input
              type="password"
              required
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full p-2.5 rounded-lg border border-slate-200 text-center tracking-widest text-sm font-extrabold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-[10px] font-extrabold text-red-600 uppercase text-center mt-1">
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isOpening}
            className="w-full mt-3 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs tracking-wider transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
          >
            {isOpening ? 'ABRIENDO TURNO...' : 'ABRIR CAJA Y ACCEDER AL POS'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            Para pruebas usar el pin maestro: <span className="text-blue-500 font-extrabold">0000</span>
          </p>
        </div>
      </div>
    </div>
  );
}
