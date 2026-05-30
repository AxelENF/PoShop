# PoShop V2 Rearchitect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rearchitect PoShop V2 into a highly professional Light Theme corporate ERP interface (Odoo/CONTPAQi style), implementing vertical Sidebar navigation, branch-separated inventory stock tracking, and manager authorization with an Admin PIN shield.

**Architecture:** We will create global state providers for the premium light theme preference and the active branch, isolate modular UI components like `Sidebar` and `AdminPinModal` in the `components` directory, and refactor the main pages (`pos`, `inventario`, `admin`, `clientes`) to conform to the new layout and authorization rules.

**Tech Stack:** Next.js 15, React, Tailwind CSS / Vanilla CSS, LocalStorage (for client-side persistence), and Lucide-style SVG icons.

---

### Task 1: Theme & Branch Context Providers

**Files:**
- Create: `apps/web/src/components/theme-context.tsx`
- Create: `apps/web/src/components/ThemeProvider.tsx`

- [ ] **Step 1: Create `theme-context.tsx`**

Write a premium light theme provider that defaults to Light Mode, sets data attributes on the HTML element, and handles the selected branch state across all pages:
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light'; // Only light theme is supported as per spec

interface ThemeContextType {
  theme: Theme;
  activeBranch: string;
  setActiveBranch: (branch: string) => void;
  adminPin: string;
  setAdminPin: (pin: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeBranch, setActiveBranch] = useState('Sucursal Matriz');
  const [adminPin, setAdminPin] = useState('9999');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('snapgad_theme', 'light');
      
      const savedBranch = window.localStorage.getItem('snapgad_active_branch');
      if (savedBranch) setActiveBranch(savedBranch);

      const savedPin = window.localStorage.getItem('snapgad_admin_pin');
      if (savedPin) setAdminPin(savedPin);
    }
  }, []);

  const handleSetBranch = (branch: string) => {
    setActiveBranch(branch);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_active_branch', branch);
    }
  };

  const handleSetPin = (pin: string) => {
    setAdminPin(pin);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_admin_pin', pin);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: 'light', activeBranch, setActiveBranch: handleSetBranch, adminPin, setAdminPin: handleSetPin }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within a ThemeProvider');
  return context;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/theme-context.tsx
git commit -m "feat: add global theme and branch context provider for light mode PoShop V2"
```

---

### Task 2: Vertical Sidebar Navigation Component

**Files:**
- Create: `apps/web/src/components/Sidebar.tsx`

- [ ] **Step 1: Create `Sidebar.tsx`**

Write a premium, beautiful left-navigation vertical sidebar without emojis, styled with professional Lucide-style SVG outline icons and highlighted active routes:
```typescript
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppTheme } from './theme-context';
import { useUserSession } from '../lib/user-session';
import { SoundFx } from '../lib/pos-utils';

