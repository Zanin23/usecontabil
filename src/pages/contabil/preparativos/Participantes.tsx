import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Pencil, Plus, Search, Trash2, Users2 } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import CabecalhoPagina from "@/components/contabil/cadastros/CabecalhoPagina";
import Kpis from "@/components/contabil/cadastros/Kpis";
import ListaErros from "@/components/contabil/cadastros/ListaErros";
import ImportarCadastrosAntigos from "@/components/contabil/cadastros/ImportarCadastrosAntigos";
import { Campo, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/contabil/cadastros/Campos";
import { SeletorConta } from "@/components/contabil/cadastros/SeletorBusca";
import { normalizarBusca } from "@/lib/busca";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import {
  ehCliente, ehFornecedor, excluirParticipante, INDICADORES_IE, participanteVazio, PESSOAS, REGIMES_PARTICIPANTE,
  RETENCOES, salvarParticipante, TIPOS_PARTICIPANTE, UFS_BR, useParticipantes, validarParticipante, type Participante,
} from "@/lib/cadastrosStore";
import { contasAnaliticasAtivas, rotuloConta, contaPorId, useContas } from "@/lib/planoContasStore";
import { lancamentosDoParticipante } from "@/lib/lancamentosStore";
import { confirmarExclusao } from "@/lib/confirmar";
import { consultarCep, consultarCnpj } from "@/lib/consultaPublica";
import { soDigitos } from "@/lib/documentos";
import BlocoOrientacao from "@/components/ux/BlocoOrientacao";
import ProximosPassos from "@/components/ux/ProximosPassos";
import { FileDown, FileText, MapPin, Wallet } from "lucide-react";

/** Aba do formulário onde está o campo do erro (para levar a pessoa direto até ele). */
function abaDoErro(erro = "") {
  if (/UF|CEP|IBGE|E-mail/.test(erro)) return "endereco";
  if (/[Ii]nscrição estadual|Contribuinte/.test(erro)) return "fiscal";
  return "identificacao";
}

type FiltroTipo = "todos" | "clientes" | "fornecedores" | "transportadoras" | "outros";
type FiltroSituacao = "Ativo" | "Inativo" | "todas";

const COLUNAS_EXPORTACAO = [
  { key: "codigo", label: "Código" }, { key: "tipo", label: "Tipo" }, { key: "nome", label: "Nome / razão social" },
  { key: "fantasia", label: "Fantasia" }, { key: "documento", label: "CNPJ/CPF" }, { key: "indicadorIe", label: "Indicador IE" },
  { key: "ie", label: "IE" }, { key: "im", label: "IM" }, { key: "regime", label: "Regime" }, { key: "municipio", label: "Município" },
  { key: "uf", label: "UF" }, { key: "email", label: "E-mail" }, { key: "telefone", label: "Telefone" },
  { key: "conta", label: "Conta contábil" }, { key: "situacao", label: "Situação" }, { key: "origem", label: "Origem" },
];

export default function Participantes() {
  const participantes = useParticipantes();
  const contas = useContas();
  const analiticas = useMemo(() => contasAnaliticasAtivas(contas), [contas]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [situacao, setSituacao] = useState<FiltroSituacao>("Ativo");
  const [soPendencias, setSoPendencias] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [draft, setDraft] = useState<Participante>(() => participanteVazio([]));
  const [erros, setErros] = useState<string[]>([]);
  const [aba, setAba] = useState("identificacao");
  /** Registro recém-salvo: alimenta o painel "próximas ações". */
  const [salvo, setSalvo] = useState<Participante | null>(null);
  /** Consulta pública em andamento (CNPJ/CEP) — evita digitar dado que já existe. */
  const [consultando, setConsultando] = useState<"cnpj" | "cep" | null>(null);

  const pendencias = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of participantes) {
      const e = validarParticipante(p, participantes);
      if (e.length) m.set(p.id, e);
    }
    return m;
  }, [participantes]);

  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    const digitos = soDigitos(busca);
    return participantes.filter((p) => {
      if (situacao !== "todas" && p.situacao !== situacao) return false;
      if (tipo === "clientes" && !ehCliente(p)) return false;
      if (tipo === "fornecedores" && !ehFornecedor(p)) return false;
      if (tipo === "transportadoras" && p.tipo !== "Transportadora") return false;
      if (tipo === "outros" && p.tipo !== "Outro") return false;
      if (soPendencias && !pendencias.has(p.id)) return false;
      if (!termo) return true;
      if (digitos.length >= 3 && soDigitos(p.documento).includes(digitos)) return true;
      return normalizarBusca(`${p.codigo} ${p.nome} ${p.fantasia ?? ""} ${p.municipio ?? ""} ${p.uf ?? ""}`).includes(termo);
    });
  }, [participantes, busca, tipo, situacao, soPendencias, pendencias]);

  const ativos = participantes.filter((p) => p.situacao === "Ativo");
  const set = <K extends keyof Participante>(k: K, v: Participante[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const novo = () => {
    setDraft(participanteVazio(participantes));
    setErros([]);
    setAba("identificacao");
    setAberto(true);
  };
  const editar = (p: Participante, abaInicial = "identificacao") => {
    setDraft({ ...p, retencoes: [...(p.retencoes ?? [])] });
    setErros([]);
    setAba(abaInicial);
    setAberto(true);
  };
  /**
   * Busca os dados públicos do CNPJ e preenche o que o usuário digitaria de novo
   * (razão social, endereço, contato). Nada é sobrescrito sem confirmação do clique.
   */
  const buscarCnpj = async () => {
    setConsultando("cnpj");
    try {
      const d = await consultarCnpj(draft.documento);
      setDraft((atual) => ({
        ...atual,
        nome: atual.nome?.trim() ? atual.nome : d.razaoSocial || atual.nome,
        fantasia: atual.fantasia?.trim() ? atual.fantasia : d.nomeFantasia || atual.fantasia,
        cep: atual.cep?.trim() ? atual.cep : d.cep || atual.cep,
        logradouro: atual.logradouro?.trim() ? atual.logradouro : d.logradouro || atual.logradouro,
        numero: atual.numero?.trim() ? atual.numero : d.numero || atual.numero,
        complemento: atual.complemento?.trim() ? atual.complemento : d.complemento || atual.complemento,
        bairro: atual.bairro?.trim() ? atual.bairro : d.bairro || atual.bairro,
        municipio: atual.municipio?.trim() ? atual.municipio : d.municipio || atual.municipio,
        uf: atual.uf?.trim() ? atual.uf : d.uf || atual.uf,
        codigoMunicipio: atual.codigoMunicipio?.trim()
          ? atual.codigoMunicipio
          : d.codigoMunicipio || atual.codigoMunicipio,
        email: atual.email?.trim() ? atual.email : d.email || atual.email,
        telefone: atual.telefone?.trim() ? atual.telefone : d.telefone || atual.telefone,
      }));
      toast.success("Dados públicos do CNPJ preenchidos.", {
        description: "Campos que você já havia digitado foram mantidos.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao consultar o CNPJ.");
    } finally {
      setConsultando(null);
    }
  };

  /** Completa o endereço a partir do CEP, sem tocar no que já foi digitado. */
  const buscarCep = async () => {
    setConsultando("cep");
    try {
      const d = await consultarCep(draft.cep ?? "");
      setDraft((atual) => ({
        ...atual,
        cep: d.cep || atual.cep,
        logradouro: atual.logradouro?.trim() ? atual.logradouro : d.logradouro || atual.logradouro,
        bairro: atual.bairro?.trim() ? atual.bairro : d.bairro || atual.bairro,
        municipio: atual.municipio?.trim() ? atual.municipio : d.municipio || atual.municipio,
        uf: atual.uf?.trim() ? atual.uf : d.uf || atual.uf,
        codigoMunicipio: atual.codigoMunicipio?.trim()
          ? atual.codigoMunicipio
          : d.codigoMunicipio || atual.codigoMunicipio,
      }));
      toast.success("Endereço preenchido pelo CEP.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao consultar o CEP.");
    } finally {
      setConsultando(null);
    }
  };

  const salvar = () => {
    const r = salvarParticipante(draft);
    if (!r.ok) {
      setErros(r.erros);
      setAba(abaDoErro(r.erros[0]));
      toast.error("O cadastro não foi salvo: confira os avisos no formulário.");
      return;
    }
    toast.success(`${r.registro.nome} ${draft.id ? "atualizado" : "cadastrado"}.`);
    setAberto(false);
    setSalvo(r.registro);
  };
  const excluir = (p: Participante) => {
    const usos = lancamentosDoParticipante(p.id);
    if (usos) {
      toast.error(`${p.nome} aparece em ${usos} lançamento(s) contábil(eis). Inative o cadastro em vez de excluir.`);
      return;
    }
    if (!confirmarExclusao(`o cadastro de ${p.nome}`)) return;
    excluirParticipante(p.id);
    toast.success("Cadastro excluído.");
  };

  const linhasExportacao = filtrados.map((p) => ({
    ...p, conta: p.contaContabilId ? rotuloConta(contaPorId(p.contaContabilId)) : "",
  })) as unknown as Record<string, string>[];

  return (
    <div className="space-y-6 pb-16">
      <CabecalhoPagina
        trilha={[{ rotulo: "Preparativos", para: "/preparativos" }, { rotulo: "Cadastros", para: "/preparativos/cadastros" }]}
        icone={Users2}
        titulo="Clientes e fornecedores"
        descricao="Cadastro único de clientes, fornecedores e transportadoras do grupo — usado pelos documentos fiscais e pelos lançamentos contábeis."
        acoes={
          <>
            <ImportarCadastrosAntigos />
            <ExportarMenu nome="Clientes e fornecedores" colunas={COLUNAS_EXPORTACAO} linhas={linhasExportacao} />
            <Button className="rounded-full" onClick={novo}>
              <Plus className="mr-2 h-4 w-4" /> Novo cadastro
            </Button>
          </>
        }
      />

      <BlocoOrientacao />

      {salvo && (
        <ProximosPassos
          titulo={`${salvo.nome} salvo com sucesso`}
          descricao="O cadastro já pode ser usado em documentos fiscais, títulos e lançamentos contábeis."
          acoes={[
            {
              titulo: "Completar endereço",
              icon: MapPin,
              principal: true,
              porque: "Endereço e UF são usados nos documentos fiscais",
              onClick: () => {
                const alvo = salvo;
                setSalvo(null);
                editar(alvo, "endereco");
              },
            },
            {
              titulo: "Informar dados fiscais",
              icon: FileText,
              porque: "IE, IM, indicador e retenções",
              onClick: () => {
                const alvo = salvo;
                setSalvo(null);
                editar(alvo, "fiscal");
              },
            },
            {
              titulo: "Lançar uma nota",
              rota: "/fiscal/documentos/entradas",
              icon: FileDown,
              porque: "A nota aponta para este participante",
            },
            {
              titulo: "Abrir contas a pagar",
              rota: "/administrativo/financeiro-operacional/contas-pagar",
              icon: Wallet,
            },
            {
              titulo: "Novo cadastro",
              icon: Plus,
              onClick: () => {
                setSalvo(null);
                novo();
              },
            },
          ]}
          onFechar={() => setSalvo(null)}
        />
      )}

      <Kpis
        itens={[
          { rotulo: "Cadastros ativos", valor: String(ativos.length) },
          { rotulo: "Clientes", valor: String(ativos.filter(ehCliente).length) },
          { rotulo: "Fornecedores", valor: String(ativos.filter(ehFornecedor).length) },
          { rotulo: "Com pendência", valor: String(pendencias.size), dica: pendencias.size ? "Cadastros incompletos ou inválidos" : "Tudo em ordem" },
        ]}
      />

      <Card className="rounded-xl border-dashed shadow-none">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Enquanto a integração com o ERP não existe, cadastre aqui. Ao importar o XML de uma NF-e em{" "}
          <strong className="text-foreground">Fiscal › Documentos</strong>, o emitente ou destinatário entra (ou é completado) automaticamente.
          O mesmo CNPJ não se repete: quem compra e vende para a empresa é <em>Cliente e fornecedor</em>.
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar cadastro"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, código, CNPJ/CPF ou cidade…"
                className="rounded-full pl-9"
              />
            </div>
            <Select value={tipo} onValueChange={(v) => setTipo(v as FiltroTipo)}>
              <SelectTrigger aria-label="Filtrar por tipo" className="w-[170px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="clientes">Clientes</SelectItem>
                <SelectItem value="fornecedores">Fornecedores</SelectItem>
                <SelectItem value="transportadoras">Transportadoras</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
            <Select value={situacao} onValueChange={(v) => setSituacao(v as FiltroSituacao)}>
              <SelectTrigger aria-label="Filtrar por situação" className="w-[140px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativos</SelectItem>
                <SelectItem value="Inativo">Inativos</SelectItem>
                <SelectItem value="todas">Todos</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={soPendencias} onCheckedChange={(v) => setSoPendencias(v === true)} aria-label="Só com pendência" />
              Só com pendência
            </label>
            <Badge variant="secondary" className="rounded-full">{filtrados.length} de {participantes.length}</Badge>
          </div>

          {filtrados.length === 0 ? (
            <div className="space-y-3 py-14 text-center">
              <p className="text-sm text-muted-foreground">
                {participantes.length ? "Nenhum cadastro com esses filtros." : "Nenhum cliente ou fornecedor cadastrado ainda."}
              </p>
              {!participantes.length ? (
                <Button className="rounded-full" onClick={novo}><Plus className="mr-2 h-4 w-4" /> Novo cadastro</Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>ICMS</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((p) => {
                    const pend = pendencias.get(p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                        <TableCell className="max-w-[280px]">
                          <div className="flex items-center gap-1.5">
                            {pend ? (
                              <span title={pend.join(" ")} aria-label={`Pendência: ${pend.join(" ")}`} className="shrink-0">
                                <AlertTriangle className="h-3.5 w-3.5 text-warn" />
                              </span>
                            ) : null}
                            <span className="truncate font-medium">{p.nome}</span>
                          </div>
                          {p.fantasia ? <div className="truncate text-xs text-muted-foreground">{p.fantasia}</div> : null}
                        </TableCell>
                        <TableCell className="text-xs">{p.tipo}</TableCell>
                        <TableCell className="font-mono text-xs">{p.documento || "—"}</TableCell>
                        <TableCell className="text-xs">{[p.municipio, p.uf].filter(Boolean).join(" / ") || "—"}</TableCell>
                        <TableCell className="text-xs">{p.indicadorIe}</TableCell>
                        <TableCell>
                          <Badge variant={p.situacao === "Ativo" ? "secondary" : "outline"} className="rounded-full">{p.situacao}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Editar ${p.nome}`} onClick={() => editar(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Excluir ${p.nome}`} onClick={() => excluir(p)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? `Editar ${draft.nome || "cadastro"}` : "Novo cliente ou fornecedor"}</DialogTitle>
            <DialogDescription>
              Origem: {draft.origem}. Campos com * são obrigatórios; o CNPJ/CPF é conferido pelo dígito verificador.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={aba} onValueChange={setAba}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
              <TabsTrigger value="endereco">Endereço e contato</TabsTrigger>
              <TabsTrigger value="contabil">Contábil</TabsTrigger>
            </TabsList>

            <TabsContent value="identificacao" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <CampoSelecao rotulo="Tipo" valor={draft.tipo} opcoes={TIPOS_PARTICIPANTE} onChange={(v) => set("tipo", v)} obrigatorio />
                <CampoSelecao
                  rotulo="Pessoa"
                  valor={draft.pessoa}
                  opcoes={PESSOAS}
                  onChange={(v) => setDraft((d) => ({ ...d, pessoa: v, regime: v === "Física" && d.regime === "Não informado" ? "Pessoa física" : d.regime }))}
                  obrigatorio
                />
                <CampoTexto
                  rotulo={
                    draft.pessoa === "Física"
                      ? "CPF"
                      : draft.pessoa === "Estrangeiro"
                        ? "Identificação no exterior"
                        : "CNPJ"
                  }
                  valor={draft.documento}
                  onChange={(v) => set("documento", v)}
                  obrigatorio={draft.pessoa !== "Estrangeiro"}
                  mono
                  ajuda={
                    draft.pessoa === "Jurídica"
                      ? "Use “Buscar dados” para trazer razão social e endereço do CNPJ."
                      : undefined
                  }
                  acao={
                    draft.pessoa === "Jurídica" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl"
                        disabled={consultando === "cnpj"}
                        onClick={buscarCnpj}
                        title="Preencher razão social e endereço com os dados públicos do CNPJ"
                      >
                        <Search className="mr-1.5 h-3.5 w-3.5" />
                        {consultando === "cnpj" ? "Buscando…" : "Buscar dados"}
                      </Button>
                    ) : undefined
                  }
                />
                <CampoTexto rotulo="Nome / razão social" valor={draft.nome} onChange={(v) => set("nome", v)} obrigatorio span={4} />
                <CampoTexto rotulo="Código" valor={draft.codigo} onChange={(v) => set("codigo", v)} obrigatorio mono />
                <CampoTexto rotulo="Nome fantasia" valor={draft.fantasia} onChange={(v) => set("fantasia", v)} span={4} />
                <CampoSelecao rotulo="Situação" valor={draft.situacao} opcoes={["Ativo", "Inativo"] as const} onChange={(v) => set("situacao", v)} />
              </div>
            </TabsContent>

            <TabsContent value="fiscal" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <CampoSelecao
                  rotulo="Contribuinte de ICMS"
                  valor={draft.indicadorIe}
                  opcoes={INDICADORES_IE}
                  onChange={(v) => set("indicadorIe", v)}
                  ajuda="Mesmo indicador da NF-e (indIEDest). Não contribuinte em outra UF gera DIFAL."
                />
                <CampoTexto rotulo="Inscrição estadual" valor={draft.ie} onChange={(v) => set("ie", v)} mono placeholder='Números ou "ISENTO"' />
                <CampoTexto rotulo="Inscrição municipal" valor={draft.im} onChange={(v) => set("im", v)} mono />
                <CampoSelecao rotulo="Regime tributário" valor={draft.regime} opcoes={REGIMES_PARTICIPANTE} onChange={(v) => set("regime", v)} />
                <CampoTexto rotulo="SUFRAMA" valor={draft.suframa} onChange={(v) => set("suframa", v)} mono />
                <Campo rotulo="Retenções na fonte" span={6} ajuda="Marque as retenções que se aplicam aos serviços contratados deste fornecedor.">
                  <div className="flex flex-wrap gap-4 pt-1">
                    {RETENCOES.map((r) => (
                      <label key={r} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          aria-label={`Retenção ${r}`}
                          checked={draft.retencoes.includes(r)}
                          onCheckedChange={(v) =>
                            set("retencoes", v === true ? [...draft.retencoes, r] : draft.retencoes.filter((x) => x !== r))
                          }
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </Campo>
              </div>
            </TabsContent>

            <TabsContent value="endereco" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <CampoTexto
                  rotulo="CEP"
                  valor={draft.cep}
                  onChange={(v) => set("cep", v)}
                  mono
                  span={2}
                  ajuda="O botão completa logradouro, bairro, município e UF."
                  acao={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 rounded-xl"
                      disabled={consultando === "cep"}
                      onClick={buscarCep}
                      title="Preencher o endereço a partir do CEP"
                    >
                      {consultando === "cep" ? "Buscando…" : "Buscar"}
                    </Button>
                  }
                />
                <CampoTexto rotulo="Logradouro" valor={draft.logradouro} onChange={(v) => set("logradouro", v)} span={4} />
                <CampoTexto rotulo="Número" valor={draft.numero} onChange={(v) => set("numero", v)} span={1} />
                <CampoTexto rotulo="Complemento" valor={draft.complemento} onChange={(v) => set("complemento", v)} span={2} />
                <CampoTexto rotulo="Bairro" valor={draft.bairro} onChange={(v) => set("bairro", v)} span={3} />
                <CampoTexto rotulo="Município" valor={draft.municipio} onChange={(v) => set("municipio", v)} span={3} />
                <CampoTexto rotulo="Código IBGE" valor={draft.codigoMunicipio} onChange={(v) => set("codigoMunicipio", v)} mono span={1} />
                <CampoSelecao rotulo="UF" valor={draft.uf as (typeof UFS_BR)[number] | undefined} opcoes={UFS_BR} onChange={(v) => set("uf", v)} obrigatorio={draft.pessoa !== "Estrangeiro"} span={1} />
                <CampoTexto rotulo="País" valor={draft.pais} onChange={(v) => set("pais", v)} span={1} />
                <CampoTexto rotulo="E-mail" valor={draft.email} onChange={(v) => set("email", v)} span={3} />
                <CampoTexto rotulo="Telefone" valor={draft.telefone} onChange={(v) => set("telefone", v)} span={3} />
              </div>
            </TabsContent>

            <TabsContent value="contabil" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <Campo
                  rotulo="Conta contábil própria (opcional)"
                  span={6}
                  ajuda="Use quando o cliente ou fornecedor tem conta analítica própria no plano. Sem ela, os lançamentos usam as contas gerais (ex.: Clientes, Fornecedores)."
                >
                  <SeletorConta contas={analiticas} valor={draft.contaContabilId} onChange={(id) => set("contaContabilId", id)} ariaLabel="Conta contábil" />
                </Campo>
                <CampoAreaTexto rotulo="Observações" valor={draft.observacoes} onChange={(v) => set("observacoes", v)} />
                {!analiticas.length ? (
                  <p className="text-xs text-muted-foreground sm:col-span-6">
                    O plano de contas ainda está vazio: carregue o modelo em Contábil › Cadastros › Plano de contas.
                  </p>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>

          <ListaErros erros={erros} />

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button className="rounded-full" onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
