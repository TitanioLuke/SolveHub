// ===============================
// CONFIGURAÇÃO DINÂMICA
// ===============================
// Este ficheiro configura as URLs da API e Socket.IO dinamicamente
// Funciona tanto em localhost quanto em produção
//
// Para produção (Vercel):
// Defina window.BACKEND_URL antes de carregar este script usando um inline script:
// <script>window.BACKEND_URL = 'https://seu-backend.onrender.com';</script>
// Ou use variáveis de ambiente do Vercel (requer build step ou serverless function)

(function() {
  'use strict';

  /**
   * Obtém a URL do backend
   * Prioridade:
   * 1. window.BACKEND_URL (definido externamente antes deste script)
   * 2. Detecção automática: se estiver em localhost, usa localhost:5050
   * 3. Fallback: usa localhost:5050 por segurança (mas deve ser configurado em produção)
   */
  function getBackendUrl() {
    // Se já foi definido externamente (ex: via script inline antes de config.js)
    if (window.BACKEND_URL) {
      return window.BACKEND_URL;
    }

    const hostname = window.location.hostname;

    // Se estiver em localhost, usar backend local
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
      return 'http://localhost:5050';
    }

    // Em produção, BACKEND_URL deve ser definido explicitamente
    // Se não foi definido, usar fallback (mas logar warning)
    console.warn('⚠️ BACKEND_URL não definido em produção. Usando fallback. Defina window.BACKEND_URL antes de config.js para produção.');
    console.warn('📝 Exemplo: <script>window.BACKEND_URL = "https://seu-backend.onrender.com";</script>');
    
    // Fallback de segurança (mas não deve acontecer em produção)
    return 'http://localhost:5050';
  }

  // Obter URL do backend
  const backendUrl = getBackendUrl();
  
  // Configurar API_URL globalmente
  window.API_URL = backendUrl;
  
  // Socket.IO usa a mesma URL do backend
  window.SOCKET_URL = backendUrl;

  // Log para debug (apenas em desenvolvimento)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Config carregado:', {
      API_URL: window.API_URL,
      SOCKET_URL: window.SOCKET_URL,
      hostname: window.location.hostname
    });
  }

})();
