// Configuração dinâmica de URLs (API e Socket.IO)
(function() {
  'use strict';

  function getBackendUrl() {
    const hostname = window.location.hostname;
    const isProduction = hostname === 'solvehub.tech' || hostname === 'www.solvehub.tech';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';

    if (window.BACKEND_URL) {
      return window.BACKEND_URL;
    }

    if (isLocalhost) {
      return 'http://localhost:5050';
    }

    if (isProduction) {
      return 'https://solvehub.onrender.com';
    }
    const errorMsg = `❌ Ambiente não reconhecido: ${hostname}. ` +
                     `Defina window.BACKEND_URL antes de config.js ou use um domínio conhecido.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  let backendUrl;
  try {
    backendUrl = getBackendUrl();
  } catch (error) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.warn('⚠️ Erro ao determinar backend, usando fallback local:', error.message);
      backendUrl = 'http://localhost:5050';
    } else {
      throw error;
    }
  }
  
  window.API_URL = backendUrl;
  window.SOCKET_URL = backendUrl;

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Config carregado (desenvolvimento):', {
      API_URL: window.API_URL,
      SOCKET_URL: window.SOCKET_URL,
      hostname: window.location.hostname
    });
  } else {
    console.log('🔧 Config carregado (produção):', {
      hostname: window.location.hostname,
      backend: 'https://solvehub.onrender.com'
    });
  }

})();
