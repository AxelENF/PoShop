'use client';

import React, { useState } from 'react';
import { trpc } from '../utils/trpc/client';
import { SoundFx } from '../lib/pos-utils';

interface SupervisorOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supervisorName: string) => void;
  actionDescription: string;
}

export default function SupervisorOverrideModal({
  isOpen,
  onClose,
  onSuccess,
  actionDescription,
}: SupervisorOverrideModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

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

  const verifySupervisorPinMutation = trpc.auth.verifySupervisorPin.useMutation();

  const handleVerify = async (enteredPin: string) => {
    setIsLoading(true);
    setError('');

    const isDev = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (isDev) {
      setTimeout(() => {
        setIsLoading(false);
        if (enteredPin === '0000') {
          SoundFx.playSuccess();
          onSuccess('Roberto Díaz (Supervisor Dev)');
        } else {
          SoundFx.playWarning();
          setError('PIN de supervisor incorrecto (Use 0000)');
          setPin('');
        }
      }, 500);
      return;
    }

    try {
      const res = await verifySupervisorPinMutation.mutateAsync({ pin: enteredPin });
      setIsLoading(false);
      SoundFx.playSuccess();
      onSuccess(res.supervisor);
    } catch (err: any) {
      setIsLoading(false);
      SoundFx.playWarning();
      setError(err?.message || 'Código de supervisor inválido.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm select-none font-sans">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 text-center flex flex-col items-center">
        
        {/* Warning Icon Header */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4 border border-amber-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-xl font-black text-slate-800 tracking-tight">Autorización de Supervisor</h2>
        <p className="text-xs text-slate-500 font-semibold mt-1.5 px-2">
          Acción restringida: <span className="font-extrabold text-amber-600 block my-1">"{actionDescription}"</span>
          Por favor, ingrese el PIN de Administrador o Dueño para continuar.
        </p>

        {/* PIN Indicators */}
        <div className="flex gap-4 my-6 justify-center">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                pin.length > index
                  ? 'bg-amber-500 border-amber-500 scale-110 shadow-sm shadow-amber-500/25'
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
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              disabled={isLoading}
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-slate-700 hover:text-amber-600 font-black text-md shadow-sm active:scale-95 transition-all duration-100 cursor-pointer disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            disabled={isLoading || pin.length === 0}
            onClick={handleClear}
            className="h-12 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] tracking-wider uppercase active:scale-95 transition-all duration-100 cursor-pointer disabled:opacity-50"
          >
            Clear
          </button>
          <button
            disabled={isLoading}
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-slate-700 hover:text-amber-600 font-black text-md shadow-sm active:scale-95 transition-all duration-100 cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            disabled={isLoading || pin.length === 0}
            onClick={handleBackspace}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-slate-700 hover:text-amber-600 flex items-center justify-center active:scale-95 transition-all duration-100 cursor-pointer disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414A2 2 0 0010.828 19H20a2 2 0 002-2V7a2 2 0 00-2-2h-9.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>

        <button
          onClick={() => {
            SoundFx.playBeep();
            onClose();
          }}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 mt-2 py-1 px-4 tracking-wider transition-colors cursor-pointer"
        >
          CANCELAR
        </button>
      </div>
    </div>
  );
}
