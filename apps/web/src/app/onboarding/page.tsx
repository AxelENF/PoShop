'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SoundFx } from '../../lib/pos-utils';

interface InitialProduct {
  code: string;
  name: string;
  costPrice: number;
  salePrice: number;
  unit: 'pza' | 'kg';
  category: string;
}

const DEFAULT_PRODUCTS: InitialProduct[] = [
  { code: '7501055300075', name: 'Coca-Cola Original 600ml', costPrice: 13.50, salePrice: 19.00, unit: 'pza', category: 'Bebidas' },
  { code: '7501017006090', name: 'Aceite Nutrioli 1L', costPrice: 32.00, salePrice: 42.00, unit: 'pza', category: 'Abarrotes' },
  { code: '7501000111207', name: 'Leche Alpura Clásica 1L', costPrice: 19.50, salePrice: 26.00, unit: 'pza', category: 'Lácteos' },
  { code: 'BASC-001', name: 'Pollo Crudo Entero (Granel)', costPrice: 45.00, salePrice: 72.00, unit: 'kg', category: 'Carnes' },
  { code: '7501000153122', name: 'Pan Bimbo Blanco Grande', costPrice: 28.00, salePrice: 38.00, unit: 'pza', category: 'Panadería' }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Sincronizar tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Form Data State
  const [formData, setFormData] = useState({
    businessName: '',
    profile: 'general', // 'general' | 'weight' | 'catalog' | 'distribution' | 'services'
    branchName: 'Matriz Principal',
    cashRegisterName: 'Caja 01',
    telegramChatId: '',
    isTelegramLinked: false,
    enableGuidedTour: true
  });

  // Catálogo inicial editable
  const [products, setProducts] = useState<InitialProduct[]>(DEFAULT_PRODUCTS);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editProduct, setEditProduct] = useState<InitialProduct | null>(null);

  // Simulador de Escaneo QR de Telegram
  const [isSimulatingTelegram, setIsSimulatingTelegram] = useState(false);

  const handleNext = () => {
    SoundFx.playBeep();
    if (step < 5) setStep(step + 1);
  };

  const handlePrev = () => {
    SoundFx.playBeep();
    if (step > 1) setStep(step - 1);
  };

  // Manejo de edición de productos
  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditProduct({ ...products[index] });
  };

  const saveProductEdit = () => {
    if (!editProduct) return;
    setProducts((prev) => prev.map((p, i) => i === editingIndex ? editProduct : p));
    setEditingIndex(null);
    setEditProduct(null);
    SoundFx.playSuccess();
  };

  const addCustomProduct = () => {
    const newProduct: InitialProduct = {
      code: `PROD-${Math.floor(1000 + Math.random() * 9000)}`,
      name: 'Nuevo Producto',
      costPrice: 10.00,
      salePrice: 15.00,
      unit: 'pza',
      category: 'General'
    };
    setProducts((prev) => [...prev, newProduct]);
    startEditing(products.length);
    SoundFx.playBeep();
  };

  const removeProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
    SoundFx.playWarning();
  };

  // Simulación de Vinculación de Telegram
  const simulateTelegramScan = () => {
    setIsSimulatingTelegram(true);
    SoundFx.playBeep();
    setTimeout(() => {
      const generatedChatId = String(Math.floor(100000000 + Math.random() * 900000000));
      setFormData(prev => ({
        ...prev,
        telegramChatId: generatedChatId,
        isTelegramLinked: true
      }));
      setIsSimulatingTelegram(false);
      SoundFx.playSuccess();
    }, 1800);
  };

  // Finalizar e Inicializar Sistema
  const handleFinish = async () => {
    setIsSubmitting(true);
    SoundFx.playSuccess();

    // Guardar configuraciones en LocalStorage para simular bases de datos reales
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_tenant_config', JSON.stringify({
        businessName: formData.businessName,
        profile: formData.profile,
        branchName: formData.branchName,
        cashRegisterName: formData.cashRegisterName,
        telegramChatId: formData.telegramChatId,
        isTelegramLinked: formData.isTelegramLinked
      }));

      // Guardar productos iniciales personalizados
      window.localStorage.setItem('snapgad_custom_products', JSON.stringify(products));

      // Guardar flag para activar el Tour Interactivo en el POS
      if (formData.enableGuidedTour) {
        window.localStorage.setItem('show_onboarding_tutorial', 'true');
      }

      window.localStorage.setItem('snapgad_onboarding_completed', 'true');
    }

    // Simular guardado en API
    await new Promise((resolve) => setTimeout(resolve, 1500));
    router.push('/pos'); // Redirigir directamente al POS para iniciar venta
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Header */}
      <header className="w-full max-w-6xl mx-auto flex justify-between items-center py-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center font-bold text-white text-md">
            S
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">SNAPGAD</span>
            <span className="text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-2 py-0.5 rounded-full font-semibold ml-2">
              ONBOARDING DE 15 MINUTOS
            </span>
          </div>
        </div>

        <button
          onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          className="p-2 rounded border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold"
          style={{ borderColor: 'var(--card-border)' }}
        >
          {theme === 'light' ? '🌙 MODO OSCURO' : '☀️ MODO CLARO'}
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl mx-auto py-10 flex-grow flex items-center justify-center">
        <div className="w-full rounded-2xl border shadow-2xl overflow-hidden flex flex-col md:flex-row" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          
          {/* Barra Lateral Izquierda - Pasos */}
          <div className="w-full md:w-64 bg-zinc-50 dark:bg-zinc-900/40 p-8 border-b md:border-b-0 md:border-r flex flex-row md:flex-col justify-between" style={{ borderColor: 'var(--card-border)' }}>
            <div className="space-y-6 w-full">
              <h3 className="hidden md:block font-bold text-xs uppercase tracking-widest text-zinc-400">Progreso</h3>
              
              <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-x-visible w-full py-2">
                {[
                  { num: 1, label: 'Identidad', desc: 'Giro y Nombre' },
                  { num: 2, label: 'Estructura', desc: 'Sucursal y Caja' },
                  { num: 3, label: 'Catálogo', desc: 'Carga Express' },
                  { num: 4, label: 'Notificaciones', desc: 'Vincular Telegram' },
                  { num: 5, label: 'Lanzamiento', desc: 'Iniciar POS' }
                ].map((item) => (
                  <div key={item.num} className="flex items-center gap-3 min-w-[120px] md:min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      step === item.num 
                        ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-md shadow-blue-500/20' 
                        : step > item.num
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-600'
                    }`}>
                      {step > item.num ? '✓' : item.num}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className={`text-xs font-bold ${step === item.num ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500'}`}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden md:block text-[10px] font-bold text-zinc-400 tracking-wider">
              VERSIÓN MVP v1.2
            </div>
          </div>

          {/* Form Content Area */}
          <div className="flex-grow p-8 md:p-12 flex flex-col justify-between min-h-[500px]">
            
            {/* Contenido Dinámico de Pasos */}
            <div className="flex-grow">
              
              {/* STEP 1: Identidad */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-3xl font-extrabold tracking-tight mb-2">¡Comencemos tu Comercio!</h2>
                  <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                    Personalizaremos el Punto de Venta según el estilo de tu negocio para activar las herramientas óptimas.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-zinc-400">
                        Nombre de tu Negocio / Empresa
                      </label>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ej. Abarrotes La Unión"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className="w-full p-3 rounded-lg border text-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-zinc-400">
                        Perfil Comercial Predeterminado
                      </label>
                      <select
                        value={formData.profile}
                        onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
                        className="w-full p-3 rounded-lg border text-md font-medium focus:outline-none"
                        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                      >
                        <option value="general">🛍️ Tienda General / Abarrotes Retail</option>
                        <option value="weight">🥩 Venta por Peso y Granel (Carnicería, Cremería)</option>
                        <option value="catalog">🔧 Catálogo Especializado (Ferretería, Refacciones)</option>
                        <option value="distribution">🚚 Distribución y Ventas de Mayoreo B2B</option>
                        <option value="services">✂️ Servicios con Insumos (Papelería, Barbería)</option>
                      </select>
                      <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                        Seleccionar un perfil pre-configura módulos como básculas USB, cotizadores en PDF o descuentos de ingredientes automáticamente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Estructura */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-3xl font-extrabold tracking-tight mb-2">Estructura de Venta</h2>
                  <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                    Define la primera terminal de operaciones. Los negocios multi-sucursales pueden añadir más terminales posteriormente.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-zinc-400">
                        Nombre de la Sucursal Activa
                      </label>
                      <input
                        type="text"
                        value={formData.branchName}
                        onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                        className="w-full p-3 rounded-lg border text-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-zinc-400">
                        Identificador de la Caja / Terminal
                      </label>
                      <input
                        type="text"
                        value={formData.cashRegisterName}
                        onChange={(e) => setFormData({ ...formData, cashRegisterName: e.target.value })}
                        className="w-full p-3 rounded-lg border text-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Catálogo Express */}
              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-3xl font-extrabold tracking-tight mb-2">Catálogo Express de Prueba</h2>
                  <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
                    Hemos precargado estos 5 productos básicos. Modifica precios, agrega o elimina filas para personalizar tu inventario inicial.
                  </p>

                  <div className="border rounded-lg overflow-hidden mb-4" style={{ borderColor: 'var(--card-border)' }}>
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-50 dark:bg-zinc-900 font-bold uppercase text-[10px]" style={{ color: 'var(--muted)' }}>
                        <tr>
                          <th className="p-3">Código / Barra</th>
                          <th className="p-3">Nombre</th>
                          <th className="p-3 text-right">Costo</th>
                          <th className="p-3 text-right">Venta</th>
                          <th className="p-3 text-center">Unidad</th>
                          <th className="p-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {products.map((prod, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                            {editingIndex === idx ? (
                              <>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={editProduct?.code}
                                    onChange={(e) => setEditProduct(prev => prev ? { ...prev, code: e.target.value } : null)}
                                    className="w-full p-1.5 rounded border text-xs bg-transparent"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={editProduct?.name}
                                    onChange={(e) => setEditProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    className="w-full p-1.5 rounded border text-xs bg-transparent"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    value={editProduct?.costPrice}
                                    onChange={(e) => setEditProduct(prev => prev ? { ...prev, costPrice: +e.target.value } : null)}
                                    className="w-16 p-1.5 rounded border text-xs text-right bg-transparent"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    value={editProduct?.salePrice}
                                    onChange={(e) => setEditProduct(prev => prev ? { ...prev, salePrice: +e.target.value } : null)}
                                    className="w-16 p-1.5 rounded border text-xs text-right bg-transparent"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <select
                                    value={editProduct?.unit}
                                    onChange={(e) => setEditProduct(prev => prev ? { ...prev, unit: e.target.value as 'pza' | 'kg' } : null)}
                                    className="p-1 rounded border text-xs bg-transparent"
                                  >
                                    <option value="pza">Pza</option>
                                    <option value="kg">Kg</option>
                                  </select>
                                </td>
                                <td className="p-2 text-center space-x-1">
                                  <button onClick={saveProductEdit} className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold">✓</button>
                                  <button onClick={() => setEditingIndex(null)} className="px-2 py-1 bg-zinc-300 dark:bg-zinc-700 rounded text-[10px] font-bold">✗</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 font-mono font-bold text-zinc-400">{prod.code}</td>
                                <td className="p-3 font-semibold">{prod.name}</td>
                                <td className="p-3 text-right font-medium">${prod.costPrice.toFixed(2)}</td>
                                <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">${prod.salePrice.toFixed(2)}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prod.unit === 'kg' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                    {prod.unit.toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-3 text-center space-x-2">
                                  <button onClick={() => startEditing(idx)} className="text-blue-500 hover:underline font-bold">Editar</button>
                                  <button onClick={() => removeProduct(idx)} className="text-red-500 hover:underline font-bold">Borrar</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={addCustomProduct}
                    className="w-full py-2.5 rounded-lg border border-dashed hover:border-blue-500 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                    style={{ borderColor: 'var(--card-border)' }}
                  >
                    ➕ AGREGAR PRODUCTO PERSONALIZADO
                  </button>
                </div>
              )}

              {/* STEP 4: Telegram */}
              {step === 4 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-3xl font-extrabold tracking-tight mb-2">Notificaciones Proactivas</h2>
                  <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                    Mantén el control de tu comercio. Recibe alertas de stock crítico y cierres de turno directo en tu Telegram al instante.
                  </p>

                  <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                    {/* Simulador de QR */}
                    <div className="p-6 rounded-2xl border flex flex-col items-center text-center w-52" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
                      <span className="text-[10px] font-bold tracking-widest text-zinc-400 mb-4 uppercase">Escaneo QR Express</span>
                      
                      {/* Código QR Simulado en SVG */}
                      <svg className="w-32 h-32 text-black dark:text-white" viewBox="0 0 100 100" fill="currentColor">
                        <path d="M5,5 h30 v30 h-30 z M15,15 h10 v10 h-10 z" />
                        <path d="M65,5 h30 v30 h-30 z M75,15 h10 v10 h-10 z" />
                        <path d="M5,65 h30 v30 h-30 z M15,75 h10 v10 h-10 z" />
                        <path d="M45,15 h10 v10 h-10 z M45,45 h10 v10 h-10 z M15,45 h10 v10 h-10 z M75,45 h10 v10 h-10 z" />
                        <path d="M45,75 h10 v10 h-10 z M65,65 h10 v10 h-10 z M85,75 h10 v10 h-10 z M75,85 h10 v10 h-10 z" />
                      </svg>

                      <div className="mt-4 text-[10px] font-bold text-blue-600 dark:text-blue-400">@SnapgadBot</div>
                    </div>

                    {/* Smartphone UI Mockup */}
                    <div className="flex-grow space-y-4 w-full md:w-auto">
                      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10 text-xs">
                        <strong className="block mb-2 text-blue-700 dark:text-blue-400">Vinculación en 1-Click:</strong>
                        Al escanear el código en tu móvil, Telegram enviará el comando de inicio encriptado con tu ID comercial de forma automática.
                      </div>

                      <div className="pt-2">
                        {formData.isTelegramLinked ? (
                          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-2">
                            <span>✓</span> ¡Bot de Telegram Vinculado Exitosamente! (ID: {formData.telegramChatId})
                          </div>
                        ) : (
                          <button
                            onClick={simulateTelegramScan}
                            disabled={isSimulatingTelegram}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                          >
                            {isSimulatingTelegram ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                VINCULANDO A TELEGRAM...
                              </>
                            ) : '⚡ SIMULAR ESCANEO EN MÓVIL'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Lanzamiento */}
              {step === 5 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-3xl font-extrabold tracking-tight mb-2">¡Todo listo para Vender!</h2>
                  <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                    Hemos configurado de manera coherente el Punto de Venta. Repasa tu ficha técnica:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-5 rounded-xl border space-y-2 text-xs" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
                      <strong className="block text-zinc-400 uppercase tracking-wider text-[10px]">Identidad de Caja</strong>
                      <div><span className="text-zinc-500 font-medium">Comercio:</span> <strong className="font-bold">{formData.businessName}</strong></div>
                      <div><span className="text-zinc-500 font-medium">Perfil:</span> <strong className="font-bold uppercase text-blue-500">{formData.profile}</strong></div>
                      <div><span className="text-zinc-500 font-medium">Sucursal:</span> <strong className="font-bold">{formData.branchName}</strong></div>
                      <div><span className="text-zinc-500 font-medium">Terminal:</span> <strong className="font-bold">{formData.cashRegisterName}</strong></div>
                    </div>

                    <div className="p-5 rounded-xl border space-y-2 text-xs" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
                      <strong className="block text-zinc-400 uppercase tracking-wider text-[10px]">Datos del Sistema</strong>
                      <div><span className="text-zinc-500 font-medium">Productos de Inventario:</span> <strong className="font-bold">{products.length} Items</strong></div>
                      <div><span className="text-zinc-500 font-medium">Canal de Telegram:</span> <strong className={`font-bold ${formData.isTelegramLinked ? 'text-emerald-500' : 'text-zinc-400'}`}>{formData.isTelegramLinked ? 'ACTIVO' : 'NO VINCULADO'}</strong></div>
                      <div><span className="text-zinc-500 font-medium">Soporte Multimoneda:</span> <strong className="font-bold text-zinc-500">MXN ($)</strong></div>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-blue-500/20 bg-blue-50/20 dark:bg-blue-900/10">
                    <input
                      type="checkbox"
                      checked={formData.enableGuidedTour}
                      onChange={(e) => setFormData({ ...formData, enableGuidedTour: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <strong className="block text-sm">Activar Tour Interactivo Guiado en Mostrador</strong>
                      <span className="text-xs text-zinc-500">Un asistente paso a paso te guiará al ingresar a tu terminal de cobro.</span>
                    </div>
                  </label>
                </div>
              )}

            </div>

            {/* Navigation Drawer Buttons */}
            <div className="p-4 border-t flex justify-between mt-8 bg-zinc-50 dark:bg-zinc-900/50" style={{ borderColor: 'var(--card-border)' }}>
              <button
                onClick={handlePrev}
                className={`px-6 py-2 rounded-lg font-bold text-xs transition-opacity ${step === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
                style={{ color: 'var(--muted)' }}
              >
                ATRÁS
              </button>
              
              {step < 5 ? (
                <button
                  onClick={handleNext}
                  disabled={step === 1 && !formData.businessName}
                  className="px-8 py-2.5 rounded-lg font-bold text-xs bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  SIGUIENTE
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="px-8 py-2.5 rounded-lg font-bold text-xs bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      MONTANDO COMERCIO...
                    </>
                  ) : '🎉 INICIAR COMERCIO Y ENTRAR'}
                </button>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t py-4 text-center mt-6" style={{ borderColor: 'var(--card-border)' }}>
        <p className="text-xs text-zinc-500">
          SNAPGAD POS &copy; {new Date().getFullYear()} &middot; Configuración inicial asistida.
        </p>
      </footer>
    </div>
  );
}
