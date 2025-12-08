// src/App.jsx
import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import Layout from "./components/layout/Layout";
import axios from 'axios';
import { configureAxios } from './config/apiConfig';
import OfflineIndicator from "./components/OfflineIndicator";
import CacheWarmer from "./components/CacheWarmer";
import { initStorage } from './components/utils/storage';

configureAxios(axios);

function App() {
  // Inicializar sistema de almacenamiento PWA
  useEffect(() => {
    console.log('🚀 Inicializando SUTUTEH PWA...');
    
    const initializePWA = async () => {
      // Inicializar IndexedDB
      const storageReady = await initStorage();
      
      if (storageReady) {
        console.log('✅ IndexedDB listo');
        console.log('⏳ CacheWarmer se encargará del precacheo en 2 segundos...');
      } else {
        console.warn('⚠️ IndexedDB no disponible - funcionalidad offline limitada');
      }
    };
    
    initializePWA();
  }, []);

  return (
    <Router>
      <OfflineIndicator />
      <CacheWarmer /> {/* Precachea rutas y datos en segundo plano */}
      <Layout />
    </Router>
  );
}

export default App;