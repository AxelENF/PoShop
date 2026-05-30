'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppTheme } from './theme-context';
import { useUserSession } from '../lib/user-session';
import { SoundFx } from '../lib/pos-utils';

export default function Sidebar({ onTriggerAction }: { onTriggerAction?: (action: string) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeBranch, setActiveBranch, isSidebarCollapsed, setIsSidebarCollapsed } = useAppTheme();
  const { session } = useUserSession();

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
      default: return role;
    }
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
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
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

          {!isSidebarCollapsed && (
            <div className="mt-2">
              <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Sucursal de Caja</label>
              <select
                value={activeBranch}
                onChange={(e) => {
                  setActiveBranch(e.target.value);
                  SoundFx.playBeep();
                }}
                className="mt-1 w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-2 py-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Sucursal Matriz">Sucursal Matriz</option>
                <option value="Sucursal Poniente">Sucursal Poniente</option>
              </select>
            </div>
          )}
        </div>

        {/* Menu Navigation */}
        <nav className="p-3 flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const isRestricted = item.adminOnly && session.role !== 'owner' && session.role !== 'superadmin';
            
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
                }`}
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs uppercase shrink-0">
            {session.name.substring(0, 2)}
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
  );
}
