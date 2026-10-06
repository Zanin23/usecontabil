# Validação completa de rotas, telas e fluxos — Use Contábil

**Data:** 06/10/2026
**Ambiente:** navegador simulado (jsdom) com o **backend Supabase falso** (`src/test/supabaseFalso.ts`) — nenhuma chamada ao projeto real do `.env`.
**Escopo:** executar o sistema de ponta a ponta — percorrer as rotas, abrir as telas, **preencher cadastros**, **gerar documentos** (notas, livros, apuração, SPED, ECD, relatórios, guias), **alterar dados já gravados**, conferir o reflexo nas telas seguintes e **corrigir tudo que a validação apontou**.

## Resultado executivo

| Bateria | Antes | Depois das correções |
|---|---|---|
| Varredura de rotas/telas (`npm run validar:telas`) | 177 telas · **20 avisos** · 0 falhas | **172 telas · 0 avisos · 0 falhas** (~29 s) |
| Fluxos funcionais (`src/test/validacaoFluxos.test.tsx`) | 11/13 | **17/17** |
| Suíte completa (`npm test`) | 322 testes | **342 testes aprovados** · 15 ignorados (varredura opt-in) |
| Lint (`npm run lint`) | **68 erros** + 35 avisos | **0 erros** + 18 avisos estruturais |
| Tipos (`npx tsc --noEmit -p tsconfig.app.json`) | limpo | limpo |
| Build (`npm run build`) | ok | ok (só o aviso de chunk > 500 kB) |

**Fechamento:** nenhuma tela fica em branco, sem título ou em 404 indevido nas 172 rotas validadas; nenhum fluxo de cadastro, documento, apuração, obrigação ou relatório falha; e os defeitos reais encontrados no caminho foram corrigidos (tabela abaixo).

## Defeitos reais encontrados e corrigidos

| # | Defeito | Onde | Correção |
|---|---|---|---|
| 1 | **"Editar Empresa" abria em branco**: com `raw` parcial (registro vindo da nuvem/ERP), CNPJ, Razão Social, IE, IM e Nome Fantasia apareciam vazios — só os campos presentes no `raw` eram preenchidos | `src/pages/contabil/EmpresaCadastro.tsx` | O formulário parte dos campos canônicos do registro (`cnpj`, `razao`…) e só é sobreposto por valores **preenchidos** do `raw` |
| 2 | **Rota inexistente de 1–3 segmentos caía em tela sem título** (`/qualquer-coisa` → "Área não encontrada." sem `h1` e sem caminho de volta); o `path="*"` da raiz nunca era alcançado | `AreaPage.tsx`, `CategoryPage.tsx`, `ModulePage.tsx`, `NotFound.tsx` | Área, categoria ou módulo inexistente mostram a **404 do sistema**, agora em português, com o caminho digitado e link de volta; coberto por dois testes negativos (1 e 4 segmentos) |
| 3 | **Campos sem rótulo acessível** nas telas de dados da empresa: `Label` sem `htmlFor`, `Select` sem nome acessível | `src/components/contabil/CrudEmpresa.tsx` | `useId()` + `htmlFor` por campo e `aria-label` nos `Select`; obrigatórios avisam em `toast.error("Preencha: …")` |
| 4 | **28 CNPJs de demonstração com dígito verificador inválido** (47 ocorrências em 9 arquivos). Como o sistema valida o DV, copiar esses documentos para um cadastro real era recusado — no próprio harness, participantes com CNPJ inválido **sumiam silenciosamente** | `fiscalDocMocks.ts`, `seedConfeccao.ts`, `tributarioStore.ts`, `comprasStore.ts`, `contratosStore.ts`, `aprendizado/*`, `contabilNav.tsx` | CNPJs recalculados para DV válido, mantendo o mesmo número-base em todos os arquivos |
| 5 | **Tela que estoura na renderização derrubava o sistema inteiro**: `/aprender/pratica` lançava `TypeError: scrollRef.current?.scrollTo is not a function` e a árvore React sumia (tela branca, sem menu) | `src/components/ErrorBoundary.tsx` (novo), `App.tsx`, `ContabilShell.tsx`, `AssistenteCampos.tsx`, `AssistenteFechamento.tsx` | Barreira de erro no shell e na raiz (aviso + motivo + "Tentar de novo" + "Voltar ao painel") e chamada `scrollTo?.()`; o *shim* que existia só no teste foi removido e a varredura continua passando |
| 6 | **`Parcelamento` sem tipo escondia tela quebrada**: `Fiscal › Guias › Parcelamentos` lê `tipo`, `orgao`, `processo`, `tributos`, `adesao`, `historico` e `d.parcelas` — nada disso existia no store (era `any`), então a tela quebraria ao renderizar o primeiro parcelamento | `src/lib/guiasStore.ts` | Tipos `Parcelamento`, `ParcelaParcelamento` e `ResumoParcelamentos` de verdade, com `detalharParcelamento` tipado |
| 7 | **Closure velha no seletor de empresa**: o `refresh` do provider comparava com um `empresaId` capturado na montagem, então a seleção podia não voltar ao valor salvo | `src/lib/empresaAtual.tsx` | Comparação via updater (`setEmpresaIdState((atual) => …)`) — sem listener recriado a cada troca |
| 8 | **Atalhos de teclado da apresentação** liam estado por closure (`next`/`prev` com `useEffect` dependente só de `current`) | `src/components/contabil/ApresentacaoSistema.tsx` | Posição atual em `ref`; dependências completas |
| 9 | Outros ajustes que o lint expôs: bloco morto no `Dashboard` (que forçava dependências fantasma), `raw` instável no `EmpresaDados`, expressão solta no `conciliacaoStore`, `let timer` no `previewAuthStorage`, listas de empresas do modo prática sem tipo | `Dashboard.tsx`, `EmpresaDados.tsx`, `conciliacaoStore.ts`, `previewAuthStorage.ts`, `praticaStore.ts`, `empresasStore.ts` | Corrigidos na origem (ver seção de lint) |

