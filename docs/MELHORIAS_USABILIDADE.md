# Resumo de melhorias de usabilidade e padronização

**Data:** 01/10/2026
**Plataforma:** UseContábil v2.4

---

## Diagnóstico inicial (problemas encontrados)

### 1. Navegação e caminhos
- **Breadcrumb duplicado:** O topo fixo (`ContabilShell`) mostrava um breadcrumb que não era clicável, e cada página renderizava o seu próprio — gerando duas trilhas concorrentes.
- **Botão "Voltar" frágil:** Funcionava cortando a URL por `/`, o que quebrava em rotas com `/novo` ou sub-ações e não respeitava o histórico real do usuário.
- **Botão "Apresentação" duplicado:** Aparecia na barra lateral e também no topo.
- **Numeração do menu "Aprender" quebrada:** Cálculo dinâmico errado fazia o item aparecer com número 08 em vez de 07 (Dashboard=01, 5 áreas + Aprender = 07).
- **Selecionador de empresa só aparecia em telas XL:** Usuários em laptop menor (1280px) não viam o seletor de empresa no topo.

### 2. Entendimento da tela (cabeçalhos)
- **Cabeçalhos sem padrão visual:**
  - Tamanhos de título: `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl` misturados.
  - Arredondamentos: `rounded-xl`, `rounded-2xl`, `rounded-3xl` no mesmo tipo de elemento.
  - Ícones: `h-5 w-5`, `h-6 w-6`, `h-7 w-7`, `p-2`, `p-2.5`, `p-3` sem critério.
  - Espaçamentos: `gap-3`, `gap-4`, `gap-5` inconsistentes.
- **Eyebrow (texto superior do título) ausente em muitas páginas** — dificultava saber "onde eu estou".
- **Páginas Hub (Apurações, Guias, Obrigações, Administrativo)** tinham estrutura totalmente diferente das páginas de listagem genéricas (`ModulePage`).
- **Badges de competência/empresa** duplicados entre o cabeçalho e o card de filtros.

### 3. Despadronização visual
- **Cores:** Fiscal e Financeiro usavam o mesmo laranja (`brand-orange`), deixando as áreas indistinguíveis visualmente.
- **Botões de ação primária (laranja):** alguns `rounded-full`, outros `rounded-md`, outros `rounded-lg`.
- **Badges:** mistura de `rounded-full` e `rounded-md` em contextos idênticos.
- **Cards:** mistura de `rounded-xl`, `rounded-2xl`, `rounded-3xl`.
- **Indicadores (KPI minicards):** usavam `rounded-2xl` dentro de cards `rounded-xl`, gerando "degraus" estranhos.
- **Financeiro:** eyebrow era "Tributário" — confundia com a área Fiscal.
- **Classes utilitárias de cor em falta:** `brand-purple`, `brand-pink`, `brand-teal`, `brand-amber` tinham tokens CSS mas não classes utilitárias (bg-/text-/border-) expostas.

### 4. Aspectos de UX
- **Contador "Ambiente HOMOLOGAÇÃO" hardcoded** em todas as tabelas — não refletia a preferência real do usuário.
- **Botão "Novo registro"** aparecia só para o módulo "empresas"; outros módulos com `primaryAction` definido não tinham o botão.

---

## O que foi ajustado

### ✅ Cabeçalho padronizado (novo componente `PageHeader`)
Criado `src/components/contabil/PageHeader.tsx` como componente único para todas as telas, com:
- **Breadcrumb clicável** com ícone de "Home", níveis com `hover:bg-accent`, setas visuais.
- **Estrutura fixa:** ícone + eyebrow + título (com parte destacada em cor de accent) + descrição + badges + ações.
- **Tamanhos consistentes:** `text-3xl sm:text-4xl` no padrão, `text-2xl sm:text-3xl` para hubs (compact).
- **Ícones padronizados:** `h-12 w-12 rounded-xl border bg-{accent}/12` com ícone `h-6 w-6 text-{accent}`.

### ✅ Topo da aplicação (`ContabilShell`)
- **Removido o breadcrumb redundante** do topo (agora cada tela tem o seu próprio pelo `PageHeader`, clicável).
- **Adicionado indicador de contexto** (código + área + categoria) no lugar do breadcrumb — mais limpo.
- **Botão "Voltar" agora usa `navigate(-1)`** (histórico real do navegador) em vez de fatiar a URL.
- **Removido botão duplicado "Apresentação"** do topo (mantido apenas na base da sidebar, em destaque).
- **Corrigida a numeração** do item "Aprender" de `AREAS.length + 2` para `AREAS.length + 1` (agora mostra 07 corretamente).

