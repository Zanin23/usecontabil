# Project Memory

## Core
Use Contábil é contabilidade **interna** de uma empresa/grupo — NÃO é sistema para escritório contábil que atende clientes externos. Nunca usar termos como "cliente", "honorários", "empresas atendidas", "escritório contábil" para se referir aos usuários/entidades do sistema. Usar "empresa", "filial", "unidade", "grupo".
Todos os dados fiscais/eSocial/Receita são apenas visuais/mock — sem integração real com órgãos oficiais.
Competência padrão: 2026 (Fev–Jul/2026).
Nunca apagar/limpar/resetar dados (nuvem ou localStorage) automaticamente ao abrir o sistema, nem com base em flag guardada no navegador. Ações destrutivas só por clique explícito do usuário, com caixa de confirmação (AlertDialog). Um "reset único" automático já apagou as empresas da nuvem em todo navegador novo; o teste src/test/primeiroAcesso.test.tsx protege contra isso — mantenha-o passando.
