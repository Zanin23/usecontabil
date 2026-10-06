import { useMemo, useState } from "react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import {
  CheckCircle2, Download, FileUp, Pencil, Plus, Search, Trash2, type LucideIcon,
} from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { parseNumeroBR } from "@/lib/numeros";
import { usuarioAtual } from "@/lib/usuarioAtual";
import { getEmpresa } from "@/lib/empresasStore";
import { cfopDeEntrada, cfopPrincipal, conferirParticipacao, lerNFe, type SituacaoNFe } from "@/lib/nfeXml";
import { confirmarExclusao, confirmarLimpeza } from "@/lib/confirmar";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import AssistenteCampos from "@/components/contabil/AssistenteCampos";
import BlocoOrientacao from "@/components/ux/BlocoOrientacao";
import SeletorParticipante, { type PapelParticipante } from "@/components/ux/SeletorParticipante";
import { OrigemCampo } from "@/components/contabil/cadastros/Campos";
import type { Participante } from "@/lib/cadastrosStore";
import {
  chaveFicticia, competenciaDaData, formatarChave, limparPeriodo, loadDocs, moedaBR, novoDocId,
  primeiroDia, removeDoc, saveDoc, saveDocs, useDocsFiscais, valorBR,
  type DocFiscal, type DocSlug,
} from "@/lib/fiscalStore";
import type { DocTipo, GrupoMovimento, UF } from "@/lib/tributarioStore";
import { mensagemDeErro } from "@/lib/erros";

export type CampoDoc = {
  key: string;
  label: string;
  type?: "text" | "select" | "textarea" | "chave" | "participante";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  span?: 1 | 2;
  mono?: boolean;
  align?: "right";
  ajuda?: string;
  /** Dica de origem do dado (ex.: "vem do cadastro de participantes"). */
  origem?: string;
};

export type CrudDocumentosProps = {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  slug: DocSlug;
  prefixoId: string;
  labelNovo: string;
  /** rótulo do botão de importação simulada (XML/lote). */
  labelImportar?: string;
  campos: CampoDoc[];
  colunas: string[];
  /** campo usado como badge colorido na tabela (normalmente o status). */
  statusKey: string;
  /** valor considerado "concluído" para o campo de status. */
  statusOk: string;
  /** campo monetário usado nos totalizadores. */
  valorKey?: string;
  /** campo de data no formato dd/mm/aaaa — define a competência do documento. */
  dataKey: string;
  /** movimento de exemplo gerado para a competência corrente. */
  exemplo?: (competencia: string) => Record<string, string>[];
  indicadoresExtras?: (docs: DocFiscal[]) => { label: string; valor: string }[];
  /**
   * Campos repetidos no botão "Salvar e adicionar outro" (além da data, série,
   * natureza, CFOP, status e UF). Útil para lançar uma sequência de documentos
   * do mesmo tipo sem redigitar o cabeçalho.
   */
  repetir?: string[];
  dicas: string[];
};

