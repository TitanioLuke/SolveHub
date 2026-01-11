// ===============================
// CONFIGURAÇÃO DINÂMICA
// ===============================
// Este ficheiro configura as URLs da API e Socket.IO dinamicamente
// Funciona tanto em localhost quanto em produção
//
// Configuração:
// - Produção (solvehub.tech): https://solvehub.onrender.com
// - Desenvolvimento (localhost): http://localhost:5050

(function() {
  'use strict';

  /**
   * Obtém a URL do backend baseado no ambiente
   * 
   * Prioridade:
   * 1. window.BACKEND_URL (definido externamente antes deste script) - permite override manual
   * 2. Detecção por hostname:
   *    - solvehub.tech → https://solvehub.onrender.com (produção)
   *    - localhost/127.0.0.1 → http://localhost:5050 (desenvolvimento)
   * 3. Em produção, se não detectado, lança erro (não usa fallback localhost)
   */
  function getBackendUrl() {
    const hostname = window.location.hostname;
    const isProduction = hostname === 'solvehub.tech' || hostname === 'www.solvehub.tech';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';

    // Se já foi definido externamente (permite override manual se necessário)
    if (window.BACKEND_URL) {
      return window.BACKEND_URL;
    }

    // Desenvolvimento local: usar backend local
    if (isLocalhost) {
      return 'http://localhost:5050';
    }

    // Produção: usar backend no Render
    if (isProduction) {
      return 'https://solvehub.onrender.com';
    }

    // Se não é localhost nem produção conhecida, lançar erro em vez de usar fallback
    // Isto previne usar localhost acidentalmente em outros ambientes
    const errorMsg = `❌ Ambiente não reconhecido: ${hostname}. ` +
                     `Defina window.BACKEND_URL antes de config.js ou use um domínio conhecido.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Obter URL do backend
  let backendUrl;
  try {
    backendUrl = getBackendUrl();
  } catch (error) {
    // Em caso de erro, usar fallback apenas para desenvolvimento
    // Em produção, o erro deve ser resolvido
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.warn('⚠️ Erro ao determinar backend, usando fallback local:', error.message);
      backendUrl = 'http://localhost:5050';
    } else {
      // Em produção, re-lançar o erro
      throw error;
    }
  }
  
  // Configurar API_URL globalmente
  window.API_URL = backendUrl;
  
  // Socket.IO usa a mesma URL do backend
  window.SOCKET_URL = backendUrl;

  // Log para debug (apenas em desenvolvimento)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Config carregado (desenvolvimento):', {
      API_URL: window.API_URL,
      SOCKET_URL: window.SOCKET_URL,
      hostname: window.location.hostname
    });
  } else {
    // Log mínimo em produção (sem expor dados sensíveis)
    console.log('🔧 Config carregado (produção):', {
      hostname: window.location.hostname,
      backend: 'https://solvehub.onrender.com'
    });
  }

})();
