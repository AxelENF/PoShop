# Mexican Inventory & Quick Audit Engine Design Specification

**Goal:** Create a high-end, commercial-grade Mexican inventory management and audit experience for PoShop that outperforms traditional retail systems like Eleventa.
**Key Capabilities:** Inventory Restore Points (Snapshots), Mexican catalog seeding with automatic Pack Multipliers, spreadsheet-like Keyboard-Driven Quick Audits, and live profit margins & SAT billing calculators.

---

## 1. Component Architecture & Data Flow

### A. Inventory Snapshots (Restore Points)
* **Storage Schema:** An array of snapshot records saved in `localStorage` under `pos_inventory_restore_points`:
  ```typescript
  interface InventorySnapshot {
    id: string;
    timestamp: number;
    name: string;
    productsCount: number;
    data: ProductSeed[];
  }
  ```
* **Operations:**
  - `createSnapshot(name: string)`: Compiles the current products state and saves it with a timestamp.
  - `restoreSnapshot(id: string)`: Loads the snapshot array, replaces the active products state, and notifies the user with a dynamic sound and success alert.

### B. Mexican Product Database & Pack Multiplication Seeder
* **Seeder catalog:** A comprehensive dataset of standard Mexican grocery items preloaded in memory:
  ```typescript
  interface PresetProduct {
    name: string;
    category: string;
    barcode: string;
    internalCode: string;
    unit: 'pza' | 'kg' | 'l';
    defaultCost: number;
    defaultPrice: number;
    satCode: string;
    satUnit: string;
    packQuantity: number; // e.g. 24 for Coca-Cola boxes
  }
  ```
* **Intake Logic:**
  - Pieza (single unit) count input.
  - Pack (box/crate) count input.
  - Total Stock = `Pieces + (Packs * packQuantity)`.

### C. Quick Audit Mode (Keyboard-Driven spreadsheet)
* **Spreadsheet-style rows:** When Quick Audit Mode is enabled, the stock cell in the table switches from static text to a highly-focused `<input type="number">`.
* **Keyboard navigation:** Pressing `Enter` or `ArrowDown` automatically shifts focus to the input on the row below, allowing instant hands-free stock input.
* **Discrepancy badge:** Shows `Counted - SystemStock` dynamically (e.g. `Counted 12, System 15` -> Badge shows `-3 (Merma)` in high-contrast red).

### D. Dynamic Margins & SAT CFDI helper
* **Net Margin Calculator:**
  - Net Margin % = `((SalePrice - CostPrice) / SalePrice) * 100`.
  - Markup % = `((SalePrice - CostPrice) / CostPrice) * 100`.
  - Margin color codes: `<10%` is warning red, `10%-25%` is amber, `>=25%` is healthy emerald green.
* **Suggested Selling Price:** Type Cost Price + Markup %, auto-calculates Sale Price rounded to the nearest 50 cents.

---

## 2. Affected Files

### A. [page.tsx](file:///c:/Users/axelo/.gemini/antigravity/playground/luminescent-quasar/PoShop/apps/web/src/app/inventario/page.tsx)
* Add UI for "Puntos de Restauración" backup panel.
* Incorporate tabs for "Semillero Mexicano" with categories (Refrescos, Botanas, Panadería, Enlatados, Limpieza) and Pack multiplier math.
* Add Quick Audit toggle that replaces table cells with inputs and captures barcode scanner inputs.
* Include live Margin calculation badge next to pricing inputs.

### B. [products-seed.ts](file:///c:/Users/axelo/.gemini/antigravity/playground/luminescent-quasar/PoShop/apps/web/src/app/pos/products-seed.ts)
* Extend product interface definitions to support `satCode`, `satUnit`, and standard Mexican metadata fields.

---

## 3. Risk Mitigation & Edge Cases

* **Storage limits:** Snapshot data is stringified. Limit local storage snapshots to maximum 5 entries. If limit is exceeded, automatically prune the oldest backup.
* **Duplicate SKU on Seeding:** If a preset product is added that already exists in the active inventory, the system must merge them by adding the new counted stock to the existing stock instead of generating redundant catalog listings.
* **Empty search performance:** In Quick Audit mode, rendering 100s of inputs can lag. Implement standard react memoization on row renders to keep typing perfectly smooth and responsive.
