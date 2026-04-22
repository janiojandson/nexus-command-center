import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input, Button } from '../components/ui';

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
      setSearchResults(data.results);
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
          <CardContent className="space-y-4">
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
                    <div key={idx} className="bg-gray-50 p-3 rounded text-sm">
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
          <CardContent className="space-y-4">
            <Button onClick={handleStore} className="w-full">
              Armazenar Vetor
            </Button>
            
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Vetores Armazenados:</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {vectors.map((vec, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded text-sm">
                    {JSON.stringify(vec)}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}