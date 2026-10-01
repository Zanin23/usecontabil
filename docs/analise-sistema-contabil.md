# Use Contábil: o que falta para ser um bom sistema contábil

> **Escopo:** contabilidade **interna** de um grupo de empresas. Um **ERP** fornece os fatos operacionais: notas emitidas e recebidas, cadastros, financeiro e estoque.
> **Referência de mercado:** Makro (módulos Preparar, Fiscal, Contábil, Pessoal e Financeiro).
> **Como a análise foi feita (30/09/2026):**
> - leitura do código (commit `f5dfcb5`);
> - `vitest`: 143 de 144 testes passam (1 teste de importação de XML estoura o tempo);
> - `tsc`: sem erros;
> - testes de diagnóstico temporários que simulam cenários reais (seção 6).

---

## Andamento (atualizado em 01/10/2026)

Decisão tomada: **o Use Contábil é o dono do razão** (opção A da seção 2). A integração será com o ERP da **Use Sistemas**, que ainda não existe; até lá os cadastros são alimentados no próprio sistema.

| Item | Situação |
|---|---|
| Cadastro único de clientes/fornecedores e produtos/serviços (Preparativos › Cadastros), alimentado também pelo XML da NF-e e pelos cadastros antigos | ✅ Feito |
| Plano de contas do grupo com modelo pronto (225 contas, com IBS/CBS), centros de custo e históricos padrão | ✅ Feito |
| Lançamentos em partidas dobradas, estorno, bloqueio da competência encerrada, balancete, razão e diário | ✅ Feito |
| Gravação na nuvem desses dados (tabela `contabil_registros`, com cópia local e sincronização) | ✅ Feito — falta fazer o merge do PR e, depois, aplicar a migração no Lovable |
| Vínculo de cada conta com o plano referencial da RFB | 🟡 Campo pronto; códigos a preencher |
| Contabilização automática de notas, baixas, folha e depreciação (regras da seção 5.3) | ⏭️ Próxima etapa |
| Organização/equipe compartilhando empresas, permissões aplicadas, demais telas na nuvem | ⏭️ Pendente |
| Correções de conceito da seção 6 — **itens 1, 2, 4, 5, 13, 14 e 16** | ✅ Feito em 01/10/2026 (PR desta branch): compra não é receita, DRE sem a carteira simulada, devolução pelo CFOP (cancelada fora), depreciação por empresa, `getStorageSuffix()` nos 11 stores, \"Estorno de baixa\" no lugar de \"Reavaliação\" e GIA fora / DCTFWeb no lugar da DCTF |
| Importação do plano de contas e do balancete de abertura por planilha (CSV ou Excel .xlsx), com o balancete virando lançamento do tipo \"Abertura\" | ✅ Feito em 01/10/2026 |
| Demais itens da seção 6 (3, 6 a 12, 15) e PIS/COFINS, IRPJ/CSLL | ⏭️ Pendente (fase 3 do roteiro) |

---

## 1. Resumo em 1 minuto

1. **Falta o módulo Contábil inteiro.** Não existem:
   - plano de contas contábil;
   - lançamento em partidas dobradas;
   - Diário, Razão e Balancete;
   - Balanço Patrimonial;
   - apuração do resultado e encerramento do exercício.

   O sistema tem 96 telas, mas elas são fiscais, tributárias e administrativas. O que parece contábil hoje (DRE, ECD, lado "contábil" da conciliação) é montado a partir de notas e títulos, ou é simulado.
2. **Falta o motor que transforma dados do ERP em lançamentos.** No Makro, as notas fiscais são contabilizadas automaticamente. Aqui nenhum documento gera lançamento, porque não há onde lançar. Também não existe camada de integração: área de recepção (*staging*), de-para, idempotência, log e reprocessamento.
3. **Os números não fecham entre telas** (provado com testes):
   - uma nota de **compra** vira **receita** na DRE;
   - a DRE soma **títulos a pagar gerados aleatoriamente**;
   - uma venda digitada no Fiscal não chega à DRE;
   - a depreciação de todos os bens entra na DRE de qualquer empresa.
4. **Os dados ficam no navegador (localStorage) e cada usuário só vê as próprias empresas.** Isso não serve para um departamento contábil com várias pessoas, auditoria e fechamento.
5. **As regras de PIS/COFINS e IRPJ/CSLL têm erros de conceito, e não há nada de IBS/CBS.** Os campos de IBS/CBS são obrigatórios na NF-e desde 03/08/2026. Obrigações extintas (DCTF, GIA-SP) ainda aparecem.

