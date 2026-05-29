# Dynamic Marketing Ticket Customizer & Native Spooler Hardware Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Professionalize SNAPGAD POS local hardware connections by replacing print simulation with actual local silent thermal spooling (via a hidden Electron window) and building a dynamic marketing-centric ticket editor in `/ajustes`.

**Architecture:** Electron invisible `BrowserWindow` loading custom HTML styled templates, dispatching silent spooled prints via `print()`. Web POS client sends structured JSON layout instructions with custom tenant logo, slogan, and campaign QR codes.

**Tech Stack:** Next.js 15, Electron 33, WebSockets, LocalStorage, CSS Print Media Queries.

---

## Proposed Changes

### Component 1: Real Native Thermal Print Spooler Engine

#### [MODIFY] [main.js](file:///c:/Users/axelo/.gemini/antigravity/playground/luminescent-quasar/PoShop/apps/mobile-bridge/main.js)
* **Goal:** Replace simulated print outputs with a physical silent browser print job.
* **Steps:**
  - [ ] **Step 1: Write print payload handler**
    In `main.js`, update case `PRINT_RAW` to instantiate a hidden background `BrowserWindow`.
  - [ ] **Step 2: Generate formatted print HTML layout**
    Generate structured, cleanly aligned ticket layout string containing high-contrast text wrapped in a `<pre>` monospace container, optimized for thermal print layouts.
  - [ ] **Step 3: Call system print spooler**
    Call `printWindow.webContents.print({ silent: true, deviceName: printerName || '' })` and close the window upon print callback resolution.
  - [ ] **Step 4: Dispatch websocket results status**
    Emit `PRINT_SUCCESS` or `PRINT_ERROR` payload backwards on the WebSocket channel to the web POS client.

---

### Component 2: Adjustments Form and Local Diagnostics Console

#### [MODIFY] [page.tsx](file:///c:/Users/axelo/.gemini/antigravity/playground/luminescent-quasar/PoShop/apps/web/src/app/ajustes/page.tsx)
* **Goal:** Add visual ticket branding fields and feed real hardware logs from the Electron WebSocket server.
* **Steps:**
  - [ ] **Step 1: Establish active WebSocket monitor**
    Mount a real-time `WebSocket('ws://localhost:9099')` hook in `AjustesPage` to check bridge status and pipe incoming bridge messages straight into the visual diagnostic console logs.
  - [ ] **Step 2: Add customized branding state hooks**
    Declare react state variables for receipt parameters: `ticketSlogan`, `ticketLogoUrl`, `ticketMarketingQr`, `showTaxDetails`, `ticketWidth`.
  - [ ] **Step 3: Render branding controls in UI**
    Inject a neat, harmonize CSS card form for "Configuración de Ticket de Venta" displaying slogan inputs, show/hide tax selectors, dynamic width dropdowns, and custom QR redirect inputs.
  - [ ] **Step 4: Hook save triggers**
    Persist settings inside LocalStorage configuration objects on save button press.

---

### Component 3: Dynamic Ticket Dispatcher with Marketing QR Campaigns

#### [MODIFY] [page.tsx](file:///c:/Users/axelo/.gemini/antigravity/playground/luminescent-quasar/PoShop/apps/web/src/app/pos/page.tsx)
* **Goal:** Format customized receipts incorporating marketing slogans and campaign QR parameters during sales checkout.
* **Steps:**
  - [ ] **Step 1: Retrieve custom ticket settings**
    Load `slogan`, `marketingQrUrl`, `showTax`, `ticketWidth` from LocalStorage settings.
  - [ ] **Step 2: Inject dynamic ticket properties**
    In `handlePrintReceipt`, structure the ESC/POS layout formatting parameters matching the custom slogan, dynamic columns, and marketing terms.
  - [ ] **Step 3: Dispatch custom payload over WebSocket**
    Forward the parameters to the hardware bridge server for spooling.

---

## Verification Plan

### Automated Tests
* Run: `npm run build` in the workspace to verify there are zero compilation or static validation issues.

### Manual Verification
1. Launch Electron `apps/mobile-bridge` locally.
2. Open settings `/ajustes` in the browser and observe the WebSocket connector logs reporting successful physical printer scans.
3. Save customized logo slogan texts and campaign QR redirects.
4. Execute a sale on `/pos` and verify that printing logs successfully output spooled layouts.
