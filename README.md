# Use Contábil

Central **contábil, fiscal e administrativa interna** de um grupo de empresas: cadastros, documentos fiscais, escrituração, apurações, obrigações acessórias, guias, conciliação, DRE e controles administrativos — com uma camada de aprendizado (trilhas, glossário e modo prática) construída sobre os mesmos motores.

> **Protótipo visual.** Não há integração real com Receita Federal, SEFAZ ou prefeituras. Documentos, guias e arquivos gerados são simulações para conferência e estudo, sem validade legal.
>
> Não é um sistema para escritórios de contabilidade que atendem clientes externos: no sistema, use *empresa*, *filial*, *unidade* e *grupo*.

## Áreas do sistema

| Área | O que tem |
|---|---|
| **Dashboard** | Visão geral contábil da empresa e da competência selecionadas. |
| **Preparativos** | Cadastro de empresas, filiais e classes de atividade; inscrições, pagamentos, parâmetros e certificados; gestão do fechamento (fases, tarefas e encerramentos). |
| **Fiscal** | Documentos fiscais, escrituração (livros, ICMS, IPI, inventário, CIAP), apurações (PIS/COFINS, ISS, IRPJ/CSLL, Simples Nacional, retenções), obrigações (SPED Fiscal, EFD-Contribuições, ECD/ECF, DCTFWeb, REINF, estaduais), guias e auditoria fiscal. |
| **Financeiro** | Serviços, produtos e parceiros comerciais (clientes/fornecedores), tabelas por regime, movimentos, tributação (DIFAL, ST, DEFIS, motor tributário), conciliação bancária e DRE. |
| **Administrativo** | Contas e caixa, contratos e documentos, patrimônio, suprimentos, controles internos (usuários, perfis e permissões), auditoria cadastral, pesquisa global e dashboard executivo. |
| **Aprender** | Central de aprendizado (trilhas, lições e glossário) e **modo prática**, com dados fictícios. |

O seletor de **empresa** e o filtro de **competência** no cabeçalho valem para todas as telas.

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
| **Navegador** (`localStorage`) | **Todo o restante**: documentos fiscais, escrituração, apurações, obrigações, guias, contratos, patrimônio, compras etc. (chaves `usecontabil.*` e `uc:*`), além das preferências de tema, som e ambiente. |

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
  pages/contabil/     telas por área (preparativos, fiscal, financeiro, administrativo, aprender)
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

## Limitações conhecidas

- Sem integração real com Receita Federal, SEFAZ ou prefeituras; os arquivos gerados não têm validade legal.
- A maior parte dos dados fica só no navegador (veja "Como os dados são guardados").
- Cobertura de testes automatizados ainda baixa (veja `src/test`).
