// ============================================================================
// Documentação executiva do sistema — geração de PDF (restrita a administradores)
// ----------------------------------------------------------------------------
// Monta um dossiê completo: propósito, arquitetura, mapa de telas derivado da
// navegação real, regras de cada motor, análises e limitações conhecidas.
// ============================================================================
import jsPDF from "jspdf";
import { AREAS } from "./contabilNav";

type Bloco =
  | { tipo: "h1"; texto: string }
  | { tipo: "h2"; texto: string }
  | { tipo: "h3"; texto: string }
  | { tipo: "p"; texto: string }
  | { tipo: "li"; texto: string }
  | { tipo: "kv"; texto: string; valor: string };

/** Lê uma cor do design system (CSS var) e devolve [r,g,b] para o PDF. */
function corToken(nome: string, fallback: [number, number, number]): [number, number, number] {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  if (!raw) return fallback;
  const el = document.createElement("span");
  el.style.color = raw.startsWith("--") ? `var(${raw})` : raw;
  el.style.display = "none";
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  el.remove();
  const m = rgb.match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 3) return fallback;
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

/* ============================ conteúdo curado ============================ */

const TELAS_DEDICADAS: { area: string; itens: [string, string][] }[] = [
  {
    area: "Preparativos",
    itens: [
      ["/preparativos/cadastros/empresas/novo", "Cadastro de empresa com assistente de campos e busca automática de CNPJ/CEP."],
      ["/preparativos/cadastros/filiais", "Filiais e unidades do grupo, com validação de CNPJ e vínculo à matriz."],
      ["/preparativos/cadastros/classe-atividades", "Classes de atividade (CNAE) e seu resumo consolidado."],
      ["/preparativos/empresa/dados-empresa", "Dados cadastrais, inscrições, pagamentos, parâmetros e certificados da empresa."],
      ["/preparativos/servicos/gestao", "Gestão do fechamento: fases expansíveis com as tarefas do regime da empresa."],
      ["/preparativos/servicos/fases-processos", "Modelagem de fases e processos do ciclo mensal."],
      ["/preparativos/servicos/cadastro-tarefas", "Catálogo de tarefas por regime tributário."],
      ["/preparativos/servicos/encerramentos", "Encerramento de competências com bloqueios, reabertura e exportação."],
    ],
  },
  {
    area: "Fiscal",
    itens: [
      ["/fiscal/documentos/*", "Entradas, saídas, serviços tomados e prestados, transporte, cupons e manifestação."],
      ["/fiscal/escrituracao/*", "Livros de entradas e saídas, apuração de ICMS e IPI, inventário e CIAP."],
      ["/fiscal/apuracoes/*", "Motores de PIS/COFINS, ISS, IRPJ/CSLL, Simples Nacional e retenções."],
      ["/fiscal/obrigacoes/*", "SPED Fiscal, EFD-Contribuições, ECD/ECF, DCTFWeb, REINF, estaduais e agenda."],
      ["/fiscal/guias/*", "DARF, guias estaduais, parcelamentos e calendário de recolhimentos."],
      ["/fiscal/auditoria/*", "XML × escrituração, classificação fiscal, créditos, certidões e regras."],
    ],
  },
  {
    area: "Financeiro",
    itens: [
      ["/financeiro/tabelas/*", "Tabelas de SIMEI, Simples Nacional, Lucro Real, Lucro Presumido, PIS/COFINS e ajustes."],
      ["/financeiro/cadastros/*", "Produtos, serviços, clientes e fornecedores usados pelos motores."],
      ["/financeiro/movimentos/*", "Faturamento, serviços, demais documentos e conclusão fiscal da competência."],
      ["/financeiro/tributacao/*", "DIFAL, ICMS-ST, DEFIS, tributação avançada, motor tributário e painel executivo."],
      ["/financeiro/demonstracoes/dre", "DRE com análises horizontal e vertical."],
      ["/financeiro/operacional/conciliacao-bancaria", "Conciliação lado a lado entre extrato e lançamentos."],
    ],
  },
  {
    area: "Administrativo",
    itens: [
      ["/administrativo/dominio/*", "Cadastros analíticos somente-leitura sincronizados do ERP de origem."],
      ["/administrativo/pesquisa", "Pesquisa global sobre a base analítica."],
      ["/administrativo/dashboard", "Painel executivo com concentração e volume financeiro."],
      ["/administrativo/contas-caixa", "Contas a pagar e receber, tesouraria e fluxo de caixa."],
      ["/administrativo/contratos", "Contratos, certificados digitais, documentos e agenda de vencimentos."],
      ["/administrativo/patrimonio", "Bens, depreciação, movimentações e inventário do imobilizado."],
      ["/administrativo/suprimentos", "Requisições, cotações com julgamento e pedidos de compra."],
      ["/administrativo/controles", "Usuários, permissões, centros de custo, políticas, log e avisos manuais."],
    ],
  },
];

