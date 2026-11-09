# Painel Financeiro — Contexto do Projeto

> Documento de transferência de contexto. Reúne as decisões, a especificação e o estado atual do projeto, para que qualquer IA ou pessoa continue o trabalho sem depender da conversa original.
>
> **Última atualização:** 03/11/2026
> **Fonte:** `docs/original/historico-projeto-painel-financeiro.docx` (documento de transferência produzido na ferramenta anterior)

---

## 1. Resumo executivo

Painel de gestão financeira que consolida as finanças **pessoais** e de uma **empresa** em uma única base, com três escopos de visualização: **Pessoal**, **Empresa** e **Consolidado**.

O projeto começou como protótipo visual, evoluiu para especificação técnica formal e foi implementado no **Lovable**. O app está publicado em um preview e encontra-se em **fase de correção de regras de negócio** — os bugs de cálculo precisam ser resolvidos antes de qualquer refinamento visual.

## 2. Origem e abordagem

- O painel é para **uso de longa duração**, não um mockup descartável.
- Referência visual inicial: dashboard de ações (estilo "Stocks") — sidebar, topbar, cards brancos, fundo cinza-claro, acento **roxo royal**.
- Para economizar créditos do Lovable, o trabalho foi dividido em duas fases:
  - **Fase 1** — dados, back-end, autenticação e regras de negócio.
  - **Fase 2** — front-end, navegação e experiência visual.
- Antes de gastar crédito, foi construído um **protótipo HTML interativo** (9 telas navegáveis, 7 iterações) para validar comportamento e estilo.

## 3. Decisões do usuário (registrar literalmente)

1. **Recorte de período:** tela inicial de seleção de competência (mês/ano) antes de entrar no painel.
2. **Padrão ao abrir:** o período escolhido na última visita, persistido.
3. **Tipo de recorte:** mês específico. **Não** usar intervalos livres, trimestre ou acumulado nesta fase.
4. Ao trocar de escopo (Pessoal/Empresa/Consolidado), o **card de orçamento mensal troca junto**, com conjuntos de categorias distintos por escopo.
5. O orçamento do **Consolidado** é a soma de Pessoal + Empresa, em **modo leitura**.
6. A **reserva de emergência** deve ser totalmente editável, **aceitar ZERO** e nunca reverter ao valor de exemplo.
7. **Estilo visual aprovado:** o do protótipo. A paleta deve ficar em **tokens**, não em valores soltos.

## 4. Telas e responsabilidades

| Tela | Exibe | Edita | Fonte dos dados |
|---|---|---|---|
| Autenticação | Login e cadastro de usuário | Credenciais de acesso | `profiles` |
| Seleção de Competência | Calendário de mês/ano para escolher a competência ativa | Competência ativa (persistida) | `configuracoes_usuario` |
| Dashboard | Saldo acumulado, entradas, saídas, resultado, orçamento mensal por escopo, reserva de emergência | Nada (somente leitura) | `lancamentos`, `orcamentos`, `contas`, `reserva_emergencia` |
| Lançamentos | Lista filtrável de receitas e despesas, com status Pago | CRUD completo de lançamentos | `lancamentos`, `categorias`, `contas` |
| Receitas | Lançamentos do tipo receita do escopo/competência ativos | CRUD de receitas | `lancamentos` (tipo=receita) |
| Custos | Lançamentos do tipo despesa do escopo/competência ativos | CRUD de despesas | `lancamentos` (tipo=despesa) |
| Pessoal | Finanças pessoais: lançamentos, orçamento por categoria, reserva de emergência | Lançamentos e orçamentos de escopo Pessoal | `lancamentos`, `orcamentos` (escopo=Pessoal) |
| Empresa | Finanças da empresa: lançamentos e orçamento por categoria (com herança) | Lançamentos e orçamentos de escopo Empresa | `lancamentos`, `orcamentos` (escopo=Empresa) |
| Relatórios | Agregações por categoria e evolução por competência do período | Filtros de exibição | `lancamentos`, `categorias` |
| Metas | Metas financeiras e progresso (limitado a 100%) | CRUD de metas | `metas` |
| Configurações | Contas, categorias, reserva de emergência, meses de reserva desejados, preferências | Contas, categorias, reserva, configurações gerais | `contas`, `categorias`, `reserva_emergencia`, `configuracoes_usuario` |

