// src/components/CacheWarmer.jsx
// Componente invisible que precachea todas las rutas públicas
import { useEffect } from 'react';
import { API_URL } from '../config/apiConfig';
import { 
  cacheNoticias, 
  cacheDatosEmpresa, 
  cacheApiResponse 
} from './utils/storage';

const CacheWarmer = () => {
  useEffect(() => {
    // Solo ejecutar una vez cuando se monta el componente
    const warmCache = async () => {
      // Verificar si ya se hizo el precache en esta sesión
      const cacheWarmed = sessionStorage.getItem('cacheWarmed');
      
      if (cacheWarmed) {
        console.log('✅ Cache ya precalentado en esta sesión');
        return;
      }

      console.log('🔥 Calentando cache de rutas públicas...');

      // Array de rutas públicas a precachear
      const publicRoutes = [
        '/',
        '/quienes-somos',
        '/noticias',
        '/contacto'
      ];

      try {
        // 1. Precachear las rutas HTML en el Service Worker
        const routePromises = publicRoutes.map(route => {
          return fetch(route, { 
            method: 'GET',
            credentials: 'include'
          })
          .then(() => {
            console.log(`✅ Ruta HTML cacheada: ${route}`);
          })
          .catch(() => {
            console.warn(`⚠️ No se pudo cachear ruta: ${route}`);
          });
        });

        await Promise.all(routePromises);

        // 2. Precachear datos de APIs en IndexedDB
        console.log('📦 Precacheando datos de APIs en IndexedDB...');
        
        // Noticias publicadas
        try {
          const noticiasRes = await fetch(`${API_URL}/api/noticias/publicados`);
          if (noticiasRes.ok) {
            const noticias = await noticiasRes.json();
            // Adaptar formato para almacenar
            const noticiasAdaptadas = noticias.map(n => ({
              id: n.id,
              titulo: n.titulo,
              descripcion: n.descripcion,
              fecha: n.fecha_publicacion,
              imagenes: JSON.parse(n.imagenes || '[]')
            }));
            await cacheNoticias(noticiasAdaptadas);
            console.log('✅ Noticias guardadas en IndexedDB');
          }
        } catch (error) {
          console.warn('⚠️ Error al cachear noticias:', error);
        }

        // Datos de empresa
        try {
          const empresaRes = await fetch(`${API_URL}/api/datos-empresa`);
          if (empresaRes.ok) {
            const datosEmpresa = await empresaRes.json();
            if (datosEmpresa.length > 0) {
              // Guardar en el formato correcto
              await cacheDatosEmpresa(datosEmpresa[0]);
              console.log('✅ Datos empresa guardados en IndexedDB:', datosEmpresa[0]);
              
              // También cachear en API_CACHE para respaldo
              await cacheApiResponse(`${API_URL}/api/datos-empresa`, datosEmpresa);
            }
          }
        } catch (error) {
          console.warn('⚠️ Error al cachear datos empresa:', error);
        }

        // Datos de "Quiénes Somos" y estructura
        try {
          const nosotrosRes = await fetch(`${API_URL}/api/nosotros/vigentes`);
          if (nosotrosRes.ok) {
            const nosotros = await nosotrosRes.json();
            await cacheApiResponse(`${API_URL}/api/nosotros/vigentes`, nosotros);
            console.log('✅ Datos "Quiénes Somos" guardados en IndexedDB');
          }
        } catch (error) {
          console.warn('⚠️ Error al cachear nosotros:', error);
        }

        // Puestos (para estructura organizacional)
        try {
          const puestosRes = await fetch(`${API_URL}/api/puestos`);
          if (puestosRes.ok) {
            const puestos = await puestosRes.json();
            await cacheApiResponse(`${API_URL}/api/puestos`, puestos);
            console.log('✅ Puestos guardados en IndexedDB');
          }
        } catch (error) {
          console.warn('⚠️ Error al cachear puestos:', error);
        }

        // Marcar como completado
        sessionStorage.setItem('cacheWarmed', 'true');
        console.log('🎉 Todas las rutas y datos públicos precacheados');
        
      } catch (error) {
        console.error('❌ Error al calentar cache:', error);
      }
    };

    // Esperar 2 segundos después de que cargue la página
    // para no interferir con la carga inicial
    const timer = setTimeout(() => {
      if (navigator.onLine) {
        warmCache();
      } else {
        console.log('⚠️ Sin conexión - no se puede precachear');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []); // Solo ejecutar una vez

  // Este componente no renderiza nada
  return null;
};

export default CacheWarmer;