const REGRAS: { motor: string; itens: string[] }[] = [
  {
    motor: "Motor de apuração fiscal",
    itens: [
      "Cada regime possui motor próprio e desacoplado: PIS/COFINS, ISS, IRPJ/CSLL, Simples Nacional e retenções.",
      "Simples Nacional: alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12; Fator R = folha 12 meses ÷ RBT12, com corte em 28% entre Anexo III e V.",
      "Receitas monofásicas, ICMS-ST e exportação são segregadas antes do cálculo do DAS.",
      "Toda apuração registra log de cálculo passo a passo, permitindo auditoria do resultado.",
    ],
  },
  {
    motor: "Escrituração",
    itens: [
      "Livros de entradas e saídas são derivados automaticamente dos documentos fiscais da competência — não há digitação paralela.",
      "Apuração de ICMS e IPI consolida débitos, créditos e saldo transportado.",
      "CIAP controla o crédito de ativo imobilizado em 48 parcelas.",
    ],
  },
  {
    motor: "Obrigações acessórias",
    itens: [
      "Cada obrigação tem geração, validação e transmissão próprias sobre uma camada comum de versionamento e auditoria.",
      "O monitor classifica em pendente, em processamento, transmitida, rejeitada, com advertências, vencida ou próxima do prazo.",
      "Prazos são calculados a partir da competência corrente e alimentam a agenda fiscal.",
    ],
  },
  {
    motor: "Guias e recolhimentos",
    itens: [
      "Guias vencidas recebem multa e juros calculados pelo motor de encargos antes da reemissão.",
      "Fluxo suportado: emissão, reemissão, cancelamento, compensação, definição de responsável e parcelamento.",
      "Guias pendentes bloqueiam o encerramento da competência.",
    ],
  },
  {
    motor: "Gestão do fechamento",
    itens: [
      "As tarefas exibidas mudam conforme o regime tributário da empresa selecionada (Simples Nacional, MEI, Presumido, Real).",
      "Cada tarefa aponta para a tela responsável por executá-la.",
      "O encerramento só ocorre sem cadastros pendentes, tarefas obrigatórias abertas ou guias em aberto; a reabertura exige motivo e fica registrada.",
    ],
  },
  {
    motor: "Patrimônio, compras e controles",
    itens: [
      "Depreciação por taxa anual e vida útil, com movimentações e inventário de bens.",
      "Ciclo de suprimentos: requisição → aprovação → cotação → julgamento por critério → adjudicação em pedido → recebimento total ou parcial.",
      "Controles internos concentram usuários, perfis, permissões, políticas, log de acessos e avisos manuais.",
    ],
  },
];

const ANALISES = [
  "Dashboard geral: KPIs expansíveis, evolução de faturamento e composição de despesas com paleta acessível para daltonismo.",
  "Painel executivo tributário: carga tributária efetiva, comparativo entre regimes e concentração por tributo.",
  "DRE com análise horizontal (evolução entre períodos) e vertical (participação sobre a receita líquida).",
  "Auditoria fiscal: regras que confrontam XML, escrituração, classificação e créditos, com criticidade por achado.",
  "Auditoria cadastral: achados por domínio, com criticidade e sugestão de correção no ERP de origem.",
  "Notificações derivadas dos motores: prazos, pendências e rejeições, somadas aos avisos manuais.",
];

const LIMITES = [
  "Sistema de contabilidade interna do grupo — não é um sistema para escritórios de contabilidade terceirizados.",
  "Os motores fiscais são visuais e internos: não há transmissão, consulta ou qualquer conexão real com a Receita Federal, SEFAZ ou prefeituras.",
  "Documentos, guias e arquivos gerados são simulações para conferência e estudo, sem validade legal.",
  "As preferências de aparência, som e ambiente são locais ao navegador; empresas e usuários ficam no backend.",
];

/* ============================== montagem ================================= */

