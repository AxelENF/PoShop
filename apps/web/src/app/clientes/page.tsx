'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CUSTOMERS_SEED, type CustomerSeed } from '../pos/products-seed';
import { useUserSession } from '../../lib/user-session';
import { SoundFx } from '../../lib/pos-utils';

export default function CustomersPage() {
  const { session } = useUserSession();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [search, setSearch] = useState('');
  const [filterCredit, setFilterCredit] = useState<'Todos' | 'Con Crédito' | 'Sin Crédito'>('Todos');
  
  // Lista local para simular CRUD persistente en memoria de sesión
  const [customers, setCustomers] = useState<CustomerSeed[]>(CUSTOMERS_SEED);

  // Estados para Modal de Nuevo Cliente
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRfc, setNewRfc] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCreditEnabled, setNewCreditEnabled] = useState(false);
  const [newCreditLimit, setNewCreditLimit] = useState('5000');

  // Estados para Drawer / Ajustes de Crédito del Cliente Seleccionado
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSeed | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');

  // Libro diario de movimientos (deudas, abonos, etc.)
  const [ledger, setLedger] = useState<Array<{ id: string; customerId: string; type: 'cargo' | 'abono'; amount: number; balance: number; date: string; details: string }>>([
    { id: 'MOV-1', customerId: 'cust-001', type: 'cargo', amount: 320.50, balance: 320.50, date: 'Ayer, 04:30 PM', details: 'Compra de Abarrotes Varios (Ticket V-0083)' },
    { id: 'MOV-2', customerId: 'cust-001', type: 'abono', amount: 200.00, balance: 120.50, date: 'Hoy, 09:00 AM', details: 'Abono en Efectivo Mostrador' },
    { id: 'MOV-3', customerId: 'cust-002', type: 'cargo', amount: 450.00, balance: 450.00, date: 'Ayer, 10:15 AM', details: 'Compra a Crédito Registrada (Ticket V-0082)' }
  ]);

  // Descargar estado de cuenta
  const downloadAccountStatement = (customer: CustomerSeed) => {
    SoundFx.playSuccess();
    const csvContent = "data:text/csv;charset=utf-8," 
      + `ESTADO DE CUENTA DE CRÉDITO - ${customer.name}\n`
      + `ID Cliente: ${customer.id}\n`
      + `RFC: ${customer.rfc || 'XAXX010101000'}\n`
      + `Fecha de Corte: ${new Date().toLocaleDateString('es-MX')}\n\n`
      + "Movimiento,Fecha,Detalles,Monto ($),Saldo Resultante ($)\n"
      + ledger.filter(l => l.customerId === customer.id)
          .map(l => `${l.type.toUpperCase()},${l.date},"${l.details}",${l.amount.toFixed(2)},${l.balance.toFixed(2)}`)
          .join("\n")
      + `\n\nDEUDA TOTAL PENDIENTE: $${customer.currentBalance.toFixed(2)}`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `estado_cuenta_${customer.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = window.localStorage.getItem('snapgad_theme') as 'light' | 'dark';
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    }
  };

  // Restringir acceso si no tiene permisos
  if (!session.permissions.canEditCustomers) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="w-full max-w-md p-8 rounded-2xl border shadow-2xl text-center" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <div className="w-16 h-16 rounded-2xl bg-amber-600/20 text-amber-500 flex items-center justify-center font-bold text-3xl mx-auto mb-6">
            🔒
          </div>
          <h2 className="text-2xl font-extrabold mb-2">Acceso Restringido</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Solo administradores o dueños del negocio tienen permisos para gestionar la cartera de clientes y líneas de crédito.</p>
          <Link href="/pos" className="inline-block px-6 py-3 bg-blue-700 hover:bg-blue-600 rounded-xl font-bold transition-all text-white text-sm">
            REGRESAR A LA CAJA
          </Link>
        </div>
      </div>
    );
  }

  // Filtrado
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.rfc?.toLowerCase().includes(search.toLowerCase());
      
      const matchesCredit = 
        filterCredit === 'Todos' || 
        (filterCredit === 'Con Crédito' && customer.creditEnabled) ||
        (filterCredit === 'Sin Crédito' && !customer.creditEnabled);
      
      return matchesSearch && matchesCredit;
    });
  }, [customers, search, filterCredit]);

  // Métricas
  const totalDebt = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => acc + c.currentBalance, 0);
  }, [filteredCustomers]);

  const activeCreditCustomers = useMemo(() => {
    return filteredCustomers.filter(c => c.creditEnabled).length;
  }, [filteredCustomers]);

  // Agregar nuevo cliente
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newCustomer: CustomerSeed = {
      id: `cust-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      name: newName,
      rfc: newRfc.trim() || undefined,
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      creditEnabled: newCreditEnabled,
      creditLimit: newCreditEnabled ? parseFloat(newCreditLimit) || 0 : 0,
      currentBalance: 0,
    };

    setCustomers(prev => [...prev, newCustomer]);
    setIsNewModalOpen(false);
    
    // Limpiar campos
    setNewName('');
    setNewRfc('');
    setNewPhone('');
    setNewEmail('');
    setNewCreditEnabled(false);
    setNewCreditLimit('5000');
  };

  // Ajustar Saldo / Abonar Cuenta
  const handleAbono = () => {
    if (!selectedCustomer || !adjustmentAmount) return;
    const amount = parseFloat(adjustmentAmount) || 0;
    if (amount <= 0) return;
    
    setCustomers(prev => prev.map(c => {
      if (c.id === selectedCustomer.id) {
        const nextBalance = Math.max(0, c.currentBalance - amount);
        
        const newMov = {
          id: `MOV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          customerId: c.id,
          type: 'abono' as const,
          amount,
          balance: nextBalance,
          date: 'Ahora mismo',
          details: 'Abono manual registrado'
        };
        setLedger(prevL => [newMov, ...prevL]);
        
        const updated = { ...c, currentBalance: nextBalance };
        setSelectedCustomer(updated);
        return updated;
      }
      return c;
    }));
    setAdjustmentAmount('');
    SoundFx.playSuccess();
  };

  // Cargar más deuda
  const handleFiado = () => {
    if (!selectedCustomer || !adjustmentAmount) return;
    const amount = parseFloat(adjustmentAmount) || 0;
    if (amount <= 0) return;
    
    setCustomers(prev => prev.map(c => {
      if (c.id === selectedCustomer.id) {
        const nextBalance = Math.min(c.creditLimit, c.currentBalance + amount);
        
        const newMov = {
          id: `MOV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          customerId: c.id,
          type: 'cargo' as const,
          amount,
          balance: nextBalance,
          date: 'Ahora mismo',
          details: 'Cargo manual por venta fiada'
        };
        setLedger(prevL => [newMov, ...prevL]);
        
        const updated = { ...c, currentBalance: nextBalance };
        setSelectedCustomer(updated);
        return updated;
      }
      return c;
    }));
    setAdjustmentAmount('');
    SoundFx.playWarning();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Cabecera Principal */}
      <header className="px-6 py-4 flex justify-between items-center border-b" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center font-bold text-white text-md">
              S
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">SNAPGAD</span>
              <span className="text-xs ml-2 text-zinc-500 border-l pl-2 border-zinc-300 dark:border-zinc-800 uppercase">
                Panel de Clientes
              </span>
            </div>
          </div>
          
          <nav className="hidden md:flex gap-4 text-sm font-semibold ml-8">
            <Link href="/pos" className="text-zinc-500 hover:text-blue-600 transition-colors">Caja POS</Link>
            <Link href="/inventario" className="text-zinc-500 hover:text-blue-600 transition-colors">Inventario</Link>
            <Link href="/clientes" className="text-blue-700 dark:text-blue-400">Clientes</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-zinc-500">ROL: {session.role.toUpperCase()}</span>
          <button
            onClick={toggleTheme}
            className="p-2 rounded border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold"
            style={{ borderColor: 'var(--card-border)' }}
            title="Cambiar Tema"
          >
            {theme === 'light' ? '🌙 TEMA OSCURO' : '☀️ TEMA CLARO'}
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-grow p-6 flex flex-col max-w-7xl mx-auto w-full">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Directorio y Líneas de Crédito</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Administre la cartera de clientes, habilite cuentas de "fiado" y supervise balances de deuda.
            </p>
          </div>
          
          {/* Métricas Rápidas */}
          <div className="flex gap-4">
            <div className="p-4 rounded-xl border flex flex-col items-end" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Cuentas Activas</span>
              <span className="text-xl font-mono font-extrabold">{activeCreditCustomers}</span>
            </div>
            <div className="p-4 rounded-xl border flex flex-col items-end" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Deuda Total</span>
              <span className="text-xl font-mono font-extrabold text-red-500">${totalDebt.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Panel de Controles y Filtros */}
        <div className="p-4 rounded-xl border mb-6 flex flex-wrap gap-4 items-end" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <div className="flex-grow min-w-[200px]">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
              Buscar Cliente
            </label>
            <input
              type="text"
              placeholder="Nombre o RFC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-2.5 rounded border text-sm focus:outline-none"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
              Línea de Crédito
            </label>
            <select
              value={filterCredit}
              onChange={(e) => setFilterCredit(e.target.value as any)}
              className="p-2.5 rounded border text-sm focus:outline-none min-w-[150px]"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
            >
              <option value="Todos">Todos</option>
              <option value="Con Crédito">Autorizados (Fiado)</option>
              <option value="Sin Crédito">Sin Crédito</option>
            </select>
          </div>

          <button 
            onClick={() => setIsNewModalOpen(true)}
            className="py-2.5 px-6 rounded-lg text-white font-bold text-sm tracking-wide bg-blue-700 hover:bg-blue-800 transition-colors"
          >
            + NUEVO CLIENTE
          </button>
        </div>

        {/* Layout de dos columnas si hay un cliente seleccionado */}
        <div className="grid grid-cols-12 gap-6 flex-grow">
          
          {/* Tabla de Datos de Clientes */}
          <div className={`rounded-xl border overflow-hidden ${selectedCustomer ? 'col-span-8' : 'col-span-12'}`} style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-zinc-50 dark:bg-zinc-900/50" style={{ borderColor: 'var(--card-border)' }}>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Cliente</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Contacto</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-center" style={{ color: 'var(--muted)' }}>Línea de Crédito</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-right" style={{ color: 'var(--muted)' }}>Límite ($)</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-right" style={{ color: 'var(--muted)' }}>Deuda Actual</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-right" style={{ color: 'var(--muted)' }}>Disponible</th>
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
                        className={`border-b hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/10' : ''}`} 
                        style={{ borderColor: 'var(--card-border)' }}
                      >
                        <td className="p-4">
                          <div className="font-semibold">{customer.name}</div>
                          {customer.rfc && <div className="text-[10px] font-mono mt-1 text-zinc-500">RFC: {customer.rfc}</div>}
                        </td>
                        <td className="p-4 text-xs">
                          {customer.phone || 'N/A'} <br/>
                          {customer.email || ''}
                        </td>
                        <td className="p-4 text-center">
                          {customer.creditEnabled ? (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              ACTIVO
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              INACTIVO
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono font-bold">
                          {customer.creditEnabled ? `$${customer.creditLimit.toFixed(2)}` : '--'}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {customer.creditEnabled ? (
                            <span className={customer.currentBalance > 0 ? 'text-red-500 font-bold' : ''}>
                              ${customer.currentBalance.toFixed(2)}
                            </span>
                          ) : '--'}
                        </td>
                        <td className="p-4 text-right font-mono font-bold">
                          {customer.creditEnabled ? (
                            <span className={isMaxedOut ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}>
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
                <div className="p-12 text-center text-zinc-500">
                  <p>No se encontraron clientes con los filtros aplicados.</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA LATERAL: Detalles del crédito / Ajustes de saldo */}
          {selectedCustomer && (
            <div className="col-span-4 p-6 rounded-xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
              <div>
                <div className="flex justify-between items-center mb-6 pb-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
                  <h3 className="font-extrabold text-xs tracking-wider uppercase text-zinc-400">AJUSTES DE CUENTA</h3>
                  <button onClick={() => setSelectedCustomer(null)} className="text-zinc-500 hover:text-zinc-300 text-xs">✕ CERRAR</button>
                </div>

                <h4 className="text-lg font-bold mb-1">{selectedCustomer.name}</h4>
                <p className="text-xs text-zinc-500 mb-6 font-mono">ID: {selectedCustomer.id}</p>

                {selectedCustomer.creditEnabled ? (
                  <div className="space-y-6">
                    {/* Tarjeta de Resumen Deuda */}
                    <div className="p-4 rounded-xl border space-y-3 font-mono text-sm" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--muted)' }}>LÍMITE MÁXIMO:</span>
                        <span className="font-bold" style={{ color: 'var(--foreground)' }}>${selectedCustomer.creditLimit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--muted)' }}>DEUDA ACTUAL:</span>
                        <span className="font-bold text-red-500">${selectedCustomer.currentBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
                        <span style={{ color: 'var(--muted)' }}>CRÉDITO DISPONIBLE:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ${(selectedCustomer.creditLimit - selectedCustomer.currentBalance).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Acciones de Ajuste */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Monto del Ajuste</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={adjustmentAmount}
                          onChange={e => setAdjustmentAmount(e.target.value)}
                          className="w-full p-2.5 rounded border font-mono font-bold text-sm"
                          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleAbono}
                          className="flex-grow py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-extrabold text-xs text-white transition-colors"
                        >
                          💸 REGISTRAR ABONO
                        </button>
                        <button
                          onClick={handleFiado}
                          className="flex-grow py-3 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 font-extrabold text-xs transition-all"
                        >
                          ⚠️ CARGAR FIADO
                        </button>
                      </div>

                      <button
                        onClick={() => downloadAccountStatement(selectedCustomer)}
                        className="w-full py-2.5 rounded-lg border hover:bg-zinc-150 dark:hover:bg-zinc-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                      >
                        📄 IMPRIMIR ESTADO DE CUENTA
                      </button>
                    </div>

                    {/* Historial Ledger de Movimientos */}
                    <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">HISTORIAL DE CRÉDITO</span>
                      <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                        {ledger.filter(l => l.customerId === selectedCustomer.id).map(l => (
                          <div key={l.id} className="p-3 rounded-lg border space-y-1" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className={l.type === 'cargo' ? 'text-red-500' : 'text-emerald-500'}>
                                {l.type === 'cargo' ? '🔴 CARGO' : '🟢 ABONO'}
                              </span>
                              <span className="text-zinc-500 text-[9px]">{l.date}</span>
                            </div>
                            <p className="text-[11px] font-semibold text-zinc-400 truncate">{l.details}</p>
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-zinc-500">Monto: ${l.amount.toFixed(2)}</span>
                              <span className="font-bold text-zinc-400">Saldo: ${l.balance.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                        {ledger.filter(l => l.customerId === selectedCustomer.id).length === 0 && (
                          <span className="block text-center py-4 text-xs text-zinc-500">Sin movimientos registrados.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    <p className="text-xs mb-4">Este cliente no tiene una línea de crédito autorizada.</p>
                    <button
                      onClick={() => {
                        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, creditEnabled: true, creditLimit: 2000 } : c));
                        setSelectedCustomer(prev => prev ? { ...prev, creditEnabled: true, creditLimit: 2000 } : null);
                      }}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs rounded-lg"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddCustomer}
            className="w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
          >
            <h3 className="text-lg font-extrabold" style={{ color: 'var(--foreground)' }}>Registrar Nuevo Cliente</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ej. Juan Pérez"
                  className="w-full p-2.5 rounded border text-xs"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>RFC</label>
                  <input
                    type="text"
                    value={newRfc}
                    onChange={e => setNewRfc(e.target.value)}
                    placeholder="ej. PEZJ900101"
                    className="w-full p-2.5 rounded border text-xs"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>Teléfono</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="ej. 5512345678"
                    className="w-full p-2.5 rounded border text-xs"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>Correo Electrónico</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="ej. juan@gmail.com"
                  className="w-full p-2.5 rounded border text-xs"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                />
              </div>

              <div className="flex items-center gap-3 py-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
                <input
                  type="checkbox"
                  id="creditEnabled"
                  checked={newCreditEnabled}
                  onChange={e => setNewCreditEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}
                />
                <label htmlFor="creditEnabled" className="text-xs font-bold uppercase cursor-pointer" style={{ color: 'var(--foreground)' }}>
                  HABILITAR CRÉDITO DE FIADO
                </label>
              </div>

              {newCreditEnabled && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>Límite de Crédito ($)</label>
                  <input
                    type="number"
                    value={newCreditLimit}
                    onChange={e => setNewCreditLimit(e.target.value)}
                    className="w-full p-2.5 rounded border text-xs font-mono font-bold"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="flex-grow py-2.5 rounded-lg text-xs font-bold"
                style={{ backgroundColor: 'var(--muted-background)', color: 'var(--foreground)' }}
              >
                CANCELAR
              </button>
              <button
                type="submit"
                className="flex-grow py-2.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white border-none cursor-pointer"
              >
                CREAR CLIENTE
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
