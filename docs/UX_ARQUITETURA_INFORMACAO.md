# UX e arquitetura de informação — análise e reorganização

**Data:** 05/10/2026
**Base:** Use Contábil v2.4 (branch `arena/01a10c78-usecontabil`, a partir de `3160cb8`)
**Objetivo:** tornar o sistema intuitivo para quem nunca o usou, deixando explícito
**“o que preciso cadastrar?” → “onde cadastro?” → “o que isso alimenta?” → “qual é o próximo passo?”**
sem remover funcionalidades, sem mudar regras de negócio e sem mexer em dados.

> Este documento é a **análise** (feita antes das alterações) somada ao **mapa de
> dependências** e ao **registro do que mudou**. A análise foi levantada lendo o código
> real: rotas em `src/App.tsx`, os dois modelos de navegação
> (`src/lib/contabilNav.tsx` e `src/lib/contabilNavAreas.tsx`), os 38 arquivos de
> página, os componentes de CRUD compartilhados e os ~35 stores de domínio em `src/lib`.

---

## 1. Inventário do que existe

| Item | Quantidade | Onde |
|---|---|---|
| Rotas declaradas | 110 | `src/App.tsx` |
| Módulos no modelo de navegação antigo | 68 | `contabilNav.tsx` + `contabilNavAreas.tsx` |
| Itens de navegação no novo menu por processo | 102 | `src/lib/ux/navModelo.ts` |
| Arquivos de tela | 38 | `src/pages/contabil/**` |
| Stores de domínio | ~35 | `src/lib/*Store.ts` |
| Componentes de CRUD genéricos | 4 | `CrudDocumentosFiscais`, `CrudEscrituracao`, `CrudTabelaFinanceiro`, `CadastroAnaliticoView` |
| Páginas que reutilizam esses CRUDs | ~30 | Fiscal, Financeiro, Administrativo |
| Requisitos (cadastros/configurações) catalogados | 20 | `src/lib/ux/requisitos.ts` |
| Telas com ficha explicativa própria | 39 | `src/lib/ux/telas.ts` |
| Etapas do fluxo guiado | 14 | `src/lib/ux/fluxo.ts` |

### Áreas e menus (estado anterior)

O menu lateral era organizado por **área → categoria → módulo**:

```
01 Dashboard   02 Preparativos   03 Fiscal   04 Contábil
05 Financeiro  06 Administrativo 07 Aprender  SN Simples & MEI
```

Cada área abria com “Visão geral” + as categorias (2 a 4 por área), e cada categoria
listava os módulos. Funcionava para quem já conhecia o sistema; não comunicava ordem
nem dependência — “Preparativos” e “Fiscal” tinham o mesmo peso visual para quem
chegava agora.

### Como as telas realmente se relacionam (fluxo de dados verificado no código)

1. **Cadastros** (`cadastrosStore`, `planoContasStore`, `empresasStore`, `filiaisStore`)
   são as raízes.
2. **Documentos fiscais** (`fiscalStore`, com `CrudDocumentosFiscais`) são a origem dos
   livros (`escrituracaoStore.gerarLivroEntradas/gerarLivroSaidas`) e das apurações
   (`apuracaoStore.apurar`).
3. **Apurações** geram **guias** (`guiasStore`) e alimentam **obrigações**
   (`obrigacoesStore.gerarObrigacao`).
4. **Lançamentos contábeis** (`lancamentosStore`) geram **balancete, razão e diário** e a
   **DRE** (`dreStore`).
5. **Conciliação** (`conciliacaoStore`) cruza extrato × contabilidade × guias pagas.
6. O **fechamento** (`gestaoStore`) depende de tudo isso e é o que bloqueia a
   competência.

---

## 2. Diagnóstico — problemas encontrados

### 2.1 Navegação e organização

