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
const FinServicos = lazy(() => import("./pages/contabil/financeiro/CadastroServicos"));
const FinSimei = lazy(() => import("./pages/contabil/financeiro/TabelaSimei"));
const FinSimples = lazy(() => import("./pages/contabil/financeiro/TabelaSimplesNacional"));
const FinLucroReal = lazy(() => import("./pages/contabil/financeiro/TabelaLucroReal"));
const FinLucroPresumido = lazy(() => import("./pages/contabil/financeiro/TabelaLucroPresumido"));
const FinAjusteApuracao = lazy(() => import("./pages/contabil/financeiro/TabelaAjusteApuracao"));
const FinAjusteDoc = lazy(() => import("./pages/contabil/financeiro/TabelaAjusteDocumentoFiscal"));
const FinPisCofins = lazy(() => import("./pages/contabil/financeiro/TabelaApuracaoPisCofins"));
const FiscalEntradas = lazy(() => import("./pages/contabil/fiscal/NotasEntrada"));
const FiscalSaidas = lazy(() => import("./pages/contabil/fiscal/NotasSaida"));
const FiscalServTomados = lazy(() => import("./pages/contabil/fiscal/ServicosTomados"));
const FiscalServPrestados = lazy(() => import("./pages/contabil/fiscal/ServicosPrestados"));
const FiscalTransporte = lazy(() => import("./pages/contabil/fiscal/ConhecimentosTransporte"));
const FiscalCupons = lazy(() => import("./pages/contabil/fiscal/CuponsFiscais"));
const FiscalManifestacao = lazy(() => import("./pages/contabil/fiscal/ManifestacaoDestinatario"));
const EscLivroEntradas = lazy(() => import("./pages/contabil/fiscal/escrituracao/LivroEntradas"));
const EscLivroSaidas = lazy(() => import("./pages/contabil/fiscal/escrituracao/LivroSaidas"));
const EscApuracaoIcms = lazy(() => import("./pages/contabil/fiscal/escrituracao/ApuracaoIcms"));
const EscApuracaoIpi = lazy(() => import("./pages/contabil/fiscal/escrituracao/ApuracaoIpi"));
const EscInventario = lazy(() => import("./pages/contabil/fiscal/escrituracao/Inventario"));
const EscCiap = lazy(() => import("./pages/contabil/fiscal/escrituracao/Ciap"));
const ApuracoesHub = lazy(() => import("./pages/contabil/fiscal/apuracoes/Hub"));
const ApPisCofins = lazy(() => import("./pages/contabil/fiscal/apuracoes/PisCofins"));
const ApIss = lazy(() => import("./pages/contabil/fiscal/apuracoes/Iss"));
const ApIrpjCsll = lazy(() => import("./pages/contabil/fiscal/apuracoes/IrpjCsll"));
const ApSimples = lazy(() => import("./pages/contabil/fiscal/apuracoes/SimplesNacional"));
const ApRetencoes = lazy(() => import("./pages/contabil/fiscal/apuracoes/Retencoes"));
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

          <Route path="/financeiro/cadastros/servicos" element={<FinServicos />} />
          <Route path="/financeiro/tabelas/simei" element={<FinSimei />} />
          <Route path="/financeiro/tabelas/simples-nacional" element={<FinSimples />} />
          <Route path="/financeiro/tabelas/lucro-real" element={<FinLucroReal />} />
          <Route path="/financeiro/tabelas/lucro-presumido" element={<FinLucroPresumido />} />
          <Route path="/financeiro/tabelas/ajuste-apuracao" element={<FinAjusteApuracao />} />
          <Route path="/financeiro/tabelas/ajuste-documento-fiscal" element={<FinAjusteDoc />} />
          <Route path="/financeiro/tabelas/apuracao-pis-cofins" element={<FinPisCofins />} />


          <Route path="/fiscal/documentos/entradas" element={<FiscalEntradas />} />
          <Route path="/fiscal/documentos/saidas" element={<FiscalSaidas />} />
          <Route path="/fiscal/documentos/servicos-tomados" element={<FiscalServTomados />} />
          <Route path="/fiscal/documentos/servicos-prestados" element={<FiscalServPrestados />} />
          <Route path="/fiscal/documentos/transporte" element={<FiscalTransporte />} />
          <Route path="/fiscal/documentos/cupons" element={<FiscalCupons />} />
          <Route path="/fiscal/documentos/manifestacao" element={<FiscalManifestacao />} />

          <Route path="/fiscal/escrituracao/livro-entradas" element={<EscLivroEntradas />} />
          <Route path="/fiscal/escrituracao/livro-saidas" element={<EscLivroSaidas />} />
          <Route path="/fiscal/escrituracao/apuracao-icms" element={<EscApuracaoIcms />} />
          <Route path="/fiscal/escrituracao/apuracao-ipi" element={<EscApuracaoIpi />} />
          <Route path="/fiscal/escrituracao/inventario" element={<EscInventario />} />
          <Route path="/fiscal/escrituracao/ciap" element={<EscCiap />} />

          <Route path="/fiscal/apuracoes" element={<ApuracoesHub />} />
          <Route path="/fiscal/apuracoes/pis-cofins" element={<ApPisCofins />} />
          <Route path="/fiscal/apuracoes/iss" element={<ApIss />} />
          <Route path="/fiscal/apuracoes/irpj-csll" element={<ApIrpjCsll />} />
          <Route path="/fiscal/apuracoes/simples-nacional" element={<ApSimples />} />
          <Route path="/fiscal/apuracoes/retencoes" element={<ApRetencoes />} />

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
