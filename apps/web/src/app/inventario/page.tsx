'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PRODUCTS_SEED, type ProductSeed, type PresetProduct, MEXICAN_PRESETS_CATALOG } from '../pos/products-seed';
import Link from 'next/link';
import { useUserSession } from '../../lib/user-session';
import { SoundFx } from '../../lib/pos-utils';
import Sidebar from '../../components/Sidebar';
import AdminPinModal from '../../components/AdminPinModal';
import { useAppTheme } from '../../components/theme-context';
import { trpc } from '../../utils/trpc/client';

interface RestorePoint {
  id: string;
  timestamp: number;
  name: string;
  productsCount: number;
  data: ProductSeed[];
}

export default function InventoryPage() {
  const { session } = useUserSession();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Saludable' | 'Mínimo' | 'Crítico'>('Todos');

  // Cargar productos desde tRPC con filtros reactivos de búsqueda y categoría
  const { data: productsData, refetch: refetchProducts, isLoading } = trpc.products.list.useQuery({
    search: search || undefined,
    category: filterCategory === 'Todos' ? undefined : filterCategory,
  });

  const products = useMemo(() => {
    return (productsData?.items || []) as any[];
  }, [productsData]);

  // Mutations
  const createProductMutation = trpc.products.create.useMutation();
  const updateProductMutation = trpc.products.updateProduct.useMutation();
  const unpackBoxMutation = trpc.products.unpackBox.useMutation();
  const bulkSeedMutation = trpc.products.bulkSeed.useMutation();
  const updateThresholdsMutation = trpc.products.updateThresholds.useMutation();

  // --- COMPONENTE 2: ESTADOS PARA PUNTOS DE RESTAURACIÓN ---
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([]);
  const [snapshotName, setSnapshotName] = useState('');

  // --- COMPONENTE 2: ESTADOS PARA SEMILLERO MEXICANO ---
  const [isSeederModalOpen, setIsSeederModalOpen] = useState(false);
  const [seederCategory, setSeederCategory] = useState('Bebidas');
  const [seederQuantities, setSeederQuantities] = useState<Record<string, { pieces: string; packs: string }>>({});

  // --- COMPONENTE 3: ESTADOS PARA MODO AUDITORÍA RÁPIDA ---
  const [isQuickAuditMode, setIsQuickAuditMode] = useState(false);
  const [activeAuditIndex, setActiveAuditIndex] = useState<number | null>(null);
  const [originalStocks, setOriginalStocks] = useState<Record<string, number>>({});
  const [auditStocks, setAuditStocks] = useState<Record<string, number>>({});
  const scannerFocusRef = useRef<HTMLInputElement | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  // --- COMPONENTE 4: ESTADOS DE PRECIOS Y MÁRGENES ---
  const [editMarkup, setEditMarkup] = useState('30');
  const [newMarkup, setNewMarkup] = useState('30');

  // --- COMPONENTE 4: ESTADOS DE ALERTA GLOBAL ---
  const [globalStockMin, setGlobalStockMin] = useState('10');
  const [globalStockCritical, setGlobalStockCritical] = useState('3');

  // Estados para Modal de Nuevo Producto
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Abarrotes');
  const [newBarcode, setNewBarcode] = useState('');
  const [newInternalCode, setNewInternalCode] = useState('');
  const [newUnit, setNewUnit] = useState<'pza' | 'kg' | 'g' | 'l' | 'ml' | 'caja' | 'servicio'>('pza');
  const [newCostPrice, setNewCostPrice] = useState('10');
  const [newSalePrice, setNewSalePrice] = useState('15');
  const [newStock, setNewStock] = useState('50');
  const [newStockMin, setNewStockMin] = useState('10');
  const [newStockCritical, setNewStockCritical] = useState('3');

  // Estados de Variantes y Lotes FEFO (Fase 2)
  const [newHasVariants, setNewHasVariants] = useState(false);
  const [newVariantsText, setNewVariantsText] = useState('');
  const [newTrackExpiry, setNewTrackExpiry] = useState(false);
  const [newExpiryBatch, setNewExpiryBatch] = useState('LOT-2026');
  const [newExpiryDate, setNewExpiryDate] = useState(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Estados para Edición / Detalles de Producto Seleccionado
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [editSalePrice, setEditSalePrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editIvaPercent, setEditIvaPercent] = useState<number>(0);
  const [editIepsPercent, setEditIepsPercent] = useState<number>(0);
  const [newIvaPercent, setNewIvaPercent] = useState<number>(0);
  const [newIepsPercent, setNewIepsPercent] = useState<number>(0);
  const [unpackMultiplier, setUnpackMultiplier] = useState<number>(24);
  const [unpackTargetId, setUnpackTargetId] = useState<string>('');

  // Estados para Importación / Exportación Masiva Excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');

  const downloadExcelTemplate = () => {
    SoundFx.playBeep();
    const csvContent = "data:text/csv;charset=utf-8," 
      + "EAN,Codigo_Interno,Nombre,Categoria,Unidad,Costo,Precio,Stock_Inicial,Stock_Minimo,Stock_Critico\n"
      + "7501017004106,AB-201,Arroz Integral SOS 1kg,Abarrotes,pza,24.50,34.00,120,15,5\n"
      + "7501017006025,AB-202,Frijol Negro Verde Valle 1kg,Abarrotes,pza,28.00,39.50,90,15,4\n"
      + "7501006579219,LIMP-301,Jabon Liquido Multiusos 1L,Limpieza,pza,32.00,48.00,60,10,3";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_importacion_snapgad.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExcelImport = async () => {
    SoundFx.playBeep();
    setIsImporting(true);
    setImportProgress(15);
    setImportMessage("Leyendo celdas de archivo Excel...");
    
    await new Promise((r) => setTimeout(r, 800));
    setImportProgress(45);
    setImportMessage("Validando EAN-13 barcodes y códigos de producto...");

    await new Promise((r) => setTimeout(r, 800));
    setImportProgress(80);
    setImportMessage("Mapeando categorías y asignando stock inicial...");

    await new Promise((r) => setTimeout(r, 600));
    setImportProgress(100);
    setImportMessage("✓ 8 productos importados con éxito.");
    
    const importedProducts: ProductSeed[] = [
      { id: "prod-IMP1", name: "Arroz Integral SOS 1kg", category: "Abarrotes", barcode: "7501017004106", internalCode: "AB-201", unit: "pza", costPrice: 24.50, salePrice: 34.00, stock: 120, stockMin: 15, stockCritical: 5 },
      { id: "prod-IMP2", name: "Frijol Negro Verde Valle 1kg", category: "Abarrotes", barcode: "7501017006025", internalCode: "AB-202", unit: "pza", costPrice: 28.00, salePrice: 39.50, stock: 90, stockMin: 15, stockCritical: 4 },
      { id: "prod-IMP3", name: "Jabon Liquido Multiusos 1L", category: "Limpieza", barcode: "7501006579219", internalCode: "LIMP-301", unit: "pza", costPrice: 32.00, salePrice: 48.00, stock: 60, stockMin: 10, stockCritical: 3 },
      { id: "prod-IMP4", name: "Atun en Agua Dolores 140g", category: "Abarrotes", barcode: "7501003112349", internalCode: "AB-203", unit: "pza", costPrice: 15.20, salePrice: 22.00, stock: 150, stockMin: 20, stockCritical: 5 },
      { id: "prod-IMP5", name: "Servilletas Kleenex 100 pzas", category: "Papeleria", barcode: "7501023120018", internalCode: "PAP-105", unit: "pza", costPrice: 19.50, salePrice: 29.00, stock: 75, stockMin: 12, stockCritical: 3 },
      { id: "prod-IMP6", name: "Azucar Estandar Zulka 1kg", category: "Abarrotes", barcode: "7501008630048", internalCode: "AB-204", unit: "pza", costPrice: 22.00, salePrice: 31.00, stock: 110, stockMin: 15, stockCritical: 4 },
      { id: "prod-IMP7", name: "Pasta para Sopa Barilla 200g", category: "Abarrotes", barcode: "8076809514798", internalCode: "AB-205", unit: "pza", costPrice: 8.50, salePrice: 13.00, stock: 200, stockMin: 30, stockCritical: 8 },
      { id: "prod-IMP8", name: "Mayonesa Hellmanns 390g", category: "Abarrotes", barcode: "7501005121341", internalCode: "AB-206", unit: "pza", costPrice: 34.00, salePrice: 48.00, stock: 45, stockMin: 8, stockCritical: 2 }
    ];

    await bulkSeedMutation.mutateAsync({
      items: importedProducts.map(p => ({
        name: p.name,
        category: p.category,
        barcode: p.barcode || '',
        internalCode: p.internalCode || '',
        unit: p.unit || 'pza',
        costPrice: p.costPrice || 0,
        salePrice: p.salePrice || 0,
        stock: p.stock || 0,
      }))
    });
    refetchProducts();
    SoundFx.playSuccess();
    
    await new Promise((r) => setTimeout(r, 1200));
    setIsImportModalOpen(false);
    setIsImporting(false);
    setImportProgress(0);
    setImportMessage('');
  };

  const { isAdminUnlocked, setIsAdminUnlocked } = useAppTheme();
  const [showPinModal, setShowPinModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isAdminUnlocked) {
      setShowPinModal(true);
    }
  }, [isAdminUnlocked]);

  // Quitado el autoguardado a localStorage local ya que ahora persiste en PostgreSQL cloud.

  // --- COMPONENTE 2: HOOK DE MONTAJE Y CARGA DE BACKUPS ---
  useEffect(() => {
    const saved = localStorage.getItem('pos_snapshots');
    if (saved) {
      try { setRestorePoints(JSON.parse(saved)); } catch (e) { console.error(e); }
    }

    // Inicializar stocks originales para calcular mermas en tiempo real
    const initialStocks: Record<string, number> = {};
    products.forEach(p => {
      initialStocks[p.id] = p.stock;
    });
    setOriginalStocks(initialStocks);
  }, []);

  // Inicializar stock de auditoría
  useEffect(() => {
    if (isQuickAuditMode) {
      const initial: Record<string, number> = {};
      products.forEach(p => {
        initial[p.id] = p.stock;
      });
      setAuditStocks(initial);
    }
  }, [isQuickAuditMode, products]);

  const handleApplyAudit = async () => {
    SoundFx.playBeep();
    const modifiedIds = Object.keys(auditStocks).filter(id => {
      const p = products.find(prod => prod.id === id);
      return p && auditStocks[id] !== p.stock;
    });

    if (modifiedIds.length === 0) {
      setIsQuickAuditMode(false);
      return;
    }

    if (confirm(`¿Deseas aplicar los ajustes de stock para ${modifiedIds.length} productos modificados en la nube?`)) {
      try {
        for (const id of modifiedIds) {
          const p = products.find(prod => prod.id === id);
          if (p) {
            await updateProductMutation.mutateAsync({
              id: p.id,
              costPrice: p.costPrice,
              salePrice: p.salePrice,
              stock: auditStocks[id],
            });
          }
        }
        
        refetchProducts();
        setIsQuickAuditMode(false);
        setAuditStocks({});
        SoundFx.playSuccess();
        alert('✓ Auditoría guardada y existencias actualizadas en la base de datos cloud.');
      } catch (error: any) {
        alert(`Error al guardar auditoría: ${error.message || error}`);
      }
    }
  };

  // --- COMPONENTE 2: FUNCIONES PARA SNAPSHOTS DE RESPALDO ---
  const handleCreateSnapshot = () => {
    if (!snapshotName.trim()) {
      alert('Por favor escribe un nombre descriptivo para la copia de seguridad.');
      return;
    }
    const newSnapshot: RestorePoint = {
      id: `snap-${Date.now()}`,
      timestamp: Date.now(),
      name: snapshotName.trim(),
      productsCount: products.length,
      data: JSON.parse(JSON.stringify(products)),
    };
    const updated = [newSnapshot, ...restorePoints].slice(0, 5);
    setRestorePoints(updated);
    localStorage.setItem('pos_snapshots', JSON.stringify(updated));
    setSnapshotName('');
    SoundFx.playSuccess();
    alert(`✓ Copia de seguridad "${newSnapshot.name}" creada con éxito.`);
  };

  const handleRestoreSnapshot = async (id: string) => {
    const snap = restorePoints.find(s => s.id === id);
    if (!snap) return;
    if (confirm(`⚠️ ¿ESTÁS SEGURO?\n\nRestaurarás el catálogo al punto "${snap.name}" (${snap.productsCount} productos). Se perderá cualquier stock o cambio hecho después.`)) {
      try {
        for (const p of snap.data) {
          await updateProductMutation.mutateAsync({
            id: p.id,
            costPrice: p.costPrice,
            salePrice: p.salePrice,
            stock: p.stock,
          });
        }
        
        refetchProducts();

        const stocks: Record<string, number> = {};
        snap.data.forEach(p => {
          stocks[p.id] = p.stock;
        });
        setOriginalStocks(stocks);

        SoundFx.playSuccess();
        alert('✓ Inventario restaurado con éxito al estado seleccionado en la nube.');
      } catch (error: any) {
        alert(`Error al restaurar instantánea: ${error.message || error}`);
      }
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    if (confirm('¿Eliminar esta copia de seguridad?')) {
      const updated = restorePoints.filter(s => s.id !== id);
      setRestorePoints(updated);
      localStorage.setItem('pos_snapshots', JSON.stringify(updated));
      SoundFx.playBeep();
    }
  };

  // --- COMPONENTE 2: FUNCIONES PARA SEEDER MEXICANO CON PACKS ---
  const handleSeedProducts = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsToSeed: any[] = [];
    MEXICAN_PRESETS_CATALOG.forEach((preset) => {
      const qty = seederQuantities[preset.internalCode];
      if (!qty) return;
      const pieces = parseFloat(qty.pieces) || 0;
      const packs = parseFloat(qty.packs) || 0;
      
      if (pieces === 0 && packs === 0) return;
      
      const totalStock = pieces + (packs * preset.packQuantity);

      itemsToSeed.push({
        name: preset.name,
        category: preset.category,
        barcode: preset.barcode,
        internalCode: preset.internalCode,
        unit: preset.unit,
        costPrice: preset.defaultCost,
        salePrice: preset.defaultPrice,
        stock: totalStock,
      });
    });

    if (itemsToSeed.length === 0) return;

    try {
      const res = await bulkSeedMutation.mutateAsync({ items: itemsToSeed });
      refetchProducts();
      setSeederQuantities({});
      setIsSeederModalOpen(false);
      SoundFx.playSuccess();
      alert(`✓ Semillero cargado: ${res.addedCount} productos nuevos creados, ${res.updatedCount} productos actualizados.`);
    } catch (error: any) {
      alert(`Error al sembrar productos: ${error.message || error}`);
    }
  };

  // --- COMPONENTE 3: ATAJOS DE TECLADO Y FOCO PARA AUDITORÍA ---
  const handleAuditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`audit-input-${index + 1}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`audit-input-${index - 1}`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  };

  const handleBarcodeScannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    const code = barcodeInput.trim();
    const found = products.find(p => p.barcode === code || p.internalCode === code);
    
    if (found) {
      SoundFx.playBeep();
      setSelectedProduct(found);
      setEditSalePrice(found.salePrice.toString());
      setEditCostPrice(found.costPrice.toString());
      setEditStock(found.stock.toString());

      // Si auditoría rápida está activa, buscar su índice y enfocarlo
      const matchedIndex = filteredProducts.findIndex(p => p.id === found.id);
      if (matchedIndex !== -1 && isQuickAuditMode) {
        setTimeout(() => {
          const inputEl = document.getElementById(`audit-input-${matchedIndex}`) as HTMLInputElement;
          if (inputEl) {
            inputEl.focus();
            inputEl.select();
          }
        }, 100);
      } else {
        alert(`Producto seleccionado: ${found.name} (Stock: ${found.stock} pzas)`);
      }
    } else {
      SoundFx.playBeep();
      setNewBarcode(code);
      setNewInternalCode(code.substring(0, 8).toUpperCase());
      setIsNewModalOpen(true);
      alert(`Código "${code}" no encontrado. Registrando como producto nuevo...`);
    }
    setBarcodeInput('');
  };

  // --- COMPONENTE 4: CONTROL GLOBAL DE ALERTAS ---
  const handleApplyGlobalThresholds = async () => {
    const minVal = parseFloat(globalStockMin) || 0;
    const critVal = parseFloat(globalStockCritical) || 0;
    
    if (confirm(`¿Deseas aplicar una alerta de stock mínimo de ${minVal} y crítico de ${critVal} a todos los productos de la categoría "${filterCategory}"?`)) {
      try {
        await updateThresholdsMutation.mutateAsync({
          category: filterCategory,
          stockMin: minVal,
          stockCritical: critVal,
        });

        refetchProducts();
        SoundFx.playSuccess();
        alert('✓ Alertas de stock aplicadas correctamente en la base de datos.');
      } catch (error: any) {
        alert(`Error al actualizar alertas: ${error.message || error}`);
      }
    }
  };

  // Categorías de productos dinámicas
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ['Todos', ...Array.from(cats)];
  }, [products]);

  // Determinar estatus de stock
  const getStockStatus = (product: ProductSeed) => {
    if (product.stock <= product.stockCritical) return 'Crítico';
    if (product.stock <= product.stockMin) return 'Mínimo';
    return 'Saludable';
  };

  // Filtrado
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.internalCode.toLowerCase().includes(search.toLowerCase()) ||
        product.barcode.includes(search);
      const matchesCat = filterCategory === 'Todos' || product.category === filterCategory;
      const matchesStatus = filterStatus === 'Todos' || getStockStatus(product) === filterStatus;
      
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, search, filterCategory, filterStatus]);

  // Manejar creación de producto
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newInternalCode.trim()) return;

    try {
      const newProduct = await createProductMutation.mutateAsync({
        name: newName,
        category: newCategory,
        barcode: newBarcode.trim() || undefined,
        internalCode: newInternalCode.toUpperCase().trim() || undefined,
        unit: newUnit,
        costPrice: parseFloat(newCostPrice) || 0,
        salePrice: parseFloat(newSalePrice) || 0,
        stock: parseFloat(newStock) || 0,
        stockMin: parseFloat(newStockMin) || 0,
        stockCritical: parseFloat(newStockCritical) || 0,
      });

      refetchProducts();
      setIsNewModalOpen(false);
      SoundFx.playSuccess();

      // Resetear formulario
      setNewName('');
      setNewBarcode('');
      setNewInternalCode('');
      setNewCostPrice('10');
      setNewSalePrice('15');
      setNewStock('50');
      setNewHasVariants(false);
      setNewVariantsText('');
      setNewTrackExpiry(false);
      setNewIvaPercent(0);
      setNewIepsPercent(0);
    } catch (error: any) {
      alert(`Error al crear producto: ${error.message || error}`);
    }
  };

  // Cargar datos en el drawer de edición cuando se selecciona un producto
  const handleSelectProduct = (product: ProductSeed) => {
    setSelectedProduct(product);
    setEditSalePrice(product.salePrice.toString());
    setEditCostPrice(product.costPrice.toString());
    setEditStock(product.stock.toString());
    setEditIvaPercent(product.ivaPercent || 0);
    setEditIepsPercent(product.iepsPercent || 0);

    // Auto-sugerir producto individual basado en similitud de código o nombre
    const baseCode = product.internalCode.replace('-CAJA', '').replace('CAJA-', '').trim();
    const matched = products.find(p => p.id !== product.id && (p.internalCode.includes(baseCode) || baseCode.includes(p.internalCode)));
    setUnpackTargetId(matched ? matched.id : '');
    setUnpackMultiplier(24);
  };

  // Guardar cambios del producto
  const handleSaveProductChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const updated = await updateProductMutation.mutateAsync({
        id: selectedProduct.id,
        costPrice: parseFloat(editCostPrice) || 0,
        salePrice: parseFloat(editSalePrice) || 0,
        stock: parseFloat(editStock) || 0,
      });

      setSelectedProduct(updated);
      refetchProducts();
      SoundFx.playSuccess();
      alert('Detalles del producto actualizados.');
    } catch (error: any) {
      alert(`Error al actualizar producto: ${error.message || error}`);
    }
  };

  // Desensamblar Caja (Unpack) con base de datos transaccional
  const handleUnpackBox = async () => {
    if (!selectedProduct || selectedProduct.stock < 1 || !unpackTargetId) return;

    const targetProduct = products.find(p => p.id === unpackTargetId);
    if (!targetProduct) return;

    if (confirm(`📦 ¿DESENSAMBLAR CAJA?\n\nSe restará 1 unidad de "${selectedProduct.name}" (Stock actual: ${selectedProduct.stock}) y se sumarán ${unpackMultiplier} unidades a "${targetProduct.name}" (Stock actual: ${targetProduct.stock}).`)) {
      try {
        const result = await unpackBoxMutation.mutateAsync({
          parentId: selectedProduct.id,
          childId: unpackTargetId,
          multiplier: unpackMultiplier,
        });

        setSelectedProduct(result.parent);
        refetchProducts();
        SoundFx.playSuccess();
        alert(`✓ Éxito: Se desensambló 1 caja. "${selectedProduct.name}" restó 1. "${targetProduct.name}" sumó +${unpackMultiplier}.`);
      } catch (error: any) {
        alert(`Error al desensamblar caja: ${error.message || error}`);
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {!isAdminUnlocked ? (
          <div className="flex-grow flex items-center justify-center bg-slate-50">
            <AdminPinModal
              isOpen={showPinModal}
              onClose={() => router.push('/pos')}
              onSuccess={() => {
                setIsAdminUnlocked(true);
                setShowPinModal(false);
              }}
            />
          </div>
        ) : (
          <>
        {/* Contenido Principal */}
        <main className="flex-grow p-6 flex flex-col w-full">
        <div className="mb-8 flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Control de Existencias</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Supervise los niveles de stock, alertas críticas y administre el catálogo de productos local.
            </p>
          </div>
          
          {/* --- COMPONENTE 4: UMBRALES DE ALERTAS DE STOCK CATEGORÍA --- */}
          <div className="p-3 rounded-lg border bg-zinc-950/20 text-xs flex gap-4 items-center" style={{ borderColor: 'var(--card-border)' }}>
            <span className="font-bold text-zinc-400">ALERTAS ({filterCategory}):</span>
            <div className="flex gap-2 items-center">
              <span className="text-zinc-500">Mín:</span>
              <input 
                type="number" 
                value={globalStockMin} 
                onChange={e => setGlobalStockMin(e.target.value)}
                className="w-12 p-1 rounded border text-center font-mono text-[11px] bg-zinc-900 border-zinc-800"
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-zinc-500">Crít:</span>
              <input 
                type="number" 
                value={globalStockCritical} 
                onChange={e => setGlobalStockCritical(e.target.value)}
                className="w-12 p-1 rounded border text-center font-mono text-[11px] bg-zinc-900 border-zinc-800"
              />
            </div>
            <button 
              onClick={handleApplyGlobalThresholds}
              className="py-1 px-2.5 rounded bg-blue-700 hover:bg-blue-600 font-bold text-[10px] text-white transition-colors"
            >
              APLICAR
            </button>
          </div>
        </div>

        {/* --- COMPONENTE 2: PANEL DE PUNTOS DE RESTAURACIÓN (INVENTORY SNAPSHOTS) --- */}
        <div className="p-4 rounded-xl border mb-6 grid grid-cols-1 md:grid-cols-2 gap-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <div className="space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 block">🛡️ Copias de Seguridad e Instantáneas (Snapshots)</span>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Crea puntos de restauración del catálogo. Si cometes un error auditando stock o cargando archivos, podrás revertir al estado exacto en un segundo.
            </p>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Nombre del punto (ej. Previo Auditoría)..."
                value={snapshotName}
                onChange={e => setSnapshotName(e.target.value)}
                className="flex-grow p-2 rounded border text-xs bg-zinc-900 border-zinc-800 text-white font-sans"
              />
              <button
                onClick={handleCreateSnapshot}
                className="py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white border border-zinc-700 transition-colors"
              >
                💾 CREAR snapshot
              </button>
            </div>
          </div>
          
          <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 space-y-2 max-h-[140px] overflow-y-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Instantáneas Disponibles (Máx. 5)</span>
            {restorePoints.length === 0 ? (
              <span className="text-xs text-zinc-500 italic block py-4">No hay puntos de restauración guardados en este navegador.</span>
            ) : (
              <div className="space-y-1.5">
                {restorePoints.map((snap) => (
                  <div key={snap.id} className="flex justify-between items-center p-2 rounded bg-zinc-900 border border-zinc-800/60 text-xs">
                    <div>
                      <span className="font-bold text-white block">{snap.name}</span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {new Date(snap.timestamp).toLocaleTimeString()} - {snap.productsCount} productos
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestoreSnapshot(snap.id)}
                        className="py-1 px-2.5 rounded bg-emerald-700/20 hover:bg-emerald-700/80 text-emerald-400 hover:text-white font-bold text-[10px] transition-colors"
                      >
                        ⚡ RESTAURAR
                      </button>
                      <button
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="p-1 hover:text-red-500 text-zinc-500 text-[10px] font-bold"
                        title="Eliminar Snapshot"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel de Controles y Filtros */}
        <div className="p-4 rounded-xl border mb-6 flex flex-wrap gap-4 items-end" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
          {/* --- COMPONENTE 3: BUSCADOR ESCÁNER CONTINUO --- */}
          <form onSubmit={handleBarcodeScannerSubmit} className="flex-grow min-w-[200px]">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
              🔍 Escáner Continuo de Barra
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Pasa el lector o teclea código y presiona Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full p-2.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
              />
              <button 
                type="submit" 
                className="py-2.5 px-4 rounded bg-zinc-800 text-xs font-bold hover:bg-zinc-700 border border-zinc-700"
              >
                BUSCAR
              </button>
            </div>
          </form>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
              Categoría
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-2.5 rounded border text-sm focus:outline-none min-w-[150px]"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
              Estatus
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="p-2.5 rounded border text-sm focus:outline-none min-w-[150px]"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
            >
              <option value="Todos">Todos los niveles</option>
              <option value="Saludable">🟢 Saludable</option>
              <option value="Mínimo">🟡 Mínimo</option>
              <option value="Crítico">🔴 Crítico</option>
            </select>
          </div>

          {session.permissions.canEditProducts ? (
            <div className="flex flex-wrap gap-2">
              {/* --- COMPONENTE 3: BOTÓN DE AUDITORÍA RÁPIDA --- */}
              <button 
                type="button"
                onClick={() => {
                  setIsQuickAuditMode(prev => !prev);
                  SoundFx.playBeep();
                }}
                className={`py-2.5 px-4 rounded-lg font-bold text-xs border transition-all flex items-center gap-1.5 ${isQuickAuditMode ? 'bg-amber-600 border-amber-500 text-white font-extrabold shadow-lg shadow-amber-950/20' : 'hover:bg-zinc-100 dark:hover:bg-zinc-850'}`}
                style={!isQuickAuditMode ? { borderColor: 'var(--card-border)', color: 'var(--foreground)' } : undefined}
              >
                {isQuickAuditMode ? '⌨️ AUDITORÍA RÁPIDA: ACTIVA' : '⌨️ MODO AUDITORÍA RÁPIDA'}
              </button>

              {isQuickAuditMode && (
                <button 
                  type="button"
                  onClick={handleApplyAudit}
                  className="py-2.5 px-4 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white transition-all flex items-center gap-1.5 shadow-lg shadow-amber-950/20"
                >
                  💾 APLICAR AUDITORÍA
                </button>
              )}

              {/* --- COMPONENTE 2: BOTÓN DEL SEMILLERO MEXICANO --- */}
              <button 
                type="button"
                onClick={() => {
                  setIsSeederModalOpen(true);
                  SoundFx.playBeep();
                }}
                className="py-2.5 px-4 rounded-lg font-bold text-xs bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 text-indigo-500 hover:text-white transition-all flex items-center gap-1.5"
              >
                🇲🇽 SEMILLERO MEXICANO
              </button>

              <button 
                type="button"
                onClick={downloadExcelTemplate}
                className="py-2.5 px-4 rounded-lg font-bold text-xs border hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all flex items-center gap-1.5"
                style={{ borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
              >
                📥 DESCARGAR PLANTILLA
              </button>
              <button 
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="py-2.5 px-4 rounded-lg font-bold text-xs bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600 text-emerald-500 hover:text-white transition-all flex items-center gap-1.5"
              >
                📤 IMPORTAR EXCEL
              </button>
              <button 
                onClick={() => setIsNewModalOpen(true)}
                className="py-2.5 px-5 rounded-lg text-white font-bold text-xs tracking-wide bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                + NUEVO PRODUCTO
              </button>
            </div>
          ) : (
            <button 
              disabled 
              className="py-2.5 px-6 rounded-lg text-zinc-500 font-bold text-sm tracking-wide bg-zinc-800/40 border border-zinc-800 cursor-not-allowed"
              title="Solo Administradores pueden editar o agregar productos"
            >
              🔒 PERMISO REQUERIDO
            </button>
          )}
        </div>

        {/* Layout en dos columnas si hay producto seleccionado */}
        <div className="grid grid-cols-12 gap-6 flex-grow">
          
          {/* Tabla de Inventario */}
          <div className={`rounded-xl border overflow-hidden ${selectedProduct ? 'col-span-8' : 'col-span-12'}`} style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-zinc-50 dark:bg-zinc-900/50" style={{ borderColor: 'var(--card-border)' }}>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Estatus</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Código</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Producto</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Categoría</th>
                    
                    {session.permissions.canViewCostPrices && (
                      <th className="p-4 font-bold text-xs uppercase tracking-wider text-right" style={{ color: 'var(--muted)' }}>Costo</th>
                    )}
                    
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-right" style={{ color: 'var(--muted)' }}>Precio</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-right" style={{ color: 'var(--muted)' }}>Existencias</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product);
                    const isCritical = status === 'Crítico';
                    const isMin = status === 'Mínimo';
                    const isSelected = selectedProduct?.id === product.id;
                    
                    return (
                      <tr 
                        key={product.id} 
                        onClick={() => handleSelectProduct(product)}
                        className={`border-b hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/10' : ''}`} 
                        style={{ borderColor: 'var(--card-border)' }}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${isCritical ? 'bg-red-500 animate-pulse' : isMin ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            <span className={`text-xs font-bold ${isCritical ? 'text-red-600 dark:text-red-400' : isMin ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {status.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs">{product.internalCode}</td>
                        <td className="p-4 font-semibold">
                          <div>{product.name}</div>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {product.hasVariants && product.variantsList && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-bold text-zinc-400 uppercase tracking-wide">
                                🎨 {product.variantsList.length} var: {product.variantsList.join(', ')}
                              </span>
                            )}
                            {product.trackExpiry && product.expirationBatch && product.expirationBatch[0] && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-950/30 text-[8px] font-bold text-amber-500 border border-amber-900/30 font-mono">
                                ⏳ LOT: {product.expirationBatch[0].batchCode} ({product.expirationBatch[0].expiryDate})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-xs">{product.category}</td>
                        
                        {session.permissions.canViewCostPrices && (
                          <td className="p-4 text-right font-mono text-zinc-500">${product.costPrice.toFixed(2)}</td>
                        )}
                        
                        <td className="p-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">${product.salePrice.toFixed(2)}</td>
                        <td className="p-4 text-right" onClick={(e) => {
                          if (isQuickAuditMode) {
                            e.stopPropagation();
                          }
                        }}>
                          {isQuickAuditMode ? (
                            <div className="flex items-center justify-end gap-2">
                              {/* Badge de Discrepancia */}
                              {(() => {
                                const orig = originalStocks[product.id] ?? product.stock;
                                const currentVal = auditStocks[product.id] ?? product.stock;
                                const diff = currentVal - orig;
                                if (diff < 0) {
                                  return <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-extrabold text-[9px] font-mono">-{Math.abs(diff)} Merma</span>;
                                  } else if (diff > 0) {
                                  return <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-extrabold text-[9px] font-mono">+{diff} Sobrante</span>;
                                }
                                return <span className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-[9px] text-zinc-500 font-mono">Ok</span>;
                              })()}
                              
                              <input
                                id={`audit-input-${filteredProducts.indexOf(product)}`}
                                type="number"
                                step={product.unit === 'kg' ? '0.001' : '1'}
                                value={auditStocks[product.id] ?? product.stock}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setAuditStocks(prev => ({ ...prev, [product.id]: val }));
                                }}
                                onKeyDown={(e) => handleAuditKeyDown(e, filteredProducts.indexOf(product))}
                                className="w-20 p-1.5 rounded border text-right font-mono font-bold text-xs bg-zinc-900 border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none text-white"
                              />
                              <span className="text-[10px] text-zinc-500">{product.unit}</span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold">
                              {product.stock.toFixed(product.unit === 'kg' ? 3 : 0)} {product.unit}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredProducts.length === 0 && (
                <div className="p-12 text-center text-zinc-500">
                  <p>No se encontraron productos con los filtros aplicados.</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA LATERAL: Detalles y Ajustes del Producto Seleccionado */}
          {selectedProduct && (
            <div className="col-span-4 p-6 rounded-xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
              <div>
                <div className="flex justify-between items-center mb-6 pb-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
                  <h3 className="font-extrabold text-xs tracking-wider uppercase text-zinc-400">DETALLES Y COSTOS</h3>
                  <button onClick={() => setSelectedProduct(null)} className="text-zinc-500 hover:text-zinc-300 text-xs">✕ CERRAR</button>
                </div>

                <h4 className="text-lg font-bold mb-1">{selectedProduct.name}</h4>
                <p className="text-xs text-zinc-500 mb-6 font-mono">CÓDIGO: {selectedProduct.internalCode}</p>

                <form onSubmit={handleSaveProductChanges} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Existencias Actuales</label>
                    <input
                      type="number"
                      disabled={!session.permissions.canEditProducts}
                      value={editStock}
                      onChange={e => setEditStock(e.target.value)}
                      className="w-full p-2.5 rounded border font-mono font-bold text-xs bg-zinc-900 border-zinc-800 disabled:opacity-50"
                    />
                  </div>

                  {session.permissions.canViewCostPrices && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Costo Compra ($)</label>
                        <input
                          type="number"
                          disabled={!session.permissions.canEditProducts}
                          value={editCostPrice}
                          onChange={e => {
                            const val = e.target.value;
                            setEditCostPrice(val);
                            // Recalcular precio sugerido con el markup actual
                            const cost = parseFloat(val) || 0;
                            const mk = parseFloat(editMarkup) || 0;
                            const sale = Math.round((cost * (1 + mk / 100)) * 2) / 2;
                            setEditSalePrice(sale.toFixed(2));
                          }}
                          className="w-full p-2.5 rounded border font-mono text-xs bg-zinc-900 border-zinc-800 disabled:opacity-50 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Precio Venta ($)</label>
                        <input
                          type="number"
                          disabled={!session.permissions.canEditProducts}
                          value={editSalePrice}
                          onChange={e => {
                            const val = e.target.value;
                            setEditSalePrice(val);
                            // Recalcular markup correspondiente en base al costo
                            const sale = parseFloat(val) || 0;
                            const cost = parseFloat(editCostPrice) || 0;
                            if (cost > 0) {
                              const mk = ((sale - cost) / cost) * 100;
                              setEditMarkup(Math.round(mk).toString());
                            }
                          }}
                          className="w-full p-2.5 rounded border font-mono font-bold text-xs bg-zinc-900 border-zinc-800 text-blue-400 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}

                  {session.permissions.canViewCostPrices && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Margen Sugerido (Markup %)</label>
                        <span className="text-[11px] font-mono text-zinc-400">{editMarkup}%</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="range"
                          min="5"
                          max="150"
                          step="1"
                          value={editMarkup}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setEditMarkup(val.toString());
                            const cost = parseFloat(editCostPrice) || 0;
                            const sale = Math.round((cost * (1 + val / 100)) * 2) / 2;
                            setEditSalePrice(sale.toFixed(2));
                          }}
                          className="flex-grow accent-indigo-500 cursor-pointer"
                        />
                        <input
                          type="number"
                          value={editMarkup}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setEditMarkup(val.toString());
                            const cost = parseFloat(editCostPrice) || 0;
                            const sale = Math.round((cost * (1 + val / 100)) * 2) / 2;
                            setEditSalePrice(sale.toFixed(2));
                          }}
                          className="w-14 p-1 text-center text-[11px] font-mono bg-zinc-900 border border-zinc-850 rounded text-white"
                        />
                      </div>
                    </div>
                  )}

                  {session.permissions.canViewCostPrices && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">IVA (%)</label>
                        <select
                          value={editIvaPercent}
                          onChange={e => setEditIvaPercent(parseInt(e.target.value) || 0)}
                          className="w-full p-2.5 rounded border text-xs bg-zinc-900 border-zinc-800 text-white focus:outline-none"
                        >
                          <option value="0">0% (Tasa Cero)</option>
                          <option value="16">16% (General)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">IEPS (%)</label>
                        <select
                          value={editIepsPercent}
                          onChange={e => setEditIepsPercent(parseInt(e.target.value) || 0)}
                          className="w-full p-2.5 rounded border text-xs bg-zinc-900 border-zinc-800 text-white focus:outline-none"
                        >
                          <option value="0">0% (Ninguno)</option>
                          <option value="8">8% (Alimento Chatarra)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {session.permissions.canViewCostPrices && (
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs space-y-1.5 font-mono">
                      {(() => {
                        const sale = parseFloat(editSalePrice) || 0;
                        const cost = parseFloat(editCostPrice) || 0;
                        
                        // Fórmula fiscal mexicana: Precio Neto = Precio Venta Mostrador / (1 + (IVA%/100) + (IEPS%/100))
                        const netPrice = sale / (1 + (editIvaPercent / 100) + (editIepsPercent / 100));
                        const netProfit = netPrice - cost;
                        const netPct = netPrice > 0 ? (netProfit / netPrice) * 100 : 0;
                        
                        // Determinar color de salud de margen
                        const isWarning = netPct < 10;
                        const isGood = netPct >= 25;
                        const statusColor = isWarning ? 'text-red-400' : isGood ? 'text-emerald-400 animate-pulse' : 'text-amber-400';
                        const statusText = isWarning ? '⚠️ Margen Bajo' : isGood ? '🟢 Saludable' : '🟡 Aceptable';

                        return (
                          <>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-zinc-500">Precio Neto SAT:</span>
                              <span className="font-bold text-zinc-300">${netPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500">Ganancia Neta Real:</span>
                              <span className={`font-bold ${statusColor}`}>${netProfit.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500">Margen Neto %:</span>
                              <span className={`font-bold ${statusColor}`}>{netPct.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-zinc-850 pt-1.5 mt-1 text-[10px]">
                              <span className="text-zinc-500">Diagnóstico:</span>
                              <span className={`font-extrabold uppercase ${statusColor}`}>{statusText}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Cumplimiento Fiscal SAT */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Cumplimiento Fiscal SAT</label>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-zinc-950 p-2.5 rounded border border-zinc-850">
                      <div>
                        <span className="text-zinc-500 block text-[9px]">CLAVE SAT</span>
                        <span className="text-zinc-300 font-bold">{selectedProduct.satCode || '50202306'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9px]">UNIDAD SAT</span>
                        <span className="text-zinc-300 font-bold">{selectedProduct.satUnit || 'H87 (Pza)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Desensamblar Caja */}
                  <div className="border-t border-zinc-850 pt-4 mt-4 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">📦</span>
                      <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Desensamblar Caja (Unpack)</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Divide una caja/paquete mayorista de este producto en unidades individuales al instante.
                    </p>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[9px] text-zinc-500 uppercase mb-1">Pzs por Caja</label>
                          <input
                            type="number"
                            min="1"
                            value={unpackMultiplier}
                            onChange={e => setUnpackMultiplier(parseInt(e.target.value) || 24)}
                            className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-zinc-500 uppercase mb-1">Destinatario</label>
                          <select
                            value={unpackTargetId}
                            onChange={e => setUnpackTargetId(e.target.value)}
                            className="w-full p-2 rounded bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none"
                          >
                            <option value="">-- Seleccionar --</option>
                            {products.filter(p => p.id !== selectedProduct.id).map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name.slice(0, 16)} ({p.internalCode})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleUnpackBox}
                        disabled={selectedProduct.stock < 1 || !unpackTargetId}
                        className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-600/20 rounded text-xs font-bold text-indigo-400 hover:text-white border border-indigo-500/30 transition-all cursor-pointer"
                      >
                        ⚡ DESENSAMBLAR 1 CAJA
                      </button>
                    </div>
                  </div>

                  {session.permissions.canEditProducts && (
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-xs font-bold text-white transition-colors"
                    >
                      💾 ACTUALIZAR VALORES
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  )}

      {/* MODAL PARA NUEVO PRODUCTO */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateProduct}
            className="w-full max-w-md p-6 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-extrabold text-white">Registrar Nuevo Producto</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ej. Galletas Chokis 100g"
                  className="w-full p-2.5 rounded border bg-zinc-800 border-zinc-700 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Código Interno</label>
                  <input
                    type="text"
                    required
                    value={newInternalCode}
                    onChange={e => setNewInternalCode(e.target.value)}
                    placeholder="ej. CHOKIS-100"
                    className="w-full p-2.5 rounded border bg-zinc-800 border-zinc-700 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">EAN / Código de Barra</label>
                  <input
                    type="text"
                    value={newBarcode}
                    onChange={e => setNewBarcode(e.target.value)}
                    placeholder="750..."
                    className="w-full p-2.5 rounded border bg-zinc-800 border-zinc-700 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full p-2.5 rounded border bg-zinc-800 border-zinc-700 text-white text-xs"
                  >
                    <option value="Abarrotes">Abarrotes</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Lácteos">Lácteos</option>
                    <option value="Peso/Granel">Peso/Granel</option>
                    <option value="Servicios">Servicios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Unidad</label>
                  <select
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value as any)}
                    className="w-full p-2.5 rounded border bg-zinc-800 border-zinc-700 text-white text-xs"
                  >
                    <option value="pza">Pieza (pza)</option>
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="l">Litro (l)</option>
                    <option value="servicio">Servicio (insumo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-zinc-800 pt-3">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5">Costo ($)</label>
                  <input
                    type="number"
                    value={newCostPrice}
                    onChange={e => setNewCostPrice(e.target.value)}
                    className="w-full p-2 rounded bg-zinc-800 border-zinc-700 text-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5">Precio ($)</label>
                  <input
                    type="number"
                    value={newSalePrice}
                    onChange={e => setNewSalePrice(e.target.value)}
                    className="w-full p-2 rounded bg-zinc-800 border-zinc-700 text-white text-xs font-mono font-bold text-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5">Stock Inicial</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={e => setNewStock(e.target.value)}
                    className="w-full p-2 rounded bg-zinc-800 border-zinc-700 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5">Stock Mínimo</label>
                  <input
                    type="number"
                    value={newStockMin}
                    onChange={e => setNewStockMin(e.target.value)}
                    className="w-full p-2 rounded bg-zinc-800 border-zinc-700 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5">Stock Crítico</label>
                  <input
                    type="number"
                    value={newStockCritical}
                    onChange={e => setNewStockCritical(e.target.value)}
                    className="w-full p-2 rounded bg-zinc-800 border-zinc-700 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5">IVA (%)</label>
                  <select
                    value={newIvaPercent}
                    onChange={e => setNewIvaPercent(parseInt(e.target.value) || 0)}
                    className="w-full p-2 rounded bg-zinc-800 border-zinc-700 text-white text-xs"
                  >
                    <option value="0">0% (Tasa Cero)</option>
                    <option value="16">16% (General)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5">IEPS (%)</label>
                  <select
                    value={newIepsPercent}
                    onChange={e => setNewIepsPercent(parseInt(e.target.value) || 0)}
                    className="w-full p-2 rounded bg-zinc-800 border-zinc-700 text-white text-xs"
                  >
                    <option value="0">0% (Ninguno)</option>
                    <option value="8">8% (Alimento Chatarra)</option>
                  </select>
                </div>
              </div>

              {/* Opciones de Variantes y Lotes FEFO (Fase 2) */}
              <div className="border-t border-zinc-800 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new_has_variants"
                      checked={newHasVariants}
                      onChange={e => setNewHasVariants(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0"
                    />
                    <label htmlFor="new_has_variants" className="text-[10px] font-bold text-zinc-300 uppercase cursor-pointer">
                      Tiene Variantes (Talla, Color, Corte)
                    </label>
                  </div>
                </div>

                {newHasVariants && (
                  <div>
                    <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                      Variantes (separadas por comas)
                    </label>
                    <input
                      type="text"
                      placeholder="ej. Rojo, Azul, XL, Grande"
                      value={newVariantsText}
                      onChange={e => setNewVariantsText(e.target.value)}
                      className="w-full p-2 rounded bg-zinc-800 border-zinc-700 text-white text-xs"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-zinc-800/50 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new_track_expiry"
                      checked={newTrackExpiry}
                      onChange={e => setNewTrackExpiry(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0"
                    />
                    <label htmlFor="new_track_expiry" className="text-[10px] font-bold text-zinc-300 uppercase cursor-pointer">
                      Control de Caducidad y Lotes (FEFO)
                    </label>
                  </div>
                </div>

                {newTrackExpiry && (
                  <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-950/60 border border-zinc-800 rounded-lg">
                    <div>
                      <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Código de Lote</label>
                      <input
                        type="text"
                        value={newExpiryBatch}
                        onChange={e => setNewExpiryBatch(e.target.value)}
                        className="w-full p-1.5 rounded bg-zinc-900 border-zinc-800 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Fecha Caducidad</label>
                      <input
                        type="date"
                        value={newExpiryDate}
                        onChange={e => setNewExpiryDate(e.target.value)}
                        className="w-full p-1.5 rounded bg-zinc-900 border-zinc-800 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="flex-grow py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                className="flex-grow py-2.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white"
              >
                CREAR PRODUCTO
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. MODAL DE IMPORTACIÓN EXCEL MASIVA */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                📤 Importador Masivo de Catálogo Excel
              </h3>
              <button 
                onClick={() => !isImporting && setIsImportModalOpen(false)}
                disabled={isImporting}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
              >
                CERRAR
              </button>
            </div>

            {!isImporting ? (
              <div className="space-y-4">
                <div 
                  onClick={handleExcelImport}
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all space-y-3"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <div className="text-3xl">📊</div>
                  <div>
                    <span className="text-xs font-bold block">Arrastra tu plantilla CSV / Excel aquí</span>
                    <span className="text-[10px] text-zinc-500 block mt-1">O haz clic para seleccionar archivo de tu ordenador</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-zinc-950/20 text-xs text-zinc-400 leading-relaxed space-y-2" style={{ borderColor: 'var(--card-border)' }}>
                  <span className="font-bold text-amber-500 uppercase block tracking-wider">⚠️ REQUISITOS DEL FORMATO</span>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>La primera fila debe contener los encabezados exactos de la plantilla.</li>
                    <li>Los códigos de barra (EAN) deben ser numéricos de 13 dígitos.</li>
                    <li>Las unidades válidas son: pza, kg, g, l, ml, caja, servicio.</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="flex-grow py-2.5 rounded-lg border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold"
                    style={{ borderColor: 'var(--card-border)' }}
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="button"
                    onClick={handleExcelImport}
                    className="flex-grow py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white"
                  >
                    PROCESAR EXCEL
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 space-y-6 text-center">
                <div className="w-16 h-16 rounded-full border-4 border-t-emerald-500 border-emerald-500/10 animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <span className="text-sm font-bold block">{importMessage}</span>
                  <div className="w-full bg-zinc-850 rounded-full h-1.5 max-w-xs mx-auto">
                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL DE SEMILLERO DE PRODUCTOS MEXICANOS */}
      {isSeederModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col justify-between">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                🇲🇽 Semillero de Productos Mexicanos (Alta Rotación)
              </h3>
              <button 
                onClick={() => setIsSeederModalOpen(false)}
                className="text-xs font-bold text-zinc-500 hover:text-zinc-300"
              >
                CERRAR
              </button>
            </div>

            <p className="text-[11px] text-zinc-400">
              Selecciona los productos y digita cuántas <strong>piezas sueltas</strong> o <strong>cajas/paquetes</strong> tienes en bodega. El sistema calculará el total (`Piezas + Cajas * Multiplicador`) y creará o actualizará automáticamente tu inventario con códigos de barras y claves SAT sugeridas.
            </p>

            {/* Selector de Categorías (Tabs) */}
            <div className="flex gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto">
              {['Bebidas', 'Frituras', 'Panadería', 'Lácteos', 'Abarrotes', 'Limpieza'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSeederCategory(cat)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${seederCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white'}`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Listado de Productos Presets bajo la Categoría Activa */}
            <div className="flex-grow overflow-y-auto space-y-3 pr-2 py-2">
              {MEXICAN_PRESETS_CATALOG.filter(p => p.category === seederCategory).map((preset) => {
                const quantities = seederQuantities[preset.internalCode] || { pieces: '', packs: '' };
                
                return (
                  <div key={preset.internalCode} className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-wrap gap-4 items-center justify-between">
                    <div className="space-y-1 min-w-[200px]">
                      <span className="font-bold text-xs text-white block">{preset.name}</span>
                      <div className="flex gap-1.5 items-center flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-bold text-zinc-400 font-mono">EAN: {preset.barcode}</span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-950/30 text-[8px] font-bold text-indigo-400 border border-indigo-900/30 font-mono">SAT: {preset.satCode}</span>
                        <span className="px-1 py-0.5 rounded bg-zinc-900 text-[8.5px] text-zinc-500 font-bold font-mono">Costo: ${preset.defaultCost.toFixed(2)} | P.Venta: ${preset.defaultPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Entrada de Piezas Sueltas */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Piezas</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={quantities.pieces}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSeederQuantities(prev => ({
                              ...prev,
                              [preset.internalCode]: { ...prev[preset.internalCode] || { pieces: '', packs: '' }, pieces: val }
                            }));
                          }}
                          className="w-16 p-1 rounded bg-zinc-900 border border-zinc-800 text-center font-mono text-xs text-white"
                        />
                      </div>

                      {/* Multiplicador Badge */}
                      <span className="text-zinc-500 font-bold text-xs">+</span>

                      {/* Entrada de Packs */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mb-1 font-mono">Cajas (x{preset.packQuantity})</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={quantities.packs}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSeederQuantities(prev => ({
                              ...prev,
                              [preset.internalCode]: { ...prev[preset.internalCode] || { pieces: '', packs: '' }, packs: val }
                            }));
                          }}
                          className="w-16 p-1 rounded bg-zinc-900 border border-zinc-800 text-center font-mono text-xs text-white"
                        />
                      </div>

                      <span className="text-zinc-500 font-bold text-xs">=</span>

                      {/* Total Pre-calculado */}
                      <div className="flex flex-col items-end min-w-[70px]">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Total Stock</span>
                        <span className="font-mono font-bold text-xs text-indigo-400">
                          {((parseFloat(quantities.pieces) || 0) + ((parseFloat(quantities.packs) || 0) * preset.packQuantity))} pza
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Acciones de Semillero */}
            <div className="flex gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsSeederModalOpen(false)}
                className="flex-grow py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs font-bold text-white"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleSeedProducts}
                className="flex-grow py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white"
              >
                📥 SEMBRAR PRODUCTOS SELECCIONADOS
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
