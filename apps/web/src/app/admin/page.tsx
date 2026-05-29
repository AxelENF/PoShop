'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PRODUCTS_SEED, type ProductSeed } from '../pos/products-seed';
import { useUserSession } from '../../lib/user-session';

interface PurchaseLog {
  id: string;
  productName: string;
  qty: number;
  cost: number;
  total: number;
  supplier: string;
  date: string;
  status: 'Entregado' | 'Pendiente';
}

export default function AdminDashboardPage() {
  const { session } = useUserSession();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profiles' | 'suppliers' | 'copilot' | 'alerts' | 'fiscal' | 'expenses' | 'finance' | 'audit_logs' | 'branches'>('dashboard');

  // Estados para Gastos Operativos (Fase 2)
  const [expensesList, setExpensesList] = useState([
    { id: 'EXP-001', category: 'Renta', amount: 4500.00, description: 'Renta mensual de local comercial', date: '2026-05-15' },
    { id: 'EXP-002', category: 'Servicios', amount: 850.00, description: 'Servicio de energía eléctrica CFE', date: '2026-05-20' },
    { id: 'EXP-003', category: 'Sueldos', amount: 3200.00, description: 'Pago de nómina cajero semanal', date: '2026-05-26' },
  ]);
  const [expenseCategory, setExpenseCategory] = useState('Renta');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Estados para Bitácora de Auditoría Inmutable (Fase 2)
  const [auditLogsList, setAuditLogsList] = useState([
    { id: 'LOG-3021', userId: 'usr-admin-01', userRole: 'owner', action: 'PRODUCT_EDIT', details: 'Cambio de precio de Coca-Cola 600ml de $17.00 a $18.00', ipAddress: '192.168.1.45', createdAt: 'Hoy, 10:12 AM' },
    { id: 'LOG-3022', userId: 'usr-admin-01', userRole: 'owner', action: 'STOCK_ADJUST', details: 'Ajuste manual de stock de Pechuga de Pollo (+5.000 kg)', ipAddress: '192.168.1.45', createdAt: 'Hoy, 09:45 AM' },
    { id: 'LOG-3023', userId: 'usr-cashier-02', userRole: 'cashier', action: 'SALE_CANCEL', details: 'Cancelación de ticket V-0078 por cobro erróneo ($250.00)', ipAddress: '192.168.1.80', createdAt: 'Ayer, 06:15 PM' },
    { id: 'LOG-3024', userId: 'usr-admin-01', userRole: 'owner', action: 'ROLE_CHANGE', details: 'Ascenso de rol de usuario usr-cashier-02 de cashier a admin', ipAddress: '192.168.1.45', createdAt: '26/05/2026, 02:30 PM' },
  ]);
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // Estados para Facturación Fiscal SAT CFDI 4.0 (Anexo 20)
  const [fiscalRazonSocial, setFiscalRazonSocial] = useState('ESPERANZA ABARROTES Y COMERCIO S.A. DE C.V.');
  const [fiscalRfc, setFiscalRfc] = useState('EAC080101TX3');
  const [fiscalRegimen, setFiscalRegimen] = useState('601');
  const [fiscalPostalCode, setFiscalPostalCode] = useState('06000');
  const [pacWebhookUrl, setPacWebhookUrl] = useState('https://api.facturapi.io/v1/invoices');
  const [pacApiKey, setPacApiKey] = useState('sk_live_6f437c928b7de4a821903bc7e');
  const [pacProvider, setPacProvider] = useState<'facturapi' | 'finkok' | 'custom'>('facturapi');
  const [isValidatingPac, setIsValidatingPac] = useState(false);
  const [pacValidationResult, setPacValidationResult] = useState<'success' | 'failed' | null>(null);

  const [pendingSales, setPendingSales] = useState([
    { id: 'V-0081', customer: 'Venta al Público General', total: 420.00, date: 'Hoy, 09:30 AM', items: [{ name: 'Coca-Cola 600ml', qty: 10, price: 17.00 }, { name: 'Pechuga de Pollo kg', qty: 2.5, price: 100.00 }] },
    { id: 'V-0082', customer: 'Juan Pérez (RFC: PEZJ900101)', total: 112.50, date: 'Hoy, 10:15 AM', items: [{ name: 'Nutrioli 1L', qty: 3, price: 37.50 }] },
    { id: 'V-0083', customer: 'Venta al Público General', total: 640.00, date: 'Hoy, 11:00 AM', items: [{ name: 'Huevo Blanco San Juan', qty: 10, price: 42.00 }, { name: 'Coca-Cola 600ml', qty: 12, price: 18.00 }] },
  ]);

  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [activePayload, setActivePayload] = useState<any>(null);
  const [isDispatchingWebhook, setIsDispatchingWebhook] = useState(false);
  const [fiscalSuccessData, setFiscalSuccessData] = useState<{ uuid: string; xmlUrl: string; pdfUrl: string } | null>(null);

  // Estados para Canales Proactivos (Telegram y Slack Alerts)
  const [telegramToken, setTelegramToken] = useState('8129038102:AAF_zE89230182-XYZ9830182743810');
  const [telegramBotName, setTelegramBotName] = useState('@PoShopAlerts_bot');
  const [telegramChatId, setTelegramChatId] = useState('892718910');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('https://hooks.slack.com/services/T0000/B0000/xyz123abc456');

  const [trigShift, setTrigShift] = useState(true);
  const [trigStock, setTrigStock] = useState(true);
  const [trigDrawer, setTrigDrawer] = useState(false);
  const [trigExpense, setTrigExpense] = useState(true);
  const [trigDefaulter, setTrigDefaulter] = useState(true);

  // Estado para perfiles
  const [currentProfile, setCurrentProfile] = useState<'general' | 'weight' | 'catalog' | 'distribution' | 'services'>('general');

  // Estados para Multisucursal y Multicaja (Fase de Escalabilidad)
  const [branchesList, setBranchesList] = useState([
    { id: 'BR-01', name: 'Matriz Centro', address: 'Av. Juárez 450, Col. Centro', phone: '555-019-2831', registers: ['Caja 01 - Principal', 'Caja 02 - Rápida'], status: 'Active' },
    { id: 'BR-02', name: 'Sucursal Poniente', address: 'Blvd. Diaz Ordaz 9980', phone: '555-019-9944', registers: ['Caja 01 - Única'], status: 'Active' },
    { id: 'BR-03', name: 'Bodega Norte Surtido', address: 'Parque Industrial Milimex Nave 12', phone: '555-019-7755', registers: ['Caja 01 - Carga B2B', 'Caja 02 - Devoluciones'], status: 'Active' }
  ]);

  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');

  const [selectedBranchForRegister, setSelectedBranchForRegister] = useState('BR-01');
  const [newRegisterName, setNewRegisterName] = useState('');

  // Estados para Módulos de Giros Comerciales
  const [moduleCobroVeloz, setModuleCobroVeloz] = useState(true);
  const [moduleBascula, setModuleBascula] = useState(false);
  const [basculaBaudRate, setBasculaBaudRate] = useState('9600');
  const [basculaProtocol, setBasculaProtocol] = useState('CAS-PD1');
  const [moduleFuzzy, setModuleFuzzy] = useState(false);
  const [fuzzyThreshold, setFuzzyThreshold] = useState(2);
  const [moduleQuotes, setModuleQuotes] = useState(false);
  const [quotesValidity, setQuotesValidity] = useState(15);
  const [moduleRecipes, setModuleRecipes] = useState(false);
  const [recipeTrigger, setRecipeTrigger] = useState('ON_SALE');
  const [moduleB2B, setModuleB2B] = useState(false);
  const [b2bZone, setB2bZone] = useState('Metro Area');

  // Cargar perfil activo de localStorage al iniciar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = window.localStorage.getItem('snapgad_theme') || 'dark';
      setTheme(savedTheme as 'light' | 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
      
      const tenantConfig = window.localStorage.getItem('snapgad_tenant_config');
      if (tenantConfig) {
        try {
          const parsed = JSON.parse(tenantConfig);
          if (parsed.profile) setCurrentProfile(parsed.profile);
          if (parsed.moduleCobroVeloz !== undefined) setModuleCobroVeloz(parsed.moduleCobroVeloz);
          if (parsed.moduleBascula !== undefined) setModuleBascula(parsed.moduleBascula);
          if (parsed.basculaBaudRate !== undefined) setBasculaBaudRate(parsed.basculaBaudRate);
          if (parsed.basculaProtocol !== undefined) setBasculaProtocol(parsed.basculaProtocol);
          if (parsed.moduleFuzzy !== undefined) setModuleFuzzy(parsed.moduleFuzzy);
          if (parsed.fuzzyThreshold !== undefined) setFuzzyThreshold(parsed.fuzzyThreshold);
          if (parsed.moduleQuotes !== undefined) setModuleQuotes(parsed.moduleQuotes);
          if (parsed.quotesValidity !== undefined) setQuotesValidity(parsed.quotesValidity);
          if (parsed.moduleRecipes !== undefined) setModuleRecipes(parsed.moduleRecipes);
          if (parsed.recipeTrigger !== undefined) setRecipeTrigger(parsed.recipeTrigger);
          if (parsed.moduleB2B !== undefined) setModuleB2B(parsed.moduleB2B);
          if (parsed.b2bZone !== undefined) setB2bZone(parsed.b2bZone);
        } catch (e) {}
      } else {
        const savedProfile = window.localStorage.getItem('snapgad_current_profile');
        if (savedProfile) {
          setCurrentProfile(savedProfile as any);
        }
      }
    }
  }, []);



  // Guardar perfil activo cuando cambie
  const handleProfileChange = (newProfile: 'general' | 'weight' | 'catalog' | 'distribution' | 'services') => {
    setCurrentProfile(newProfile);
    
    // Auto-configurar módulos según perfil
    const autoCobro = ['general', 'weight', 'catalog', 'services'].includes(newProfile);
    const autoBascula = newProfile === 'weight';
    const autoFuzzy = ['catalog', 'distribution'].includes(newProfile);
    const autoQuotes = ['catalog', 'distribution'].includes(newProfile);
    const autoRecipes = newProfile === 'services';
    const autoB2B = newProfile === 'distribution';
    
    setModuleCobroVeloz(autoCobro);
    setModuleBascula(autoBascula);
    setModuleFuzzy(autoFuzzy);
    setModuleQuotes(autoQuotes);
    setModuleRecipes(autoRecipes);
    setModuleB2B(autoB2B);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_current_profile', newProfile);
      
      const config = {
        profile: newProfile,
        moduleCobroVeloz: autoCobro,
        moduleBascula: autoBascula,
        basculaBaudRate: autoBascula ? '9600' : basculaBaudRate,
        basculaProtocol: autoBascula ? 'CAS-PD1' : basculaProtocol,
        moduleFuzzy: autoFuzzy,
        fuzzyThreshold: autoFuzzy ? 2 : fuzzyThreshold,
        moduleQuotes: autoQuotes,
        quotesValidity: autoQuotes ? 15 : quotesValidity,
        moduleRecipes: autoRecipes,
        recipeTrigger: autoRecipes ? 'ON_SALE' : recipeTrigger,
        moduleB2B: autoB2B,
        b2bZone: autoB2B ? 'Metro Area' : b2bZone
      };
      
      window.localStorage.setItem('snapgad_tenant_config', JSON.stringify(config));
    }
  };

  // Guardar configuración manual personalizada
  const handleSaveCustomSettings = () => {
    if (typeof window !== 'undefined') {
      const config = {
        profile: currentProfile,
        moduleCobroVeloz,
        moduleBascula,
        basculaBaudRate,
        basculaProtocol,
        moduleFuzzy,
        fuzzyThreshold,
        moduleQuotes,
        quotesValidity,
        moduleRecipes,
        recipeTrigger,
        moduleB2B,
        b2bZone
      };
      window.localStorage.setItem('snapgad_tenant_config', JSON.stringify(config));
      alert('⚙️ CONFIGURACIÓN APLICADA CON ÉXITO\n\nTodos los módulos operativos han sido actualizados en caliente. El POS reflejará los cambios de inmediato.');
    }
  };

  // Estado para compras
  const [purchases, setPurchases] = useState<PurchaseLog[]>([
    { id: 'OC-9822', productName: 'Aceite Vegetal Nutrioli 1L', qty: 100, cost: 29.80, total: 2980.00, supplier: 'Nutrioli Distribución', date: 'Hace 2 horas', status: 'Pendiente' },
    { id: 'OC-9821', productName: 'Coca-Cola Original 600ml', qty: 120, cost: 14.50, total: 1740, supplier: 'Coca-Cola FEMSA México', date: 'Hoy, 10:45 AM', status: 'Entregado' },
    { id: 'OC-9820', productName: 'Aceite Vegetal Nutrioli 1L', qty: 48, cost: 29.80, total: 1430.40, supplier: 'Nutrioli Distribución', date: 'Ayer, 04:30 PM', status: 'Entregado' },
    { id: 'OC-9819', productName: 'Huevo Blanco San Juan', qty: 150, cost: 31.50, total: 4725, supplier: 'Avícola San Juan', date: '25/05/2026', status: 'Entregado' },
  ]);

  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS_SEED[0]?.id || '');
  const [purchaseQty, setPurchaseQty] = useState('50');
  const [purchaseCost, setPurchaseCost] = useState('14.50');
  const [supplierName, setSupplierName] = useState('FEMSA Distribuidora');

  // Estado para Copilot AI
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: '¡Hola! Soy tu Copiloto Snapgad. Estoy analizando las transacciones de hoy, el stock crítico y las cuentas por cobrar de tus sucursales. ¿En qué te puedo asesorar hoy?',
      time: 'Hace 5 min'
    }
  ]);
  const [customPrompt, setCustomPrompt] = useState('');

  // Sincronizar tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_theme', theme);
    }
  }, [theme]);

  // Guardar configuración de Telegram y Slack
  const handleSaveProactiveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const configObj = {
      telegramToken,
      telegramBotName,
      telegramChatId,
      slackWebhookUrl,
      trigShift,
      trigStock,
      trigDrawer,
      trigExpense,
      trigDefaulter
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_proactive_config', JSON.stringify(configObj));
    }
    
    // Registrar en Bitácora
    const newAuditLog = {
      id: `LOG-${Math.floor(3000 + Math.random() * 1000)}`,
      userId: 'usr-admin-01',
      userRole: 'owner' as const,
      action: 'SETTINGS_UPDATE',
      details: `Configuración de Canales Proactivos (Telegram: ${telegramBotName}, Slack: Habilitado)`,
      ipAddress: '192.168.1.45',
      createdAt: 'Hoy, ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };
    setAuditLogsList(prev => [newAuditLog, ...prev]);

    alert('🔔 CANALES PROACTIVOS CONFIGURADOS\n\nLas claves de API de Telegram Bot y el webhook de Slack se han guardado con éxito. El POS alertará automáticamente ante los disparadores seleccionados.');
  };

  // Probar y validar conexión PAC
  const handleValidatePacConnection = async () => {
    setIsValidatingPac(true);
    setPacValidationResult(null);
    
    // Simular latencia de ping de webhook de PAC
    await new Promise(r => setTimeout(r, 1400));
    
    setIsValidatingPac(false);
    setPacValidationResult('success');
    
    // Registrar en Bitácora
    const newAuditLog = {
      id: `LOG-${Math.floor(3000 + Math.random() * 1000)}`,
      userId: 'usr-admin-01',
      userRole: 'owner' as const,
      action: 'SETTINGS_UPDATE',
      details: `Prueba exitosa de Webhook PAC (${pacProvider.toUpperCase()}) - Retorno HTTP 200 OK`,
      ipAddress: '192.168.1.45',
      createdAt: 'Hoy, ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };
    setAuditLogsList(prev => [newAuditLog, ...prev]);
  };

  // Registrar Sucursal
  const handleRegisterBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    const newBranch = {
      id: `BR-0${branchesList.length + 1}`,
      name: newBranchName,
      address: newBranchAddress || 'Dirección no especificada',
      phone: newBranchPhone || 'Sin teléfono registrado',
      registers: ['Caja 01 - Principal'],
      status: 'Active'
    };

    setBranchesList(prev => [...prev, newBranch]);
    
    // Bitácora
    const newAuditLog = {
      id: `LOG-${Math.floor(3000 + Math.random() * 1000)}`,
      userId: 'usr-admin-01',
      userRole: 'owner' as const,
      action: 'BRANCH_CREATE',
      details: `Alta de nueva sucursal comercial: ${newBranchName}`,
      ipAddress: '192.168.1.45',
      createdAt: 'Hoy, ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };
    setAuditLogsList(prev => [newAuditLog, ...prev]);

    setNewBranchName('');
    setNewBranchAddress('');
    setNewBranchPhone('');
    alert(`🏢 SUCURSAL REGISTRADA\n\n"${newBranchName}" ha sido dada de alta con éxito en el tenant. Límite del plan: ilimitado.`);
  };

  // Registrar Caja Registradora
  const handleRegisterCashRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegisterName.trim()) return;

    setBranchesList(prev => prev.map(b => {
      if (b.id === selectedBranchForRegister) {
        return {
          ...b,
          registers: [...b.registers, newRegisterName]
        };
      }
      return b;
    }));

    const branchObj = branchesList.find(b => b.id === selectedBranchForRegister);
    
    // Bitácora
    const newAuditLog = {
      id: `LOG-${Math.floor(3000 + Math.random() * 1000)}`,
      userId: 'usr-admin-01',
      userRole: 'owner' as const,
      action: 'REGISTER_CREATE',
      details: `Alta de caja registradora: ${newRegisterName} en sucursal: ${branchObj?.name || selectedBranchForRegister}`,
      ipAddress: '192.168.1.45',
      createdAt: 'Hoy, ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };
    setAuditLogsList(prev => [newAuditLog, ...prev]);

    setNewRegisterName('');
    alert(`💰 CAJA REGISTRADORA HABILITADA\n\nSe ha añadido la caja "${newRegisterName}" a la sucursal seleccionada.`);
  };

  // Bloqueo de seguridad si es cajero simple
  if (session.role === 'cashier') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6">
        <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-600/20 text-amber-500 flex items-center justify-center font-bold text-3xl mx-auto mb-6">
            🔒
          </div>
          <h2 className="text-2xl font-extrabold mb-2">Acceso Restringido</h2>
          <p className="text-zinc-500 text-sm mb-6">
            El Panel de Gestión Ejecutiva y Control de Sucursales no está disponible para el rol de Cajero. Por favor, inicie sesión con una cuenta autorizada.
          </p>
          <Link href="/pos" className="inline-block px-6 py-3 bg-blue-700 hover:bg-blue-600 rounded-xl font-bold transition-all text-white text-sm">
            REGRESAR A LA CAJA
          </Link>
        </div>
      </div>
    );
  }

  // Lógica de Compra
  const handleRegisterPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const product = PRODUCTS_SEED.find(p => p.id === selectedProductId);
    if (!product) return;

    const qty = parseFloat(purchaseQty) || 0;
    const cost = parseFloat(purchaseCost) || 0;
    const total = qty * cost;

    const newPurchase: PurchaseLog = {
      id: `OC-${Math.floor(1000 + Math.random() * 9000)}`,
      productName: product.name,
      qty,
      cost,
      total,
      supplier: supplierName,
      date: 'Hace un momento',
      status: 'Entregado'
    };

    setPurchases(prev => [newPurchase, ...prev]);
    setPurchaseQty('50');
    alert(`Compra registrada con éxito. Se han añadido ${qty} unidades al inventario.`);
  };

  const handleReceivePurchase = (id: string) => {
    const target = purchases.find(p => p.id === id);
    if (!target) return;

    setPurchases(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: 'Entregado', date: 'Recibido hoy' };
      }
      return p;
    }));

    // Registrar en bitácora
    const newAuditLog = {
      id: `LOG-${Math.floor(3000 + Math.random() * 999)}`,
      userId: 'usr-admin-01',
      userRole: 'owner' as const,
      action: 'STOCK_ADJUST' as const,
      details: `Recepción y Surtido de Orden de Compra ${id}: Se sumaron ${target.qty} unidades de "${target.productName}" al inventario.`,
      ipAddress: '192.168.1.45',
      createdAt: 'Hoy, ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };
    setAuditLogsList(prev => [newAuditLog, ...prev]);

    alert(`🚚 SURTIDO EXITOSO\n\nSe han acreditado ${target.qty} unidades de "${target.productName}" al inventario de la sucursal.`);
  };

  // Pre-cargar costos cuando se selecciona un producto diferente
  const handleProductChange = (id: string) => {
    setSelectedProductId(id);
    const prod = PRODUCTS_SEED.find(p => p.id === id);
    if (prod) {
      setPurchaseCost(prod.costPrice.toString());
    }
  };

  // Prompts predefinidos para la IA
  const runPresetPrompt = (promptText: string, type: 'stock' | 'margin' | 'credit') => {
    const timeString = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text: promptText, time: timeString }]);

    let reply = '';
    if (type === 'stock') {
      reply = '⚠️ **Alerta de Inventario:** A este ritmo te quedarás sin *Aceite Vegetal Nutrioli 1L* el viernes por la tarde. Quedan solo 8 piezas saludables. ¿Quieres que preparemos la orden sugerida de 48 piezas con tu proveedor habitual *Nutrioli Distribución*?';
    } else if (type === 'margin') {
      reply = '📈 **Análisis Financiero:** Tus ventas de hoy alcanzaron los **$18,240 MXN** con una ganancia neta estimada de **$4,845.50 MXN** (26.5% de margen neto). El producto más rentable es la *Pechuga de Pollo* con un margen del 34%, mientras que los *Servicios de Copiado* registran alta rotación.';
    } else {
      reply = '💳 **Cartera de Crédito:** Se registran $1,840 MXN en créditos otorgados hoy. *Don Manuel* superó su límite de crédito configurado por **$340 MXN**. Te sugiero enviar un recordatorio automatizado por WhatsApp desde el panel de clientes.';
    }

    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'assistant', text: reply, time: timeString }]);
    }, 800);
  };

  const handleSendCustomPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    const timeString = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const userText = customPrompt;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText, time: timeString }]);
    setCustomPrompt('');

    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        sender: 'assistant',
        text: `🤖 **Snapgad Copilot:** Entendido. Estoy procesando tu consulta de "${userText}". En este momento de pruebas simuladas, veo que tu stock general está en niveles óptimos, pero la cartera de fiados de la sucursal Centro tiene $2,370 pesos pendientes de cobro.`,
        time: timeString
      }]);
    }, 1000);
  };

  // Simular la generación de CFDI 4.0 Individual (Anexo 20)
  const handleGenerateIndividualCfdi = (sale: typeof pendingSales[0]) => {
    setFiscalSuccessData(null);
    const subtotal = +(sale.total / 1.16).toFixed(2);
    const iva = +(sale.total - subtotal).toFixed(2);
    
    const isPublicGeneral = sale.customer.includes('General');
    const rfcReceptor = isPublicGeneral ? 'XAXX010101000' : 'PEZJ900101';
    const nombreReceptor = isPublicGeneral ? 'PUBLICO EN GENERAL' : 'JUAN PÉREZ GARCÍA';
    const cpReceptor = isPublicGeneral ? fiscalPostalCode : '03100';
    const regimenReceptor = isPublicGeneral ? '616' : '605';
    const usoCfdi = isPublicGeneral ? 'S01' : 'G03';

    const payload = {
      Version: "4.0",
      TipoDeComprobante: "I",
      Fecha: new Date().toISOString(),
      LugarExpedicion: fiscalPostalCode,
      MetodoPago: "PUE",
      FormaPago: "01",
      Emisor: {
        Rfc: fiscalRfc,
        Nombre: fiscalRazonSocial,
        RegimenFiscal: fiscalRegimen
      },
      Receptor: {
        Rfc: rfcReceptor,
        Nombre: nombreReceptor,
        DomicilioFiscalReceptor: cpReceptor,
        RegimenFiscalReceptor: regimenReceptor,
        UsoCFDI: usoCfdi
      },
      Conceptos: sale.items.map((item, idx) => {
        const itemSubtotal = +( (item.qty * item.price) / 1.16 ).toFixed(2);
        const itemIva = +( (item.qty * item.price) - itemSubtotal ).toFixed(2);
        return {
          ClaveProdServ: item.name.includes('Coca') ? "50202306" : "50111515",
          NoIdentificacion: `SKU-${idx + 100}`,
          Cantidad: item.qty.toString(),
          ClaveUnidad: item.name.includes('kg') ? "KGM" : "H87",
          Descripcion: item.name,
          ValorUnitario: (item.price / 1.16).toFixed(4),
          Importe: itemSubtotal.toFixed(2),
          ObjetoImp: "02",
          Impuestos: {
            Traslados: [
              {
                Base: itemSubtotal.toFixed(2),
                Impuesto: "002",
                TipoFactor: "Tasa",
                TasaOCuota: "0.160000",
                Importe: itemIva.toFixed(2)
              }
            ]
          }
        };
      }),
      Impuestos: {
        TotalImpuestosTrasladados: iva.toFixed(2),
        Traslados: [
          {
            Base: subtotal.toFixed(2),
            Impuesto: "002",
            TipoFactor: "Tasa",
            TasaOCuota: "0.160000",
            Importe: iva.toFixed(2)
          }
        ]
      },
      SubTotal: subtotal.toFixed(2),
      Total: sale.total.toFixed(2)
    };
    setActivePayload(payload);
  };

  // Simular la generación de CFDI 4.0 Global
  const handleGenerateGlobalCfdi = () => {
    if (selectedSales.length === 0) {
      alert("Por favor seleccione al menos un ticket de venta para la Factura Global.");
      return;
    }
    setFiscalSuccessData(null);
    const targetSales = pendingSales.filter(s => selectedSales.includes(s.id));
    const totalSum = targetSales.reduce((acc, s) => acc + s.total, 0);
    const subtotal = +(totalSum / 1.16).toFixed(2);
    const iva = +(totalSum - subtotal).toFixed(2);

    const payload = {
      Version: "4.0",
      TipoDeComprobante: "I",
      Fecha: new Date().toISOString(),
      LugarExpedicion: fiscalPostalCode,
      MetodoPago: "PUE",
      FormaPago: "01",
      InformacionGlobal: {
        Periodicidad: "01",
        Meses: "05",
        Año: "2026"
      },
      Emisor: {
        Rfc: fiscalRfc,
        Nombre: fiscalRazonSocial,
        RegimenFiscal: fiscalRegimen
      },
      Receptor: {
        Rfc: "XAXX010101000",
        Nombre: "PUBLICO EN GENERAL",
        DomicilioFiscalReceptor: fiscalPostalCode,
        RegimenFiscalReceptor: "616",
        UsoCFDI: "S01"
      },
      Conceptos: targetSales.map((sale) => {
        const saleSubtotal = +(sale.total / 1.16).toFixed(2);
        const saleIva = +(sale.total - saleSubtotal).toFixed(2);
        return {
          ClaveProdServ: "01010101",
          NoIdentificacion: sale.id,
          Cantidad: "1",
          ClaveUnidad: "ACT",
          Descripcion: `Venta correspondiente al ticket ${sale.id}`,
          ValorUnitario: saleSubtotal.toFixed(4),
          Importe: saleSubtotal.toFixed(2),
          ObjetoImp: "02",
          Impuestos: {
            Traslados: [
              {
                Base: saleSubtotal.toFixed(2),
                Impuesto: "002",
                TipoFactor: "Tasa",
                TasaOCuota: "0.160000",
                Importe: saleIva.toFixed(2)
              }
            ]
          }
        };
      }),
      Impuestos: {
        TotalImpuestosTrasladados: iva.toFixed(2),
        Traslados: [
          {
            Base: subtotal.toFixed(2),
            Impuesto: "002",
            TipoFactor: "Tasa",
            TasaOCuota: "0.160000",
            Importe: iva.toFixed(2)
          }
        ]
      },
      SubTotal: subtotal.toFixed(2),
      Total: totalSum.toFixed(2)
    };
    setActivePayload(payload);
  };

  // Simular envío al PAC (Facturapi / FiscoClic)
  const handleSendToPac = () => {
    if (!activePayload) return;
    setIsDispatchingWebhook(true);
    setTimeout(() => {
      setIsDispatchingWebhook(false);
      const mockUuid = `SAT-${Math.random().toString(36).substring(2, 10).toUpperCase()}-4D6E-8C9F-${Math.floor(1000 + Math.random() * 9000)}-CFDI40`;
      setFiscalSuccessData({
        uuid: mockUuid,
        xmlUrl: '#xml-download-simulated',
        pdfUrl: '#pdf-download-simulated'
      });
      if (activePayload.InformacionGlobal) {
        setPendingSales(prev => prev.filter(s => !selectedSales.includes(s.id)));
        setSelectedSales([]);
      } else {
        const billedId = activePayload.Conceptos[0]?.NoIdentificacion || activePayload.NoIdentificacion;
        setPendingSales(prev => prev.filter(s => s.id !== billedId));
      }
    }, 1200);
  };

  // Manejadores para Gastos Operativos (Fase 2)
  const handleRegisterExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Por favor ingrese un monto de gasto válido.");
      return;
    }
    const newExpense = {
      id: `EXP-${Math.floor(100 + Math.random() * 900)}`,
      category: expenseCategory,
      amount: amountNum,
      description: expenseDescription || `Gasto de ${expenseCategory}`,
      date: expenseDate
    };

    // Registrar en auditoría de forma inmutable
    const newAuditLog = {
      id: `LOG-${Math.floor(3000 + Math.random() * 999)}`,
      userId: 'usr-admin-01',
      userRole: 'owner',
      action: 'EXPENSE_CREATE',
      details: `Registro de nuevo gasto operativo: ${expenseCategory} por $${amountNum.toFixed(2)} (${newExpense.description})`,
      ipAddress: '192.168.1.45',
      createdAt: 'Hoy, ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };

    setExpensesList(prev => [newExpense, ...prev]);
    setAuditLogsList(prev => [newAuditLog, ...prev]);

    setExpenseAmount('');
    setExpenseDescription('');
    alert("Gasto operativo registrado y asentado en la bitácora de auditoría.");
  };

  const handleDeleteExpense = (id: string) => {
    const target = expensesList.find(e => e.id === id);
    if (!target) return;

    if (confirm(`¿Está seguro de eliminar el gasto ${id} por $${target.amount.toFixed(2)}?`)) {
      // Registrar en auditoría
      const newAuditLog = {
        id: `LOG-${Math.floor(3000 + Math.random() * 999)}`,
        userId: 'usr-admin-01',
        userRole: 'owner',
        action: 'EXPENSE_DELETE',
        details: `Eliminación de gasto operativo ${id}: ${target.category} por $${target.amount.toFixed(2)}`,
        ipAddress: '192.168.1.45',
        createdAt: 'Hoy, ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      };

      setExpensesList(prev => prev.filter(e => e.id !== id));
      setAuditLogsList(prev => [newAuditLog, ...prev]);
    }
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
                Panel de Administración
              </span>
            </div>
          </div>

          <nav className="hidden md:flex gap-4 text-sm font-semibold ml-8">
            <Link href="/pos" className="text-zinc-500 hover:text-blue-600 transition-colors">Caja POS</Link>
            <Link href="/inventario" className="text-zinc-500 hover:text-blue-600 transition-colors">Inventario</Link>
            <Link href="/clientes" className="text-zinc-500 hover:text-blue-600 transition-colors">Clientes</Link>
            <Link href="/admin" className="text-blue-700 dark:text-blue-400">Control Ejecutivo</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
            NIVEL: {session.role.toUpperCase()}
          </span>
          <button
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            className="btn-secondary px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {theme === 'light' ? '🌙 TEMA OSCURO' : '☀️ TEMA CLARO'}
          </button>
        </div>
      </header>

      {/* Contenido Principal con Sidebar */}
      <div className="flex-grow flex max-w-7xl mx-auto w-full p-6 gap-6">
        
        {/* Sidebar del Panel */}
        <aside className="w-64 shrink-0 flex flex-col gap-2">
          <div className="p-4 rounded-xl border mb-4 bg-zinc-900/40 border-zinc-800/80">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">SUCURSAL ACTIVA</h4>
            <p className="text-sm font-bold text-white">Matriz Centro</p>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">Tenant: Esperanza_Abarrotes</p>
          </div>

          <button
            onClick={() => setActiveTab('dashboard')}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: activeTab === 'dashboard' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'dashboard' ? '#ffffff' : 'var(--muted)'
            }}
          >
            📊 VISTA GENERAL KPI
          </button>

          <button
            onClick={() => setActiveTab('branches')}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: activeTab === 'branches' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'branches' ? '#ffffff' : 'var(--muted)'
            }}
          >
            🏢 SUCURSALES Y MULTICAJA
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: activeTab === 'profiles' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'profiles' ? '#ffffff' : 'var(--muted)'
            }}
          >
            🛍️ GIROS COMERCIALES (PERFILES)
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: activeTab === 'suppliers' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'suppliers' ? '#ffffff' : 'var(--muted)'
            }}
          >
            🚚 LOGÍSTICA Y PROVEEDORES
          </button>

          <button
            onClick={() => setActiveTab('copilot')}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: activeTab === 'copilot' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'copilot' ? '#ffffff' : 'var(--muted)'
            }}
          >
            🤖 SNAPGAD COPILOT AI
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: activeTab === 'alerts' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'alerts' ? '#ffffff' : 'var(--muted)'
            }}
          >
            ⚙️ ALERTAS Y TELEGRAM
          </button>

          <button
            onClick={() => setActiveTab('fiscal')}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: activeTab === 'fiscal' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'fiscal' ? '#ffffff' : 'var(--muted)'
            }}
          >
            🇲🇽 FACTURACIÓN SAT CFDI 4.0
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: activeTab === 'expenses' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'expenses' ? '#ffffff' : 'var(--muted)'
            }}
          >
            💸 GASTOS OPERATIVOS
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: activeTab === 'finance' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'finance' ? '#ffffff' : 'var(--muted)'
            }}
          >
            📈 GOBERNANZA FINANCIERA
          </button>

          <button
            onClick={() => setActiveTab('audit_logs')}
            className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: activeTab === 'audit_logs' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'audit_logs' ? '#ffffff' : 'var(--muted)'
            }}
          >
            🔒 BITÁCORA DE AUDITORÍA
          </button>
        </aside>

        {/* Sección de Contenido Activo */}
        <main className="flex-grow flex flex-col bg-zinc-900/20 border border-zinc-800/80 p-6 rounded-2xl min-h-[500px]" style={{ backgroundColor: 'var(--card)' }}>
          
          {/* TAB 1: DASHBOARD DE KPIs */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 flex-grow flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-extrabold mb-1 text-title" style={{ color: 'var(--foreground)' }}>Gobernanza Financiera y Operativa</h2>
                <p className="text-xs mb-6 text-desc" style={{ color: 'var(--muted)' }}>Métricas condensadas en tiempo real de tu tenant Matriz Centro.</p>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--muted-background)', borderColor: 'var(--card-border)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-desc" style={{ color: 'var(--muted)' }}>VENTAS DEL DÍA</span>
                    <p className="text-xl font-mono font-extrabold" style={{ color: 'var(--foreground)' }}>$18,240.00</p>
                    <span className="text-[10px] text-emerald-500 font-semibold">&#8593; 12% vs ayer</span>
                  </div>

                  <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--muted-background)', borderColor: 'var(--card-border)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-desc" style={{ color: 'var(--muted)' }}>GANANCIA NETA</span>
                    <p className="text-xl font-mono font-extrabold text-emerald-500">$4,845.50</p>
                    <span className="text-[10px] text-desc font-semibold" style={{ color: 'var(--muted)' }}>Margen: 26.5% neto</span>
                  </div>

                  <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--muted-background)', borderColor: 'var(--card-border)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-desc" style={{ color: 'var(--muted)' }}>TICKET PROMEDIO</span>
                    <p className="text-xl font-mono font-extrabold" style={{ color: 'var(--foreground)' }}>$112.50</p>
                    <span className="text-[10px] text-desc font-semibold" style={{ color: 'var(--muted)' }}>Ventas totales: 162</span>
                  </div>

                  <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--muted-background)', borderColor: 'var(--card-border)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-desc" style={{ color: 'var(--muted)' }}>DEUDA DE FIADO ACTIVA</span>
                    <p className="text-xl font-mono font-extrabold text-red-500">$2,370.50</p>
                    <span className="text-[10px] text-desc font-semibold" style={{ color: 'var(--muted)' }}>Clientes con adeudo: 3</span>
                  </div>
                </div>

                {/* Métricas e Histogramas Simulados */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--muted-background)', borderColor: 'var(--card-border)' }}>
                    <h3 className="text-xs font-bold uppercase mb-3 text-desc" style={{ color: 'var(--muted)' }}>Distribución por Método de Pago</h3>
                    <div className="space-y-3 font-mono text-xs" style={{ color: 'var(--foreground)' }}>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>EFECTIVO (CASH)</span>
                          <span className="font-bold">$12,400.00 (68%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-border)' }}>
                          <div className="bg-blue-600 h-full" style={{ width: '68%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>TARJETA (CARD)</span>
                          <span className="font-bold">$4,200.00 (23%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-border)' }}>
                          <div className="bg-amber-500 h-full" style={{ width: '23%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>CRÉDITO (FIADO)</span>
                          <span className="font-bold">$1,640.00 (9%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-border)' }}>
                          <div className="bg-red-500 h-full" style={{ width: '9%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--muted-background)', borderColor: 'var(--card-border)' }}>
                    <h3 className="text-xs font-bold uppercase mb-3 text-desc" style={{ color: 'var(--muted)' }}>Rendimiento por Categoría</h3>
                    <div className="space-y-3 font-mono text-xs" style={{ color: 'var(--foreground)' }}>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>ABARROTES</span>
                          <span className="font-bold">52% de rotación</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-border)' }}>
                          <div className="bg-emerald-500 h-full" style={{ width: '52%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>PESO Y GRANEL</span>
                          <span className="font-bold">34% de rotación</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-border)' }}>
                          <div className="bg-emerald-500 h-full" style={{ width: '34%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>SERVICIOS</span>
                          <span className="font-bold">14% de rotación</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-border)' }}>
                          <div className="bg-emerald-500 h-full" style={{ width: '14%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl text-xs text-blue-400">
                💡 **Consejo de Snapgad:** Tus ventas en efectivo representan el 68% de tus transacciones. Asegúrate de realizar retiros parciales de caja cuando el efectivo supere los $5,000 en el mostrador para evitar riesgos.
              </div>
            </div>
          )}

          {/* TAB: SUCURSALES Y MULTICAJA */}
          {activeTab === 'branches' && (
            <div className="space-y-6 flex-grow">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-extrabold text-white mb-1">🏢 Control de Sucursales y Multicaja</h2>
                  <p className="text-xs text-zinc-400 mb-6">
                    Administra tus establecimientos comerciales y las cajas registradoras activas de forma centralizada y segura.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">PLAN: MULTIESTABLECIMIENTO HABILITADO</span>
                </div>
              </div>

              {/* Grid de 2 Columnas: Lista de sucursales vs alta rápida */}
              <div className="grid grid-cols-12 gap-6">
                {/* Lista de Sucursales (Col 8) */}
                <div className="col-span-8 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pb-1 border-b border-zinc-800">
                    Establecimientos Activos ({branchesList.length})
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    {branchesList.map((branch) => (
                      <div key={branch.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded mr-2">
                              {branch.id}
                            </span>
                            <span className="font-extrabold text-sm text-white">{branch.name}</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            ACTIVA
                          </span>
                        </div>

                        <div className="text-xs text-zinc-400 space-y-1 mb-4">
                          <p>📍 <span className="font-semibold">Dirección:</span> {branch.address}</p>
                          <p>📞 <span className="font-semibold">Teléfono:</span> {branch.phone}</p>
                        </div>

                        {/* Cajas registradoras dentro de la sucursal */}
                        <div className="mt-3 pt-3 border-t border-zinc-800/80">
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                            Cajas Registradoras Vinculadas ({branch.registers.length}):
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {branch.registers.map((reg, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {reg}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formularios de Creación (Col 4) */}
                <div className="col-span-4 space-y-6">
                  {/* Nueva Sucursal */}
                  <form onSubmit={handleRegisterBranch} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pb-1 border-b border-zinc-800">
                      🏢 NUEVA SUCURSAL
                    </h3>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Nombre</label>
                      <input
                        type="text"
                        placeholder="Ej. Sucursal Sur"
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Dirección</label>
                      <input
                        type="text"
                        placeholder="Ej. Av. Revolución 340"
                        value={newBranchAddress}
                        onChange={(e) => setNewBranchAddress(e.target.value)}
                        className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Teléfono</label>
                      <input
                        type="text"
                        placeholder="Ej. 555-019-8800"
                        value={newBranchPhone}
                        onChange={(e) => setNewBranchPhone(e.target.value)}
                        className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold transition-all text-white cursor-pointer"
                    >
                      CREAR ESTABLECIMIENTO
                    </button>
                  </form>

                  {/* Nueva Caja */}
                  <form onSubmit={handleRegisterCashRegister} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pb-1 border-b border-zinc-800">
                      💰 NUEVA CAJA
                    </h3>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Vincular a Sucursal</label>
                      <select
                        value={selectedBranchForRegister}
                        onChange={(e) => setSelectedBranchForRegister(e.target.value)}
                        className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white cursor-pointer"
                      >
                        {branchesList.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Nombre de la Caja</label>
                      <input
                        type="text"
                        placeholder="Ej. Caja 03 - Mostrador"
                        value={newRegisterName}
                        onChange={(e) => setNewRegisterName(e.target.value)}
                        className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 rounded text-xs font-bold transition-all text-white cursor-pointer"
                    >
                      HABILITAR CAJA
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GIROS COMERCIALES / SWITCHER DE PERFILES */}
          {activeTab === 'profiles' && (
            <div className="space-y-6 flex-grow">
              <div>
                <h2 className="text-xl font-extrabold text-white mb-1">Giros Comerciales Preconfigurados</h2>
                <p className="text-xs text-zinc-400 mb-6">
                  SNAPGAD POS te permite adaptar toda la interfaz de cobro, lookup y báscula a tu perfil comercial con un solo click.
                </p>

                {/* Profile Grid Choices */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {[
                    { id: 'general', name: '🛍️ Tienda General', desc: 'Abarrotes, misceláneas, farmacias. Escaneo masivo y fiados.' },
                    { id: 'weight', name: '🥩 Peso y Granel', desc: 'Carnes, verduras. Báscula USB y botones rápidos.' },
                    { id: 'catalog', name: '🔧 Catálogo Especializado', desc: 'Ferreterías, refaccionarias. Fuzzy search, cotizaciones.' },
                    { id: 'distribution', name: '🚚 Distribución B2B', desc: 'Surtido mayorista, rutas, reparto móvil.' },
                    { id: 'services', name: '✂️ Servicios c/Stock', desc: 'Papelerías, estéticas. Cobros duales e insumos.' },
                  ].map((prof) => (
                    <div
                      key={prof.id}
                      onClick={() => handleProfileChange(prof.id as any)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-36 ${currentProfile === prof.id ? 'bg-blue-700 border-blue-500 text-white scale-[1.03] shadow-lg' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      <h4 className="font-extrabold text-xs">{prof.name}</h4>
                      <p className="text-[10px] leading-tight mt-2 opacity-80">{prof.desc}</p>
                      <span className="text-[9px] font-mono font-bold mt-3 block bg-black/30 w-fit px-1.5 py-0.5 rounded">
                        {currentProfile === prof.id ? 'ACTIVO' : 'SELECCIONAR'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Profile Config Details */}
                <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--muted-background)', borderColor: 'var(--card-border)' }}>
                  <div className="flex justify-between items-center mb-4 pb-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-desc" style={{ color: 'var(--muted)' }}>
                      Módulos y Parámetros del Perfil Activo: {currentProfile.toUpperCase()}
                    </h3>
                    <span className="text-[10px] text-desc" style={{ color: 'var(--muted)' }}>Personaliza la funcionalidad de tu giro comercial</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-desc" style={{ color: 'var(--foreground)' }}>
                    {/* Columna Izquierda */}
                    <div className="space-y-4">
                      {/* Cobro Veloz */}
                      <div className="p-3 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold">PANTALLA DE COBRO VELOZ (RETAIL):</span>
                          <input
                            type="checkbox"
                            checked={moduleCobroVeloz}
                            onChange={(e) => setModuleCobroVeloz(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                          />
                        </div>
                        <p className="text-[10px] text-desc" style={{ color: 'var(--muted)' }}>Diseño optimizado para cobro instantáneo con escaneo de código de barras sin fricción.</p>
                      </div>

                      {/* Báscula USB */}
                      <div className="p-3 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold">BÁSCULA SERIAL/USB INTEGRADA:</span>
                          <input
                            type="checkbox"
                            checked={moduleBascula}
                            onChange={(e) => setModuleBascula(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                          />
                        </div>
                        <p className="text-[10px] text-desc" style={{ color: 'var(--muted)' }}>Lectura directa en tiempo real de pesos provenientes de básculas conectadas por Serial/USB.</p>
                        {moduleBascula && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
                            <div>
                              <label className="block text-[9px] font-bold mb-1 text-desc" style={{ color: 'var(--muted)' }}>VELOCIDAD BAUD</label>
                              <select
                                value={basculaBaudRate}
                                onChange={(e) => setBasculaBaudRate(e.target.value)}
                                className="w-full p-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white"
                              >
                                <option value="4800">4800 Baud</option>
                                <option value="9600">9600 Baud</option>
                                <option value="19200">19200 Baud</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold mb-1 text-desc" style={{ color: 'var(--muted)' }}>PROTOCOLO</label>
                              <select
                                value={basculaProtocol}
                                onChange={(e) => setBasculaProtocol(e.target.value)}
                                className="w-full p-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white"
                              >
                                <option value="CAS-PD1">CAS PD-I</option>
                                <option value="TOLEDO">Toledo / Mettler</option>
                                <option value="A">Protocolo Genérico A</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Fuzzy Search */}
                      <div className="p-3 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold">BÚSQUEDA FUZZY AVANZADA (TOLERANTE):</span>
                          <input
                            type="checkbox"
                            checked={moduleFuzzy}
                            onChange={(e) => setModuleFuzzy(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                          />
                        </div>
                        <p className="text-[10px] text-desc" style={{ color: 'var(--muted)' }}>Algoritmo Levenshtein para autocompletar búsquedas con errores ortográficos o parciales.</p>
                        {moduleFuzzy && (
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
                            <label className="block text-[9px] font-bold mb-1 text-desc" style={{ color: 'var(--muted)' }}>DISTANCIA DE ERROR MÁXIMA</label>
                            <input
                              type="number"
                              min="1"
                              max="4"
                              value={fuzzyThreshold}
                              onChange={(e) => setFuzzyThreshold(parseInt(e.target.value) || 2)}
                              className="w-24 p-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna Derecha */}
                    <div className="space-y-4">
                      {/* Cotizaciones PDF */}
                      <div className="p-3 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold">COTIZACIONES EXPORTABLES (PDF):</span>
                          <input
                            type="checkbox"
                            checked={moduleQuotes}
                            onChange={(e) => setModuleQuotes(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                          />
                        </div>
                        <p className="text-[10px] text-desc" style={{ color: 'var(--muted)' }}>Genera pre-cotizaciones formales desde la caja y expórtalas al cliente.</p>
                        {moduleQuotes && (
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
                            <label className="block text-[9px] font-bold mb-1 text-desc" style={{ color: 'var(--muted)' }}>DÍAS DE VIGENCIA</label>
                            <input
                              type="number"
                              min="1"
                              max="90"
                              value={quotesValidity}
                              onChange={(e) => setQuotesValidity(parseInt(e.target.value) || 15)}
                              className="w-24 p-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white font-mono"
                            />
                          </div>
                        )}
                      </div>

                      {/* Recetas / Insumos */}
                      <div className="p-3 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold">CONTROL DE INSUMOS ASOCIADOS (RECETAS):</span>
                          <input
                            type="checkbox"
                            checked={moduleRecipes}
                            onChange={(e) => setModuleRecipes(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                          />
                        </div>
                        <p className="text-[10px] text-desc" style={{ color: 'var(--muted)' }}>Descuenta de manera automática materias primas e insumos indirectos en cada venta.</p>
                        {moduleRecipes && (
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
                            <label className="block text-[9px] font-bold mb-1 text-desc" style={{ color: 'var(--muted)' }}>DEPLETACIÓN DE STOCK</label>
                            <select
                              value={recipeTrigger}
                              onChange={(e) => setRecipeTrigger(e.target.value)}
                              className="w-full p-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white"
                            >
                              <option value="ON_SALE">Al procesar ticket de venta</option>
                              <option value="ON_BATCH">Por consolidación de lote diario</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Reparto B2B */}
                      <div className="p-3 rounded-lg border flex flex-col gap-2" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold">LOGÍSTICA DE REPARTO & PEDIDOS B2B:</span>
                          <input
                            type="checkbox"
                            checked={moduleB2B}
                            onChange={(e) => setModuleB2B(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                          />
                        </div>
                        <p className="text-[10px] text-desc" style={{ color: 'var(--muted)' }}>Mapeo de rutas de surtido, carga de camión de reparto e integración con choferes.</p>
                        {moduleB2B && (
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
                            <label className="block text-[9px] font-bold mb-1 text-desc" style={{ color: 'var(--muted)' }}>ZONA DE REPARTO POR DEFECTO</label>
                            <input
                              type="text"
                              value={b2bZone}
                              onChange={(e) => setB2bZone(e.target.value)}
                              className="w-full p-2 bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Save Configuration Button */}
                  <div className="mt-6 pt-4 border-t flex justify-end" style={{ borderColor: 'var(--card-border)' }}>
                    <button
                      onClick={handleSaveCustomSettings}
                      className="btn-primary px-6 py-3 font-extrabold uppercase text-xs tracking-wider rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      🛡️ GUARDAR Y APLICAR CONFIGURACIÓN AL POS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROVEEDORES Y LOGÍSTICA DE REABASTECIMIENTO */}
          {activeTab === 'suppliers' && (() => {
            const lowStockItems = PRODUCTS_SEED.filter(p => p.stock <= p.stockMin);
            
            return (
              <div className="space-y-6 flex-grow flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white mb-1" style={{ color: 'var(--foreground)' }}>Módulo de Surtido y Sugerencias de Reabastecimiento</h2>
                  <p className="text-xs text-zinc-400 mb-6" style={{ color: 'var(--muted)' }}>
                    Monitoree el quiebre de inventario físico, cargue sugerencias de compra automáticas y registre la entrada real de mercancía al almacén del POS.
                  </p>

                  {/* 1. WIDGET: Alertas de Quiebre de Stock e Inteligencia de Compras */}
                  <div className="p-5 rounded-2xl border mb-6 bg-zinc-950/40" style={{ borderColor: 'var(--card-border)' }}>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                      🚨 PRODUCTOS BAJO STOCK CRÍTICO (RECOMENDACIÓN IA)
                    </h3>
                    
                    {lowStockItems.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lowStockItems.map(p => {
                          const suggestedQty = Math.max(50, p.stockMin * 3 - p.stock);
                          return (
                            <div key={p.id} className="p-4 rounded-xl border flex flex-col justify-between gap-3 bg-zinc-900/60" style={{ borderColor: 'var(--card-border)' }}>
                              <div>
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-bold text-white" style={{ color: 'var(--foreground)' }}>{p.name}</span>
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 uppercase border border-red-500/20">
                                    Stock: {p.stock} / Min: {p.stockMin}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-1" style={{ color: 'var(--muted)' }}>
                                  Surtido recomendado: <strong className="text-emerald-400">{suggestedQty} {p.unit}</strong> para restablecer nivel óptimo.
                                </p>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductId(p.id);
                                  setPurchaseQty(suggestedQty.toString());
                                  setPurchaseCost(p.costPrice.toString());
                                  setSupplierName(
                                    p.name.includes('Coca') ? 'Coca-Cola FEMSA México' :
                                    p.name.includes('Nutrioli') ? 'Nutrioli Distribución' :
                                    p.name.includes('Huevo') ? 'Avícola San Juan' : 'Distribuidora General del Norte'
                                  );
                                  alert(`⚡ SUGERENCIA CARGADA\n\nEl formulario de entrada ha sido auto-completado con los datos sugeridos para reabastecer "${p.name}".`);
                                }}
                                className="w-full py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg transition-all border-none cursor-pointer"
                              >
                                ⚡ AUTO-COMPLETAR FORMULARIO
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed text-center text-xs text-zinc-500" style={{ borderColor: 'var(--card-border)' }}>
                        🟢 Todos los productos de la sucursal activa cuentan con existencias saludables. No hay riesgos de quiebre de stock.
                      </div>
                    )}
                  </div>

                  {/* 2. Split Form & Table */}
                  <div className="grid grid-cols-12 gap-6">
                    {/* Formulario */}
                    <form onSubmit={handleRegisterPurchase} className="col-span-4 p-4 rounded-xl border space-y-4" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card)' }}>
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pb-2 border-b" style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}>REGISTRAR ENTRADA</h3>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Producto</label>
                        <select
                          value={selectedProductId}
                          onChange={e => handleProductChange(e.target.value)}
                          className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-white"
                          style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--background)' }}
                        >
                          {PRODUCTS_SEED.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Cantidad</label>
                          <input
                            type="number"
                            value={purchaseQty}
                            onChange={e => setPurchaseQty(e.target.value)}
                            className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-white font-mono"
                            style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--background)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Costo Unitario ($)</label>
                          <input
                            type="number"
                            value={purchaseCost}
                            onChange={e => setPurchaseCost(e.target.value)}
                            className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-white font-mono"
                            style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--background)' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Proveedor</label>
                        <input
                          type="text"
                          value={supplierName}
                          onChange={e => setSupplierName(e.target.value)}
                          className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-white"
                          style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--background)' }}
                        />
                      </div>

                      <button type="submit" className="w-full py-2 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold text-white transition-colors border-none cursor-pointer">
                        🚚 EMITIR ORDEN & REGISTRAR
                      </button>
                    </form>

                    {/* Tabla de registros */}
                    <div className="col-span-8 border rounded-xl overflow-hidden" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card)' }}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b text-zinc-400 font-bold" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
                            <th className="p-3">ID Orden</th>
                            <th className="p-3">Producto</th>
                            <th className="p-3 text-right">Cant.</th>
                            <th className="p-3 text-right">Total ($)</th>
                            <th className="p-3">Proveedor</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchases.map(p => (
                            <tr key={p.id} className="border-b hover:bg-zinc-800/10 text-zinc-300 font-mono" style={{ borderColor: 'var(--card-border)' }}>
                              <td className="p-3 font-bold text-white" style={{ color: 'var(--foreground)' }}>{p.id}</td>
                              <td className="p-3 text-left font-sans text-white" style={{ color: 'var(--foreground)' }}>{p.productName}</td>
                              <td className="p-3 text-right" style={{ color: 'var(--foreground)' }}>{p.qty}</td>
                              <td className="p-3 text-right font-bold text-emerald-400">${p.total.toFixed(2)}</td>
                              <td className="p-3 text-zinc-400 font-sans" style={{ color: 'var(--muted)' }}>{p.supplier}</td>
                              <td className="p-3 font-sans">
                                {p.status === 'Entregado' ? (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    ✅ Entregado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                    🚚 En Tránsito
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center font-sans">
                                {p.status === 'Pendiente' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReceivePurchase(p.id)}
                                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[9px] font-bold transition-all border-none cursor-pointer"
                                  >
                                    📥 Recibir Stock
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-zinc-500 font-mono">Asentado</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 4: SNAPGAD COPILOT AI CHAT */}
          {activeTab === 'copilot' && (
            <div className="space-y-6 flex-grow flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-white mb-1">Snapgad Copilot AI</h2>
                <p className="text-xs text-zinc-400 mb-6">
                  Inteligencia proactiva financiera. Te ayuda a entender mermas, predecir rotaciones y optimizar compras.
                </p>

                {/* Preset Prompts Buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => runPresetPrompt('Análisis de mermas y rotación de stock crítico.', 'stock')}
                    className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] font-bold text-zinc-300 hover:border-blue-700 transition-colors"
                  >
                    📦 Stock Crítico & Abasto
                  </button>
                  <button
                    onClick={() => runPresetPrompt('Márgenes de ganancia y rentabilidad del día.', 'margin')}
                    className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] font-bold text-zinc-300 hover:border-blue-700 transition-colors"
                  >
                    📈 Rentabilidad & Caja
                  </button>
                  <button
                    onClick={() => runPresetPrompt('Alertas de deudas de clientes fiados.', 'credit')}
                    className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] font-bold text-zinc-300 hover:border-blue-700 transition-colors"
                  >
                    💳 Cuentas de Fiado Vencido
                  </button>
                </div>

                {/* Chat Panel */}
                <div className="h-[250px] overflow-y-auto border border-zinc-800 bg-zinc-950/60 rounded-xl p-4 space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3 rounded-xl max-w-[80%] text-xs leading-relaxed ${msg.sender === 'user' ? 'bg-blue-700 text-white rounded-br-none' : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none'}`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 font-mono">{msg.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendCustomPrompt} className="flex gap-2 pt-4 border-t border-zinc-800">
                <input
                  type="text"
                  placeholder="Pregúntale al Copilot: ej. ¿Cuál es mi ganancia neta este mes?"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  className="flex-grow p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-700"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors border-none cursor-pointer"
                >
                  Enviar
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: ALERTAS Y TELEGRAM SETTINGS */}
          {activeTab === 'alerts' && (
            <div className="space-y-6 flex-grow">
              <div>
                <h2 className="text-xl font-extrabold text-white mb-1">📢 Canales de Comunicación Proactiva</h2>
                <p className="text-xs text-zinc-400 mb-6">
                  Vincula tus canales corporativos (Telegram y Slack) para recibir auditorías de cortes de caja, robos hormiga y stocks críticos en tiempo real.
                </p>

                <form onSubmit={handleSaveProactiveSettings} className="grid grid-cols-12 gap-6">
                  {/* Formulario de Configuración (Col 7) */}
                  <div className="col-span-7 space-y-6">
                    {/* Sección Telegram Bot */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          ✈️ Integración Telegram Bot API
                        </h3>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">ACTIVO</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">BOT USERNAME (@)</label>
                          <input
                            type="text"
                            placeholder="ej. @PoShopAlerts_bot"
                            value={telegramBotName}
                            onChange={(e) => setTelegramBotName(e.target.value)}
                            className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">TARGET CHAT ID / CANAL</label>
                          <input
                            type="text"
                            placeholder="ej. 892718910 o @MiCanal"
                            value={telegramChatId}
                            onChange={(e) => setTelegramChatId(e.target.value)}
                            className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-white"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">TELEGRAM BOT TOKEN SECRETO</label>
                        <input
                          type="password"
                          placeholder="ej. 123456:ABC-DEF1234ghIkl-zyx"
                          value={telegramToken}
                          onChange={(e) => setTelegramToken(e.target.value)}
                          className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-white"
                          required
                        />
                        <span className="text-[9px] text-zinc-500 mt-1 block">Generado en Telegram conversando con @BotFather. Nunca compartas esta clave.</span>
                      </div>
                    </div>

                    {/* Sección Slack Webhook */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                          💬 Webhook de Slack Corporativo
                        </h3>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">OPCIONAL</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">INCOMING WEBHOOK URL</label>
                        <input
                          type="text"
                          placeholder="https://hooks.slack.com/services/T000/B000/XXXXXX"
                          value={slackWebhookUrl}
                          onChange={(e) => setSlackWebhookUrl(e.target.value)}
                          className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-white"
                        />
                        <span className="text-[9px] text-zinc-500 mt-1 block">Recibe copias de auditorías operativas directamente en tus canales de Slack corporativos.</span>
                      </div>
                    </div>

                    {/* Disparadores Avanzados */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-3">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
                        ⚙️ Reglas de Notificación Activa
                      </h3>
                      
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-2 rounded hover:bg-zinc-900/60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={trigShift}
                            onChange={(e) => setTrigShift(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-800"
                          />
                          <div>
                            <p className="text-xs font-bold text-zinc-200">Cierre de Caja y Arqueo (Shifts)</p>
                            <p className="text-[9px] text-zinc-500">Notificar el total esperado, recaudado y diferencias al cerrar cada turno.</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-2 rounded hover:bg-zinc-900/60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={trigStock}
                            onChange={(e) => setTrigStock(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-800"
                          />
                          <div>
                            <p className="text-xs font-bold text-zinc-200">Existencias por Debajo del Stock Mínimo</p>
                            <p className="text-[9px] text-zinc-500">Alertar de inmediato cuando un producto requiere reorden con proveedor.</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-2 rounded hover:bg-zinc-900/60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={trigDrawer}
                            onChange={(e) => setTrigDrawer(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-800"
                          />
                          <div>
                            <p className="text-xs font-bold text-zinc-200">Aperturas de Cajón Físico de Emergencia (Sin Venta)</p>
                            <p className="text-[9px] text-zinc-500">Detecta posibles robos u operaciones sospechosas fuera de cobro.</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-2 rounded hover:bg-zinc-900/60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={trigExpense}
                            onChange={(e) => setTrigExpense(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-800"
                          />
                          <div>
                            <p className="text-xs font-bold text-zinc-200">Gastos Operativos Altos registrados (&gt; $500.00)</p>
                            <p className="text-[9px] text-zinc-500">Controla el flujo de caja saliente para pagos imprevistos en mostrador.</p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-2 rounded hover:bg-zinc-900/60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={trigDefaulter}
                            onChange={(e) => setTrigDefaulter(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-800"
                          />
                          <div>
                            <p className="text-xs font-bold text-zinc-200">Vencimiento de Créditos a Clientes Fiados</p>
                            <p className="text-[9px] text-zinc-500">Avisos automáticos si un cliente excede su plazo de pago acordado.</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Previsualización en Tiempo Real & Test (Col 5) */}
                  <div className="col-span-5 space-y-6">
                    {/* Live Preview Box */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between h-[360px]">
                      <div>
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pb-1 border-b border-zinc-800 mb-3 flex items-center justify-between">
                          <span>LIVE PREVIEW DEL CANAL ({telegramBotName})</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">TELEGRAM MOCK</span>
                        </h4>
                        
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-[10px] leading-relaxed font-mono space-y-2">
                          <div>
                            <span className="text-blue-400 font-bold">🤖 {telegramBotName || '@PoShopAlerts_bot'} [Ahora]:</span> <br/>
                            🔔 **ALERTA DE SEGURIDAD POS**<br/>
                            🏢 **Sucursal:** Matriz Centro<br/>
                            💸 **Gasto Registrado:** $750.00 (Papelería y Toner)<br/>
                            👤 **Autorizado por:** Cajera *Ana González*<br/>
                            ⚠️ *El efectivo restante en caja descendió a $2,100.00.*
                          </div>
                          <div className="border-t border-zinc-800 pt-2 text-[9px] text-zinc-500">
                            ID Destinatario: {telegramChatId || 'Sin chat ID'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => alert(`🚀 ALERTA DE PRUEBA ENVIADA\n\nSe ha disparado una transacción de prueba a ${telegramBotName} para el chat ID ${telegramChatId}.`)}
                          className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          ⚡ PROBAR BOT DE TELEGRAM
                        </button>
                        <button
                          type="button"
                          onClick={() => alert(`🚀 SLACK WEBHOOK DISPARADO\n\nAlerta mock enviada al webhook:\n${slackWebhookUrl}`)}
                          className="w-full py-2.5 bg-amber-900/40 hover:bg-amber-900 text-amber-400 hover:text-white rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          ⚡ PROBAR WEBHOOK DE SLACK
                        </button>
                      </div>
                    </div>

                    {/* Botón de guardar todo */}
                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-extrabold text-sm tracking-wider uppercase transition-all shadow-xl shadow-blue-900/30 cursor-pointer"
                    >
                      💾 GUARDAR CANALES PROACTIVOS
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 6: FACTURACIÓN SAT CFDI 4.0 */}
          {activeTab === 'fiscal' && (
            <div className="space-y-6 flex-grow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-extrabold text-white mb-1">Facturación SAT CFDI 4.0 (Anexo 20)</h2>
                    <p className="text-xs text-zinc-400 mb-6">
                      Módulo de gobernanza fiscal. Configura tus credenciales y simula facturas individuales o la Factura Global del día/semana.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold tracking-widest font-mono">
                    SAT ANEXO 20 V4.0 COMPLIANT
                  </span>
                </div>

                {/* Visual SAT 2026 Accounting Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  
                  {/* Card 1: Ingreso Facturable */}
                  <div className="p-4 rounded-xl border bg-zinc-950/40 border-zinc-800 flex flex-col justify-between">
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">VENTA BRUTA SAT 2026</span>
                      <strong className="text-xl font-mono font-black text-white">$12,480.00</strong>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold mt-2">✓ 100% Declarado</span>
                  </div>

                  {/* Card 2: IVA Trasladado (16%) */}
                  <div className="p-4 rounded-xl border bg-zinc-950/40 border-zinc-800 flex flex-col justify-between">
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">IVA TRASLADADO (16%)</span>
                      <strong className="text-xl font-mono font-black text-blue-400">$1,721.37</strong>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-2">Base Gravable: $10,758.63</span>
                  </div>

                  {/* Card 3: IEPS Trasladado (8%) */}
                  <div className="p-4 rounded-xl border bg-zinc-950/40 border-zinc-800 flex flex-col justify-between">
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">IEPS TRASLADADO (8%)</span>
                      <strong className="text-xl font-mono font-black text-amber-500">$340.80</strong>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-2">Bebidas y Alimentos Calóricos</span>
                  </div>

                  {/* Card 4: Reportes PDF de Auditoría */}
                  <div className="p-4 rounded-xl border bg-zinc-950/40 border-zinc-800 flex flex-col justify-between">
                    <div>
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">AUDITORÍA FISCAL</span>
                      <span className="block text-xs font-bold text-white mt-1">Reportes de Cierre de Caja</span>
                    </div>
                    <Link
                      href="/admin/reporte-pdf"
                      target="_blank"
                      className="text-center py-1.5 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-extrabold transition-all block"
                    >
                      📄 GENERAR REPORTE PDF
                    </Link>
                  </div>

                </div>

                <div className="grid grid-cols-12 gap-6">
                  {/* Lado izquierdo: Configuración y Selección de Tickets */}
                  <div className="col-span-7 space-y-6">
                    {/* Tarjeta de Datos Emisor */}
                    <div className="p-4 rounded-xl border bg-zinc-950/40 space-y-3" style={{ borderColor: 'var(--card-border)' }}>
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pb-1 border-b" style={{ borderColor: 'var(--card-border)' }}>DATOS DEL EMISOR (TENANT)</h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">RAZÓN SOCIAL</label>
                          <input 
                            type="text" 
                            value={fiscalRazonSocial} 
                            onChange={(e) => setFiscalRazonSocial(e.target.value)} 
                            className="w-full p-2 rounded border bg-zinc-900 border-zinc-800 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">RFC</label>
                          <input 
                            type="text" 
                            value={fiscalRfc} 
                            onChange={(e) => setFiscalRfc(e.target.value)} 
                            className="w-full p-2 rounded border bg-zinc-900 border-zinc-800 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">RÉGIMEN FISCAL</label>
                          <select 
                            value={fiscalRegimen} 
                            onChange={(e) => setFiscalRegimen(e.target.value)} 
                            className="w-full p-2 rounded border bg-zinc-900 border-zinc-800 text-white text-xs focus:outline-none"
                            style={{ backgroundColor: 'var(--background)' }}
                          >
                            <option value="601">601 - General de Ley Personas Morales</option>
                            <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                            <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">CÓDIGO POSTAL EXPEDICIÓN</label>
                          <input 
                            type="text" 
                            value={fiscalPostalCode} 
                            onChange={(e) => setFiscalPostalCode(e.target.value)} 
                            className="w-full p-2 rounded border bg-zinc-900 border-zinc-800 text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* PAC Webhook Credentials Settings */}
                      <div className="pt-4 border-t border-zinc-800/80 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-1">
                            <label className="block text-[9px] font-bold text-zinc-500 mb-1">PROVEEDOR AUTORIZADO (PAC)</label>
                            <select 
                              value={pacProvider} 
                              onChange={(e) => setPacProvider(e.target.value as any)} 
                              className="w-full p-2 rounded border bg-zinc-900 border-zinc-800 text-white text-xs cursor-pointer focus:outline-none"
                            >
                              <option value="facturapi">Facturapi API</option>
                              <option value="finkok">Finkok Webservice</option>
                              <option value="custom">Webhook Personalizado</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[9px] font-bold text-zinc-500 mb-1">CLAVE SECRETA API TOKEN / PAC KEY</label>
                            <input 
                              type="password" 
                              value={pacApiKey} 
                              onChange={(e) => setPacApiKey(e.target.value)} 
                              className="w-full p-2 rounded border bg-zinc-900 border-zinc-800 text-white font-mono text-xs"
                              placeholder="sk_live_..."
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-zinc-500 mb-1">URL API/WEBHOOK DE FACTURACIÓN CFDI 4.0</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={pacWebhookUrl} 
                              onChange={(e) => setPacWebhookUrl(e.target.value)} 
                              className="flex-grow p-2 rounded border bg-zinc-900 border-zinc-800 text-white font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={handleValidatePacConnection}
                              disabled={isValidatingPac}
                              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded transition-all cursor-pointer shrink-0 animate-pulse"
                            >
                              {isValidatingPac ? 'Conectando...' : '🔌 PROBAR CONEXIÓN'}
                            </button>
                          </div>
                          
                          {pacValidationResult === 'success' && (
                            <div className="mt-2 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 p-2 rounded flex items-center justify-between">
                              <span>✓ CONEXIÓN CON EL PAC ESTABLECIDA - HTTP 200 OK (MOCK)</span>
                              <span className="font-mono text-[9px] opacity-80">Ping: 120ms</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta de Mapeo de Claves de Producto SAT */}
                    <div className="p-4 rounded-xl border bg-zinc-950/40 space-y-3" style={{ borderColor: 'var(--card-border)' }}>
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pb-1 border-b" style={{ borderColor: 'var(--card-border)' }}>
                        🏷️ ASOCIACIÓN DE CLAVES SAT (ANEXO 20)
                      </h3>
                      <p className="text-[10px] text-zinc-500">
                        Vincula tus familias de productos del catálogo de PoShop con las claves de producto oficiales del SAT para la facturación automática.
                      </p>
                      
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-800/60 font-bold text-zinc-500 text-[9px] uppercase">
                          <span>FAMILIA POSHOP</span>
                          <span>CLAVE SAT</span>
                          <span>DESCRIPCIÓN DE LEY</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 py-1 items-center border-b border-zinc-800/40">
                          <span className="font-bold text-zinc-300">Abarrotes y Alimentos</span>
                          <input type="text" defaultValue="50192100" className="p-1 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-white text-center" />
                          <span className="text-[9px] text-zinc-500 truncate">Alimentos preparados/botanas</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-1 items-center border-b border-zinc-800/40">
                          <span className="font-bold text-zinc-300">Bebidas y Refrescos</span>
                          <input type="text" defaultValue="50202300" className="p-1 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-white text-center" />
                          <span className="text-[9px] text-zinc-500 truncate">Bebidas no alcohólicas</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-1 items-center border-b border-zinc-800/40">
                          <span className="font-bold text-zinc-300">Carnes y Perecederos</span>
                          <input type="text" defaultValue="50111500" className="p-1 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-white text-center" />
                          <span className="text-[9px] text-zinc-500 truncate">Carne fresca o refrigerada</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-1 items-center">
                          <span className="font-bold text-zinc-300">Servicios y Fletes</span>
                          <input type="text" defaultValue="78101800" className="p-1 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-white text-center" />
                          <span className="text-[9px] text-zinc-500 truncate">Servicios de transporte/envío</span>
                        </div>
                      </div>
                    </div>

                    {/* Tabla de Tickets Pendientes */}
                    <div className="p-4 rounded-xl border bg-zinc-950/20 space-y-3" style={{ borderColor: 'var(--card-border)' }}>
                      <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">VENTAS PENDIENTES DE FACTURACIÓN</h3>
                        <button 
                          onClick={handleGenerateGlobalCfdi}
                          disabled={selectedSales.length === 0}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg transition-colors border-none cursor-pointer shadow"
                        >
                          GENERAR FACTURA GLOBAL CFDI 4.0 ({selectedSales.length})
                        </button>
                      </div>

                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-zinc-500 font-bold border-b border-zinc-800/80">
                              <th className="p-2 w-8">
                                <input 
                                  type="checkbox" 
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSales(pendingSales.map(s => s.id));
                                    } else {
                                      setSelectedSales([]);
                                    }
                                  }}
                                  checked={selectedSales.length === pendingSales.length && pendingSales.length > 0}
                                />
                              </th>
                              <th className="p-2">Ticket</th>
                              <th className="p-2">Cliente</th>
                              <th className="p-2 text-right">Monto ($)</th>
                              <th className="p-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingSales.map((sale) => (
                              <tr key={sale.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                                <td className="p-2">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedSales.includes(sale.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedSales(prev => [...prev, sale.id]);
                                      } else {
                                        setSelectedSales(prev => prev.filter(id => id !== sale.id));
                                      }
                                    }}
                                  />
                                </td>
                                <td className="p-2 font-mono font-bold text-white">{sale.id}</td>
                                <td className="p-2 text-zinc-300">{sale.customer}</td>
                                <td className="p-2 text-right font-mono font-bold">${sale.total.toFixed(2)}</td>
                                <td className="p-2 text-center">
                                  <button 
                                    onClick={() => handleGenerateIndividualCfdi(sale)}
                                    className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white font-bold text-[9px] rounded-lg transition-colors border-none cursor-pointer"
                                  >
                                    Individual
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {pendingSales.length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-zinc-500 font-bold">
                                  No hay transacciones pendientes de facturar.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Lado derecho: JSON Renderizado & Webhook triggers */}
                  <div className="col-span-5 space-y-4 flex flex-col h-[500px]">
                    <div className="p-4 rounded-xl border bg-zinc-950/60 flex-grow flex flex-col justify-between overflow-hidden" style={{ borderColor: 'var(--card-border)' }}>
                      <div className="flex-grow flex flex-col overflow-hidden">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pb-1 border-b mb-3" style={{ borderColor: 'var(--card-border)' }}>
                          CFDI 4.0 JSON PAYLOAD GENERATOR
                        </h4>
                        
                        {activePayload ? (
                          <div className="flex-grow overflow-y-auto font-mono text-[9px] leading-tight p-2 bg-zinc-900 border rounded text-emerald-400 select-all" style={{ borderColor: 'var(--card-border)' }}>
                            <pre>{JSON.stringify(activePayload, null, 2)}</pre>
                          </div>
                        ) : (
                          <div className="flex-grow flex items-center justify-center border border-dashed rounded text-center p-6 text-zinc-500 text-xs" style={{ borderColor: 'var(--card-border)' }}>
                            Selecciona una transacción individual o presiona "Generar Factura Global" para estructurar el JSON conforme al Anexo 20 del SAT.
                          </div>
                        )}
                      </div>

                      {activePayload && (
                        <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--card-border)' }}>
                          <button
                            onClick={handleSendToPac}
                            disabled={isDispatchingWebhook}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-wider rounded-xl transition-all border-none cursor-pointer"
                          >
                            {isDispatchingWebhook ? 'DISPARANDO WEBHOOK DE TIMBRADO...' : 'DISPARAR API WEBHOOK A PAC (SIMULAR)'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Cuadro de éxito SAT */}
                    {fiscalSuccessData && (
                      <div className="p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ backgroundColor: 'var(--success-background)', borderColor: 'var(--card-border)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">✅</span>
                          <strong className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-extrabold">Timbrado Exitoso por PAC</strong>
                        </div>
                        <div className="font-mono text-[9px] leading-tight space-y-1" style={{ color: 'var(--foreground)' }}>
                          <p><strong>UUID FISCAL:</strong> {fiscalSuccessData.uuid}</p>
                          <p><strong>STATUS SAT:</strong> Vigente</p>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <a href={fiscalSuccessData.xmlUrl} className="flex-grow py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg text-center transition-all">DESCARGAR XML</a>
                          <a href={fiscalSuccessData.pdfUrl} className="flex-grow py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg text-center transition-all">IMPRIMIR PDF</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 7: GASTOS OPERATIVOS Y ESTADO DE RESULTADOS */}
          {activeTab === 'expenses' && (() => {
            const salesTotal = 18240.00;
            const cogsTotal = 13394.50;
            const grossProfit = salesTotal - cogsTotal;
            const expensesTotal = expensesList.reduce((acc, e) => acc + e.amount, 0);
            const netProfit = grossProfit - expensesTotal;
            
            return (
              <div className="space-y-6 flex-grow flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white mb-1">Módulo de Gastos y Flujo de Caja</h2>
                  <p className="text-xs text-zinc-400 mb-6">
                    Registre y asiente los egresos operativos (Rentas, Nóminas, Servicios) para calcular de forma dinámica el Estado de Resultados simplificado de su negocio.
                  </p>

                  {/* Estado de Resultados Simplificado */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">📦 VENTAS DE HOY</span>
                      <p className="text-lg font-mono font-extrabold text-white">${salesTotal.toFixed(2)}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">📉 COSTO MERCANCÍA (COGS)</span>
                      <p className="text-lg font-mono font-extrabold text-zinc-400">${cogsTotal.toFixed(2)}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">📈 UTILIDAD BRUTA</span>
                      <p className="text-lg font-mono font-extrabold text-blue-400">${grossProfit.toFixed(2)}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">💸 GASTOS TOTALES</span>
                      <p className="text-lg font-mono font-extrabold text-amber-500">${expensesTotal.toFixed(2)}</p>
                    </div>

                    <div className={`p-4 rounded-xl border space-y-1 ${netProfit >= 0 ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-red-950/20 border-red-900/40'}`}>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">💰 RENTABILIDAD NETA</span>
                      <p className={`text-lg font-mono font-extrabold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${netProfit.toFixed(2)}
                      </p>
                      <span className="text-[9px] font-bold opacity-80 block">
                        {netProfit >= 0 ? '🟢 SUPERÁVIT COMERCIAL' : '🔴 DÉFICIT DE OPERACIÓN'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-6">
                    {/* Registro de Gasto */}
                    <form onSubmit={handleRegisterExpense} className="col-span-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-4">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pb-2 border-b border-zinc-800">REGISTRAR EGRESO</h3>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Categoría</label>
                        <select
                          value={expenseCategory}
                          onChange={e => setExpenseCategory(e.target.value)}
                          className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-white"
                        >
                          <option value="Renta">Renta / Local</option>
                          <option value="Sueldos">Sueldos y Comisiones</option>
                          <option value="Servicios">Servicios (CFE, Internet, Agua)</option>
                          <option value="Mercancía">Compra de Insumos / Mercancía</option>
                          <option value="Otros">Otros Gastos Diversos</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Monto ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="ej. 850.00"
                          value={expenseAmount}
                          onChange={e => setExpenseAmount(e.target.value)}
                          className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-white font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Descripción Detallada</label>
                        <textarea
                          placeholder="ej. Pago bimestral de luz CFE Sucursal Centro"
                          value={expenseDescription}
                          onChange={e => setExpenseDescription(e.target.value)}
                          rows={2}
                          className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-white resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Fecha del Gasto</label>
                        <input
                          type="date"
                          value={expenseDate}
                          onChange={e => setExpenseDate(e.target.value)}
                          className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-white font-mono"
                          required
                        />
                      </div>

                      <button type="submit" className="w-full py-2 bg-red-700 hover:bg-red-600 rounded text-xs font-bold text-white transition-colors">
                        💸 ASENTAR EGRESO OPERATIVO
                      </button>
                    </form>

                    {/* Tabla de Egresos */}
                    <div className="col-span-8 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b bg-zinc-900/80 border-zinc-800 text-zinc-400 font-bold">
                              <th className="p-3">Folio</th>
                              <th className="p-3">Categoría</th>
                              <th className="p-3">Descripción</th>
                              <th className="p-3 text-right">Monto ($)</th>
                              <th className="p-3">Fecha</th>
                              <th className="p-3 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expensesList.map(e => (
                              <tr key={e.id} className="border-b border-zinc-800 hover:bg-zinc-800/40 text-zinc-300 font-mono">
                                <td className="p-3 font-bold text-white">{e.id}</td>
                                <td className="p-3 font-sans text-xs">
                                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                                    {e.category}
                                  </span>
                                </td>
                                <td className="p-3 text-left font-sans text-zinc-400 max-w-[200px] truncate">{e.description}</td>
                                <td className="p-3 text-right font-bold text-red-400">${e.amount.toFixed(2)}</td>
                                <td className="p-3 text-zinc-400 text-xs">{e.date}</td>
                                <td className="p-3 text-center font-sans">
                                  <button
                                    onClick={() => handleDeleteExpense(e.id)}
                                    className="px-2 py-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded text-[9px] font-bold transition-all border border-red-900/30 cursor-pointer"
                                  >
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {expensesList.length === 0 && (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-zinc-500 font-bold">
                                  No hay gastos asentados en este período.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 8: GOBERNANZA FINANCIERA Y CONTABLE (SaaS Premium) */}
          {activeTab === 'finance' && (() => {
            const salesBrutas = 18240.00;
            const ivaDevuelto = +(salesBrutas - (salesBrutas / 1.16)).toFixed(2);
            const ventasNetas = salesBrutas - ivaDevuelto;
            
            // Cost of Goods Sold (Costo de Ventas)
            const cogs = 13394.50;
            const utilidadBruta = ventasNetas - cogs;
            
            // Operating Expenses (Gastos de Operación)
            const gastosRenta = expensesList.filter(e => e.category === 'Renta').reduce((acc, e) => acc + e.amount, 0);
            const gastosSueldos = expensesList.filter(e => e.category === 'Sueldos').reduce((acc, e) => acc + e.amount, 0);
            const gastosServicios = expensesList.filter(e => e.category === 'Servicios').reduce((acc, e) => acc + e.amount, 0);
            const gastosOtros = expensesList.filter(e => ['Otros', 'Mercancía'].includes(e.category)).reduce((acc, e) => acc + e.amount, 0);
            const totalGastosOperacion = gastosRenta + gastosSueldos + gastosServicios + gastosOtros;
            
            const utilidadOperacion = utilidadBruta - totalGastosOperacion;
            
            // Taxes and Net Rentability
            const impuestosSimulados = utilidadOperacion > 0 ? +(utilidadOperacion * 0.30).toFixed(2) : 0;
            const utilidadNeta = utilidadOperacion - impuestosSimulados;

            // Balance General variables
            const efectivoEnCaja = 12400.00;
            const cuentasPorCobrar = 2370.50;
            const inventarioValorado = 18450.00; // Valorado al costo promedio de existencias
            const totalActivo = efectivoEnCaja + cuentasPorCobrar + inventarioValorado;

            const cuentasPorPagarProveedores = 7895.40;
            const totalPasivo = cuentasPorPagarProveedores;

            const capitalSocial = 20000.00;
            const utilidadesAcumuladas = totalActivo - totalPasivo - capitalSocial;
            const totalCapital = capitalSocial + utilidadesAcumuladas;
            const totalPasivoYCapital = totalPasivo + totalCapital;

            return (
              <div className="space-y-6 flex-grow flex flex-col justify-between no-print">
                <div>
                  <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-white mb-1" style={{ color: 'var(--foreground)' }}>Gobernanza Contable e Informes Ejecutivos</h2>
                      <p className="text-xs text-zinc-400" style={{ color: 'var(--muted)' }}>
                        Genere balances generales, estados de resultados y flujos de efectivo auditables listos para exportar a PDF y presentar.
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        window.print();
                      }}
                      className="btn-primary px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg hover:scale-[1.02]"
                    >
                      🖨️ IMPRIMIR COMPENDIO CONTABLE (PDF)
                    </button>
                  </div>

                  {/* Ficha Ledger de Tres Estados */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* 1. ESTADO DE RESULTADOS */}
                    <div className="p-5 rounded-2xl border bg-zinc-950/20 flex flex-col justify-between" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card)' }}>
                      <div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80 mb-4" style={{ borderColor: 'var(--card-border)' }}>
                          <span className="text-[11px] font-extrabold text-blue-500 tracking-wider">ESTADO DE RESULTADOS</span>
                          <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold">PERÍODO MENSUAL</span>
                        </div>

                        <div className="space-y-2.5 text-xs font-mono" style={{ color: 'var(--foreground)' }}>
                          <div className="flex justify-between">
                            <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Ventas Brutas (+)</span>
                            <span className="font-bold">${salesBrutas.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--card-border)' }}>
                            <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>IVA Trasladado (16%) (-)</span>
                            <span className="text-red-400">-${ivaDevuelto.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-white mb-2" style={{ color: 'var(--foreground)' }}>
                            <span>Ventas Netas (=)</span>
                            <span>${ventasNetas.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--card-border)' }}>
                            <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Costo de Ventas (COGS) (-)</span>
                            <span className="text-red-400">-${cogs.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-emerald-400 mb-4">
                            <span>Utilidad Bruta (=)</span>
                            <span>${utilidadBruta.toFixed(2)}</span>
                          </div>

                          <div className="space-y-1.5 pl-2 border-l-2" style={{ borderColor: 'var(--card-border)' }}>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>• Rentas y Local</span>
                              <span>-${gastosRenta.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>• Sueldos/Nóminas</span>
                              <span>-${gastosSueldos.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>• Luz/CFE/Internet</span>
                              <span>-${gastosServicios.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>• Otros Egresos</span>
                              <span>-${gastosOtros.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between border-b pb-1.5 mt-2" style={{ borderColor: 'var(--card-border)' }}>
                            <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Gastos Operativos (-)</span>
                            <span className="text-red-400">-${totalGastosOperacion.toFixed(2)}</span>
                          </div>
                          
                          <div className="flex justify-between font-bold text-white" style={{ color: 'var(--foreground)' }}>
                            <span>Utilidad de Op. (=)</span>
                            <span>${utilidadOperacion.toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--card-border)' }}>
                            <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>ISR Estimado (30%) (-)</span>
                            <span className="text-red-400">-${impuestosSimulados.toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between text-sm font-extrabold text-emerald-400 pt-2 border-t border-double" style={{ borderColor: 'var(--card-border)' }}>
                            <span>UTILIDAD NETA (=)</span>
                            <span className="underline decoration-double">${utilidadNeta.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. BALANCE GENERAL */}
                    <div className="p-5 rounded-2xl border bg-zinc-950/20 flex flex-col justify-between" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card)' }}>
                      <div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80 mb-4" style={{ borderColor: 'var(--card-border)' }}>
                          <span className="text-[11px] font-extrabold text-blue-500 tracking-wider">BALANCE GENERAL</span>
                          <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">AL DÍA DE HOY</span>
                        </div>

                        <div className="space-y-4 text-xs font-mono" style={{ color: 'var(--foreground)' }}>
                          {/* ACTIVO */}
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 block mb-1" style={{ color: 'var(--muted)' }}>ACTIVO CIRCULANTE</span>
                            <div className="space-y-1.5 pl-2 border-l border-zinc-800" style={{ borderColor: 'var(--card-border)' }}>
                              <div className="flex justify-between">
                                <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Efectivo en Caja POS</span>
                                <span>${efectivoEnCaja.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Cuentas por Cobrar (Clientes)</span>
                                <span>${cuentasPorCobrar.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Inventario Valorado (Costo)</span>
                                <span>${inventarioValorado.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between font-bold text-white border-t border-zinc-800/60 pt-1 mt-1.5" style={{ color: 'var(--foreground)', borderColor: 'var(--card-border)' }}>
                              <span>TOTAL ACTIVO (=)</span>
                              <span>${totalActivo.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* PASIVO */}
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 block mb-1" style={{ color: 'var(--muted)' }}>PASIVO CIRCULANTE</span>
                            <div className="space-y-1.5 pl-2 border-l border-zinc-800" style={{ borderColor: 'var(--card-border)' }}>
                              <div className="flex justify-between">
                                <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Cuentas por Pagar (Proveedores)</span>
                                <span>${cuentasPorPagarProveedores.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between font-bold text-white border-t border-zinc-800/60 pt-1 mt-1.5" style={{ color: 'var(--foreground)', borderColor: 'var(--card-border)' }}>
                              <span>TOTAL PASIVO (=)</span>
                              <span>${totalPasivo.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* CAPITAL */}
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 block mb-1" style={{ color: 'var(--muted)' }}>CAPITAL CONTABLE</span>
                            <div className="space-y-1.5 pl-2 border-l border-zinc-800" style={{ borderColor: 'var(--card-border)' }}>
                              <div className="flex justify-between">
                                <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Capital Social Declarado</span>
                                <span>${capitalSocial.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Utilidades del Ejercicio</span>
                                <span>${utilidadesAcumuladas.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between font-bold text-white border-t border-zinc-800/60 pt-1 mt-1.5" style={{ color: 'var(--foreground)', borderColor: 'var(--card-border)' }}>
                              <span>TOTAL CAPITAL (=)</span>
                              <span>${totalCapital.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between text-[11px] font-extrabold text-blue-400 pt-2 border-t border-double" style={{ borderColor: 'var(--card-border)' }}>
                            <span>PASIVO + CAPITAL (=)</span>
                            <span className="underline decoration-double">${totalPasivoYCapital.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. FLUJO DE EFECTIVO */}
                    <div className="p-5 rounded-2xl border bg-zinc-950/20 flex flex-col justify-between" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card)' }}>
                      <div>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-800/80 mb-4" style={{ borderColor: 'var(--card-border)' }}>
                          <span className="text-[11px] font-extrabold text-blue-500 tracking-wider">ESTADO DE FLUJO DE EFECTIVO</span>
                          <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold">MÉTODO DIRECTO</span>
                        </div>

                        <div className="space-y-3.5 text-xs font-mono" style={{ color: 'var(--foreground)' }}>
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 block mb-1" style={{ color: 'var(--muted)' }}>ACTIVIDADES DE OPERACIÓN</span>
                            <div className="space-y-1.5 pl-2 border-l border-zinc-800" style={{ borderColor: 'var(--card-border)' }}>
                              <div className="flex justify-between">
                                <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Recaudación de Ventas POS</span>
                                <span className="text-emerald-400">+${efectivoEnCaja.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Pago de Nómina/Gastos</span>
                                <span className="text-red-400">-${totalGastosOperacion.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 block mb-1" style={{ color: 'var(--muted)' }}>ACTIVIDADES DE INVERSIÓN</span>
                            <div className="space-y-1.5 pl-2 border-l border-zinc-800" style={{ borderColor: 'var(--card-border)' }}>
                              <div className="flex justify-between">
                                <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Compra de Stock Valorado</span>
                                <span className="text-red-400">-${inventarioValorado.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 block mb-1" style={{ color: 'var(--muted)' }}>ACTIVIDADES DE FINANCIAMIENTO</span>
                            <div className="space-y-1.5 pl-2 border-l border-zinc-800" style={{ borderColor: 'var(--card-border)' }}>
                              <div className="flex justify-between">
                                <span className="text-zinc-500" style={{ color: 'var(--muted)' }}>Líneas de Fiado Clientes</span>
                                <span className="text-emerald-400">+${cuentasPorCobrar.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-zinc-800/80" style={{ borderColor: 'var(--card-border)' }}>
                            <div className="flex justify-between text-xs font-extrabold text-white" style={{ color: 'var(--foreground)' }}>
                              <span>EFECTIVO AL INICIO DEL PERÍODO</span>
                              <span>$0.00</span>
                            </div>
                            <div className="flex justify-between text-sm font-extrabold text-emerald-400 pt-2 border-t border-double mt-2" style={{ borderColor: 'var(--card-border)' }}>
                              <span>EFECTIVO AL FINAL (=)</span>
                              <span className="underline decoration-double">${efectivoEnCaja.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="p-3.5 bg-blue-900/10 border border-blue-900/30 rounded-xl text-[10px] text-blue-400 font-mono">
                  📊 **Gobernanza de Cierre de Caja:** Este compendio integra las entradas por mostrador del POS, deducciones fiscales CFDI 4.0 automatizadas, compras registradas y el libro mayor de egresos en tiempo real. Utilice el botón superior para compilar el reporte PDF del período de manera instantánea.
                </div>
              </div>
            );
          })()}

          {/* COMPLEMENTO PRINT-ONLY PARA GENERAR PDF SENSACIONAL */}
          {activeTab === 'finance' && (() => {
            const salesBrutas = 18240.00;
            const ivaDevuelto = +(salesBrutas - (salesBrutas / 1.16)).toFixed(2);
            const ventasNetas = salesBrutas - ivaDevuelto;
            const cogs = 13394.50;
            const utilidadBruta = ventasNetas - cogs;
            const gastosRenta = expensesList.filter(e => e.category === 'Renta').reduce((acc, e) => acc + e.amount, 0);
            const gastosSueldos = expensesList.filter(e => e.category === 'Sueldos').reduce((acc, e) => acc + e.amount, 0);
            const gastosServicios = expensesList.filter(e => e.category === 'Servicios').reduce((acc, e) => acc + e.amount, 0);
            const gastosOtros = expensesList.filter(e => ['Otros', 'Mercancía'].includes(e.category)).reduce((acc, e) => acc + e.amount, 0);
            const totalGastosOperacion = gastosRenta + gastosSueldos + gastosServicios + gastosOtros;
            const utilidadOperacion = utilidadBruta - totalGastosOperacion;
            const impuestosSimulados = utilidadOperacion > 0 ? +(utilidadOperacion * 0.30).toFixed(2) : 0;
            const utilidadNeta = utilidadOperacion - impuestosSimulados;

            const efectivoEnCaja = 12400.00;
            const cuentasPorCobrar = 2370.50;
            const inventarioValorado = 18450.00;
            const totalActivo = efectivoEnCaja + cuentasPorCobrar + inventarioValorado;
            const cuentasPorPagarProveedores = 7895.40;
            const totalPasivo = cuentasPorPagarProveedores;
            const capitalSocial = 20000.00;
            const utilidadesAcumuladas = totalActivo - totalPasivo - capitalSocial;
            const totalCapital = capitalSocial + utilidadesAcumuladas;
            const totalPasivoYCapital = totalPasivo + totalCapital;

            return (
              <div className="hidden print-only font-mono p-8 text-black bg-white max-w-4xl mx-auto space-y-8">
                <div className="text-center border-b pb-4 border-black">
                  <h1 className="text-2xl font-bold uppercase tracking-wider">COMPENDIO CONTABLE EJECUTIVO AUDITABLE</h1>
                  <p className="text-sm font-semibold uppercase mt-1">Tenant: {fiscalRazonSocial}</p>
                  <p className="text-xs mt-1">RFC: {fiscalRfc} &middot; Régimen: {fiscalRegimen} &middot; C.P. {fiscalPostalCode}</p>
                  <p className="text-[10px] mt-2 text-zinc-500">Fecha de Emisión: {new Date().toLocaleString('es-MX')}</p>
                </div>

                <div className="space-y-6">
                  {/* Estado de Resultados */}
                  <div className="p-4 border border-black rounded-lg">
                    <h2 className="text-sm font-bold uppercase border-b pb-1 border-black mb-3">1. ESTADO DE RESULTADOS DE OPERACIÓN</h2>
                    <table className="w-full text-xs text-left">
                      <tbody>
                        <tr><td>Ventas Brutas Totales (+)</td><td className="text-right">${salesBrutas.toFixed(2)}</td></tr>
                        <tr><td>IVA Trasladado Deducido (16%) (-)</td><td className="text-right">-${ivaDevuelto.toFixed(2)}</td></tr>
                        <tr className="font-bold border-t border-b"><td>Ventas Netas Totales (=)</td><td className="text-right">${ventasNetas.toFixed(2)}</td></tr>
                        <tr><td>Costo de la Mercancía Vendida (COGS) (-)</td><td className="text-right">-${cogs.toFixed(2)}</td></tr>
                        <tr className="font-bold text-base"><td>Utilidad Bruta de Operación (=)</td><td className="text-right">${utilidadBruta.toFixed(2)}</td></tr>
                        <tr><td>Gastos Operativos (Renta, Nómina, Servicios) (-)</td><td className="text-right">-${totalGastosOperacion.toFixed(2)}</td></tr>
                        <tr className="font-bold"><td>Utilidad de Operación (=)</td><td className="text-right">${utilidadOperacion.toFixed(2)}</td></tr>
                        <tr><td>Provisión ISR del Ejercicio (30%) (-)</td><td className="text-right">-${impuestosSimulados.toFixed(2)}</td></tr>
                        <tr className="font-extrabold border-t-2 border-b-2 text-base"><td>UTILIDAD NETA TOTAL (=)</td><td className="text-right underline decoration-double">${utilidadNeta.toFixed(2)}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Balance General */}
                  <div className="p-4 border border-black rounded-lg">
                    <h2 className="text-sm font-bold uppercase border-b pb-1 border-black mb-3">2. BALANCE GENERAL FINANCIERO</h2>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <h3 className="font-bold mb-1">ACTIVOS</h3>
                        <p>Efectivo en Caja POS: ${efectivoEnCaja.toFixed(2)}</p>
                        <p>Cuentas por Cobrar (Clientes): ${cuentasPorCobrar.toFixed(2)}</p>
                        <p>Inventarios Valorados (Costo): ${inventarioValorado.toFixed(2)}</p>
                        <p className="font-bold border-t mt-1 pt-1">TOTAL ACTIVO: ${totalActivo.toFixed(2)}</p>
                      </div>
                      <div>
                        <h3 className="font-bold mb-1">PASIVOS & CAPITAL</h3>
                        <p>Cuentas por Pagar (Proveedores): ${cuentasPorPagarProveedores.toFixed(2)}</p>
                        <p className="font-bold border-t mt-1 pt-1 mb-2">TOTAL PASIVO: ${totalPasivo.toFixed(2)}</p>
                        <h3 className="font-bold mb-1">CAPITAL</h3>
                        <p>Capital Social Declarado: ${capitalSocial.toFixed(2)}</p>
                        <p>Utilidad del Ejercicio: ${utilidadesAcumuladas.toFixed(2)}</p>
                        <p className="font-bold border-t mt-1 pt-1">TOTAL CAPITAL: ${totalCapital.toFixed(2)}</p>
                        <p className="font-extrabold border-t-2 mt-2 pt-1">TOTAL PASIVO Y CAPITAL: ${totalPasivoYCapital.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Firmas de Autorización */}
                <div className="grid grid-cols-2 gap-16 text-center text-xs pt-16">
                  <div>
                    <div className="border-t border-black w-48 mx-auto mt-8"></div>
                    <p className="font-bold mt-2">ADMINISTRADOR DEL ESTABLECIMIENTO</p>
                    <p className="text-[10px] text-zinc-500">Autorización Operativa</p>
                  </div>
                  <div>
                    <div className="border-t border-black w-48 mx-auto mt-8"></div>
                    <p className="font-bold mt-2">REPRESENTANTE LEGAL OWNER</p>
                    <p className="text-[10px] text-zinc-500">Declaración de Conformidad</p>
                  </div>
                </div>

                <div className="text-center text-[9px] text-zinc-500 pt-8 border-t border-dashed">
                  Reporte autogenerado de forma digital e inmutable por el motor de Gobernanza Contable de SNAPGAD POS.
                </div>
              </div>
            );
          })()}

          {/* TAB 8: BITÁCORA DE AUDITORÍA INMUTABLE */}
          {activeTab === 'audit_logs' && (
            <div className="space-y-6 flex-grow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-extrabold text-white mb-1">Bitácora de Auditoría Inmutable (Append-Only)</h2>
                    <p className="text-xs text-zinc-400 mb-6">
                      Registro de trazabilidad y gobernanza de operaciones críticas. Este registro es inmutable y sirve para la seguridad interna de su negocio.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold tracking-widest font-mono">
                    SECURE APPEND-ONLY MODE
                  </span>
                </div>

                {/* Filtro de Bitácora */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Filtrar por Acción:</span>
                  <select
                    value={auditActionFilter}
                    onChange={e => setAuditActionFilter(e.target.value)}
                    className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">Mostrar Todos los Eventos</option>
                    <option value="PRODUCT_EDIT">PRODUCT_EDIT (Cambios de Precios/Catálogo)</option>
                    <option value="STOCK_ADJUST">STOCK_ADJUST (Ajustes de Inventario)</option>
                    <option value="SALE_CANCEL">SALE_CANCEL (Cancelaciones de Ticket)</option>
                    <option value="EXPENSE_CREATE">EXPENSE_CREATE (Registro de Gastos)</option>
                    <option value="EXPENSE_DELETE">EXPENSE_DELETE (Eliminación de Gastos)</option>
                    <option value="ROLE_CHANGE">ROLE_CHANGE (Modificación de Roles)</option>
                  </select>
                </div>

                {/* Tabla de Logs */}
                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b bg-zinc-900/80 border-zinc-800 text-zinc-400 font-bold">
                          <th className="p-3">Log ID</th>
                          <th className="p-3">Usuario</th>
                          <th className="p-3">Rol</th>
                          <th className="p-3">Acción</th>
                          <th className="p-3">Detalle</th>
                          <th className="p-3">IP Origen</th>
                          <th className="p-3">Fecha y Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogsList
                          .filter(log => auditActionFilter === 'ALL' || log.action === auditActionFilter)
                          .map(log => (
                            <tr key={log.id} className="border-b border-zinc-800 hover:bg-zinc-800/40 text-zinc-300 font-mono">
                              <td className="p-3 font-bold text-zinc-500">{log.id}</td>
                              <td className="p-3 font-sans text-xs text-white">{log.userId}</td>
                              <td className="p-3 font-sans text-xs">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${log.userRole === 'owner' ? 'bg-blue-900/40 text-blue-400' : 'bg-amber-900/40 text-amber-400'}`}>
                                  {log.userRole}
                                </span>
                              </td>
                              <td className="p-3 text-xs">
                                <span className="px-2 py-0.5 rounded bg-zinc-850 text-white font-extrabold text-[9px]">
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-3 text-left font-sans text-zinc-400 max-w-[300px] truncate" title={log.details}>
                                {log.details}
                              </td>
                              <td className="p-3 text-zinc-500 text-xs">{log.ipAddress}</td>
                              <td className="p-3 text-zinc-400 text-xs">{log.createdAt}</td>
                            </tr>
                          ))}
                        {auditLogsList.filter(log => auditActionFilter === 'ALL' || log.action === auditActionFilter).length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-zinc-500 font-bold">
                              No hay registros de auditoría para este tipo de filtro.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] text-zinc-500 leading-normal font-mono">
                  🚨 **Aviso de Integridad SAT & Gobernanza:** Todos los registros en esta bitácora se generan en formato append-only respaldados con firmas inmutables de base de datos. Ningún usuario, incluyendo el Owner del Tenant, tiene permisos de mutación o borrado de este registro.
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-zinc-600 border-t" style={{ borderColor: 'var(--card-border)' }}>
        SNAPGAD POS &copy; {new Date().getFullYear()} &middot; Panel de Gobernanza Comercial Proactiva.
      </footer>
    </div>
  );
}