### ✅ Diferenciação de áreas por cor
- **Fiscal:** continua laranja (`brand-orange`) — cor principal do sistema.
- **Financeiro:** agora usa rosa (`brand-pink`) para se diferenciar visualmente do Fiscal.
- **Preparativos:** azul (`brand-blue`) — setup.
- **Contábil:** roxo (`brand-purple`) — escrituração.
- **Administrativo:** roxo (`brand-purple`) — rotina corporativa.
- Eyebrow do Financeiro alterado de "Tributário" para **"Fluxo de caixa & tributos"**, e a descrição foi atualizada para refletir melhor o conteúdo (movimentação financeira, apurações, demonstrações, conciliação).

### ✅ Expansão da paleta de cores
Adicionadas as classes utilitárias que faltavam no `src/index.css`:
- `bg-`, `text-`, `border-brand-purple`
- `bg-`, `text-`, `border-brand-pink`
- `bg-`, `text-`, `border-brand-teal`
- `bg-`, `text-`, `border-brand-amber`

### ✅ Padronização visual
- **Cards**: todos os cards das páginas contábeis agora usam `rounded-xl` (removidos `rounded-2xl` e `rounded-3xl` de cartões não-modais).
- **Botões primários (CTA laranja):** padronizados em `rounded-lg`.
- **Badges informativos:** padronizados em `rounded-md` (os verdadeiros "pills" como status continuam `rounded-full` apenas quando faz sentido).
- **Indicadores/KPIs minicards:** padronizados em `rounded-lg`.
- **Contêineres de ícones:** padronizados em `rounded-xl`, `bg-brand-{cor}/12`, `p-2.5` (hubs e áreas) ou `p-3` em áreas maiores.
- **Tamanho de títulos de seção (h2):** padronizado em `text-xl` em cartões (era `text-2xl` e brigava com o h1 da página).

### ✅ Páginas refatoradas para usar o novo padrão
- `pages/contabil/AreaPage.tsx`
- `pages/contabil/CategoryPage.tsx`
- `pages/contabil/ModulePage.tsx` (módulos genéricos)
- `pages/contabil/fiscal/apuracoes/Hub.tsx`
- `pages/contabil/fiscal/obrigacoes/Hub.tsx`
- `pages/contabil/fiscal/guias/Hub.tsx`
- `pages/contabil/administrativo/Hub.tsx`
- `pages/contabil/Dashboard.tsx` (cabeçalho alinhado ao novo padrão)

### ✅ Pequenas melhorias de UX
- **Badges de competência/empresa** movidos do card de filtros para o cabeçalho da página (onde são contexto, não filtro).
- **Contador de registros** movido para dentro do card de filtros ("N de X registros"), removendo a faixa redundante do topo da tabela.
- **Texto "Ambiente HOMOLOGAÇÃO" hardcoded** removido (o ambiente já é exibido no rodapé da sidebar e nas configurações).
- **Botão de "Nova …"** agora aparece para todos os módulos que têm `primaryAction` definido, não só empresas/dados-empresa.
- **Vite:** adicionado `allowedHosts: true` para que o preview funcione no ambiente de sandbox.

---

## Resultado

O que você vai notar ao navegar:

1. **Hierarquia visual clara**: todo cabeçalho de tela tem a mesma anatomia — breadcrumb no topo, ícone da área à esquerda, eyebrow em caixa alta, título com parte destacada, descrição e ações à direita.
2. **Onde estou?** sempre visível: breadcrumb clicável + código da área + eyebrow.
3. **Navegação de volta confiável**: o botão ← do topo usa o histórico, não uma heurística de URL.
4. **Cores que diferenciam as áreas**: Fiscal é laranja, Financeiro é rosa, Preparativos azul, Contábil/Administrativo roxos — em qualquer página a cor do ícone e do realce diz "em que área você está".
5. **Arredondamentos e espaçamentos consistentes** em todos os cartões, botões e badges.
6. **Menos ruído**: sem breadcrumb duplicado, sem selo "HOMOLOGAÇÃO" hardcoded, sem badges de contexto repetidos.

---

## Próximas sugestões (não feitas agora, para considerar)

- **Selecionador de empresa em telas menores (md/lg)** — hoje só aparece em XL; pode ser movido para o topo sempre visível.
- **Breadcrumb com último item em destaque** (já está em `text-foreground`, mas pode ser negrito).
- **Padronizar as páginas "aprender"** (Central, Trilha, Lição, Glossário, Prática) com o novo `PageHeader` — elas têm estrutura própria e podem ficar mais alinhadas.
- **Criar um `CardModulo` reutilizável** para eliminar a repetição de `<Link><Card><CardContent>…` nos hubs.
- **Componente de tabela padronizado** (`Toolbar` + busca + filtros + tabela + paginação) para eliminar duplicação entre `ModulePage` e páginas específicas.
