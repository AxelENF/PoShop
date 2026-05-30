'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import { trpc } from '../../utils/trpc/client';

const STEPS = [
  { num: 1, label: 'Tu Negocio', icon: '🏪' },
  { num: 2, label: 'Estructura', icon: '🏗️' },
  { num: 3, label: 'Catálogo', icon: '📦' },
  { num: 4, label: 'Lanzamiento', icon: '🚀' },
];

const PROFILES = [
  { value: 'general', label: '🛍️ Tienda General / Abarrotes', desc: 'Retail tradicional con múltiples categorías' },
  { value: 'weight', label: '🥩 Venta por Peso y Granel', desc: 'Carnicería, cremería, tortillería' },
  { value: 'catalog', label: '🔧 Catálogo Especializado', desc: 'Ferretería, refacciones, librería' },
  { value: 'distribution', label: '🚚 Distribución y Mayoreo', desc: 'Ventas B2B y rutas de distribución' },
  { value: 'services', label: '✂️ Servicios con Insumos', desc: 'Papelería, barbería, estética' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [formData, setFormData] = useState({
    businessName: '',
    profile: 'general',
    branchName: 'Matriz Principal',
    cashRegisterName: 'Caja 01',
    preloadSeedData: true,
  });

  const setupMutation = trpc.onboarding.setup.useMutation();

  // Obtener el usuario autenticado desde Supabase
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      setUserId(session.user.id);
      setIsLoadingUser(false);
    };
    getUser();
  }, [router]);

  const handleFinish = async () => {
    if (!userId) return;

    try {
      await setupMutation.mutateAsync({
        userId,
        businessName: formData.businessName,
        profile: formData.profile as any,
        branchName: formData.branchName,
        cashRegisterName: formData.cashRegisterName,
        preloadSeedData: formData.preloadSeedData,
      });

      router.replace('/pos/turno');
    } catch (err: any) {
      console.error('Error en setup:', err);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header
        className="border-b bg-white px-6 py-4 flex items-center justify-between"
        style={{ borderColor: '#e2e8f0' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0066FF, #0044CC)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <span className="font-black text-slate-900 text-sm">PoShop</span>
            <span
              className="ml-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
            >
              Configuración Inicial
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-400">Paso {step} de {STEPS.length}</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Progress steps */}
        <div className="flex items-center justify-between mb-10 relative">
          <div
            className="absolute top-4 left-0 right-0 h-0.5"
            style={{ background: '#e2e8f0', zIndex: 0 }}
          />
          <div
            className="absolute top-4 left-0 h-0.5 transition-all duration-500"
            style={{
              background: 'linear-gradient(90deg, #0066FF, #0044CC)',
              width: `${((step - 1) / (STEPS.length - 1)) * 100}%`,
              zIndex: 1,
            }}
          />
          {STEPS.map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-2 relative" style={{ zIndex: 2 }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300"
                style={{
                  background: step >= s.num ? '#0066FF' : '#ffffff',
                  border: step >= s.num ? '2px solid #0066FF' : '2px solid #e2e8f0',
                  color: step >= s.num ? '#ffffff' : '#94a3b8',
                  boxShadow: step === s.num ? '0 0 0 4px rgba(0,102,255,0.15)' : 'none',
                }}
              >
                {step > s.num ? '✓' : s.icon}
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-wide hidden sm:block"
                style={{ color: step >= s.num ? '#0066FF' : '#94a3b8' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Card principal */}
        <div
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: '1px solid #e2e8f0' }}
        >
          <div className="p-8 md:p-10">

            {/* STEP 1: Identidad del negocio */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                  ¿Cómo se llama tu negocio?
                </h2>
                <p className="text-sm text-slate-500 mb-8 font-medium">
                  Personaliza PoShop para que se adapte perfectamente a tu giro comercial.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Nombre del Negocio o Empresa *
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Ej. Abarrotes La Unión"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all"
                      style={{
                        border: '1.5px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#0066FF';
                        e.target.style.boxShadow = '0 0 0 3px rgba(0,102,255,0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Perfil Comercial
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PROFILES.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, profile: p.value })}
                          className="p-4 rounded-xl text-left transition-all duration-200"
                          style={{
                            border: formData.profile === p.value ? '2px solid #0066FF' : '1.5px solid #e2e8f0',
                            background: formData.profile === p.value ? '#eff6ff' : '#ffffff',
                          }}
                        >
                          <div className="font-bold text-sm text-slate-900 mb-0.5">{p.label}</div>
                          <div className="text-[11px] text-slate-500 font-medium">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Estructura operativa */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                  Estructura Operativa
                </h2>
                <p className="text-sm text-slate-500 mb-8 font-medium">
                  Define tu primera sucursal y terminal de cobro. Podrás agregar más después.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Nombre de la Sucursal
                    </label>
                    <input
                      type="text"
                      value={formData.branchName}
                      onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all"
                      style={{ border: '1.5px solid #e2e8f0' }}
                      onFocus={(e) => { e.target.style.borderColor = '#0066FF'; e.target.style.boxShadow = '0 0 0 3px rgba(0,102,255,0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                      Ej. "Matriz Centro", "Sucursal Norte", "Local Mercado"
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Nombre de la Caja / Terminal
                    </label>
                    <input
                      type="text"
                      value={formData.cashRegisterName}
                      onChange={(e) => setFormData({ ...formData, cashRegisterName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all"
                      style={{ border: '1.5px solid #e2e8f0' }}
                      onFocus={(e) => { e.target.style.borderColor = '#0066FF'; e.target.style.boxShadow = '0 0 0 3px rgba(0,102,255,0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                      Ej. "Caja 01", "Terminal Principal"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Catálogo inicial */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                  ¿Cómo arrancar tu inventario?
                </h2>
                <p className="text-sm text-slate-500 mb-8 font-medium">
                  Puedes iniciar con un catálogo básico de productos comunes o comenzar en blanco y cargarlo tú mismo.
                </p>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, preloadSeedData: true })}
                    className="w-full p-5 rounded-xl text-left transition-all duration-200"
                    style={{
                      border: formData.preloadSeedData ? '2px solid #0066FF' : '1.5px solid #e2e8f0',
                      background: formData.preloadSeedData ? '#eff6ff' : '#ffffff',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: '#dbeafe' }}
                      >
                        ⚡
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm mb-1">Precargar 5 productos básicos</div>
                        <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          Agrega automáticamente Coca-Cola, Aceite, Leche, Pan y Jabón como punto de partida. Puedes editar o eliminar después.
                        </div>
                      </div>
                      {formData.preloadSeedData && (
                        <div
                          className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: '#0066FF' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, preloadSeedData: false })}
                    className="w-full p-5 rounded-xl text-left transition-all duration-200"
                    style={{
                      border: !formData.preloadSeedData ? '2px solid #0066FF' : '1.5px solid #e2e8f0',
                      background: !formData.preloadSeedData ? '#eff6ff' : '#ffffff',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: '#f1f5f9' }}
                      >
                        📋
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm mb-1">Empezar catálogo en blanco</div>
                        <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          Cargaré mis productos manualmente desde el módulo de Inventario o importaré desde Excel.
                        </div>
                      </div>
                      {!formData.preloadSeedData && (
                        <div
                          className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: '#0066FF' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Lanzamiento */}
            {step === 4 && (
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
                  ¡Todo listo para operar!
                </h2>
                <p className="text-sm text-slate-500 mb-8 font-medium">
                  Revisa el resumen de tu configuración antes de iniciar.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {[
                    { label: 'Nombre del Negocio', value: formData.businessName || '—' },
                    { label: 'Perfil Comercial', value: PROFILES.find(p => p.value === formData.profile)?.label || '—' },
                    { label: 'Primera Sucursal', value: formData.branchName },
                    { label: 'Terminal de Cobro', value: formData.cashRegisterName },
                    { label: 'Catálogo Inicial', value: formData.preloadSeedData ? '5 productos básicos' : 'En blanco' },
                    { label: 'Plan', value: 'Trial 14 días gratuito' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-4 rounded-xl"
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    >
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</div>
                      <div className="text-sm font-bold text-slate-900">{item.value}</div>
                    </div>
                  ))}
                </div>

                {setupMutation.error && (
                  <div
                    className="mb-4 p-3.5 rounded-xl text-sm font-semibold"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}
                  >
                    ⚠️ {setupMutation.error.message}
                  </div>
                )}

                <div
                  className="p-4 rounded-xl flex items-start gap-3"
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                >
                  <span className="text-green-600 text-base">✅</span>
                  <p className="text-[11px] text-green-700 font-semibold leading-relaxed">
                    Tu configuración se guardará directamente en la nube y estará disponible en cualquier dispositivo sin perder nada al limpiar caché.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer de navegación */}
          <div
            className="flex items-center justify-between px-8 md:px-10 py-5"
            style={{ borderTop: '1px solid #f1f5f9', background: '#fafafa' }}
          >
            <button
              type="button"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                step === 1 ? 'opacity-0 pointer-events-none' : 'hover:bg-slate-100'
              }`}
              style={{ color: '#64748b' }}
            >
              ← Anterior
            </button>

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}
                disabled={step === 1 && !formData.businessName.trim()}
                className="px-7 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide text-white transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #0066FF, #0044CC)',
                  boxShadow: '0 4px 12px rgba(0,102,255,0.3)',
                }}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={setupMutation.isPending}
                className="px-7 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide text-white transition-all disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #0066FF, #0044CC)',
                  boxShadow: '0 4px 12px rgba(0,102,255,0.3)',
                }}
              >
                {setupMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Configurando...
                  </>
                ) : '🎉 Iniciar mi Comercio'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6 font-medium">
          SNAPGAD Technology · Configuración inicial segura con cifrado TLS 1.3
        </p>
      </div>
    </div>
  );
}