**O que dá para aproveitar:**
- cadastro de empresas, filiais e grupos já no Supabase;
- importação de XML de NF-e;
- estrutura de escrituração, apurações e obrigações com memória de cálculo;
- patrimônio com depreciação;
- controles internos;
- modo prática e trilha "Aprender";
- design system consistente;
- testes automatizados.

---

## 2. Decisão de arquitetura que precisa ser tomada primeiro

**Quem é o dono do razão contábil?**

| Opção | Como funciona | Quando faz sentido |
|---|---|---|
| **A. O Use Contábil é o razão** *(recomendada)* | O ERP manda os fatos: notas, títulos, baixas, estoque, folha. O Use Contábil contabiliza por regras e é dono do plano de contas, dos lançamentos, do fechamento e das demonstrações. | ERP comercial ou operacional (Bling, Omie, Tiny, ERPs de nicho) ou ERP cuja contabilidade não é usada. |
| B. O ERP é o razão | O ERP já contabiliza. O Use Contábil importa plano e lançamentos e faz fiscal, conferência, fechamento e obrigações. | ERP com contabilidade madura e já em uso (Protheus, SAP etc.). |

Mesmo na opção A, vale aceitar **lançamentos prontos vindos de fora**, por exemplo do sistema de folha. Hoje o "Plano de contas gerencial" (`src/lib/adminStore.ts` L558) está modelado como vindo do "ERP Principal · Contabilidade". Isso indica a opção B, mas nada no sistema consome esse plano.

---

## 3. Makro × Use Contábil

| Módulo no Makro | Para que serve | No Use Contábil hoje | Situação |
|---|---|---|---|
| Preparar | Empresa, parâmetros globais, data do balanço de abertura | Preparativos | 🟡 Existe, mas os parâmetros são texto livre e não mudam nenhum cálculo. Faltam exercício social, balanço de abertura, plano de contas vinculado e signatários da ECD. |
| Fiscal | Importa XML/SPED/Sintegra, escritura, apura, gera obrigações e contabiliza as notas automaticamente | Fiscal e parte do "Financeiro" | 🟡 Amplo, mas grava só o cabeçalho da nota (os itens são descartados). Há duas bases de documentos que não conversam e nenhuma contabilização. |
| **Contábil** | Plano de contas único, lançamentos, balancetes, DRE, Balanço, integração com Fiscal e Pessoal, depreciação, encerramento, ECD/ECF | não existe | ❌ **Falta o módulo inteiro** |
| Pessoal | Folha, eSocial, provisões que viram lançamentos | não existe | ❌ Na contabilidade interna basta **importar a folha** do ERP ou do RH e contabilizar |
| Financeiro | Financeiro **do escritório contábil**: honorários, boletos, NFS-e para os clientes | "Financeiro" (na prática, tabelas e movimentos tributários) e Administrativo (pagar/receber) | ⚪ Não copiar. O financeiro da empresa vem do ERP. |

**Sobre o menu "Financeiro":** ele nasceu do Financeiro do Makro.
- Os dados de exemplo ainda trazem "Consultoria contábil mensal", "Abertura de empresa", "Folha (por colab.)" e CNAE 6920-6/01 (`src/lib/contabilNav.tsx` L432-436 e L587).
- Hoje o menu funciona como área **tributária**: tabelas por regime, movimentos, DIFAL/ST, DEFIS.
- Sugestão: renomear para **"Tributário"** e tratar pagar/receber como visão do ERP.

---

## 4. Lacuna nº 1: o núcleo contábil (o módulo que falta)

Legenda: ✅ existe · 🟡 parcial ou simulado · ❌ não existe

