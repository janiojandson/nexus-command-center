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

function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-md',
  };
  const bg = variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700';
  
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors ${bg} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Memória Vetorial</h1>
        <p className="text-gray-500 mt-1">Armazenamento e busca de contextos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Busca Vetorial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="searchQuery">Consulta</Label>
              <Input
                id="searchQuery"
                placeholder="Digite sua consulta..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button onClick={handleSearch}>Buscar</Button>
            
            {searchResults.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Resultados:</h3>
                <div className="space-y-2">
                  {searchResults.map((result, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded text-sm border border-gray-100">
                      {result.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Armazenar Contexto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Button onClick={handleStore} className="w-full">
              Armazenar Vetor
            </Button>
            
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Vetores Armazenados:</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {vectors.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">Nenhum vetor armazenado nesta sessão.</p>
                ) : (
                  vectors.map((vec, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded text-sm border border-gray-100 truncate">
                      {JSON.stringify(vec)}
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