| # | Problema | Evidência |
|---|---|---|
| 1 | Menu sem lógica de processo: “Preparativos”, “Fiscal”, “Financeiro” e “Administrativo” se sobrepunham na prática (documentos em Fiscal, cadastros que os alimentam em Preparativos, tabelas em Financeiro). | `contabilNav.tsx` vs. `App.tsx`: as rotas de cadastro vivem sob `/preparativos` mas são usadas por telas de `/fiscal`. |
| 2 | Dois níveis de profundidade antes de chegar a uma tela (área → categoria → módulo), com “Visão geral” repetindo a função de hub. | `AreaPage.tsx`, `CategoryPage.tsx`, `ModulePage.tsx`. |
| 3 | Cadastros duplicados já corrigidos parcialmente antes desta revisão: `Financeiro › Cadastros` redireciona para `Preparativos › Cadastros` (herança visível em `App.tsx`). | Rotas `/financeiro/cadastros/*` → `Navigate`. |
| 4 | Telas com função parecida espalhadas: “Centros de custo” existem em **Contábil › Cadastros** e em **Administrativo › Controles**; “Dashboard executivo” existe em Financeiro › Tributação e em Administrativo. | `contabilNav.tsx` (`administrativo/controles/centros-custo`) e `financeiro/tributacao/dashboard-executivo`. |
| 5 | Menu não indicava dependência: nenhuma tela avisava que precisava de cadastro anterior. | Nenhum componente de bloqueio existia (`grep` por “pendente” nas telas não retornava verificação de dependência). |

### 2.2 Entendimento da tela

| # | Problema | Evidência |
|---|---|---|
| 6 | Não havia indicação de “o que isso alimenta” nem “de onde vêm os dados”. | Cabeçalhos (`PageHeader`, `CabecalhoPagina`) tinham descrição, mas nada de origem/destino. |
| 7 | Tela sem dados mostrava apenas lista vazia ou “Selecione uma empresa”. | `ModulePage.tsx` (tabela vazia), `CrudDocumentosFiscais.tsx` (“Selecione uma empresa…”). |
| 8 | Documentação rica existia **fora** da interface: `documentacaoSistema.ts` (PDF para admin), `lib/aprendizado/conteudo.ts` (lições por rota) e o painel de IA “Entender esta tela”. | O usuário precisava abrir um PDF ou um chat para saber o básico. |

### 2.3 Formulários

| # | Problema | Evidência |
|---|---|---|
| 9 | Obrigatório/opcional aparecia só como `*` vermelho nos campos que usavam `Campo` — e várias telas usavam `<Input>` direto, sem rótulo padronizado. | `contabil/cadastros/Campos.tsx` (`obrigatorio ? "*"`) vs. formulários com `Label + Input` soltos. |
| 10 | Campos repetidos entre telas sem herança: UF, município, documento do participante e centro de custo eram redigitados. | `CrudDocumentosFiscais` (CNPJ do destinatário digitado, mesmo com o participante cadastrado). |
| 11 | Nenhuma indicação de onde o valor veio (XML, cadastro, cálculo). | Somente `AssistenteCampos` (texto de ajuda por campo). |
| 12 | Sem contagem de pendências do próprio formulário ao salvar. | `ListaErros` mostrava a lista, mas não “quantos obrigatórios faltam”. |

### 2.4 Processos com começo, meio e fim

| # | Problema | Evidência |
|---|---|---|
| 13 | Após salvar um cadastro, o usuário voltava para a lista sem sugestão de próximo passo. | `Participantes.tsx` (`toast.success` + `setAberto(false)`). |
| 14 | Nenhum rastro de “você veio de outra tela para resolver isto”. | Não existia parâmetro `voltar`. |
| 15 | Dashboard só com números: sem pendências, sem cadastros incompletos, sem próximas tarefas, sem últimas atividades. | `Dashboard.tsx` (KPIs, gráficos, alertas fiscais). |
| 16 | Progresso de configuração existia parcialmente em `gestaoStore.pendenciasCadastro` e `resumoFases`, mas só dentro da tela de Gestão do fechamento. | `ServicosGestao.tsx`. |

### 2.5 O que já estava bom e foi preservado

- `gestaoStore.pendenciasCadastro()` e `resumoFases()`: motor de pendências e fases já correto.
- `documentacaoSistema.ts`: mapa de telas real (AREAS) usado para gerar o PDF.
- `aprendizado/conteudo.ts`: lições por rota (`licaoDaRota`), com `comoUsar`, `conceito` e `baseLegal`.
- `AjudaTela.tsx`: painel de IA contextual e `AssistenteCampos` por formulário.
- `PageHeader`/`CabecalhoPagina`, `StatusNuvem`, `confirmarExclusao`, `RegistrosSped` etc.
- Regras de negócio dos stores (partidas dobradas, competência encerrada, RLS, modo prática,
  “nada de reset automático” — protegido por `src/test/primeiroAcesso.test.tsx`).

