// ===============================
//  NOTIFICATIONS MODULE
// ===============================
// API_URL já está definido em api.js, não redeclarar
const SOCKET_URL = "http://localhost:5050";

let socket = null;
let notifications = [];
let unreadCount = 0;
let isDropdownOpen = false;

// ===============================
//  INITIALIZE NOTIFICATIONS
// ===============================
async function initNotifications() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("❌ Sem token, notificações não inicializadas");
    return;
  }

  console.log("🔔 Inicializando sistema de notificações...");

  // Setup dropdown primeiro (para garantir que o HTML existe)
  setupNotificationsDropdown();

  // Carregar notificações iniciais
  try {
    await loadNotifications();
  } catch (err) {
    console.error("Erro ao carregar notificações iniciais:", err);
  }

  // Conectar WebSocket
  connectNotificationsSocket();
  
  console.log("✅ Sistema de notificações inicializado");
}

// ===============================
//  LOAD NOTIFICATIONS
// ===============================
async function loadNotifications() {
  try {
    console.log("📥 Carregando notificações...");
    const response = await apiGet("/notifications");
    notifications = response.notifications || [];
    unreadCount = response.unreadCount || 0;
    
    console.log(`📬 Notificações carregadas: ${notifications.length} total, ${unreadCount} não lidas`);
    
    updateNotificationsBadge();
    if (isDropdownOpen) {
      renderNotificationsDropdown();
    }
  } catch (err) {
    console.error("❌ Erro ao carregar notificações:", err);
    // Mesmo com erro, inicializar arrays vazios
    notifications = [];
    unreadCount = 0;
    updateNotificationsBadge();
  }
}

// ===============================
//  CONNECT SOCKET
// ===============================
function connectNotificationsSocket() {
  const token = localStorage.getItem("token");
  if (!token) {
    return;
  }

  // Carregar Socket.IO do CDN (se não estiver carregado)
  if (typeof io === "undefined") {
    console.error("Socket.IO não está carregado. Adiciona o script no HTML.");
    return;
  }

  // Desconectar socket anterior se existir
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: token,
    },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("✅ Conectado ao WebSocket de notificações");
  });

  socket.on("disconnect", () => {
    console.log("❌ Desconectado do WebSocket");
    // Tentar reconectar após 3 segundos
    setTimeout(() => {
      if (localStorage.getItem("token")) {
        connectNotificationsSocket();
      }
    }, 3000);
  });

  socket.on("connect_error", (error) => {
    console.error("Erro de conexão WebSocket:", error);
  });

  socket.on("notification:new", async (notification) => {
    console.log("Nova notificação recebida:", notification);
    
    // Adicionar no topo da lista
    notifications.unshift(notification);
    unreadCount++;
    
    // Atualizar badge
    updateNotificationsBadge();
    
    // Se o dropdown estiver aberto, re-renderizar
    if (isDropdownOpen) {
      renderNotificationsDropdown();
    }
  });
}

// ===============================
//  SETUP DROPDOWN
// ===============================
function setupNotificationsDropdown() {
  const bellBtn = document.querySelector('.icon-btn[title="Notificações"]');
  const dropdown = document.getElementById("notificationsDropdown");
  
  if (!bellBtn) {
    console.warn("❌ Botão de notificações não encontrado");
    return;
  }

  if (!dropdown) {
    console.warn("❌ Dropdown de notificações não encontrado");
    return;
  }

  console.log("✅ Setup do dropdown de notificações iniciado");

  // Toggle dropdown - usar event delegation para evitar problemas
  bellBtn.onclick = function(e) {
    e.stopPropagation();
    e.preventDefault();
    isDropdownOpen = !isDropdownOpen;
    dropdown.classList.toggle("hidden", !isDropdownOpen);
    
    console.log("🔔 Dropdown clicado, aberto:", isDropdownOpen);
    
    if (isDropdownOpen) {
      renderNotificationsDropdown();
    }
  };

  // Fechar ao clicar fora
  const clickOutsideHandler = (e) => {
    if (isDropdownOpen && !dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
      isDropdownOpen = false;
      dropdown.classList.add("hidden");
    }
  };
  
  // Remover listener antigo se existir
  document.removeEventListener("click", clickOutsideHandler);
  document.addEventListener("click", clickOutsideHandler);
}

