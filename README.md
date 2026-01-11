# SolveHub

Plataforma colaborativa para resolução de exercícios académicos, onde estudantes podem partilhar, resolver e discutir exercícios em comunidade.

## 🚀 Stack Tecnológica

### Backend
- **Node.js** + **Express.js** - Servidor REST API
- **MongoDB** + **Mongoose** - Base de dados
- **Socket.IO** - Notificações em tempo real
- **JWT** - Autenticação
- **Cloudinary** - Armazenamento de ficheiros
- **bcryptjs** - Hash de passwords

### Frontend
- **HTML/CSS/JavaScript** (Vanilla) - Interface estática
- **Socket.IO Client** - WebSockets para notificações

### Deploy
- **Backend**: Render (Node.js)
- **Frontend**: Vercel (Static Hosting)
- **Base de Dados**: MongoDB Atlas
- **Ficheiros**: Cloudinary

## ✨ Funcionalidades

- 🔐 **Autenticação** - Registo e login com JWT
- 📝 **Exercícios** - Criar, editar e publicar exercícios
- 💬 **Comentários** - Sistema de comentários e respostas
- ⭐ **Votação** - Like/dislike em exercícios e respostas
- 🔔 **Notificações** - Notificações em tempo real via WebSocket
- 📚 **Disciplinas** - Organização por disciplinas académicas
- 💾 **Guardar** - Guardar exercícios favoritos
- 👤 **Perfil** - Gestão de perfil e avatar
- 🛡️ **Admin** - Painel de administração
- 🎨 **Tema** - Modo claro/escuro

## 🛠️ Instalação Local

### Pré-requisitos
- Node.js (v18+)
- MongoDB (local ou Atlas)
- Conta Cloudinary (opcional)

### Backend

```bash
cd solvehub-backend
npm install
```

Criar ficheiro `.env`:
```env
MONGO_URI=mongodb://localhost:27017/solvehub
JWT_SECRET=seu_secret_aqui
PORT=5050
CORS_ORIGINS=http://localhost:5500
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

Iniciar servidor:
```bash
npm run dev
```

### Frontend

Servir os ficheiros estáticos (Live Server, VSCode, ou similar):
```bash
# Exemplo com Python
cd solvehub-frontend
python -m http.server 5500
```

Aceder a `http://localhost:5500`

## 📦 Deploy

### Backend (Render)
1. Conectar repositório
2. Configurar variáveis de ambiente
3. Build command: (vazio)
4. Start command: `npm start`

### Frontend (Vercel)
1. Conectar repositório
2. Root directory: `solvehub-frontend`
3. Build command: (vazio)
4. Output directory: (vazio)

## 🌐 Produção

- **Frontend**: [https://solvehub.tech](https://solvehub.tech)
- **Backend**: [https://solvehub.onrender.com](https://solvehub.onrender.com)

## 📁 Estrutura

```
SolveHub/
├── solvehub-backend/     # API Node.js
│   ├── src/
│   │   ├── config/       # Configurações (DB, Cloudinary)
│   │   ├── controllers/  # Lógica de negócio
│   │   ├── middleware/   # Auth, upload, etc.
│   │   ├── models/       # Schemas MongoDB
│   │   ├── routes/       # Rotas Express
│   │   ├── utils/        # Helpers
│   │   ├── app.js        # Express app
│   │   └── server.js     # HTTP server + Socket.IO
│   └── scripts/          # Scripts de migração
│
└── solvehub-frontend/    # Frontend estático
    ├── assets/css/       # Estilos modulares
    ├── js/               # JavaScript
    └── *.html            # Páginas
```

## 📝 Licença

ISC