## O que foi validado e funciona

| Área | Fluxo executado | Evidência |
|---|---|---|
| Configuração | Inscrições, certificados, parâmetros e pagamentos: cadastrar, ver a validação de obrigatórios, alterar e excluir com confirmação pela tela | 4 testes |
| Cadastros | Produto (exige `Tipo = Produto` para NCM), correção de validação, alteração e exclusão; cliente herdado alterado com reflexo na lista | 2 testes |
| Contábil | Centros de custo, históricos e diário: CRUD completo, recusa de código repetido e lançamento com partidas e totais | 3 testes |
| Fiscal — documentos | Nota de saída lançada **pela tela** entra no livro de saídas (5102 · R$ 3.200,00 · ICMS 576,00) | 1 teste |
| Fiscal — apuração | Livro de entradas (1102 · R$ 1.000,00 · ICMS 120,00) + saídas ⇒ apuração `ICMS próprio`: débito 576,00, crédito 120,00, **a recolher 456,00** | 1 teste |
| Fiscal — obrigações | SPED bloqueia sem contador/certificado/inventário (GER-002, GER-003, EFD-301/302, DOC-100) e **gera o arquivo** quando os requisitos existem | 1 teste |
| Obrigações — ECD | Gera o TXT (`linhas > 0`), assina (`Assinada`), valida no PVA (0 erros), transmite e conclui com protocolo e recibo (`Transmitida`) | 1 teste |
| Relatórios | Balancete fecha (**débitos = créditos = R$ 1.250,50**) com a conta `3.1.01.001`; Diário lista o lançamento; Razão monta o movimento; DRE abre com comparativo | 2 testes |
| Fechamento | Encerrar a competência impede novo lançamento no período fechado | 1 teste |
| Preparativos | Alterar a **Razão Social** pela tela e reabrir: o valor persiste e vale para as outras telas | 1 teste |
| Resiliência | A barreira de erro mostra aviso, motivo e caminho de volta; filhos saudáveis seguem renderizando | 2 testes |
| Rotas e telas | 172 rotas montadas do zero (menu 01–10, áreas/categorias clássicas, catálogo de telas, visões gerais, domínios administrativos e rotas especiais): todas com `h1`, sem tela em branco, sem erro de JS e sem cair no gate de acesso | varredura |

