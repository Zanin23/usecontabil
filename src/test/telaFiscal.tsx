/** Helper dos testes de telas de Documentos fiscais: empresa logada, competência e provedores reais. */
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { limparSupabaseFalso } from "./supabaseFalso";

export const EMPRESA = {
  id: "EMP-1", cnpj: "11.222.333/0001-81", razao: "Confecções Exemplo Ltda", regime: "Simples Nacional",
  atividade: "—", status: "Ativa", createdAt: "2026-01-01T00:00:00Z", raw: { uf: "SP" },
};

/** Zera o ambiente: navegador limpo, empresa EMPRESA selecionada, competência Jul/2026. */
export function prepararAmbiente() {
  localStorage.clear();
  limparSupabaseFalso();
  vi.resetModules();
  localStorage.setItem("usecontabil.empresas.cache.v1", JSON.stringify([EMPRESA]));
  localStorage.setItem("usecontabil.empresaAtual.v1", EMPRESA.id);
  localStorage.setItem("usecontabil_competencia", "2026-07");
}

export async function abrirTela(pagina: "NotasSaida" | "NotasEntrada") {
  const { EmpresaProvider } = await import("@/lib/empresaAtual");
  const { CompetenciaProvider } = await import("@/lib/competencia");
  const Tela = (await import(`@/pages/contabil/fiscal/${pagina}`)).default;
  return render(
    <MemoryRouter>
      <EmpresaProvider>
        <CompetenciaProvider>
          <Tela />
        </CompetenciaProvider>
      </EmpresaProvider>
    </MemoryRouter>,
  );
}

export const docsFiscais = (slug: string): Record<string, string>[] => JSON.parse(localStorage.getItem("usecontabil.fiscal.docs.v1") ?? "{}")[slug] ?? [];
