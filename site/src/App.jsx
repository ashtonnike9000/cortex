import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AthletePage from "./pages/AthletePage";
import Layout from "./components/layout/Layout";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/athlete/:id" element={<AthletePage />} />
      </Routes>
    </Layout>
  );
}
