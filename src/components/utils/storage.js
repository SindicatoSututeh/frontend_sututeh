// =====================================================
// Sistema de almacenamiento local con IndexedDB
// Solo para contenido PÚBLICO de la PWA
// Autor: Jonathan García Martínez
// Versión: v2.0.0 - PWA Pública
// =====================================================

const DB_NAME = 'SUTUTEH_PUBLIC_DB';
const DB_VERSION = 1;

export const STORES = {
  NOTICIAS: 'noticias',           // Cache de noticias públicas
  DATOS_EMPRESA: 'datosEmpresa',  // Datos de quienes somos
  OFFLINE_QUEUE: 'offlineQueue',  // Cola de sincronización (contacto)
  API_CACHE: 'apiCache'           // Cache general de APIs públicas
};

// ====== INDEXEDDB ======

// Inicializar IndexedDB
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('❌ Error al abrir IndexedDB:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log('✅ IndexedDB público inicializado');
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store para noticias
      if (!db.objectStoreNames.contains(STORES.NOTICIAS)) {
        const noticiasStore = db.createObjectStore(STORES.NOTICIAS, { keyPath: 'id' });
        noticiasStore.createIndex('fecha', 'fecha', { unique: false });
        console.log('✅ Store creado: noticias');
      }
      
      // Store para datos de empresa (quienes somos)
      if (!db.objectStoreNames.contains(STORES.DATOS_EMPRESA)) {
        db.createObjectStore(STORES.DATOS_EMPRESA, { keyPath: 'id' });
        console.log('✅ Store creado: datosEmpresa');
      }
      
      // Store para cola de sincronización (formulario contacto)
      if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('status', 'status', { unique: false });
        console.log('✅ Store creado: offlineQueue');
      }
      
      // Store para cache general de APIs
      if (!db.objectStoreNames.contains(STORES.API_CACHE)) {
        const cacheStore = db.createObjectStore(STORES.API_CACHE, { keyPath: 'url' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('✅ Store creado: apiCache');
      }
    };
  });
};

// Guardar datos en IndexedDB
export const saveData = async (storeName, data) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => {
        console.log(`✅ Datos guardados en ${storeName}:`, data.id || data.url);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error(`❌ Error al guardar en ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error en saveData:', error);
    throw error;
  }
};

// Obtener datos de IndexedDB
export const getData = async (storeName, key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error en getData:', error);
    throw error;
  }
};

// Obtener todos los datos
export const getAllData = async (storeName) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error en getAllData:', error);
    throw error;
  }
};

// Eliminar datos
export const deleteData = async (storeName, key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => {
        console.log(`✅ Datos eliminados de ${storeName}:`, key);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error en deleteData:', error);
    throw error;
  }
};

// Limpiar store completo
export const clearStore = async (storeName) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log(`✅ Store limpiado: ${storeName}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error en clearStore:', error);
    throw error;
  }
};

// ====== COLA DE SINCRONIZACIÓN OFFLINE (FORMULARIO CONTACTO) ======

// Agregar petición a la cola (ej: formulario de contacto offline)
export const addToSyncQueue = async (requestData) => {
  const data = {
    url: requestData.url,
    method: requestData.method,
    body: requestData.body,
    headers: requestData.headers || {},
    timestamp: Date.now(),
    status: 'pending',
    retries: 0
  };
  
  console.log('📥 Agregando a cola de sincronización:', data.url);
  return await saveData(STORES.OFFLINE_QUEUE, data);
};

// Procesar cola de sincronización
export const processSyncQueue = async () => {
  if (!navigator.onLine) {
    console.warn('⚠️ Sin conexión. No se puede sincronizar.');
    return [];
  }

  const queue = await getAllData(STORES.OFFLINE_QUEUE);
  console.log(`🔄 Procesando ${queue.length} peticiones en cola`);
  
  const results = [];
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        body: item.body,
        headers: {
          'Content-Type': 'application/json',
          ...item.headers
        }
      });
      
      if (response.ok) {
        await deleteData(STORES.OFFLINE_QUEUE, item.id);
        console.log('✅ Petición sincronizada:', item.url);
        results.push({ success: true, item });
      } else {
        console.warn('⚠️ Petición falló:', item.url, response.status);
        
        // Incrementar reintentos
        const updatedItem = { ...item, retries: item.retries + 1 };
        if (updatedItem.retries < 3) {
          await saveData(STORES.OFFLINE_QUEUE, updatedItem);
        } else {
          // Después de 3 reintentos, eliminar
          await deleteData(STORES.OFFLINE_QUEUE, item.id);
          console.error('❌ Máximo de reintentos alcanzado:', item.url);
        }
        
        results.push({ success: false, item, error: response.statusText });
      }
    } catch (error) {
      console.error('❌ Error al sincronizar:', item.url, error);
      results.push({ success: false, item, error: error.message });
    }
  }
  
  return results;
};

