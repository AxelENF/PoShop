export interface ProductSeed {
  id: string;
  name: string;
  category: string;
  barcode: string;
  internalCode: string;
  unit: 'pza' | 'kg' | 'g' | 'l' | 'ml' | 'caja' | 'servicio';
  costPrice: number;
  salePrice: number;
  wholesalePrice?: number;
  stock: number;
  stockMin: number;
  stockCritical: number;
  hasVariants?: boolean;
  variantsList?: string[];
  trackExpiry?: boolean;
  expirationBatch?: { batchCode: string; expiryDate: string; stock: number }[];
  satCode?: string;
  satUnit?: string;
  ivaPercent?: number;
  iepsPercent?: number;
}

export interface PresetProduct {
  name: string;
  category: string;
  barcode: string;
  internalCode: string;
  unit: 'pza' | 'kg' | 'g' | 'l' | 'ml' | 'caja' | 'servicio';
  defaultCost: number;
  defaultPrice: number;
  satCode: string;
  satUnit: string;
  packQuantity: number;
  ivaPercent?: number;
  iepsPercent?: number;
}


export interface CustomerSeed {
  id: string;
  name: string;
  creditEnabled: boolean;
  creditLimit: number;
  currentBalance: number;
  rfc?: string;
  phone?: string;
  email?: string;
  paymentTermDays?: number;
  lastCreditDate?: string;
  creditDueDate?: string;
}

export const PRODUCTS_SEED: ProductSeed[] = [
  // Abarrotes / General (Perfil A)
  {
    id: 'prod-001',
    name: 'Coca-Cola Original 600ml',
    category: 'Abarrotes',
    barcode: '7501055300077',
    internalCode: 'COCA-600',
    unit: 'pza',
    costPrice: 14.50,
    salePrice: 19.00,
    wholesalePrice: 17.50,
    stock: 75.000,
    stockMin: 15.000,
    stockCritical: 5.000,
    ivaPercent: 16,
    iepsPercent: 8,
  },
  {
    id: 'prod-002',
    name: 'Aceite Vegetal Nutrioli 1L',
    category: 'Abarrotes',
    barcode: '7501055900222',
    internalCode: 'NUT-1L',
    unit: 'pza',
    costPrice: 29.80,
    salePrice: 38.00,
    wholesalePrice: 35.00,
    stock: 40.000,
    stockMin: 8.000,
    stockCritical: 3.000,
    ivaPercent: 0,
    iepsPercent: 0,
  },
  {
    id: 'prod-003',
    name: 'Jabón de Barra Zote Blanco 400g',
    category: 'Limpieza',
    barcode: '7501021111888',
    internalCode: 'ZOTE-W',
    unit: 'pza',
    costPrice: 18.20,
    salePrice: 24.50,
    stock: 60.000,
    stockMin: 10.000,
    stockCritical: 4.000,
    ivaPercent: 16,
    iepsPercent: 0,
  },
  {
    id: 'prod-004',
    name: 'Leche Entera Lala 1L',
    category: 'Lácteos',
    barcode: '7501020512345',
    internalCode: 'LALA-1L',
    unit: 'pza',
    costPrice: 21.00,
    salePrice: 26.50,
    wholesalePrice: 24.80,
    stock: 50.000,
    stockMin: 12.000,
    stockCritical: 5.000,
    ivaPercent: 0,
    iepsPercent: 0,
  },

  // Peso y Granel (Perfil B)
  {
    id: 'prod-005',
    name: 'Jitomate Saladet Fresco',
    category: 'Peso/Granel',
    barcode: '',
    internalCode: 'JIT-SAL',
    unit: 'kg',
    costPrice: 18.00,
    salePrice: 28.00,
    stock: 120.000,
    stockMin: 15.000,
    stockCritical: 5.000,
  },
  {
    id: 'prod-006',
    name: 'Huevo Blanco San Juan',
    category: 'Peso/Granel',
    barcode: '',
    internalCode: 'HUE-SJ',
    unit: 'kg',
    costPrice: 31.50,
    salePrice: 42.00,
    stock: 80.000,
    stockMin: 10.000,
    stockCritical: 4.000,
  },
  {
    id: 'prod-007',
    name: 'Pechuga de Pollo Fresca',
    category: 'Peso/Granel',
    barcode: '',
    internalCode: 'POL-PECH',
    unit: 'kg',
    costPrice: 82.00,
    salePrice: 110.00,
    stock: 35.000,
    stockMin: 5.000,
    stockCritical: 2.000,
  },

  // Servicios con Inventario (Perfil E)
  {
    id: 'prod-008',
    name: 'Servicio Copiado B/N Tamaño Carta',
    category: 'Servicios',
    barcode: '',
    internalCode: 'SERV-COP-BN',
    unit: 'servicio',
    costPrice: 0.35,
    salePrice: 1.50,
    stock: 1000.000, // Representa stock de hojas
    stockMin: 200.000,
    stockCritical: 50.000,
  },
  {
    id: 'prod-009',
    name: 'Servicio Engargolado Plástico Carta',
    category: 'Servicios',
    barcode: '',
    internalCode: 'SERV-ENG',
    unit: 'servicio',
    costPrice: 8.50,
    salePrice: 25.00,
    stock: 50.000, // Stock de espirales
    stockMin: 10.000,
    stockCritical: 3.000,
  },
];

