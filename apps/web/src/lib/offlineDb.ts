/**
 * SNAPGAD POS - Motor IndexedDB Offline-First
 * Gestiona el catálogo de productos local y la cola de sincronización de ventas (Sync Queue).
 */

const DB_NAME = 'poshop_offline_db';
const DB_VERSION = 1;

export interface OfflineProduct {
  id: string;
  name: string;
  barcode: string;
  salePrice: number;
  stock: number;
  unit: string;
  category: string;
}

export interface OfflineSale {
  id: string; // offlineId (UUID o timestamp)
  cart: {
    productId: string;
    productName: string;
    quantity: number;
    salePrice: number;
  }[];
  total: number;
  paymentMethod: string;
  createdAt: string;
}

export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB no está disponible en el servidor.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline_sales')) {
        db.createObjectStore('offline_sales', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 📦 Guardar catálogo completo de productos en local
export async function saveCatalogLocal(products: OfflineProduct[]): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('products', 'readwrite');
    const store = transaction.objectStore('products');

    // Limpiar catálogo viejo antes de rellenar
    store.clear();

    products.forEach((product) => {
      store.put(product);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// 📦 Obtener productos locales de IndexedDB
export async function getLocalProducts(): Promise<OfflineProduct[]> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('products', 'readonly');
    const store = transaction.objectStore('products');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// 📥 Encolar venta realizada sin internet
export async function saveOfflineSale(sale: OfflineSale): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offline_sales', 'products'], 'readwrite');
    const salesStore = transaction.objectStore('offline_sales');
    const productsStore = transaction.objectStore('products');

    // Guardar la venta en la cola de sincronización
    salesStore.put(sale);

    // Descontar inmediatamente el stock localmente en IndexedDB para evitar discrepancias visuales al cajero
    sale.cart.forEach((item) => {
      const getRequest = productsStore.get(item.productId);
      getRequest.onsuccess = () => {
        const prod = getRequest.result as OfflineProduct | undefined;
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
          productsStore.put(prod);
        }
      };
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// 📤 Obtener todas las ventas pendientes de sincronizar
export async function getPendingSales(): Promise<OfflineSale[]> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offline_sales', 'readonly');
    const store = transaction.objectStore('offline_sales');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// 🗑️ Eliminar venta de la cola una vez que se sincronizó exitosamente al servidor
export async function deletePendingSale(saleId: string): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offline_sales', 'readwrite');
    const store = transaction.objectStore('offline_sales');
    const request = store.delete(saleId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