function blocos(usuario: string): Bloco[] {
  const b: Bloco[] = [];
  const p = (texto: string) => b.push({ tipo: "p", texto });
  const li = (texto: string) => b.push({ tipo: "li", texto });
  const h1 = (texto: string) => b.push({ tipo: "h1", texto });
  const h2 = (texto: string) => b.push({ tipo: "h2", texto });
  const h3 = (texto: string) => b.push({ tipo: "h3", texto });

  h1("1. Propósito do sistema");
  p(
    "O Use Contábil é a central contábil, fiscal e administrativa interna do grupo. Ele existe para que a própria " +
      "empresa controle o ciclo mensal completo — cadastros, documentos, escrituração, apuração, obrigações, guias e " +
      "encerramento — sem depender de planilhas paralelas e sem terceirizar o acompanhamento das pendências.",
  );
  p(
    "O motivo de cada módulo é o mesmo: transformar dado disperso em obrigação rastreável. Nada é lançado duas vezes; " +
      "as telas de movimento alimentam a escrituração, que alimenta as apurações, que geram guias e obrigações, que " +
      "por fim liberam (ou bloqueiam) o encerramento da competência.",
  );

  h1("2. Arquitetura e stack");
  b.push({ tipo: "kv", texto: "Interface", valor: "React + TypeScript + Vite, com design system próprio sobre Tailwind." });
  b.push({ tipo: "kv", texto: "Backend", valor: "Lovable Cloud — autenticação, tabela de usuários, perfis e funções de borda." });
  b.push({ tipo: "kv", texto: "Motores", valor: "Camada de stores em TypeScript, um por domínio, desacoplada das telas." });
  b.push({ tipo: "kv", texto: "Assistente", valor: "IA ajudante contextual em telas de cadastro, apuração e fechamento." });
  p(
    "Cada domínio tem um store próprio (empresas, filiais, atividades, documentos fiscais, escrituração, apuração, " +
      "obrigações, guias, tributário, financeiro, DRE, conciliação, contas e caixa, contratos, patrimônio, compras, " +
      "controles, notificações e gestão). As telas apenas leem e disparam ações; a regra vive no store.",
  );

  h1("3. Contexto global");
  li("Empresa atual: seletor no cabeçalho que redefine todos os motores e telas.");
  li("Competência: filtro global de período, propagado a documentos, apurações, obrigações e fechamento.");
  li("Tema, cor de destaque, sons e ambiente: preferências por usuário, salvas no navegador.");
  li("Notificações: painel alimentado por prazos, pendências dos motores e avisos manuais.");
  li("Busca de telas: paleta de comandos (Ctrl/Cmd + K) sobre toda a navegação.");

  h1("4. Mapa completo de navegação");
  for (const area of AREAS) {
    h2(`${area.code} · ${area.title}`);
    p(area.blurb);
    for (const cat of area.categories) {
      h3(cat.title);
      for (const m of cat.modules) li(`${m.title} — ${m.desc}`);
    }
  }

  h1("5. Telas dedicadas por área");
  for (const grupo of TELAS_DEDICADAS) {
    h2(grupo.area);
    for (const [rota, desc] of grupo.itens) b.push({ tipo: "kv", texto: rota, valor: desc });
  }

  h1("6. Regras de negócio por motor");
  for (const r of REGRAS) {
    h2(r.motor);
    for (const i of r.itens) li(i);
  }

  h1("7. Análises disponíveis");
  for (const a of ANALISES) li(a);

  h1("8. Caminho completo de uso");
  li("1. Preparativos: cadastrar a empresa, filiais, classes de atividade, parâmetros e certificados.");
  li("2. Financeiro: manter produtos, serviços, clientes, fornecedores e tabelas do regime.");
  li("3. Fiscal › Documentos: registrar ou importar as notas da competência.");
  li("4. Fiscal › Escrituração: conferir livros, apuração de ICMS/IPI, inventário e CIAP.");
  li("5. Fiscal › Apurações: rodar o motor do regime e revisar o log de cálculo.");
  li("6. Fiscal › Guias e Obrigações: emitir recolhimentos e transmitir as acessórias.");
  li("7. Administrativo: conciliar contas, contratos, patrimônio, compras e controles.");
  li("8. Preparativos › Encerramentos: validar bloqueios e fechar a competência.");

  h1("9. Segurança e perfis");
  li("Acesso autenticado; sessão gerenciada pelo backend e encerrada no logout.");
  li("Perfis e permissões por área definidos em Controles internos, com log de acessos.");
  li("Papéis administrativos ficam em tabela dedicada de papéis, nunca no cadastro do usuário.");
  li("Esta documentação é gerada apenas para contas com papel de administrador.");

  h1("10. Limitações e premissas");
  for (const l of LIMITES) li(l);

  h1("11. Emissão");
  b.push({ tipo: "kv", texto: "Gerado por", valor: usuario });
  b.push({ tipo: "kv", texto: "Data", valor: new Date().toLocaleString("pt-BR") });
  b.push({
    tipo: "kv",
    valor: String(AREAS.reduce((s, a) => s + a.categories.reduce((x, c) => x + c.modules.length, 0), 0)),
    texto: "Módulos mapeados",
  });

  return b;
}

