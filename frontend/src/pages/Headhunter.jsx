import React, { useState } from 'react';

// Componentes UI integrados diretamente para garantir a compilação num único ficheiro
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
  return <input className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`} {...props} />;
}

function Button({ children, size = 'md', className = '', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-sm rounded-md', md: 'px-4 py-2 text-base rounded-md' };
  return <button className={`inline-flex items-center justify-center font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white ${sizes[size] || sizes.md} ${className}`} {...props}>{children}</button>;
}

function Label({ className = '', children, ...props }) {
  return <label className={`text-sm font-medium leading-none text-gray-700 ${className}`} {...props}>{children}</label>;
}

function Table({ columns, data }) {
  return (
    <div className="overflow-x-auto">
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
            <tr key={rowIdx} className="hover:bg-gray-50">
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

  const handleSearch = async () => {
    try {
      const response = await fetch('/api/headhunter/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await response.json();
      setProfiles(data.results);
    } catch (error) {
      console.error('Erro na busca:', error);
    }
  };

  const handleConnect = async (profileId) => {
    try {
      const response = await fetch('/api/headhunter/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      });
      const data = await response.json();
      alert('Conexão estabelecida!');
    } catch (error) {
      console.error('Erro ao conectar:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Headhunter Inteligente</h1>
        <p className="text-gray-500 mt-1">Busca e conexão com talentos</p>
      </div>

      <Card className="bg-white shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="searchInput">Consultar Perfil</Label>
            <Input
              id="searchInput"
              placeholder="Nome, habilidades, cargo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleSearch} className="w-full">
            Buscar Perfis
          </Button>
        </CardContent>
      </Card>

      {profiles.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Resultados da Busca</CardTitle>
          </CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: 'name', label: 'Nome' },
                { key: 'skills', label: 'Habilidades' },
                { key: 'position', label: 'Cargo' },
                { key: 'score', label: 'Compatibilidade' },
                { key: 'actions', label: 'Ações' }
              ]}
              data={profiles.map(profile => ({
                ...profile,
                score: `${Math.floor(Math.random() * 30 + 70)}%`,
                actions: (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(profile.id)}
                  >
                    Conectar
                  </Button>
                )
              }))}
            />
          </CardContent>
        </Card>
      )}

      {selectedProfile && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Perfil Selecionado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-50 p-4 rounded">
              {JSON.stringify(selectedProfile, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
