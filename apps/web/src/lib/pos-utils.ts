'use client';

/**
 * SNAPGAD POS - Open Source Utilities
 * High-performance algorithms and validators for retail applications.
 */

/**
 * 1. EAN-13 Barcode Check Digit Validator
 * Verifies if a barcode matches the GS1 EAN-13 checksum standard.
 * 
 * EAN-13 Algorithm:
 * - Sum all digits in odd positions (1st, 3rd, 5th...).
 * - Sum all digits in even positions (2nd, 4th, 6th...) and multiply by 3.
 * - Add the sums together.
 * - Checksum digit is the value to add to reach the next multiple of 10.
 */
export function isValidEAN13(barcode: string): boolean {
  const cleanBarcode = barcode.replace(/\s+/g, '');
  if (!/^\d{13}$/.test(cleanBarcode)) {
    return false;
  }

  let oddSum = 0;
  let evenSum = 0;

  for (let i = 0; i < 12; i++) {
    const digit = parseInt(cleanBarcode[i], 10);
    if (i % 2 === 0) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }

  const totalSum = oddSum + (evenSum * 3);
  const remainder = totalSum % 10;
  const calculatedCheckDigit = remainder === 0 ? 0 : 10 - remainder;
  const originalCheckDigit = parseInt(cleanBarcode[12], 10);

  return calculatedCheckDigit === originalCheckDigit;
}

/**
 * 2. Mexican SAT RFC Format Validator
 * Validates Personas Físicas (13 chars) and Personas Morales (12 chars) RFC syntax.
 */
export interface RFCValidationResult {
  isValid: boolean;
  type: 'Física' | 'Moral' | 'Inválido';
  formatted?: string;
}

export function validateSATRFC(rfc: string): RFCValidationResult {
  const cleanRFC = rfc.trim().toUpperCase();
  
  // Regex para Persona Física: 4 letras, 6 números, homoclave de 3 letras/números
  const fisicaRegex = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
  
  // Regex para Persona Moral: 3 letras, 6 números, homoclave de 3 letras/números
  const moralRegex = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

  if (fisicaRegex.test(cleanRFC)) {
    return { isValid: true, type: 'Física', formatted: cleanRFC };
  }
  
  if (moralRegex.test(cleanRFC)) {
    return { isValid: true, type: 'Moral', formatted: cleanRFC };
  }

  // RFCs genéricos oficiales del SAT
  if (cleanRFC === 'XAXX010101000') {
    return { isValid: true, type: 'Física', formatted: cleanRFC }; // Público en General
  }
  if (cleanRFC === 'XEXX010101000') {
    return { isValid: true, type: 'Moral', formatted: cleanRFC }; // Extranjeros
  }

  return { isValid: false, type: 'Inválido' };
}

/**
 * 3. SoundFx Synthesizer (Native Web Audio API)
 * Synthesizes realistic transactional audio beeps directly in the browser
 * without relying on external file assets. Safe for SSR.
 */
class WebAudioSoundFx {
  private ctx: AudioContext | null = null;

  private initContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    // Si está suspendido por la política de gestos del navegador, reanudar
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Short beep when a product is scanned (1000Hz, 80ms)
   */
  public playBeep() {
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, ctx.currentTime); // Hz
      
      // Control de volumen e interpolación lineal de decaimiento
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Web Audio PlayBeep failed:', e);
    }
  }

  /**
   * Harmonious chime when a transaction succeeds (C5 to E5 arpeggio)
   */
  public playSuccess() {
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.06, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(523.25, now, 0.12);       // C5
      playTone(659.25, now + 0.08, 0.20); // E5
    } catch (e) {
      console.warn('Web Audio PlaySuccess failed:', e);
    }
  }

  /**
   * Low alert buzzer when limits are breached or inputs are incorrect (180Hz)
   */
  public playWarning() {
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Web Audio PlayWarning failed:', e);
    }
  }
}

export const SoundFx = new WebAudioSoundFx();
