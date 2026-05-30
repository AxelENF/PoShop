'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserSession, UserRole } from '../../lib/user-session';
import { SoundFx } from '../../lib/pos-utils';
import { createClient } from '../../utils/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { setRoleForDev } = useUserSession();

  useEffect(() => {
    // Forzar tema claro en el HTML
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    SoundFx.playBeep();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Mock Bypass for local development if variables are not configured
      setTimeout(() => {
        setIsLoading(false);
        setRoleForDev('admin');
        router.push('/pos/turno');
      }, 800);
      return;
    }

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      // Redirigir a la pantalla de turno para la apertura contable/PIN del cajero
      router.push('/pos/turno');
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el servidor de autenticación.');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    SoundFx.playBeep();
    setIsLoading(true);
    setRoleForDev(role);
    
    setTimeout(() => {
      setIsLoading(false);
      router.push('/pos/turno');
    }, 400);
  };

  const testAccounts = [
    {
      role: 'owner' as UserRole,
      name: 'Roberto Díaz',
      desc: 'Propietario',
      initials: 'RD',
      color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
    },
    {
      role: 'admin' as UserRole,
      name: 'Carlos Moreno',
      desc: 'Administrador',
      initials: 'CM',
      color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
    },
    {
      role: 'cashier' as UserRole,
      name: 'Ana González',
      desc: 'Cajero',
      initials: 'AG',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
    },
    {
      role: 'cobranza' as UserRole,
      name: 'Sofía Martínez',
      desc: 'Cobranza',
      initials: 'SM',
      color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
    },
    {
      role: 'guest' as UserRole,
      name: 'Auditor Externo',
      desc: 'Invitado',
      initials: 'AE',
      color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl border border-slate-200 shadow-xl transition-all duration-300">
        
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-white text-2xl mb-4 shadow-lg shadow-blue-500/20">
            P
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Acceso Operativo &bull; PoShop</h1>
          <p className="text-sm mt-1.5 font-semibold text-slate-500">
            Ingrese credenciales autorizadas o use las tarjetas de pruebas rápidas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Formulario tradicional */}
          <div className="md:col-span-5 flex flex-col justify-center">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold p-2.5 rounded-lg uppercase tracking-wider">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@poshop.com"
                  className="p-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="p-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs tracking-wider transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
              </button>
            </form>
          </div>

          {/* Separador vertical en desktop */}
          <div className="hidden md:flex md:col-span-1 justify-center items-center">
            <div className="h-full w-[1px] bg-slate-100"></div>
          </div>

          {/* Tarjetas de Prueba rápidas */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
              🧪 Cuentas Rápidas de Prueba (1-Clic)
            </label>
            <div className="flex flex-col gap-2">
              {testAccounts.map((acc) => (
                <button
                  key={acc.role}
                  disabled={isLoading}
                  onClick={() => handleQuickLogin(acc.role)}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-white hover:shadow-sm transition-all duration-200 text-left w-full cursor-pointer disabled:opacity-50"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${acc.color} shrink-0`}>
                    {acc.initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-extrabold text-slate-800 leading-tight">{acc.name}</span>
                    <span className="text-[10px] text-slate-500 font-semibold mt-0.5">{acc.desc}</span>
                  </div>
                  <span className="ml-auto text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">
                    PIN 0000
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 pt-5 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
          <p>SNAPGAD POS &bull; Acceso para entorno de pruebas de desarrollo homologado.</p>
        </div>
      </div>
    </div>
  );
}
