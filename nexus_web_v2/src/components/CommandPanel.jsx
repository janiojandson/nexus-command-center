import { useState } from 'react';

export default function CommandPanel({ onSend, loading }) {
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [conversationId, setConversationId] = useState(() =>
    `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  );
  const [lastResponse, setLastResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    try {
      const data = await onSend({
        prompt: prompt.trim(),
        systemPrompt: systemPrompt.trim() || undefined,
        conversationId,
      });
      setLastResponse(data);
      setPrompt('');
    } catch {
      // erro já tratado no App
    }
  };

  const newConversation = () => {
    setConversationId(`web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
    setLastResponse(null);
  };

  return (
    <div className="nexus-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-nexus-accent font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <span className="text-base">⚡</span> Comando ao Cérebro
        </h2>
        <button
          onClick={newConversation}
          className="text-xs text-nexus-textMuted hover:text-nexus-accent transition-colors"
        >
          + Nova Sessão
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="nexus-label">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Digite o comando ou pergunta para o Cérebro..."
            rows={4}
            className="nexus-input w-full resize-none"
            disabled={loading}
          />
        </div>

        <div>
          <label className="nexus-label">System Prompt (opcional)</label>
          <input
            type="text"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Contexto adicional para o modelo..."
            className="nexus-input w-full"
            disabled={loading}
          />
        </div>

        <div>
          <label className="nexus-label">Conversation ID</label>
          <input
            type="text"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            className="nexus-input w-full text-xs"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="nexus-btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processando...
            </>
          ) : (
            '🚀 Enviar Comando'
          )}
        </button>
      </form>

      {lastResponse && (
        <div className="mt-4 p-3 bg-nexus-bg rounded-lg border border-nexus-border">
          <p className="nexus-label mb-1">Resposta</p>
          <pre className="text-xs text-nexus-text whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
            {typeof lastResponse === 'string' ? lastResponse : JSON.stringify(lastResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