### 4.1 Cadastros contábeis
| Item | Situação | Observação |
|---|---|---|
| Plano de contas (sintética/analítica, grau, natureza D/C, máscara, grupo patrimonial ou de resultado) | ❌ | Só existe o "Plano de contas gerencial", somente leitura. Nenhum cálculo usa esse plano. |
| Plano único para o grupo, com contas específicas por empresa quando preciso | ❌ | O parâmetro "Plano de contas: Plano padrão do grupo" aponta para algo que não existe |
| Vínculo com o **plano referencial da RFB** (ECD I051 / ECF) | ❌ | No Makro: Plano de Contas › Links referenciais |
| Centros de custo e de resultado (ECD I100) | 🟡 | Aparecem só como texto em Patrimônio, Compras e Controles |
| Históricos padrão | ❌ | |
| Conta bancária ↔ conta contábil | ❌ | Contas bancárias estão em 4 lugares diferentes (seção 7), e nenhum deles liga a conta a uma conta contábil |
| Cliente ou fornecedor ↔ conta contábil (analítica ou por grupo) | ❌ | |

### 4.2 Escrituração
| Item | Situação |
|---|---|
| Lançamento em partidas dobradas (1×1 e 1×N) com validação débito = crédito | ❌ |
| Lotes, numeração sequencial, data do lançamento × data do fato | ❌ |
| Origem rastreável (NF, título, baixa, folha, depreciação, manual) com link para o documento | ❌ |
| Estorno em vez de exclusão física; renumeração | ❌ |
| Lançamentos recorrentes, provisões, rateio por centro de custo | ❌ |
| Aprovação de lançamentos manuais (alçada) e anexos | ❌ |
| Importação de lançamentos (planilha, ERP, folha) | ❌ |

### 4.3 Livros e relatórios
| Item | Situação |
|---|---|
| Livro Diário, com termos de abertura e encerramento | ❌ |
| Razão analítico; razão auxiliar de clientes e fornecedores | ❌ |
| Balancete de verificação (mensal, acumulado, comparativo) | ❌ |
| Composição e conciliação de saldos das contas patrimoniais | ❌ |

### 4.4 Encerramento
| Item | Situação |
|---|---|
| Fechamento mensal com **bloqueio real** da competência | 🟡 A tela existe, mas nada impede alterar documentos de uma competência fechada. O parâmetro "Bloqueio de competência encerrada" (`src/lib/controlesStore.ts` L180) é decorativo. |
| Apuração do resultado (receitas e despesas zeradas → ARE → lucros ou prejuízos acumulados) | ❌ |
| Transferência de saldos para o exercício seguinte e balanço de abertura | ❌ |
| Reabertura com justificativa e log | ❌ |

### 4.5 Demonstrações contábeis
| Item | Situação |
|---|---|
| Balanço Patrimonial | ❌ |
| DRE a partir da contabilidade | 🟡 Existe uma DRE **gerencial**, calculada a partir de notas e títulos e com erros (seção 6) |
| DMPL/DLPA, DFC (indireto), DRA; DVA quando aplicável | ❌ |
| Notas explicativas | ❌ |
| Análise horizontal e vertical; indicadores (liquidez, endividamento, margens, EBITDA, ciclo financeiro) | ❌ |
| **Consolidação do grupo** (eliminação de saldos entre empresas; MEP para controladas) | ❌ Relevante, porque o sistema já tem grupos e filiais |

### 4.6 Tributos sobre o lucro e obrigações contábeis
| Item | Situação |
|---|---|
| e-Lalur/e-Lacs: Parte A (adições e exclusões) e Parte B (prejuízo fiscal, base negativa, diferenças temporárias) | 🟡 Só texto explicativo |
| Estimativas mensais, balancete de suspensão/redução, IRPJ/CSLL diferidos | ❌ |
| **ECD** gerada do Diário e do Razão | 🟡 Simulada. Os registros I050, I150 e I200 têm quantidades fixas (148 contas, 2.480 lançamentos) e apontam para tabelas que não existem: `contabil.plano`, `contabil.saldos`, `contabil.lancamentos` (`src/lib/obrigacoesStore.ts` L1036-1049). |
| **ECF** recuperando a ECD e o Lalur | 🟡 Simulada |

---

## 5. Lacuna nº 2: integração com o ERP e contabilização automática

Este é o ponto que mais pesa no modelo que você descreveu.

| Fica no ERP (fonte da verdade) | Fica no Use Contábil |
|---|---|
| Emissão de NF-e, NFC-e e NFS-e; entrada de notas; cadastros de clientes, fornecedores e produtos; pedidos e compras; contas a pagar e receber com as baixas; estoque e custo; folha (ou sistema de RH) | Recepção e validação dos dados; **enriquecimento contábil** (conta, centro de custo, classificação); contabilização; escrituração fiscal; apurações; conciliações; fechamento; demonstrações; obrigações (SPED, ECD, ECF, DCTFWeb, Reinf) |

