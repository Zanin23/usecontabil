# Use Contábil

Central **contábil, fiscal e administrativa interna** de um grupo de empresas: cadastros, documentos fiscais, escrituração, apurações, obrigações acessórias, guias, conciliação, DRE e controles administrativos — com uma camada de aprendizado (trilhas, glossário e modo prática) construída sobre os mesmos motores.

> **Protótipo visual.** Não há integração real com Receita Federal, SEFAZ ou prefeituras. Documentos, guias e arquivos gerados são simulações para conferência e estudo, sem validade legal.
>
> Não é um sistema para escritórios de contabilidade que atendem clientes externos: no sistema, use *empresa*, *filial*, *unidade* e *grupo*.

## Áreas do sistema

| Área | O que tem |
|---|---|
| **Dashboard** | Visão geral contábil da empresa e da competência selecionadas. |
| **Preparativos** | Cadastro de empresas e filiais; **cadastro único de clientes e fornecedores e de produtos e serviços** (alimentado à mão, pela importação de XML de NF-e ou pelos cadastros antigos); classes de atividade; inscrições, pagamentos, parâmetros e certificados; gestão do fechamento (fases, tarefas e encerramentos). |
| **Fiscal** | Documentos fiscais, escrituração (livros, ICMS, IPI, inventário, CIAP), apurações (PIS/COFINS, ISS, IRPJ/CSLL, Simples Nacional, retenções), obrigações (SPED Fiscal, EFD-Contribuições, ECD/ECF, DCTFWeb, REINF, estaduais), guias e auditoria fiscal. |
| **Contábil** | Plano de contas do grupo (com modelo pronto, vínculo com o referencial da RFB e **importação por planilha CSV/Excel**), centros de custo, históricos padrão, **lançamentos em partidas dobradas** (estorno e bloqueio da competência encerrada), **balancete de abertura importado de planilha** (gera lançamento do tipo "Abertura"), balancete de verificação, razão e diário. |
| **Financeiro** | Tabelas por regime, movimentos, tributação (DIFAL, ST, DEFIS, motor tributário), conciliação bancária e DRE. |
| **Administrativo** | Contas e caixa, contratos e documentos, patrimônio, suprimentos, controles internos (usuários, perfis e permissões), auditoria cadastral, pesquisa global e dashboard executivo. |
| **Simples & MEI** | Fluxo simplificado: carteira de empresas desses regimes, faturamento informado manualmente, referência de receita do MEI e checklists/lembretes por período. Rotas: `/simples-mei`, `/simples-mei/empresas`, `/simples-mei/receitas` e `/simples-mei/obrigacoes`. |
| **Aprender** | Central de aprendizado (trilhas, lições e glossário) e **modo prática**, com dados fictícios. |

O seletor de **empresa** e o filtro de **competência** no cabeçalho são o contexto geral. A área **Simples & MEI** também oferece um filtro próprio para alternar entre todas as empresas elegíveis e uma empresa específica.

## Como rodar

Requisitos: Node 18+ (testado com Node 22).

```bash
npm ci          # instala exatamente o que está no package-lock.json
                # (alternativa: bun install — o bun.lock é o usado pelo Lovable)
npm run dev     # servidor de desenvolvimento em http://localhost:8080
npm run build   # build de produção
npm test        # testes (Vitest + Testing Library)
npm run lint    # ESLint (ainda acusa pendências antigas, principalmente `any` explícito)
```

> ⚠️ O arquivo `.env` (versionado) aponta para o backend **real** (Lovable Cloud / Supabase). Rodar localmente significa conversar com esse backend: use uma conta de teste e **não** use "Isolar dados" nem "Deletar tudo" com dados reais.

## Como os dados são guardados

| Onde | O quê |
|---|---|
| **Nuvem** (Lovable Cloud / Supabase) | Autenticação, papéis de acesso (`user_roles`), perfis (`profiles`), cadastro de usuários (`usuarios`), **empresas** (`empresas`, isoladas por usuário via RLS) e progresso de estudo (`learning_progress`). |
| **Navegador + nuvem** (`contabil_registros`) | **Cadastros próprios e contabilidade**: clientes e fornecedores, produtos e serviços, plano de contas, centros de custo, históricos padrão e lançamentos contábeis. Gravam na hora no navegador (chaves `usecontabil.col.*`, separadas por usuário) e sincronizam com a tabela `contabil_registros` (isolada por usuário via RLS) — ver `src/lib/nuvemColecoes.ts`. Sem a tabela, ficam só no navegador e sobem sozinhos quando ela existir; o selo "Salvo na nuvem / Salvo só neste navegador" das telas mostra a situação. |
| **Navegador** (`localStorage`) | **Todo o restante**: documentos fiscais, escrituração fiscal, apurações, obrigações, guias, contratos, patrimônio, compras etc. (chaves `usecontabil.*` e `uc:*`), além das preferências de tema, som e ambiente. A área Simples & MEI também mantém localmente faturamentos informados e checklists/lembretes na chave `usecontabil.simples-mei.v1` (com sufixo `.pratica` no modo prática). |

