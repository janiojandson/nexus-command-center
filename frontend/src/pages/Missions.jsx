import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function Missions() {
  const [missions, setMissions] = useState([]);
  const [newMission, setNewMission] = useState({ type: '', params: '' });

  const handleLaunch = async () => {
    try {
      const response = await fetch('/api/missions/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMission)
      });
      const data = await response.json();
      setMissions([...missions, data]);
    } catch (error) {
      console.error('Erro ao lançar missão:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Missões</h1>
        <p className="text-gray-500 mt-1">Lançamento e monitoramento de missões pesadas</p>
      </div>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Lançar Nova Missão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="missionType">Tipo de Missão</Label>
            <Input
              id="missionType"
              placeholder="Ex: Satélite, Drone, Robô"
              value={newMission.type}
              onChange={(e) => setNewMission({ ...newMission, type: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="missionParams">Parâmetros</Label>
            <Input
              id="missionParams"
              placeholder="Parâmetros JSON"
              value={newMission.params}
              onChange={(e) => setNewMission({ ...newMission, params: e.target.value })}
            />
          </div>
          <Button onClick={handleLaunch} className="w-full">
            Lançar Missão
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {missions.map((mission, index) => (
          <Card key={index} className="bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="text-lg font-medium">{mission.missionType}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  mission.status === 'completed' ? 'bg-green-100 text-green-800' :
                  mission.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {mission.status}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">Parâmetros</p>
                <pre className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">{JSON.stringify(mission.parameters, null, 2)}</pre>
              </div>
              <CardFooter className="pt-4">
                <Button variant="outline" size="sm">Ver Detalhes</Button>
              </CardFooter>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}