'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CUSTOMERS_SEED, type CustomerSeed } from '../pos/products-seed';
import { useUserSession } from '../../lib/user-session';
import { SoundFx } from '../../lib/pos-utils';
import Sidebar from '../../components/Sidebar';
import AdminPinModal from '../../components/AdminPinModal';
import { useAppTheme } from '../../components/theme-context';
import { trpc } from '../../utils/trpc/client';

export default function CustomersPage() {
  const { session } = useUserSession();
  const { isAdminUnlocked, setIsAdminUnlocked, isSidebarCollapsed } = useAppTheme();
  const [showPinModal, setShowPinModal] = useState(false);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterCredit, setFilterCredit] = useState<'Todos' | 'Con Crédito' | 'Sin Crédito'>('Todos');
  
  // Cargar clientes desde tRPC
  const { data: customersData, refetch: refetchCustomers, isLoading } = trpc.customers.list.useQuery({
    search: search || undefined,
  });

  const customers = useMemo(() => {
    return customersData?.items || [];
  }, [customersData]);

  // Estados para Modal de Nuevo Cliente
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRfc, setNewRfc] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCreditEnabled, setNewCreditEnabled] = useState(false);
  const [newCreditLimit, setNewCreditLimit] = useState('5000');

  // Estados para Drawer / Ajustes de Crédito del Cliente Seleccionado
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');

  // Libro diario de movimientos (deudas, abonos, etc.) desde tRPC
  const { data: ledgerData, refetch: refetchLedger } = trpc.customers.getLedger.useQuery(
    { customerId: selectedCustomer?.id || '' },
    { enabled: !!selectedCustomer?.id }
  );

  const ledger = useMemo(() => {
    return ledgerData || [];
  }, [ledgerData]);

  // Sincronizar tema y forzar tema claro
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (!isAdminUnlocked) {
      setShowPinModal(true);
    }
  }, [isAdminUnlocked]);

  // Filtrado (en local sobre los datos devueltos)
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesCredit = 
        filterCredit === 'Todos' || 
        (filterCredit === 'Con Crédito' && customer.creditEnabled) ||
        (filterCredit === 'Sin Crédito' && !customer.creditEnabled);
      
      return matchesCredit;
    });
  }, [customers, filterCredit]);

  // Métricas
  const totalDebt = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => acc + (c.currentBalance || 0), 0);
  }, [filteredCustomers]);

  const activeCreditCustomers = useMemo(() => {
    return filteredCustomers.filter(c => c.creditEnabled).length;
  }, [filteredCustomers]);

  // Descargar estado de cuenta
  const downloadAccountStatement = (customer: any) => {
    SoundFx.playSuccess();
    const csvContent = "data:text/csv;charset=utf-8," 
      + `ESTADO DE CUENTA DE CRÉDITO - ${customer.name}\n`
      + `ID Cliente: ${customer.id}\n`
      + `RFC: ${customer.rfc || 'XAXX010101000'}\n`
      + `Fecha de Corte: ${new Date().toLocaleDateString('es-MX')}\n\n`
      + "Movimiento,Fecha,Detalles,Monto ($),Saldo Resultante ($)\n"
      + ledger.map(l => `${l.type.toUpperCase()},${l.date},"${l.details}",${l.amount.toFixed(2)},${l.balance.toFixed(2)}`)
          .join("\n")
      + `\n\nDEUDA TOTAL PENDIENTE: $${(customer.currentBalance || 0).toFixed(2)}`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `estado_cuenta_${customer.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mutaciones de tRPC
  const createCustomerMutation = trpc.customers.create.useMutation();
  const toggleCreditMutation = trpc.customers.toggleCredit.useMutation();
  const adjustBalanceMutation = trpc.customers.adjustBalance.useMutation();

  // Agregar nuevo cliente
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await createCustomerMutation.mutateAsync({
        name: newName,
        rfc: newRfc.trim() || undefined,
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
        creditEnabled: newCreditEnabled,
        creditLimit: newCreditEnabled ? parseFloat(newCreditLimit) || 0 : 0,
      });

      refetchCustomers();
      setIsNewModalOpen(false);
      SoundFx.playSuccess();
      
      // Limpiar campos
      setNewName('');
      setNewRfc('');
      setNewPhone('');
      setNewEmail('');
      setNewCreditEnabled(false);
      setNewCreditLimit('5000');
    } catch (error: any) {
      alert(`Error al registrar cliente: ${error.message || error}`);
    }
  };

  // Ajustar Saldo / Abonar Cuenta
  const handleAbono = async () => {
    if (!selectedCustomer || !adjustmentAmount) return;
    const amount = parseFloat(adjustmentAmount) || 0;
    if (amount <= 0) return;

    try {
      const updated = await adjustBalanceMutation.mutateAsync({
        id: selectedCustomer.id,
        type: 'abono',
        amount,
        details: 'Abono manual registrado',
      });

      setSelectedCustomer(updated);
      refetchCustomers();
      refetchLedger();
      setAdjustmentAmount('');
      SoundFx.playSuccess();
    } catch (error: any) {
      alert(`Error al registrar abono: ${error.message || error}`);
    }
  };

  // Cargar más deuda
  const handleFiado = async () => {
    if (!selectedCustomer || !adjustmentAmount) return;
    const amount = parseFloat(adjustmentAmount) || 0;
    if (amount <= 0) return;

    try {
      const updated = await adjustBalanceMutation.mutateAsync({
        id: selectedCustomer.id,
        type: 'cargo',
        amount,
        details: 'Cargo manual por venta fiada',
      });

      setSelectedCustomer(updated);
      refetchCustomers();
      refetchLedger();
      setAdjustmentAmount('');
      SoundFx.playWarning();
    } catch (error: any) {
      alert(`Error al registrar cargo de fiado: ${error.message || error}`);
    }
  };

  // Habilitar crédito
  const handleEnableCredit = async (customer: any) => {
    try {
      const updated = await toggleCreditMutation.mutateAsync({
        id: customer.id,
        creditEnabled: true,
        creditLimit: 2000,
      });

      setSelectedCustomer(updated);
      refetchCustomers();
      SoundFx.playSuccess();
    } catch (error: any) {
      alert(`Error al autorizar crédito: ${error.message || error}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {!isAdminUnlocked ? (
          <div className="flex-grow flex items-center justify-center">
            <AdminPinModal
              isOpen={showPinModal}
              onClose={() => router.push('/pos')}
              onSuccess={() => {
                setIsAdminUnlocked(true);
                setShowPinModal(false);
              }}
            />
          </div>
        ) : (
          <>
            {/* Contenido Principal */}
            <main className="flex-grow p-6 flex flex-col w-full">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Directorio y Líneas de Crédito</h1>
                  <p className="text-sm mt-1 text-slate-500 font-semibold">
                    Administre la cartera de clientes, habilite cuentas de "fiado" y supervise balances de deuda.
                  </p>
                </div>
                
                {/* Métricas Rápidas */}
                <div className="flex gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col items-end shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Cuentas Activas</span>
                    <span className="text-xl font-mono font-extrabold text-slate-700">{activeCreditCustomers}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col items-end shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Deuda Total</span>
                    <span className="text-xl font-mono font-extrabold text-red-500">${totalDebt.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Panel de Controles y Filtros */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white mb-6 flex flex-wrap gap-4 items-end shadow-sm">
                <div className="flex-grow min-w-[200px]">
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-400">
                    Buscar Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre o RFC..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full p-2.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-400">
                    Línea de Crédito
                  </label>
                  <select
                    value={filterCredit}
                    onChange={(e) => setFilterCredit(e.target.value as any)}
                    className="p-2.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none min-w-[150px] bg-white cursor-pointer"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Con Crédito">Autorizados (Fiado)</option>
                    <option value="Sin Crédito">Sin Crédito</option>
                  </select>
                </div>

                <button 
                  onClick={() => setIsNewModalOpen(true)}
                  className="py-2.5 px-6 rounded-lg text-white font-extrabold text-xs tracking-wider bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 cursor-pointer border-none"
                >
                  + NUEVO CLIENTE
                </button>
              </div>

              {/* Layout de dos columnas si hay un cliente seleccionado */}
              <div className="grid grid-cols-12 gap-6 flex-grow">
                
                {/* Tabla de Datos de Clientes */}
                <div className={`rounded-xl border border-slate-200 overflow-hidden ${selectedCustomer ? 'col-span-8' : 'col-span-12'} bg-white shadow-sm`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b bg-slate-50 border-slate-200">
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-slate-400">Cliente</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-slate-400">Contacto</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-center text-slate-400">Línea de Crédito</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-right text-slate-400">Límite ($)</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-right text-slate-400">Deuda Actual</th>
                          <th className="p-4 font-bold text-[10px] uppercase tracking-wider text-right text-slate-400">Disponible</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.map((customer) => {
                          const availableCredit = customer.creditEnabled ? (customer.creditLimit - customer.currentBalance) : 0;
                          const isMaxedOut = customer.creditEnabled && availableCredit <= 0;
                          const isSelected = selectedCustomer?.id === customer.id;

                          return (
                            <tr 
                              key={customer.id} 
                              onClick={() => setSelectedCustomer(customer)}
                              className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`} 
                            >
                              <td className="p-4">
                                <div className="font-bold text-slate-700 text-xs">{customer.name}</div>
                                {customer.rfc && <div className="text-[9px] font-mono mt-1 text-slate-400">RFC: {customer.rfc}</div>}
                              </td>
                              <td className="p-4 text-xs font-semibold text-slate-500">
                                {customer.phone || 'N/A'} <br/>
                                {customer.email || ''}
                              </td>
                              <td className="p-4 text-center">
                                {customer.creditEnabled ? (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    ACTIVO
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-400 border border-slate-200">
                                    INACTIVO
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right font-mono font-bold text-xs text-slate-700">
                                {customer.creditEnabled ? `$${customer.creditLimit.toFixed(2)}` : '--'}
                              </td>
                              <td className="p-4 text-right font-mono text-xs">
                                {customer.creditEnabled ? (
                                  <span className={customer.currentBalance > 0 ? 'text-red-500 font-bold' : 'text-slate-600'}>
                                    ${customer.currentBalance.toFixed(2)}
                                  </span>
                                ) : '--'}
                              </td>
                              <td className="p-4 text-right font-mono font-bold text-xs">
                                {customer.creditEnabled ? (
                                  <span className={isMaxedOut ? 'text-red-500' : 'text-blue-600'}>
                                    ${availableCredit.toFixed(2)}
                                  </span>
                                ) : '--'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {filteredCustomers.length === 0 && (
                      <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                        <p>No se encontraron clientes con los filtros aplicados.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMNA LATERAL: Detalles del crédito / Ajustes de saldo */}
                {selectedCustomer && (
                  <div className="col-span-4 p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                        <h3 className="font-extrabold text-[10px] tracking-wider uppercase text-slate-400">AJUSTES DE CUENTA</h3>
                        <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer">✕ CERRAR</button>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-800 mb-1">{selectedCustomer.name}</h4>
                      <p className="text-[10px] text-slate-400 mb-6 font-mono font-bold">ID: {selectedCustomer.id}</p>

                      {selectedCustomer.creditEnabled ? (
                        <div className="space-y-6">
                          {/* Tarjeta de Resumen Deuda */}
                          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-3 font-mono text-[11px] font-bold">
                            <div className="flex justify-between">
                              <span className="text-slate-400">LÍMITE MÁXIMO:</span>
                              <span className="text-slate-700">${selectedCustomer.creditLimit.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">DEUDA ACTUAL:</span>
                              <span className="text-red-500">${selectedCustomer.currentBalance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-3">
                              <span className="text-slate-400">CRÉDITO DISPONIBLE:</span>
                              <span className="text-emerald-600">
                                ${(selectedCustomer.creditLimit - selectedCustomer.currentBalance).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Acciones de Ajuste */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Monto del Ajuste</label>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={adjustmentAmount}
                                onChange={e => setAdjustmentAmount(e.target.value)}
                                className="w-full p-2.5 rounded border border-slate-200 font-mono font-bold text-xs bg-white text-slate-700 focus:outline-none"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={handleAbono}
                                className="flex-grow py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-extrabold text-[10px] text-white tracking-wider transition-colors cursor-pointer border-none shadow-sm"
                              >
                                💸 ABONAR
                              </button>
                              <button
                                onClick={handleFiado}
                                className="flex-grow py-2.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 font-extrabold text-[10px] text-red-600 tracking-wider transition-colors cursor-pointer"
                              >
                                ⚠️ FIAR
                              </button>
                            </div>

                            <button
                              onClick={() => downloadAccountStatement(selectedCustomer)}
                              className="w-full py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-extrabold text-[9px] text-slate-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                            >
                              📄 IMPRIMIR ESTADO DE CUENTA
                            </button>
                          </div>

                          {/* Historial Ledger de Movimientos */}
                          <div className="space-y-3 border-t border-slate-100 pt-4">
                            <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">HISTORIAL DE CRÉDITO</span>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                              {ledger.filter(l => l.customerId === selectedCustomer.id).map(l => (
                                <div key={l.id} className="p-3 rounded-lg border border-slate-150 bg-slate-50/50 space-y-1">
                                  <div className="flex justify-between items-center text-[9px] font-bold">
                                    <span className={l.type === 'cargo' ? 'text-red-500' : 'text-emerald-500'}>
                                      {l.type === 'cargo' ? '🔴 CARGO' : '🟢 ABONO'}
                                    </span>
                                    <span className="text-slate-400 text-[8px]">{l.date}</span>
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-600 truncate">{l.details}</p>
                                  <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                                    <span className="text-slate-400">Monto: ${l.amount.toFixed(2)}</span>
                                    <span className="text-slate-500">Saldo: ${l.balance.toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                              {ledger.filter(l => l.customerId === selectedCustomer.id).length === 0 && (
                                <span className="block text-center py-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sin movimientos.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4 leading-relaxed">
                            Este cliente no tiene una línea de crédito autorizada.
                          </p>
                          <button
                            onClick={() => handleEnableCredit(selectedCustomer)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs tracking-wider rounded-lg shadow-sm border-none cursor-pointer"
                          >
                            HABILITAR CRÉDITO FIADO
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </main>

            {/* MODAL PARA NUEVO CLIENTE */}
            {isNewModalOpen && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <form 
                  onSubmit={handleAddCustomer}
                  className="w-full max-w-md p-6 bg-white rounded-2xl border border-slate-200 shadow-2xl space-y-4 animate-scale-in"
                >
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Registrar Nuevo Cliente</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-widest mb-1.5 text-slate-400">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="ej. Juan Pérez"
                        className="w-full p-2.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-extrabold uppercase tracking-widest mb-1.5 text-slate-400">RFC</label>
                        <input
                          type="text"
                          value={newRfc}
                          onChange={e => setNewRfc(e.target.value)}
                          placeholder="ej. PEZJ900101"
                          className="w-full p-2.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold uppercase tracking-widest mb-1.5 text-slate-400">Teléfono</label>
                        <input
                          type="text"
                          value={newPhone}
                          onChange={e => setNewPhone(e.target.value)}
                          placeholder="ej. 5512345678"
                          className="w-full p-2.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-widest mb-1.5 text-slate-400">Correo Electrónico</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="ej. juan@gmail.com"
                        className="w-full p-2.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-3 py-2 border-t border-slate-100">
                      <input
                        type="checkbox"
                        id="creditEnabled"
                        checked={newCreditEnabled}
                        onChange={e => setNewCreditEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-200 cursor-pointer"
                      />
                      <label htmlFor="creditEnabled" className="text-xs font-bold uppercase cursor-pointer text-slate-600 select-none">
                        HABILITAR CRÉDITO DE FIADO
                      </label>
                    </div>

                    {newCreditEnabled && (
                      <div className="animate-scale-in">
                        <label className="block text-[9px] font-bold uppercase tracking-widest mb-1.5 text-slate-400">Límite de Crédito ($)</label>
                        <input
                          type="number"
                          value={newCreditLimit}
                          onChange={e => setNewCreditLimit(e.target.value)}
                          className="w-full p-2.5 rounded border border-slate-200 text-xs font-mono font-bold bg-white text-slate-700 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsNewModalOpen(false)}
                      className="flex-grow py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-slate-500 hover:bg-slate-50 border border-slate-200 cursor-pointer transition-colors"
                    >
                      CANCELAR
                    </button>
                    <button
                      type="submit"
                      className="flex-grow py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-[10px] font-extrabold uppercase tracking-wider text-white border-none cursor-pointer transition-all shadow-md shadow-blue-500/10"
                    >
                      CREAR CLIENTE
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