## Títulos de menu × tela: de 20 divergências para 0

Cada divergência era cosmética, mas atrapalhava orientação e busca. O nome do **item de menu** passou a ser o nome da tela (ou o contrário, quando o `h1` era mais claro), sempre preservando o vocabulário do sistema:

| Rota | Antes (menu × `h1`) | Agora |
|---|---|---|
| `/dashboard` | Dashboard × Visão geral contábil | Visão geral contábil |
| `/preparativos/cadastros/resumo-classe-atividades` | Resumo por atividade × Resumo classe de atividades | Resumo por classe de atividades |
| `/administrativo/patrimonio/bens` | Patrimônio × Bens do imobilizado | Bens do imobilizado |
| `/administrativo/contratos/contratos` | Contratos e documentos × Contratos | Contratos |
| `/administrativo/auditoria` | Auditoria cadastral × Auditoria de cadastros. | Auditoria cadastral |
| `/fiscal/apuracoes` | Painel de apurações × Apurações automatizadas | Painel de apurações |
| `/fiscal/guias` | Painel de guias · Guias e recolhimentos × Guias e Tributos | Painel de guias (um rótulo para a mesma rota) |
| `/fiscal/guias/estaduais` | Guias estaduais × ESTADUAIS | Guias estaduais |
| `/fiscal/obrigacoes` | Painel de obrigações × Obrigações acessórias | Painel de obrigações |
| `/fiscal/obrigacoes/ecd-ecf` | ECD / ECF × ECD e ECF | ECD e ECF |
| `/fiscal/auditoria` | Painel de auditoria × Auditoria fiscal | Painel de auditoria |
| `/fiscal/auditoria/classificacao` | Classificação fiscal × Divergências de NCM / CST / CFOP | Classificação fiscal (com a divergência na descrição) |
| `/fiscal/auditoria/regras` | Regras de auditoria × Motor de regras | Regras de auditoria |
| `/financeiro/tabelas/ajuste-apuracao` | Ajustes de apuração × Ajuste de apuração | Ajustes de apuração |
| `/financeiro/tabelas/ajuste-documento-fiscal` | Ajustes de documento fiscal × Ajuste de documento fiscal | Ajustes de documento fiscal |
| `/financeiro/tabelas/apuracao-pis-cofins` | Apuração de PIS/COFINS × Apuração de PIS e COFINS | Apuração de PIS e COFINS |
| `/financeiro/tributacao/dashboard-executivo` | Painel tributário × Dashboard executivo | Painel tributário |
| `/aprender` | Central × Aprenda o sistema e a contabilidade por trás dele. | Central de aprendizado |
| `/visao-geral` | Catálogo de telas × Todas as telas | Catálogo de telas |

O harness também deixou de validar duas vezes a mesma URL (catálogo clássico × menu), que era o que gerava expectativas conflitantes de título para `/fiscal/guias` e `/dashboard`. Por isso a varredura baixou de 177 para **172 telas** — as cinco a menos eram duplicatas da mesma rota.

## Lint: de 68 erros para 0

Os 66 `no-explicit-any` foram trocados por tipos de verdade — e, no caminho, apareceram os defeitos 6 a 9 acima. Resumo do que foi feito:

