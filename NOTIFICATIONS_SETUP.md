# Sistema de Notificações em Tempo Real - SolveHub

## 📋 Resumo

Sistema completo de notificações em tempo real implementado com WebSockets (Socket.IO) para notificar utilizadores sobre:
- Novos comentários nos seus exercícios
- Respostas aos seus comentários

## 🚀 Instalação

### Backend

1. Instalar dependência Socket.IO:
```bash
cd solvehub-backend
npm install socket.io
```

2. Reiniciar o servidor:
```bash
npm run dev
```

O servidor agora suporta WebSockets na mesma porta (5050).

### Frontend

O Socket.IO já está carregado via CDN nos ficheiros HTML. Não é necessário instalar nada.

## 📁 Ficheiros Criados/Modificados

### Backend

**Novos ficheiros:**
- `src/models/Notification.js` - Modelo de notificações
- `src/controllers/notificationController.js` - Controller REST
- `src/routes/notificationRoutes.js` - Rotas REST
- `src/utils/notificationHelper.js` - Helper para criar notificações

**Ficheiros modificados:**
- `src/server.js` - Integração Socket.IO
- `src/app.js` - Rota `/notifications`
- `src/controllers/answerController.js` - Criação de notificações ao comentar/responder
- `package.json` - Dependência `socket.io`

### Frontend

**Novos ficheiros:**
- `js/notifications.js` - Módulo completo de notificações

**Ficheiros modificados:**
- `index.html` - Dropdown de notificações + scripts
- `exercise.html` - Dropdown de notificações + scripts
- `assets/css/components.css` - Estilos do dropdown

## 🧪 Como Testar

### Pré-requisitos

1. Ter o backend a correr (`npm run dev` no `solvehub-backend`)
2. Ter o frontend a servir (Live Server ou similar)

### Teste com 2 Utilizadores

#### Passo 1: Criar 2 Contas

1. Abrir o browser em **modo normal** (Utilizador A)
2. Criar conta: `userA@test.com` / `password123`
3. Abrir o browser em **modo anónimo/privado** (Utilizador B)
4. Criar conta: `userB@test.com` / `password123`

#### Passo 2: Utilizador A cria um exercício

1. No browser do Utilizador A:
   - Fazer login
   - Criar um novo exercício (botão "Novo exercício")
   - Preencher título, descrição, disciplina
   - Publicar
   - **Anotar o ID do exercício** (na URL: `exercise.html?id=...`)

#### Passo 3: Utilizador B comenta no exercício

1. No browser do Utilizador B:
   - Fazer login
   - Navegar para o exercício criado pelo Utilizador A
   - Escrever um comentário
   - Publicar

#### Passo 4: Verificar notificação em tempo real

1. No browser do Utilizador A:
   - **Sem recarregar a página**, verificar o ícone do sino no topbar
   - Deve aparecer um **badge vermelho** com o número "1"
   - Clicar no sino
   - Deve aparecer o dropdown com a notificação:
     - "userB comentou no teu exercício [título]"
     - Tempo relativo (ex: "agora mesmo")
     - Ponto azul indicando não lida

#### Passo 5: Testar navegação

1. No dropdown do Utilizador A:
   - Clicar na notificação
   - Deve:
     - Marcar como lida (ponto azul desaparece)
     - Navegar para o exercício
     - Badge do sino desaparece ou diminui

#### Passo 6: Testar reply (resposta a comentário)

1. No browser do Utilizador B:
   - No exercício, responder ao comentário do Utilizador A
   - Clicar em "Responder" no comentário
   - Escrever resposta
   - Publicar

2. No browser do Utilizador A:
   - **Sem recarregar**, verificar o sino
   - Deve aparecer nova notificação:
     - "userB respondeu ao teu comentário"
   - Badge deve atualizar para "2" (ou incrementar)

#### Passo 7: Testar "Marcar todas como lidas"

1. No dropdown do Utilizador A:
   - Clicar em "Marcar todas como lidas"
   - Todas as notificações devem perder o ponto azul
   - Badge do sino deve desaparecer

## 🔍 Verificar Funcionamento

### Console do Browser

Abrir DevTools (F12) e verificar:

1. **Ao carregar a página:**
   ```
   ✅ Conectado ao WebSocket de notificações
   ```

2. **Ao receber notificação:**
   ```
   Nova notificação recebida: {_id: "...", message: "...", ...}
   ```

3. **Se houver erro de conexão:**
   ```
   ❌ Desconectado do WebSocket
   ```
   (Deve reconectar automaticamente após 3 segundos)

### Console do Servidor (Backend)

1. **Ao conectar utilizador:**
   ```
   Utilizador conectado: [userId]
   ```

2. **Ao criar notificação:**
   ```
   (Sem output específico, mas a notificação é criada no DB)
   ```

## 🐛 Troubleshooting

### Notificações não aparecem

1. Verificar se o Socket.IO está carregado:
   - Abrir Console do browser
   - Verificar se `io` está definido: `typeof io`
   - Deve retornar `"function"`

2. Verificar token:
   - Verificar se há token no localStorage: `localStorage.getItem("token")`
   - Verificar se o token é válido (não expirado)

3. Verificar conexão WebSocket:
   - No Console, verificar mensagens de conexão
   - Se não conectar, verificar CORS no backend

### Badge não aparece

1. Verificar se há notificações não lidas:
   - Fazer GET manual: `fetch('http://localhost:5050/notifications', {headers: {Authorization: 'Bearer ' + token}})`
   - Verificar `unreadCount`

2. Verificar se o elemento do sino existe:
   - `document.querySelector('.icon-btn[title="Notificações"]')`

### Dropdown não abre

1. Verificar se o HTML foi atualizado:
   - Verificar se existe `#notificationsDropdown` no HTML
   - Verificar se `notifications-wrapper` existe

2. Verificar erros no Console

## 📝 Endpoints REST

- `GET /notifications` - Listar notificações (requer auth)
- `POST /notifications/:id/read` - Marcar como lida (requer auth)
- `POST /notifications/read-all` - Marcar todas como lidas (requer auth)

## 🔌 Eventos WebSocket

- `notification:new` - Emitido quando uma nova notificação é criada
- O cliente conecta-se automaticamente com o token JWT
- Cada utilizador fica numa room: `user:{userId}`

## ✨ Funcionalidades Implementadas

✅ Notificações persistentes no MongoDB
✅ WebSocket em tempo real
✅ Badge com contador de não lidas
✅ Dropdown clean e responsivo
✅ Marcar como lida ao clicar
✅ Navegação automática para o conteúdo
✅ Marcar todas como lidas
✅ Reconexão automática se a ligação cair
✅ Não notificar o próprio utilizador
✅ Suporte para comentários e replies

## 🎨 UI/UX

- Badge vermelho no sino quando há notificações não lidas
- Dropdown alinhado à direita (320px de largura)
- Scroll automático se houver muitas notificações
- Estado vazio: "Ainda não tens nenhuma notificação."
- Indicador visual (ponto azul) para não lidas
- Hover effects e transições suaves
- Layout consistente com o resto da aplicação

