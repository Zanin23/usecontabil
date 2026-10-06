> **Rodada mais recente (execução real, não revisão estática):** [VALIDACAO_ROTAS_E_TELAS_2026-10-06.md](VALIDACAO_ROTAS_E_TELAS_2026-10-06.md) —
> varredura de **172 rotas/telas (0 avisos, 0 falhas)**, **17 fluxos funcionais**, lint em **0 erros** e a suíte completa em **342 testes**.
> Nove defeitos reais corrigidos, incluindo o cadastro de empresa que abria em branco, rotas inexistentes sem 404,
> a barreira de erro do app e 28 CNPJs de demonstração com dígito verificador inválido.
> O texto abaixo é o registro da rodada anterior (05/10/2026), mantido como histórico.

# Validação de rotas e telas — Use Contábil

**Data:** 05/10/2026  
**Escopo:** navegação React Router, menu `AREAS`, links de lições e destinos dos checklists de fechamento.

## Resultado executivo

- O menu principal contém **5 áreas, 23 categorias e 102 módulos**. Todos têm correspondência com as rotas genéricas de área, categoria e módulo em `src/App.tsx` (`/:area`, `/:area/:categoria` e `/:area/:categoria/:modulo`).
- O App declara **109 padrões de rota**, incluindo telas específicas, redirecionamentos e parâmetros dinâmicos. Rotas inválidas terminam em `NotFound`.
- Foi encontrado e corrigido um destino desatualizado de conciliação bancária usado em tarefas de fechamento. Modelos já salvos no navegador também são migrados para a rota válida.
- A cobertura de rotas é boa; isso **não significa que todos os 102 módulos tenham uma tela operacional completa**. Muitos usam tabelas genéricas, dados demonstrativos ou fluxos de protótipo.
- Foi criada a área **Simples & MEI**, que cobre a lacuna de uma visão operacional simplificada para empresas desses regimes.

## Rotas revisadas e correção feita

| Achado | Situação | Tratamento |
|---|---|---|
| Menus de áreas, categorias e módulos | ✅ Cobertos | Teste percorre os 102 módulos do mapa de navegação e verifica se cada URL casa com uma rota declarada. |
| Atalhos das lições da Central de Aprendizado | ✅ Cobertos | Rotas principais e extras também são verificadas em teste. |
| Destino da tarefa de conciliação (`/financeiro/operacional/conciliacao-bancaria`) | ❌ Não existia no App; o caminho válido é `/financeiro/operacional/conciliacao` | Corrigidos os modelos padrão, a rota de fallback e os textos do PDF. Ao carregar dados antigos, o modelo salvo é migrado para o caminho atual. |
| Documentação PDF de rotas administrativas | 🟡 Alguns caminhos tinham nomes antigos | Atualizados para as rotas reais de domínio e de contas/caixa. |
| Fluxo simples para empresas do Simples/MEI | ❌ Não havia uma visão compacta unificada | Criadas quatro telas: visão geral, empresas, faturamento informado e obrigações/lembretes. |

## Telas que já existem para o Simples/MEI

O sistema completo já tinha a apuração do Simples Nacional, DEFIS, tabela de referência SIMEI, cadastro de regime e checklists de fechamento. A lacuna era reunir o básico num fluxo curto, especialmente para acompanhar faturamento e pendências de MEI.

A nova navegação é:

- `/simples-mei` — indicadores da carteira, faturamento do mês/ano, pendências e referência de receita do MEI;
- `/simples-mei/empresas` — empresas filtradas a partir do cadastro central;
- `/simples-mei/receitas` — lançamento manual e consulta do faturamento informado;
- `/simples-mei/obrigacoes` — lembretes por empresa/período, checklist mensal e lembrete anual, com conclusão/reabertura.

A tela usa as empresas já cadastradas; não cria uma segunda ficha cadastral. O checklist evita duplicar tarefas para a mesma empresa, período e título.

## Limites funcionais importantes

A nova área é deliberadamente um **controle gerencial leve**, não um novo motor tributário:

1. Faturamentos e lembretes são manuais e ficam em `localStorage`, separados no modo prática; não sincronizam entre usuários/dispositivos.
2. A tela não emite notas, não importa extratos e não calcula DAS, alíquota efetiva ou imposto devido.
3. O acompanhamento de receita do MEI usa **R$ 81.000 como referência interna**, não como determinação de enquadramento. O texto da tela pede revisão do limite e da proporcionalidade conforme o ano e a situação da empresa.
4. Não há transmissão ou consulta real de PGDAS-D, DAS, DEFIS, DASN-SIMEI, Receita Federal, SEFAZ ou prefeitura. O lembrete anual apenas organiza trabalho.
5. No motor atual, a apuração chamada “Simples Nacional” é exclusiva de empresas com regime Simples Nacional. O código não implementa um motor próprio do SIMEI/MEI; portanto, a tela simplificada não encaminha MEI para o cálculo do Simples.

## Pendências recomendadas para uma próxima etapa

### Prioridade alta

- Criar persistência remota com isolamento por empresa/usuário e permissões de equipe para faturamento e checklists.
- Implementar regras/versionamento para SIMEI e limites por ano, após validação técnica/contábil, sem reutilizar o cálculo de alíquota do Simples.
- Integrar documentos de receita e guias de forma idempotente, mantendo revisão e origem rastreável.
- Acrescentar uma tela própria de acompanhamento da DASN-SIMEI e vencimentos oficiais, sem alegar transmissão automática.

### Prioridade média

- Anexar comprovantes e arquivos por empresa/competência.
- Adicionar filtro/exportação do faturamento e histórico de alterações.
- Permitir configurar o parâmetro de comparação do MEI por ano-calendário, incluindo início de atividade.
- Converter módulos genéricos que precisam de uso diário em telas com formulário, validação e persistência próprios.

## Como a validação fica protegida por testes

`src/test/rotasCobertura.test.ts` verifica rotas do menu, lições, destinos de tarefas, a navegação nova e a migração do endereço legado. `src/test/simplesMeiStore.test.ts` valida faturamento, validações, duplicidade de lembretes e isolamento do modo prática. `src/test/simplesMeiTela.test.tsx` cobre filtragem de regimes e o lançamento pela interface.
