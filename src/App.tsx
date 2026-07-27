import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "./design-system/mj-design-system-db98fa";
import ContabilShell from "./components/ContabilShell";
import Dashboard from "./pages/contabil/Dashboard";
import { CompetenciaProvider } from "./lib/competencia";
import { EmpresaProvider } from "./lib/empresaAtual";


const AreaPage = lazy(() => import("./pages/contabil/AreaPage"));
const CategoryPage = lazy(() => import("./pages/contabil/CategoryPage"));
const ModulePage = lazy(() => import("./pages/contabil/ModulePage"));
const EmpresaCadastro = lazy(() => import("./pages/contabil/EmpresaCadastro"));
const ClasseAtividades = lazy(() => import("./pages/contabil/ClasseAtividades"));
const ResumoClasseAtividades = lazy(() => import("./pages/contabil/ResumoClasseAtividades"));
const NotFound = lazy(() => import("./pages/NotFound"));


const App = () => (
  <BrowserRouter>
    <CompetenciaProvider>
    <EmpresaProvider>
    <Toaster />
    <Suspense fallback={<div className="min-h-screen bg-background" />}>

      <Routes>
        <Route element={<ContabilShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/:area" element={<AreaPage />} />
          <Route path="/:area/:categoria" element={<CategoryPage />} />
          <Route path="/preparativos/empresa/dados-empresa/novo" element={<EmpresaCadastro />} />
          <Route path="/preparativos/cadastros/empresas/novo" element={<EmpresaCadastro />} />
          <Route path="/preparativos/cadastros/classe-atividades" element={<ClasseAtividades />} />
          <Route path="/preparativos/cadastros/resumo-classe-atividades" element={<ResumoClasseAtividades />} />
          <Route path="/preparativos/cadastros/empresas/:id" element={<EmpresaCadastro />} />

          <Route path="/:area/:categoria/:modulo" element={<ModulePage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </EmpresaProvider>
    </CompetenciaProvider>

  </BrowserRouter>
);

export default App;
