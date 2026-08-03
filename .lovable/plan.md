## Camada de Aprendizado — proposta

Objetivo: transformar o Use Contábil em ambiente de estudo sem descaracterizá-lo como ferramenta de trabalho. Tudo lê dos motores existentes; nenhuma regra fiscal é reimplementada.

---

### (a) Navegação e telas novas

Nova área raiz **Aprender** (`/aprender`), no mesmo padrão das 4 áreas atuais, com ícone e acento do design system.

```text
/aprender                        Central de Aprendizado (hub: trilhas + progresso + glossário)
/aprender/trilha/:slug           Trilha por área (Preparativos, Fiscal, Financeiro, Administrativo)
/aprender/licao/:slug            Lição: "Como usar" + "O conceito" + "Abrir a tela" / "Praticar"
/aprender/glossario              Glossário completo (filtro por área e por tema)
/aprender/pratica                Modo prática: laboratórios de apuração com dados fictícios
```

Em **todas as telas já existentes**, um botão discreto **"Entender esta tela"** no cabeçalho (ícone `GraduationCap`), abrindo um painel lateral (Sheet do design system) com três blocos:
- **O que esta tela faz** (operacional, passo a passo)
- **O conceito por trás** (contábil/fiscal, linguagem didática)
- **Termos desta tela** (chips do glossário) + link "Ver lição completa" e, quando houver motor associado, "Praticar com dados fictícios"

Aviso fixo no rodapé do painel e no hub: *simulação interna para conferência e estudo — sem conexão com Receita Federal, SEFAZ ou prefeituras.*

Integração com o Ctrl/Cmd+K existente (`BuscaTelas`): novos grupos **Glossário** e **Aprender**, ao lado de Telas. Selecionar um termo abre o verbete; o verbete leva à tela e à lição.

Acesso: **universal** (leitura). Justificativa: é conteúdo educativo, não dado sensível. O botão "Abrir a tela" respeita as permissões já existentes de Controles internos — se o perfil não tiver acesso ao módulo, o link fica desabilitado com aviso. O modo prática também é universal, pois escreve apenas em armazenamento isolado.

---

### (b) Modelo de dados

Conteúdo (estático, versionado no código — sem tabela):
- `src/lib/aprendizado/conteudo.ts` — `Licao { slug, area, categoria, rota, titulo, comoUsar: string[], conceito: string[], baseLegal?: string[], termos: string[], praticaId?: string }`
- `src/lib/aprendizado/glossario.ts` — `Termo { slug, termo, siglaDe?, resumo, detalhe, area, rotas: string[], licaoSlug? }` (~60 verbetes: SPED, EFD-Reinf, CIAP, DIFAL, Fator R, ICMS-ST, DCTFWeb, PGDAS-D, DEFIS, ECD/ECF, RAT/FAP, CFOP, CST, regime de competência, etc.)
- `src/lib/aprendizado/trilhas.ts` — `Trilha { slug, area, titulo, licoes: string[] }`

Progresso (por usuário, Lovable Cloud):
```text
learning_progress
  user_id uuid  (auth.uid)
  licao_slug text
  status text ('vista' | 'concluida')
  updated_at timestamptz
  PK (user_id, licao_slug)
  RLS: só o próprio usuário lê/escreve; GRANT para authenticated
```
Cache local otimista em `src/lib/aprendizadoStore.ts` (mesmo padrão dos stores atuais: subscribers + localStorage + sync).

Modo prática (sem persistência remota):
- `src/lib/praticaStore.ts` — flag global `praticaAtiva`, cenários fictícios e resultados, persistidos em `localStorage` sob chave própria (`uc:pratica:*`), **nunca** nas chaves dos stores reais.
- Nenhum store de produção é alterado: o laboratório monta o *input* e chama as funções puras já existentes de `apuracaoStore` / `tributarioStore`.

---

### (c) Plano de implementação em fases

**Fase 1 — Ajuda contextual por tela** (maior valor, menor esforço)
Store de conteúdo + componente `AjudaTela` (Sheet) + botão no cabeçalho padrão das telas, começando pelas telas de maior densidade conceitual (apurações, escrituração, obrigações, guias, DRE, conciliação) e depois as demais. Aviso de simulação incluído.

**Fase 2 — Glossário + paleta de comandos**
`glossario.ts`, tela `/aprender/glossario`, verbete em popover/dialog, chips de termo dentro do painel de ajuda e novos grupos no Ctrl/Cmd+K.

**Fase 3 — Central de Aprendizado e trilhas com progresso**
Hub `/aprender`, trilhas por área, páginas de lição, tabela `learning_progress` com RLS, marcação discreta de "estudado" e barra de progresso sutil por trilha.

**Fase 4 — IA "por quê"**
Extensão do assistente atual: novo modo de pergunta conceitual que recebe, além do contexto de tela, o resultado real do motor (memória de cálculo da apuração) para responder "por que deu esse valor" e "o que muda entre Anexo III e Anexo V". Reaproveita a edge function existente com prompt e contexto ampliados.

**Fase 5 — Modo prática/sandbox**
`praticaStore`, faixa/badge persistente no topo quando ativo (borda e badge de destaque do design system), laboratórios que rodam Simples Nacional, ICMS, PIS/COFINS e retenções sobre cenários fictícios, com comparação lado a lado de parâmetros e explicação do resultado.

---

### Detalhes técnicos

- Nenhuma regra fiscal nova: os laboratórios importam as funções de cálculo já existentes nos stores de domínio e apenas fornecem entradas fictícias.
- Rotas novas registradas em `src/App.tsx` com `lazy`, dentro do `RequireAuth`/`ContabilShell`.
- Nova área adicionada em `contabilNav`/`contabilNavAreas` para aparecer na sidebar retrátil já existente.
- Componentes exclusivamente de `@/design-system/mj-design-system-db98fa` (Sheet, Card, Badge, Tabs, Accordion, Command, Progress); sem cores literais.
- Migração SQL com `GRANT` + RLS por `auth.uid()` na tabela de progresso.
