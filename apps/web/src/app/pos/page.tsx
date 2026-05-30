'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PRODUCTS_SEED, CUSTOMERS_SEED, type ProductSeed, type CustomerSeed } from './products-seed';
import { useShift } from '../../lib/shift-context';
import { useUserSession } from '../../lib/user-session';
import { SoundFx } from '../../lib/pos-utils';
import { saveCatalogLocal, getLocalProducts, saveOfflineSale, getPendingSales, deletePendingSale } from '../../lib/offlineDb';

import { useAppTheme } from '../../components/theme-context';
import Sidebar from '../../components/Sidebar';
import AdminPinModal from '../../components/AdminPinModal';
import PinLockScreen from '../../components/PinLockScreen';
import SupervisorOverrideModal from '../../components/SupervisorOverrideModal';

interface CartItem {
  product: ProductSeed;
  quantity: number;
}

const QUICK_CASH_BILLS = [20, 50, 100, 200, 500];

export default function POSPage() {
  const router = useRouter();
  const { session, setRoleForDev, activeCashier, setActiveCashier } = useUserSession();
  const { activeShift, closeShift, recordSale, elapsedTime } = useShift();

  // Supervisor Override State
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [supervisorActionDesc, setSupervisorActionDesc] = useState('');
  const [supervisorCallback, setSupervisorCallback] = useState<(() => void) | null>(null);

  const executeRestrictedAction = (desc: string, action: () => void) => {
    if (session.role === 'cashier') {
      setSupervisorActionDesc(desc);
      setSupervisorCallback(() => action);
      setIsSupervisorModalOpen(true);
    } else {
      action();
    }
  };

  // Blind closure state for tarjetas
  const [cardsDeclared, setCardsDeclared] = useState('');

  // Redirigir al Launchpad si no hay turno activo y el rol es Cajero
  useEffect(() => {
    if (!activeShift && session.role === 'cashier') {
      router.push('/pos/turno');
    }
  }, [activeShift, session, router]);

  const { theme, activeBranch } = useAppTheme();
  const [isAdminPinOpen, setIsAdminPinOpen] = useState(false);
  const [pinTargetAction, setPinTargetAction] = useState<string | null>(null);
  const [pinSuccessCallback, setPinSuccessCallback] = useState<(() => void) | null>(null);

  const [activeProfile, setActiveProfile] = useState<'general' | 'weight' | 'catalog' | 'distribution' | 'services'>('general');
  const [priceTier, setPriceTier] = useState<'retail' | 'contractor' | 'wholesale'>('retail');
  
  // Estados para Módulos Operativos (Giros Comerciales)
  const [configCobroVeloz, setConfigCobroVeloz] = useState(true);
  const [configBascula, setConfigBascula] = useState(false);
  const [configFuzzy, setConfigFuzzy] = useState(false);
  const [configQuotes, setConfigQuotes] = useState(false);
  const [configRecipes, setConfigRecipes] = useState(false);
  const [configB2B, setConfigB2B] = useState(false);
  
  // Estados para Merma Diaria (Perfil B)
  const [isMermaModalOpen, setIsMermaModalOpen] = useState(false);
  const [mermaProduct, setMermaProduct] = useState<ProductSeed | null>(null);
  const [mermaQty, setMermaQty] = useState('0.500');
  const [mermaReason, setMermaReason] = useState('Merma Natural (Deshidratación)');
  
  // Estado para Cotizaciones PDF (Perfil C/D)
  const [quotationPdfUrl, setQuotationPdfUrl] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Estados para Clientes & Crédito (Offline-First)
  const [customers, setCustomers] = useState<CustomerSeed[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSeed | null>(null);
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custRfc, setCustRfc] = useState('');
  const [custCreditEnabled, setCustCreditEnabled] = useState(true);
  const [custCreditLimit, setCustCreditLimit] = useState('1000');
  const [custPaymentTermDays, setCustPaymentTermDays] = useState(15);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card' | 'credit'>('cash');
  const [receivedCash, setReceivedCash] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [time, setTime] = useState('');

  // Estados para Cierre de Caja Modal
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [cashInDrawer, setCashInDrawer] = useState('');
  const [cierreSummary, setCierreSummary] = useState<any>(null);

  // Estados para Simulador de Báscula USB
  const [scaleProduct, setScaleProduct] = useState<ProductSeed | null>(null);
  const [scaleWeight, setScaleWeight] = useState(1.500);
  const [isScaleCalibrating, setIsScaleCalibrating] = useState(false);

  // Estados para Tour Guiado Interactiva
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(1);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isHardwareBridgeConnected, setIsHardwareBridgeConnected] = useState(false);
  const wsRef = useRef<any>(null);

  // Atajos de teclado global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        SoundFx.playBeep();
        setIsShortcutsModalOpen(prev => !prev);
      }
      if (e.key === 'F2') {
        e.preventDefault();
        SoundFx.playBeep();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F10') {
        e.preventDefault();
        const btn = document.getElementById('pos-checkout-btn') as HTMLButtonElement | null;
        if (btn && !btn.disabled) {
          btn.click();
        } else {
          SoundFx.playWarning();
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsShortcutsModalOpen(false);
        setScaleProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Inicializar existencias distribuidas por sucursal en el catálogo semilla y forzar tema claro
  useEffect(() => {
    PRODUCTS_SEED.forEach(p => {
      if (!p.stockPerBranch) {
        p.stockPerBranch = {
          'Sucursal Matriz': p.stock,
          'Sucursal Poniente': Math.max(0, Math.floor(p.stock / 2))
        };
      }
    });

    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('snapgad_theme', 'light');
    }
  }, []);

  // Controladores de Tour Guiado
  const closeTour = () => {
    setShowTour(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('show_onboarding_tutorial');
    }
    SoundFx.playSuccess();
  };

  const nextTourStep = () => {
    SoundFx.playBeep();
    if (tourStep < 5) {
      setTourStep(tourStep + 1);
    } else {
      closeTour();
    }
  };

  const prevTourStep = () => {
    SoundFx.playBeep();
    if (tourStep > 1) {
      setTourStep(tourStep - 1);
    }
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar carrito y catálogo persistidos en localStorage al montar para evitar F5 wipe
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Sincronizar catálogo local de productos desde localStorage
      const savedProductsStr = window.localStorage.getItem('snapgad_pos_products_catalog');
      if (savedProductsStr) {
        try {
          const parsed = JSON.parse(savedProductsStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            PRODUCTS_SEED.length = 0;
            PRODUCTS_SEED.push(...parsed);
          }
        } catch (e) {
          console.error('Error cargando catálogo local en POS:', e);
        }
      }

      const savedCart = window.localStorage.getItem('snapgad_pos_cart');
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {}
      }
      // Sincronizar catálogo local de clientes
      const savedCustomersStr = window.localStorage.getItem('snapgad_pos_customers');
      let loadedCustomers = CUSTOMERS_SEED;
      if (savedCustomersStr) {
        try {
          loadedCustomers = JSON.parse(savedCustomersStr);
        } catch (e) {}
      }
      setCustomers(loadedCustomers);

      const savedCustomer = window.localStorage.getItem('snapgad_pos_selected_customer');
      if (savedCustomer) {
        try {
          const parsed = JSON.parse(savedCustomer);
          const matched = loadedCustomers.find(c => c.id === parsed.id) || parsed;
          setSelectedCustomer(matched);
        } catch (e) {}
      } else {
        setSelectedCustomer(loadedCustomers[0]);
      }
      const tenantConfig = window.localStorage.getItem('snapgad_tenant_config');
      if (tenantConfig) {
        try {
          const parsed = JSON.parse(tenantConfig);
          if (parsed.profile) setActiveProfile(parsed.profile);
          if (parsed.moduleCobroVeloz !== undefined) setConfigCobroVeloz(parsed.moduleCobroVeloz);
          if (parsed.moduleBascula !== undefined) setConfigBascula(parsed.moduleBascula);
          if (parsed.moduleFuzzy !== undefined) setConfigFuzzy(parsed.moduleFuzzy);
          if (parsed.moduleQuotes !== undefined) setConfigQuotes(parsed.moduleQuotes);
          if (parsed.moduleRecipes !== undefined) setConfigRecipes(parsed.moduleRecipes);
          if (parsed.moduleB2B !== undefined) setConfigB2B(parsed.moduleB2B);
        } catch (e) {}
      } else {
        const savedProfile = window.localStorage.getItem('snapgad_current_profile');
        if (savedProfile) {
          setActiveProfile(savedProfile as any);
        }
      }
      
      // Activar Tour Guiado si procede
      const needsTutorial = window.localStorage.getItem('show_onboarding_tutorial');
      if (needsTutorial === 'true') {
        setShowTour(true);
      }
    }
  }, []);

  // Sincronizar catálogo inicial de IndexedDB en local y escuchar conectividad
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        SoundFx.playSuccess();
        syncOfflineSalesQueue();
      };

      const handleOffline = () => {
        setIsOnline(false);
        SoundFx.playWarning();
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Cargar o inicializar catálogo local
      const initCatalog = async () => {
        try {
          const localProds = await getLocalProducts();
          if (localProds.length === 0) {
            const mapped = PRODUCTS_SEED.map(p => ({
              id: p.id,
              name: p.name,
              barcode: p.barcode,
              salePrice: p.salePrice,
              stock: p.stock,
              unit: p.unit,
              category: p.category
            }));
            await saveCatalogLocal(mapped);
          }
        } catch (err) {
          console.error('Error inicializando IndexedDB:', err);
        }
      };

      initCatalog();

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Función asíncrona para sincronizar ventas de IndexedDB al servidor
  const syncOfflineSalesQueue = async () => {
    try {
      const pending = await getPendingSales();
      if (pending.length === 0) return;

      console.log(`🔌 Sincronizando ${pending.length} ventas offline...`);
      for (const sale of pending) {
        // En producción se dispara la llamada mutadora tRPC.
        // Simulamos sincronización exitosa limpiando IndexedDB:
        await deletePendingSale(sale.id);
      }
      console.log('✓ Ventas offline sincronizadas exitosamente.');
    } catch (err) {
      console.error('Error al sincronizar cola offline:', err);
    }
  };

  // Conexión dinámica al Puente Local Electron (Mobile-Bridge)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = window.localStorage.getItem('snapgad_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    let socket: WebSocket;
    let reconnectTimeout: any;

    const connectBridge = async () => {
      let token = '';
      try {
        const tokenRes = await fetch('/api/hardware-token');
        const tokenData = await tokenRes.json();
        if (tokenData.token) token = tokenData.token;
      } catch (e) {
        console.error('Error cargando token de bridge:', e);
      }

      socket = new WebSocket('ws://localhost:9099');
      wsRef.current = socket;

      socket.onopen = () => {
        // Enviar handshake inmediatamente
        socket.send(JSON.stringify({ type: 'AUTH', token }));
        setIsHardwareBridgeConnected(true);
        console.log('✓ Conectado al puente de periféricos local (Electron)');
        // Pedir listado de impresoras del sistema
        socket.send(JSON.stringify({ type: 'GET_PRINTERS' }));
      };

      socket.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          if (res.type === 'AUTH_SUCCESS') {
            console.log('✓ Handshake exitoso con bridge de hardware.');
          } else if (res.type === 'AUTH_ERROR') {
            console.error('❌ Falla de autenticación con bridge:', res.error);
            setIsHardwareBridgeConnected(false);
          } else if (res.type === 'PRINTERS_LIST') {
            setPrinters(res.payload || []);
            const defPr = res.payload.find((p: any) => p.isDefault)?.name || res.payload[0]?.name || '';
            setSelectedPrinter(defPr);
          } else if (res.type === 'PRINT_SUCCESS') {
            console.log('✓ Ticket enviado con éxito al bridge local.');
          }
        } catch (e) {
          console.error('Error procesando respuesta del bridge local:', e);
        }
      };

      socket.onclose = () => {
        setIsHardwareBridgeConnected(false);
        reconnectTimeout = setTimeout(connectBridge, 5000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connectBridge();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_pos_cart', JSON.stringify(cart));
    }
  }, [cart]);

  // Guardar cambios de cliente seleccionado en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_pos_selected_customer', JSON.stringify(selectedCustomer));
    }
  }, [selectedCustomer]);

  // Sincronizar Reloj Local
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);



  // Enfocar buscador al cargar
  useEffect(() => {
    if (activeShift && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeShift]);

  // Redirigir si no hay turno activo
  useEffect(() => {
    if (!activeShift) {
      router.push('/pos/turno');
    }
  }, [activeShift, router]);

  // Categorías de productos únicas
  const categories = useMemo(() => {
    const cats = new Set(PRODUCTS_SEED.map((p) => p.category));
    return ['Todos', ...Array.from(cats)];
  }, []);

  // Productos favoritos / acceso rápido (los 6 primeros con quickButton o simplemente los primeros)
  const quickAccessProducts = useMemo(() => {
    if (['weight', 'services'].includes(activeProfile)) {
      return PRODUCTS_SEED.slice(0, 20);
    }
    return PRODUCTS_SEED.slice(0, 6);
  }, [activeProfile]);

  // Filtrar catálogo de productos
  const filteredProducts = useMemo(() => {
    return PRODUCTS_SEED.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.internalCode.toLowerCase().includes(search.toLowerCase()) ||
        product.barcode.includes(search);
      const matchesCat = category === 'Todos' || product.category === category;
      return matchesSearch && matchesCat;
    });
  }, [search, category]);

  // Cálculos de Totales con desglose dual de IVA + IEPS y Tiers de Precios (Fórmula Fiscal Mexicana)
  const cartSummary = useMemo(() => {
    let total = 0;
    let subtotal = 0;
    let iva = 0;
    let ieps = 0;

    cart.forEach((item) => {
      // Determinar precio según el tier activo (Fase 4: Multiple Prices)
      let unitPrice = item.product.salePrice;
      if (['catalog', 'distribution'].includes(activeProfile)) {
        if (priceTier === 'contractor') {
          unitPrice = item.product.wholesalePrice || +(item.product.salePrice * 0.93).toFixed(2);
        } else if (priceTier === 'wholesale') {
          unitPrice = item.product.wholesalePrice || +(item.product.salePrice * 0.88).toFixed(2);
        }
      }

      const itemTotal = unitPrice * item.quantity;
      const ivaPct = item.product.ivaPercent || 0;
      const iepsPct = item.product.iepsPercent || 0;

      const itemNetPrice = itemTotal / (1 + (ivaPct / 100) + (iepsPct / 100));
      const itemIva = itemNetPrice * (ivaPct / 100);
      const itemIeps = itemNetPrice * (iepsPct / 100);

      total += itemTotal;
      subtotal += itemNetPrice;
      iva += itemIva;
      ieps += itemIeps;
    });

    return { total, subtotal, iva, ieps };
  }, [cart, activeProfile, priceTier]);

  const total = cartSummary.total;
  const subtotal = cartSummary.subtotal;
  const tax = cartSummary.iva; // Para compatibilidad con referencias existentes de 'tax'
  const iva = cartSummary.iva;
  const ieps = cartSummary.ieps;

  // Verificar si excede límite de crédito
  const creditLimitWarning = useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.creditEnabled) return false;
    const availableCredit = selectedCustomer.creditLimit - selectedCustomer.currentBalance;
    return total > availableCredit;
  }, [selectedCustomer, total]);

  const isCustomerOverdue = useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.creditEnabled || !selectedCustomer.creditDueDate) return false;
    if (selectedCustomer.currentBalance <= 0) return false;
    return Date.now() > new Date(selectedCustomer.creditDueDate).getTime();
  }, [selectedCustomer]);

  // Alerta de sonido para límite de crédito o plazos de pago vencidos
  useEffect(() => {
    if (creditLimitWarning || isCustomerOverdue) {
      SoundFx.playWarning();
    }
  }, [creditLimitWarning, isCustomerOverdue]);

  // Manejo de Carrito
  const addToCart = (product: ProductSeed) => {
    SoundFx.playBeep();
    if (product.unit === 'kg') {
      setScaleProduct(product);
      setScaleWeight(1.000);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const increment = 1;
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + increment }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    if (qty < item.quantity) {
      executeRestrictedAction('Disminuir cantidad de producto en caja', () => {
        setCart((prev) =>
          prev.map((item) =>
            item.product.id === productId ? { ...item, quantity: qty } : item
          )
        );
      });
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity: qty } : item
        )
      );
    }
  };

  const removeFromCart = (productId: string) => {
    executeRestrictedAction('Eliminar artículo del carrito', () => {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
    });
  };

  const clearCart = () => {
    executeRestrictedAction('Vaciar el carrito de compras', () => {
      setCart([]);
      if (customers.length > 0) {
        setSelectedCustomer(customers[0]);
      } else {
        setSelectedCustomer(CUSTOMERS_SEED[0]);
      }
      setReceivedCash('');
      setReceipt(null);
    });
  };

  // Crear Cliente Exprés desde Caja
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    const newCust: CustomerSeed = {
      id: `cust-${Date.now()}`,
      name: custName.trim(),
      creditEnabled: custCreditEnabled,
      creditLimit: custCreditEnabled ? parseFloat(custCreditLimit) || 0 : 0,
      currentBalance: 0,
      rfc: custRfc.trim() || undefined,
      phone: custPhone.trim() || undefined,
      paymentTermDays: custCreditEnabled ? custPaymentTermDays : undefined,
    };

    const updatedCustomers = [...customers, newCust];
    setCustomers(updatedCustomers);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('snapgad_pos_customers', JSON.stringify(updatedCustomers));
    }

    setSelectedCustomer(newCust);
    window.localStorage.setItem('snapgad_pos_selected_customer', JSON.stringify(newCust));

    // Resetear formulario
    setCustName('');
    setCustPhone('');
    setCustRfc('');
    setCustCreditEnabled(true);
    setCustCreditLimit('1000');
    setCustPaymentTermDays(15);
    setIsNewCustModalOpen(false);

    SoundFx.playSuccess();
    alert(`✓ Cliente "${newCust.name}" registrado y seleccionado con éxito.`);
  };

  const handlePrintReceipt = (txn: any) => {
    if (!txn) return;

    // Obtener ajustes guardados del ticket en LocalStorage
    let config = {
      slogan: '¡TU CÓMPLICE COMERCIAL!',
      marketingQr: 'https://maps.google.com',
      showTax: true,
      width: '80mm'
    };

    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('snapgad_ticket_config');
      if (saved) {
        try {
          config = { ...config, ...JSON.parse(saved) };
        } catch (e) {}
      }
    }

    const TICKET_QR_SVG = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="white" />
        <rect x="5" y="5" width="25" height="25" fill="black" />
        <rect x="9" y="9" width="17" height="17" fill="white" />
        <rect x="13" y="13" width="9" height="9" fill="black" />
        <rect x="70" y="5" width="25" height="25" fill="black" />
        <rect x="74" y="9" width="17" height="17" fill="white" />
        <rect x="78" y="13" width="9" height="9" fill="black" />
        <rect x="5" y="70" width="25" height="25" fill="black" />
        <rect x="9" y="74" width="17" height="17" fill="white" />
        <rect x="13" y="78" width="9" height="9" fill="black" />
        <rect x="75" y="75" width="9" height="9" fill="black" />
        <rect x="77" y="77" width="5" height="5" fill="white" />
        <rect x="79" y="79" width="1" height="1" fill="black" />
        <rect x="35" y="5" width="5" height="10" fill="black" />
        <rect x="45" y="5" width="10" height="5" fill="black" />
        <rect x="60" y="10" width="5" height="15" fill="black" />
        <rect x="35" y="20" width="15" height="5" fill="black" />
        <rect x="55" y="20" width="5" height="5" fill="black" />
        <rect x="5" y="35" width="10" height="5" fill="black" />
        <rect x="20" y="35" width="5" height="15" fill="black" />
        <rect x="35" y="30" width="5" height="10" fill="black" />
        <rect x="45" y="35" width="10" height="5" fill="black" />
        <rect x="60" y="30" width="15" height="5" fill="black" />
        <rect x="80" y="35" width="15" height="10" fill="black" />
        <rect x="5" y="50" width="5" height="10" fill="black" />
        <rect x="15" y="55" width="15" height="5" fill="black" />
        <rect x="35" y="45" width="10" height="15" fill="black" />
        <rect x="50" y="50" width="5" height="5" fill="black" />
        <rect x="60" y="45" width="5" height="10" fill="black" />
        <rect x="70" y="50" width="15" height="5" fill="black" />
        <rect x="90" y="55" width="5" height="10" fill="black" />
        <rect x="35" y="70" width="5" height="5" fill="black" />
        <rect x="45" y="75" width="10" height="5" fill="black" />
        <rect x="40" y="85" width="5" height="10" fill="black" />
        <rect x="50" y="80" width="15" height="5" fill="black" />
        <rect x="60" y="70" width="5" height="5" fill="black" />
        <rect x="60" y="85" width="10" height="10" fill="black" />
      </svg>
    `;

    if (isHardwareBridgeConnected && wsRef.current) {
      const computedSubtotal = txn.subtotal !== undefined ? txn.subtotal : txn.total / 1.16;
      const computedIva = txn.iva !== undefined ? txn.iva : txn.total - computedSubtotal;
      const computedIeps = txn.ieps || 0;

      const structuredData = {
        title: 'SNAPGAD POS EXPRÉS',
        slogan: config.slogan,
        rfc: 'XAXX010101000',
        address: 'AV. REFORMA 120, CDMX',
        folio: txn.id,
        date: txn.date.split(',')[0] || txn.date,
        customer: txn.customer,
        items: txn.items.map((item: any) => ({
          qty: `${item.quantity} ${item.product.unit === 'kg' ? 'kg' : 'pza'}`,
          name: item.product.name,
          total: item.product.salePrice * item.quantity
        })),
        subtotal: config.showTax ? computedSubtotal : undefined,
        iva: config.showTax ? computedIva : undefined,
        ieps: config.showTax ? computedIeps : undefined,
        total: txn.total,
        paymentMethod: txn.paymentMethod.toUpperCase(),
        received: txn.total + (txn.change || 0),
        change: txn.change || 0,
        qrSvg: TICKET_QR_SVG,
        creditDetails: txn.creditDetails
      };

      wsRef.current.send(JSON.stringify({
        type: 'PRINT_RAW',
        payload: {
          printerName: selectedPrinter,
          settings: {
            ticketWidth: config.width
          },
          structuredData
        }
      }));
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const itemsRows = txn.items.map((item: any) => `
      <tr>
        <td style="padding: 4px 0; text-align: left; font-weight: bold;">${item.product.name}</td>
        <td style="padding: 4px 0; text-align: center;">${item.quantity} ${item.product.unit}</td>
        <td style="padding: 4px 0; text-align: right;">$${(item.product.salePrice * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');
    
    const subtotal = txn.total / 1.16;
    const tax = txn.total - subtotal;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket ${txn.id}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 10px 0;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            .header-title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
            .qr-code {
              width: 100px;
              height: 100px;
              margin: 10px auto;
              background-color: #000;
              display: block;
              border: 8px solid #fff;
              box-shadow: 0 0 0 1px #000;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <span class="header-title">SNAPGAD POS</span><br/>
            <span>EXPRÉS & CORPORATIVO</span><br/>
            <span>RFC: XAXX010101000</span><br/>
            <span>SUCURSAL MATRIZ</span><br/>
            <span>AV. REFORMA 120, CDMX</span>
          </div>
          <div class="divider"></div>
          <div>
            <span>FOLIO: ${txn.id}</span><br/>
            <span>FECHA: ${txn.date}</span><br/>
            <span>CLIENTE: ${txn.customer}</span>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left; padding-bottom: 4px;">CONCEPTO</th>
                <th style="text-align: center; padding-bottom: 4px;">CANT</th>
                <th style="text-align: right; padding-bottom: 4px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="text-right">
            <span>SUBTOTAL: $${subtotal.toFixed(2)}</span><br/>
            <span>IVA (16%): $${tax.toFixed(2)}</span><br/>
            <span class="bold" style="font-size: 12px;">TOTAL: $${txn.total.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div>
            <span>MÉTODO PAGO: ${txn.paymentMethod.toUpperCase()}</span><br/>
            <span>RECIBIDO: $${(txn.total + (txn.change || 0)).toFixed(2)}</span><br/>
            <span>CAMBIO: $${(txn.change || 0).toFixed(2)}</span>
          </div>
          ${txn.creditDetails ? `
            <div class="divider"></div>
            <div class="text-center bold" style="font-size: 10px;">DETALLE DE CRÉDITO Y ADEUDO</div>
            <div class="divider"></div>
            <div style="font-family: monospace; font-size: 10px;">
              <div style="display: flex; justify-content: space-between;">
                <span>Límite Crédito:</span>
                <span>$${txn.creditDetails.creditLimit.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Saldo Anterior:</span>
                <span>$${txn.creditDetails.previousBalance.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Cargo Compra:</span>
                <span>$${txn.total.toFixed(2)}</span>
              </div>
              <div class="divider" style="margin: 4px 0;"></div>
              <div style="display: flex; justify-content: space-between; font-weight: bold;">
                <span>NUEVO SALDO:</span>
                <span>$${txn.creditDetails.newBalance.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 2px; color: #555;">
                <span>FECHA LÍMITE:</span>
                <span>${new Date(txn.creditDetails.dueDate).toLocaleDateString('es-MX')}</span>
              </div>
            </div>
          ` : ''}
          <div class="divider"></div>
          <div class="text-center">
            <span>¡GRACIAS POR SU COMPRA!</span><br/>
            <span style="font-size: 8px;">REGULADO BAJO LA NOM-151</span><br/>
            <!-- QR code representation -->
            <div class="qr-code"></div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Procesar Transacción de Cobro
  const handlePayment = () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'credit' && (creditLimitWarning || isCustomerOverdue)) return;

    setIsProcessingPayment(true);

    setTimeout(async () => {
      const transactionId = `txn-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      
      // Registrar venta en el turno activo
      recordSale(total, paymentMethod);

      // Descontar inventario in-memory de PRODUCTS_SEED utilizando lógica FEFO (First Expired, First Out)
      cart.forEach((item) => {
        const prod = PRODUCTS_SEED.find((p) => p.id === item.product.id);
        if (prod) {
          // Descontar stock general y stock de la sucursal activa
          prod.stock = Math.max(0, prod.stock - item.quantity);
          if (prod.stockPerBranch) {
            prod.stockPerBranch[activeBranch] = Math.max(0, (prod.stockPerBranch[activeBranch] || 0) - item.quantity);
          }

          // Si el producto rastrea caducidad y tiene lotes
          if (prod.trackExpiry && prod.expirationBatch && prod.expirationBatch.length > 0) {
            // Ordenar los lotes por fecha de caducidad ascendente (los más viejos primero)
            const sortedBatches = [...prod.expirationBatch].sort((a, b) => {
              const dateA = new Date(a.expiryDate).getTime();
              const dateB = new Date(b.expiryDate).getTime();
              return dateA - dateB;
            });

            let remainingQty = item.quantity;
            for (const batch of sortedBatches) {
              if (remainingQty <= 0) break;
              if (batch.stock > 0) {
                const depleted = Math.min(batch.stock, remainingQty);
                batch.stock -= depleted;
                remainingQty -= depleted;
              }
            }
            // Guardar la lista de lotes actualizada
            prod.expirationBatch = sortedBatches;
          }
        }
      });

      // Sincronizar catálogo actualizado con localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('snapgad_pos_products_catalog', JSON.stringify(PRODUCTS_SEED));
      }

      let updatedCreditDetails = null;

      // Si el método de pago es a crédito, mutar saldo del cliente y plazos de pago
      if (paymentMethod === 'credit' && selectedCustomer) {
        const days = selectedCustomer.paymentTermDays || 15;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        const dueDateString = dueDate.toISOString().split('T')[0];

        const prevBal = selectedCustomer.currentBalance;
        const newBal = prevBal + total;

        updatedCreditDetails = {
          creditLimit: selectedCustomer.creditLimit,
          previousBalance: prevBal,
          newBalance: newBal,
          dueDate: dueDateString
        };

        const updatedCustomers = customers.map((c) => {
          if (c.id === selectedCustomer.id) {
            const updated = {
              ...c,
              currentBalance: newBal,
              lastCreditDate: new Date().toISOString().split('T')[0],
              creditDueDate: dueDateString
            };
            setSelectedCustomer(updated);
            window.localStorage.setItem('snapgad_pos_selected_customer', JSON.stringify(updated));
            return updated;
          }
          return c;
        });
        setCustomers(updatedCustomers);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('snapgad_pos_customers', JSON.stringify(updatedCustomers));
        }
      }

      const newTransaction = {
        id: transactionId,
        items: cart,
        total,
        subtotal,
        iva,
        ieps,
        customer: selectedCustomer ? selectedCustomer.name : 'Público General',
        paymentMethod,
        change: calculatedChange,
        date: new Date().toLocaleString('es-MX'),
        isOffline: !isOnline,
        creditDetails: updatedCreditDetails
      };

      if (!isOnline) {
        try {
          const offlineTxn = {
            id: transactionId,
            cart: cart.map(item => ({
              productId: item.product.id,
              productName: item.product.name,
              quantity: item.quantity,
              salePrice: item.product.salePrice
            })),
            total,
            paymentMethod,
            createdAt: new Date().toISOString()
          };
          await saveOfflineSale(offlineTxn);
        } catch (err) {
          console.error('Failed to save offline sale to IndexedDB:', err);
        }
      }

      setReceipt(newTransaction);
      handlePrintReceipt(newTransaction);
      SoundFx.playSuccess();
      setIsProcessingPayment(false);
      setCart([]);
      setReceivedCash('');
      if (searchInputRef.current) searchInputRef.current.focus();
    }, 600);
  };

  // Cambio en efectivo
  const calculatedChange = useMemo(() => {
    const cash = parseFloat(receivedCash);
    if (isNaN(cash) || cash < total) return 0;
    return cash - total;
  }, [receivedCash, total]);

  // Aplicar Billetes Rápidos
  const applyQuickBill = (bill: number) => {
    const cash = parseFloat(receivedCash) || 0;
    setReceivedCash(String(cash + bill));
  };

  // Lectura Simulada de Báscula (Web Serial API USB Simulator)
  const handleReadScale = () => {
    setIsScaleCalibrating(true);
    setTimeout(() => {
      const randomWeight = +(0.500 + Math.random() * 4.500).toFixed(3);
      setScaleWeight(randomWeight);
      setIsScaleCalibrating(false);
    }, 700);
  };

  // Confirmar peso en carrito
  const confirmScaleWeight = () => {
    if (!scaleProduct) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === scaleProduct.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === scaleProduct.id
            ? { ...item, quantity: scaleWeight }
            : item
        );
      }
      return [...prev, { product: scaleProduct, quantity: scaleWeight }];
    });
    setScaleProduct(null);
  };

  // Ejecutar el cierre de caja
  const handleCloseShift = () => {
    if (!activeShift) return;
    const finalDrawerCash = parseFloat(cashInDrawer) || 0;
    const finalDrawerCards = parseFloat(cardsDeclared) || 0;
    const expectedDrawerCash = activeShift.openingCash + activeShift.salesByCash;
    const expectedDrawerCards = activeShift.salesByCard;
    const difference = finalDrawerCash - expectedDrawerCash;
    const cardDifference = finalDrawerCards - expectedDrawerCards;

    const summary = {
      ...activeShift,
      closedAt: new Date(),
      finalDrawerCash,
      expectedDrawerCash,
      difference,
      finalDrawerCards,
      expectedDrawerCards,
      cardDifference,
    };

    setCierreSummary(summary);
    
    // Disparar mensaje a Telegram / Gemini (En entorno real llamaría a trpc.telegram.sendNotification)
    console.log("Notificación de cierre de turno enviada a Telegram:", summary);

    closeShift();
  };

  // Lock Screen: If no active cashier is authenticated, show PIN Lock Screen
  if (!activeCashier) {
    return (
      <PinLockScreen
        onSuccess={(cashier) => {
          setActiveCashier(cashier);
        }}
      />
    );
  }

  // Prevenir carga si no hay turno
  if (!activeShift) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6">
        {cierreSummary ? (
          <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center font-bold text-white text-3xl mx-auto mb-6">
              ✓
            </div>
            <h2 className="text-2xl font-extrabold text-center mb-2">Turno Cerrado</h2>
            <p className="text-zinc-500 text-center text-xs mb-6">El reporte del turno ha sido consolidado y enviado a Telegram.</p>
            
            <div className="space-y-3 font-mono text-sm border-t border-zinc-800 pt-6 mb-8">
              <div className="flex justify-between">
                <span className="text-zinc-400">ID TURNO:</span>
                <span className="font-bold">{cierreSummary.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">FONDO INICIAL:</span>
                <span>${cierreSummary.openingCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">VENTAS EFECTIVO:</span>
                <span>${cierreSummary.salesByCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-400">EFECTIVO ESPERADO:</span>
                <span>${cierreSummary.expectedDrawerCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-zinc-800 pt-3">
                <span className="text-zinc-400">CAJA REAL:</span>
                <span className="font-bold text-white">${cierreSummary.finalDrawerCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">DIFERENCIA EFECTIVO:</span>
                <span className={`font-bold ${cierreSummary.difference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${cierreSummary.difference.toFixed(2)} {cierreSummary.difference >= 0 ? '(Sobrante)' : '(Faltante)'}
                </span>
              </div>

              {/* Blind card counts breakdown */}
              {cierreSummary.finalDrawerCards !== undefined && (
                <>
                  <div className="flex justify-between border-t border-dashed border-zinc-800 pt-3">
                    <span className="text-zinc-400">TARJETA DECLARADA:</span>
                    <span className="font-bold text-white">${cierreSummary.finalDrawerCards.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span className="text-zinc-400">TARJETA ESPERADA:</span>
                    <span>${cierreSummary.expectedDrawerCards.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">DIFERENCIA TARJETA:</span>
                    <span className={`font-bold ${cierreSummary.cardDifference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${cierreSummary.cardDifference.toFixed(2)} {cierreSummary.cardDifference >= 0 ? '(Sobrante)' : '(Faltante)'}
                    </span>
                  </div>
                </>
              )}

              <div className="border-t border-zinc-800 pt-4 mt-4 space-y-1">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>VENTAS TARJETA:</span>
                  <span>${cierreSummary.salesByCard.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>VENTAS TRANSFERENCIA:</span>
                  <span>${cierreSummary.salesByTransfer.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>CRÉDITO (FIADO):</span>
                  <span>${cierreSummary.salesByCredit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setCierreSummary(null);
                router.push('/pos/turno');
              }}
              className="w-full py-4 bg-blue-700 hover:bg-blue-600 font-extrabold text-sm tracking-wider rounded-xl transition-all"
            >
              INICIAR NUEVO TURNO
            </button>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Verificando Turno...</h2>
            <button
              onClick={() => router.push('/pos/turno')}
              className="px-6 py-3 bg-blue-700 rounded-xl font-bold"
            >
              Ir a Abrir Turno
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      
      {/* 1. Barra de Navegación Lateral (Sidebar) */}
      <Sidebar onTriggerAction={(path) => {
        setPinTargetAction(path);
        setPinSuccessCallback(null);
        setIsAdminPinOpen(true);
      }} />

      {/* Contenedor del Cuerpo Principal del POS */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Cabecera Operativa Principal */}
        <header className="px-6 py-4 flex justify-between items-center border-b border-slate-200 bg-white shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="font-extrabold text-slate-800 text-lg tracking-tight">Caja Registradora</h1>
            <span className="text-[10px] ml-1 bg-blue-100 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {activeBranch}
            </span>
          </div>

          {/* Info del Turno, Reloj e Interruptor de Cierre */}
          <div className="flex items-center gap-4">
            
            {/* Indicador Neon de Estado de Conexión */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-amber-500 shadow-[0_0_6px_#f59e0b] animate-pulse'}`} />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                {isOnline ? 'En Línea' : 'Offline'}
              </span>
            </div>

            {/* Indicador de Perfil Comercial Activo */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-100 text-[10px] font-extrabold uppercase tracking-widest bg-blue-50 text-blue-700">
              <span>
                {activeProfile === 'general' && '🛍️ TIENDA GENERAL'}
                {activeProfile === 'weight' && '🥩 PESO Y GRANEL'}
                {activeProfile === 'catalog' && '🔧 CATÁLOGO ESPECIALIZADO'}
                {activeProfile === 'distribution' && '🚚 DISTRIBUCIÓN B2B'}
                {activeProfile === 'services' && '✂️ SERVICIOS'}
              </span>
            </div>

            {/* Muestra selector de rol para DEV únicamente */}
            <div className="flex gap-1 border border-slate-200 p-1 rounded-lg bg-slate-50">
              {(['cashier', 'admin', 'owner'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleForDev(r)}
                  className="px-2 py-1 text-[10px] font-bold rounded transition-all"
                  style={{
                    backgroundColor: session.role === r ? '#0066FF' : 'transparent',
                    color: session.role === r ? '#ffffff' : '#64748B'
                  }}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-slate-500 font-bold">
              TURNO: <span className="font-extrabold text-blue-600">{elapsedTime}</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {activeShift.cashierName}
            </div>

            <button
              onClick={() => {
                SoundFx.playBeep();
                setPinSuccessCallback(() => () => setIsCierreModalOpen(true));
                setIsAdminPinOpen(true);
              }}
              className="px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-extrabold transition-all uppercase tracking-wider"
            >
              CERRAR CAJA
            </button>
          </div>
        </header>

        {/* 2. Cuerpo del POS (Grid de Layout) */}
        <div className="flex-grow grid grid-cols-12 overflow-hidden bg-slate-50">
          
          {/* COLUMNA IZQUIERDA: Catálogo de lookup y Favoritos (7/12 cols) */}
          <div className="col-span-7 p-6 border-r border-slate-200 flex flex-col h-[calc(100vh-67px)]">
          
          {/* Barra de Filtros de Catálogo */}
          <div className="flex gap-4 mb-4">
            <input
              ref={searchInputRef}
              id="pos-search-input"
              type="text"
              placeholder="Escribe código de barras, código interno o descripción..."
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                setSearch(val);
                const cleanVal = val.trim();
                if (cleanVal.length >= 2) {
                  const match = PRODUCTS_SEED.find(
                    (p) => p.barcode === cleanVal || p.internalCode.toUpperCase() === cleanVal.toUpperCase()
                  );
                  if (match) {
                    addToCart(match);
                    setSearch('');
                  }
                }
              }}
              className="flex-grow p-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              style={{ 
                backgroundColor: 'var(--card)', 
                borderColor: 'var(--card-border)',
                color: 'var(--foreground)'
              }}
            />

            {/* Registrar Merma Button (Perfil B: Peso y Granel) */}
            {configBascula && (
              <button
                type="button"
                onClick={() => {
                  SoundFx.playBeep();
                  // Default to first product or first kg product
                  const kgProd = PRODUCTS_SEED.find(p => p.unit === 'kg') || PRODUCTS_SEED[0];
                  setMermaProduct(kgProd);
                  setMermaQty('0.500');
                  setIsMermaModalOpen(true);
                }}
                className="px-4 py-3 rounded-xl bg-amber-600/20 hover:bg-amber-600 border border-amber-500/30 text-amber-400 hover:text-white font-extrabold text-xs uppercase transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                ⚖️ Registrar Merma
              </button>
            )}
          </div>

          {/* Grid de Acceso Rápido (Favoritos) */}
          <div className="mb-4">
            <span className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
              {['weight', 'services'].includes(activeProfile) ? '🥩 BOTONES TÁCTILES RÁPIDOS (TOP 20)' : 'PRODUCTOS DE ACCESO RÁPIDO'}
            </span>
            <div id="pos-favorites-grid" className={`grid gap-2 ${['weight', 'services'].includes(activeProfile) ? 'grid-cols-4' : 'grid-cols-6'}`}>
              {quickAccessProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`px-2 rounded-xl border hover:border-blue-500 transition-all text-center flex flex-col justify-between ${
                    ['weight', 'services'].includes(activeProfile)
                      ? 'py-4 h-24 bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:scale-[1.03]'
                      : 'py-2.5 h-16 bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <span className={`font-bold truncate w-full ${['weight', 'services'].includes(activeProfile) ? 'text-xs text-white' : 'text-[10px]'}`}>{p.name}</span>
                  <span className={`font-extrabold font-mono ${
                    ['weight', 'services'].includes(activeProfile)
                      ? 'text-sm text-amber-500'
                      : 'text-xs text-blue-700 dark:text-blue-400'
                  }`}>
                    ${p.salePrice.toFixed(2)}
                    {p.unit === 'kg' && <span className="text-[9px] text-zinc-500 font-normal">/kg</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tabs de Categorías */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                  category === cat
                    ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
                style={{ borderColor: category === cat ? 'transparent' : 'var(--card-border)' }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Grid de Productos */}
          <div className="flex-grow overflow-y-auto grid grid-cols-3 gap-3 pr-1">
            {filteredProducts.map((product) => {
              const sucursalStock = product.stockPerBranch?.[activeBranch] ?? product.stock;
              const isOutOfStock = sucursalStock <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (isOutOfStock) {
                      SoundFx.playWarning();
                      return;
                    }
                    addToCart(product);
                  }}
                  id={product.unit === 'kg' ? 'pos-scale-trigger' : undefined}
                  className={`p-4 rounded-xl border hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group ${
                    isOutOfStock 
                      ? 'border-orange-200 opacity-80' 
                      : 'hover:border-blue-500/40'
                  }`}
                  style={{ 
                    backgroundColor: isOutOfStock ? '#FFF8F6' : 'var(--card)', 
                    borderColor: isOutOfStock ? '#FFEBE5' : 'var(--card-border)' 
                  }}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                        {product.internalCode || 'GRANEL'}
                      </span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded font-mono ${
                        isOutOfStock ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {product.unit.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs tracking-tight line-clamp-2" style={{ color: 'var(--foreground)' }}>{product.name}</h3>
                  </div>

                  <div className="mt-3 flex justify-between items-baseline">
                    <span className={`text-[10px] font-mono font-semibold ${isOutOfStock ? 'text-orange-600' : 'text-slate-500'}`}>
                      {isOutOfStock 
                        ? 'SIN STOCK' 
                        : `Exist: ${sucursalStock.toFixed(product.unit === 'kg' ? 3 : 0)}`
                      }
                    </span>
                    <span className="text-md font-extrabold text-blue-600 font-mono">
                      ${product.salePrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-3 text-center py-20 text-zinc-500 text-sm">
                No se encontraron productos en el catálogo.
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Carrito y Controles de Venta (5/12 cols) */}
        <div id="pos-cart-panel" className="col-span-5 p-6 flex flex-col h-[calc(100vh-67px)] justify-between bg-white border-l border-slate-200">
          
          {/* Carrito de Productos */}
          <div className="flex-grow flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 pb-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
              <h2 className="font-extrabold text-xs tracking-wider uppercase text-zinc-400">RESUMEN DE VENTA</h2>
              <button 
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-500 font-bold"
              >
                VACIAR CARRITO
              </button>
            </div>

            {/* Lista del Carrito */}
            <div className="flex-grow overflow-y-auto pr-1">
              {cart.map((item) => (
                <div 
                  key={item.product.id} 
                  className="flex items-center justify-between py-2.5 border-b"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <div className="flex-grow pr-4">
                    <h4 className="font-bold text-xs" style={{ color: 'var(--foreground)' }}>{item.product.name}</h4>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                      ${(() => {
                        let unitPrice = item.product.salePrice;
                        if (['catalog', 'distribution'].includes(activeProfile)) {
                          if (priceTier === 'contractor') {
                            unitPrice = item.product.wholesalePrice || +(item.product.salePrice * 0.93).toFixed(2);
                          } else if (priceTier === 'wholesale') {
                            unitPrice = item.product.wholesalePrice || +(item.product.salePrice * 0.88).toFixed(2);
                          }
                        }
                        return unitPrice.toFixed(2);
                      })()} por {item.product.unit}
                      {['catalog', 'distribution'].includes(activeProfile) && priceTier !== 'retail' && (
                        <span className="ml-1 text-[8px] bg-purple-950 text-purple-400 px-1 py-0.5 rounded font-extrabold">
                          {priceTier === 'contractor' ? 'CONTRATISTA' : 'MAYORISTA'}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Modificador de Cantidad */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - (item.product.unit === 'kg' ? 0.25 : 1))}
                      className="w-5 h-5 rounded border flex items-center justify-center text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      style={{ borderColor: 'var(--card-border)' }}
                    >
                      -
                    </button>
                    
                    <input
                      type="number"
                      value={item.quantity}
                      step={item.product.unit === 'kg' ? '0.05' : '1'}
                      onChange={(e) => updateQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                      className="w-14 p-0.5 text-center text-xs font-mono font-bold rounded border"
                      style={{ 
                        backgroundColor: 'var(--background)',
                        borderColor: 'var(--card-border)',
                        color: 'var(--foreground)'
                      }}
                    />

                    {item.product.unit === 'kg' && (
                      <button
                        type="button"
                        onClick={async () => {
                          SoundFx.playBeep();
                          await new Promise(r => setTimeout(r, 600));
                          updateQuantity(item.product.id, 1.350);
                          SoundFx.playSuccess();
                        }}
                        className="w-5 h-5 rounded border bg-emerald-600/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white flex items-center justify-center text-[10px] font-bold"
                        title="Adquirir peso de Báscula (COM3)"
                      >
                        ⚖️
                      </button>
                    )}

                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + (item.product.unit === 'kg' ? 0.25 : 1))}
                      className="w-5 h-5 rounded border flex items-center justify-center text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      style={{ borderColor: 'var(--card-border)' }}
                    >
                      +
                    </button>
                  </div>

                  {/* Total Item */}
                  <div className="w-20 text-right font-extrabold text-xs font-mono">
                    ${(() => {
                      let unitPrice = item.product.salePrice;
                      if (['catalog', 'distribution'].includes(activeProfile)) {
                        if (priceTier === 'contractor') {
                          unitPrice = item.product.wholesalePrice || +(item.product.salePrice * 0.93).toFixed(2);
                        } else if (priceTier === 'wholesale') {
                          unitPrice = item.product.wholesalePrice || +(item.product.salePrice * 0.88).toFixed(2);
                        }
                      }
                      return (unitPrice * item.quantity).toFixed(2);
                    })()}
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="text-center py-20 text-zinc-500 text-xs">
                  Caja vacía. Seleccione favoritos o use el catálogo.
                </div>
              )}
            </div>
          </div>

          {/* Controles de Selección de Crédito y Totales */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
            
            {/* Selección de Cliente / Crédito */}
            <div className="mb-4 space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  CLIENTE / CRÉDITO DE FIADO
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(true)}
                  className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-400 hover:text-white rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer"
                >
                  👤+ Nuevo Cliente
                </button>
              </div>

              <div className="flex gap-2">
                <select
                  id="pos-customer-select"
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const cust = customers.find((c) => c.id === e.target.value);
                    if (cust) {
                      setSelectedCustomer(cust);
                      window.localStorage.setItem('snapgad_pos_selected_customer', JSON.stringify(cust));
                    }
                  }}
                  className="w-full p-2 rounded-lg border text-xs font-bold bg-zinc-900 border-zinc-800 text-white focus:outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Selector de Nivel de Precio para Catálogo/Distribución */}
                {['catalog', 'distribution'].includes(activeProfile) && (
                  <select
                    value={priceTier}
                    onChange={(e) => {
                      SoundFx.playBeep();
                      setPriceTier(e.target.value as any);
                    }}
                    className="p-2 rounded-lg border text-xs font-extrabold uppercase bg-zinc-900 border-purple-800 text-purple-400 focus:outline-none shrink-0"
                    title="Nivel de Precio Activo"
                  >
                    <option value="retail">🛍️ PÚBLICO</option>
                    <option value="contractor">👷 CONTRATISTA</option>
                    <option value="wholesale">📦 MAYORISTA</option>
                  </select>
                )}
              </div>

              {/* Tarjeta de Detalles del Cliente Seleccionado */}
              {selectedCustomer && (
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs space-y-2 font-mono relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Resumen de Cuenta:</span>
                    {selectedCustomer.creditEnabled ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                        Crédito Activo
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                        Solo Contado
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center border-t border-zinc-900 pt-2">
                    <div>
                      <span className="text-zinc-500 block text-[9px] uppercase">Límite</span>
                      <span className="text-zinc-300 font-bold font-mono">
                        {selectedCustomer.creditEnabled ? `$${selectedCustomer.creditLimit.toFixed(0)}` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px] uppercase">Deuda</span>
                      <span className={`font-bold font-mono ${selectedCustomer.currentBalance > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                        ${selectedCustomer.currentBalance.toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px] uppercase">Disponible</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {selectedCustomer.creditEnabled 
                          ? `$${Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentBalance).toFixed(0)}`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Advertencia de Plazo de Pago Vencido */}
                  {selectedCustomer.creditEnabled && selectedCustomer.creditDueDate && (() => {
                    const isOverdue = Date.now() > new Date(selectedCustomer.creditDueDate).getTime();
                    if (isOverdue && selectedCustomer.currentBalance > 0) {
                      return (
                        <div className="mt-2 p-2 bg-red-950/60 border border-red-500/20 rounded flex items-center gap-1.5 text-[10px] text-red-400 font-bold uppercase animate-pulse">
                          <span>⚠️ PLAZO DE PAGO VENCIDO:</span>
                          <span>{new Date(selectedCustomer.creditDueDate).toLocaleDateString('es-MX')}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {creditLimitWarning && (
                <div className="mt-2 text-xs font-bold p-2 rounded border bg-red-950/60 text-red-400 border-red-500/20 animate-pulse">
                  LÍMITE DE CRÉDITO EXCEDIDO. Venta bloqueada.
                </div>
              )}
            </div>

            {/* Configuración de Impresora Local (Hardware Bridge) */}
            {isHardwareBridgeConnected && (
              <div className="mb-4">
                <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  🖨️ IMPRESORA TÉRMICA LOCAL (SILENCIOSA)
                </label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full p-2 rounded-lg border text-xs font-bold"
                  style={{ 
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--foreground)'
                  }}
                >
                  {printers.length === 0 ? (
                    <option value="">Buscando impresoras del sistema...</option>
                  ) : (
                    printers.map((printer) => (
                      <option key={printer.name} value={printer.name}>
                        {printer.name} {printer.isDefault ? ' (Predeterminada)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Desglose de Totales */}
            <div className="flex flex-col gap-1.5 mb-4">
              <div className="flex justify-between text-xs font-semibold text-zinc-400">
                <span>SUBTOTAL NETO</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              {iva > 0 && (
                <div className="flex justify-between text-xs font-semibold text-zinc-400">
                  <span>IVA TRASLADADO</span>
                  <span className="font-mono">${iva.toFixed(2)}</span>
                </div>
              )}
              {ieps > 0 && (
                <div className="flex justify-between text-xs font-semibold text-zinc-400">
                  <span>IEPS TRASLADADO</span>
                  <span className="font-mono">${ieps.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-extrabold border-t pt-2" style={{ borderColor: 'var(--card-border)' }}>
                <span>TOTAL A COBRAR</span>
                <span className="font-mono text-blue-700 dark:text-blue-400">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Panel de Cobro */}
            {receipt ? (
              <div className="p-4 rounded-xl border mb-2" style={{ backgroundColor: 'var(--success-background)', color: 'var(--success)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-extrabold text-xs uppercase">Cobro Exitoso</h4>
                  <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded font-bold">{receipt.id}</span>
                </div>
                 <p className="text-xs font-mono">
                  Total: ${receipt.total.toFixed(2)} &middot; Método: {receipt.paymentMethod.toUpperCase()}
                </p>

                {receipt.creditDetails && (
                  <div className="mt-3 p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2 text-xs font-mono">
                    <div className="flex justify-between font-bold text-red-400">
                      <span>ESTADO DE CUENTA (FIADO)</span>
                      <span>DEUDA</span>
                    </div>
                    <div className="border-t border-zinc-900/80 my-1 pt-1 space-y-1 text-zinc-300">
                      <div className="flex justify-between">
                        <span>Límite autorizado:</span>
                        <span>${receipt.creditDetails.creditLimit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saldo anterior:</span>
                        <span>${receipt.creditDetails.previousBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Esta compra:</span>
                        <span>+${receipt.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-white border-t border-dashed border-zinc-800 pt-1 mt-1">
                        <span>NUEVO SALDO DEUDOR:</span>
                        <span className="text-red-400">${receipt.creditDetails.newBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-zinc-400 text-[10px] mt-1">
                        <span>FECHA LÍMITE DE PAGO:</span>
                        <span className="text-amber-400">{new Date(receipt.creditDetails.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => handlePrintReceipt(receipt)}
                    className="w-1/3 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-lg border-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    🖨️ REIMPRIMIR
                  </button>
                  <button 
                    onClick={clearCart}
                    className="w-2/3 py-2 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg border-none cursor-pointer"
                  >
                    SIGUIENTE COMPRADOR
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Métodos de Pago */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {(['cash', 'card', 'transfer', 'credit'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      disabled={method === 'credit' && (!selectedCustomer || !selectedCustomer.creditEnabled)}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${
                        paymentMethod === method
                          ? 'bg-blue-700 text-white border-blue-800'
                          : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                      style={{ borderColor: paymentMethod === method ? 'transparent' : 'var(--card-border)' }}
                    >
                      {method.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Si se cobra en efectivo */}
                {paymentMethod === 'cash' && (
                  <div className="mb-3 space-y-2">
                    {/* Botones de billetes rápidos (Eleventa-level) */}
                    <div className="flex gap-1">
                      {QUICK_CASH_BILLS.map((bill) => (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => applyQuickBill(bill)}
                          className="flex-grow py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold border border-zinc-700"
                        >
                          +${bill}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setReceivedCash(total.toFixed(2))}
                        className="py-1 px-2 rounded bg-blue-600 hover:bg-blue-500 text-[10px] font-bold text-white border border-blue-500"
                      >
                        Exacto
                      </button>
                    </div>

                    <div className="flex gap-4 items-center">
                      <input
                        type="text"
                        placeholder="Efectivo recibido..."
                        value={receivedCash}
                        onChange={(e) => setReceivedCash(e.target.value)}
                        className="w-1/2 p-2 rounded-lg border text-xs font-mono font-bold"
                        style={{ 
                           backgroundColor: 'var(--background)',
                           borderColor: 'var(--card-border)',
                           color: 'var(--foreground)'
                        }}
                      />
                      <div className="w-1/2 text-right">
                        <span className="block text-[9px] text-zinc-500 uppercase font-bold">Cambio</span>
                        <strong className="text-sm font-mono text-zinc-200">${calculatedChange.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Si se cobra a Crédito (Fiado) - Personalizador de Plazos de Pago y Límites */}
                {paymentMethod === 'credit' && selectedCustomer && (
                  <div className="mb-3 p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl space-y-3">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                      💳 Personalizador de Cuenta de Fiado
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] font-bold text-zinc-400 uppercase mb-1">
                          LÍMITE MÁXIMO ($)
                        </label>
                        <input
                          type="number"
                          value={selectedCustomer.creditLimit}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = { ...selectedCustomer, creditLimit: val };
                            setSelectedCustomer(updated);
                            // También actualizar en la lista
                            setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? updated : c));
                          }}
                          className="w-full p-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-white text-center"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[8px] font-bold text-zinc-400 uppercase mb-1">
                          PLAZO LÍMITE (DÍAS)
                        </label>
                        <select
                          value={selectedCustomer.paymentTermDays || 15}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 15;
                            // Calcular nueva fecha
                            const dueDate = new Date();
                            dueDate.setDate(dueDate.getDate() + val);
                            const updated = { 
                              ...selectedCustomer, 
                              paymentTermDays: val,
                              creditDueDate: dueDate.toISOString().split('T')[0]
                            };
                            setSelectedCustomer(updated);
                            setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? updated : c));
                          }}
                          className="w-full p-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-bold text-white text-center cursor-pointer"
                        >
                          <option value="7">7 Días (Semanal)</option>
                          <option value="15">15 Días (Quincenal)</option>
                          <option value="30">30 Días (Mensual)</option>
                          <option value="45">45 Días (Especial)</option>
                        </select>
                      </div>
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1 block">
                      Establecido para cobrar el: <strong className="text-white font-mono">{selectedCustomer.creditDueDate ? new Date(selectedCustomer.creditDueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hoy'}</strong>
                    </span>
                  </div>
                )}

                {/* Botón de Cobro Principal */}
                <button
                  type="button"
                  id="pos-checkout-btn"
                  disabled={
                    cart.length === 0 || 
                    isProcessingPayment || 
                    (paymentMethod === 'credit' && (creditLimitWarning || isCustomerOverdue))
                  }
                  onClick={handlePayment}
                  className="w-full py-3.5 rounded-xl text-white font-extrabold text-xs tracking-wider border-none shadow-md cursor-pointer transition-all hover:brightness-110 uppercase"
                  style={{
                    backgroundColor: (paymentMethod === 'credit' && (creditLimitWarning || isCustomerOverdue)) ? '#dc2626' : 'var(--success)',
                    opacity: cart.length === 0 || isProcessingPayment ? 0.5 : 1,
                  }}
                >
                  {isProcessingPayment ? (
                    'PROCESANDO COBRO...'
                  ) : paymentMethod === 'credit' && creditLimitWarning ? (
                    '❌ LÍMITE EXCEDIDO'
                  ) : paymentMethod === 'credit' && isCustomerOverdue ? (
                    '❌ PLAZO DE PAGO VENCIDO'
                  ) : (
                    `PROCESAR COBRO ($${total.toFixed(2)})`
                  )}
                </button>

                {/* Botón de Cotización para Catálogo/Distribución */}
                {['catalog', 'distribution'].includes(activeProfile) && cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      SoundFx.playSuccess();
                      const quoteTxn = {
                        id: `COT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                        date: new Date().toLocaleString('es-MX'),
                        customer: selectedCustomer ? selectedCustomer.name : 'Público General',
                        items: cart.map(item => {
                          let unitPrice = item.product.salePrice;
                          if (priceTier === 'contractor') {
                            unitPrice = item.product.wholesalePrice || +(item.product.salePrice * 0.93).toFixed(2);
                          } else if (priceTier === 'wholesale') {
                            unitPrice = item.product.wholesalePrice || +(item.product.salePrice * 0.88).toFixed(2);
                          }
                          return {
                            ...item,
                            product: { ...item.product, salePrice: unitPrice }
                          };
                        }),
                        total,
                        subtotal,
                        iva,
                        ieps
                      };
                      
                      // Renders a gorgeous quotation print screen!
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) return;
                      
                      const itemsRows = quoteTxn.items.map((item: any) => `
                        <tr>
                          <td style="padding: 6px 0; text-align: left; border-bottom: 1px solid #eee;">
                            <span style="font-weight: bold; color: #111;">${item.product.name}</span><br/>
                            <span style="font-size: 8px; color: #666;">Cód: ${item.product.internalCode}</span>
                          </td>
                          <td style="padding: 6px 0; text-align: center; border-bottom: 1px solid #eee; font-family: monospace;">${item.quantity} ${item.product.unit}</td>
                          <td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #eee; font-family: monospace;">$${item.product.salePrice.toFixed(2)}</td>
                          <td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #eee; font-family: monospace; font-weight: bold;">$${(item.product.salePrice * item.quantity).toFixed(2)}</td>
                        </tr>
                      `).join('');

                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Cotización ${quoteTxn.id}</title>
                            <style>
                              body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #333; line-height: 1.5; }
                              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #5b21b6; padding-bottom: 15px; margin-bottom: 20px; }
                              .logo { font-size: 20px; font-weight: 900; color: #5b21b6; }
                              .title { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #111; }
                              .info-table { width: 100%; margin-bottom: 30px; font-size: 11px; }
                              table.items { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
                              th { background-color: #f3e8ff; color: #5b21b6; font-weight: bold; text-align: left; padding: 8px; }
                              td { padding: 8px; }
                              .totals { width: 40%; margin-left: auto; font-size: 11px; font-family: monospace; }
                              .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
                              .footer { margin-top: 50px; font-size: 9px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 15px; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div>
                                <span class="logo">SNAPGAD POS</span><br/>
                                <span style="font-size: 10px; color: #666;">Ferreterías, Refacciones y Soluciones Especiales</span>
                              </div>
                              <div style="text-align: right;">
                                <span class="title">COTIZACIÓN FORMAL</span><br/>
                                <span style="font-family: monospace; font-weight: bold;">Nº: ${quoteTxn.id}</span>
                              </div>
                            </div>
                            <table class="info-table">
                              <tr>
                                <td style="width: 50%;">
                                  <strong>EMISOR:</strong><br/>
                                  SNAPGAD CORPORATIVO S.A. DE C.V.<br/>
                                  RFC: SCO180905XX0<br/>
                                  Av. Vallarta 3200, Guadalajara, Jal.
                                </td>
                                <td style="width: 50%; text-align: right;">
                                  <strong>CLIENTE COTIZADO:</strong><br/>
                                  ${quoteTxn.customer}<br/>
                                  Nivel de Precio: ${priceTier === 'wholesale' ? 'Mayorista (12% dto)' : priceTier === 'contractor' ? 'Contratista (7% dto)' : 'Público General'}<br/>
                                  <strong>FECHA GENERACIÓN:</strong> ${quoteTxn.date}
                                </td>
                              </tr>
                            </table>
                            <table class="items">
                              <thead>
                                <tr>
                                  <th>CONCEPTO / DESCRIPCIÓN</th>
                                  <th style="text-align: center;">CANTIDAD</th>
                                  <th style="text-align: right;">PRECIO UNIT</th>
                                  <th style="text-align: right;">TOTAL ITEM</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${itemsRows}
                              </tbody>
                            </table>
                            <div class="totals">
                              <div><span>Subtotal Neto:</span><span>$${quoteTxn.subtotal.toFixed(2)}</span></div>
                              <div><span>IVA (16%):</span><span>$${quoteTxn.iva.toFixed(2)}</span></div>
                              ${quoteTxn.ieps > 0 ? `<div><span>IEPS:</span><span>$${quoteTxn.ieps.toFixed(2)}</span></div>` : ''}
                              <div style="border-top: 2px solid #5b21b6; padding-top: 8px; font-size: 13px; font-weight: bold; color: #111;">
                                <span>TOTAL:</span><span>$${quoteTxn.total.toFixed(2)}</span>
                              </div>
                            </div>
                            <div class="footer">
                              <span>Esta cotización tiene una validez de 15 días naturales a partir de la fecha de generación. Precios sujetos a cambios sin previo aviso.</span><br/>
                              <span>¡GRACIAS POR SU PREFERENCIA!</span>
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => {
                        printWindow.print();
                        printWindow.close();
                      }, 250);
                    }}
                    className="w-full mt-2 py-2.5 bg-purple-900/30 hover:bg-purple-700/40 border border-purple-500/40 text-purple-400 font-extrabold text-xs tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    📝 GENERAR COTIZACIÓN FORMAL (PDF)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. MODAL DE CIERRE DE CAJA (Shift Closure) */}
      {isCierreModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border shadow-2xl" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <h3 className="text-xl font-extrabold mb-2" style={{ color: 'var(--foreground)' }}>Cierre de Caja</h3>
            <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>Valida el dinero actual en el cajón antes de cerrar el turno comercial.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Efectivo Físico en Caja</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold" style={{ color: 'var(--muted)' }}>$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={cashInDrawer}
                    onChange={(e) => setCashInDrawer(e.target.value)}
                    className="w-full pl-7 pr-4 py-3 rounded-lg border font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Comprobantes de Tarjeta Declarados</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold" style={{ color: 'var(--muted)' }}>$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={cardsDeclared}
                    onChange={(e) => setCardsDeclared(e.target.value)}
                    className="w-full pl-7 pr-4 py-3 rounded-lg border font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>

              {/* Resumen del Turno del Contexto - Ocultado si es Cajero (Cierre a Ciegas) */}
              {session.role !== 'cashier' ? (
                <div className="rounded-lg p-3 font-mono text-xs space-y-2 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
                  <div className="flex justify-between" style={{ color: 'var(--muted)' }}>
                    <span>FONDO INICIAL:</span>
                    <span style={{ color: 'var(--foreground)' }}>${activeShift.openingCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--muted)' }}>
                    <span>VENTAS EFECTIVO:</span>
                    <span style={{ color: 'var(--foreground)' }}>${activeShift.salesByCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--muted)' }}>
                    <span>VENTAS TARJETA:</span>
                    <span style={{ color: 'var(--foreground)' }}>${activeShift.salesByCard.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed pt-2" style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}>
                    <span>CAJA ESPERADA (EFECTIVO):</span>
                    <span className="font-bold" style={{ color: 'var(--foreground)' }}>${(activeShift.openingCash + activeShift.salesByCash).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg p-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-600 font-semibold leading-relaxed">
                  ⚠️ <strong>Cierre a Ciegas Activo:</strong> Los saldos calculados por el sistema están ocultos por seguridad. Ingrese el conteo manual físico real.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsCierreModalOpen(false)}
                className="flex-grow py-3 rounded-lg font-bold text-xs hover:opacity-80 transition-all"
                style={{ backgroundColor: 'var(--muted-background)', color: 'var(--foreground)' }}
              >
                CANCELAR
              </button>
              <button
                onClick={() => {
                  setIsCierreModalOpen(false);
                  handleCloseShift();
                }}
                className="flex-grow py-3 rounded-lg font-bold text-xs text-white"
                style={{ backgroundColor: 'var(--error)' }}
              >
                CONFIRMAR CIERRE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DE CREACIÓN DE CLIENTE EXPRÉS (Offline-First Credit Ledger) */}
      {isNewCustModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateCustomer}
            className="w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4" 
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
          >
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>👤</span> REGISTRAR CLIENTE EXPRÉS
              </h3>
              <p className="text-zinc-500 text-[11px]">
                Agrega un cliente al catálogo local de manera instantánea para ventas a crédito o contado.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border text-xs font-bold bg-zinc-900 border-zinc-800 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. 5512345678"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg border text-xs font-bold bg-zinc-900 border-zinc-800 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                    RFC (SAT Compliance)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. XAXX010101000"
                    value={custRfc}
                    onChange={(e) => setCustRfc(e.target.value)}
                    className="w-full p-2.5 rounded-lg border text-xs font-bold bg-zinc-900 border-zinc-800 text-white focus:outline-none animate-none"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-850 pt-3">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={custCreditEnabled}
                    onChange={(e) => setCustCreditEnabled(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-zinc-300">Habilitar Línea de Crédito (Fiado)</span>
                </label>

                {custCreditEnabled && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                        Límite de Crédito ($)
                      </label>
                      <input
                        type="number"
                        placeholder="1000"
                        value={custCreditLimit}
                        onChange={(e) => setCustCreditLimit(e.target.value)}
                        className="w-full p-2.5 rounded-lg border text-xs font-bold bg-zinc-900 border-zinc-800 text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                        Plazo de Pago
                      </label>
                      <select
                        value={custPaymentTermDays}
                        onChange={(e) => setCustPaymentTermDays(parseInt(e.target.value))}
                        className="w-full p-2.5 rounded-lg border text-xs font-bold bg-zinc-900 border-zinc-800 text-white focus:outline-none"
                      >
                        <option value={7}>7 días (Semanal)</option>
                        <option value={15}>15 días (Quincenal)</option>
                        <option value={30}>30 días (Mensual)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewCustModalOpen(false)}
                className="flex-grow py-3 rounded-lg font-bold text-xs hover:opacity-80 transition-all bg-zinc-800 text-zinc-300 border-none cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                className="flex-grow py-3 rounded-lg font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 border-none cursor-pointer"
              >
                REGISTRAR Y SELECCIONAR
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. MODAL DEL SIMULADOR DE BÁSCULA DE PESO USB/SERIAL */}
      {scaleProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border shadow-2xl" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⚖️</span>
              <h3 className="text-xl font-extrabold" style={{ color: 'var(--foreground)' }}>Báscula USB / Serial</h3>
            </div>
            <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
              Captura el gramaje exacto para productos a granel. Producto: <strong style={{ color: 'var(--foreground)' }}>{scaleProduct.name}</strong>
            </p>

            <div className="rounded-2xl p-6 border text-center mb-6" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
              <span className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
                PESO CAPTURADO (KG)
              </span>
              <strong className="text-4xl font-mono block tracking-tight my-2" style={{ color: 'var(--foreground)' }}>
                {scaleWeight.toFixed(3)} kg
              </strong>
              <span className="text-[11px] font-mono block" style={{ color: 'var(--primary)' }}>
                Monto: ${(scaleProduct.salePrice * scaleWeight).toFixed(2)} MXN
              </span>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={handleReadScale}
                disabled={isScaleCalibrating}
                className="w-full py-3 rounded-lg font-extrabold text-xs text-white transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {isScaleCalibrating ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    CALIBRANDO...
                  </>
                ) : (
                  'OBTENER PESO DE BÁSCULA'
                )}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setScaleProduct(null)}
                className="flex-grow py-2.5 rounded-lg font-bold text-xs transition-all"
                style={{ backgroundColor: 'var(--muted-background)', color: 'var(--foreground)' }}
              >
                CANCELAR
              </button>
              <button
                onClick={confirmScaleWeight}
                disabled={isScaleCalibrating}
                className="flex-grow py-2.5 rounded-lg font-bold text-xs text-white transition-all"
                style={{ backgroundColor: 'var(--success)' }}
              >
                CONFIRMAR Y AGREGAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TOUR INTERACTIVO DE CAJA POS */}
      {showTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-2xl border p-8 shadow-2xl space-y-6 flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
            
            {/* Cabecera */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Paso {tourStep} de 5 &middot; Tour de la Caja
              </span>
              <button 
                onClick={closeTour}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-200"
              >
                OMITIR
              </button>
            </div>

            {/* Visual de Indicación del Elemento Activo */}
            <div className="p-6 rounded-xl border flex flex-col items-center justify-center text-center space-y-4" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)' }}>
              
              {tourStep === 1 && (
                <>
                  <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-2xl font-bold">🔍</div>
                  <h3 className="text-lg font-bold text-white">Buscador Inteligente de Productos</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Escribe códigos de barras, códigos internos o descripciones de productos. El motor buscará al instante (en menos de 100ms) para garantizar la máxima fluidez en tu mostrador.
                  </p>
                  <div className="p-3 bg-zinc-900 border rounded-lg text-xs font-mono text-zinc-400 max-w-xs">
                    Tips: Presiona <kbd className="bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">Ctrl</kbd> + <kbd className="bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">F</kbd> para enfocarlo al instante.
                  </div>
                </>
              )}

              {tourStep === 2 && (
                <>
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-2xl font-bold">⚡</div>
                  <h3 className="text-lg font-bold text-white">Accesos Rápidos (Favoritos)</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Tus productos estrella o recargas más frecuentes, listos a un solo clic sin necesidad de usar el buscador. Diseñado para optimizar las horas pico de tu tienda.
                  </p>
                </>
              )}

              {tourStep === 3 && (
                <>
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-2xl font-bold">⚖️</div>
                  <h3 className="text-lg font-bold text-white">Venta por Peso y Granel</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Los productos configurados en Kg abrirán el calibrador de báscula en tiempo real para leer pesaje USB decimal. ¡Ideal para fruterías y carnicerías!
                  </p>
                </>
              )}

              {tourStep === 4 && (
                <>
                  <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 text-2xl font-bold">👥</div>
                  <h3 className="text-lg font-bold text-white">Clientes y Crédito (Fiado)</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Selecciona clientes recurrentes para autorizar compras a crédito (fiado) con límites automáticos y registro en la libreta digital de deudas.
                  </p>
                </>
              )}

              {tourStep === 5 && (
                <>
                  <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-2xl font-bold">💰</div>
                  <h3 className="text-lg font-bold text-white">Cobro Multivariado</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Finaliza la transacción cobrando con efectivo (con cálculo instantáneo de cambio), tarjeta o transferencia electrónica. ¡Tu primera venta está a un clic!
                  </p>
                </>
              )}

            </div>

            {/* Controles de Navegación del Tour */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={prevTourStep}
                className={`px-4 py-2 text-xs font-bold rounded-lg border hover:bg-zinc-800 ${tourStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}
              >
                ANTERIOR
              </button>

              <button
                onClick={nextTourStep}
                className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs rounded-lg shadow-lg shadow-blue-500/20"
              >
                {tourStep === 5 ? '¡COMENZAR A VENDER! 🎉' : 'SIGUIENTE PASO'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. MODAL DE ATAJOS DE TECLADO (F1) */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                ⌨️ Atajos de Teclado del POS
              </h3>
              <button 
                onClick={() => setIsShortcutsModalOpen(false)}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-200"
              >
                CERRAR (ESC)
              </button>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Guía de Atajos de Teclado</span>
                <kbd className="bg-zinc-800 px-2 py-1 rounded border border-zinc-700 font-bold text-white shadow-sm">F1</kbd>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Enfocar Buscador de Productos</span>
                <kbd className="bg-zinc-800 px-2 py-1 rounded border border-zinc-700 font-bold text-white shadow-sm">F2</kbd>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Autocompletar Lectura EAN / Scan</span>
                <span className="text-blue-500 font-bold text-[10px] uppercase">AUTOMÁTICO</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Procesar Venta / Cobrar</span>
                <kbd className="bg-zinc-800 px-2 py-1 rounded border border-zinc-700 font-bold text-white shadow-sm">F10</kbd>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400">Cancelar / Cerrar Modales</span>
                <kbd className="bg-zinc-800 px-2 py-1 rounded border border-zinc-700 font-bold text-white shadow-sm">ESC</kbd>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 text-center leading-relaxed pt-2">
              Navega de forma fluida sin tocar el ratón. Diseñado para maximizar la velocidad de cobro en mostrador.
            </p>
          </div>
        </div>
      )}

      {/* 6. MODAL DE REGISTRO DE MERMA DIARIA (Perfil B: Peso y Granel) */}
      {isMermaModalOpen && mermaProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 animate-in zoom-in-95 duration-150" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <div>
              <h3 className="text-lg font-extrabold text-amber-500 flex items-center gap-2">
                <span>⚖️</span> REGISTRAR MERMA DIARIA
              </h3>
              <p className="text-zinc-500 text-[11px]">
                Registra pérdidas por descomposición, deshidratación natural o daño físico. Se descontará directamente del stock.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Producto Afectado
                </label>
                <select
                  value={mermaProduct.id}
                  onChange={(e) => {
                    const matched = PRODUCTS_SEED.find(p => p.id === e.target.value);
                    if (matched) {
                      setMermaProduct(matched);
                      setMermaQty(matched.unit === 'kg' ? '0.500' : '1');
                    }
                  }}
                  className="w-full p-2.5 rounded-lg border text-xs font-bold bg-zinc-900 border-zinc-800 text-white focus:outline-none"
                >
                  {PRODUCTS_SEED.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.internalCode}) &middot; Stock: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                    Cantidad a Descontar ({mermaProduct.unit})
                  </label>
                  <input
                    type="number"
                    step={mermaProduct.unit === 'kg' ? '0.05' : '1'}
                    value={mermaQty}
                    onChange={(e) => setMermaQty(e.target.value)}
                    className="w-full p-2.5 rounded-lg border text-xs font-bold bg-zinc-900 border-zinc-800 text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                    Razón de Merma
                  </label>
                  <select
                    value={mermaReason}
                    onChange={(e) => setMermaReason(e.target.value)}
                    className="w-full p-2.5 rounded-lg border text-xs font-bold bg-zinc-900 border-zinc-800 text-white focus:outline-none"
                  >
                    <option value="Merma Natural (Deshidratación)">Deshidratación Natural</option>
                    <option value="Expirado / Podrido">Expirado / Descompuesto</option>
                    <option value="Daño de Empaque / Maltrato">Empaque Roto / Maltratado</option>
                    <option value="Robo Hormiga / Pérdida">Pérdida Desconocida / Robo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsMermaModalOpen(false)}
                className="flex-grow py-3 rounded-lg font-bold text-xs hover:opacity-80 transition-all bg-zinc-800 text-zinc-300 border-none cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={() => {
                  const qty = parseFloat(mermaQty) || 0;
                  if (qty <= 0) return;
                  
                  // Descontar del producto en PRODUCTS_SEED
                  const prod = PRODUCTS_SEED.find(p => p.id === mermaProduct.id);
                  if (prod) {
                    prod.stock = Math.max(0, prod.stock - qty);
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('snapgad_pos_products_catalog', JSON.stringify(PRODUCTS_SEED));
                    }
                  }
                  
                  SoundFx.playSuccess();
                  setIsMermaModalOpen(false);
                  alert(`✓ Merma registrada: Se descontaron ${qty} ${mermaProduct.unit} de "${mermaProduct.name}" debido a: ${mermaReason}.`);
                }}
                className="flex-grow py-3 rounded-lg font-bold text-xs text-white bg-amber-600 hover:bg-amber-500 border-none cursor-pointer"
              >
                REGISTRAR MERMA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin PIN Validation Modal */}
      <AdminPinModal
        isOpen={isAdminPinOpen}
        onClose={() => setIsAdminPinOpen(false)}
        onSuccess={() => {
          if (pinSuccessCallback) {
            pinSuccessCallback();
          } else if (pinTargetAction) {
            router.push(pinTargetAction);
          }
        }}
      />

      {/* Supervisor Override Modal */}
      <SupervisorOverrideModal
        isOpen={isSupervisorModalOpen}
        onClose={() => setIsSupervisorModalOpen(false)}
        onSuccess={(supervisorName) => {
          setIsSupervisorModalOpen(false);
          if (supervisorCallback) {
            supervisorCallback();
          }
        }}
        actionDescription={supervisorActionDesc}
      />

      </div>
    </div>
  );
}
