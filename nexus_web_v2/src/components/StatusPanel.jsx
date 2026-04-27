export default function StatusPanel({ status, diagnostico, loading, onRefreshStatus, onRefreshDiagnostico }) {
  const renderValue = (value) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? '✅ Sim' : '❌ Não';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const statusEntries = status ? Object.entries(status) : [];

  return (
    <div className="nexus-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-nexus-accent font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <span className="text-base">📊</span> Status do MoE
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onRefreshStatus}
            disabled={loading}
            className="text-xs text-nexus-textMuted hover:text-nexus-accent transition-colors disabled:opacity-40"
          >
            🔄 Status
          </button>
          <button
            onClick={onRefreshDiagnostico}
            disabled={loading}
            className="text-xs text-nexus-textMuted hover:text-nexus-accent transition-colors disabled:opacity-40"
          >
            🩺 Diagnóstico
          </button>
        </div>
      </div>

      {loading && !status && !diagnostico ? (
        <div className="flex items-center justify-center py-8 text-nexus-textMuted text-sm">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Carregando...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Section */}
          {statusEntries.length > 0 && (
            <div>
              <p className="nexus-label mb-2">📡 Status Geral</p>
              <div className="bg-nexus-bg rounded-lg border border-nexus-border divide-y divide-nexus-border">
                {statusEntries.map(([key, value]) => (
                  <div key={key} className="px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-nexus-textMuted">{key}</span>
                    <span className="text-xs text-nexus-text font-medium text-right max-w-[60%] truncate">
                      {renderValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostico Section */}
          {diagnostico && (
            <div>
              <p className="nexus-label mb-2">🩺 Diagnóstico</p>
              <div className="bg-nexus-bg rounded-lg border border-nexus-border p-3">
                <pre className="text-xs text-nexus-text whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                  {typeof diagnostico === 'string' ? diagnostico : JSON.stringify(diagnostico, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!status && !diagnostico && (
            <p className="text-center text-nexus-textMuted text-sm py-4">
              Sem dados. Clique em "Status" ou "Diagnóstico" para carregar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
