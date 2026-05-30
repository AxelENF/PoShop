'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const router = useRouter();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');

    // Reloj en tiempo real
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      setError('Sistema de autenticación no configurado. Contacte al administrador.');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        // Mensajes de error amigables en español
        const errorMessages: Record<string, string> = {
          'Invalid login credentials': 'Credenciales incorrectas. Verifica tu correo y contraseña.',
          'Email not confirmed': 'Correo no confirmado. Revisa tu bandeja de entrada.',
          'Too many requests': 'Demasiados intentos. Espera unos minutos antes de reintentar.',
        };
        setError(errorMessages[authError.message] || authError.message);
        setIsLoading(false);
        return;
      }

      router.push('/pos/turno');
    } catch (err: any) {
      setError('Error de conexión. Verifica tu red e inténtalo de nuevo.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Escribe tu correo electrónico antes de solicitar recuperación.');
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setError('');
      alert('¡Listo! Revisa tu correo para recuperar acceso.');
    } catch {
      setError('No se pudo enviar el correo de recuperación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>

      {/* ── PANEL IZQUIERDO — Branding Premium ── */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-2/5 flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0a0f1e 0%, #0d1b3e 35%, #071432 70%, #050e2a 100%)',
        }}
      >
        {/* Orb decorativo */}
        <div
          className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #0066FF 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #FF5500 0%, transparent 70%)' }}
        />

        {/* Logo + marca */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg"
              style={{ background: 'linear-gradient(135deg, #0066FF, #0044CC)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <span className="font-black text-white text-xl tracking-tight">PoShop</span>
              <span
                className="ml-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,102,255,0.25)', color: '#60a5fa', border: '1px solid rgba(0,102,255,0.3)' }}
              >
                Cloud POS
              </span>
            </div>
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
            Gobernanza Total<br />
            <span style={{ color: '#0066FF' }}>de tu Comercio.</span>
          </h1>
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Punto de venta inteligente, inventario en tiempo real, crédito de clientes y reportes gerenciales — todo en una sola plataforma.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          {[
            { icon: '⚡', title: 'POS Ultrarrápido', desc: 'Escaneo de barras y cobro en segundos' },
            { icon: '📦', title: 'Inventario Cloud', desc: 'Sincronizado en tiempo real con Supabase' },
            { icon: '💳', title: 'Crédito de Clientes', desc: 'Líneas de crédito con historial contable' },
            { icon: '📊', title: 'Dashboard Ejecutivo', desc: 'KPIs y alertas inteligentes en vivo' },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: 'rgba(0,102,255,0.15)', border: '1px solid rgba(0,102,255,0.2)' }}
              >
                {f.icon}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{f.title}</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer del panel */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
            SNAPGAD Technology © {new Date().getFullYear()}
          </span>
          <span className="text-xs font-mono font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {currentTime}
          </span>
        </div>
      </div>

      {/* ── PANEL DERECHO — Formulario de Acceso ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">

          {/* Encabezado móvil (solo visible en pantallas pequeñas) */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0066FF, #0044CC)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-black text-slate-900 text-lg">PoShop</span>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
              Acceso Autorizado
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Ingresa tus credenciales corporativas para continuar.
            </p>
          </div>

          {/* Alerta de error premium */}
          {error && (
            <div
              className="mb-5 p-3.5 rounded-xl flex items-start gap-3 text-sm font-semibold"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
              }}
            >
              <span className="text-base leading-tight flex-shrink-0">⚠️</span>
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-[10px] font-black uppercase tracking-widest mb-1.5"
                style={{ color: '#64748b' }}
              >
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@comercio.com"
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all duration-200"
                style={{
                  border: '1.5px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0066FF';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,102,255,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                }}
              />
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: '#64748b' }}
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] font-bold transition-colors"
                  style={{ color: '#0066FF' }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#0044CC')}
                  onMouseOut={(e) => (e.currentTarget.style.color = '#0066FF')}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all duration-200"
                  style={{
                    border: '1.5px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0066FF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0,102,255,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Botón de acceso */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-3.5 rounded-xl text-sm font-black text-white tracking-wide transition-all duration-200 mt-2 relative overflow-hidden"
              style={{
                background: isLoading ? '#94a3b8' : 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
                boxShadow: isLoading ? 'none' : '0 4px 14px rgba(0,102,255,0.35)',
                cursor: isLoading || !email || !password ? 'not-allowed' : 'pointer',
              }}
              onMouseOver={(e) => {
                if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  VERIFICANDO IDENTIDAD...
                </span>
              ) : (
                'INICIAR SESIÓN'
              )}
            </button>
          </form>

          {/* Divider y contacto */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid #f1f5f9' }}>
            <p className="text-center text-[11px] text-slate-400 font-medium">
              ¿Problemas para acceder?{' '}
              <a
                href="mailto:soporte@snapgad.com"
                className="font-bold transition-colors"
                style={{ color: '#0066FF' }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#0044CC')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#0066FF')}
              >
                Contactar soporte
              </a>
            </p>
          </div>

          {/* Badge de seguridad */}
          <div
            className="mt-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
              Acceso Cifrado con TLS 1.3
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
