import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "./design-system/mj-design-system-db98fa";
import ContabilShell from "./components/ContabilShell";
import Dashboard from "./pages/contabil/Dashboard";

const Lancamentos = lazy(() => import("./pages/contabil/Lancamentos"));
const Folha = lazy(() => import("./pages/contabil/Folha"));
const ESocial = lazy(() => import("./pages/contabil/ESocial"));
const Demonstracoes = lazy(() => import("./pages/contabil/Demonstracoes"));
const IntegracaoERP = lazy(() => import("./pages/contabil/IntegracaoERP"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => (
  <BrowserRouter>
    <Toaster />
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Routes>
        <Route element={<ContabilShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lancamentos" element={<Lancamentos />} />
          <Route path="/folha" element={<Folha />} />
          <Route path="/esocial" element={<ESocial />} />
          <Route path="/demonstracoes" element={<Demonstracoes />} />
          <Route path="/integracao" element={<IntegracaoERP />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