### 5.1 O que o ERP precisa entregar (contrato de dados)

| Dado | Campos essenciais | Para quê |
|---|---|---|
| Empresas e filiais | CNPJ, IE, IM, regime, CNAE | Chave de todos os dados |
| Participantes | CNPJ/CPF, IE, UF, município, contribuinte de ICMS, optante do Simples, grupo contábil | EFD 0150, retenções, contas analíticas |
| Produtos e serviços | NCM, CEST, origem, unidade, **tipo do item** (revenda, matéria-prima, uso e consumo, imobilizado…), item LC 116/NBS, **cClassTrib** | EFD 0200, créditos, CMV, IBS/CBS |
| Notas emitidas e recebidas | **XML completo, com itens**: CFOP, CST, bases e valores de ICMS/ST/IPI/PIS/COFINS/**IBS/CBS** por item; eventos (cancelamento, CC-e, manifestação) | Escrituração (C100/C170), apurações, contabilização |
| NFS-e (padrão nacional) e CT-e | Serviço; retenções de ISS, IRRF, CSRF e INSS | Reinf R-4000, apuração das retenções |
| Títulos e baixas | Documento de origem, vencimento, valor, juros, multa, desconto, conta bancária, adiantamentos | Clientes e fornecedores contábeis; resultado financeiro |
| Extratos bancários | OFX, CNAB ou Open Finance | Conciliação banco × razão |
| Estoque | Saldos valorizados, custo médio das saídas, inventário | CMV/CPV, Bloco H, Bloco K (indústria) |
| Folha | Resumo por rubrica e centro de custo, encargos, provisões | Lançamentos de folha e provisões; DCTFWeb |
| Ativo imobilizado (se estiver no ERP) | Aquisições e baixas | Imobilizado, CIAP |

### 5.2 Camada de integração (*staging*)
- **Tabelas de entrada** com:
  - o conteúdo bruto (JSON/XML) e um hash;
  - uma **chave de idempotência** (chave da NF-e, ID do título no ERP);
  - status (recebido → validado → contabilizado, ou rejeitado) e mensagens de erro.
- **Validação antes de contabilizar.** Exemplos: CNPJ inválido, CFOP incompatível com a operação, participante sem cadastro, produto sem NCM, conta sem de-para.
- **Alteração ou cancelamento no ERP** gera estorno e novo lançamento, nunca edição silenciosa.
- **Operação:** reprocessamento por lote, log de sincronização real e alertas. Hoje o log de sincronização (`LOG_SYNC`, `src/lib/adminStore.ts` L798) é simulado.
- **Conectores:** API ou webhook do ERP; arquivos (XML, CSV, SPED, OFX); digitação só em último caso.
- **O que já existe:** o esqueleto, só como dados de exemplo sem uso (`CONECTORES_ERP`, `MAPEAMENTO_CONTAS`, `LANCAMENTOS` em `src/lib/contabilMock.ts`).

### 5.3 Regras de contabilização
São tabelas parametrizáveis por empresa ou grupo. Para cada evento, dizem que contas debitar e creditar e com qual valor.

| Evento | Débito | Crédito | Valor |
|---|---|---|---|
| Venda de mercadoria (5102/6102) | Clientes | Receita bruta de vendas | Total da nota |
| | ICMS sobre vendas (dedução) | ICMS a recolher | vICMS |
| | PIS/COFINS sobre faturamento | PIS/COFINS a recolher | vPIS / vCOFINS |
| | CMV | Estoque de mercadorias | Custo médio das saídas (vem do ERP) |
| Compra para revenda (1102/2102) | Estoque (pelo valor líquido dos impostos recuperáveis) + ICMS/PIS/COFINS a recuperar | Fornecedores | Total da nota |
| Compra de uso e consumo (1556/2556) | Despesa (por centro de custo) | Fornecedores | Total da nota |
| Compra de imobilizado (1551/2551) | Imobilizado + ICMS a recuperar (CIAP, 1/48) | Fornecedores | Total da nota |
| Devolução de venda (1202/2202) | Devoluções de vendas + estorno dos impostos | Clientes | Total da nota |
| Recebimento de cliente | Banco + descontos concedidos | Clientes + juros recebidos | Valor da baixa |
| Serviço tomado com retenção | Despesa | Fornecedores + IRRF/CSRF/ISS/INSS a recolher | Valores da NFS-e |
| Folha do mês | Salários e encargos (custo ou despesa, por centro de custo) | Salários a pagar; INSS, FGTS e IRRF a recolher | Resumo da folha |
| Provisão de férias e 13º | Despesa de férias/13º + encargos | Provisões | Cálculo mensal |
| Depreciação | Despesa ou custo de depreciação (por centro de custo) | Depreciação acumulada | Quota do mês (o Patrimônio já calcula) |
| Apuração de ICMS, PIS, COFINS | Tributo a recolher | Tributo a recuperar | Menor valor entre débitos e créditos |

- **Critérios para escolher a regra:** CFOP, natureza da operação, tipo do item, categoria financeira do ERP, participante e filial.
- **Controles da regra:** prioridade, vigência e **prévia dos lançamentos** antes de gravar.

### 5.4 Conciliações ERP × contabilidade (checklist de fechamento)
- **Clientes:** saldo no razão = contas a receber em aberto no ERP.
- **Fornecedores:** saldo no razão = contas a pagar em aberto no ERP.
- **Estoque:** estoque contábil = inventário valorizado do ERP.
- **Tributos:** tributos a recolher no razão = apurações = guias pagas.
- **Banco:** banco no razão = extrato. Hoje o lado "contábil" da conciliação bancária é gerado aleatoriamente (`src/lib/conciliacaoStore.ts` L135).
- **Notas:** notas no ERP = notas escrituradas = notas contabilizadas = notas destinadas na SEFAZ (manifestação).

---

## 6. Lacuna nº 3: números que não fecham (erros de conceito, com prova)

Os itens 1 a 4 foram reproduzidos com testes automatizados temporários (empresa EMP-1, competência 2026-07). Os demais foram verificados no código.

| # | O que acontece | Onde | Impacto |
|---|---|---|---|
| 1 | **Nota de compra vira receita.** Importar em Notas de entrada uma NF-e de compra de R$ 10.000 faz a DRE mostrar R$ 10.000 em "Outras receitas". O resumo também conta a nota como faturamento. | A importação grava a entrada com `grupo: "demais"` (`src/components/contabil/CrudDocumentosFiscais.tsx` L270), e a DRE soma "demais" como receita (`src/lib/dreStore.ts` L204-205) | Receita e resultado inflados |
| 2 | **DRE com dados aleatórios.** Sem nenhum cadastro, a DRE mostra CMV −61.863,87, despesas administrativas −83.379,08 e prejuízo de −217.450,84. | `titulos()` gera de 16 a 21 títulos pseudoaleatórios por empresa e mês, marcados como "ERP Principal · Sync" (`src/lib/contasCaixaStore.ts` L191-221). No teste, foram R$ 207.368,38 em títulos a pagar. A DRE usa esses títulos para CMV e despesas (`dreStore.ts` L250). | Resultado fictício em produção |
| 3 | **Duas bases de notas.** Uma venda de R$ 50.000 digitada em Fiscal › Saídas dá receita 0 na DRE. Uma venda de R$ 30.000 lançada em Financeiro › Faturamento entra na DRE, mas não na apuração de PIS/COFINS. | O Fiscal usa `fiscalStore` (só cabeçalho). DRE e movimentos usam `tributarioStore`. Só a importação de XML liga as duas. | Cada tela mostra um faturamento diferente |
| 4 | **Depreciação sem empresa.** Os 14 bens de exemplo (R$ 20.082,46 por mês) entram na DRE de qualquer empresa. | `resumoPatrimonio(competencia)` é chamado sem `empresaId` (`dreStore.ts` L231) | Despesa na empresa errada |
| 5 | **Nota cancelada é tratada como devolução** | `dreStore.ts` L207-208 | Nota cancelada não produz efeito. Devolução é outra nota (CFOP 1201/1202/2201/2202…). |
| 6 | **CMV = títulos a pagar de fornecedores e fretes** | `dreStore.ts` L151 e L250 | CMV é estoque inicial + compras − estoque final (ou o custo das saídas informado pelo ERP), por competência. Não é o vencimento de títulos. |
| 7 | **PIS/COFINS tira da base as vendas com ICMS-ST** | `src/lib/apuracaoStore.ts` L339 | A ST de ICMS não retira a receita da base de PIS/COFINS. O que sai é o próprio valor do ICMS-ST e os itens monofásicos ou de alíquota zero, identificados pela **CST do item**. |
| 8 | **PIS/COFINS não exclui o ICMS da base** (débitos: Tema 69 do STF; créditos: Lei 14.592/2023) **e não usa CST por item** | `apuracaoStore.ts`: base = valor total do documento | Débitos maiores que o devido; créditos calculados errado |
| 9 | **IRPJ/CSLL no Lucro Presumido:** exclui da receita as vendas com ST e calcula mês a mês, com adicional acima de R$ 20 mil | `apuracaoStore.ts` L849 | O presumido é **trimestral** (adicional acima de R$ 60 mil no trimestre), e a ST não reduz a receita |
| 10 | **Lucro Real = receitas − todas as entradas** | `apurarIrpjCsll` (`apuracaoStore.ts` L834) | Compra de estoque ou de imobilizado não é despesa. O cálculo ignora folha, depreciação, resultado financeiro e adições/exclusões. |
| 11 | **Os itens da NF-e são descartados** | O leitor de XML (`src/lib/nfeXml.ts`) lê os itens, mas só o cabeçalho é gravado | Sem C170, sem crédito por item, sem estoque, sem IBS/CBS por item |
| 12 | **Competência encerrada continua editável, e as permissões não são aplicadas** | `fecharPeriodo` (`src/lib/gestaoStore.ts` L272) não bloqueia nada. `PERMISSOES_PADRAO` (`src/lib/controlesStore.ts` L242) só é consultado na própria tela de Controles. | Sem segregação de funções e sem integridade do fechamento |
| 13 | **O modo prática não isola 11 stores:** admin, apuração, conciliação, contratos, controles, DRE, dados da empresa, escrituração, filiais, financeiro, patrimônio | Chaves de armazenamento sem o sufixo `.pratica` | Dados de treino misturados com dados reais |
| 14 | **Patrimônio permite "Reavaliação"** | `src/lib/patrimonioStore.ts` L128 e L653; `src/pages/contabil/administrativo/Patrimonio.tsx` L896 | Reavaliação espontânea de ativos é vedada desde a Lei 11.638/2007 |
| 15 | **Parâmetros da empresa não fazem nada.** Exemplo: "Regime PIS/COFINS: Não cumulativo" é ignorado, porque o cálculo decide só por `regime === "Lucro Real"`. | `src/pages/contabil/EmpresaParametros.tsx` L26-31; `apuracaoStore.ts` L321 | Configuração enganosa |
| 16 | **Obrigações desatualizadas** | A GIA-SP ainda é gerada (`obrigacoesStore.ts` L1428), inclusive com um pacote de "novos campos da GIA-SP" para 2026.07 (L300). "DCTF mensal" e "DCTF" aparecem nos dados de exemplo e no calendário de guias (`contabilNavAreas.tsx` L198; `guiasStore.ts` L394). O gerador principal já usa DCTFWeb, o que está certo. | Ver seção 8 |

**Corrigidos em 01/10/2026 (PR desta branch):** itens **1, 2, 4, 5, 13, 14 e 16**. Os itens 3, 6 a 12 e 15 continuam abertos (dependem do razão e da fase 3 do roteiro). Testes de regressão em `src/test/dre.test.ts`, `src/test/isolamentoPratica.test.ts`, `src/test/patrimonioEObrigacoes.test.ts` e `src/test/importacaoPlanilha*.test.tsx`.

---

## 7. Lacuna nº 4: plataforma (dados, multiusuário e auditoria)

- **Os dados contábeis e fiscais ficam no localStorage do navegador.** Isso vale para documentos, apurações, DRE, patrimônio e conciliações.
  - O limite é de cerca de 5 MB, e os dados se perdem ao limpar o navegador.
  - Não há compartilhamento entre usuários, nem backup, nem auditoria.
  - Só empresas, filiais e grupos estão no Supabase.
- **Empresas isoladas por usuário.** A regra de acesso é `user_id = auth.uid()`, então outro contador da equipe não enxerga a mesma empresa. É preciso um modelo organização → membros → papéis → empresas, com acesso liberado por participação na organização.
- **Falta trilha de auditoria imutável** (quem, quando, antes e depois) para lançamentos, documentos e fechamentos. Nada contabilizado deve ser apagado, só estornado.
- **Há tabelas de outro projeto no Supabase:** `lessons`, `role_plays`, `sessions`, `pencil_scores`, `tracks`, `knowledge_docs`. Precisam ser limpas.
- **Cadastros duplicados**, em vez de uma fonte única vinda do ERP:
  - **clientes e fornecedores:** Administrativo › Clientes/Fornecedores (exemplo do ERP), Financeiro › Clientes e fornecedores (`tributarioStore`) e o participante digitado em cada nota;
  - **produtos:** Administrativo › Produtos, Financeiro › Produtos e Financeiro › Serviços;
  - **contas bancárias:** Preparativos › Empresa › Pagamentos, Administrativo › Bancos e contas, Caixa e tesouraria (`CONTAS_TESOURARIA`) e Conciliação bancária (lista fixa `BANCOS`).
- **Funções de ERP dentro do sistema contábil:** compras, cobrança, cadastro de títulos, emissão. Se o ERP é a fonte, essas telas devem virar **consulta com enriquecimento contábil**. Do contrário, haverá duas verdades.

---

## 8. Lacuna nº 5: atualização legal (urgente)

| Tema | Situação legal (set/2026) | No sistema |
|---|---|---|
| **IBS/CBS** | 2026 é ano de teste: CBS 0,9% + IBS 0,1%, sem recolhimento para quem cumpre as obrigações acessórias. Desde 03/08/2026, documento sem os campos de IBS/CBS é rejeitado (regime regular). A NF-e exige CST e cClassTrib por item (NT 2025.002). Em 2027 vêm a CBS plena, o fim de PIS/COFINS e o Imposto Seletivo. | ❌ Nenhuma menção a IBS, CBS, IS ou cClassTrib no código |
| **DCTF** | Substituída pela DCTFWeb (via MIT) para fatos geradores desde 01/01/2025 | ✅ Feito em 01/10/2026: DCTFWeb no gerador, nos catálogos, nos dados de exemplo e no calendário de guias |
| **GIA-SP** | Dispensada para todo o RPA a partir de jan/2026 (Portaria SRE 02/2025). A GIA-ST também deixou de ser exigida (Portaria SRE 06/2025). | ✅ Feito em 01/10/2026: GIA fora do gerador e dos exemplos; as obrigações estaduais ficam com Sintegra, DeSTDA e declarações do ISS |

**O que a reforma exige de um sistema contábil:**
- campos por item: CST e cClassTrib de IBS/CBS, base, alíquota, valor, redução;
- contas contábeis próprias (IBS/CBS a recuperar e a recolher);
- apuração assistida, com conferência contra o que a Receita e o Comitê Gestor apurarem;
- relatórios de transição (PIS/COFINS × CBS);
- em 2027, *split payment*.

---

## 9. Roteiro sugerido

A ordem evita construir em cima de areia: primeiro a base de dados, depois o núcleo contábil, depois a integração.

| Fase | Entregas | Por que nessa ordem |
|---|---|---|
| **0. Fundação** | Banco de dados (Supabase/Postgres) para todo dado contábil e fiscal; organização, membros, papéis e regras de acesso; trilha de auditoria; bloqueio real de competência; geradores aleatórios fora de produção (só no modo prática); limpeza das tabelas antigas | Sem isso, nada é confiável nem compartilhável |
| **1. Núcleo contábil** | Plano de contas com referencial RFB; centros de custo; históricos padrão; saldos de abertura; lançamentos em partidas dobradas com lotes e estorno; Diário, Razão e Balancete; apuração do resultado; encerramento; Balanço e DRE a partir do razão | É o que torna o sistema "contábil" |
| **2. Integração com o ERP** | Contrato de dados; staging; conectores (começar por XML + API/CSV do seu ERP); **documento fiscal único, com itens**; de-para; regras de contabilização com prévia; contabilização automática de notas, baixas, depreciação e folha; painel de conciliação ERP × contabilidade | Acaba com a digitação e a duplicidade |
| **3. Tributos corretos** | PIS/COFINS refeito (CST por item, exclusão do ICMS); IRPJ/CSLL refeito (presumido trimestral; Real a partir do lucro contábil com Lalur Partes A e B); IBS/CBS; correção dos itens da seção 6 | Depende dos itens das notas e do razão |
| **4. Obrigações reais** | ECD gerada do Diário; ECF (ECD + Lalur); EFD ICMS/IPI e Contribuições com C170; Reinf; DCTFWeb; retirada de DCTF e GIA-SP | Depende das fases 1 a 3 |
| **5. Gestão e grupo** | DFC, DMPL, notas explicativas, consolidação com eliminações, orçamento × realizado, indicadores | Valor gerencial |

**Correções rápidas, que independem das fases (feitas em 01/10/2026, exceto onde indicado):**
- itens 1, 4, 5, 14 e 16 da seção 6 ✅;
- sufixo do modo prática nos 11 stores (item 13) ✅;
- esconder da DRE os títulos simulados até existir integração real (item 2) ✅;
- itens 7 e 9 (PIS/COFINS e IRPJ/CSLL) ⏭️ pendentes — dependem de CST por item e do lucro contábil.
- importação do plano de contas e do balancete de abertura por planilha (CSV/Excel) ✅.

---

## Apêndice A: modelo de dados mínimo do núcleo contábil (rascunho)

```text
organizacoes(id, nome)
membros(org_id, user_id, papel)                           -- acesso por participação
empresas(id, org_id, cnpj, ..., plano_id, inicio_exercicio, data_abertura)

plano_contas(id, org_id, nome)
contas(id, plano_id, codigo, descricao, tipo[S|A], natureza[D|C], nivel, pai_id,
       grupo[ativo|passivo|pl|receita|custo|despesa], ativa)
contas_referenciais(conta_id, codigo_rfb, tipo_plano)     -- ECD I051 / ECF
centros_custo(id, org_id, codigo, descricao, pai_id)
historicos_padrao(id, org_id, codigo, texto)

periodos(empresa_id, competencia, status[aberto|fechado], fechado_por, fechado_em)
lotes(id, empresa_id, origem[manual|nf|titulo|folha|depreciacao|apuracao|encerramento], criado_por)
lancamentos(id, lote_id, empresa_id, numero, data, historico,
            origem_tipo, origem_id, estorno_de_id, criado_por, criado_em)
partidas(id, lancamento_id, conta_id, centro_custo_id, participante_id, debito, credito)
saldos(empresa_id, conta_id, competencia, debitos, creditos, saldo_final)   -- materializado

regras_contabilizacao(id, org_id, evento, criterio(cfop|natureza|tipo_item|categoria),
                      prioridade, vigencia_ini, vigencia_fim)
regras_partidas(regra_id, lado[D|C], conta_id, formula[total|icms|pis|cofins|ibs|cbs|...])

integ_lotes / integ_registros(payload, hash, chave_idempotencia, status, erro)
documentos_fiscais + documento_itens                      -- fonte única, tributos por item
auditoria(tabela, registro_id, acao, antes, depois, usuario, em)
```

## Apêndice B: fontes externas
- Makro, módulos integrados (Contábil com plano unificado e lançamentos automáticos; Fiscal com notas contabilizadas automaticamente; Financeiro com honorários e boletos): https://makrosystem.com.br/blog/modulos-contabeis-integrados/
- Makro Financeiro, "destinado ao escritório contábil e não aos seus clientes": https://makrosystem.com.br/blog/controle-as-financas-do-seu-escritorio-contabil-com-o-makro-financeiro/
- Campos de IBS/CBS obrigatórios desde 03/08/2026: https://ibslab.com.br/noticias/campos-ibs-cbs-obrigatorios-documentos-fiscais-agosto-2026 e https://crcmg.org.br/noticias/nfs-e-nacional-campos-de-ibs-e-cbs-tornam-se-obrigatorios-em-agosto/
- DCTF substituída pela DCTFWeb/MIT: https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2024/dezembro/receita-federal-divulga-esclarecimentos-iniciais-sobre-a-substituicao-da-dctf-a-partir-de-janeiro-de-2025
- Eliminação da GIA em SP: https://www.totvs.com/blog/fiscal-clientes/sefaz-sp-eliminacao-da-gia-e-alteracoes-de-procedimentos-fiscais/ e https://sigaofisco.com.br/gia-st-sera-eliminada-a-partir-de-julho-de-2025-em-sp/
- ICMS fora da base dos créditos de PIS/COFINS (Lei 14.592/2023): https://www.moorebrasil.com.br/blog/exclusao-do-icms-da-base-de-calculo-dos-creditos-de-pis-e-de-cofins/
