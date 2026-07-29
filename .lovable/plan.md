## Objetivo

Hoje `Fiscal › Escrituração` são 6 telas estáticas geradas pelo manifesto (`contabilNavAreas.tsx`): tabela fixa, sem CRUD, sem cálculo, sem ajudante. A proposta é transformá-las em telas funcionais no mesmo padrão das últimas entregas (documentos fiscais / tabelas do financeiro): CRUD persistido por empresa + competência, indicadores no topo, importação simulada, dicas e **IA ajudante de campos**.

Regra central adotada: **a escrituração não é digitada do zero — ela é derivada dos documentos fiscais já lançados**. É assim que os sistemas contábeis do mercado funcionam (Domínio, Alterdata, Questor): o livro nasce da nota, e a apuração nasce do livro.

## Telas e regras contábeis

**1. Livro de entradas** — gerado a partir das Notas de entrada, CT-e e serviços tomados da competência. Agrupa por CFOP/CST, com colunas: valor contábil, base de cálculo, ICMS, IPI, isentas, outras. Botão "Gerar a partir dos documentos" reprocessa o livro; linhas manuais continuam possíveis. CFOPs de uso e consumo (1556) e ST (1403/5405) não geram crédito — a tela marca isso e explica.

**2. Livro de saídas** — mesma lógica sobre notas de saída, NFS-e e cupons. Débito de ICMS por CFOP, destaque de ST e de operações sem tributação (bonificação, remessa).

**3. Apuração de ICMS** — calculada, não digitada: débitos das saídas − créditos das entradas + saldo credor anterior = saldo a recolher ou a transportar. Linhas separadas para ICMS próprio, ICMS-ST e DIFAL. Mostra a memória de cálculo aberta e trava o encerramento se houver documento pendente na competência.

**4. Apuração de IPI** — mesma mecânica, restrita a itens com IPI destacado, com decêndio/mês conforme o parâmetro da empresa.

**5. Inventário (Bloco H)** — CRUD por item (NCM, quantidade, custo unitário, total calculado), com totalizador do estoque, indicação da data-base e alerta quando o inventário da competência de encerramento não existe.

**6. CIAP** — controle de crédito do ativo imobilizado em 48 parcelas: cadastro do bem, crédito total, parcela atual, apropriação mensal calculada automaticamente e baixa ao completar as parcelas. O crédito do mês alimenta a apuração de ICMS.

Além disso: encadeamento com o módulo de gestão — as tarefas da fase "Escrituração" passam a refletir o estado real dessas telas (livros gerados, apurações fechadas, inventário presente).

## Padrão de tela (igual às últimas)

Cada tela terá: cabeçalho com ícone/descrição, faixa de indicadores, barra de ações (Novo / Gerar / Importar / Exportar), tabela com edição e exclusão, diálogo de cadastro com **IA ajudante** explicando cada campo, e bloco de dicas contextuais. Filtro por empresa selecionada e competência global, como nas demais telas.

## Detalhes técnicos

- Novo `src/lib/escrituracaoStore.ts`: persistência em localStorage por `empresa + competência`, tipos de livro/apuração/inventário/CIAP, e funções de derivação a partir de `fiscalStore` (documentos já lançados).
- Novo componente `src/components/contabil/CrudEscrituracao.tsx`, no molde de `CrudDocumentosFiscais`, com suporte a colunas calculadas, linha de totais e ação "Gerar a partir dos documentos".
- 6 páginas em `src/pages/contabil/fiscal/escrituracao/` reutilizando esse componente; apurações usam uma variação com painel de memória de cálculo.
- Rotas lazy em `src/App.tsx` sob `/fiscal/escrituracao/*` e remoção dos módulos estáticos correspondentes em `contabilNavAreas.tsx` para não duplicar.
- `AssistenteCampos` reaproveitado em todos os diálogos; sem alteração na edge function.
- Nenhuma integração real com a Receita — cálculo e dados permanecem internos/simulados.
