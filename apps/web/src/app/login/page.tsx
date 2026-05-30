'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import { trpc } from '../../utils/trpc/client';

type LoginMethod = 'password' | 'magic-link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const router = useRouter();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');

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

  // Instanciar mutation de tRPC para auto-confirmar email
  const autoConfirmMutation = trpc.auth.autoConfirmUser.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfoMessage('');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      setError('Sistema de autenticación no configurado. Contacte al administrador.');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      if (loginMethod === 'password') {
        let { error: authError, data } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        // 💡 Si el correo no está confirmado, ¡lo auto-confirmamos usando nuestra API del servidor!
        if (authError && authError.message === 'Email not confirmed') {
          try {
            await autoConfirmMutation.mutateAsync({ email: email.trim().toLowerCase() });
            
            // Intentar login de nuevo ya confirmado
            const retry = await supabase.auth.signInWithPassword({
              email: email.trim().toLowerCase(),
              password,
            });
            authError = retry.error;
          } catch (confirmErr: any) {
            setError(confirmErr.message || 'No se pudo confirmar tu correo de forma automática.');
            setIsLoading(false);
            return;
          }
        }

        if (authError) {
          const errorMessages: Record<string, string> = {
            'Invalid login credentials': 'Credenciales incorrectas. Verifica tu correo y contraseña.',
            'Too many requests': 'Demasiados intentos. Espera unos minutos antes de reintentar.',
          };
          setError(errorMessages[authError.message] || authError.message);
          setIsLoading(false);
          return;
        }

        router.push('/pos/turno');
      } else {
        // Enlace mágico sin contraseña
        const { error: magicError } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (magicError) {
          setError(magicError.message);
          setIsLoading(false);
          return;
        }

        setInfoMessage('¡Enlace enviado! Revisa tu bandeja de entrada o carpeta de spam y haz clic en el botón de acceso.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError('Error de conexión. Verifica tu red e inténtalo de nuevo.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const supabase = createClient();
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (googleError) {
        setError(googleError.message);
        setIsLoading(false);
      }
    } catch (err: any) {
      setError('No se pudo inicializar la autenticación con Google.');
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
      setInfoMessage('¡Listo! Revisa tu correo para recuperar acceso.');
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

          {/* Encabezado móvil */}
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
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
              Acceso Autorizado
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Elige tu método de acceso preferido.
            </p>
          </div>

          {/* Selector de Método */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setLoginMethod('password'); setError(''); setInfoMessage(''); }}
              className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
              style={{
                backgroundColor: loginMethod === 'password' ? '#ffffff' : 'transparent',
                color: loginMethod === 'password' ? '#0f172a' : '#64748b',
                boxShadow: loginMethod === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              🔑 Contraseña
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('magic-link'); setError(''); setInfoMessage(''); }}
              className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
              style={{
                backgroundColor: loginMethod === 'magic-link' ? '#ffffff' : 'transparent',
                color: loginMethod === 'magic-link' ? '#0f172a' : '#64748b',
                boxShadow: loginMethod === 'magic-link' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              ✉️ Enlace al Email
            </button>
          </div>

          {/* Alertas */}
          {error && (
            <div
              className="mb-5 p-3.5 rounded-xl flex items-start gap-3 text-sm font-semibold"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}
            >
              <span className="text-base leading-tight flex-shrink-0">⚠️</span>
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {infoMessage && (
            <div
              className="mb-5 p-3.5 rounded-xl flex items-start gap-3 text-sm font-semibold"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}
            >
              <span className="text-base leading-tight flex-shrink-0">📧</span>
              <span className="leading-snug">{infoMessage}</span>
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

            {/* Contraseña (solo si el método es password) */}
            {loginMethod === 'password' && (
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
            )}

            {/* Botón de acceso tradicional */}
            <button
              type="submit"
              disabled={isLoading || !email || (loginMethod === 'password' && !password)}
              className="w-full py-3.5 rounded-xl text-sm font-black text-white tracking-wide transition-all duration-200 mt-2 relative overflow-hidden"
              style={{
                background: isLoading ? '#94a3b8' : 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
                boxShadow: isLoading ? 'none' : '0 4px 14px rgba(0,102,255,0.35)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  PROCESANDO...
                </span>
              ) : loginMethod === 'password' ? (
                'INICIAR SESIÓN'
              ) : (
                'ENVIAR ENLACE AL CORREO'
              )}
            </button>
          </form>

          {/* Separador */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-[1px] bg-slate-200"></div>
            <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">O</span>
            <div className="flex-1 h-[1px] bg-slate-200"></div>
          </div>

          {/* Acceso con Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all duration-150 flex items-center justify-center gap-3"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.285 1.514-1.14 2.8-2.43 3.655v3.027h3.915c2.295-2.115 3.66-5.227 3.66-8.54z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.955-1.08 7.935-2.91l-3.915-3.027c-1.08.72-2.475 1.155-4.02 1.155-3.09 0-5.715-2.085-6.645-4.89H1.32v3.135C3.3 22.395 7.395 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.355 14.328a7.17 7.17 0 0 1 0-4.596V6.597H1.32a11.976 11.976 0 0 0 0 10.866l4.035-3.135z"
              />
              <path
                fill="#EA4335"
                d="M12 4.755c1.77 0 3.36.615 4.605 1.8l3.435-3.435C17.94 1.185 15.225 0 12 0 7.395 0 3.3 1.605 1.32 5.097l4.035 3.135c.93-2.805 3.555-4.89 6.645-4.89z"
              />
            </svg>
            Acceder con Google
          </button>

          {/* Footer */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid #f1f5f9' }}>
            <p className="text-center text-[11px] text-slate-400 font-medium">
              ¿Problemas para acceder?{' '}
              <a
                href="mailto:soporte@snapgad.com"
                className="font-bold transition-colors"
                style={{ color: '#0066FF' }}
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
