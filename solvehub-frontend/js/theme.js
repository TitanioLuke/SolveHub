// ===============================
//   GLOBAL THEME SYSTEM
// ===============================

/**
 * Obtém o tema atual
 * @returns {string} 'light' ou 'dark'
 */
function getTheme() {
    return localStorage.getItem('theme') || 'light';
}

/**
 * Define e aplica o tema
 * @param {string} theme - 'light' ou 'dark'
 */
function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
        console.warn('Tema inválido, usando "light"');
        theme = 'light';
    }
    
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Inicializa o tema ao carregar a página
 */
function initTheme() {
    const theme = getTheme();
    setTheme(theme);
}

// Aplicar tema imediatamente (antes de qualquer renderização)
initTheme();

// Exportar funções para uso global
window.getTheme = getTheme;
window.setTheme = setTheme;
window.initTheme = initTheme;