### 4.1 Orçamento mensal por escopo

- **Pessoal:** Moradia, Alimentação, Transporte, Saúde, Lazer, Educação, Outros.
- **Empresa:** Folha de pagamento, Fornecedores, Impostos, Marketing, Software e assinaturas, Logística, Outros.
- **Consolidado:** soma calculada de Pessoal + Empresa, em modo leitura, **nunca editável diretamente**.

## 5. Modelo de dados

Oito entidades, todas com isolamento por `user_id` via **RLS**:

| Entidade | Campos principais |
|---|---|
| `profiles` | id, nome, e-mail, preferências |
| `contas` | id, user_id, nome, escopo, tipo, saldo_inicial, ativo |
| `categorias` | id, user_id, escopo, tipo (receita/despesa), nome, cor, arquivada |
| `lancamentos` | id, user_id, escopo, tipo, valor (inteiro em centavos), descricao, data_competencia (DATE), categoria_id, conta_id, pago, recorrencia_id |
| `orcamentos` | id, user_id, escopo, categoria_id, competencia, limite_centavos, herdado_de_competencia |
| `metas` | id, user_id, descricao, valor_alvo_centavos, valor_atual_centavos, prazo |
| `reserva_emergencia` | id, user_id, valor_manual_centavos, origem (manual/calculada), meses_desejados |
| `configuracoes_usuario` | id, user_id, competencia_ativa, tema, padrao_escopo |

### Decisões técnicas irreversíveis

- Valores monetários em **CENTAVOS como inteiro (bigint)** — nunca float.
- Valor de lançamento **sempre positivo**; o sinal é derivado do campo `tipo`.
- `data_competencia` como **DATE**.
- **RLS por `user_id`** em todas as tabelas.
- **Consolidado nunca é gravado** — sempre calculado em tempo de consulta.

> O schema detalhado (campo a campo, com tipos e checks) está em [`docs/especificacao-fase1-backend.md`](docs/especificacao-fase1-backend.md).

## 6. Regras de negócio que não podem ser violadas

| Regra | Descrição |
|---|---|
| **R1** | Todo acesso a dados filtrado por `user × escopo × competência`. |
| **R2** | Valor de lançamento sempre positivo, com sinal derivado do campo `tipo`. |
| **R3** | Orçamento com percentual **nulo** quando o limite for zero; nunca divisão por zero. |
| **R4** | Herança de orçamento apenas **lê** da competência anterior; **nunca grava**. |
| **R5** | Metas limitadas a **100%** na exibição. |
| **R6** | Reserva de emergência: origem **manual** tem precedência absoluta sobre o cálculo automático, e **ZERO é valor válido**. |
| **R7** | Recorrências **não podem duplicar** lançamentos no mesmo mês. |
| **R8** | Categorias com lançamentos **não podem ser excluídas**, apenas arquivadas. |
| **R9** | Campo `atualizado_em` preenchido automaticamente em toda escrita. |

## 7. Estado atual da implementação

O app foi gerado no Lovable e está publicado em um preview. A Fase 1 foi **em grande parte cumprida**. O registro abaixo resulta da inspeção de cinco telas.

### 7.1 O que funciona (validado)

- Autenticação com login.
- Seletor de competência (Outubro 2026) com navegação por setas de mês anterior/próximo.
- Seletor de escopo Pessoal/Empresa/Consolidado presente e aplicado.
- CRUD de lançamentos com edição, exclusão, checkbox "Pago", competência, categoria, escopo e valor com sinal e cor.
- Filtros de busca, tipo e categoria; contadores "3 itens · página 1 de 1".
- Barra de resumo inferior com Entradas, Saídas e Resultado.
- Categorias padrão criadas corretamente por escopo e tipo.
- Cadastro de contas, com escopo, tipo e saldo inicial.
- Orçamento por categoria com barra de progresso e campo de limite editável com botão Salvar.
- Estado vazio elegante em Metas e em Empresa.
- Modo escuro disponível (ícone de lua).
- Navegação inferior no mobile com Início, Lançamentos, Pessoal, Empresa, Metas e Configurações.

