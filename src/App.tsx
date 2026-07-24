import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "./design-system/mj-design-system-db98fa";
import ContabilShell from "./components/ContabilShell";
import Dashboard from "./pages/contabil/Dashboard";
import { CompetenciaProvider } from "./lib/competencia";

const AreaPage = lazy(() => import("./pages/contabil/AreaPage"));
const CategoryPage = lazy(() => import("./pages/contabil/CategoryPage"));
const ModulePage = lazy(() => import("./pages/contabil/ModulePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => (
  <BrowserRouter>
    <CompetenciaProvider>
    <Toaster />
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Routes>
        <Route element={<ContabilShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/:area" element={<AreaPage />} />
          <Route path="/:area/:categoria" element={<CategoryPage />} />
          <Route path="/:area/:categoria/:modulo" element={<ModulePage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </CompetenciaProvider>
  </BrowserRouter>
);

export default App;