export const CUSTOMERS_SEED: CustomerSeed[] = [
  {
    id: 'cust-general',
    name: 'Público General',
    creditEnabled: false,
    creditLimit: 0,
    currentBalance: 0,
  },
  {
    id: 'cust-001',
    name: 'Manuel Ortiz (Don Manuel)',
    creditEnabled: true,
    creditLimit: 500.00,
    currentBalance: 120.50,
    paymentTermDays: 15,
    creditDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // vence en 10 días
  },
  {
    id: 'cust-002',
    name: 'María Gutiérrez (Doña María)',
    creditEnabled: true,
    creditLimit: 1200.00,
    currentBalance: 450.00,
    paymentTermDays: 15,
    creditDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // vence en 5 días
  },
  {
    id: 'cust-003',
    name: 'Francisco Lope (Constructor)',
    creditEnabled: true,
    creditLimit: 5000.00,
    currentBalance: 1800.00,
    paymentTermDays: 30,
    creditDueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // VENCIDO hace 5 días
  },
];

export const MEXICAN_PRESETS_CATALOG: PresetProduct[] = [
  // Bebidas (Refrescos/Agua)
  {
    name: 'Coca-Cola Original 600ml',
    category: 'Bebidas',
    barcode: '7501055300077',
    internalCode: 'COCA-600',
    unit: 'pza',
    defaultCost: 14.50,
    defaultPrice: 19.00,
    satCode: '50202306',
    satUnit: 'H87',
    packQuantity: 24,
  },
  {
    name: 'Pepsi Cola Original 600ml',
    category: 'Bebidas',
    barcode: '7501013101017',
    internalCode: 'PEPSI-600',
    unit: 'pza',
    defaultCost: 12.00,
    defaultPrice: 16.50,
    satCode: '50202306',
    satUnit: 'H87',
    packQuantity: 24,
  },
  {
    name: 'Jarrito Vidrio Multisabor 355ml',
    category: 'Bebidas',
    barcode: '7501026027547',
    internalCode: 'JARR-355',
    unit: 'pza',
    defaultCost: 9.00,
    defaultPrice: 13.00,
    satCode: '50202306',
    satUnit: 'H87',
    packQuantity: 24,
  },
  {
    name: 'Agua Purificada Ciel 1L',
    category: 'Bebidas',
    barcode: '7501055310887',
    internalCode: 'CIEL-1L',
    unit: 'pza',
    defaultCost: 7.50,
    defaultPrice: 12.00,
    satCode: '50202301',
    satUnit: 'H87',
    packQuantity: 12,
  },

  // Botanas (Frituras/Chips)
  {
    name: 'Papas Sabritas con Sal 45g',
    category: 'Frituras',
    barcode: '7501011115609',
    internalCode: 'SAB-SAL',
    unit: 'pza',
    defaultCost: 13.80,
    defaultPrice: 18.50,
    satCode: '50192100',
    satUnit: 'H87',
    packQuantity: 20,
  },
  {
    name: 'Cheetos Torciditos Queso 50g',
    category: 'Frituras',
    barcode: '7501011131043',
    internalCode: 'CHEE-TOR',
    unit: 'pza',
    defaultCost: 11.00,
    defaultPrice: 15.00,
    satCode: '50192100',
    satUnit: 'H87',
    packQuantity: 20,
  },
  {
    name: 'Doritos Nacho Queso 58g',
    category: 'Frituras',
    barcode: '7501011115654',
    internalCode: 'DOR-NACH',
    unit: 'pza',
    defaultCost: 14.50,
    defaultPrice: 20.00,
    satCode: '50192100',
    satUnit: 'H87',
    packQuantity: 20,
  },
  {
    name: 'Takis Fuego Barcel 62g',
    category: 'Frituras',
    barcode: '7501030467794',
    internalCode: 'TAK-FUEG',
    unit: 'pza',
    defaultCost: 13.80,
    defaultPrice: 19.00,
    satCode: '50192100',
    satUnit: 'H87',
    packQuantity: 22,
  },

  // Panadería (Bimbo/Marinela)
  {
    name: 'Pan Blanco Bimbo Grande',
    category: 'Panadería',
    barcode: '7501000111200',
    internalCode: 'BIM-BLAN',
    unit: 'pza',
    defaultCost: 35.00,
    defaultPrice: 47.00,
    satCode: '50181900',
    satUnit: 'H87',
    packQuantity: 8,
  },
  {
    name: 'Gansito Marinela 50g',
    category: 'Panadería',
    barcode: '7501000133035',
    internalCode: 'GANS-50',
    unit: 'pza',
    defaultCost: 11.80,
    defaultPrice: 16.50,
    satCode: '50181900',
    satUnit: 'H87',
    packQuantity: 12,
  },
  {
    name: 'Mantecadas Bimbo Vainilla 4p',
    category: 'Panadería',
    barcode: '7501000123517',
    internalCode: 'MANT-VAN',
    unit: 'pza',
    defaultCost: 20.20,
    defaultPrice: 28.00,
    satCode: '50181900',
    satUnit: 'H87',
    packQuantity: 10,
  },

  // Lácteos (Leche/Queso)
  {
    name: 'Leche Lala Entera UHT 1L',
    category: 'Lácteos',
    barcode: '7501020512345',
    internalCode: 'LALA-ENT',
    unit: 'pza',
    defaultCost: 21.00,
    defaultPrice: 27.00,
    satCode: '50131700',
    satUnit: 'H87',
    packQuantity: 12,
  },
  {
    name: 'Yoghurt Bebible Lala Fresa 220g',
    category: 'Lácteos',
    barcode: '7501020515152',
    internalCode: 'YOG-LAL-FR',
    unit: 'pza',
    defaultCost: 8.50,
    defaultPrice: 12.00,
    satCode: '50131700',
    satUnit: 'H87',
    packQuantity: 8,
  },
  {
    name: 'Queso Oaxaca La Villita 200g',
    category: 'Lácteos',
    barcode: '7501006558122',
    internalCode: 'Q-OAX-VIL',
    unit: 'pza',
    defaultCost: 35.00,
    defaultPrice: 47.00,
    satCode: '50131800',
    satUnit: 'H87',
    packQuantity: 10,
  },

  // Abarrotes (Conservas/Aceite)
  {
    name: 'Frijoles Bayos Refritos Isadora 430g',
    category: 'Abarrotes',
    barcode: '7501026002779',
    internalCode: 'ISA-BAY',
    unit: 'pza',
    defaultCost: 14.50,
    defaultPrice: 19.50,
    satCode: '50191500',
    satUnit: 'H87',
    packQuantity: 12,
  },
  {
    name: 'Atún Dolores en Agua 140g',
    category: 'Abarrotes',
    barcode: '7501003112349',
    internalCode: 'DOL-AGU',
    unit: 'pza',
    defaultCost: 16.20,
    defaultPrice: 23.00,
    satCode: '50121500',
    satUnit: 'H87',
    packQuantity: 48,
  },
  {
    name: 'Chiles Jalapeños Enteros La Costeña 220g',
    category: 'Abarrotes',
    barcode: '7501017006025',
    internalCode: 'COST-JAL',
    unit: 'pza',
    defaultCost: 10.80,
    defaultPrice: 15.50,
    satCode: '50191500',
    satUnit: 'H87',
    packQuantity: 24,
  },
  {
    name: 'Aceite de Soya Nutrioli 1L',
    category: 'Abarrotes',
    barcode: '7501055900222',
    internalCode: 'NUT-SOY',
    unit: 'pza',
    defaultCost: 29.80,
    defaultPrice: 38.50,
    satCode: '50151500',
    satUnit: 'H87',
    packQuantity: 12,
  },

  // Limpieza / Cuidado Personal
  {
    name: 'Jabón Zote Blanco 400g',
    category: 'Limpieza',
    barcode: '7501021111888',
    internalCode: 'ZOT-BLAN',
    unit: 'pza',
    defaultCost: 18.20,
    defaultPrice: 24.50,
    satCode: '47131811',
    satUnit: 'H87',
    packQuantity: 25,
  },
  {
    name: 'Cloralex Rendidor Cloro 950ml',
    category: 'Limpieza',
    barcode: '7501025400262',
    internalCode: 'CLOR-950',
    unit: 'pza',
    defaultCost: 13.50,
    defaultPrice: 19.00,
    satCode: '47131803',
    satUnit: 'H87',
    packQuantity: 15,
  },
  {
    name: 'Pasta Dental Colgate Triple Acción 75ml',
    category: 'Limpieza',
    barcode: '7501035911477',
    internalCode: 'COLG-75',
    unit: 'pza',
    defaultCost: 20.80,
    defaultPrice: 29.00,
    satCode: '53131502',
    satUnit: 'H87',
    packQuantity: 12,
  },
];