### 7.2 Bugs conhecidos

| ID | Bug | Correção esperada |
|---|---|---|
| **BUG-1** | **Saldo acumulado incorreto.** Mostra "R$ 6.500,00 — desde o primeiro lançamento", mas há só três lançamentos, todos em out/2026, e todas as contas têm saldo inicial R$ 0,00. O cálculo soma apenas o resultado do mês e rotula como acumulado. | O saldo acumulado deve considerar o saldo inicial das contas somado a todos os lançamentos de competências anteriores ou iguais à ativa — **ou** o rótulo deve mudar para "Resultado do mês". |
| **BUG-2** | **Herança de orçamento não implementada.** Na tela Empresa, todas as categorias exibem "R$ Sem limite" mesmo havendo competência anterior. O campo existe; a lógica está ausente. | Implementar R4: buscar o orçamento da competência anterior mais próxima, exibir com etiqueta "herdado", sem gravar. |
| **BUG-3** | **Reserva de emergência ausente da interface.** Não há card de reserva em Pessoal nem em Configurações; em Configurações existe apenas "Meses de reserva desejados". Os campos de meta e de saldo acumulado editáveis não estão expostos. | Expor o card editável (meta e saldo), com zero válido e precedência manual (R6). |
| **BUG-4** | **Contas com saldo inicial zerado.** Cinco contas criadas, todas com R$ 0,00. Sem saldo inicial o saldo acumulado não fecha com a realidade. | Popular o saldo inicial das contas (efeito colateral do BUG-1). |
| **BUG-5** | **Filtro de escopo não aplicado nas listas de contas.** Em Configurações, com escopo "Pessoal" ativo, aparecem contas de empresa (Cartão PJ, Conta PJ). | Aplicar o filtro de escopo a **todas** as listagens. |
| **BUG-6** | **Placeholder truncado.** O campo de busca em Lançamentos exibe "Buscar descri..." cortado. | Ajustar o placeholder/layout. |
| **BUG-7** | **Rótulo enganoso.** Os cards do Dashboard mostram "vs. setembro" sem que haja dados de setembro. | Comparação vazia deve ser omitida ou rotulada corretamente. |

## 8. Pendências e próximos passos

Ordem recomendada:

1. **Corrigir BUG-1 a BUG-5** — são regra de negócio e contaminam o histórico se houver lançamento real antes da correção.
2. **Popular o saldo inicial das contas.**
3. **Implementar a reserva de emergência editável.**
4. **Executar a Fase 2** (front-end) sobre a base corrigida.

> **Registro explícito:** não refinar a estética antes de os bugs de cálculo estarem resolvidos.

## 9. Artefatos disponíveis

| Artefato | Onde está |
|---|---|
| Protótipo HTML interativo (versão final, 9 telas) | [`prototipo/painel-financeiro-v6.html`](prototipo/painel-financeiro-v6.html) |
| Especificação Fase 1 — back-end e dados | [`docs/especificacao-fase1-backend.md`](docs/especificacao-fase1-backend.md) |
| Especificação Fase 2 — front-end e interação | [`docs/especificacao-fase2-frontend.md`](docs/especificacao-fase2-frontend.md) |
| Documentos originais (.docx) | `docs/original/` |

**Em falta:** o código-fonte do app gerado no Lovable não está nesta máquina. Para trabalhar no app de verdade, é preciso clonar o repositório do projeto (GitHub conectado ao Lovable) ou exportar o código.

## 10. Glossário e convenções

- **Competência** — mês/ano ao qual o lançamento pertence.
- **Escopo** — Pessoal, Empresa ou Consolidado.
- **Consolidado** — soma calculada, nunca armazenada.
- **Lançamento** — receita ou despesa com valor positivo.
- **Reserva de emergência** — valor acumulado de segurança, com origem manual ou calculada.
