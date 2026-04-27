# 🧠 Nexus Command Center v2 — Guia de Deploy Web

## Visão Geral

O `nexus_web_v2/` é o painel frontend do Nexus Command Center, construído com **Vite + React + TailwindCSS**. Ele consome a API REST do bot `bot-captura-ideias` e fornece uma interface hacker-style (dark mode) para:

- ⚡ Enviar prompts ao Cérebro (POST `/api/v1/command`)
- 📊 Monitorar o status do MoE (GET `/api/v1/status` e `/api/v1/diagnostico`)
- 📱 Disparar mensagens de WhatsApp (POST `/api/v1/whatsapp/send`)

---

## 🚀 Deploy no Railway

### Passo 1: Configurar o Serviço no Railway

1. No teu projeto do Railway, clica em **"New Service"** → **"GitHub Repo"**.
2. Seleciona o repositório `nexus-command-center`.
3. No painel de configuração do serviço, define o **Root Directory** para:
   ```
   nexus_web_v2
   ```
   Isto é **OBRIGATÓRIO**. Sem isso, o Railway não vai encontrar o `package.json`.

### Passo 2: Variáveis de Ambiente

No Railway, vai a **Settings → Variables** e adiciona:

| Variável | Valor | Descrição |
|---|---|---|
| `VITE_BOT_API_URL` | `https://teu-bot.up.railway.app` | URL base da API do Bot (sem barra no final) |

> ⚠️ **IMPORTANTE**: Variáveis com prefixo `VITE_` são injetadas no **build time**. Precisas de fazer um novo deploy sempre que alterares esta variável.

### Passo 3: Comandos de Build

O Railway deve detectar automaticamente o Vite. Se não detectar, configura manualmente:

| Campo | Valor |
|---|---|
| **Build Command** | `npm run build` |
| **Start Command** | `npm run preview` |

> O `vite.config.js` já está configurado para ler a variável `PORT` do Railway e fazer bind em `0.0.0.0`.

### Passo 4: Deploy

Clica em **"Deploy"** e aguarda. O Railway vai:
1. Instalar dependências (`npm install`)
2. Fazer o build (`npm run build`)
3. Servir os ficheiros estáticos via `vite preview`

---

## 💻 Desenvolvimento Local

```bash
cd nexus_web_v2

# Instalar dependências
npm install

# Criar ficheiro .env local
cp .env.example .env
# Editar o .env com a URL do teu bot local ou remoto

# Iniciar servidor de desenvolvimento
npm run dev
```

O servidor de desenvolvimento vai rodar em `http://localhost:5173`.

---

## 📁 Estrutura do Projeto

```
nexus_web_v2/
├── index.html                  # Entry point HTML
├── package.json                # Dependências e scripts
├── vite.config.js              # Configuração do Vite (suporta PORT do Railway)
├── tailwind.config.js          # Tema Nexus dark
├── postcss.config.js           # PostCSS para Tailwind
├── .env.example                # Template de variáveis de ambiente
├── .gitignore
└── src/
    ├── main.jsx                # Bootstrap React
    ├── index.css               # Tailwind directives + componentes custom
    ├── App.jsx                 # Shell principal (state, layout, routing)
    ├── api.js                  # Camada de API (usa VITE_BOT_API_URL)
    └── components/
        ├── CommandPanel.jsx    # Formulário de envio de prompts
        ├── StatusPanel.jsx     # Painel de status e diagnóstico do MoE
        ├── WhatsAppPanel.jsx   # Formulário de disparo WhatsApp
        └── ResponseLog.jsx     # Log de atividades em tempo real
```

---

## 🔌 Contrato da API

### POST `/api/v1/command`
```json
{
  "prompt": "texto do comando",
  "systemPrompt": "contexto opcional",
  "conversationId": "id-unico-da-sessao"
}
```

### GET `/api/v1/status`
Retorna o status atual do sistema MoE.

### GET `/api/v1/diagnostico`
Retorna informações de diagnóstico detalhadas.

### POST `/api/v1/whatsapp/send`
```json
{
  "to": "5511999999999",
  "message": "Conteúdo da mensagem"
}
```

---

## ⚠️ Notas Importantes

1. **CORS**: O bot precisa ter CORS habilitado para aceitar requisições do domínio do frontend no Railway.
2. **Variáveis VITE_**: São injetadas no momento do build. Alterações exigem novo deploy.
3. **Root Directory**: No Railway, **DEVE** ser `nexus_web_v2`. Não deixes vazio ou o deploy vai falhar.

---

*Forjado pelo Cérebro Nexus — CTO Autônomo*
