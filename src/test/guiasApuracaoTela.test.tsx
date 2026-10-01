import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Coins } from "lucide-react";
import ApuracaoView from "@/components/contabil/ApuracaoView";
import GuiaPainel from "@/components/contabil/GuiaPainel";
import { useAplicarContextoRotaDados } from "@/lib/useAplicarContextoRotaDados";

const mock = vi.hoisted(() => ({
  empresa: { id: "EMP-1", razao: "Empresa Teste", cnpj: "11.222.333/0001-81", regime: "Lucro Presumido" },
  empresas: [
    { id: "EMP-1", razao: "Empresa Teste", cnpj: "11.222.333/0001-81", regime: "Lucro Presumido" },
    { id: "EMP-2", razao: "Empresa Alternativa", cnpj: "22.333.444/0001-82", regime: "Lucro Presumido" },
  ],
  competencia: "2026-07",
  estado: {
    status: "Aberta",
    responsavel: "Equipe fiscal",
    atualizadoEm: "2026-07-31T12:00:00.000Z",
    ajustes: [],
    parametros: {},
    log: [],
  },
  apuracao: {
    motor: "pis-cofins",
    regime: "Lucro Presumido",
    kpis: [],
    documentos: [],
    calculos: [],
    inconsistencias: [],
    obrigacoes: [],
    guias: [{ nome: "DARF PIS", codigo: "8109", valor: 650, vencimento: "25/08/2026" }],
    resumo: [],
    totalImposto: 650,
  },
  setEmpresaId: vi.fn(),
  setCompetencia: vi.fn(),
}));

vi.mock("@/lib/empresaAtual", () => ({
  useEmpresaAtual: () => ({ empresa: mock.empresa, empresaId: mock.empresa.id, empresas: mock.empresas, setEmpresaId: mock.setEmpresaId }),
}));

vi.mock("@/lib/competencia", () => ({
  COMPETENCIAS: ["2026-06", "2026-07", "2026-08"],
  formatCompetencia: (c: string) => c,
  useCompetencia: () => ({ competencia: mock.competencia, setCompetencia: mock.setCompetencia }),
}));

vi.mock("@/lib/apuracaoStore", () => ({
  apurar: () => mock.apuracao,
  novoId: (prefixo: string) => `${prefixo}-teste`,
  rs: (valor: number) => `R$ ${valor.toFixed(2)}`,
  setEstado: vi.fn(),
  useApuracaoEstado: () => mock.estado,
}));

vi.mock("@/components/contabil/AssistenteFechamento", () => ({ default: () => null }));
vi.mock("@/components/contabil/AssistenteCampos", () => ({ default: () => null }));

function Localizacao() {
  const location = useLocation();
  return <output data-testid="localizacao">{location.pathname}{location.search}</output>;
}

function ContextoRota() {
  useAplicarContextoRotaDados();
  return null;
}

function telaApuracao() {
  return (
    <ApuracaoView
      motor="pis-cofins"
      titulo="PIS / COFINS"
      descricao="Apuração de contribuições."
      icone={Coins}
      submodulos={[]}
      regras={[]}
    />
  );
}

describe("rotas de dados na interface", () => {
  beforeEach(() => {
    mock.empresa = mock.empresas[0];
    mock.competencia = "2026-07";
    mock.setEmpresaId.mockClear();
    mock.setCompetencia.mockClear();
    mock.apuracao.guias = [{ nome: "DARF PIS", codigo: "8109", valor: 650, vencimento: "25/08/2026" }];
  });

  it("aplica o contexto recebido uma vez e não desfaz mudanças posteriores do usuário", async () => {
    mock.competencia = "2026-06";
    const tela = () => (
      <MemoryRouter initialEntries={["/fiscal/guias/darf?empresaId=EMP-2&competencia=2026-07"]}>
        <ContextoRota />
      </MemoryRouter>
    );
    const { rerender } = render(tela());

    await waitFor(() => {
      expect(mock.setEmpresaId).toHaveBeenCalledWith("EMP-2");
      expect(mock.setCompetencia).toHaveBeenCalledWith("2026-07");
    });

    mock.setEmpresaId.mockClear();
    mock.setCompetencia.mockClear();
    mock.empresa = mock.empresas[1];
    mock.competencia = "2026-07";
    rerender(tela());

    mock.empresa = mock.empresas[0];
    mock.competencia = "2026-08";
    rerender(tela());

    expect(mock.setEmpresaId).not.toHaveBeenCalled();
    expect(mock.setCompetencia).not.toHaveBeenCalled();
  });

  it("o botão da apuração abre o painel de guias já filtrado pela origem e pelo contexto", async () => {
    render(
      <MemoryRouter initialEntries={["/fiscal/apuracoes/pis-cofins"]}>
        <Routes>
          <Route path="/fiscal/apuracoes/pis-cofins" element={telaApuracao()} />
          <Route path="/fiscal/guias/darf" element={<Localizacao />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.mouseDown(await screen.findByRole("tab", { name: "Guias" }));
    fireEvent.click(await screen.findByRole("button", { name: /gerar guias/i }));

    expect(await screen.findByTestId("localizacao")).toHaveTextContent(
      "/fiscal/guias/darf?empresaId=EMP-1&competencia=2026-07&motor=pis-cofins",
    );
  });

  it("o detalhe da guia oferece links de volta a todas as apurações que a alimentaram", () => {
    render(
      <MemoryRouter>
        <GuiaPainel
          aberto
          onClose={vi.fn()}
          guia={{
            id: "EMP-1::2026-07::iss-retido",
            empresaId: "EMP-1",
            empresa: "Empresa Teste",
            filial: "Matriz",
            competencia: "2026-07",
            tributo: "ISS",
            codigoReceita: "ISS",
            orgao: "Prefeitura",
            numero: "12345",
            emissao: "2026-07-31",
            vencimento: "2026-08-10",
            valorOriginal: 500,
            multa: 0,
            juros: 0,
            atualizacao: 0,
            valorFinal: 500,
            pago: 0,
            saldo: 500,
            responsavel: "Equipe fiscal",
            status: "Em aberto",
            origem: "ISS · Guia retida",
            origemMotor: "iss",
            origemMotores: ["iss", "retencoes"],
            barras: "0000000000000000",
            linhaDigitavel: "00000",
            pix: "PIX ilustrativo",
            diasAtraso: 0,
            conciliada: false,
            pagamentos: [],
            log: [],
            memoria: [],
            emitida: false,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "ISS" })).toHaveAttribute(
      "href",
      "/fiscal/apuracoes/iss?empresaId=EMP-1&competencia=2026-07",
    );
    expect(screen.getByRole("link", { name: "Retenções na fonte" })).toHaveAttribute(
      "href",
      "/fiscal/apuracoes/retencoes?empresaId=EMP-1&competencia=2026-07",
    );
  });
});
