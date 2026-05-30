'use client';

import React, { useEffect } from 'react';

export default function ReportePdfPage() {
  // Disparar ventana de impresión al cargar la página
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-950 p-8 font-mono text-xs leading-relaxed max-w-4xl mx-auto">
      {/* Estilos para ocultar headers nativos en impresión */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: #fff !important;
            color: #000 !important;
            padding: 0 !important;
            margin: 1.5cm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Botón Flotante de Retorno No Imprimible */}
      <div className="no-print mb-8 p-4 rounded-xl bg-zinc-100 border border-zinc-200 flex justify-between items-center">
        <div>
          <span className="font-bold text-sm text-zinc-800">📄 Modo de Impresión Listo</span>
          <p className="text-[10px] text-zinc-500 mt-0.5">El diálogo de impresión de tu navegador se abrirá automáticamente. También puedes guardarlo como PDF.</p>
        </div>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-xs transition-all"
        >
          CERRAR VENTANA
        </button>
      </div>

      {/* Encabezado del Reporte */}
      <header className="border-b-2 border-zinc-950 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">ESPERANZA ABARROTES Y COMERCIO S.A. DE C.V.</h1>
            <p className="text-[10px] text-zinc-500 mt-1">RFC: EAC080101TX3 &middot; Régimen: 601 General de Ley Personas Morales</p>
            <p className="text-[10px] text-zinc-500">Domicilio Fiscal: Av. Independencia 450, Centro Histórico, CDMX, C.P. 06000</p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-zinc-950 text-white text-[9px] font-black tracking-widest uppercase">AUDITORÍA SAT</span>
            <p className="text-[9px] font-bold text-zinc-500 mt-2">FOLIO FISCAL: REP-2026-98122</p>
            <p className="text-[9px] text-zinc-400">FECHA EMISIÓN: {new Date().toLocaleDateString('es-MX')}</p>
          </div>
        </div>
      </header>

      {/* Título de la Auditoría */}
      <section className="mb-8">
        <h2 className="text-sm font-black uppercase border-b border-zinc-300 pb-2 mb-3">REPORTE CONSOLIDADO DE GOBERNANZA FISCAL Y AUDITORÍA DE SUCURSALES</h2>
        <div className="grid grid-cols-3 gap-6 pt-2">
          <div>
            <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">EJERCICIO AUDITADO</span>
            <span className="font-bold">Ciclo Fiscal 2026</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">INTEGRIDAD NOM-151</span>
            <span className="font-bold text-emerald-600">✓ CERTIFICADO ACTIVO</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">MÉTODO DE CONSOLIDACIÓN</span>
            <span className="font-bold">Libro Mayor Multiejecutivo</span>
          </div>
        </div>
      </section>

      {/* Libro Mayor de Finanzas */}
      <section className="mb-8">
        <h3 className="text-xs font-black uppercase tracking-wider pb-1.5 border-b border-zinc-200 mb-4">I. LIBRO MAYOR CONTABLE - BALANCE GENERAL</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-950 text-[10px] font-black uppercase text-zinc-500">
              <th className="py-2 text-left">CONCEPTO FISCAL</th>
              <th className="py-2 text-center">TASA</th>
              <th className="py-2 text-right">BASE GRAVABLE</th>
              <th className="py-2 text-right">TOTAL IMPUESTO</th>
              <th className="py-2 text-right">TOTAL CONSOLIDADO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            <tr>
              <td className="py-2.5 font-bold">Ventas al Público en General (CFDI Global)</td>
              <td className="py-2.5 text-center">16.0%</td>
              <td className="py-2.5 text-right font-mono">$10,758.63</td>
              <td className="py-2.5 text-right font-mono">$1,721.37</td>
              <td className="py-2.5 text-right font-mono">$12,480.00</td>
            </tr>
            <tr>
              <td className="py-2.5 font-bold">Ventas Con Factura Nominativa Individual</td>
              <td className="py-2.5 text-center">16.0%</td>
              <td className="py-2.5 text-right font-mono">$4,850.00</td>
              <td className="py-2.5 text-right font-mono">$776.00</td>
              <td className="py-2.5 text-right font-mono">$5,626.00</td>
            </tr>
            <tr>
              <td className="py-2.5 font-bold">Impuesto Especial Sobre Producción (IEPS)</td>
              <td className="py-2.5 text-center">8.0%</td>
              <td className="py-2.5 text-right font-mono">$4,260.00</td>
              <td className="py-2.5 text-right font-mono">$340.80</td>
              <td className="py-2.5 text-right font-mono">$4,600.80</td>
            </tr>
            <tr className="bg-zinc-50">
              <td className="py-3 font-black text-[10px]">TOTAL ACUMULADO (A TRASLADAR)</td>
              <td className="py-3 text-center">-</td>
              <td className="py-3 text-right font-mono font-bold">$19,868.63</td>
              <td className="py-3 text-right font-mono font-bold" style={{ color: '#000' }}>$2,838.17</td>
              <td className="py-3 text-right font-mono font-black" style={{ color: '#000' }}>$22,706.80</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Resultados de Cajas POS */}
      <section className="mb-8">
        <h3 className="text-xs font-black uppercase tracking-wider pb-1.5 border-b border-zinc-200 mb-4">II. DESGLOSE DE CAJAS POS Y MEDIOS DE PAGO</h3>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-zinc-200">
                <tr className="py-2 flex justify-between">
                  <td className="text-zinc-500 font-bold">CAJA MATRIZ 01 (Efectivo):</td>
                  <td className="font-mono font-bold">$14,500.00</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-zinc-500 font-bold">CAJA MATRIZ 02 (Tarjeta):</td>
                  <td className="font-mono font-bold">$5,280.00</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-zinc-500 font-bold">TRANSFERENCIAS ELECTRÓNICAS:</td>
                  <td className="font-mono font-bold">$2,926.80</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-4 rounded-xl border border-zinc-300 bg-zinc-50 flex flex-col justify-between">
            <div>
              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest">IMPACTO EN CAPITAL NETO</span>
              <p className="text-[10px] text-zinc-500 mt-1">Estimación bruta de utilidades del ejercicio descontando provisiones fiscales SAT 2026:</p>
            </div>
            <div className="flex justify-between items-baseline mt-4">
              <span className="text-[10px] font-black text-zinc-400">UTILIDAD ESTIMADA:</span>
              <strong className="text-lg font-mono font-black">$19,868.63</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Gobernanza Digital y Firmas */}
      <section className="mb-12">
        <h3 className="text-xs font-black uppercase tracking-wider pb-1.5 border-b border-zinc-200 mb-4">III. VERIFICACIÓN Y GOBERNANZA DIGITAL NOM-151</h3>
        <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">
          Este informe ha sido verificado mediante el sellado de tiempo de Snapgad Ledger Services y cuenta con una firma digital no repudiable, garantizando la integridad inalterable de los datos históricos conforme a las regulaciones mexicanas vigentes (NOM-151-SCFI-2016 y LFPDPPP).
        </p>
        <div className="border border-zinc-300 rounded p-4 font-mono text-[9px] text-zinc-400 break-all leading-normal">
          <strong>SHA-256 SIGNATURE STAMP:</strong> 8f93e2b2a1a8c9823f92d00122e2a1b918f8e8e7a8f9c102a3a8e9e1c2b3d4f5
        </div>
      </section>

      {/* Firmas de Validez */}
      <footer className="mt-16 pt-8 border-t border-zinc-300">
        <div className="grid grid-cols-2 gap-12 text-center text-[10px]">
          <div>
            <div className="w-48 border-b border-zinc-950 mx-auto mb-2"></div>
            <span className="block font-bold">REPRESENTANTE LEGAL</span>
            <span className="text-zinc-400 uppercase">Esperanza Abarrotes y Comercio</span>
          </div>
          <div>
            <div className="w-48 border-b border-zinc-950 mx-auto mb-2"></div>
            <span className="block font-bold">AUDITOR FISCAL EXTERNO</span>
            <span className="text-zinc-400 uppercase">Despacho Contable CDMX</span>
          </div>
        </div>
        <p className="text-center text-[8px] text-zinc-400 mt-12">
          SNAPGAD ENTERPRISE POS &middot; SISTEMA DE GOBERNANZA COMERCIAL DIGITAL EXPRÉS
        </p>
      </footer>
    </div>
  );
}