export default function Sidebar({ onTriggerAction }: { onTriggerAction?: (action: string) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeBranch, setActiveBranch } = useAppTheme();
  const { session } = useUserSession();

  const handleLogout = () => {
    SoundFx.playWarning();
    router.push('/login');
  };

  const menuItems = [
    {
      name: 'Punto de Venta',
      path: '/pos',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Inventarios',
      path: '/inventario',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: 'Clientes y Crédito',
      path: '/clientes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Gobernanza Admin',
      path: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      ),
      adminOnly: true,
    },
    {
      name: 'Ajustes SAT',
      path: '/ajustes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 font-sans">
      <div className="flex flex-col">
        {/* Branding header */}
        <div className="p-5 border-b border-slate-200 flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-md">
              P
            </div>
            <div>
              <span className="font-extrabold text-slate-800 text-lg tracking-tight">PoShop</span>
              <span className="text-[10px] ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">v2</span>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Sucursal de Caja</label>
            <select
              value={activeBranch}
              onChange={(e) => {
                setActiveBranch(e.target.value);
                SoundFx.playBeep();
              }}
              className="mt-1 w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Sucursal Matriz">Sucursal Matriz</option>
              <option value="Sucursal Poniente">Sucursal Poniente</option>
            </select>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="p-4 flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const isRestricted = item.adminOnly && session.role !== 'owner' && session.role !== 'superadmin';
            
            return (
              <button
                key={item.name}
                onClick={() => {
                  SoundFx.playBeep();
                  if (isRestricted && onTriggerAction) {
                    onTriggerAction(item.path);
                  } else {
                    router.push(item.path);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.name}</span>
                {item.adminOnly && (
                  <span className="ml-auto text-[9px] bg-amber-50 border border-amber-200 text-amber-600 px-1 rounded-sm">PIN</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User information */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs uppercase">
            {session.username.substring(0, 2)}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-800 leading-tight">{session.username.toUpperCase()}</span>
            <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">{session.role}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 w-full py-1.5 rounded border border-slate-200 bg-white hover:bg-red-50 text-[10px] text-slate-600 hover:text-red-600 hover:border-red-200 font-bold transition-colors uppercase tracking-wider"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/Sidebar.tsx
git commit -m "feat: add unified vertical navigation sidebar component with SVG icons"
```

---

### Task 3: Security Admin PIN Dialog Component

**Files:**
- Create: `apps/web/src/components/AdminPinModal.tsx`

- [ ] **Step 1: Create `AdminPinModal.tsx`**

Write a beautiful modal dialog to request the supervisor's 4-digit PIN for high-privilege operations:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/AdminPinModal.tsx
git commit -m "feat: add AdminPinModal component for supervisor action validation"
```

---

### Task 4: Root Providers Registration

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Wrap App Layout in `ThemeProvider`**

Import and add `ThemeProvider` to the root HTML body inside `apps/web/src/app/layout.tsx`:
```tsx
import { ThemeProvider } from '../components/theme-context';
// ... inside body return:
return (
  <html lang="es" data-theme="light">
    <body>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </body>
  </html>
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat: register ThemeProvider in root layout for light theme persistence"
```

---

### Task 5: Rearchitect Point of Sale Page (`/pos`)

**Files:**
- Modify: `apps/web/src/app/pos/page.tsx`

- [ ] **Step 1: Integrate Sidebar, Light Theme UI, and Admin PIN Authorization**

Modify `pos/page.tsx` to:
1. Wrap page content inside `<div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">` and mount `<Sidebar onTriggerAction={...} />`.
2. Clean out dark mode styles (`bg-zinc-950`, `bg-zinc-900`, `dark:`, `theme === 'dark'`). Set default background to light gray, cards to white, borders to slate-200.
3. Replace informal emojis (like ⚖️, 📦, 👤, 🛒, 💳) in tables and action panels with clean SVG symbols.
4. Mount `<AdminPinModal>` and block the shift closure action behind the supervisor PIN.
5. Modify sales inventory decrement logic to consult `stockPerBranch` and update local branches stock correctly.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/pos/page.tsx
git commit -m "feat: rearchitect POS page in light mode with Sidebar and supervisor PIN protection"
```

---

### Task 6: Rearchitect Inventory Page with Stock separated by Branch

**Files:**
- Modify: `apps/web/src/app/inventario/page.tsx`

- [ ] **Step 1: Implement Branch Inventory Selector & Transfer System**

Modify `inventario/page.tsx` to:
1. Integrate the `Sidebar` and set the page structure inside the clear Slate-50 layout.
2. Replace `stock` with `stockPerBranch` inside `ProductSeed` instances and display stock distribution cleanly in a Slate tabular grid.
3. Create a **Traspasos de Inventario** modal/form to safely transfer stock from "Sucursal Matriz" to "Sucursal Poniente" with origin range-checks.
4. Require the Admin PIN to access the New Product modal, Snapshot generation, Excel import, and audit adjustments.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/inventario/page.tsx
git commit -m "feat: rearchitect inventory page with separate stock per branch and transfers"
```

---

### Task 7: Rearchitect Gobernanza Admin & Security Panel

**Files:**
- Modify: `apps/web/src/app/admin/page.tsx`

- [ ] **Step 1: Implement PIN management and shift audits panel**

Modify `admin/page.tsx` to:
1. Integrate the `Sidebar` and premium Light Theme.
2. Build an explicit **Seguridad y Accesos** segment to securely view and change the Admin PIN, updating it in the `ThemeProvider` context.
3. Integrate tabular cash register closure histories (`snapgad_shift_logs`) for supervisor inspection.
4. Add early guard role check: if the active user role is not `owner` or `superadmin`, render the blocked Candado access screen.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/admin/page.tsx
git commit -m "feat: rearchitect Admin panel with PIN management and register closure history"
```
