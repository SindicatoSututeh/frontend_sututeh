// src/config/apiConfig.js

// =============================================
// 🔧 Configuración automática del API backend
// Compatible con: localhost, IP local y producción
// =============================================
const getApiUrl = () => {
  const hostname = window.location.hostname;

  // 🌍 Caso 1: localhost o 127.0.0.1 → desarrollo en PC
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.REACT_APP_API_URL || 'http://localhost:3001';
  }

  // 📱 Caso 2: red local (por ejemplo, 192.168.x.x)
  if (hostname.startsWith('192.168.')) {
    // Usa la misma IP del host pero puerto 3001
    return `http://${hostname}:3001`;
  }

  // ☁️ Caso 3: producción (Render / Hostinger)
  return process.env.REACT_APP_API_URL || 'https://backend-sututeh.onrender.com';
};

export const API_URL = getApiUrl();

// =============================================
// 🔄 Función helper para fetch API
// =============================================
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;

  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Si envías FormData, quita Content-Type automático
  if (options.body instanceof FormData) {
    delete defaultOptions.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, defaultOptions);
    return response;
  } catch (error) {
    console.error(`❌ Error en request a ${url}:`, error);
    throw error;
  }
};

// =============================================
// ⚙️ Configuración global para Axios
// =============================================
export const configureAxios = (axios) => {
  axios.defaults.baseURL = API_URL;
  axios.defaults.withCredentials = true;

  if (process.env.NODE_ENV === 'development') {
    axios.interceptors.request.use(
      (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );
  }
};

// =============================================
// 💡 Helpers para usar más fácil con fetch
// =============================================
export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, data) =>
    apiRequest(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  put: (endpoint, data) =>
    apiRequest(endpoint, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};

console.log(`🌐 API_URL en uso: ${API_URL}`);

export default { API_URL, apiRequest, configureAxios };
