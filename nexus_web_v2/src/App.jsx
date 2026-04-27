import { useState, useEffect, useCallback } from 'react';
import { sendCommand, getStatus, getDiagnostico, sendWhatsApp } from './api';
import CommandPanel from './components/CommandPanel';
import StatusPanel from './components/StatusPanel';
import WhatsAppPanel from './components/WhatsAppPanel';
import ResponseLog from './components/ResponseLog';

export default function App() {
  const [status, setStatus] = useState(null);
  const [diagnostico, setDiagnostico] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState({});

  const addLog = useCallback((type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [{ id: Date.now(), timestamp, type, message, data }, ...prev].slice(0, 100));
  }, []);

  const setLoadingState = useCallback((key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  const refreshStatus = useCallback(async () => {
    setLoadingState('status', true);
    try {
      const data = await getStatus();
      setStatus(data);
      addLog('SUCCESS', 'Status do MoE atualizado', data);
    } catch (err) {
      addLog('ERROR', `Falha ao buscar status: ${err.message}`);
    } finally {
      setLoadingState('status', false);
    }
  }, [addLog, setLoadingState]);

  const refreshDiagnostico = useCallback(async () => {
    setLoadingState('diagnostico', true);
    try {
      const data = await getDiagnostico();
      setDiagnostico(data);
      addLog('SUCCESS', 'Diagnóstico atualizado', data);
    } catch (err) {
      addLog('ERROR', `Falha no diagnóstico: ${err.message}`);
    } finally {
      setLoadingState('diagnostico', false);
    }
  }, [addLog, setLoadingState]);

  const handleSendCommand = useCallback(async ({ prompt, systemPrompt, conversationId }) => {
    setLoadingState('command', true);
    try {
      const data = await sendCommand({ prompt, systemPrompt, conversationId });
      addLog('COMMAND', `Prompt enviado: "${prompt.slice(0, 60)}..."`, data);
      return data;
    } catch (err) {
      addLog('ERROR', `Falha no comando: ${err.message}`);
      throw err;
    } finally {
      setLoadingState('command', false);
    }
  }, [addLog, setLoadingState]);

  const handleSendWhatsApp = useCallback(async ({ to, message }) => {
    setLoadingState('whatsapp', true);
    try {
      const data = await sendWhatsApp({ to, message });
      addLog('WHATSAPP', `Mensagem enviada para ${to}`, data);
      return data;
    } catch (err) {
      addLog('ERROR', `Falha no WhatsApp: ${err.message}`);
      throw err;
    } finally {
      setLoadingState('whatsapp', false);
    }
  }, [addLog, setLoadingState]);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return (
    <div className="min-h-screen bg-nexus-bg">
      {/* Header */}
      <header className="border-b border-nexus-border bg-nexus-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-nexus-accent/10 border border-nexus-accent/30 flex items-center justify-center text-lg">
              🧠
            </div>
            <div>
              <h1 className="text-nexus-accent font-bold text-lg leading-tight tracking-tight">
                NEXUS COMMAND CENTER
              </h1>
              <p className="text-nexus-textMuted text-xs">v2.0 — Painel de Controle do Cérebro</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${status ? 'bg-nexus-success animate-pulse' : 'bg-nexus-danger'}`} />
            <span className="text-xs text-nexus-textMuted">
              {status ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1: Command + WhatsApp */}
          <div className="lg:col-span-1 space-y-6">
            <CommandPanel onSend={handleSendCommand} loading={loading.command} />
            <WhatsAppPanel onSend={handleSendWhatsApp} loading={loading.whatsapp} />
          </div>

          {/* Col 2: Status + Diagnostico */}
          <div className="lg:col-span-1 space-y-6">
            <StatusPanel
              status={status}
              diagnostico={diagnostico}
              loading={loading.status || loading.diagnostico}
              onRefreshStatus={refreshStatus}
              onRefreshDiagnostico={refreshDiagnostico}
            />
          </div>

          {/* Col 3: Response Log */}
          <div className="lg:col-span-1">
            <ResponseLog logs={logs} onClear={() => setLogs([])} />
          </div>
        </div>
      </main>
    </div>
  );
}