---

## 3. Decisões de arquitetura da solução

1. **Não substituir o modelo antigo de navegação; sobrepor um modelo por processo.**
   `contabilNav.tsx` continua sendo a fonte das rotas `/:area/:categoria/:modulo`, do PDF
   de documentação e da busca. O novo `src/lib/ux/navModelo.ts` reorganiza **as mesmas
   rotas** na ordem de trabalho. Nenhuma rota foi alterada, renomeada ou removida.
2. **Uma fonte única de verdade para dependências.** `src/lib/ux/` concentra:
   - `contexto.ts` — retrato do sistema (somente leitura);
   - `requisitos.ts` — catálogo de “o que precisa existir antes” (20 requisitos);
   - `telas.ts` — fichas por tela (o que faz, por que, de onde vem, o que alimenta, próximo passo);
   - `fluxo.ts` — as 14 etapas do fluxo de trabalho, na ordem real;
   - `navModelo.ts` — menu por processo;
   - `useOrientacao.ts` — junta rota + retrato e responde às cinco perguntas.
3. **Nada de tela vazia:** dependência não atendida mostra o que falta, com botão que
   resolve e retorno automático (`?voltar=`).
4. **Orientação é derivada, nunca gravada.** Não há novo log nem flag: o progresso, as
   pendências e as atividades são calculados dos dados existentes (incluindo
   `criadoEm`/`atualizadoEm` das coleções e `data` dos lançamentos).
5. **Leitura sempre possível, bloqueio nunca definitivo.** O usuário pode escolher
   “Continuar mesmo assim” quando a pendência é recomendada.

---

## 4. Mapa de dependências

### 4.1 Correntes principais

```
CONTÁBIL
Empresa ──▶ Plano de contas ──▶ Centros de custo ──▶ Lançamentos ──▶ Balancete/Razão/Diário ──▶ DRE
                                        │                                   │
                                        └──────────▶ ECD/ECF ◀──────────────┘

FISCAL
Empresa ──▶ Clientes e fornecedores ──▶ Produtos e serviços ──▶ Documentos fiscais
                                                                       │
                              ┌────────────────────────────────────────┤
                              ▼                                        ▼
                    Livros (entradas/saídas)                    Apurações (PIS/COFINS, ISS,
                              │                                  IRPJ/CSLL, Simples, retenções)
                              ▼                                        │
                    Apuração ICMS/IPI                                   ▼
                              │                                     Guias (DARF, DAS, GNRE)
                              └──────────────▶ SPED/ECD/EFD ◀──────────┘
                                                       │
                                                       ▼
                                                  DCTFWeb/REINF

FINANCEIRO
Participantes ──▶ Contas a pagar/receber ──▶ Conciliação bancária ──▶ Fechamento da competência
                            │                        ▲
                            └──▶ Lançamentos ────────┘
```

### 4.2 Dependências declaradas por tela

