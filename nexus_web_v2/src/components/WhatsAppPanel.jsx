import { useState } from 'react';

export default function WhatsAppPanel({ onSend, loading }) {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [lastResponse, setLastResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!to.trim() || !message.trim() || loading) return;
    try {
      const data = await onSend({ to: to.trim(), message: message.trim() });
      setLastResponse(data);
      setMessage('');
    } catch {
      // erro já tratado no App
    }
  };

  return (
    <div className="nexus-card">
      <h2 className="text-nexus-accent font-bold text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
        <span className="text-base">📱</span> Disparo WhatsApp
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="nexus-label">Destinatário</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="5511999999999 ou grupo-id"
            className="nexus-input w-full"
            disabled={loading}
          />
        </div>

        <div>
          <label className="nexus-label">Mensagem</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Conteúdo da mensagem..."
            rows={3}
            className="nexus-input w-full resize-none"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !to.trim() || !message.trim()}
          className="nexus-btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Enviando...
            </>
          ) : (
            '📤 Disparar Mensagem'
          )}
        </button>
      </form>

      {lastResponse && (
        <div className="mt-4 p-3 bg-nexus-bg rounded-lg border border-nexus-border">
          <p className="nexus-label mb-1">Resposta</p>
          <pre className="text-xs text-nexus-text whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
            {typeof lastResponse === 'string' ? lastResponse : JSON.stringify(lastResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
