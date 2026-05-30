'use client';

import React, { useState } from 'react';
import { trpc } from '../utils/trpc/client';
import { useUserSession, CashierSession, UserRole } from '../lib/user-session';
import { SoundFx } from '../lib/pos-utils';

interface PinLockScreenProps {
  onSuccess: (cashier: CashierSession) => void;
}

export default function PinLockScreen({ onSuccess }: PinLockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useUserSession();

  const handleKeyPress = (num: string) => {
    if (pin.length >= 4) return;
    SoundFx.playBeep();
    const newPin = pin + num;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      handleVerify(newPin);
    }
  };

  const handleBackspace = () => {
    SoundFx.playBeep();
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    SoundFx.playBeep();
    setPin('');
    setError('');
  };

  // Safe reference verification logic with dev fallback
  const verifyPinMutation = trpc.auth.verifyPin.useMutation();

  const handleVerify = async (enteredPin: string) => {
    setIsLoading(true);
    setError('');

    // Fallback para desarrollo local si no hay variables de Supabase configuradas
    const isDev = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (isDev) {
      setTimeout(() => {
        setIsLoading(false);
        if (enteredPin === '0000') {
          SoundFx.playSuccess();
          // Resolver el cajero según la sesión dev del usuario activo
          onSuccess({
            id: session.id,
            name: session.name,
            role: session.role,
            branchId: session.branchId,
          });
        } else {
          SoundFx.playWarning();
          setError('PIN incorrecto de prueba (Use 0000)');
          setPin('');
        }
      }, 500);
      return;
    }

    try {
      const dbUser = await verifyPinMutation.mutateAsync({ pin: enteredPin });
      setIsLoading(false);
      SoundFx.playSuccess();
      onSuccess({
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role as UserRole,
        branchId: dbUser.branchId || undefined,
      });
    } catch (err: any) {
      setIsLoading(false);
      SoundFx.playWarning();
      setError(err?.message || 'Error de validación del PIN.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm select-none font-sans">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 text-center flex flex-col items-center">
        
        {/* Lock Icon Header */}
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-xl font-black text-slate-800 tracking-tight">Caja Registradora Cerrada</h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Ingrese su PIN de 4 dígitos para desbloquear la caja en <span className="font-extrabold text-blue-600">{session.branchName}</span>
        </p>

        {/* PIN Indicators */}
        <div className="flex gap-4 my-8 justify-center">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                pin.length > index
                  ? 'bg-blue-600 border-blue-600 scale-110 shadow-sm shadow-blue-500/25'
                  : 'bg-white border-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 text-xs font-bold text-red-500 bg-red-50 py-1.5 px-3 rounded-lg border border-red-100 uppercase tracking-wider">
            {error}
          </div>
        )}

        {/* Numeric Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              disabled={isLoading}
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-600 font-black text-lg shadow-sm active:scale-95 transition-all duration-100 cursor-pointer disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            disabled={isLoading || pin.length === 0}
            onClick={handleClear}
            className="h-14 rounded-2xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs tracking-wider uppercase active:scale-95 transition-all duration-100 cursor-pointer disabled:opacity-50"
          >
            Clear
          </button>
          <button
            disabled={isLoading}
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-600 font-black text-lg shadow-sm active:scale-95 transition-all duration-100 cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            disabled={isLoading || pin.length === 0}
            onClick={handleBackspace}
            className="h-14 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-600 flex items-center justify-center active:scale-95 transition-all duration-100 cursor-pointer disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414A2 2 0 0010.828 19H20a2 2 0 002-2V7a2 2 0 00-2-2h-9.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-[10px] text-slate-400 font-medium tracking-wide">
          PIN de pruebas generalizado: <span className="font-bold text-blue-500">0000</span>
        </div>
      </div>
    </div>
  );
}