Consequência importante: o que não está na lista da nuvem **fica só no navegador em que foi criado** — não acompanha o usuário em outro dispositivo e se perde se os dados do navegador forem limpos.

O **modo prática** guarda seus dados com o sufixo `.pratica` nas mesmas chaves, isolados da base real.

## Acesso

- Login por e-mail/senha ou Google. Só entra no sistema quem tem ao menos um papel em `user_roles`; conta nova vê **"Acesso pendente"** até que um administrador libere o perfil.
- Administradores gerenciam usuários em *Administrativo › Controles internos › Usuários e permissões* (edge function `admin-usuarios`).
- Num backend novo, atenção ao primeiro administrador: a tela só abre para quem já tem algum papel, e a função `admin-usuarios` (que promove o primeiro solicitante quando ainda não há admin) é chamada de dentro do sistema. Na prática, o primeiro papel `admin` precisa ser inserido direto no backend (tabela `user_roles`).
- A edge function `gestao-assistente` alimenta a IA ajudante do fechamento, usando a Lovable AI Gateway (`LOVABLE_API_KEY`, configurada como secret no backend).

## Estrutura do repositório

```text
src/
  pages/contabil/     telas por área (preparativos, contabilidade, fiscal, financeiro, administrativo, Simples & MEI, aprender)
  components/         shell do app (ContabilShell), RequireAuth e componentes contábeis reutilizáveis
  lib/                stores por domínio (regras e motores de cálculo) e a navegação (contabilNav*.tsx)
  lib/aprendizado/    conteúdo da camada de aprendizado: lições, trilhas, glossário e laboratórios
  design-system/      design system MJ (tokens e componentes)
  integrations/       clientes gerados (Supabase e Lovable) — não editar à mão
  test/               testes (Vitest)
supabase/
  migrations/         SQL do banco (tabelas, RLS e funções)
  functions/          edge functions: admin-usuarios e gestao-assistente
mem/index.md          memória do projeto (regras lidas pelo assistente do Lovable)
.lovable/             plano da camada de aprendizado e regras do design system
```

## Convenções

- **Interno, não escritório contábil**: use *empresa*, *filial*, *unidade* e *grupo*; evite "honorários", "empresas atendidas" e "escritório contábil".
- **Dados fiscais simulados**; competência padrão em 2026.
- **Design system**: importe componentes de `@/design-system/mj-design-system-db98fa`; use tokens semânticos (`bg-background`, `text-brand-orange`…), nunca cores literais; botões, abas e badges em pílula (`rounded-full`); combine classes com `cn()`; ícones do `lucide-react`. Detalhes em `.lovable/rules/libraries/mj-design-system-db98fa/`.
- **Nada de reset/limpeza automática** ao abrir o sistema: ações destrutivas só por clique explícito, com caixa de confirmação. Há um teste de regressão em `src/test/primeiroAcesso.test.tsx`.
- **Arquivos gerados** (não editar à mão): `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `src/integrations/lovable/index.ts` e `.env`.

## Trabalhando com o Lovable

Este repositório é mantido junto com um projeto do Lovable: todos os commits do histórico até aqui vêm do bot do Lovable. Alterações feitas direto no GitHub chegam ao Lovable pela branch conectada (normalmente a `main`); por isso, use pull requests e evite editar o mesmo arquivo nos dois lugares ao mesmo tempo.

Mudanças de banco (`supabase/migrations`) e de edge functions (`supabase/functions`) precisam ser aplicadas/publicadas no backend — depois de um merge, confirme no Lovable que foram aplicadas.

**Migração pendente mais recente:** `supabase/migrations/20260930150000_contabil_registros.sql` (tabela da nuvem dos cadastros próprios e dos lançamentos contábeis). O Lovable só enxerga a branch conectada (a `main`): primeiro faça o merge do pull request; depois, no chat do Lovable, peça para executar o SQL desse arquivo. O SQL pode ser executado mais de uma vez sem erro. Enquanto não for aplicada, as telas mostram "Salvo só neste navegador" e nada se perde; depois de aplicada, o selo passa a "Salvo na nuvem".

## Limitações conhecidas

- Sem integração real com Receita Federal, SEFAZ ou prefeituras; os arquivos gerados não têm validade legal.
- A maior parte dos dados fica só no navegador (veja "Como os dados são guardados"). Na nuvem, cada usuário só vê os próprios registros: ainda não há organização/equipe compartilhando as mesmas empresas.
- Os lançamentos contábeis ainda são manuais (o plano de contas e o balancete de abertura já podem ser importados de planilha): a contabilização automática dos documentos fiscais e a integração com o ERP (Use Sistemas) são as próximas etapas (ver `docs/analise-sistema-contabil.md`).
- Cobertura de testes automatizados ainda baixa (veja `src/test`).
