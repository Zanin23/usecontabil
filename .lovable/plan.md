## Objetivo

Transformar a categoria **Fiscal › Obrigações acessórias** (hoje telas de listagem mockadas) em um módulo funcional, no mesmo padrão do módulo de Apurações: hub com cartões grandes por obrigação, motores independentes de geração/validação/transmissão e uma camada comum de auditoria, versionamento e monitoramento.

Tudo continua **interno e visual** — nenhuma comunicação real com Receita Federal, SEFAZ ou prefeituras. Geração de arquivo, assinatura e transmissão são simuladas de forma realista (protocolos, recibos, logs, tempos de processamento).

## Arquitetura

**Camada de dados — `src/lib/obrigacoesStore.ts`**
Motor único com registro de obrigações, cada uma com seu gerador próprio. Lê dados reais já existentes no app: documentos fiscais (`fiscalStore`), escrituração (`escrituracaoStore`), apurações (`apuracaoStore`), empresa e filiais.

Por obrigação e competência, guarda: status, versão do layout, blocos/registros gerados, validações, inconsistências, advertências, versões do arquivo, assinaturas, transmissões, protocolos e log imutável de auditoria. Persistência em localStorage, no mesmo padrão dos demais stores.

**Motores de geração** (um por obrigação, desacoplados):
- SPED Fiscal (EFD ICMS/IPI) — blocos 0, C, D, E, H, G, 9
- EFD-Contribuições — blocos 0, A, C, D, F, M, 1, 9
- ECD e ECF — plano de contas, lançamentos, LALUR/LACS, recuperação da ECD
- DCTF / DCTFWeb — débitos, créditos, vinculações, DARF
- EFD-Reinf — eventos R-1000, R-2010, R-2020, R-2055, R-2099
- Estaduais e municipais — GIA, Sintegra, DeSTDA, DES, DECLAN, ISS, NFTS

Cada motor declara seu layout: versão vigente, versões anteriores, registros, campos obrigatórios/condicionais, tipos, tamanhos e dependências entre blocos.

**Motor de validação**
Conjunto de regras executadas antes da geração, classificadas em erro / advertência / pendência: empresa sem contador ou sem certificado, CFOP incompatível com CST, NCM ausente, natureza da receita inválida, participante duplicado, documento sem chave, período fechado, obrigação já transmitida, base divergente da apuração, entre outras.

**Cruzamentos inteligentes**
Comparação automática entre módulos: SPED Fiscal × EFD-Contribuições, ECF × ECD, DCTFWeb × apuração de retenções, Reinf × documentos com retenção, PGDAS × notas emitidas. Divergências viram inconsistências rastreáveis.

## Telas

**Hub — `/fiscal/obrigacoes`**
Cartões grandes por obrigação com indicadores ao vivo (arquivos gerados, transmitidos, pendências, erros, advertências, última transmissão) e botão "Abrir obrigação". Acima, painel de monitoramento: pendentes, transmitidas, em processamento, rejeitadas, com advertências, vencidas e próximas do vencimento.

**Dashboard da obrigação — componente compartilhado `ObrigacaoView.tsx`**
Cabeçalho com empresa, filial, competência, obrigação, status, versão do layout, responsável e última atualização. Faixa de KPIs. Abas: Resumo · Dados · Blocos · Registros · Validações · Pendências · Advertências · Transmissões · Protocolos · Arquivos · Auditoria · Configurações.

**Visualização hierárquica de registros**
Árvore Bloco → Registro → linhas. Ao clicar em um registro, painel lateral com origem do dado (tabela, documento, campo), valor, regra aplicada, legislação, número da linha no arquivo e memória de geração completa.

**Fluxo operacional guiado**
Barra de progresso em 12 etapas — importação, validação, cruzamento, inconsistências, correções, geração, assinatura, validação PVA, transmissão, protocolo, armazenamento, auditoria — com feedback visual de processamento em tempo real.

**Agenda fiscal — `/fiscal/obrigacoes/agenda`**
Calendário por competência com prazo legal, status, responsável, prioridade, dias restantes e alertas automáticos de vencimento.

**Assinatura digital**
Integrada aos certificados já cadastrados em Preparativos › Empresa › Certificados: seleção do certificado, validação de validade, histórico de assinaturas. Simulada, sem uso real de chave privada.

## Detalhes técnicos

- Novos arquivos: `src/lib/obrigacoesStore.ts` (motores + validações + cruzamentos), `src/components/contabil/ObrigacaoView.tsx`, `src/components/contabil/RegistrosSped.tsx`, páginas em `src/pages/contabil/fiscal/obrigacoes/` (Hub, Agenda e 6 obrigações), rotas em `src/App.tsx`.
- Reutiliza os padrões existentes: Card/Tabs/Sheet do design system, IA ajudante (`AssistenteCampos` / `AssistenteFechamento`), competência global e empresa atual via contextos.
- `contabilNavAreas.tsx` passa a apontar a categoria "Obrigações acessórias" para as rotas reais.
- `gestaoStore.ts` ganha pendências de obrigações, refletidas no painel de fechamento em Serviços › Gestão.
- Filtros rápidos por competência, empresa, obrigação, status e responsável; busca global já existente (⌘K) indexa as novas telas.
- Dark mode e responsividade seguem o padrão atual.

## Fora do escopo

Transmissão real a órgãos governamentais, assinatura criptográfica real com certificado, integração com e-mail/Teams/Slack e persistência em banco (o módulo segue em localStorage como o restante do sistema). Quando quiser levar isso ao banco, vale um passo separado com controle de acesso por empresa/filial e logs somente-inserção.