export default function CrudDocumentosFiscais({
  titulo, descricao, icone: Icone, slug, prefixoId, labelNovo, labelImportar,
  campos, colunas, statusKey, statusOk, valorKey, dataKey, exemplo, indicadoresExtras, repetir, dicas,
}: CrudDocumentosProps) {
  const { empresa } = useEmpresaAtual();
  const { competencia, competenciasNoPeriodo } = useCompetencia();
  const docs = useDocsFiscais(slug, empresa?.id, competenciasNoPeriodo);

  const [query, setQuery] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const statusOptions = campos.find((c) => c.key === statusKey)?.options ?? [];
  const colunasDef = campos.filter((c) => colunas.includes(c.key));

  const filtered = useMemo(
    () =>
      docs
        .filter((d) => filtroStatus === "todos" || d[statusKey] === filtroStatus)
        .filter((d) =>
          campos.map((c) => d[c.key] ?? "").join(" ").toLowerCase().includes(query.toLowerCase()),
        ),
    [docs, query, filtroStatus, campos, statusKey],
  );

  const total = valorKey ? docs.reduce((s, d) => s + valorBR(d[valorKey]), 0) : 0;
  const pendentes = docs.filter((d) => d[statusKey] !== statusOk).length;

  const kpis = [
    { label: "Documentos", valor: String(docs.length) },
    ...(valorKey ? [{ label: "Valor total", valor: `R$ ${moedaBR(total)}` }] : []),
    { label: "Pendentes", valor: String(pendentes) },
    ...(indicadoresExtras?.(docs) ?? []),
  ].slice(0, 4);

  const exigeEmpresa = !empresa;

  /* ----- Herança do cadastro de participantes (nunca pedir duas vezes) ----- */
  const campoParticipante = campos.find(
    (c) => c.type === "participante" || c.key === "participante" || c.key === "emitente",
  );
  const PAPEL_POR_DOC: Partial<Record<DocSlug, PapelParticipante>> = {
    entradas: "Fornecedor",
    "servicos-tomados": "Fornecedor",
    transporte: "Transportadora",
    manifestacao: "Fornecedor",
    saidas: "Cliente",
    "servicos-prestados": "Cliente",
    cupons: "Cliente",
  };
  const papelParticipante = PAPEL_POR_DOC[slug] ?? "Todos";
  /** Campos que o cadastro do participante preenche quando existem no formulário. */
  const CHAVES_HERDADAS = ["cnpj", "uf", "ie"];
  const [participanteId, setParticipanteId] = useState<string | null>(null);

  const herdarParticipante = (p: Participante) => {
    setDraft((atual) => {
      const novo = { ...atual };
      if (campoParticipante) novo[campoParticipante.key] = p.nome;
      for (const c of campos) {
        if (CHAVES_HERDADAS.includes(c.key)) {
          novo[c.key] =
            c.key === "cnpj"
              ? p.documento ?? ""
              : c.key === "uf"
                ? p.uf ?? ""
                : p.ie ?? (p.indicadorIe === "Contribuinte isento" ? "ISENTO" : "");
        }
      }
      return novo;
    });
    setParticipanteId(p.id);
    toast.success(`Dados de ${p.nome} trazidos do cadastro.`, {
      description: "CNPJ, UF e IE vieram do cadastro de participantes.",
    });
  };

  const rascunhoNovo = () => {
    const base: Record<string, string> = {};
    campos.forEach((c) => {
      base[c.key] = c.type === "select" ? (c.options?.[0] ?? "") : "";
    });
    base[dataKey] = primeiroDia(competencia);
    if (campos.some((c) => c.type === "chave")) {
      const chaveField = campos.find((c) => c.type === "chave")!;
      base[chaveField.key] = chaveFicticia();
    }
    return base;
  };

  const abrirNovo = () => {
    setDraft(rascunhoNovo());
    setEditing(false);
    setParticipanteId(null);
    setOpen(true);
  };

  const abrirEdicao = (d: DocFiscal) => {
    setDraft({ ...d });
    setEditing(true);
    setParticipanteId(null);
    setOpen(true);
  };

  /** Salvar e continuar lançando: repete o cabeçalho e zera o resto. */
  const REPETIDOS_PADRAO = [dataKey, "serie", "tipo", "cfop", "status", "uf", "municipio", "alienacao"];
  const continuarComCabecalho = () => {
    const proximo = rascunhoNovo();
    for (const k of [...REPETIDOS_PADRAO, ...(repetir ?? [])]) {
      if (draft[k] !== undefined && !CHAVES_HERDADAS.includes(k)) proximo[k] = draft[k];
    }
    setDraft(proximo);
    setEditing(false);
    setParticipanteId(null);
  };

  const salvar = (continuar = false) => {
    if (!empresa) return toast.error("Selecione uma empresa no cabeçalho.");
    const faltando = campos.filter((c) => c.required && !(draft[c.key] ?? "").trim());
    if (faltando.length) return toast.error(`Preencha: ${faltando.map((c) => c.label).join(", ")}`);
    // Campos alinhados à direita são numéricos (valores, bases, quantidades): texto livre virava NaN nos totais.
    const naoNumericos = campos.filter((c) => c.align === "right" && (draft[c.key] ?? "").trim() && parseNumeroBR(draft[c.key]) === null);
    if (naoNumericos.length) {
      return toast.error(`Valor inválido em: ${naoNumericos.map((c) => c.label).join(", ")} — use apenas números (ex.: 1.234,56)`);
    }
    if ((draft[dataKey] ?? "").trim() && !competenciaDaData(draft[dataKey])) {
      return toast.error("Data inválida — use o formato dd/mm/aaaa");
    }

    const comp = competenciaDaData(draft[dataKey]) || competencia;
    if (comp !== competencia) {
      toast.warning(
        `Documento registrado na competência ${formatCompetencia(comp)} — troque o período para visualizá-lo.`,
        { duration: 5000 }
      );
    }
    saveDoc(slug, {
      ...draft,
      id: draft.id || novoDocId(prefixoId),
      empresaId: empresa.id,
      competencia: comp,
    } as DocFiscal);
    if (continuar) {
      continuarComCabecalho();
      toast.success("Documento registrado — formulário aberto para o próximo.", {
        description: "A data e os dados do cabeçalho foram mantidos; ajuste o número e o valor.",
      });
    } else {
      setOpen(false);
      toast.success(editing ? "Documento atualizado." : "Documento registrado.");
    }
  };

  const alternarStatus = (d: DocFiscal) => {
    const proximo = d[statusKey] === statusOk ? (statusOptions.find((o) => o !== statusOk) ?? statusOk) : statusOk;
    saveDoc(slug, { ...d, [statusKey]: proximo });
    toast.success(`Documento marcado como "${proximo}".`);
  };

  const importarExemplo = () => {
    if (!empresa) return toast.error("Selecione uma empresa no cabeçalho.");
    if (!exemplo) return;
    const linhas = exemplo(competencia).map(
      (l) => ({ ...l, id: novoDocId(prefixoId), empresaId: empresa.id, competencia }) as DocFiscal,
    );
    saveDocs(slug, linhas);
    toast.success(`${linhas.length} documento(s) importado(s) para ${formatCompetencia(competencia)}.`);
  };

  /** Status da nota importada conforme o protocolo da SEFAZ — nunca "OK" para nota cancelada/denegada/sem protocolo. */
  const statusDaSituacao = (situacao: SituacaoNFe): string => {
    if (situacao === "autorizada") return statusOk;
    const acha = (re: RegExp) => statusOptions.find((o) => o !== statusOk && re.test(o));
    const qualquerNaoOk = statusOptions.find((o) => o !== statusOk) ?? "Pendente";
    if (situacao === "cancelada") return acha(/cancel/i) ?? acha(/rejeit/i) ?? qualquerNaoOk;
    if (situacao === "denegada") return acha(/deneg/i) ?? acha(/rejeit/i) ?? qualquerNaoOk;
    if (situacao === "rejeitada") return acha(/rejeit/i) ?? acha(/deneg/i) ?? qualquerNaoOk;
    return acha(/digita|pendente/i) ?? qualquerNaoOk; // sem protocolo
  };

  const processarXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresa) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const nfe = lerNFe(event.target?.result as string);

        // A nota precisa ser da empresa selecionada (antes, notas de terceiros entravam na empresa atual).
        const conf = conferirParticipacao(slug, empresa.cnpj, nfe);
        if (!conf.ok) throw new Error(conf.motivo);

        // Entradas, serviços tomados, transportes e manifestação: o participante é quem emitiu a nota.
        const participanteEhEmitente = ["entradas", "servicos-tomados", "transporte", "manifestacao"].includes(slug);
        const isEntrada = slug === "entradas";
        const participante = participanteEhEmitente ? nfe.emitente : nfe.destinatario;

        // Mesma nota importada de novo (antes: gerava um segundo documento e dobrava a receita).
        const daEmpresa = loadDocs(slug).filter((d) => d.empresaId === empresa.id);
        const jaExiste = nfe.chave
          ? daEmpresa.some((d) => (d.chave ?? "").replace(/\D/g, "") === nfe.chave)
          : daEmpresa.some(
              (d) => d.numero === nfe.numero && (d.serie || "1") === nfe.serie && (d.cnpj ?? "").replace(/\D/g, "") === participante.cnpj && valorBR(d.valor) === nfe.valorNF,
            );
        if (jaExiste) {
          toast.warning(`NF-e ${nfe.numero} já foi importada para esta empresa — arquivo ignorado.`, {
            duration: 6000,
            description: nfe.chave ? `Chave ${formatarChave(nfe.chave)}` : undefined,
          });
          return;
        }

        const dataFormatada = nfe.dataBR || primeiroDia(competencia);
        const { cfop: cfopEmitente, distintos } = cfopPrincipal(nfe.itens);
        const cfop = isEntrada ? cfopDeEntrada(cfopEmitente) : cfopEmitente;
        const chave = nfe.chave || chaveFicticia();
        const status = statusDaSituacao(nfe.situacao);

        const obs = [`Importado em ${new Date().toLocaleDateString("pt-BR")} — Chave: ${chave}`];
        if (isEntrada && cfop !== cfopEmitente) obs.push(`CFOP do emitente: ${cfopEmitente}`);
        if (distintos.length > 1) obs.push(`CFOPs da nota: ${distintos.map((d) => `${d.cfop} (R$ ${moedaBR(d.valor)})`).join(", ")}`);

        const novoDoc: DocFiscal = {
          id: novoDocId(prefixoId),
          empresaId: empresa.id,
          competencia: competenciaDaData(dataFormatada) || competencia,
          numero: nfe.numero || "0",
          serie: nfe.serie,
          chave,
          data: dataFormatada,
          participante: participante.nome || "Participante Desconhecido",
          cnpj: participante.cnpj,
          valor: moedaBR(nfe.valorNF),
          baseIcms: moedaBR(nfe.baseIcms),
          icms: moedaBR(nfe.valorIcms),
          cfop,
          tipo: nfe.naturezaOperacao || "Importação XML",
          status,
          observacao: obs.join(" · "),
        };

        // Salva no banco de dados fiscal
        saveDoc(slug, novoDoc);

        // Alimenta o cadastro único (Preparativos › Cadastros), como o ERP fará depois da integração:
        // o participante entra (ou é completado) e, nas notas emitidas pela empresa, os itens também.
        let resumoCadastros = "";
        if (nfe.situacao === "autorizada") {
          try {
            const { registrarParticipanteDaNFe, registrarProdutosDaNFe } = await import("@/lib/cadastrosStore");
            const papel = participanteEhEmitente ? "Fornecedor" : "Cliente";
            const r = registrarParticipanteDaNFe(participanteEhEmitente ? nfe.emitente : nfe.destinatario, papel);
            const novosItens = slug === "saidas" ? registrarProdutosDaNFe(nfe.itens) : 0;
            const partes: string[] = [];
            if (r?.criado) partes.push(`${papel === "Cliente" ? "cliente" : "fornecedor"} ${r.participante.nome} cadastrado`);
            else if (r?.alterado) partes.push(`cadastro de ${r.participante.nome} completado`);
            if (novosItens) partes.push(`${novosItens} produto(s) cadastrado(s)`);
            resumoCadastros = partes.join(" · ");
          } catch (cadErr) {
            console.warn("Erro ao alimentar os cadastros a partir do XML:", cadErr);
          }
        }

        // Integração com o módulo financeiro/tributário — só notas autorizadas entram no motor tributário.
        if ((slug === "entradas" || slug === "saidas") && nfe.situacao === "autorizada") {
          try {
            const { salvarDocumento, processarDocumento, novoId: novoIdTributario } = await import("@/lib/tributarioStore");

            const ufEmpresa = String(getEmpresa(empresa.id)?.raw?.uf ?? "").toUpperCase();
            const ufOrigem = (nfe.emitente.uf || ufEmpresa || "SP") as UF;
            const ufDestino = (nfe.destinatario.uf || ufEmpresa || ufOrigem) as UF;
            const itens = nfe.itens.map((it, i) => ({
              id: `item-${i + 1}`,
              descricao: it.descricao || `Item ${i + 1} da nota ${nfe.numero}`,
              tipo: "produto" as const,
              quantidade: it.quantidade,
              unitario: it.unitario,
              cfop: isEntrada ? cfopDeEntrada(it.cfop) : it.cfop,
              ncm: it.ncm,
              cst: it.cst || undefined,
              aliqIcms: it.aliqIcms,
            }));

            const docTributario = processarDocumento({
              id: novoIdTributario("xml"),
              empresaId: empresa.id,
              competencia: novoDoc.competencia,
              grupo: (isEntrada ? "demais" : "faturamento") as GrupoMovimento,
              tipo: (isEntrada ? "Nota de entrada" : "NF-e") as DocTipo,
              numero: novoDoc.numero,
              serie: novoDoc.serie,
              emissao: novoDoc.data.split("/").reverse().join("-"),
              participante: novoDoc.participante,
              participanteDoc: novoDoc.cnpj || "",
              ufOrigem,
              ufDestino,
              contribuinte: nfe.destinatario.contribuinteIcms,
              consumidorFinal: nfe.consumidorFinal,
              regime: empresa.regime || "Lucro Presumido",
              itens,
              valorProdutos: itens.reduce((t, it) => t + it.quantidade * it.unitario, 0),
              valorTotal: nfe.valorNF,
              status: "Autorizado",
              chave: novoDoc.chave,
              tributos: { icms: 0, icmsSt: 0, difal: 0, fcp: 0, ipi: 0, pis: 0, cofins: 0, iss: 0, irrf: 0, inss: 0, csll: 0, retencoes: 0, total: 0 },
              memoria: [],
              regrasAplicadas: ["Importação XML"],
              alertas: [],
              eventos: [{ id: "ev-1", data: new Date().toISOString(), usuario: usuarioAtual(), acao: "Importação XML" }],
            }, empresa.id);

            salvarDocumento(empresa.id, docTributario, "Importado via XML Fiscal");
          } catch (stErr) {
            console.warn("Erro ao integrar com tributarioStore:", stErr);
          }
        }

        // Avisos ao usuário: o que foi gravado e o que merece conferência
        const compNota = novoDoc.competencia;
        const avisos: string[] = [];
        if (nfe.situacao !== "autorizada") {
          const motivo = nfe.situacao === "sem-protocolo" ? "XML sem protocolo de autorização" : `protocolo informa cStat ${nfe.cStat}${nfe.xMotivo ? ` — ${nfe.xMotivo}` : ""}`;
          avisos.push(`Nota não autorizada (${motivo}): registrada como «${status}» e fora dos totais.`);
        }
        if (distintos.length > 1) avisos.push(`A nota tem ${distintos.length} CFOPs (${distintos.map((d) => d.cfop).join(", ")}): gravada com o de maior valor (${cfop}). Confira a segregação.`);
        if (compNota !== competencia) avisos.push(`Pertence à competência ${formatCompetencia(compNota)} — troque o período para visualizá-la.`);

        if (avisos.length) {
          toast.warning(`Nota ${novoDoc.numero} importada com ressalvas`, { duration: 9000, description: avisos.join(" ") });
        } else {
          toast.success(`Nota ${novoDoc.numero} importada com sucesso!`);
        }
        if (resumoCadastros) toast.info(`Cadastros atualizados: ${resumoCadastros}.`, { description: "Confira em Preparativos › Cadastros." });
      } catch (err) {
        console.error("XML Import Error:", err);
        toast.error(mensagemDeErro(err, "Falha ao processar XML: formato inválido."));
      }
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const limpar = () => {
    if (!empresa) return;
    if (!confirmarLimpeza(`TODOS os documentos de ${formatCompetencia(competencia)} desta empresa`, `${docs.length} documento(s) serão removidos. Esta ação não pode ser desfeita.`)) return;
    limparPeriodo(slug, empresa.id, competencia);
    toast.success("Documentos da competência removidos.");
  };

  const contexto = {
    tela: titulo,
    modulo: "Fiscal › Documentos fiscais",
    competencia: formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, cnpj: empresa.cnpj, regime: empresa.regime } : null,
    totalDocumentos: docs.length,
    pendentes,
    valorTotal: valorKey ? `R$ ${moedaBR(total)}` : undefined,
    documentos: docs.slice(0, 30),
    orientacoes: dicas,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-brand-orange/12 grid place-items-center shrink-0">
            <Icone className="h-5 w-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-display leading-tight">{titulo}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">{descricao}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Competência: <span className="text-brand-orange">{competenciasNoPeriodo.length > 1 ? `${formatCompetencia(competenciasNoPeriodo[0])} até ${formatCompetencia(competenciasNoPeriodo[competenciasNoPeriodo.length - 1])}` : formatCompetencia(competencia)}</span>
              {empresa ? <> · {empresa.razao}</> : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exemplo ? (
            <div className="relative group">
              <input
                type="file"
                accept=".xml"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[100] block"
                onChange={processarXml}
                title="Selecionar arquivo XML real"
              />
              <Button variant="outline" className="rounded-full">
                <FileUp className="h-4 w-4 mr-2" /> {labelImportar ?? "Importar XML"}
              </Button>
            </div>
          ) : null}
          <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-2" /> {labelNovo}
          </Button>
        </div>
      </div>

      <BlocoOrientacao />

      {exigeEmpresa ? (
        <Card className="rounded-xl shadow-card border-brand-orange/40">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Selecione uma empresa no cabeçalho para escriturar documentos fiscais.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="rounded-xl shadow-card">
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{k.label}</div>
              <div className="font-display text-2xl mt-1">{k.valor}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl shadow-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por documento, participante, chave…"
                className="pl-9 rounded-full"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[190px] rounded-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {statusOptions.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="rounded-full">{filtered.length} documento(s)</Badge>
            {docs.length ? (
              <Button variant="ghost" size="sm" className="rounded-full" onClick={limpar}>
                <Trash2 className="h-4 w-4 mr-2" /> Limpar competência
              </Button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted/30 grid place-items-center mx-auto mb-4">
                <Icone className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">
                Nenhum documento nesta competência. Importe um lote ou lance manualmente.
              </p>
              {competenciasNoPeriodo.length > 1 && (
                <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-2xl p-4 max-w-md mx-auto mt-4">
                  <p className="text-xs text-brand-orange leading-relaxed">
                    <strong>Dica de Período:</strong> Você está visualizando um intervalo de {competenciasNoPeriodo.length} meses. 
                    Se importou uma nota e ela não aparece aqui, verifique se a data da nota está entre 
                    <strong> {formatCompetencia(competenciasNoPeriodo[0])}</strong> e 
                    <strong> {formatCompetencia(competenciasNoPeriodo[competenciasNoPeriodo.length - 1])}</strong>.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Nenhum documento nesta competência. Importe um lote ou lance manualmente.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {exemplo ? (
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".xml"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={processarXml}
                    />
                    <Button variant="outline" className="rounded-full">
                      <Download className="h-4 w-4 mr-2" /> {labelImportar ?? "Importar XML"}
                    </Button>
                  </div>
                ) : null}
                <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
                  <Plus className="h-4 w-4 mr-2" /> {labelNovo}
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {colunasDef.map((c) => (
                      <TableHead key={c.key} className={c.align === "right" ? "text-right" : undefined}>
                        {c.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.id}>
                      {colunasDef.map((c) => (
                        <TableCell
                          key={c.key}
                          className={[
                            c.mono || c.type === "chave" ? "font-mono text-xs" : "",
                            c.align === "right" ? "text-right" : "",
                          ].join(" ").trim() || undefined}
                        >
                          {c.key === statusKey ? (
                            <Badge
                              variant="secondary"
                              className={
                                d[c.key] === statusOk
                                  ? "rounded-full bg-success/15 text-success"
                                  : "rounded-lg bg-brand-orange/15 text-brand-orange"
                              }
                            >
                              {d[c.key] || "—"}
                            </Badge>
                          ) : c.type === "chave" ? (
                            <span title={d[c.key]}>{formatarChave(d[c.key]).slice(0, 24)}…</span>
                          ) : (
                            d[c.key] || "—"
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => alternarStatus(d)}
                          aria-label="Alternar status"
                        >
                          <CheckCircle2
                            className={`h-4 w-4 ${d[statusKey] === statusOk ? "text-success" : "text-muted-foreground"}`}
                          />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => abrirEdicao(d)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => { if (!confirmarExclusao("este documento")) return; removeDoc(slug, d.id); toast.success("Documento removido."); }}
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-card">
        <CardContent className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Como usar esta tela
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
            {dicas.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar documento" : labelNovo}</DialogTitle>
          </DialogHeader>
          <AssistenteCampos titulo={titulo} campos={campos} draft={draft} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campos.map((c) => {
              const ehParticipante = campoParticipante?.key === c.key;
              const herdado = Boolean(participanteId) && CHAVES_HERDADAS.includes(c.key);
              // Rótulo ligado ao campo: clicar no rótulo foca o campo e o leitor de tela o anuncia.
              const idCampo = `doc-${slug}-${c.key}`;
              return (
                <div key={c.key} className={c.span === 2 ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                  <Label htmlFor={idCampo}>{c.label}{c.required ? " *" : ""}</Label>
                  {c.type === "select" ? (
                    <Select value={draft[c.key] ?? ""} onValueChange={(v) => setDraft((s) => ({ ...s, [c.key]: v }))}>
                      <SelectTrigger id={idCampo} aria-label={c.label}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(c.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : c.type === "textarea" ? (
                    <Textarea
                      id={idCampo}
                      value={draft[c.key] ?? ""}
                      placeholder={c.placeholder}
                      onChange={(e) => setDraft((s) => ({ ...s, [c.key]: e.target.value }))}
                    />
                  ) : ehParticipante ? (
                    <div className="flex gap-2">
                      <Input
                        id={idCampo}
                        value={draft[c.key] ?? ""}
                        placeholder={c.placeholder ?? "Digite ou escolha no cadastro"}
                        onChange={(e) => {
                          setDraft((s) => ({ ...s, [c.key]: e.target.value }));
                          setParticipanteId(null); // voltou a digitar: deixa de estar vinculado ao cadastro
                        }}
                      />
                      <SeletorParticipante
                        papel={papelParticipante}
                        selecionadoId={participanteId}
                        onEscolher={herdarParticipante}
                      />
                    </div>
                  ) : (
                    <Input
                      id={idCampo}
                      value={draft[c.key] ?? ""}
                      placeholder={c.placeholder}
                      readOnly={herdado}
                      className={[
                        c.type === "chave" || c.mono ? "font-mono text-xs" : "",
                        herdado ? "bg-muted/50" : "",
                      ].join(" ").trim() || undefined}
                      onChange={(e) => setDraft((s) => ({ ...s, [c.key]: e.target.value }))}
                    />
                  )}
                  {c.ajuda ? <p className="text-xs text-muted-foreground">{c.ajuda}</p> : null}
                  {c.origem && !herdado ? <OrigemCampo>{c.origem}</OrigemCampo> : null}
                  {ehParticipante && participanteId ? (
                    <OrigemCampo>
                      CNPJ, UF e IE vieram do cadastro de participantes — altere lá para valer em todos os documentos.
                    </OrigemCampo>
                  ) : null}
                  {ehParticipante && !participanteId && !c.ajuda ? (
                    <p className="text-xs text-muted-foreground">
                      Escolha no cadastro para trazer CNPJ, UF e IE sem digitar de novo.
                    </p>
                  ) : null}
                  {herdado ? <OrigemCampo>Preenchido pelo cadastro do participante.</OrigemCampo> : null}
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancelar</Button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!editing ? (
                <Button variant="outline" className="rounded-lg" onClick={() => salvar(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Salvar e adicionar outro
                </Button>
              ) : null}
              <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={() => salvar(false)}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssistenteFechamento
        contexto={contexto}
        resumo={`${titulo} · ${formatCompetencia(competencia)}`}
        rotulo="IA ajudante"
      />
    </div>
  );
}
