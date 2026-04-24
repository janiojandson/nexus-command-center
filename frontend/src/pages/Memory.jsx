import React, { useState } from 'react';

// Componentes UI integrados diretamente para garantir a compilação e evitar erros de caminho
function Card({ children, className = '' }) {
  return <div className={`rounded-lg border bg-white shadow-sm ${className}`}>{children}</div>;
}

function CardHeader({ children }) {
  return <div className="border-b border-gray-200 px-6 py-4">{children}</div>;
}

function CardTitle({ children }) {
  return <h3 className="text-lg font-semibold leading-6 text-gray-900">{children}</h3>;
}

function CardContent({ children, className = '' }) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
      {...props}
    />
  );
}

function Button({ children, variant = 'primary', size = 'md', className = '', isLoading = false, ...props }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-md',
  };
  const bg = variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 
             variant === 'sparkle' ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold' :
             'bg-gray-100 hover:bg-gray-200 text-gray-700';
  
  return (
    <button
      disabled={isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all shadow-sm active:scale-95 ${bg} ${sizes[size] || sizes.md} ${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
}

function Label({ className = '', children, ...props }) {
  return (
    <label
      className={`text-sm font-medium leading-none text-gray-700 mb-2 block ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}

export default function Memory() {
  const [vectors, setVectors] = useState([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [memorySummary, setMemorySummary] = useState('');
  
  // Gemini API Configuration
  const apiKey = ""; // A chave é fornecida pelo ambiente em runtime

  // Função auxiliar para chamadas à Gemini API com Retry Exponencial
  const callGemini = async (prompt, systemPrompt = "És o Arquiteto Nexus, um assistente de IA sénior.") => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] }
    };

    const fetchWithRetry = async (retries = 5, delay = 1000) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          if (response.status === 429 && retries > 0) {
            await new Promise(res => setTimeout(res, delay));
            return fetchWithRetry(retries - 1, delay * 2);
          }
          throw new Error(`Erro API: ${response.status}`);
        }
        
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da IA.";
      } catch (err) {
        if (retries > 0) {
          await new Promise(res => setTimeout(res, delay));
          return fetchWithRetry(retries - 1, delay * 2);
        }
        throw err;
      }
    };

    return fetchWithRetry();
  };

  const handleSearch = async () => {
    try {
      const response = await fetch('/api/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erro na busca:', error);
    }
  };

  const handleStore = async () => {
    try {
      const response = await fetch('/api/memory/vectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'exemplo', metadata: {} })
      });
      const data = await response.json();
      setVectors([...vectors, data]);
    } catch (error) {
      console.error('Erro ao armazenar:', error);
    }
  };

  // ✨ Gemini Feature: Summarize all knowledge
  const handleSummarizeKnowledge = async () => {
    if (vectors.length === 0) return;
    setIsGeminiLoading(true);
    try {
      const contextString = vectors.map(v => JSON.stringify(v)).join("\n");
      const prompt = `Analisa este conjunto de conhecimentos armazenados no sistema Nexus e gera um resumo executivo de 3 pontos sobre o que o sistema sabe atualmente:\n\n${contextString}`;
      const summary = await callGemini(prompt, "És um CTO de elite a analisar uma base de conhecimentos vetorial.");
      setMemorySummary(summary);
    } catch (error) {
      console.error('Erro Gemini:', error);
    } finally {
      setIsGeminiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Memória Vetorial</h1>
          <p className="text-gray-500 mt-1">Armazenamento e busca de contextos de alta precisão</p>
        </div>
        <Button 
          variant="sparkle" 
          onClick={handleSummarizeKnowledge}
          isLoading={isGeminiLoading}
          disabled={vectors.length === 0}
        >
          Resumir Conhecimento ✨
        </Button>
      </div>

      {memorySummary && (
        <Card className="border-blue-200 bg-blue-50/30 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-blue-100/50 py-3">
            <CardTitle className="text-sm font-bold flex items-center text-blue-800">
              <span className="mr-2">✨</span> Insights do Arquiteto Nexus
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {memorySummary}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm h-fit">
          <CardHeader>
            <CardTitle>Busca Inteligente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="searchQuery">Consulta Semântica</Label>
              <Input
                id="searchQuery"
                placeholder="Ex: Como configurar o Load Balancer?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1">Buscar</Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-4 animate-in fade-in duration-300">
                <h3 className="text-sm font-medium mb-2 flex items-center text-gray-700">
                  Resultados da Memória
                </h3>
                <div className="space-y-3">
                  {searchResults.map((result, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100 group">
                      <p className="text-sm text-gray-800">{result.content}</p>
                      <div className="mt-2 flex justify-end">
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          Analisar Impacto ✨
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm h-fit">
          <CardHeader>
            <CardTitle>Alimentar Hipocampo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-200 text-center">
              <p className="text-sm text-gray-500 mb-4">Insere novos fragmentos de conhecimento para persistência vetorial.</p>
              <Button onClick={handleStore} className="w-full" variant="outline">
                Armazenar Novo Contexto
              </Button>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Base de Conhecimento Ativa</h3>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {vectors.length} Fragmentos
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {vectors.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50/50 rounded border border-gray-100">
                    <p className="text-xs text-gray-400 italic">O Hipocampo está vazio. Começa a adicionar dados para criar inteligência.</p>
                  </div>
                ) : (
                  vectors.map((vec, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
                      <div className="h-2 w-2 bg-green-500 rounded-full shrink-0"></div>
                      <div className="text-xs text-gray-600 truncate flex-1">
                        {JSON.stringify(vec)}
                      </div>
                      <button className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
