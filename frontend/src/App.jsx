import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Missions from './pages/Missions';
import Memory from './pages/Memory';
import Headhunter from './pages/Headhunter';
import Layout from './components/Layout';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/missions" element={<Missions />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/headhunter" element={<Headhunter />} />
      </Routes>
    </Layout>
  );
}

export default App;