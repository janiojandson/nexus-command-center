const TYPE_STYLES = {
  COMMAND: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: '⚡' },
  WHATSAPP: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: '📱' },
  SUCCESS: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: '✅' },
  ERROR: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '❌' },
  INFO: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: 'ℹ️' },
};

export default function ResponseLog({ logs, onClear }) {
  return (
    <div className="nexus-card flex flex-col h-[calc(100vh-140px)] min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-nexus-accent font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <span className="text-base">📋</span> Log de Atividades
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-nexus-textMuted">{logs.length} entradas</span>
          <button
            onClick={onClear}
            className="text-xs text-nexus-textMuted hover:text-nexus-danger transition-colors"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-nexus-textMuted text-sm">
            Nenhuma atividade registrada...
          </div>
        ) : (
          logs.map((log) => {
            const style = TYPE_STYLES[log.type] || TYPE_STYLES.INFO;
            return (
              <div
                key={log.id}
                className={`${style.bg} border ${style.border} rounded-lg p-3`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`${style.text} text-xs font-semibold`}>
                    {style.icon} {log.type}
                  </span>
                  <span className="text-xs text-nexus-textMuted">{log.timestamp}</span>
                </div>
                <p className="text-xs text-nexus-text">{log.message}</p>
                {log.data && (
                  <pre className="mt-2 text-[10px] text-nexus-textMuted bg-nexus-bg/50 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-words">
                    {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