// ===============================
//  RENDER DROPDOWN
// ===============================
function renderNotificationsDropdown() {
  const dropdown = document.getElementById("notificationsDropdown");
  if (!dropdown) return;

  if (notifications.length === 0) {
    dropdown.innerHTML = `
      <div class="notifications-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <p>Ainda não tens nenhuma notificação.</p>
      </div>
    `;
    return;
  }

  const notificationsHtml = notifications
    .map((notif) => {
      const timeAgoText = timeAgo(notif.createdAt);
      const unreadClass = !notif.isRead ? "unread" : "";
      
      return `
        <div class="notification-item ${unreadClass}" data-notification-id="${notif._id}" data-link="${notif.link}">
          <div class="notification-content">
            <p class="notification-message">${escapeHtml(notif.message)}</p>
            <span class="notification-time">${timeAgoText}</span>
          </div>
          ${!notif.isRead ? '<div class="notification-dot"></div>' : ''}
        </div>
      `;
    })
    .join("");

  dropdown.innerHTML = `
    <div class="notifications-header">
      <h3>Notificações</h3>
      ${unreadCount > 0 ? `<button class="mark-all-read-btn" onclick="markAllNotificationsAsRead()">Marcar todas como lidas</button>` : ''}
    </div>
    <div class="notifications-list">
      ${notificationsHtml}
    </div>
  `;

  // Adicionar event listeners aos itens
  dropdown.querySelectorAll(".notification-item").forEach((item) => {
    item.addEventListener("click", () => {
      const notificationId = item.dataset.notificationId;
      const link = item.dataset.link;
      
      markNotificationAsRead(notificationId);
      navigateToNotification(link);
    });
  });
}

// ===============================
//  UPDATE BADGE
// ===============================
function updateNotificationsBadge() {
  const bellBtn = document.querySelector('.icon-btn[title="Notificações"]');
  if (!bellBtn) return;

  // Remover badge existente
  const existingBadge = bellBtn.querySelector(".notification-badge");
  if (existingBadge) {
    existingBadge.remove();
  }

  // Adicionar badge se houver notificações não lidas
  if (unreadCount > 0) {
    const badge = document.createElement("span");
    badge.className = "notification-badge";
    badge.textContent = unreadCount > 99 ? "99+" : unreadCount.toString();
    bellBtn.appendChild(badge);
    console.log(`🔴 Badge atualizado: ${unreadCount} não lidas`);
  } else {
    console.log("✅ Sem notificações não lidas, badge removido");
  }
}

// ===============================
//  MARK AS READ
// ===============================
async function markNotificationAsRead(notificationId) {
  try {
    await apiPost(`/notifications/${notificationId}/read`, {});
    
    // Atualizar localmente
    const notification = notifications.find((n) => n._id === notificationId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      unreadCount = Math.max(0, unreadCount - 1);
      updateNotificationsBadge();
      
      if (isDropdownOpen) {
        renderNotificationsDropdown();
      }
    }
  } catch (err) {
    console.error("Erro ao marcar notificação como lida:", err);
  }
}

// ===============================
//  MARK ALL AS READ
// ===============================
window.markAllNotificationsAsRead = async function() {
  try {
    await apiPost("/notifications/read-all", {});
    
    // Atualizar localmente
    notifications.forEach((n) => {
      n.isRead = true;
    });
    unreadCount = 0;
    updateNotificationsBadge();
    
    if (isDropdownOpen) {
      renderNotificationsDropdown();
    }
  } catch (err) {
    console.error("Erro ao marcar todas como lidas:", err);
  }
};

// ===============================
//  NAVIGATE TO NOTIFICATION
// ===============================
function navigateToNotification(link) {
  if (link) {
    // Fechar dropdown
    isDropdownOpen = false;
    const dropdown = document.getElementById("notificationsDropdown");
    if (dropdown) {
      dropdown.classList.add("hidden");
    }
    
    // Navegar - garantir que o link é relativo ao diretório atual
    let finalLink = link;
    
    // Se começar com /, remover para tornar relativo
    if (finalLink.startsWith('/')) {
      finalLink = finalLink.substring(1);
    }
    
    // Se não começar com http, usar caminho relativo
    if (!finalLink.startsWith('http')) {
      // Usar caminho relativo baseado na localização atual
      const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      finalLink = basePath + finalLink;
    }
    
    console.log("🔗 Navegando para:", finalLink);
    window.location.href = finalLink;
  }
}

// ===============================
//  TIME AGO (reutilizar do projeto)
// ===============================
function timeAgo(dateString) {
  const diff = (Date.now() - new Date(dateString)) / 1000;

  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
  return new Date(dateString).toLocaleDateString("pt-PT");
}

// ===============================
//  ESCAPE HTML
// ===============================
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

