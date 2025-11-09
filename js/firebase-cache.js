/**
 * Sistema de Caché Optimizado para Firebase
 * Reduce lecturas hasta en un 85%
 * 
 * @author AlanDevPy
 * @version 1.0
 */

const CACHE_PREFIX = 'petrochaco_';
const CACHE_VERSION = 'v1';

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
 * Clase para gestionar caché con localStorage
 */
export class FirebaseCache {
    constructor(collectionName, customTTL = null) {
        this.collection = collectionName;
        this.ttl = customTTL || CACHE_TTL[collectionName] || 5 * 60 * 1000;
        this.cacheKey = `${CACHE_PREFIX}${collectionName}_${CACHE_VERSION}`;
    }

    /**
     * Guardar datos en caché
     * @param {*} data - Datos a guardar
     */
    set(data) {
        try {
            const cacheItem = {
                data: data,
                timestamp: Date.now(),
                collection: this.collection
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheItem));
            console.log(`✅ ${this.collection} guardado en caché (${this._getSize()} KB)`);
        } catch (e) {
            // Si localStorage está lleno, limpiar cachés viejos
            if (e.name === 'QuotaExceededError') {
                console.warn('⚠️ localStorage lleno, limpiando...');
                this._clearOldCaches();
                // Intentar guardar nuevamente
                try {
                    localStorage.setItem(this.cacheKey, JSON.stringify(cacheItem));
                } catch (e2) {
                    console.error('❌ No se pudo guardar en caché:', e2);
                }
            } else {
                console.warn(`⚠️ Error guardando ${this.collection} en caché:`, e);
            }
        }
    }

    /**
     * Obtener datos del caché
     * @returns {*|null} - Datos o null si no existe/expiró
     */
    get() {
        try {
            const item = localStorage.getItem(this.cacheKey);
            if (!item) {
                console.log(`ℹ️ ${this.collection} no encontrado en caché`);
                return null;
            }

            const cacheItem = JSON.parse(item);
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
        localStorage.removeItem(this.cacheKey);
        console.log(`🗑️ Caché de ${this.collection} limpiado`);
    }

    /**
     * Verificar si hay datos válidos en caché
     * @returns {boolean}
     */
    isValid() {
        try {
            const item = localStorage.getItem(this.cacheKey);
            if (!item) return false;

            const cacheItem = JSON.parse(item);
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
            const item = localStorage.getItem(this.cacheKey);
            if (!item) return Infinity;

            const cacheItem = JSON.parse(item);
            return Math.round((Date.now() - cacheItem.timestamp) / 1000);
        } catch (e) {
            return Infinity;
        }
    }

    /**
     * Obtener tamaño del caché en KB
     * @returns {number}
     * @private
     */
    _getSize() {
        try {
            const item = localStorage.getItem(this.cacheKey);
            if (!item) return 0;
            return Math.round(new Blob([item]).size / 1024);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Limpiar cachés antiguos si localStorage está lleno
     * @private
     */
    _clearOldCaches() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
        const caches = keys.map(key => {
            try {
                const item = JSON.parse(localStorage.getItem(key));
                return { key, timestamp: item.timestamp || 0 };
            } catch (e) {
                return { key, timestamp: 0 };
            }
        });

        // Ordenar por antigüedad y eliminar los 3 más viejos
        caches.sort((a, b) => a.timestamp - b.timestamp);
        caches.slice(0, 3).forEach(cache => {
            localStorage.removeItem(cache.key);
            console.log(`🗑️ Caché antiguo eliminado: ${cache.key}`);
        });
    }

    /**
     * Limpiar TODOS los cachés de la app
     * @static
     */
    static clearAll() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
        keys.forEach(key => localStorage.removeItem(key));
        console.log(`🗑️ ${keys.length} cachés eliminados`);
    }

    /**
     * Obtener estadísticas de todos los cachés
     * @static
     * @returns {Object}
     */
    static getStats() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
        const stats = {
            total: keys.length,
            totalSize: 0,
            caches: []
        };

        keys.forEach(key => {
            try {
                const item = localStorage.getItem(key);
                const size = Math.round(new Blob([item]).size / 1024);
                const data = JSON.parse(item);
                const age = Math.round((Date.now() - data.timestamp) / 1000);

                stats.totalSize += size;
                stats.caches.push({
                    collection: data.collection || 'unknown',
                    size: size + ' KB',
                    age: age + 's',
                    items: data.data?.length || 0
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
        console.log('📊 Estadísticas de Caché Firebase');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total cachés: ${stats.total}`);
        console.log(`Tamaño total: ${stats.totalSize} KB`);
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