| Tela | Depende de | Alimenta | Próximo passo |
|---|---|---|---|
| Preparativos › Empresas | — | Documentos, apurações, lançamentos, relatórios | Filiais → Parâmetros → Participantes |
| Preparativos › Filiais | Empresa | Documentos por unidade, patrimônio | Participantes → Documentos |
| Preparativos › Clientes e fornecedores | Empresa | Documentos, contas a pagar/receber, lançamentos, SPED | Produtos → Notas → Contas a pagar |
| Preparativos › Produtos e serviços | Empresa | Documentos, apurações, inventário, SPED | Notas de saída → Livro de saídas |
| Preparativos › Parâmetros | Empresa | Apurações, lançamentos, fechamento | Inscrições → Certificados |
| Contábil › Plano de contas | Empresa | Lançamentos, balancete, razão, diário, DRE, ECD | Centros de custo → Históricos → Lançamentos |
| Contábil › Lançamentos | Empresa, plano de contas | Balancete, razão, diário, DRE, ECD | Balancete → Razão → DRE |
| Contábil › Balancete | Empresa, plano de contas, lançamentos | DRE, ECD | Razão → Diário → DRE |
| Fiscal › Notas de entrada | Empresa, participantes | Livro de entradas, apurações, SPED | Livro de entradas → Apurações → Guias |
| Fiscal › Notas de saída | Empresa, participantes | Livro de saídas, apurações, contas a receber | Livro de saídas → Apurações |
| Fiscal › Serviços tomados/prestados | Empresa, participantes | ISS, retenções | Apurar ISS → Retenções |
| Fiscal › Livro de entradas/saídas | Empresa, documentos | Apuração ICMS/IPI, SPED | Apurar ICMS → Guias estaduais |
| Fiscal › Apuração ICMS/IPI | Empresa, documentos, escrituração | Guias estaduais, SPED | Emitir guia → SPED |
| Fiscal › Apurações | Empresa, regime, documentos | Guias, obrigações, fechamento | Guias → Obrigações |
| Fiscal › Guias | Empresa, documentos, apurações | Conciliação, fechamento | Conciliar → Encerrar |
| Fiscal › Obrigações | Empresa, documentos, escrituração | Fechamento | Agenda fiscal |
| Fiscal › Auditoria | Empresa, documentos, escrituração, apurações | Correções antes da entrega | Conciliação |
| Contábil › Fechamento (Gestão) | Empresa (e pendências de todas as fases) | Encerramentos | Encerrar competência |
| Contábil › Encerramentos | Empresa, lançamentos | Bloqueio da competência | Balancete final |
| Financeiro › Conciliação bancária | Empresa, plano de contas, lançamentos | Fechamento | Balancete → Encerramento |
| Financeiro › DRE | Empresa, plano de contas, lançamentos | Análise de resultado | Balancete |
| Administrativo › Contas a pagar/receber | Empresa, participantes | Fluxo de caixa, conciliação | Conciliação |
| Administrativo › Patrimônio | Empresa, plano de contas | Lançamentos (depreciação), CIAP | CIAP |
| Administrativo › Suprimentos | Empresa, participantes | Notas de entrada, contas a pagar | Lançar notas |
| Administrativo › Controles internos | — | Log de auditoria | Políticas e alçadas |
| Configuração › Usuários e permissões | — | Log de auditoria | Políticas e alçadas |
| Simples & MEI | Empresa | — | Receitas do MEI → Obrigações |

> A mesma tabela, com o **estado real** de cada requisito (cumprido/pendente), está
> dentro do sistema em **Início › Mapa do sistema** (`/mapa-sistema`).

### 4.3 Requisitos catalogados (20)

`empresa`, `empresa-cnpj`, `regime`, `unidade`, `atividade`, `parametros`, `inscricoes`,
`certificados`, `plano-contas`, `centros-custo`, `historicos`, `participantes`,
`produtos`, `documentos`, `lancamentos`, `titulos`, `escrituracao`, `apuracao`,
`conciliacao`, `guias`.

Cada um define: título, “o que é” (em uma linha), tela de destino, rótulo do botão,
nível (**crítico** bloqueia; **recomendado** apenas avisa), grupo, **o que alimenta**,
função de verificação e texto do que falta / do que já está pronto.

---

## 5. O que foi implementado

### 5.1 Menu por processo (`ContabilShell` + `lib/ux/navModelo.ts`)

Dez seções na ordem de trabalho (as rotas antigas continuam alcançáveis —
“Índice por área (visão clássica)” fica no fim de **Relatórios**):

```
01 Início ................. Dashboard · Mapa do sistema · Simples & MEI
02 Configuração .......... Empresas e unidades · Empresa selecionada (dados, inscrições,
                           parâmetros, certificados, pagamentos) · Acessos e regras
03 Cadastros ............. Clientes e fornecedores · Produtos e serviços · Plano de contas ·
                           Centros de custo · Históricos · Patrimônio · Contratos · Analíticos
04 Lançamentos ........... Documentos fiscais (7 telas) · Movimentos · Contabilidade ·
                           Financeiro (pagar, receber, caixa, fluxo, cobrança) · Suprimentos
05 Escrituração .......... Livros, apurações de ICMS/IPI, inventário, CIAP
06 Apuração e recolhimento  Apurações · Tabelas e motor · Guias · Obrigações acessórias
07 Conciliação e auditoria  Conciliação bancária, auditoria fiscal, cadastral, pesquisa
08 Relatórios ............ Contábeis (balancete, razão, diário) · Gerenciais (DRE, painéis)
09 Fechamento ............ Gestão, fases, tarefas, encerramentos
10 Aprender .............. Central, glossário, modo prática
```