- **`catch (e: any)`** (≈20 ocorrências) → novo helper `mensagemDeErro(e: unknown, padrao)` em `src/lib/erros.ts`; nenhum `catch` acessa `.message` sem checagem.
- **`raw` da empresa** (`empresasStore`) → `EmpresaRaw` (JSON estrito) + helper `classeAtividadeIdDe(raw)`, usado pelas telas de classe de atividade.
- **Documentos do gerador de dados de treino** → tipo `DocTreino` e dois conversores explícitos: `paraDocFiscal` (store operacional, tudo texto) e `paraDocumentoTributario` (store tributário, completa os campos exigidos pelo motor: itens, tributos, memória, eventos).
- **UI**: `icon: LucideIcon` (em vez de `any`) nas abas do cadastro e na apresentação; tipos do recharts para o tooltip do dashboard; `Array<Record<string, string | number>>` para as prévias.
- **`guiasStore`**: `Parcelamento`, `ParcelaParcelamento` e `ResumoParcelamentos` tipados (stubs `renegociar`/`salvarParcelamento` com assinatura correta).
- **`praticaStore`**: `EmpresaPratica` + normalização para `EmpresaRecord` em `empresasStore` (antes a lista do modo prática entrava como `any`).
- **Outros**: `setConfig(cfg: Partial<ConfigApuracao>)` no `apuracaoStore`, `prefer-const` no `previewAuthStorage`, expressão solta resolvida no `conciliacaoStore`, tipos `Baixa`/`MovimentoCaixa` na leitura do `localStorage`, `UF`/`GrupoMovimento`/`DocTipo` no importador de XML.
- **Avisos de `exhaustive-deps` intencionais** (dependência `tick`/`estado`/`execucoes` que força recálculo quando um store avisa): anotados com `eslint-disable-next-line` **e o motivo**; os que indicavam risco real (closure velha, dependência faltando) foram corrigidos na origem, não silenciados.
- **Restam 18 avisos** de `react-refresh/only-export-components` (arquivos que exportam componentes e constantes juntos, ex.: providers em `.tsx` e o design system) — estruturais, não afetam comportamento; resolver exige dividir arquivos.

## Validações negativas

- `/rota-que-nao-existe-em-2026` → **"Página não encontrada"** com o caminho e link de volta.
- `/rota/que/nao/existe-em-2026` → idem (4 segmentos chegam ao `path="*"`).
- SPED sem requisitos → não gera arquivo e explica os erros na aba Validações (cada erro traz o destino da correção).
- Lançamento em competência encerrada → recusado com mensagem de período encerrado.
- Cadastro com obrigatório vazio → `toast.error("Preencha: …")` em vez de gravar.
- Tela que estoura → aviso da barreira de erro, sem derrubar o menu.

## Cobertura por teste (o que protege esta validação)

- `src/test/validacaoRotasTelas.test.tsx` — varredura de 172 rotas (opt-in, `npm run validar:telas`), com relatório JSON e testes negativos.
- `src/test/validacaoFluxos.test.tsx` — 17 fluxos funcionais (cadastros, documentos, escrituração, apuração, SPED, ECD, relatórios, fechamento e cadastro mestre).
- `src/test/barreiraDeErro.test.tsx` — a barreira de erro mostra aviso/motivo/volta e não interfere no caminho feliz.
- `src/test/validacaoSmoke.test.tsx` — o App inteiro monta no painel da competência dentro do `npm test`.
- `src/test/validacaoAmbiente.ts` — ambiente compartilhado (base, operacional e completo, com contador/certificado/filial).

## Evidência

- Relatório bruto da varredura (172 registros): **`validacao/uc-rotas.json`**.
- Comandos: `npm run validar:telas`, `npx vitest run src/test/validacaoFluxos.test.tsx`, `npm test`, `npm run lint`, `npm run build`, `npx tsc --noEmit -p tsconfig.app.json`.

## Limites desta rodada

- A validação roda em **navegador simulado** com **backend falso**: cobre lógica, telas e persistência no `localStorage`, mas não cobre rede real, sessão real, transmissão a órgãos oficiais nem desempenho no navegador.
- Dados fiscais, protocolos e recibos são **fictícios** — nenhuma integração com Receita, SEFAZ ou prefeitura é exercitada.
- Telas alcançáveis apenas por parâmetros específicos (um `:id` inexistente, por exemplo) são cobertas pelos testes negativos, não pela varredura.
- Os 18 avisos de `react-refresh` e o aviso de chunk grande no build seguem abertos (não afetam comportamento).
