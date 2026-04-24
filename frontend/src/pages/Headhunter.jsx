import React, { useState, useEffect } from 'react';

// Componentes UI integrados diretamente
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
  return <div className={`px-6 pb-6 pt-4 ${className}`}>{children}</div>;
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
  const sizes = { sm: 'px-3 py-1.5 text-sm rounded-md', md: 'px-4 py-2 text-base rounded-md' };
  const bg = variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 
             variant === 'secondary' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' :
             'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700';
  return (
    <button 
      disabled={isLoading}
      className={`inline-flex items-center justify-center font-medium transition-colors ${bg} ${sizes[size] || sizes.md} ${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`} 
      {...props}
    >
      {isLoading ? 'A carregar...' : children}
    </button>
  );
}

function Label({ className = '', children, ...props }) {
  return <label className={`text-sm font-medium leading-none text-gray-700 mb-2 block ${className}`} {...props}>{children}</label>;
}

function Table({ columns, data }) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, idx) => (
              <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
              {columns.map((column, colIdx) => (
                <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Headhunter() {
  const [profiles, setProfiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, available: 0 });

  // Carrega as estatísticas reais do PostgreSQL ao abrir a página
  useEffect(() => {
    fetchStats();
    handleSearch(); // Faz uma busca inicial vazia para listar os existentes
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/headhunter/stats');
      if (res.ok) {
        const data = await res.json();
        if(data.success) setStats(data.data);
      }
    } catch (e) {
      console.error('Erro ao buscar estatísticas:', e);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setSelectedProfile(null);
    try {
      // Conecta à ROTA REAL do nosso controlador PostgreSQL
      const url = searchQuery ? `/api/headhunter/agents?specialty=${encodeURIComponent(searchQuery)}` : '/api/headhunter/agents';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setProfiles(data.data || []);
      } else {
        setProfiles([]);
      }
    } catch (error) {
      console.error('Erro na busca real:', error);
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (profileId) => {
    alert(`Comando de conexão enviado para o Agente ID: ${profileId}\nEm breve o Nexus enviará a mensagem inicial.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Radar Headhunter</h1>
          <p className="text-gray-500 mt-1">Ligado à Base de Dados PostgreSQL Central</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Total na Base: <span className="font-bold text-gray-900">{stats.total}</span></p>
          <p>Disponíveis: <span className="font-bold text-green-600">{stats.available}</span></p>
        </div>
      </div>

      <Card className="bg-white shadow-sm border-blue-100">
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="searchInput">Filtrar por Especialidade (Deixe vazio para ver todos)</Label>
            <div className="flex gap-3">
              <Input
                id="searchInput"
                placeholder="Ex: Node.js, Vendas, AI Agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} isLoading={isLoading}>
                Varrer Base
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">A consultar o PostgreSQL...</p>
        </div>
      ) : profiles.length > 0 ? (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Agentes Encontrados</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table
              columns={[
                { key: 'name', label: 'Nome', render: (val) => <span className="font-medium text-gray-900">{val}</span> },
                { key: 'specialty', label: 'Especialidade' },
                { key: 'status', label: 'Status', render: (val) => (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${val === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {val}
                  </span>
                )},
                { key: 'rating', label: 'Score', render: (val) => `${val}/5.0` },
                { key: 'actions', label: 'Ações', render: (_, row) => (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedProfile(row)}>Detalhes</Button>
                    <Button size="sm" onClick={() => handleConnect(row.id)}>Recrutar</Button>
                  </div>
                )}
              ]}
              data={profiles}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-50 border-dashed border-2 shadow-none">
          <CardContent className="py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Base de Dados Vazia</h3>
            <p className="mt-1 text-sm text-gray-500">Nenhum agente encontrado. O Cérebro Nexus precisa iniciar uma rotina de caça para popular a base.</p>
          </CardContent>
        </Card>
      )}

      {selectedProfile && (
        <Card className="bg-white shadow-sm border-blue-200">
          <CardHeader className="bg-blue-50/50">
            <CardTitle>Ficha do Agente: {selectedProfile.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><p className="text-xs text-gray-500 uppercase">ID Banco</p><p className="text-sm font-mono">{selectedProfile.id}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Criado em</p><p className="text-sm">{new Date(selectedProfile.created_at).toLocaleString()}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500 uppercase">Capabilities JSON</p>
                <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(selectedProfile.capabilities, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