Cada seção tem um resumo de uma linha; os itens carregam descrição curta (visível no
título do item e na busca `Ctrl+K`, que passou a agrupar por seção de processo).

### 5.2 Assistente de configuração e dashboard inteligente

- **`ConfiguracaoInicial`** — barra de progresso com as etapas essenciais
  (ex.: “4 de 7”), checklist completo e botão **“Continue de onde parou”**.
- **`PainelPendencias`** — semáforo com 🔴/🟡/🟢: documentos aguardando classificação,
  cadastros incompletos, guias em aberto, obrigações pendentes e o que já está em dia.
- **`TrilhaFluxo`** — a linha do ciclo (Cadastrar empresa → … → Conciliar) com o ponto
  atual destacado e cada etapa clicável.
- **`Atalhos`** — três atalhos dinâmicos (os próximos passos do ciclo) + ações frequentes.
- **`AtividadesRecentes`** — o que foi criado/alterado por último, derivado de
  `criadoEm`/`atualizadoEm`, datas dos documentos, lançamentos e log de auditoria.
- Dashboard reorganizado em torno disso, mantendo KPIs, gráficos, alertas fiscais e o
  resultado resumido (nada foi removido).

### 5.3 Contexto em cada tela (`BlocoOrientacao`)

Um único componente colocado no topo das telas reúne:

1. **`RetornoProcesso`** — faixa “você está aqui para cadastrar o plano de contas e depois
   volta para Lançamentos contábeis”, com o botão de retorno.
2. **`ContextoTela`** — painel recolhível com *o que esta tela faz*, *por que preciso
   preencher*, *o que precisa estar cadastrado antes* (selos com estado real),
   *de onde vêm os dados*, *o que esta tela alimenta* e *qual é o próximo passo*.
   Há um atalho para “Conceito, base legal e dúvidas” (mesmo painel de IA que já existia)
   e para o mapa do sistema.
3. **`BloqueioDependencias`** — quando falta algo crítico:

   > ⚠ Esta funcionalidade ainda não está pronta para uso
   > Antes de continuar, você precisa configurar: **Plano de contas com contas analíticas**
   > `[Abrir plano de contas →]`
   > *Também é recomendado configurar (2)…*

O botão leva à tela de solução **com a rota de origem** (`?voltar=/rota/original`), e ao
voltar o usuário cai no processo onde estava.

Telas com o bloco hoje: as 30 que usam os CRUDs compartilhados (documentos fiscais,
escrituração, tabelas de regime), os 5 hubs, as 8 telas contábeis, os cadastros de
participantes e produtos, contas/caixa, contratos, patrimônio, suprimentos, controles
internos, conciliação, filiais, encerramentos, DRE, gestão do fechamento, Simples & MEI
e todos os módulos genéricos (`ModulePage`).

### 5.4 Formulários

- `RotuloCampo`: obrigatório com `*` vermelho; **opcional** com etiqueta cinza. Ponto
  único, aplicado a `Campo`, `CampoTexto`, `CampoAreaTexto`, `CampoNumero`, `CampoSelecao`.
- `AjudaCampo`, `OrigemCampo` (“preenchido pelo XML…”, “vindo do cadastro…”) e
  `ResumoObrigatorios` (“2 de 7 campos obrigatórios pendentes”).
- Fluxos após salvar (`ProximosPassos`): ao concluir um cadastro, o sistema oferece as
  continuações naturais em vez de devolver o usuário para a lista.
  - **Cliente/fornecedor** → Adicionar endereço · Informar dados fiscais · Lançar nota ·
    Contas a pagar · Novo cadastro.
  - **Conta contábil** → Criar subconta (se sintética) · Fazer lançamento · Centro de
    custo · Completar com o plano modelo.
