import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AthletePage from "./pages/AthletePage";
import VisionPage from "./pages/VisionPage";
import Layout from "./components/layout/Layout";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/athlete/:id" element={<AthletePage />} />
        <Route path="/vision" element={<VisionPage />} />
      </Routes>
    </Layout>
  );
}
