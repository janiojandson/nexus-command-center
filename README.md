# 🏛️ Nexus Command Center - Dashboard Web de Elite

## 📋 Visão Geral

O **Nexus Command Center** é um dashboard web moderno e de elite para o sistema Nexus, integrando **Headhunter**, **Memória Vetorial (Hipocampo)** e **lançador de missões pesadas** em uma interface unificada e altamente performática.

## 🚀 Arquitetura

### 🏗️ Estrutura do Projeto
```
nexus-command-center/
├── backend/              # Express.js API
│   ├── routes/          # Rotas da API (index.js)
│   ├── controllers/     # Lógica de negócio
│   ├── services/        # Integrações externas
│   ├── middleware/      # Middleware (auth, requireAuth)
│   └── config/          # Configurações (server.js)
├── frontend/            # React + Tailwind
│   ├── src/
│   │   ├── components/  # Componentes reutilizáveis (ui/)
│   │   ├── pages/       # Páginas principais
│   │   ├── hooks/       # Custom hooks
│   │   └── services/    # API calls
│   └── public/
├── shared/              # Código compartilhado
└── docs/                # Documentação
```

### 🔗 Fluxo de Requisições
```
HTTP Request → API Gateway (Express) → Auth (JWT) → Controller → Service → Response
                         ↓
                  WebSocket → Dashboard (React)
```

## 🎨 Framework Frontend: React + Tailwind

### **Por que React + Tailwind?**
- **React**: Ecossistema maduro, componentes reutilizáveis, excelente performance
- **Tailwind**: Design moderno sem esforço, responsive por padrão, excelente para dashboards
- **Shadcn Alternative**: Componentes prontos baseados em Radix UI (opcional)

### **Componentes UI Principais:**
- `Card` - Contêiner principal com sombra
- `Button` - Botões interativos com múltiplos estilos
- `Input` - Campos de formulário estilizados
- `Label` - Rótulos de formulário
- `Table` - Tabelas de dados com scroll horizontal

## 🔗 Integrações Disponíveis

### **1. Headhunter Integration**
```javascript
// frontend/src/services/headhunter.js
export const searchProfiles = async (query) => {
  const response = await fetch('/api/headhunter/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return response.json();
};

// backend/controllers/headhunter/search.js
exports.search = async (req, res) => {
  const { query } = req.body;
  // Lógica de busca integrada
  res.json({ results: [], total: 0 });
};
```

### **2. Memória Vetorial (Hipocampo)**
```javascript
// frontend/src/services/memory.js
export const searchMemory = async (query) => {
  const response = await fetch('/api/memory/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return response.json();
};

// backend/controllers/memory/search.js
exports.search = async (req, res) => {
  const { query } = req.body;
  // Busca vetorial BM25
  res.json({ results: [], query });
};
```

### **3. Missões Pesadas**
```javascript
// frontend/src/services/missions.js
export const launchMission = async (missionData) => {
  const response = await fetch('/api/missions/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(missionData)
  });
  return response.json();
};

// backend/controllers/missions/launch.js
exports.launch = async (req, res) => {
  const { missionType, parameters } = req.body;
  // Lógica de missão pesada
  res.json({ missionId: 'uuid', status: 'queued' });
};
```

## 📊 Funcionalidades Específicas

### **Painel de Controle (Dashboard)**
- Métricas em tempo real (WebSockets)
- Gráficos interativos (Chart.js/D3.js)
- Status de missões ativas
- Alertas e notificações

### **Busca Inteligente (Headhunter)**
- Pesquisa semântica de perfis
- Filtragem avançada
- Recomendações baseadas em histórico

### **Memória Vetorial**
- Armazenamento de contextos
- Busca por similaridade
- Histórico de interações

### **Gerenciamento de Missões**
- Criação e lançamento
- Monitoramento em tempo real
- Retry automático
- Relatórios detalhados

## 🛠️ Configuração Inicial

### **Variáveis de Ambiente:**
```env
# Backend
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=3000

# Integrações
HEADHUNTER_API_KEY=your-key
MEMORY_VECTOR_DB=path/to/db
```

### **Instalação:**
```bash
# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm start
```

## 🔒 Segurança e Autenticação

- **Tokens JWT** - Expiração e renovação automática
- **Rate Limiting** - Políticas de throttling
- **Middleware de Auth** - Proteção de rotas sensíveis
- **Logs Estruturados** - Serilog para auditoria

## 📈 Monitoramento

- Tempo de resposta da API
- Taxa de sucesso de missões
- Utilização da memória vetorial
- Performance do frontend
- Erros e exceções

## 🚀 Próximos Passos

1. ✅ Configurar o ambiente de desenvolvimento
2. ✅ Implementar as rotas base do Express
3. ✅ Criar os componentes React principais
4. ✅ Integrar Headhunter e Memória Vetorial
5. ✅ Testar o pipeline completo de missões
6. ✅ Deploy para produção

## 📞 Contato

Para dúvidas ou suporte, entre em contato com a equipe Nexus.

---
*Documentação atualizada: $(date)*
*Versão: 1.0.0*
*Status: 🟢 Produção*