- Lista vazia em `ModulePage` deixou de ser uma tabela em branco: explica o que é
  preciso cadastrar e oferece o botão de criação.
- **Preenchimento automático onde o dado já existe**: em Clientes e fornecedores, o botão
  **“Buscar dados”** traz do CNPJ (BrasilAPI) razão social, nome fantasia, endereço, código
  IBGE e contato; no campo CEP, o botão **“Buscar”** completa logradouro, bairro, município
  e UF. O que o usuário já digitou é preservado, e a consulta é sempre opcional — sem
  internet, a digitação manual continua funcionando. As funções ficaram em
  `src/lib/consultaPublica.ts` (mesma fonte usada pelo cadastro de empresa, que antes tinha
  uma cópia local).
- **Herança do cadastro no documento fiscal** (`src/components/ux/SeletorParticipante.tsx`):
  o campo Fornecedor/Destinatário/Tomador/Prestador/Transportador/Emitente ganhou o botão
  **“Buscar no cadastro”**, que lista os participantes do papel da tela (nota de saída não
  sugere fornecedor). Ao escolher, o sistema preenche **CNPJ, UF e IE** e marca os campos
  como vindos do cadastro — não se digita de novo o que já existe. Se o cadastro estiver
  vazio, o próprio seletor leva para Preparativos › Cadastros › Participantes.
- **“Salvar e adicionar outro”** nos três CRUDs genéricos (documentos fiscais,
  escrituração e tabelas financeiras): grava o registro, mantém o diálogo aberto e repete
  o cabeçalho (data, série, natureza/CFOP, status, UF; nas tabelas, o anexo/contexto). O
  botão só aparece em inclusão — na edição continua apenas “Salvar”.
- **Rótulos ligados aos campos** (`htmlFor`/`id`) nos três CRUDs: clicar no rótulo foca o
  campo e o leitor de tela anuncia o nome — antes o texto do rótulo era solto ao lado.

### 5.5 Breadcrumbs e trilha

`PageHeader` (e portanto todas as telas que o usam) passou a derivar a trilha do modelo
por processo automaticamente — **seção › tela**, com o último item marcado como página
atual. Quem já passa `trail` continua com a trilha própria.

O antigo `cadastros/CabecalhoPagina` (usado por 8 telas de cadastros e contabilidade)
virou um **adaptador fino do `PageHeader`**: as telas continuam chamando o mesmo
componente, mas trilha, título, descrição e ações saem de um único lugar — o sistema tem
agora **um** padrão de cabeçalho, com o `StatusNuvem` preservado.

### 5.6 Mapa do sistema (`/mapa-sistema`)

Página nova (seção **Início**) que reúne, dentro do produto:

1. o fluxo “por onde começar” com status de cada etapa;
2. as três correntes de dependência (contábil, fiscal, financeira) com selo de quantos
   requisitos faltam em cada passo;
3. todas as telas agrupadas por seção, com “o que faz”, os requisitos (verdes/vermelhos,
   clicáveis) e “alimenta: …”.

### 5.7 Ferramentas de verificação

- `src/lib/consultaPublica.ts` — consulta de CNPJ/CEP (BrasilAPI) com falha tratada e
  mensagens claras; usada pelo cadastro de empresa e pelo cadastro de participantes.
- `npm run dev:preview` — sobe a interface com um **cliente de backend simulado**
  (`src/preview/supabaseLocal.ts`) para inspecionar a UX sem login e **sem tocar na base
  real**. Só existe nesse script: `vite.config.ts` aplica o alias quando `UC_PREVIEW=1`.
- Testes novos: `src/test/orientacao.test.ts` (24 casos), `src/test/uxGuiado.test.tsx`
  (12 casos), `src/test/uxTelas.test.tsx` (24 casos — fumaça das telas que receberam o
  bloco de orientação), `src/test/documentosFiscaisGuiado.test.tsx` (6 casos — herança do
  cadastro e “salvar e adicionar outro”) e `src/test/crudContinuarLancando.test.tsx`
  (2 casos). Total do projeto: **306 testes passando** (antes: 238).

---

## 6. O que não foi alterado (garantias)

