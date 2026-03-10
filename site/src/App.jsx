import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AthletePage from "./pages/AthletePage";
import ModelsPage from "./pages/ModelsPage";
import ShoeLab from "./pages/ShoeLab";
import VisionPage from "./pages/VisionPage";
import ThesisPage from "./pages/ThesisPage";
import PitWallPage from "./pages/PitWallPage";
import Layout from "./components/layout/Layout";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/athlete/:id" element={<AthletePage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/shoes" element={<ShoeLab />} />
        <Route path="/vision" element={<VisionPage />} />
        <Route path="/thesis" element={<ThesisPage />} />
        <Route path="/pitwall" element={<PitWallPage />} />
      </Routes>
    </Layout>
  );
}