/** Quebra rótulos longos (rotas) nas barras, evitando corte no meio da palavra. */
function quebrarRotulo(doc: jsPDF, texto: string, largura: number): string[] {
  const partes = texto.split("/").filter(Boolean).map((x, i, a) => `/${x}${i === a.length - 1 ? "" : ""}`);
  if (!partes.length) return doc.splitTextToSize(texto, largura);
  const linhas: string[] = [];
  let atual = "";
  for (const parte of partes) {
    const teste = atual + parte;
    if (atual && doc.getTextWidth(teste) > largura) {
      linhas.push(atual);
      atual = parte;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/* ================================ PDF ==================================== */

export function gerarDocumentacaoPdf(usuario: string) {
  const laranja = corToken("--brand-orange", [234, 88, 12]);
  const texto = corToken("--foreground", [24, 20, 18]);
  const suave = corToken("--muted-foreground", [110, 105, 100]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const L = 56;
  const R = 56;
  const largura = doc.internal.pageSize.getWidth() - L - R;
  const alturaPagina = doc.internal.pageSize.getHeight();
  let y = 0;

  const novaPagina = () => {
    doc.addPage();
    y = 64;
  };
  const espaco = (n: number) => {
    if (y + n > alturaPagina - 64) novaPagina();
  };

  // capa
  doc.setFillColor(...laranja);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 8, "F");
  doc.setTextColor(...texto);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text("Use Contábil", L, 160);
  doc.setTextColor(...laranja);
  doc.setFontSize(30);
  doc.text("Documentação do sistema", L, 196);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...suave);
  doc.text(
    doc.splitTextToSize(
      "Dossiê completo do caminho do sistema: propósito, arquitetura, mapa de telas, regras de cada motor, " +
        "análises disponíveis e limitações assumidas.",
      largura,
    ),
    L,
    226,
  );
  doc.text(`Emitido por ${usuario} em ${new Date().toLocaleString("pt-BR")}`, L, alturaPagina - 72);
  novaPagina();

  for (const bloco of blocos(usuario)) {
    if (bloco.tipo === "h1") {
      espaco(60);
      y += 14;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...laranja);
      doc.text(bloco.texto, L, y);
      y += 8;
      doc.setDrawColor(...laranja);
      doc.line(L, y, L + largura, y);
      y += 16;
      continue;
    }
    if (bloco.tipo === "h2" || bloco.tipo === "h3") {
      const grande = bloco.tipo === "h2";
      espaco(40);
      y += grande ? 10 : 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(grande ? 12.5 : 11);
      doc.setTextColor(...texto);
      doc.text(bloco.texto, L, y);
      y += 14;
      continue;
    }
    if (bloco.tipo === "kv") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...texto);
      const rotulo = quebrarRotulo(doc, bloco.texto, 150);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...suave);
      const valor = doc.splitTextToSize(bloco.valor, largura - 160);
      const alt = Math.max(rotulo.length, valor.length) * 12 + 4;
      espaco(alt);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...texto);
      doc.text(rotulo, L, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...suave);
      doc.text(valor, L + 160, y);
      y += alt;
      continue;
    }
    const bullet = bloco.tipo === "li";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...(bullet ? suave : texto));
    const linhas = doc.splitTextToSize(bloco.texto, largura - (bullet ? 14 : 0));
    for (const linha of linhas) {
      espaco(16);
      if (bullet && linha === linhas[0]) {
        doc.setTextColor(...laranja);
        doc.text("•", L, y);
        doc.setTextColor(...suave);
      }
      doc.text(linha, L + (bullet ? 14 : 0), y);
      y += 14;
    }
    y += 6;
  }

  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...suave);
    doc.text("Use Contábil — documentação interna", L, alturaPagina - 32);
    doc.text(`${i} / ${total}`, L + largura, alturaPagina - 32, { align: "right" });
  }

  const nome = `use-contabil-documentacao-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nome);
  return nome;
}
