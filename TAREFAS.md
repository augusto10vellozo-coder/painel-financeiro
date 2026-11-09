# Tarefas — Painel Financeiro

Backlog priorizado. Atualizar ao concluir. A ordem importa: **não refinar estética antes de fechar os bugs de cálculo**.

## 0. Preparação

- [ ] **Obter o código do app.** Clonar o repositório conectado ao Lovable (ou exportar o código) para dentro desta pasta, ex.: `app/`.
- [ ] **Confirmar o ambiente Supabase** em uso (projeto, URL, chave anon) e se as migrations estão versionadas no repositório.
- [ ] **Rodar o app localmente** e reproduzir os 7 bugs abaixo para confirmar que ainda existem.

## 1. Correções bloqueantes (regra de negócio)

- [ ] **BUG-1 — Saldo acumulado incorreto.**
      Saldo = saldo inicial de todas as contas + todos os lançamentos de competências ≤ ativa.
      Alternativa aceitável: renomear o card para "Resultado do mês" e criar um card separado de saldo acumulado.
      *Decidir qual dos dois caminhos antes de implementar.*
- [ ] **BUG-2 — Herança de orçamento (R4).**
      Ao abrir competência sem orçamento, buscar o registro da competência anterior mais próxima do mesmo escopo, exibir com etiqueta "herdado" e **não gravar**. Só grava ao salvar.
- [ ] **BUG-3 — Reserva de emergência editável (R6).**
      Card em Pessoal e em Configurações, com meta e saldo editáveis; **zero é válido**; origem manual nunca é sobrescrita por cálculo.
- [ ] **BUG-4 — Saldo inicial das contas.**
      Popular os saldos iniciais reais (ou permitir edição clara na tela de contas). Depende do BUG-1.
- [ ] **BUG-5 — Filtro de escopo em todas as listagens (R1).**
      Contas, categorias, orçamentos, metas e lançamentos devem respeitar o escopo ativo. Auditar todas as queries.

## 2. Correções de interface

- [ ] **BUG-6 — Placeholder truncado** no campo de busca de Lançamentos ("Buscar descri...").
- [ ] **BUG-7 — Rótulo enganoso "vs. setembro"** quando não há dados do mês anterior. Omitir a comparação ou exibir "sem dados".

## 3. Consolidação da Fase 1

- [ ] Testar os critérios de aceite da Fase 1 (ver `docs/especificacao-fase1-backend.md`, seção 9), em especial:
  - [ ] isolamento entre usuários via RLS;
  - [ ] competência isolada (lançamento de outro mês não aparece);
  - [ ] reserva aceita e persiste zero;
  - [ ] orçamento herdado não grava;
  - [ ] categoria com lançamentos não pode ser excluída;
  - [ ] CSV abre no Excel com acentos.
- [ ] Revisar `atualizado_em` automático em todas as escritas (R9).
- [ ] Revisar trigger de coerência categoria × escopo × tipo do lançamento.

## 4. Fase 2 — Front-end

Seguir `docs/especificacao-fase2-frontend.md` na ordem:

- [ ] Tokens e layout base (sidebar + topbar).
- [ ] Componentes reutilizáveis (KPI, badges, barra de orçamento, tabela, campo monetário, estado vazio, toast, modal).
- [ ] Autenticação e seleção de competência.
- [ ] Dashboard.
- [ ] Lançamentos.
- [ ] Receitas e Custos.
- [ ] Pessoal e Empresa.
- [ ] Relatórios (comparativos + exportar CSV + imprimir).
- [ ] Metas e Configurações.
- [ ] Responsividade e modo escuro.
- [ ] Polimento visual final (só depois de tudo funcionando).

## 5. Futuro / não bloqueante

- [ ] Definir se recorrências entram nesta versão (R7) e como.
- [ ] Revisar limites de crédito do Lovable e plano de migração para desenvolvimento local.
- [ ] Backup do banco e política de restore.