| Item | Situação |
|---|---|
| Regras de negócio dos stores | Intocadas (nenhuma alteração em `*Store.ts` de domínio, exceto imports de constantes de leitura usados pelo novo contexto). |
| Rotas e URLs | Todas preservadas; nenhuma foi renomeada ou removida. `/mapa-sistema` foi adicionada. |
| Dados do usuário | Nada é gravado, migrado, apagado ou reescrito pelo mecanismo de orientação (há teste garantindo leitura sem escrita). |
| `contabilNav.tsx` | Mantido como fonte das rotas por área, do PDF de documentação e da busca. |
| Modo prática, RLS, `nuvemColecoes`, “sem reset automático” | Preservados; `primeiroAcesso.test.tsx` continua passando. |
| Painel de IA “Entender esta tela” | Continua existindo; o botão passou a se chamar “Conceito e dúvidas” para não conflitar com o painel determinístico de contexto — e o painel de contexto abre o mesmo conteúdo. |

---

## 7. Como validar

1. `npm ci && npm test` → 306 testes.
2. `npm run build` → build de produção sem erros.
3. `npm run dev:preview` → abrir e percorrer:
   - **Dashboard** com a base vazia: assistente de configuração, checklist e “continue de onde parou”.
   - **Mapa do sistema**: correntes, requisitos e estado de cada tela.
   - **Contábil › Lançamentos** sem plano de contas: bloqueio com botão para o plano.
   - Clicar em “Abrir plano de contas”: a tela mostra a faixa de retorno; salvar uma conta
     exibe “Próximas ações” e o botão volta para Lançamentos.
   - **Fiscal › Notas de entrada**: contexto com origem (participantes) e destino (livro de entradas).
   - **Clientes e fornecedores › Novo cadastro**: informar um CNPJ e usar “Buscar dados”
     preenche razão social e endereço; ao salvar, aparecem as próximas ações.
   - **Fiscal › Notas de saída › Nova nota**: “Buscar no cadastro” lista os clientes já
     cadastrados; escolher um preenche CNPJ/UF/IE; “Salvar e adicionar outro” grava e
     mantém o formulário aberto com a data e o CFOP repetidos.
   - Menu lateral: dez seções, com descrição e item ativo destacado.

---

## 8. Situação e próximos passos

### 8.1 Concluído na segunda rodada

1. **Herança de dados no formulário de documento fiscal** — seletor de participante
   (`SeletorParticipante`) que traz CNPJ, UF e IE do cadastro único; campos herdados ficam
   somente-leitura enquanto vinculados. Quando não há participante do papel exigido, o
   seletor aponta o cadastro (diagnóstico 2.3, item 10).
2. **“Salvar e adicionar outro”** nos três CRUDs genéricos, com repetição do cabeçalho.
3. **Cobertura de fichas de tela: 102/102 itens do menu** (eram 39). As 40 fichas novas
   cobrem configuração/controles, lançamentos financeiros, tabelas de tributação, IPI,
   CIAP, DIFAL, ST, DEFIS, dashboards, contratos, auditoria, fluxos de fechamento e a
   central Aprender. Rotas sem ficha escrita recebem contexto derivado do menu
   (`fichaDoMenu`), de modo que nenhuma tela cai mais no texto genérico.
4. **`CabecalhoPagina` legado virou adaptador do `PageHeader`** — um padrão de cabeçalho.
5. **Destino do `ModulePage` decidido**: é o renderizador **oficial** do “Índice por área
   (visão clássica)” (`/:area/:categoria/:modulo`) — nenhum módulo do modelo antigo foi
   removido. Ele já usa o `PageHeader`, recebeu o bloco de orientação e passou a mostrar a
   seção do processo a que o módulo pertence (badge com o código e o resumo da seção).

### 8.2 Continua recomendado (não feito)

1. **Filtro por seção no menu** quando a quantidade de itens crescer (hoje são 102).
2. **Levar o bloqueio para dentro do formulário** (não só na abertura da tela): hoje o
   aviso de dependências aparece no topo; o salvamento ainda valida apenas campo a campo.
3. **Revisar as telas que só existem no índice clássico** (módulos de exemplo do modelo
   antigo) para decidir, uma a uma, se merecem tela dedicada no fluxo por processo.
