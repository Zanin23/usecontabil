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
const Filiais = lazy(() => import("./pages/contabil/Filiais"));
const ResumoClasseAtividades = lazy(() => import("./pages/contabil/ResumoClasseAtividades"));
const ServicosGestao = lazy(() => import("./pages/contabil/ServicosGestao"));
const FasesProcessos = lazy(() => import("./pages/contabil/FasesProcessos"));
const CadastroTarefas = lazy(() => import("./pages/contabil/CadastroTarefas"));
const Encerramentos = lazy(() => import("./pages/contabil/Encerramentos"));
const EmpresaDados = lazy(() => import("./pages/contabil/EmpresaDados"));
const EmpresaInscricoes = lazy(() => import("./pages/contabil/EmpresaInscricoes"));
const EmpresaPagamentos = lazy(() => import("./pages/contabil/EmpresaPagamentos"));
const EmpresaParametros = lazy(() => import("./pages/contabil/EmpresaParametros"));
const EmpresaCertificados = lazy(() => import("./pages/contabil/EmpresaCertificados"));
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
          <Route path="/preparativos/cadastros/filiais" element={<Filiais />} />
          <Route path="/preparativos/cadastros/classe-atividades" element={<ClasseAtividades />} />
          <Route path="/preparativos/cadastros/resumo-classe-atividades" element={<ResumoClasseAtividades />} />
          <Route path="/preparativos/cadastros/empresas/:id" element={<EmpresaCadastro />} />
          <Route path="/preparativos/empresa/dados-empresa" element={<EmpresaDados />} />
          <Route path="/preparativos/empresa/inscricoes" element={<EmpresaInscricoes />} />
          <Route path="/preparativos/empresa/pagamentos" element={<EmpresaPagamentos />} />
          <Route path="/preparativos/empresa/parametros" element={<EmpresaParametros />} />
          <Route path="/preparativos/empresa/certificados" element={<EmpresaCertificados />} />
          <Route path="/preparativos/servicos/gestao" element={<ServicosGestao />} />
          <Route path="/preparativos/servicos/fases-processos" element={<FasesProcessos />} />
          <Route path="/preparativos/servicos/cadastro-tarefas" element={<CadastroTarefas />} />
          <Route path="/preparativos/servicos/encerramentos" element={<Encerramentos />} />

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
