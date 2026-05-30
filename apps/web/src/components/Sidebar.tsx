'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppTheme } from './theme-context';
import { useUserSession, UserRole } from '../lib/user-session';
import { SoundFx } from '../lib/pos-utils';
import { useShift } from '../lib/shift-context';
import AdminPinModal from './AdminPinModal';

export default function Sidebar({ onTriggerAction }: { onTriggerAction?: (action: string) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const { activeBranch, setActiveBranch, activeRegister, isSidebarCollapsed, setIsSidebarCollapsed } = useAppTheme();
  const { session, setRoleForDev } = useUserSession();
  const { activeShift, closeShift } = useShift();

  // Estados locales para seguridad y playground
  const [isBypassModalOpen, setIsBypassModalOpen] = useState(false);
  const [isTempUnlocked, setIsTempUnlocked] = useState(false);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);

  const handleLogout = () => {
    SoundFx.playWarning();
    router.push('/login');
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'cashier': return 'Cajero';
      case 'admin': return 'Administrador';
      case 'owner': return 'Propietario';
      case 'superadmin': return 'Superusuario';
      case 'cobranza': return 'Cobranza';
      case 'guest': return 'Invitado';
      default: return role;
    }
  };

  // Determinar si el selector de sucursal debe estar bloqueado
  // Bloqueado solo si es Cajero Y hay un turno de caja activo Y no se ha hecho bypass
  const isLocked = session.role === 'cashier' && activeShift !== null && !isTempUnlocked;

  const handleBypassSuccess = () => {
    setIsTempUnlocked(true);
    SoundFx.playSuccess();
  };

  const handleRoleChangeInPlayground = (role: UserRole) => {
    SoundFx.playBeep();
    setRoleForDev(role);

    // Gobernanza en caliente: si cambia a un rol sin permisos en admin o ajustes, expulsar
    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/ajustes');
    const hasPrivileges = role === 'owner' || role === 'admin' || role === 'superadmin';
    
    if (isAdminRoute && !hasPrivileges) {
      SoundFx.playWarning();
      router.push('/pos');
    }
  };

  const handleCloseShiftInPlayground = () => {
    SoundFx.playSuccess();
    closeShift();
    setIsTempUnlocked(false);
  };

  const menuItems = [
    {
      name: 'Punto de Venta',
      path: '/pos',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Inventarios',
      path: '/inventario',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: 'Clientes y Crédito',
      path: '/clientes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Gobernanza Admin',
      path: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Ajustes SAT',
      path: '/ajustes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      adminOnly: true,
    },
  ];

  return (
    <>
      <aside 
        className={`${isSidebarCollapsed ? 'w-16' : 'w-60'} bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 font-sans transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col">
          {/* Branding header */}
          <div className={`p-4 border-b border-slate-200 flex flex-col gap-2.5 ${isSidebarCollapsed ? 'items-center' : ''}`}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-md shrink-0">
                  P
                </div>
                {!isSidebarCollapsed && (
                  <div>
                    <span className="font-extrabold text-slate-800 text-lg tracking-tight">PoShop</span>
                    <span className="text-[10px] ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">v2</span>
                  </div>
                )}
              </div>

              {/* Toggle Button for collapsing sidebar */}
              <button
                onClick={() => {
                  SoundFx.playBeep();
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                }}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
              >
                {isSidebarCollapsed ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                  </svg>
                )}
              </button>
            </div>

            {/* Selector de Sucursales reactivo - Diseño Premium */}
            {!isSidebarCollapsed && (
              <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-xl shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-blue-500 font-extrabold flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Establecimiento
                  </span>
                  
                  {isLocked ? (
                    <button
                      onClick={() => {
                        SoundFx.playBeep();
                        setIsBypassModalOpen(true);
                      }}
                      className="text-[9px] font-extrabold text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 transition-all uppercase flex items-center gap-0.5 cursor-pointer"
                      title="Autorizar cambio con PIN de Supervisor"
                    >
                      🔓 Bloqueado
                    </button>
                  ) : isTempUnlocked ? (
                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                      Bypass Ok
                    </span>
                  ) : (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                
                <div className="relative">
                  <select
                    disabled={isLocked}
                    value={activeBranch}
                    onChange={(e) => {
                      setActiveBranch(e.target.value);
                      SoundFx.playBeep();
                      if (isTempUnlocked) setIsTempUnlocked(false);
                    }}
                    className={`w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer ${
                      isLocked ? 'opacity-65 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-100' : 'hover:border-slate-300'
                    }`}
                  >
                    <option value="Sucursal Matriz">Matriz Centro</option>
                    <option value="Sucursal Poniente">Sucursal Poniente</option>
                  </select>
                </div>

                <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-100 pt-1.5 font-mono">
                  <span>Caja: {activeRegister || 'Caja 01 - Principal'}</span>
                  <span className="text-emerald-600 font-bold uppercase">Activo</span>
                </div>
              </div>
            )}
          </div>

          {/* Menu Navigation */}
          <nav className="p-3 flex flex-col gap-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              const isRestricted = item.adminOnly && session.role !== 'owner' && session.role !== 'admin' && session.role !== 'superadmin';
              
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    SoundFx.playBeep();
                    if (isRestricted && onTriggerAction) {
                      onTriggerAction(item.path);
                    } else {
                      router.push(item.path);
                    }
                  }}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'} rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-bold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } cursor-pointer`}
                  title={isSidebarCollapsed ? item.name : undefined}
                >
                  <span className={isActive ? 'text-blue-600' : 'text-slate-400 shrink-0'}>{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <>
                      <span>{item.name}</span>
                      {item.adminOnly && (
                        <span className="ml-auto text-[8px] bg-amber-100 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">PIN</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer / User information */}
        <div className={`p-3 border-t border-slate-200 bg-slate-50 flex flex-col gap-2 ${isSidebarCollapsed ? 'items-center' : ''}`}>
          
          {/* Playground trigger button */}
          {!isSidebarCollapsed && (
            <button
              onClick={() => {
                SoundFx.playBeep();
                setIsPlaygroundOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
            >
              🧪 Modo Pruebas
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs uppercase shrink-0">
              {session.avatarInitials || session.name.substring(0, 2)}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">{session.name.toUpperCase()}</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{getRoleDisplayName(session.role)}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-red-50 text-[10px] text-slate-600 hover:text-red-600 hover:border-red-200 font-bold transition-colors uppercase tracking-wider cursor-pointer`}
            title="Cerrar Sesión"
          >
            {isSidebarCollapsed ? (
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            ) : (
              <span>Cerrar Sesión</span>
            )}
          </button>
        </div>
      </aside>

      {/* MODAL DE BYPASS ADMINISTRATIVO */}
      <AdminPinModal
        isOpen={isBypassModalOpen}
        onClose={() => setIsBypassModalOpen(false)}
        onSuccess={handleBypassSuccess}
        title="Desbloquear Sucursal de Caja"
      />

      {/* 🧪 PLAYGROUND DRAWER (Cajón lateral de pruebas) */}
      {isPlaygroundOpen && (
        <div className="fixed inset-0 z-50 flex justify-end font-sans">
          {/* Backdrop */}
          <div 
            onClick={() => setIsPlaygroundOpen(false)}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-300"
          />
          
          {/* Drawer Panel */}
          <div className="relative w-80 bg-white border-l border-slate-200 h-full p-5 flex flex-col justify-between shadow-2xl z-10 animate-fade-in">
            <div className="flex flex-col gap-6">
              
              {/* Drawer Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">
                    🧪 Playground Dev
                  </span>
                  <span className="bg-blue-100 text-blue-700 text-[8px] px-1 rounded font-bold">
                    V2
                  </span>
                </div>
                <button
                  onClick={() => setIsPlaygroundOpen(false)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Selector Rápido de Roles */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Cambiar Rol en Caliente
                </label>
                <div className="flex flex-col gap-1.5">
                  {(['owner', 'admin', 'cashier', 'cobranza', 'guest', 'superadmin'] as UserRole[]).map((r) => {
                    const isActive = session.role === r;
                    const rNames = {
                      owner: '👑 Propietario',
                      admin: '💼 Administrador',
                      cashier: '💵 Cajero Activo',
                      cobranza: '🤝 Gestor Cobranza',
                      guest: '👁️ Invitado / Auditor',
                      superadmin: '⚡ Superadministrador'
                    };
                    return (
                      <button
                        key={r}
                        onClick={() => handleRoleChangeInPlayground(r)}
                        className={`w-full py-2 px-3 rounded-lg text-left text-xs font-bold border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {rNames[r]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estado del Turno Contable */}
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Simulación de Turno (Shift)
                </label>
                
                {activeShift ? (
                  <div className="flex flex-col gap-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Turno Abierto</div>
                      <div className="text-xs font-extrabold text-slate-800 mt-1">{activeShift.branchName}</div>
                      <div className="text-[10px] text-slate-600 font-semibold mt-0.5">{activeShift.cashRegisterName}</div>
                      <div className="text-[10px] font-bold text-slate-800 mt-2">
                        Fondo: <span className="text-blue-600">${activeShift.openingCash}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseShiftInPlayground}
                      className="w-full py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Cerrar Turno (Corte Rápido)
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center text-xs font-semibold text-red-600">
                      ❌ SIN TURNO CONTABLE ACTIVO
                    </div>
                    <button
                      onClick={() => {
                        SoundFx.playBeep();
                        setIsPlaygroundOpen(false);
                        router.push('/pos/turno');
                      }}
                      className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer text-center"
                    >
                      Ir a Apertura de Caja
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Info y Ayuda */}
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed text-center border-t border-slate-100 pt-4">
              <p>Entorno de pruebas sincronizado con el PIN maestro 0000.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
