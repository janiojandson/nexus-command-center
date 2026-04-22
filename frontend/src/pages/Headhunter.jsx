import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input, Button, Table } from '../components/ui';

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