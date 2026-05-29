'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulación de autenticación local para el entorno de desarrollo
    setTimeout(() => {
      setIsLoading(false);
      router.push('/pos');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Theme Toggle Absoluto */}
      <button
        onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        className="absolute top-6 right-6 p-2 rounded border text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card)' }}
      >
        {theme === 'light' ? '🌙 MODO OSCURO' : '☀️ MODO CLARO'}
      </button>

      <div className="w-full max-w-md p-8 rounded-2xl border shadow-2xl" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-700 flex items-center justify-center font-bold text-white text-2xl mb-4 shadow-lg shadow-blue-900/20">
            S
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Acceso Operativo</h1>
          <p className="text-sm mt-2 font-medium" style={{ color: 'var(--muted)' }}>
            Ingrese sus credenciales de Cajero o Administrador para acceder al Punto de Venta.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cajero@mitienda.com"
              className="p-3 rounded border text-sm font-medium focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--card-border)',
                color: 'var(--foreground)'
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Contraseña
              </label>
              <a href="#" className="text-xs font-bold hover:underline" style={{ color: 'var(--primary)' }}>
                ¿Olvidó su contraseña?
              </a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="p-3 rounded border text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--card-border)',
                color: 'var(--foreground)'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-lg text-white font-bold text-sm tracking-wide transition-all"
            style={{ 
              backgroundColor: 'var(--primary)',
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'wait' : 'pointer'
            }}
          >
            {isLoading ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t text-center text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}>
          <p>Protegido con encriptación AES-256. Acceso exclusivo para personal autorizado de SNAPGAD POS.</p>
        </div>
      </div>
    </div>
  );
}
