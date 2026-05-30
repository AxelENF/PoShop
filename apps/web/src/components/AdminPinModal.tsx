'use client';

import React, { useState } from 'react';
import { useAppTheme } from './theme-context';
import { SoundFx } from '../lib/pos-utils';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}

export default function AdminPinModal({ isOpen, onClose, onSuccess, title = 'Autorización de Supervisor Requerida' }: AdminPinModalProps) {
  const { adminPin } = useAppTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    SoundFx.playBeep();
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);
      
      if (nextPin.length === 4) {
        if (nextPin === adminPin) {
          SoundFx.playSuccess();
          onSuccess();
          setPin('');
          onClose();
        } else {
          SoundFx.playWarning();
          setError(true);
          setPin('');
        }
      }
    }
  };

  const handleClear = () => {
    SoundFx.playBeep();
    setPin('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-[300px] bg-white rounded-2xl border border-slate-200 p-5 shadow-xl animate-scale-in">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-sm font-extrabold text-slate-800 leading-tight mb-1">{title}</h3>
          <p className="text-[10px] text-slate-400 font-medium px-2 leading-relaxed">
            Ingrese el PIN del administrador o supervisor para continuar.
          </p>
        </div>

        {/* Display PIN indicators */}
        <div className="my-5 flex justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                error
                  ? 'border-red-500 bg-red-100'
                  : pin.length > idx
                  ? 'border-blue-600 bg-blue-600 scale-110 shadow-sm'
                  : 'border-slate-300 bg-white'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="text-center text-[10px] text-red-500 font-bold mb-4 animate-shake">
            ❌ PIN INCORRECTO. INTENTE DE NUEVO.
          </div>
        )}

        {/* Numeric keypad grid */}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-lg border border-slate-200/60 active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="py-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-extrabold rounded-lg border border-red-200 active:scale-95 transition-all"
          >
            BORRAR
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-lg border border-slate-200/60 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={onClose}
            className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg border border-slate-300/40 active:scale-95 transition-all"
          >
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
}
