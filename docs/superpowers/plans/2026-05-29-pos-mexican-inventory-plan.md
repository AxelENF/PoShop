# Mexican Inventory & Quick Audit Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materialize the high-performance Mexican Inventory module in PoShop containing backup restoration points, bulk category pack intake, instant spreadsheet-like audit navigation, and dynamic margin pricing widgets.

**Architecture:** Extended catalog metadata interface in products-seed. Local React component state synchronization with LocalStorage snapshots. Barcode event hooks and focus handlers for keyboard navigation.

**Tech Stack:** Next.js 15, LocalStorage, React state, Tailwind/Vanilla CSS.

---

## Proposed Changes

### Component 1: Mexican Catalog Schema Extensions

#### [MODIFY] [products-seed.ts](file:///c:/Users/axelo/.gemini/antigravity/playground/luminescent-quasar/PoShop/apps/web/src/app/pos/products-seed.ts)
* **Goal:** Support fiscal compliance (`satCode`, `satUnit`) and pack metadata on the core seed objects.
* **Steps:**
  - [ ] **Step 1: Extend interface definition**
    Add `satCode?: string; satUnit?: string;` fields to the `ProductSeed` typescript interface.
  - [ ] **Step 2: Export popular Mexican presets catalog**
    Export a rich array `MEXICAN_PRESETS_CATALOG` containing standard Mexican products with correct EAN-13 barcodes, categories, and SAT codes.

---

### Component 2: Snapshots & Pack-Multiplier Seeding UI

#### [MODIFY] [page.tsx](file:///c:/Users/axelo/.gemini/antigravity/playground/luminescent-quasar/PoShop/apps/web/src/app/inventario/page.tsx)
* **Goal:** Enable inventory restore points and category pack multipliers.
* **Steps:**
  - [ ] **Step 1: Declare state and hooks for restore snapshots**
    Add states `restorePoints` and `snapshotName`. Add hooks to load/save restore points to `localStorage`.
  - [ ] **Step 2: Render restore points control panel**
    Inject a control widget at the top of `/inventario` displaying active snapshots, with buttons to *"Crear Copia de Seguridad"* and *"Restaurar"*.
  - [ ] **Step 3: Build Mexican Seeder Modal with Pack Math**
    Add a seeder modal containing tabs segmented by category, showing popular products, piece and pack inputs (e.g. 24-packs), and auto-computing total stock before insertion.

---

### Component 4: Keyboard-Driven Quick Audit Grid

#### [MODIFY] [page.tsx](file:///c:/Users/axelo/.gemini/antigravity/playground/luminescent-quasar/PoShop/apps/web/src/app/inventario/page.tsx)
* **Goal:** Build the ultra-fast keyboard-friendly spreadsheet-like stock updater.
* **Steps:**
  - [ ] **Step 1: Declare Quick Audit state variables**
    Add state `isQuickAuditMode` (boolean) and focus track indexes.
  - [ ] **Step 2: Swap static stock cell with focused inputs**
    Under `isQuickAuditMode`, render a styled `<input type="number">` inside the table row.
  - [ ] **Step 3: Implement Keyboard navigation keys**
    Add `onKeyDown` hooks to capture `ArrowDown`, `ArrowUp` or `Enter` to shift focus to adjacent rows.
  - [ ] **Step 4: Display discrepancy badges in real-time**
    Compare active stock value vs original database stock, showing discrepancies (e.g. `-3 Merma` or `+2 Sobrante`).

---

### Component 5: Dynamic Profit Calculator & Global Stock Warnings

#### [MODIFY] [page.tsx](file:///c:/Users/axelo/.gemini/antigravity/playground/luminescent-quasar/PoShop/apps/web/src/app/inventario/page.tsx)
* **Goal:** Prevent margin failures and establish global safety alert parameters.
* **Steps:**
  - [ ] **Step 1: Build live markup calculator**
    Modify product edit card and creation modal to include a Markup Percentage input. Changing cost + markup auto-calculates Sale Price.
  - [ ] **Step 2: Render margin profit badge**
    Show dynamic indicators coloring margins based on health rules (red, amber, green).
  - [ ] **Step 3: Add global threshold controls**
    Render a slider card allowing the merchant to instantly redefine minimum and critical stocks for all active items in the active category.

---

## Verification Plan

### Automated Tests
* Run: `npm run build` to verify Next.js bundle compiles smoothly with zero TypeScript issues.

### Manual Verification
1. Open `/inventario` in the browser.
2. Create an Inventory Restore Point snapshot.
3. Open the "Catálogo Mexicano" wizard, select category Refrescos, type `2` boxes (packs) of Coca-Cola 600ml, and click Seed. Verify that `48` pieces are added correctly to inventory.
4. Toggle "Modo Auditoría Rápida", use arrow keys to navigate stocks, modify stock values, and observe discrepancy badges.
5. Restore the snapshot and verify that inventory reverts back to its original state.