// Obtener cantidad de peticiones pendientes
export const getPendingCount = async () => {
  try {
    const queue = await getAllData(STORES.OFFLINE_QUEUE);
    return queue.filter(item => item.status === 'pending').length;
  } catch (error) {
    console.error('❌ Error al obtener count:', error);
    return 0;
  }
};

// ====== CACHE DE NOTICIAS PÚBLICAS ======

// Guardar todas las noticias
export const cacheNoticias = async (noticias) => {
  try {
    for (const noticia of noticias) {
      await saveData(STORES.NOTICIAS, noticia);
    }
    console.log(`💾 ${noticias.length} noticias cacheadas`);
  } catch (error) {
    console.error('❌ Error al cachear noticias:', error);
  }
};

// Obtener noticias cacheadas
export const getCachedNoticias = async () => {
  try {
    const noticias = await getAllData(STORES.NOTICIAS);
    console.log(`✅ ${noticias.length} noticias recuperadas del cache`);
    return noticias;
  } catch (error) {
    console.error('❌ Error al obtener noticias:', error);
    return [];
  }
};

// Obtener una noticia específica
export const getCachedNoticia = async (id) => {
  try {
    const noticia = await getData(STORES.NOTICIAS, parseInt(id));
    return noticia || null;
  } catch (error) {
    console.error('❌ Error al obtener noticia:', error);
    return null;
  }
};

// ====== CACHE DE DATOS DE EMPRESA (QUIENES SOMOS) ======

// Guardar datos de empresa
export const cacheDatosEmpresa = async (datos) => {
  try {
    await saveData(STORES.DATOS_EMPRESA, { id: 'empresa', ...datos });
    console.log('💾 Datos de empresa cacheados');
  } catch (error) {
    console.error('❌ Error al cachear datos empresa:', error);
  }
};

// Obtener datos de empresa
export const getCachedDatosEmpresa = async () => {
  try {
    const datos = await getData(STORES.DATOS_EMPRESA, 'empresa');
    return datos || null;
  } catch (error) {
    console.error('❌ Error al obtener datos empresa:', error);
    return null;
  }
};

// ====== CACHE GENERAL DE APIs ======

// Cachear respuesta de API
export const cacheApiResponse = async (url, data) => {
  try {
    const cacheItem = {
      url,
      data,
      timestamp: Date.now(),
    };
    
    await saveData(STORES.API_CACHE, cacheItem);
    console.log(`💾 API cacheada: ${url}`);
  } catch (error) {
    console.error('❌ Error al cachear API:', error);
  }
};

// Obtener respuesta cacheada
export const getCachedResponse = async (url) => {
  try {
    const cached = await getData(STORES.API_CACHE, url);
    
    if (cached) {
      // Verificar si el cache no está muy viejo (24 horas)
      const age = Date.now() - cached.timestamp;
      if (age < 24 * 60 * 60 * 1000) {
        console.log(`✅ Cache recuperado: ${url}`);
        return cached.data;
      } else {
        // Eliminar cache viejo
        await deleteData(STORES.API_CACHE, url);
        console.log(`⏰ Cache expirado: ${url}`);
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error al obtener cache:', error);
    return null;
  }
};

// Limpiar cache antiguo (más de 7 días)
export const clearOldCache = async () => {
  try {
    const allCache = await getAllData(STORES.API_CACHE);
    const maxAge = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 días
    
    let deletedCount = 0;
    for (const item of allCache) {
      if (item.timestamp < maxAge) {
        await deleteData(STORES.API_CACHE, item.url);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️ ${deletedCount} caches antiguos eliminados`);
    }
  } catch (error) {
    console.error('❌ Error al limpiar cache:', error);
  }
};

// ====== HELPERS ======

// Verificar si IndexedDB está disponible
export const isIndexedDBAvailable = () => {
  return 'indexedDB' in window;
};

// Inicializar sistema de almacenamiento público
export const initStorage = async () => {
  console.log('🚀 Inicializando almacenamiento PWA público...');
  
  if (!isIndexedDBAvailable()) {
    console.warn('⚠️ IndexedDB no disponible');
    return false;
  }
  
  try {
    await initDB();
    
    // Limpiar cache antiguo en cada inicio
    await clearOldCache();
    
    console.log('✅ Almacenamiento público listo (/, /noticias, /quienes-somos)');
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar almacenamiento:', error);
    return false;
  }
};