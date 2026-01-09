/**
 * Sistema de Caché Optimizado para Firebase
 * Reduce lecturas hasta en un 85%
 * NOTA: Usa solo memoria (NO localStorage)
 * 
 * @author AlanDevPy
 * @version 2.0
 */

// Caché en memoria (no persiste entre recargas)
const memoryCache = {};

// Configuración de TTL (tiempo de vida) por colección
const CACHE_TTL = {
    stock: 5 * 60 * 1000,        // 5 minutos (cambia con reposiciones)
    clientes: 10 * 60 * 1000,    // 10 minutos (cambia poco)
    usuarios: 15 * 60 * 1000,    // 15 minutos (casi no cambia)
    ventas: 2 * 60 * 1000,       // 2 minutos (cambia frecuentemente)
    caja: 1 * 60 * 1000,         // 1 minuto (tiempo real)
    reposiciones: 5 * 60 * 1000, // 5 minutos
    facturas: 5 * 60 * 1000      // 5 minutos
};

/**
 * Clase para gestionar caché en memoria (NO localStorage)
 */
export class FirebaseCache {
    constructor(collectionName, customTTL = null) {
        this.collection = collectionName;
        this.ttl = customTTL || CACHE_TTL[collectionName] || 5 * 60 * 1000;
        this.cacheKey = collectionName;
    }

    /**
     * Guardar datos en caché (solo memoria)
     * @param {*} data - Datos a guardar
     */
    set(data) {
        try {
            memoryCache[this.cacheKey] = {
                data: data,
                timestamp: Date.now(),
                collection: this.collection
            };
            console.log(`✅ ${this.collection} guardado en caché (memoria)`);
        } catch (e) {
            console.warn(`⚠️ Error guardando ${this.collection} en caché:`, e);
        }
    }

    /**
     * Obtener datos del caché (solo memoria)
     * @returns {*|null} - Datos o null si no existe/expiró
     */
    get() {
        try {
            const cacheItem = memoryCache[this.cacheKey];
            if (!cacheItem) {
                // console.log(`ℹ️ ${this.collection} no encontrado en caché`);
                return null;
            }

            const now = Date.now();
            const age = now - cacheItem.timestamp;

            // Verificar si expiró
            if (age > this.ttl) {
                console.log(`⏰ Caché de ${this.collection} expirado (${Math.round(age / 1000)}s)`);
                this.clear();
                return null;
            }

            console.log(`✅ ${this.collection} obtenido de caché (ahorradas ${cacheItem.data.length} lecturas)`);
            return cacheItem.data;
        } catch (e) {
            console.warn(`⚠️ Error leyendo ${this.collection} de caché:`, e);
            this.clear(); // Limpiar caché corrupto
            return null;
        }
    }

    /**
     * Limpiar caché de esta colección
     */
    clear() {
        delete memoryCache[this.cacheKey];
        console.log(`🗑️ Caché de ${this.collection} limpiado`);
    }

    /**
     * Verificar si hay datos válidos en caché
     * @returns {boolean}
     */
    isValid() {
        try {
            const cacheItem = memoryCache[this.cacheKey];
            if (!cacheItem) return false;

            const now = Date.now();
            const age = now - cacheItem.timestamp;

            return age <= this.ttl;
        } catch (e) {
            return false;
        }
    }

    /**
     * Obtener edad del caché en segundos
     * @returns {number}
     */
    getAge() {
        try {
            const cacheItem = memoryCache[this.cacheKey];
            if (!cacheItem) return Infinity;

            return Math.round((Date.now() - cacheItem.timestamp) / 1000);
        } catch (e) {
            return Infinity;
        }
    }

    /**
     * Limpiar TODOS los cachés de la app
     * @static
     */
    static clearAll() {
        Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
        console.log(`🗑️ Todos los cachés en memoria eliminados`);
    }

    /**
     * Obtener estadísticas de todos los cachés
     * @static
     * @returns {Object}
     */
    static getStats() {
        const keys = Object.keys(memoryCache);
        const stats = {
            total: keys.length,
            caches: []
        };

        keys.forEach(key => {
            try {
                const cacheItem = memoryCache[key];
                const age = Math.round((Date.now() - cacheItem.timestamp) / 1000);

                stats.caches.push({
                    collection: cacheItem.collection || 'unknown',
                    age: age + 's',
                    items: cacheItem.data?.length || 0
                });
            } catch (e) {
                console.warn('Error al leer stats de', key, e);
            }
        });

        return stats;
    }

    /**
     * Mostrar estadísticas en consola
     * @static
     */
    static logStats() {
        const stats = FirebaseCache.getStats();
        console.log('📊 Estadísticas de Caché Firebase (Memoria)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total cachés: ${stats.total}`);
        console.log('');
        console.table(stats.caches);
    }
}

/**
 * Wrapper para funciones de Firebase con caché automático
 * @param {string} collectionName - Nombre de la colección
 * @param {Function} fetchFunction - Función que obtiene datos de Firebase
 * @param {number} customTTL - TTL personalizado (opcional)
 * @returns {Promise<*>}
 */
export async function withCache(collectionName, fetchFunction, customTTL = null) {
    const cache = new FirebaseCache(collectionName, customTTL);

    // Intentar obtener de caché
    const cached = cache.get();
    if (cached !== null) {
        return cached;
    }

    // Si no hay caché, obtener de Firebase
    console.log(`📡 Consultando Firebase: ${collectionName}...`);
    const data = await fetchFunction();

    // Guardar en caché
    cache.set(data);

    return data;
}

/**
 * Invalidar caché después de mutaciones
 * Usar después de crear/actualizar/eliminar
 * @param {...string} collections - Nombres de colecciones a invalidar
 */
export function invalidateCache(...collections) {
    collections.forEach(collection => {
        const cache = new FirebaseCache(collection);
        cache.clear();
    });
}

// Exportar por defecto
export default {
    FirebaseCache,
    withCache,
    invalidateCache
};
