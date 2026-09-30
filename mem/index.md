# Project Memory

## Core
Use Contábil é contabilidade **interna** de uma empresa/grupo — NÃO é sistema para escritório contábil que atende clientes externos. Nunca usar termos como "cliente", "honorários", "empresas atendidas", "escritório contábil" para se referir aos usuários/entidades do sistema. Usar "empresa", "filial", "unidade", "grupo".
Todos os dados fiscais/eSocial/Receita são apenas visuais/mock — sem integração real com órgãos oficiais.
Competência padrão: 2026 (Fev–Jul/2026).
Nunca apagar/limpar/resetar dados (nuvem ou localStorage) automaticamente ao abrir o sistema, nem com base em flag guardada no navegador. Ações destrutivas só por clique explícito do usuário, com caixa de confirmação (AlertDialog). Um "reset único" automático já apagou as empresas da nuvem em todo navegador novo; o teste src/test/primeiroAcesso.test.tsx protege contra isso — mantenha-o passando.

## Visual
Identidade visual "índigo" (atualizada em 2026-09); os tokens ficam em `src/index.css`. `brand-orange` é NOME HISTÓRICO do acento principal e hoje vale ÍNDIGO — não renomear nem voltar para laranja sem varrer os ~790 usos. Avisos e modo prática usam âmbar (`warn`). O menu lateral é uma área escura (classe `dark` no `<aside>` do ContabilShell). Botões: `Button` do design system (variantes default/gradient/success/destructive/outline/soft/ghost/link + prop `loading`). Animações em `src/index.css` (`animate-page-enter`, `.stagger`, `.lift`, `.btn-sheen`), sempre respeitando `prefers-reduced-motion`. Ícones: `lucide-react` 0.462 (conferir se o ícone existe antes de importar).

## Cadastros e contabilidade (2026-09)
- ERP: haverá integração com o ERP da Use Sistemas (ainda não existe). Até lá, os cadastros são alimentados no próprio sistema; o campo `origem` já prevê "ERP".
- **Cadastro único do grupo** (`src/lib/cadastrosStore.ts`): clientes/fornecedores (participantes) e produtos/serviços, em Preparativos › Cadastros. Não criar outros cadastros de parceiros/produtos: os antigos de Financeiro › Cadastros foram removidos (rotas redirecionam). A importação de XML de NF-e alimenta esses cadastros.
- **Núcleo contábil** (área "Contábil"): `planoContasStore.ts` (plano de contas do grupo, centros de custo, históricos padrão; modelo em `planoContasModelo.ts`) e `lancamentosStore.ts` (partidas dobradas, estorno, balancete, razão, diário). Regras: só conta analítica e ativa recebe lançamento; débitos = créditos; competência encerrada (fechamentos do `gestaoStore`) bloqueia lançar/alterar/excluir — corrige-se por estorno.
- **Persistência** (`src/lib/nuvemColecoes.ts`): coleções gravadas na hora no navegador (chave `usecontabil.col.<nome>.v1[.u.<uid>][.pratica]`) e sincronizadas com a tabela `contabil_registros` (jsonb, RLS por usuário, exclusão = marca `excluido`). Novas entidades desse tipo: use `criarColecao()`; não gravar direto na tabela. Modo prática nunca sobe para a nuvem.
